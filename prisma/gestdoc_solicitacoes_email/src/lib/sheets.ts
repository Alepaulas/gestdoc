import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "LISTA_MESTRE";

// Estrutura completa da Lista Mestra
const COLS = {
  ID:                       0,  // A
  TIPO_DOCUMENTO:           1,  // B
  NIVEL:                    2,  // C
  CODIGO:                   3,  // D
  TITULO:                   4,  // E
  UNIDADE:                  5,  // F
  SETOR:                    6,  // G
  STATUS_DEMANDA:           7,  // H
  STATUS_DOCUMENTO:         8,  // I
  VIGENCIA:                 9,  // J
  DATA_SOLICITACAO:         10, // K
  LINK_EMAIL:               11, // L
  ENCAMINHADO_VALIDACAO:    12, // M
  DATA_VALIDACAO:           13, // N
  PRAZO_MAX_PADRONIZACAO:   14, // O
  DATA_PADRONIZACAO:        15, // P
  CONFORMIDADE_PRAZO:       16, // Q
  DATA_PROXIMA_REVISAO:     17, // R
  VERSAO:                   18, // S
  REVISAO:                  19, // T
  DATA_PUBLICACAO:          20, // U
  DIAS_VENCIMENTO:          21, // V
  STATUS_VALIDADE:          22, // W
  CONCLUIDA_POR:            23, // X
  ELABORADOR:               24, // Y
  APROVADOR:                25, // Z
  CADASTRADO_EM:            26, // AA
  CADASTRADO_POR:           27, // AB
  ATUALIZADO_EM:            28, // AC
  ATUALIZADO_POR:           29, // AD
  ITENS_ONA:                30, // AE
  OBS:                      31, // AF
  AGUARDANDO_ASSINATURA:    32, // AG
};

// Última coluna usada na planilha (mantém em sincronia com o maior índice de COLS acima)
const ULTIMA_COLUNA = "AG";

// Valores aceitos para AGUARDANDO_ASSINATURA
export const AGUARDANDO_ASSINATURA_OPCOES = ["SIM", "NAO", "NAO_SE_APLICA"] as const;

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
  "ITENS ONA", "OBS", "AGUARDANDO ASSINATURA",
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

// Dias corridos entre duas datas BR (fim - início). Retorna null se alguma data faltar.
function calcularDiasEntre(inicioBR: string, fimBR: string): number | null {
  const inicio = parseDateBR(inicioBR);
  const fim = parseDateBR(fimBR);
  if (!inicio || !fim) return null;
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
}

// Tempo em validação: do encaminhamento para validação até a data da validação.
// Se ainda não validou, conta até hoje (tempo em aberto).
function calcularTempoEmValidacao(encaminhadoValidacao: string, dataValidacao: string): number | null {
  const inicio = parseDateBR(encaminhadoValidacao);
  if (!inicio) return null;
  const fim = dataValidacao ? parseDateBR(dataValidacao) : new Date();
  if (!fim) return null;
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
}

// Tempo em padronização: da data de validação até a data de padronização/revisão.
// Se ainda não padronizou, conta até hoje (tempo em aberto).
function calcularTempoEmPadronizacao(dataValidacao: string, dataPadronizacao: string): number | null {
  const inicio = parseDateBR(dataValidacao);
  if (!inicio) return null;
  const fim = dataPadronizacao ? parseDateBR(dataPadronizacao) : new Date();
  if (!fim) return null;
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
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
    range: `${SHEET_NAME}!A2:${ULTIMA_COLUNA}9999`,
  });
  const rows = res.data.values ?? [];

  return rows
    .filter(row => row[COLS.TITULO] || row[COLS.CODIGO])
    .map((row, i) => {
      const proximaRevisao = row[COLS.DATA_PROXIMA_REVISAO] ?? "";
      const dias = calcularDiasVencimento(proximaRevisao);
      const statusValidade = calcularStatusValidade(dias);
      return {
        _linha:               i + 2,
        id:                   row[COLS.ID]                    ?? "",
        tipoDocumento:        row[COLS.TIPO_DOCUMENTO]        ?? "",
        nivel:                row[COLS.NIVEL]                 ?? "",
        codigo:               row[COLS.CODIGO]                ?? "",
        titulo:               row[COLS.TITULO]                ?? "",
        unidade:              row[COLS.UNIDADE]               ?? "",
        setor:                row[COLS.SETOR]                 ?? "",
        statusDemanda:        row[COLS.STATUS_DEMANDA]        ?? "",
        statusDocumento:      row[COLS.STATUS_DOCUMENTO]      ?? "",
        vigencia:             row[COLS.VIGENCIA]              ?? "",
        dataSolicitacao:      row[COLS.DATA_SOLICITACAO]      ?? "",
        linkEmail:            row[COLS.LINK_EMAIL]            ?? "",
        encaminhadoValidacao: row[COLS.ENCAMINHADO_VALIDACAO] ?? "",
        dataValidacao:        row[COLS.DATA_VALIDACAO]        ?? "",
        prazoMaxPadronizacao: row[COLS.PRAZO_MAX_PADRONIZACAO]?? "",
        dataPadronizacao:     row[COLS.DATA_PADRONIZACAO]     ?? "",
        conformidadePrazo:    calcularConformidadePrazo(
                                row[COLS.DATA_PADRONIZACAO]     ?? "",
                                row[COLS.PRAZO_MAX_PADRONIZACAO]?? ""
                              ),
        dataProximaRevisao:   proximaRevisao,
        versao:               row[COLS.VERSAO]                ?? "",
        revisao:              row[COLS.REVISAO]               ?? "",
        dataPublicacao:       row[COLS.DATA_PUBLICACAO]       ?? "",
        diasVencimento:       dias,
        statusValidade,
        concluidaPor:         row[COLS.CONCLUIDA_POR]         ?? "",
        elaborador:           row[COLS.ELABORADOR]            ?? "",
        aprovador:            row[COLS.APROVADOR]             ?? "",
        cadastradoEm:         row[COLS.CADASTRADO_EM]         ?? "",
        cadastradoPor:        row[COLS.CADASTRADO_POR]        ?? "",
        atualizadoEm:         row[COLS.ATUALIZADO_EM]         ?? "",
        atualizadoPor:        row[COLS.ATUALIZADO_POR]        ?? "",
        obs:                  row[COLS.OBS]                   ?? "",
        aguardandoAssinatura: row[COLS.AGUARDANDO_ASSINATURA] ?? "NAO_SE_APLICA",
        tempoEmValidacao:     calcularTempoEmValidacao(
                                row[COLS.ENCAMINHADO_VALIDACAO] ?? "",
                                row[COLS.DATA_VALIDACAO]        ?? ""
                              ),
        tempoEmPadronizacao:  calcularTempoEmPadronizacao(
                                row[COLS.DATA_VALIDACAO]        ?? "",
                                row[COLS.DATA_PADRONIZACAO]     ?? ""
                              ),
        // Legacy
        status:               statusValidade,
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
    doc.obs                  ?? "",              // AF - Obs
    doc.aguardandoAssinatura ?? "NAO_SE_APLICA",  // AG - Aguardando Assinatura
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:${ULTIMA_COLUNA}`,
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
    doc.id                   ?? "",              // A - ID
    doc.tipoDocumento        ?? "",              // B - Tipo de Documento
    doc.nivel                ?? "",              // C - Nível
    doc.codigo               ?? "",              // D - Código
    doc.titulo               ?? "",              // E - Título
    doc.unidade              ?? "",              // F - Unidade
    doc.setor                ?? "",              // G - Setor
    doc.statusDemanda        ?? "",              // H - Status da Demanda
    doc.statusDocumento      ?? "",              // I - Status do Documento
    doc.vigencia             ?? "",              // J - Vigência
    doc.dataSolicitacao      ?? "",              // K - Data da Solicitação
    doc.linkEmail            ?? "",              // L - Link E-mail
    doc.encaminhadoValidacao ?? "",              // M - Encaminhado para Validação
    doc.dataValidacao        ?? "",              // N - Data da Validação
    doc.prazoMaxPadronizacao ?? "",              // O - Prazo Máximo
    doc.dataPadronizacao     ?? "",              // P - Data Padronização/Revisão
    conformidade,                                // Q - Conformidade com o Prazo
    proximaRevisao,                              // R - Data Próxima Revisão
    doc.versao               ?? "00",            // S - Versão
    doc.revisao              ?? "00",            // T - Revisão
    doc.dataPublicacao       ?? "",              // U - Data Publicação
    dias !== null ? String(dias) : "",           // V - Dias para Vencimento
    statusValidade,                              // W - Status da Validade
    doc.concluidaPor         ?? "",              // X - Concluída por
    doc.elaborador           ?? "",              // Y - Elaborador
    doc.aprovador            ?? "",              // Z - Aprovador
    doc.cadastradoEm         ?? "",              // AA - Cadastrado Em
    doc.cadastradoPor        ?? "",              // AB - Cadastrado Por
    new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }), // AC - Atualizado Em
    doc.atualizadoPor        ?? "",              // AD - Atualizado Por
    Array.isArray(doc.itensONA) ? doc.itensONA.join(", ") : (doc.itensONA ?? ""), // AE - Itens ONA
    doc.obs                  ?? "",              // AF - Obs
    doc.aguardandoAssinatura ?? "NAO_SE_APLICA", // AG - Aguardando Assinatura
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${linha}:${ULTIMA_COLUNA}${linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

export async function ensureHeaders(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1:${ULTIMA_COLUNA}1`,
  }).catch(() => null);
  const headerRow = res?.data?.values?.[0] ?? [];
  // Reescreve se não existir cabeçalho, ou se existir mas estiver desatualizado
  // (faltando alguma das colunas mais recentes, ex: OBS, AGUARDANDO ASSINATURA)
  const hasHeader = headerRow[0] === "ID" && headerRow.length >= HEADERS.length;
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

// ── Aba SOLICITACOES ──────────────────────────────────────────
// Alimentada automaticamente pelo Apps Script (colunas A–F, a partir
// de e-mails recebidos). Colunas G–J são editadas aqui no GestDoc.
//   A=ASSUNTO | B=REMETENTE | C=DATA DE ENVIO | D=DESTINATÁRIO
//   E=IMPORTADO EM | F=STATUS | G=RESPONSÁVEL | H=DATA DE VALIDAÇÃO
//   I=DATA DE PADRONIZAÇÃO | J=DATA DE PUBLICAÇÃO
const SOLICITACOES_SHEET = "SOLICITACOES";
const SOLICITACOES_ULTIMA_COLUNA = "J";

const COLS_SOLICITACOES = {
  ASSUNTO:            0, // A
  REMETENTE:          1, // B
  DATA_ENVIO:         2, // C
  DESTINATARIO:       3, // D
  IMPORTADO_EM:       4, // E
  STATUS:             5, // F
  RESPONSAVEL:        6, // G
  DATA_VALIDACAO:     7, // H
  DATA_PADRONIZACAO:  8, // I
  DATA_PUBLICACAO:    9, // J
};

export const STATUS_SOLICITACAO_OPCOES = ["Pendente", "Em andamento", "Concluído", "Cancelado"] as const;
export const RESPONSAVEL_SOLICITACAO_OPCOES = ["Rozane", "Pedro"] as const;
const META_DIAS_UTEIS_PADRONIZACAO = 10;

// Aceita "dd/MM/yyyy" ou "dd/MM/yyyy HH:mm" (o Apps Script grava com hora)
function parseDataHoraBR(valor: string): Date | null {
  if (!valor) return null;
  const [dataParte] = valor.trim().split(" ");
  const p = dataParte.split("/");
  if (p.length !== 3) return null;
  const dt = new Date(`${p[2]}-${p[1]}-${p[0]}T00:00:00`);
  return isNaN(dt.getTime()) ? null : dt;
}

// Conta dias úteis (seg–sex) estritamente entre duas datas (exclui o dia de início, inclui o de fim)
function diasUteisEntre(inicio: Date, fim: Date): number {
  let dias = 0;
  const cursor = new Date(inicio);
  cursor.setHours(0, 0, 0, 0);
  const fimZerado = new Date(fim);
  fimZerado.setHours(0, 0, 0, 0);
  while (cursor < fimZerado) {
    cursor.setDate(cursor.getDate() + 1);
    const diaSemana = cursor.getDay(); // 0=domingo, 6=sábado
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return dias;
}

export type SolicitacaoEmail = {
  _linha: number;
  assunto: string;
  remetente: string;
  dataEnvio: string;       // dd/MM/yyyy HH:mm (data da solicitação)
  destinatario: string;
  importadoEm: string;
  status: string;
  responsavel: string;
  dataValidacao: string;
  dataPadronizacao: string;
  dataPublicacao: string;
  tempoValidacaoDiasUteis: number | null;
  validacaoEmAndamento: boolean;
  tempoPadronizacaoDiasUteis: number | null;
  padronizacaoEmAndamento: boolean;
  conformidade: "CONFORME" | "NÃO CONFORME" | "EM PRAZO" | "ATRASADO" | "";
};

export async function lerSolicitacoesEmail(
  accessToken: string,
  refreshToken?: string
): Promise<SolicitacaoEmail[]> {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SOLICITACOES_SHEET}!A2:${SOLICITACOES_ULTIMA_COLUNA}9999`,
  }).catch(() => null);

  const rows = res?.data?.values ?? [];
  const hoje = new Date();

  return rows
    .filter(row => row[COLS_SOLICITACOES.ASSUNTO])
    .map((row, i) => {
      const dataEnvio        = row[COLS_SOLICITACOES.DATA_ENVIO]        ?? "";
      const dataValidacao    = row[COLS_SOLICITACOES.DATA_VALIDACAO]    ?? "";
      const dataPadronizacao = row[COLS_SOLICITACOES.DATA_PADRONIZACAO] ?? "";
      const dataPublicacao   = row[COLS_SOLICITACOES.DATA_PUBLICACAO]   ?? "";

      const dtEnvio = parseDataHoraBR(dataEnvio);
      const dtValidacao = parseDataHoraBR(dataValidacao);
      const dtPublicacao = parseDataHoraBR(dataPublicacao);

      // Tempo de validação: Data de Envio → Data de Validação (ou até hoje, se ainda não validou)
      let tempoValidacaoDiasUteis: number | null = null;
      let validacaoEmAndamento = false;
      if (dtEnvio) {
        if (dtValidacao) {
          tempoValidacaoDiasUteis = diasUteisEntre(dtEnvio, dtValidacao);
        } else {
          tempoValidacaoDiasUteis = diasUteisEntre(dtEnvio, hoje);
          validacaoEmAndamento = true;
        }
      }

      // Tempo de padronização: Data de Validação → Data de Publicação (meta: 10 dias úteis)
      let tempoPadronizacaoDiasUteis: number | null = null;
      let padronizacaoEmAndamento = false;
      let conformidade: SolicitacaoEmail["conformidade"] = "";
      if (dtValidacao) {
        if (dtPublicacao) {
          tempoPadronizacaoDiasUteis = diasUteisEntre(dtValidacao, dtPublicacao);
          conformidade = tempoPadronizacaoDiasUteis <= META_DIAS_UTEIS_PADRONIZACAO ? "CONFORME" : "NÃO CONFORME";
        } else {
          tempoPadronizacaoDiasUteis = diasUteisEntre(dtValidacao, hoje);
          padronizacaoEmAndamento = true;
          conformidade = tempoPadronizacaoDiasUteis <= META_DIAS_UTEIS_PADRONIZACAO ? "EM PRAZO" : "ATRASADO";
        }
      }

      return {
        _linha: i + 2,
        assunto:            row[COLS_SOLICITACOES.ASSUNTO]      ?? "",
        remetente:           row[COLS_SOLICITACOES.REMETENTE]    ?? "",
        dataEnvio,
        destinatario:        row[COLS_SOLICITACOES.DESTINATARIO] ?? "",
        importadoEm:         row[COLS_SOLICITACOES.IMPORTADO_EM] ?? "",
        status:              row[COLS_SOLICITACOES.STATUS]       || "Pendente",
        responsavel:         row[COLS_SOLICITACOES.RESPONSAVEL]  ?? "",
        dataValidacao,
        dataPadronizacao,
        dataPublicacao,
        tempoValidacaoDiasUteis,
        validacaoEmAndamento,
        tempoPadronizacaoDiasUteis,
        padronizacaoEmAndamento,
        conformidade,
      };
    });
}

// Atualiza só os campos editáveis pelo GestDoc (colunas F–J) de uma linha específica
export async function atualizarSolicitacaoEmail(
  accessToken: string,
  refreshToken: string | undefined,
  linha: number,
  dados: { status?: string; responsavel?: string; dataValidacao?: string; dataPadronizacao?: string; dataPublicacao?: string }
) {
  const sheets = getSheetsClient(accessToken, refreshToken);

  // Lê os valores atuais pra não sobrescrever campos que não vieram no payload
  const atual = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SOLICITACOES_SHEET}!F${linha}:J${linha}`,
  }).catch(() => null);
  const [atualStatus, atualResp, atualValid, atualPad, atualPub] = atual?.data?.values?.[0] ?? [];

  const row = [
    dados.status            ?? atualStatus ?? "Pendente",
    dados.responsavel       ?? atualResp   ?? "",
    dados.dataValidacao     ?? atualValid  ?? "",
    dados.dataPadronizacao  ?? atualPad    ?? "",
    dados.dataPublicacao    ?? atualPub    ?? "",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SOLICITACOES_SHEET}!F${linha}:J${linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
