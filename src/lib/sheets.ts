import { google } from "googleapis";

const SPREADSHEET_ID = "1AhfvYOvqm8r1ouSsPCZA_nxvHSOclCALYJm-mwf4afo";
const SHEET_NAME = "LISTA_MESTRE";

const COLS = {
  NOME: 0, DOCUMENTO: 1, LINK_EDITAVEL: 2, CODIGO: 3,
  TIPO: 4, LOCALIZACAO: 5, UNIDADE: 6, AREA: 7,
  STATUS: 8, OBS: 9, DATA_PADRONIZACAO: 10, DATA_REVISAO: 11,
  ITENS_ONA: 12, VERSAO: 13, PROXIMA_REVISAO: 14,
  ELABORADOR: 15, APROVADOR: 16, CRITICIDADE: 17,
};

const HEADERS = [
  "NOME", "DOCUMENTO", "LINK DOCUMENTO (editável)", "CÓDIGO",
  "TIPO", "LOCALIZAÇÃO", "UNIDADE", "ÁREA",
  "STATUS", "OBS", "DATA DE PADRONIZAÇÃO", "DATA DE REVISÃO", "ITENS ONA",
  "VERSÃO", "PRÓXIMA REVISÃO", "ELABORADOR", "APROVADOR", "CRITICIDADE",
];

function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

export async function lerPlanilha(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:R9999`,
  });
  const rows = res.data.values ?? [];
  const hoje = new Date();

  return rows
    .filter(row => row[COLS.DOCUMENTO] || row[COLS.CODIGO])
    .map((row, i) => {
      let status = row[COLS.STATUS] ?? "VIGENTE";
      const dataRevisao = row[COLS.DATA_REVISAO] ?? "";
      if (dataRevisao) {
        const partes = dataRevisao.split("/");
        if (partes.length === 3) {
          const rev = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
          const dias = Math.ceil((rev.getTime() - hoje.getTime()) / (1000*60*60*24));
          if (dias < 0) status = "VENCIDO";
          else if (dias <= 30) status = "VENCENDO";
          else status = "VIGENTE";
        }
      }

      const itensONAStr = row[COLS.ITENS_ONA] ?? "";
      const itensONA = itensONAStr
        ? itensONAStr.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      return {
        _linha: i + 2,
        nome: row[COLS.NOME] ?? "",
        titulo: row[COLS.DOCUMENTO] ?? "",
        linkEditavel: row[COLS.LINK_EDITAVEL] ?? "",
        codigo: row[COLS.CODIGO] ?? "",
        tipo: row[COLS.TIPO] ?? "",
        localizacao: row[COLS.LOCALIZACAO] ?? "",
        unidade: row[COLS.UNIDADE] ?? "",
        area: row[COLS.AREA] ?? "",
        status,
        observacao: row[COLS.OBS] ?? "",
        dataPadronizacao: row[COLS.DATA_PADRONIZACAO] ?? "",
        dataRevisao,
        itensONA,
        versao: row[COLS.VERSAO] ?? "",
        proximaRevisao: row[COLS.PROXIMA_REVISAO] ?? "",
        elaborador: row[COLS.ELABORADOR] ?? "",
        aprovador: row[COLS.APROVADOR] ?? "",
        criticidade: row[COLS.CRITICIDADE] ?? "",
      };
    });
}

export async function gerarCodigo(
  accessToken: string, refreshToken: string | undefined,
  tipoSigla: string, areaSigla: string
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

// Prazos de revisão por tipo conforme Norma Zero (em anos)
const PRAZO_REVISAO_ANOS: Record<string, number> = {
  DIZ: 2, FTI: 1, FFO: 2, FLU: 2, ITA: 2, INT: 2,
  MAN: 2, MAP: 2, MOD: 2, NTE: 2, NOR: 2, PAC: 2,
  PLA: 2, PLC: 2, PSP: 1, POL: 4, PRO: 2, PCG: 2,
  PSG: 2, POP: 2, REG: 4, REL: 2,
};

function calcularProximaRevisao(dataPadronizacao: string, tipoSigla: string): string {
  const anos = PRAZO_REVISAO_ANOS[tipoSigla] ?? 2;
  const partes = dataPadronizacao.split("/");
  if (partes.length !== 3) return "";
  const base = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
  base.setFullYear(base.getFullYear() + anos);
  return `${String(base.getDate()).padStart(2,"0")}/${String(base.getMonth()+1).padStart(2,"0")}/${base.getFullYear()}`;
}

export async function adicionarNaPlanilha(
  accessToken: string, refreshToken: string | undefined, doc: any
) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const tipoSigla = (doc.codigo ?? "").split(".")[0] ?? "";
  const proximaRevisao = doc.proximaRevisao || calcularProximaRevisao(doc.dataPadronizacao ?? "", tipoSigla);

  const row = [
    doc.nome ?? "",
    doc.titulo ?? "",
    doc.linkEditavel ?? "",
    doc.codigo ?? "",
    doc.tipo ?? "",
    doc.localizacao ?? "",
    doc.unidade ?? "",
    doc.area ?? "",
    doc.status ?? "VIGENTE",
    doc.observacao ?? "",
    doc.dataPadronizacao ?? "",
    doc.dataRevisao ?? "",
    Array.isArray(doc.itensONA) ? doc.itensONA.join(", ") : (doc.itensONA ?? ""),
    doc.versao ?? "00",
    proximaRevisao,
    doc.elaborador ?? "",
    doc.aprovador ?? "",
    doc.criticidade ?? "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:R`,
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
  const proximaRevisao = doc.proximaRevisao || calcularProximaRevisao(doc.dataPadronizacao ?? "", tipoSigla);

  const row = [
    doc.nome ?? "",
    doc.titulo ?? "",
    doc.linkEditavel ?? "",
    doc.codigo ?? "",
    doc.tipo ?? "",
    doc.localizacao ?? "",
    doc.unidade ?? "",
    doc.area ?? "",
    doc.status ?? "VIGENTE",
    doc.observacao ?? "",
    doc.dataPadronizacao ?? "",
    doc.dataRevisao ?? "",
    Array.isArray(doc.itensONA) ? doc.itensONA.join(", ") : (doc.itensONA ?? ""),
    doc.versao ?? "00",
    proximaRevisao,
    doc.elaborador ?? "",
    doc.aprovador ?? "",
    doc.criticidade ?? "",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${linha}:R${linha}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

export async function ensureHeaders(accessToken: string, refreshToken?: string) {
  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1:R1`,
  }).catch(() => null);
  const hasHeader = res?.data?.values?.[0]?.[0] === "NOME";
  if (!hasHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW", requestBody: { values: [HEADERS] },
    });
  }
}
