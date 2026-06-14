import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "LISTA_MESTRE";

// Mapeamento exato das colunas conforme planilha
const COLS = {
  NOME: 0,
  DOCUMENTO: 1,
  LINK_EDITAVEL: 2,
  CODIGO: 3,
  TIPO: 4,
  LOCALIZACAO: 5,
  UNIDADE: 6,
  AREA: 7,
  STATUS: 8,
  OBS: 9,
  DATA_PADRONIZACAO: 10,
  DATA_REVISAO: 11,
};

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

function getSheetsClient(accessToken: string, refreshToken?: string) {
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

function parseDate(s: string): Date | null {
  if (!s) return null;
  // Suporta dd/mm/aaaa e aaaa-mm-dd
  if (s.includes("/")) {
    const [d, m, y] = s.split("/");
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(s);
}

// Lê todos os documentos da planilha
export async function lerPlanilha(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:L9999`,
  });

  const rows = res.data.values ?? [];
  
  return rows
    .filter(row => row[COLS.DOCUMENTO] || row[COLS.CODIGO]) // ignora linhas vazias
    .map((row, i) => ({
      _linha: i + 2, // linha real na planilha (1-indexed + header)
      nome: row[COLS.NOME] ?? "",
      titulo: row[COLS.DOCUMENTO] ?? "",
      linkEditavel: row[COLS.LINK_EDITAVEL] ?? "",
      codigo: row[COLS.CODIGO] ?? "",
      tipo: row[COLS.TIPO] ?? "",
      localizacao: row[COLS.LOCALIZACAO] ?? "",
      unidade: row[COLS.UNIDADE] ?? "",
      area: row[COLS.AREA] ?? "",
      status: row[COLS.STATUS] ?? "VIGENTE",
      observacao: row[COLS.OBS] ?? "",
      dataPadronizacao: row[COLS.DATA_PADRONIZACAO] ?? "",
      dataRevisao: row[COLS.DATA_REVISAO] ?? "",
    }));
}

// Gera próximo código automático: TIPO.AREA.001
export async function gerarCodigo(
  accessToken: string,
  refreshToken: string | undefined,
  tipoSigla: string,
  areaSigla: string
): Promise<string> {
  const docs = await lerPlanilha(accessToken, refreshToken);
  const prefixo = `${tipoSigla}.${areaSigla}.`;
  
  const existentes = docs
    .map(d => d.codigo)
    .filter(c => c.startsWith(prefixo))
    .map(c => parseInt(c.replace(prefixo, "")) || 0);

  const proximo = existentes.length > 0 ? Math.max(...existentes) + 1 : 1;
  return `${prefixo}${String(proximo).padStart(3, "0")}`;
}

// Escreve uma linha nova na planilha
export async function adicionarNaPlanilha(
  accessToken: string,
  refreshToken: string | undefined,
  doc: {
    nome: string;
    titulo: string;
    linkEditavel: string;
    codigo: string;
    tipo: string;
    localizacao: string;
    unidade: string;
    area: string;
    status: string;
    observacao: string;
    dataPadronizacao: string;
    dataRevisao: string;
  }
) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  
  const row = [
    doc.nome,
    doc.titulo,
    doc.linkEditavel,
    doc.codigo,
    doc.tipo,
    doc.localizacao,
    doc.unidade,
    doc.area,
    doc.status || "VIGENTE",
    doc.observacao,
    doc.dataPadronizacao,
    doc.dataRevisao,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

// Atualiza uma linha existente pelo número da linha
export async function atualizarNaPlanilha(
  accessToken: string,
  refreshToken: string | undefined,
  linha: number,
  doc: Partial<{
    nome: string; titulo: string; linkEditavel: string;
    tipo: string; localizacao: string; unidade: string;
    area: string; status: string; observacao: string;
    dataPadronizacao: string; dataRevisao: string;
  }>
) {
  const sheets = getSheetsClient(accessToken, refreshToken);

  // Lê a linha atual primeiro
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${linha}:L${linha}`,
  });
  const atual = res.data.values?.[0] ?? Array(12).fill("");

  // Mescla com os novos valores
  if (doc.nome !== undefined) atual[COLS.NOME] = doc.nome;
  if (doc.titulo !== undefined) atual[COLS.DOCUMENTO] = doc.titulo;
  if (doc.linkEditavel !== undefined) atual[COLS.LINK_EDITAVEL] = doc.linkEditavel;
  if (doc.tipo !== undefined) atual[COLS.TIPO] = doc.tipo;
  if (doc.localizacao !== undefined) atual[COLS.LOCALIZACAO] = doc.localizacao;
  if (doc.unidade !== undefined) atual[COLS.UNIDADE] = doc.unidade;
  if (doc.area !== undefined) atual[COLS.AREA] = doc.area;
  if (doc.status !== undefined) atual[COLS.STATUS] = doc.status;
  if (doc.observacao !== undefined) atual[COLS.OBS] = doc.observacao;
  if (doc.dataPadronizacao !== undefined) atual[COLS.DATA_PADRONIZACAO] = doc.dataPadronizacao;
  if (doc.dataRevisao !== undefined) atual[COLS.DATA_REVISAO] = doc.dataRevisao;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${linha}:L${linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [atual] },
  });
}

// Garante cabeçalho
export async function ensureHeaders(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:L1`,
  }).catch(() => null);

  if (res?.data?.values?.[0]?.[0] === "NOME") return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });
}
