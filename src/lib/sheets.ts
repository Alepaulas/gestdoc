import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "LISTA_MESTRE";

// Estrutura completa da Lista Mestra
const COLS = {
  // Colunas conforme planilha LISTA_MESTRE real
  NOME:                     0,  // A - NOME
  TITULO:                   1,  // B - DOCUMENTO
  LINK_EDITAVEL:            2,  // C - LINK DOCUMENTO (editável)
  CODIGO:                   3,  // D - CÓDIGO
  TIPO_DOCUMENTO:           4,  // E - TIPO
  LOCALIZACAO:              5,  // F - LOCALIZAÇÃO
  UNIDADE:                  6,  // G - UNIDADE
  AREA:                     7,  // H - ÁREA
  STATUS_DOCUMENTO:         8,  // I - STATUS
  OBS:                      9,  // J - OBS
  DATA_PADRONIZACAO:        10, // K - DATA DE PADRONIZAÇÃO
  DATA_PROXIMA_REVISAO:     11, // L - DATA DE REVISÃO
  ITENS_ONA:                12, // M - ITENS ONA
  // aliases para compatibilidade
  ID:                       3,  // usa CODIGO como ID
  SETOR:                    5,  // usa LOCALIZACAO como SETOR
  STATUS_DEMANDA:           8,  // usa STATUS como STATUS_DEMANDA
  CADASTRADO_EM:            10, // placeholder
  CADASTRADO_POR:           0,  // usa NOME como responsável
  ATUALIZADO_EM:            28, // AC
  ATUALIZADO_POR:           29, // AD
  ITENS_ONA:                30, // AE
};

const HEADERS = [
  "ID", "TIPO DE DOCUMENTO", "NÍVEL", "CÓDIGO", "TITULO DO DOCUMENTO",
  "UNIDADE", "SETOR", "STATUS DA DEMANDA", "STATUS DO DOCUMENTO", "VIGÊNCIA",
  "DATA DA SOLICITAÇÃO (E-MAIL/FLUIG)", "LINK E-MAIL",
  "ENCAMINHADO PARA VALIDAÇÃO", "DATA DA VALIDAÇÃO",
  "PRAZO MÁXIMO PARA PADRONIZAÇÃO", "DATA DA PADRONIZAÇÃO/REVISÃO",
  "CONFORMIDADE COM O PRAZO", "DATA DA PRÓXIMA REVISÃO",
  "VERSÃO", "REVISÃO", "DATA DA PUBLICAÇÃO",
  "DIAS PARA VENCIMENTO", "STATUS DA VALIDADE", "CONCLUIDA POR:",
  "ELABORADOR", "APROVADOR",
  "CADASTRADO EM", "CADASTRADO POR",
  "ATUALIZADO EM", "ATUALIZADO POR",
  "ITENS ONA",
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
    range: `${SHEET_NAME}!A2:AE9999`,
  });
  const rows = res.data.values ?? [];

  return rows
    .filter(row => row[COLS.TITULO] || row[COLS.CODIGO])
    .map((row, i) => {
      const dataRevisao = row[COLS.DATA_PROXIMA_REVISAO] ?? "";
      const dias = calcularDiasVencimento(dataRevisao);
      const statusValidade = calcularStatusValidade(dias);
      return {
        _linha:               i + 2,
        id:                   row[COLS.CODIGO]               ?? "",
        nome:                 row[COLS.NOME]                 ?? "",
        titulo:               row[COLS.TITULO]               ?? "",
        linkEditavel:         row[COLS.LINK_EDITAVEL]        ?? "",
        codigo:               row[COLS.CODIGO]               ?? "",
        tipo:                 row[COLS.TIPO_DOCUMENTO]       ?? "",
        tipoDocumento:        row[COLS.TIPO_DOCUMENTO]       ?? "",
        localizacao:          row[COLS.LOCALIZACAO]          ?? "",
        setor:                row[COLS.LOCALIZACAO]          ?? "",
        unidade:              row[COLS.UNIDADE]              ?? "",
        area:                 row[COLS.AREA]                 ?? "",
        statusDocumento:      row[COLS.STATUS_DOCUMENTO]     ?? "",
        observacao:           row[COLS.OBS]                  ?? "",
        dataPadronizacao:     row[COLS.DATA_PADRONIZACAO]    ?? "",
        dataRevisao:          dataRevisao,
        dataProximaRevisao:   dataRevisao,
        itensONA:             (row[COLS.ITENS_ONA] ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
        diasVencimento:       dias,
        statusValidade,
        // status calculado automaticamente pela data de revisão
        status:               statusValidade,
        statusDemanda:        statusValidade,
        dataRevisao:          proximaRevisao,
        itensONA:             (row[COLS.ITENS_ONA] ?? "")
                                .split(",")
                                .map((s: string) => s.trim())
                                .filter(Boolean),
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

  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });

  const row = [
    id,                                     // A - ID
    doc.tipoDocumento   ?? "",              // B - Tipo de Documento
    doc.nivel           ?? "",              // C - Nível
    doc.codigo          ?? "",              // D - Código
    doc.titulo          ?? "",              // E - Título
    doc.unidade         ?? "",              // F - Unidade
    doc.setor           ?? "",              // G - Setor
    doc.statusDemanda   ?? "Em andamento",  // H - Status da Demanda
    doc.statusDocumento ?? "",              // I - Status do Documento
    doc.vigencia        ?? "",              // J - Vigência
    doc.dataSolicitacao ?? "",              // K - Data da Solicitação
    doc.linkEmail       ?? "",              // L - Link E-mail
    doc.encaminhadoValidacao ?? "",         // M - Encaminhado para Validação
    doc.dataValidacao   ?? "",              // N - Data da Validação
    doc.prazoMaxPadronizacao ?? "",         // O - Prazo Máximo
    doc.dataPadronizacao ?? "",             // P - Data Padronização/Revisão
    conformidade,                           // Q - Conformidade com o Prazo
    proximaRevisao,                         // R - Data Próxima Revisão
    doc.versao          ?? "00",            // S - Versão
    doc.revisao         ?? "00",            // T - Revisão
    doc.dataPublicacao  ?? "",              // U - Data Publicação
    dias !== null ? String(dias) : "",      // V - Dias para Vencimento
    statusValidade,                         // W - Status da Validade
    doc.concluidaPor    ?? "",              // X - Concluída por
    doc.elaborador      ?? "",              // Y - Elaborador
    doc.aprovador       ?? "",              // Z - Aprovador
    agora,                                  // AA - Cadastrado Em
    doc.cadastradoPor   ?? "",              // AB - Cadastrado Por
    agora,                                  // AC - Atualizado Em
    doc.cadastradoPor   ?? "",              // AD - Atualizado Por
    Array.isArray(doc.itensONA) ? doc.itensONA.join(", ") : (doc.itensONA ?? ""), // AE - Itens ONA
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:AE`,
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
    range: `${SHEET_NAME}!A${linha}:AE${linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

export async function ensureHeaders(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1:AE1`,
  }).catch(() => null);
  const hasHeader = res?.data?.values?.[0]?.[0] === "ID";
  if (!hasHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW", requestBody: { values: [HEADERS] },
    });
  }
}

// ── Aba USUARIOS ──────────────────────────────────────────
// Colunas: A=EMAIL | B=NOME | C=PAPEL | D=UNIDADE
const USUARIOS_SHEET = "USUARIOS";
const USUARIOS_HEADERS = ["EMAIL", "NOME", "PAPEL", "UNIDADE"];

export type UsuarioPlanilha = {
  email: string;
  nome: string;
  papel: string;  // ADMIN | GESTDOC | NUGESP | REFERENCIA_TECNICA | UNIDADE | OPERACIONAL
  unidade: string;
};

export async function lerUsuarios(accessToken: string, refreshToken?: string): Promise<UsuarioPlanilha[]> {
  const sheets = getSheetsClient(accessToken, refreshToken);

  // Garante cabeçalho
  const header = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USUARIOS_SHEET}!A1:D1`,
  }).catch(() => null);

  if (!header?.data?.values?.[0]?.[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${USUARIOS_SHEET}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [USUARIOS_HEADERS] },
    }).catch(() => {});
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${USUARIOS_SHEET}!A2:D9999`,
  }).catch(() => null);

  const rows = res?.data?.values ?? [];
  return rows
    .filter(r => r[0]?.trim())
    .map(r => ({
      email:    (r[0] ?? "").trim().toLowerCase(),
      nome:     (r[1] ?? "").trim(),
      papel:    (r[2] ?? "").trim().toUpperCase(),
      unidade:  (r[3] ?? "").trim().toUpperCase(),
    }));
}

export async function buscarUsuarioPorEmail(
  accessToken: string,
  refreshToken: string | undefined,
  email: string
): Promise<UsuarioPlanilha | null> {
  const usuarios = await lerUsuarios(accessToken, refreshToken);
  return usuarios.find(u => u.email === email.toLowerCase()) ?? null;
}

// ─── SOLICITACOES sheet helpers ──────────────────────────────────────────────

const SOL_SHEET = "SOLICITACOES";
const SPREADSHEET_ID_SOL = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";

// Mapa de colunas da aba SOLICITACOES (A=0)
export const SOL_COL: Record<string, number> = {
  ASSUNTO: 0, REMETENTE: 1, DATA_ENVIO: 2, DESTINATARIO: 3, IMPORTADO_EM: 4,
  STATUS: 5, RESPONSAVEL: 6, DATA_VALIDACAO_H: 7, DATA_PADRONIZACAO_I: 8,
  DATA_PUBLICACAO_J: 9, EMAIL_SOLICITANTE: 10,
  NOME_PADRONIZADOR: 11, DATA_ENVIO_VALIDACAO: 12, DATA_VALIDACAO_N: 13,
  TEMPO_VALIDACAO: 14, CONCLUIDA_POR: 15, DATA_ENVIO_PADRONIZACAO: 16,
  DATA_PADRONIZACAO_R: 17, TEMPO_PADRONIZACAO: 18, DATA_PUBLICACAO_T: 19,
  TEMPO_TOTAL: 20, PRAZO_MAXIMO: 21, CONFORMIDADE: 22,
  CRIADO_EM: 23, CRIADO_POR: 24, ATUALIZADO_EM: 25, ATUALIZADO_POR: 26,
};

// Calcula dias úteis entre duas datas (pula sábado e domingo)
export function calcDiasUteis(inicio: string, fim: string): number {
  const parseData = (s: string) => {
    const p = s.split("/");
    return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`) : new Date(s);
  };
  const d1 = parseData(inicio);
  const d2 = parseData(fim);
  let count = 0;
  const cur = new Date(d1);
  while (cur <= d2) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Atualiza células específicas de uma linha na aba SOLICITACOES
export async function atualizarSolicitacao(
  accessToken: string,
  refreshToken: string | undefined,
  linha: number, // linha real na planilha (1-indexed, já inclui header)
  campos: Record<string, string>
) {
  const sheets = getSheetsClient(accessToken, refreshToken);

  // Lê a linha atual
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID_SOL,
    range: `${SOL_SHEET}!A${linha}:AA${linha}`,
  });
  const row = res.data.values?.[0] ?? Array(27).fill("");
  while (row.length < 27) row.push("");

  // Aplica os campos editados
  Object.entries(campos).forEach(([col, val]) => {
    const idx = SOL_COL[col];
    if (idx !== undefined) row[idx] = val;
  });

  // Recalcula tempo de padronização e conformidade automaticamente
  const dataValidacao = row[SOL_COL.DATA_VALIDACAO_N] || row[SOL_COL.DATA_VALIDACAO_H];
  const dataPadronizacao = row[SOL_COL.DATA_PADRONIZACAO_R] || row[SOL_COL.DATA_PADRONIZACAO_I];

  if (dataValidacao && dataPadronizacao) {
    const diasUteis = calcDiasUteis(dataValidacao, dataPadronizacao);
    row[SOL_COL.TEMPO_PADRONIZACAO] = String(diasUteis);
    row[SOL_COL.PRAZO_MAXIMO] = "10";
    row[SOL_COL.CONFORMIDADE] = diasUteis <= 10 ? "DENTRO DO PRAZO" : "FORA DO PRAZO";
  }

  // Atualiza data de atualização
  row[SOL_COL.ATUALIZADO_EM] = new Date().toLocaleString("pt-BR");

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID_SOL,
    range: `${SOL_SHEET}!A${linha}:AA${linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

// ─── AUDITORIA sheet ─────────────────────────────────────────────────────────

const AUDITORIA_SHEET = "AUDITORIA";
const AUDITORIA_HEADERS = ["DATA/HORA","USUÁRIO","E-MAIL","AÇÃO","MÓDULO","DETALHE"];

export async function registrarAuditoria(
  accessToken: string,
  refreshToken: string | undefined,
  entry: { usuario: string; email: string; acao: string; modulo: string; detalhe?: string }
) {
  try {
    const sheets = getSheetsClient(accessToken, refreshToken);

    // Garante que a aba existe
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const abaExiste = meta.data.sheets?.some(s => s.properties?.title === AUDITORIA_SHEET);

    if (!abaExiste) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: AUDITORIA_SHEET } } }] },
      });
      // Cabeçalho
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${AUDITORIA_SHEET}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [AUDITORIA_HEADERS] },
      });
      // Formata cabeçalho
      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetId = sheetMeta.data.sheets?.find(s => s.properties?.title === AUDITORIA_SHEET)?.properties?.sheetId;
      if (sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.11, green: 0.30, blue: 0.59 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  },
                },
                fields: "userEnteredFormat(backgroundColor,textFormat)",
              },
            }],
          },
        });
      }
    }

    const agora = new Date().toLocaleString("pt-BR");
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${AUDITORIA_SHEET}!A:F`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[agora, entry.usuario, entry.email, entry.acao, entry.modulo, entry.detalhe ?? ""]],
      },
    });
  } catch (e) {
    // Nunca deixa falhar silenciosamente — auditoria é best-effort
    console.error("Auditoria error:", e);
  }
}
