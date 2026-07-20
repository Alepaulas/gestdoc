import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { atualizarSolicitacao } from "@/lib/sheets";
import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "SOLICITACOES";

const COLS = [
  "ASSUNTO","REMETENTE","DATA DE ENVIO","DESTINATÁRIO","IMPORTADO EM",
  "STATUS","RESPONSÁVEL","DATA DE VALIDAÇÃO","DATA DE PADRONIZAÇÃO",
  "DATA DE PUBLICAÇÃO","E-MAIL DO SOLICITANTE",
  "NOME DE QUEM ESTÁ PADRONIZANDO O DOCUMENTO",
  "DATA DE ENVIO PARA VALIDAÇÃO","DATA DA VALIDAÇÃO","TEMPO DE VALIDAÇÃO",
  "CONCLUIDA POR","DATA DE ENVIO PARA PADRONIZAÇÃO","DATA DA PADRONIZAÇÃO",
  "TEMPO DE PADRONIZAÇÃO","DATA DE PUBLICAÇÃO","TEMPO TOTAL",
  "PRAZO MÁXIMO PARA PADRONIZAÇÃO","CONFORMIDADE COM O PRAZO",
  "CRIADO_EM","CRIADO_POR","ATUALIZADO_EM","ATUALIZADO_POR",
];

function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

function calcDiasUteis(inicio: string, fim: string): number {
  const parse = (s: string) => {
    const p = s.split("/");
    return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`) : new Date(s);
  };
  const d1 = parse(inicio), d2 = parse(fim);
  let count = 0;
  const cur = new Date(d1);
  while (cur <= d2) {
    if (cur.getDay() !== 0 && cur.getDay() !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const responsavel = searchParams.get("responsavel") ?? "";

  try {
    const sheets = getSheetsClient(accessToken, refreshToken);

    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });
    const headers: string[] = headerRes.data.values?.[0] ?? COLS;

    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:AA9999`,
    });
    const rows = dataRes.data.values ?? [];

    let solicitacoes = rows
      .filter(row => row.some(c => c?.trim()))
      .map((row, i) => {
        const obj: Record<string, string> = { _linha: String(i + 2) };
        headers.forEach((h: string, j: number) => { obj[h] = row[j] ?? ""; });

        // Calcula tempo de padronização automaticamente se tiver as datas
        const dataVal = obj["DATA DA VALIDAÇÃO"] || obj["DATA DE VALIDAÇÃO"];
        const dataPad = obj["DATA DA PADRONIZAÇÃO"] || obj["DATA DE PADRONIZAÇÃO"];
        if (dataVal && dataPad && !obj["TEMPO DE PADRONIZAÇÃO"]) {
          const dias = calcDiasUteis(dataVal, dataPad);
          obj["TEMPO DE PADRONIZAÇÃO"] = String(dias);
          obj["PRAZO MÁXIMO PARA PADRONIZAÇÃO"] = "10";
          obj["CONFORMIDADE COM O PRAZO"] = dias <= 10 ? "DENTRO DO PRAZO" : "FORA DO PRAZO";
        }

        return obj;
      });

    if (search) solicitacoes = solicitacoes.filter(s =>
      Object.values(s).some(v => v.toLowerCase().includes(search.toLowerCase()))
    );
    if (status) solicitacoes = solicitacoes.filter(s => s["STATUS"] === status);
    if (responsavel) solicitacoes = solicitacoes.filter(s => s["RESPONSÁVEL"] === responsavel);

    // % conformidade
    const comPrazo = solicitacoes.filter(s => s["CONFORMIDADE COM O PRAZO"] === "DENTRO DO PRAZO").length;
    const comConformidade = solicitacoes.filter(s => s["CONFORMIDADE COM O PRAZO"]).length;
    const pctConformidade = comConformidade > 0 ? Math.round((comPrazo / comConformidade) * 100) : null;

    const statusUnicos = [...new Set(rows.map(r => r[5]).filter(Boolean))];

    return NextResponse.json({
      solicitacoes, total: solicitacoes.length,
      headers, statusUnicos, pctConformidade,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT — atualiza campos editáveis na planilha
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token não encontrado" }, { status: 401 });

  const { linha, campos } = await req.json();
  if (!linha || !campos) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  try {
    const sheets = getSheetsClient(accessToken, refreshToken);

    // Lê linha atual
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${linha}:AA${linha}`,
    });
    const row: string[] = res.data.values?.[0] ?? Array(27).fill("");
    while (row.length < 27) row.push("");

    // Mapeia nomes de coluna para índice
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });
    const headers: string[] = headerRes.data.values?.[0] ?? COLS;

    // Aplica campos editados
    Object.entries(campos).forEach(([col, val]) => {
      const idx = headers.indexOf(col);
      if (idx >= 0) row[idx] = val as string;
    });

    // Recalcula tempo de padronização e conformidade
    const idxValN = headers.indexOf("DATA DA VALIDAÇÃO");
    const idxValH = headers.indexOf("DATA DE VALIDAÇÃO");
    const idxPadR = headers.indexOf("DATA DA PADRONIZAÇÃO");
    const idxPadI = headers.indexOf("DATA DE PADRONIZAÇÃO");
    const idxTempo = headers.indexOf("TEMPO DE PADRONIZAÇÃO");
    const idxPrazo = headers.indexOf("PRAZO MÁXIMO PARA PADRONIZAÇÃO");
    const idxConf = headers.indexOf("CONFORMIDADE COM O PRAZO");
    const idxAtual = headers.indexOf("ATUALIZADO_EM");

    const dataVal = row[idxValN] || row[idxValH];
    const dataPad = row[idxPadR] || row[idxPadI];

    if (dataVal && dataPad) {
      const dias = calcDiasUteis(dataVal, dataPad);
      if (idxTempo >= 0) row[idxTempo] = String(dias);
      if (idxPrazo >= 0) row[idxPrazo] = "10";
      if (idxConf >= 0) row[idxConf] = dias <= 10 ? "DENTRO DO PRAZO" : "FORA DO PRAZO";
    }
    if (idxAtual >= 0) row[idxAtual] = new Date().toLocaleString("pt-BR");

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${linha}:AA${linha}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
