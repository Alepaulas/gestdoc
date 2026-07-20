import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "SOLICITACOES";

// Colunas exatas da aba SOLICITACOES
const COLS = [
  "ASSUNTO", "REMETENTE", "DATA DE ENVIO", "DESTINATÁRIO", "IMPORTADO EM",
  "STATUS", "RESPONSÁVEL", "DATA DE VALIDAÇÃO", "DATA DE PADRONIZAÇÃO",
  "DATA DE PUBLICAÇÃO", "E-MAIL DO SOLICITANTE",
  "NOME DE QUEM ESTÁ PADRONIZANDO O DOCUMENTO",
  "DATA DE ENVIO PARA VALIDAÇÃO", "DATA DA VALIDAÇÃO", "TEMPO DE VALIDAÇÃO",
  "CONCLUIDA POR", "DATA DE ENVIO PARA PADRONIZAÇÃO", "DATA DA PADRONIZAÇÃO",
  "TEMPO DE PADRONIZAÇÃO", "DATA DE PUBLICAÇÃO", "TEMPO TOTAL",
  "PRAZO MÁXIMO PARA PADRONIZAÇÃO", "CONFORMIDADE COM O PRAZO",
  "CRIADO_EM", "CRIADO_POR", "ATUALIZADO_EM", "ATUALIZADO_POR",
];

function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado. Faça logout e login novamente." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";

  try {
    const sheets = getSheetsClient(accessToken, refreshToken);

    // Lê cabeçalho para mapear colunas dinamicamente
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });
    const headers = headerRes.data.values?.[0] ?? COLS;

    // Lê dados
    const dataRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:Z9999`,
    });
    const rows = dataRes.data.values ?? [];

    let solicitacoes = rows
      .filter(row => row.some(c => c?.trim()))
      .map((row, i) => {
        const obj: Record<string, string> = { _linha: String(i + 2) };
        headers.forEach((h: string, j: number) => {
          obj[h] = row[j] ?? "";
        });
        return obj;
      });

    // Filtros
    if (search) {
      solicitacoes = solicitacoes.filter(s =>
        Object.values(s).some(v => v.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (status) {
      solicitacoes = solicitacoes.filter(s => s["STATUS"] === status);
    }

    // Pega status únicos para o filtro
    const statusUnicos = [...new Set(solicitacoes.map(s => s["STATUS"]).filter(Boolean))];

    return NextResponse.json({ solicitacoes, total: solicitacoes.length, headers, statusUnicos });
  } catch (e: any) {
    console.error("Sheets error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
