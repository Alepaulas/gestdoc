import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";

// Colunas da Lista Mestra conforme Norma Zero ISGH
const HEADERS = [
  "CÓDIGO",
  "NOME DO DOCUMENTO",
  "TIPO",
  "NÍVEL",
  "UNIDADE",
  "SETOR",
  "ÁREA",
  "RESPONSÁVEL",
  "E-MAIL RESPONSÁVEL",
  "DATA PADRONIZAÇÃO",
  "DATA REVISÃO",
  "PRÓXIMA REVISÃO",
  "STATUS",
  "VERSÃO",
  "LINK EDITÁVEL",
  "LINK PDF",
  "ITENS ONA",
  "OBSERVAÇÃO",
  "ÚLTIMA ATUALIZAÇÃO",
];

async function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

export async function getAccessToken(userId: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  // Import prisma here to avoid circular deps
  const { prisma } = await import("./db");
  const account = await prisma.user.findUnique({
    where: { id: userId },
    include: { accounts: true } as any,
  }) as any;
  const googleAccount = account?.accounts?.find((a: any) => a.provider === "google");
  if (!googleAccount?.access_token) return null;
  return { accessToken: googleAccount.access_token, refreshToken: googleAccount.refresh_token };
}

// Garante que o cabeçalho existe na aba correta
export async function ensureHeaders(accessToken: string, refreshToken?: string) {
  const sheets = await getSheetsClient(accessToken, refreshToken);

  // Verifica se já tem cabeçalho
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Lista Mestra!A1:S1",
  }).catch(() => null);

  const existing = res?.data?.values?.[0];
  if (existing && existing[0] === "CÓDIGO") return; // já tem

  // Renomeia a aba para "Lista Mestra" se necessário
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.[0];
  if (sheet && sheet.properties?.title !== "Lista Mestra") {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: { sheetId: sheet.properties?.sheetId, title: "Lista Mestra" },
            fields: "title",
          },
        }],
      },
    });
  }

  // Escreve cabeçalho
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Lista Mestra!A1",
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });

  // Formata cabeçalho (negrito, cor de fundo azul ISGH)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        repeatCell: {
          range: { sheetId: sheet?.properties?.sheetId ?? 0, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.11, green: 0.30, blue: 0.59 }, // #1D4ED8
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      }],
    },
  });
}

// Formata data para dd/mm/aaaa
function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR");
}

// Monta uma linha da planilha a partir de um documento
function docToRow(doc: any): string[] {
  return [
    doc.codigo ?? "",
    doc.titulo ?? "",
    `${doc.tipo?.sigla ?? ""} — ${doc.tipo?.nome ?? ""}`,
    doc.tipo?.nivel ? `Nível ${doc.tipo.nivel}` : "",
    doc.area?.setor?.unidade?.nome ?? "",
    doc.area?.setor?.nome ?? "",
    doc.area?.nome ?? "",
    doc.responsavel?.name ?? "",
    doc.responsavel?.email ?? "",
    fmtDate(doc.dataPadronizacao),
    fmtDate(doc.dataRevisao),
    fmtDate(doc.proximaRevisao),
    doc.status ?? "",
    doc.versao ?? "",
    doc.linkEditavel ?? "",
    doc.linkPdf ?? "",
    doc.itensONA?.map((i: any) => i.itemONA?.codigo ?? i.itemONAId).join(", ") ?? "",
    doc.observacao ?? "",
    new Date().toLocaleString("pt-BR"),
  ];
}

// Encontra a linha do documento pelo código (coluna A)
async function findRowByCode(sheets: any, codigo: string): Promise<number | null> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Lista Mestra!A:A",
  });
  const values = res.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === codigo) return i + 1; // 1-indexed
  }
  return null;
}

// Insere ou atualiza um documento na planilha
export async function upsertDocumentoNoSheets(
  accessToken: string,
  refreshToken: string | undefined,
  doc: any
) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  await ensureHeaders(accessToken, refreshToken);

  const row = docToRow(doc);
  const existingRow = await findRowByCode(sheets, doc.codigo);

  if (existingRow) {
    // Atualiza linha existente
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Lista Mestra!A${existingRow}:S${existingRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
  } else {
    // Adiciona nova linha
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Lista Mestra!A:S",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  }
}

// Sincroniza TODOS os documentos (útil para setup inicial)
export async function sincronizarTudoNoSheets(
  accessToken: string,
  refreshToken: string | undefined,
  documentos: any[]
) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  await ensureHeaders(accessToken, refreshToken);

  if (documentos.length === 0) return;

  const rows = documentos.map(docToRow);

  // Limpa dados antigos (mantém cabeçalho)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: "Lista Mestra!A2:S9999",
  });

  // Escreve tudo de uma vez
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Lista Mestra!A2",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

// Aplica formatação condicional por status
export async function aplicarFormatacaoStatus(
  accessToken: string,
  refreshToken: string | undefined,
  sheetId: number = 0
) {
  const sheets = await getSheetsClient(accessToken, refreshToken);

  const statusFormats = [
    { valor: "VENCIDO",    r: 0.99, g: 0.80, b: 0.80 }, // vermelho claro
    { valor: "VENCENDO",   r: 1.00, g: 0.95, b: 0.80 }, // amarelo claro
    { valor: "VIGENTE",    r: 0.85, g: 0.97, b: 0.87 }, // verde claro
    { valor: "EM_REVISAO", r: 0.85, g: 0.91, b: 0.99 }, // azul claro
    { valor: "OBSOLETO",   r: 0.93, g: 0.93, b: 0.93 }, // cinza claro
  ];

  const requests = statusFormats.map(sf => ({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 12, endColumnIndex: 13 }],
        booleanRule: {
          condition: { type: "TEXT_EQ", values: [{ userEnteredValue: sf.valor }] },
          format: { backgroundColor: { red: sf.r, green: sf.g, blue: sf.b } },
        },
      },
      index: 0,
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });
}
