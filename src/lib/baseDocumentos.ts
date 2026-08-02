import { google } from "googleapis";

// Planilha separada da LISTA_MESTRE — usada apenas pelo Formatador
// para nomear os arquivos de saída (UNIDADE - CÓDIGO - TÍTULO_DATA)
const SPREADSHEET_ID_BASE = "1sFaMz20AyVCe1_pumwCqDyngOtTEHvEfdcO8bgFhUWM";
const SHEET_NAME = "BASE_DOCUMENTOS";

export type DocumentoBase = {
  tipo: string;
  codigo: string;
  titulo: string;
  unidade: string;
  setor: string;
};

function getSheetsClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: "v4", auth: oauth2 });
}

// Remove acentos, espaços e pontuação para comparar nomes de forma tolerante
function normalizar(s: string): string {
  return (s ?? "")
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

// Cache simples em memória (evita reler a planilha a cada arquivo do lote)
let cache: { data: DocumentoBase[]; ts: number } | null = null;
const CACHE_MS = 2 * 60 * 1000;

export async function lerBaseDocumentos(
  accessToken: string,
  refreshToken?: string
): Promise<DocumentoBase[]> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.data;

  const sheets = getSheetsClient(accessToken, refreshToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID_BASE,
    range: `${SHEET_NAME}!A1:Z9999`,
  });
  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  // Mapeia colunas pelo cabeçalho (mais robusto que índice fixo,
  // já que a aba pode ter colunas reorganizadas)
  const headers = rows[0].map(h => (h ?? "").toString().trim().toUpperCase());
  const idx = (...nomes: string[]) => {
    for (const nome of nomes) {
      const i = headers.findIndex(h => h.startsWith(nome));
      if (i > -1) return i;
    }
    return -1;
  };

  const iTipo = idx("TIPO DE DOCUMENTO");
  const iCodigo = idx("CÓDIGO", "CODIGO");
  const iTitulo = idx("TITULO DO DOCUMENTO", "TÍTULO DO DOCUMENTO");
  const iUnidade = idx("UNIDADE");
  const iSetor = idx("SETOR");

  const data = rows
    .slice(1)
    .filter(r => (r[iCodigo] ?? "").toString().trim())
    .map(r => ({
      tipo: (r[iTipo] ?? "").toString().trim(),
      codigo: (r[iCodigo] ?? "").toString().trim(),
      titulo: (r[iTitulo] ?? "").toString().trim(),
      unidade: (r[iUnidade] ?? "").toString().trim(),
      setor: (r[iSetor] ?? "").toString().trim(),
    }));

  cache = { data, ts: Date.now() };
  return data;
}

/**
 * Identifica a linha da BASE_DOCUMENTOS correspondente ao arquivo enviado,
 * comparando o nome do arquivo (sem extensão) com o CÓDIGO e, na ausência
 * de correspondência, com o TÍTULO DO DOCUMENTO.
 */
export async function buscarDocumentoPorNomeArquivo(
  accessToken: string,
  refreshToken: string | undefined,
  fileName: string
): Promise<DocumentoBase | null> {
  const base = await lerBaseDocumentos(accessToken, refreshToken);
  const nomeSemExt = fileName.replace(/\.(docx|dotx|dotm)$/i, "");
  const nomeNorm = normalizar(nomeSemExt);
  if (!nomeNorm) return null;

  // 1) Match por CÓDIGO — mais confiável. Se houver mais de um código
  //    contido no nome do arquivo, prioriza o mais específico (mais longo).
  const porCodigo = base
    .filter(d => d.codigo && nomeNorm.includes(normalizar(d.codigo)))
    .sort((a, b) => b.codigo.length - a.codigo.length);
  if (porCodigo.length > 0) return porCodigo[0];

  // 2) Fallback: match por TÍTULO DO DOCUMENTO
  const porTitulo = base
    .filter(d => d.titulo && nomeNorm.includes(normalizar(d.titulo)))
    .sort((a, b) => b.titulo.length - a.titulo.length);
  if (porTitulo.length > 0) return porTitulo[0];

  return null;
}

// Gera o sufixo de data no formato DDMMYY (ex.: 30/07/2026 -> "300726")
export function dataHojeDDMMYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// Monta o nome final: "UNIDADE - CÓDIGO - TITULO DO DOCUMENTO_DDMMYY"
// Sanitiza caracteres inválidos para nome de arquivo (mantém acentos).
export function montarNomeArquivo(doc: DocumentoBase): string {
  const limpar = (s: string) => s.replace(/[\\/:*?"<>|]/g, "").trim();
  const base = `${limpar(doc.unidade)} - ${limpar(doc.codigo)} - ${limpar(doc.titulo)}`;
  return `${base}_${dataHojeDDMMYY()}`;
}
