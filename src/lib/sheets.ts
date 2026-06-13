import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "LISTA_MESTRE";

// Colunas exatas conforme especificação
const HEADERS = [
  "NOME",
  "DOCUMENTO",
  "LINK DOCUMENTO (editável)",
  "CÓDIGO",
  "TIPO",
  "LOCALIZAÇÃO",
  "UNIDADE",
  "ÁREA",
  "STATUS",
  "OBS",
  "DATA DE PADRONIZAÇÃO",
  "DATA DE REVISÃO",
];

const RANGE_END = "L"; // coluna L = 12ª coluna

async function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR");
}

function docToRow(doc: any): string[] {
  const localizacao = [doc.area?.setor?.nome, doc.area?.nome].filter(Boolean).join(" › ");
  return [
    doc.responsavel?.name ?? "",                    // NOME
    doc.titulo ?? "",                               // DOCUMENTO
    doc.linkEditavel ?? "",                         // LINK DOCUMENTO (editável)
    doc.codigo ?? "",                               // CÓDIGO
    `${doc.tipo?.sigla ?? ""} — ${doc.tipo?.nome ?? ""}`, // TIPO
    localizacao,                                    // LOCALIZAÇÃO
    doc.area?.setor?.unidade?.nome ?? "",           // UNIDADE
    doc.area?.nome ?? "",                           // ÁREA
    doc.status ?? "",                               // STATUS
    doc.observacao ?? "",                           // OBS
    fmtDate(doc.dataPadronizacao),                  // DATA DE PADRONIZAÇÃO
    fmtDate(doc.dataRevisao),                       // DATA DE REVISÃO
  ];
}

async function getOrCreateSheet(sheets: any): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = meta.data.sheets?.find((s: any) => s.properties?.title === SHEET_NAME);

  if (existing) return existing.properties?.sheetId ?? 0;

  // Renomeia a primeira aba
  const firstSheet = meta.data.sheets?.[0];
  if (firstSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: { sheetId: firstSheet.properties?.sheetId, title: SHEET_NAME },
            fields: "title",
          },
        }],
      },
    });
    return firstSheet.properties?.sheetId ?? 0;
  }
  return 0;
}

export async function ensureHeaders(accessToken: string, refreshToken?: string) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  const sheetId = await getOrCreateSheet(sheets);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:A1`,
  }).catch(() => null);

  const hasHeader = res?.data?.values?.[0]?.[0] === "NOME";
  if (!hasHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });

    // Formata cabeçalho
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.11, green: 0.30, blue: 0.59 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                horizontalAlignment: "CENTER",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
          },
        }],
      },
    });
  }
  return sheetId;
}

async function findRowByCode(sheets: any, codigo: string): Promise<number | null> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!D:D`, // coluna D = CÓDIGO
  });
  const values = res.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === codigo) return i + 1;
  }
  return null;
}

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
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A${existingRow}:${RANGE_END}${existingRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:${RANGE_END}`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  }
}

export async function sincronizarTudoNoSheets(
  accessToken: string,
  refreshToken: string | undefined,
  documentos: any[]
) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  const sheetId = await ensureHeaders(accessToken, refreshToken);

  // Limpa dados antigos (linha 2 em diante)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:${RANGE_END}9999`,
  });

  if (documentos.length === 0) return sheetId;

  const rows = documentos.map(docToRow);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  return sheetId;
}

export async function aplicarFormatacaoStatus(
  accessToken: string,
  refreshToken: string | undefined,
  sheetId: number = 0
) {
  const sheets = await getSheetsClient(accessToken, refreshToken);

  // Coluna I (índice 8) = STATUS
  const statusFormats = [
    { valor: "VENCIDO",    r: 0.99, g: 0.80, b: 0.80 },
    { valor: "VENCENDO",   r: 1.00, g: 0.95, b: 0.80 },
    { valor: "VIGENTE",    r: 0.85, g: 0.97, b: 0.87 },
    { valor: "EM_REVISAO", r: 0.85, g: 0.91, b: 0.99 },
    { valor: "OBSOLETO",   r: 0.93, g: 0.93, b: 0.93 },
  ];

  const requests = statusFormats.map(sf => ({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 8, endColumnIndex: 9 }],
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
  }).catch(e => console.error("Formatação condicional:", e));
}
