import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "LISTA_MESTRE";

// Estrutura completa da Lista Mestra
const COLS = {
  ID:                       0,  // A
  TIPO_DOCUMENTO:           1,  // B
  CODIGO:                   2,  // C
  TITULO:                   3,  // D
  UNIDADE:                  4,  // E
  SETOR:                    5,  // F
  STATUS_DEMANDA:           6,  // G
  STATUS_DOCUMENTO:         7,  // H
  VIGENCIA:                 8,  // I
  DATA_SOLICITACAO:         9,  // J
  LINK_EMAIL:               10, // K
  ENCAMINHADO_VALIDACAO:    11, // L
  DATA_VALIDACAO:           12, // M
  PRAZO_MAX_PADRONIZACAO:   13, // N
  DATA_PADRONIZACAO:        14, // O
  CONFORMIDADE_PRAZO:       15, // P
  DATA_PROXIMA_REVISAO:     16, // Q
  VERSAO:                   17, // R
  REVISAO:                  18, // S
  DATA_PUBLICACAO:          19, // T
  DIAS_VENCIMENTO:          20, // U
  STATUS_VALIDADE:          21, // V
  CONCLUIDA_POR:            22, // W
};

const HEADERS = [
  "ID",
  "TIPO DE DOCUMENTO",
  "CÓDIGO",
  "TITULO DO DOCUMENTO",
  "UNIDADE",
  "SETOR",
  "STATUS DA DEMANDA",
  "STATUS DO DOCUMENTO",
  "VIGÊNCIA",
  "DATA DA SOLICITAÇÃO (E-MAIL/FLUIG)",
  "LINK E-MAIL",
  "ENCAMINHADO PARA VALIDAÇÃO",
  "DATA DA VALIDAÇÃO",
  "PRAZO MÁXIMO PARA PADRONIZAÇÃO",
  "DATA DA PADRONIZAÇÃO/REVISÃO",
  "CONFORMIDADE COM O PRAZO",
  "DATA DA PRÓXIMA REVISÃO",
  "VERSÃO",
  "REVISÃO",
  "DATA DA PUBLICAÇÃO",
  "DIAS PARA VENCIMENTO",
  "STATUS DA VALIDADE",
  "CONCLUIDA POR:",
];

// Prazos de revisão por tipo (anos) — Norma Zero
const PRAZO_REVISAO_ANOS: Record<string, number> = {
  DIZ: 2, FTI: 1, FFO: 2, FLU: 2, ITA: 2, INT: 2,
  MAN: 2, MAP: 2, MOD: 2, NTE: 2, NOR: 2, PAC: 2,
  PLA: 2, PLC: 2, PSP: 1, POL: 4, PRO: 2, PCG: 2,
  PSG: 2, POP: 2, REG: 4, REL: 2,
};

function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

function parseDateBR(dateStr: string): Date | null {
  if (!dateStr) return null;
  const p = dateStr.split("/");
  if (p.length !== 3) return null;
  return new Date(`${p[2]}-${p[1]}-${p[0]}`);
}

function formatDateBR(date: Date): string {
  return `${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}/${date.getFullYear()}`;
}

function calcularProximaRevisao(dataPadronizacao: string, tipoSigla: string): string {
  const anos = PRAZO_REVISAO_ANOS[tipoSigla] ?? 2;
  const base = parseDateBR(dataPadronizacao);
  if (!base) return "";
  base.setFullYear(base.getFullYear() + anos);
  return formatDateBR(base);
}

function calcularDiasVencimento(proximaRevisao: string): number | null {
  const data = parseDateBR(proximaRevisao);
  if (!data) return null;
  const diffMs = data.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function calcularStatusValidade(dias: number | null): string {
  if (dias === null) return "";
  if (dias < 0) return "VENCIDO";
  if (dias <= 60) return "VENCENDO";
  return "VIGENTE";
}

function calcularConformidadePrazo(dataPadronizacao: string, prazoMax: string): string {
  if (!dataPadronizacao || !prazoMax) return "";
  const pad = parseDateBR(dataPadronizacao);
  const max = parseDateBR(prazoMax);
  if (!pad || !max) return "";
  return pad <= max ? "CONFORME" : "NÃO CONFORME";
}

// Gera próximo ID sequencial consultando a planilha
async function gerarId(sheets: any): Promise<string> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:A9999`,
  }).catch(() => null);
  const rows = res?.data?.values ?? [];
  const ids = rows
    .map((r: any) => parseInt(r[0]))
    .filter((n: number) => !isNaN(n));
  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return String(maxId + 1).padStart(4, "0");
}

// Gera próximo código (POP.AGT.003) consultando coluna C
export async function gerarCodigo(
  accessToken: string, refreshToken: string | undefined,
  tipo: string, area: string
): Promise<string> {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!C2:C9999`,
  }).catch(() => null);

  const rows = res?.data?.values ?? [];
  const prefix = `${tipo}.${area}.`;
  const nums = rows
    .map((r: any) => r[0] ?? "")
    .filter((c: string) => c.startsWith(prefix))
    .map((c: string) => parseInt(c.replace(prefix, "")))
    .filter((n: number) => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export async function lerPlanilha(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:W9999`,
  });
  const rows = res.data.values ?? [];

  return rows
    .filter(row => row[COLS.TITULO] || row[COLS.CODIGO])
    .map((row, i) => {
      const proximaRevisao = row[COLS.DATA_PROXIMA_REVISAO] ?? "";
      const dias = calcularDiasVencimento(proximaRevisao);
      const statusValidade = calcularStatusValidade(dias);

      return {
        _linha: i + 2,
        id:                    row[COLS.ID]                    ?? "",
        tipoDocumento:         row[COLS.TIPO_DOCUMENTO]        ?? "",
        codigo:                row[COLS.CODIGO]                ?? "",
        titulo:                row[COLS.TITULO]                ?? "",
        unidade:               row[COLS.UNIDADE]               ?? "",
        setor:                 row[COLS.SETOR]                 ?? "",
        statusDemanda:         row[COLS.STATUS_DEMANDA]        ?? "",
        statusDocumento:       row[COLS.STATUS_DOCUMENTO]      ?? "",
        vigencia:              row[COLS.VIGENCIA]              ?? "",
        dataSolicitacao:       row[COLS.DATA_SOLICITACAO]      ?? "",
        linkEmail:             row[COLS.LINK_EMAIL]            ?? "",
        encaminhadoValidacao:  row[COLS.ENCAMINHADO_VALIDACAO] ?? "",
        dataValidacao:         row[COLS.DATA_VALIDACAO]        ?? "",
        prazoMaxPadronizacao:  row[COLS.PRAZO_MAX_PADRONIZACAO]?? "",
        dataPadronizacao:      row[COLS.DATA_PADRONIZACAO]     ?? "",
        conformidadePrazo:     calcularConformidadePrazo(
                                 row[COLS.DATA_PADRONIZACAO] ?? "",
                                 row[COLS.PRAZO_MAX_PADRONIZACAO] ?? ""
                               ),
        dataProximaRevisao:    proximaRevisao,
        versao:                row[COLS.VERSAO]                ?? "",
        revisao:               row[COLS.REVISAO]               ?? "",
        dataPublicacao:        row[COLS.DATA_PUBLICACAO]       ?? "",
        diasVencimento:        dias,
        statusValidade,
        concluidaPor:          row[COLS.CONCLUIDA_POR]         ?? "",
        // Campos legacy para compatibilidade
        status:                statusValidade,
        dataRevisao:           proximaRevisao,
        itensONA:              [],
      };
    });
}

export async function adicionarNaPlanilha(
  accessToken: string, refreshToken: string | undefined, doc: any
) {
  const sheets = getSheetsClient(accessToken, refreshToken);

  // Extrai sigla do tipo (ex: "FFO — Ficha e Formulário" → "FFO", ou "POP.AGT.001" → "POP")
  const tipoRaw = doc.tipoDocumento ?? "";
  const tipoSigla = tipoRaw.includes(" — ")
    ? tipoRaw.split(" — ")[0].trim()
    : (doc.codigo ?? "").split(".")[0];

  const proximaRevisao = doc.dataProximaRevisao
    || calcularProximaRevisao(doc.dataPadronizacao ?? "", tipoSigla);
  const dias = calcularDiasVencimento(proximaRevisao);
  const statusValidade = calcularStatusValidade(dias);
  const conformidade = calcularConformidadePrazo(
    doc.dataPadronizacao ?? "", doc.prazoMaxPadronizacao ?? ""
  );
  const id = await gerarId(sheets);

  const row = [
    id,                                    // A - ID
    doc.tipoDocumento  ?? "",              // B - Tipo de Documento
    doc.codigo         ?? "",              // C - Código
    doc.titulo         ?? "",              // D - Título
    doc.unidade        ?? "",              // E - Unidade
    doc.setor          ?? "",              // F - Setor
    doc.statusDemanda  ?? "Em andamento", // G - Status da Demanda
    doc.statusDocumento ?? "",             // H - Status do Documento
    doc.vigencia       ?? "",              // I - Vigência
    doc.dataSolicitacao ?? "",             // J - Data da Solicitação
    doc.linkEmail      ?? "",              // K - Link E-mail
    doc.encaminhadoValidacao ?? "",        // L - Encaminhado para Validação
    doc.dataValidacao  ?? "",              // M - Data da Validação
    doc.prazoMaxPadronizacao ?? "",        // N - Prazo Máximo
    doc.dataPadronizacao ?? "",            // O - Data Padronização/Revisão
    conformidade,                          // P - Conformidade com o Prazo
    proximaRevisao,                        // Q - Data Próxima Revisão
    doc.versao         ?? "00",            // R - Versão
    doc.revisao        ?? "00",            // S - Revisão
    doc.dataPublicacao ?? new Date().toLocaleDateString("pt-BR"), // T - Data Publicação
    dias !== null ? String(dias) : "",     // U - Dias para Vencimento
    statusValidade,                        // V - Status da Validade
    doc.concluidaPor   ?? "",              // W - Concluída por
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:W`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}

export async function atualizarNaPlanilha(
  accessToken: string, refreshToken: string | undefined,
  linha: number, doc: any
) {
  const sheets = getSheetsClient(accessToken, refreshToken);

  const tipoSigla = (doc.codigo ?? "").split(".")[0] ?? "";
  const proximaRevisao = doc.dataProximaRevisao
    || calcularProximaRevisao(doc.dataPadronizacao ?? "", tipoSigla);
  const dias = calcularDiasVencimento(proximaRevisao);
  const statusValidade = calcularStatusValidade(dias);
  const conformidade = calcularConformidadePrazo(
    doc.dataPadronizacao ?? "", doc.prazoMaxPadronizacao ?? ""
  );

  const row = [
    doc.id                  ?? "",
    doc.tipoDocumento       ?? "",
    doc.codigo              ?? "",
    doc.titulo              ?? "",
    doc.unidade             ?? "",
    doc.setor               ?? "",
    doc.statusDemanda       ?? "",
    doc.statusDocumento     ?? "",
    doc.vigencia            ?? "",
    doc.dataSolicitacao     ?? "",
    doc.linkEmail           ?? "",
    doc.encaminhadoValidacao?? "",
    doc.dataValidacao       ?? "",
    doc.prazoMaxPadronizacao?? "",
    doc.dataPadronizacao    ?? "",
    conformidade,
    proximaRevisao,
    doc.versao              ?? "00",
    doc.revisao             ?? "00",
    doc.dataPublicacao      ?? "",
    dias !== null ? String(dias) : "",
    statusValidade,
    doc.concluidaPor        ?? "",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${linha}:W${linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

export async function ensureHeaders(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1:W1`,
  }).catch(() => null);
  const hasHeader = res?.data?.values?.[0]?.[0] === "ID";
  if (!hasHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW", requestBody: { values: [HEADERS] },
    });
  }
}
