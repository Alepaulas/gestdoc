import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET = "PUBLICADOS";

// Colunas da aba PUBLICADOS:
// A=LOCALIZAÇÃO | B=CÓDIGO | C=NOME | D=DATA_PADRONIZAÇÃO | E=DATA DE PADRONIZAÇÃO
// F=UNIDADE | G=PRÓXIMA REVISÃO | H=DIAS PARA VENCIMENTO | I=STATUS | J=STATUS DO DOCUMENTO

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

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token não encontrado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const busca  = searchParams.get("busca")  ?? "";
  const setor  = searchParams.get("setor")  ?? "";
  const status = searchParams.get("status") ?? "";

  try {
    const sheets = getSheetsClient(accessToken, refreshToken);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET}!A2:J9999`,
    });

    const rows = res.data.values ?? [];
    let docs = rows
      .filter(r => r[1] || r[2]) // precisa ter código ou nome
      .map((r, i) => ({
        _linha:          i + 2,
        localizacao:     r[0] ?? "",
        codigo:          r[1] ?? "",
        nome:            r[2] ?? "",
        dataPadronizacao: r[4] ?? r[3] ?? "", // coluna E preferida, fallback D
        unidade:         r[5] ?? "",
        proximaRevisao:  r[6] ?? "",
        diasVencimento:  r[7] ?? "",
        status:          r[8] ?? "",
        statusDocumento: r[9] ?? "",
      }));

    // Filtros
    if (busca) {
      const b = busca.toLowerCase();
      docs = docs.filter(d =>
        d.nome.toLowerCase().includes(b) ||
        d.codigo.toLowerCase().includes(b) ||
        d.localizacao.toLowerCase().includes(b)
      );
    }
    if (setor)  docs = docs.filter(d => d.localizacao.toLowerCase().includes(setor.toLowerCase()));
    if (status) docs = docs.filter(d => d.status.toUpperCase() === status.toUpperCase());

    return NextResponse.json({ docs, total: docs.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — atualiza STATUS DO DOCUMENTO (coluna J), apenas GESTDOC/ADMIN
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const papel = (session.user as any).papelFluxo as string;
  const role  = (session.user as any).role as string;
  if (papel !== "GESTDOC" && role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas GestDoc pode editar o status." }, { status: 403 });
  }

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  const { linha, statusDocumento } = await req.json();

  if (!linha || !statusDocumento) {
    return NextResponse.json({ error: "Linha e status são obrigatórios." }, { status: 400 });
  }

  try {
    const sheets = getSheetsClient(accessToken, refreshToken);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET}!J${linha}`,
      valueInputOption: "RAW",
      requestBody: { values: [[statusDocumento]] },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
