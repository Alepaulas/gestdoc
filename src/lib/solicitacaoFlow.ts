// Máquina de estados do fluxo de Solicitação de Padronização

export type Etapa =
  | "ABERTA"
  | "EM_ANALISE_RT"
  | "DEVOLVIDA_UNIDADE"
  | "EM_ANALISE_NUGESP"
  | "DEVOLVIDA_NUGESP"
  | "EM_PADRONIZACAO"
  | "AGUARDANDO_VALIDACAO_UNIDADE"
  | "AGUARDANDO_PUBLICACAO"
  | "PUBLICADA"
  | "CANCELADA";

export type PapelFluxo =
  | "UNIDADE"
  | "REFERENCIA_TECNICA"
  | "NUGESP"
  | "GESTDOC"
  | "OPERACIONAL"
  | "ADMIN";

export type Acao =
  | "ABERTURA"
  | "RT_APROVA"
  | "RT_REPROVA"
  | "NUGESP_APROVA"
  | "NUGESP_REPROVA"
  | "UNIDADE_REENVIO"
  | "GESTDOC_PADRONIZOU"
  | "UNIDADE_VALIDOU"
  | "GESTDOC_PUBLICOU"
  | "CANCELOU";

export const ETAPA_LABELS: Record<Etapa, string> = {
  ABERTA:                       "Aberta — aguardando Referência Técnica",
  EM_ANALISE_RT:                "Em análise — Referência Técnica",
  DEVOLVIDA_UNIDADE:            "Devolvida — aguardando Unidade",
  EM_ANALISE_NUGESP:            "Em análise — NUGESP",
  DEVOLVIDA_NUGESP:             "Devolvida pelo NUGESP — aguardando Unidade",
  EM_PADRONIZACAO:              "Em padronização — GestDoc",
  AGUARDANDO_VALIDACAO_UNIDADE: "Aguardando validação da Unidade",
  AGUARDANDO_PUBLICACAO:        "Aguardando publicação — GestDoc",
  PUBLICADA:                    "Publicada ✅",
  CANCELADA:                    "Cancelada",
};

export const ETAPA_RESPONSAVEL: Record<Etapa, PapelFluxo | null> = {
  ABERTA:                       "REFERENCIA_TECNICA",
  EM_ANALISE_RT:                "REFERENCIA_TECNICA",
  DEVOLVIDA_UNIDADE:            "UNIDADE",
  EM_ANALISE_NUGESP:            "NUGESP",
  DEVOLVIDA_NUGESP:             "UNIDADE",
  EM_PADRONIZACAO:              "GESTDOC",
  AGUARDANDO_VALIDACAO_UNIDADE: "UNIDADE",
  AGUARDANDO_PUBLICACAO:        "GESTDOC",
  PUBLICADA:                    null,
  CANCELADA:                    null,
};

export const ACAO_LABELS: Record<Acao, string> = {
  ABERTURA:           "Solicitação aberta pela Unidade",
  RT_APROVA:          "Referência Técnica aprovou",
  RT_REPROVA:         "Referência Técnica devolveu para a Unidade",
  NUGESP_APROVA:      "NUGESP aprovou e gerou código — encaminhou ao GestDoc",
  NUGESP_REPROVA:     "NUGESP devolveu para a Unidade",
  UNIDADE_REENVIO:    "Unidade reenviou o documento",
  GESTDOC_PADRONIZOU: "GestDoc padronizou e enviou para validação da Unidade",
  UNIDADE_VALIDOU:    "Unidade validou o documento padronizado",
  GESTDOC_PUBLICOU:   "GestDoc publicou — registrado na Lista Mestra",
  CANCELOU:           "Solicitação cancelada",
};

type Transicao = {
  de: Etapa; acao: Acao; para: Etapa; podeQuem: PapelFluxo[];
  precisaArquivo?: boolean; precisaComentario?: boolean;
};

export const TRANSICOES: Transicao[] = [
  // RT analisa
  { de: "ABERTA",           acao: "RT_APROVA",          para: "EM_ANALISE_NUGESP",            podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "ABERTA",           acao: "RT_REPROVA",          para: "DEVOLVIDA_UNIDADE",             podeQuem: ["REFERENCIA_TECNICA"], precisaComentario: true },
  { de: "EM_ANALISE_RT",    acao: "RT_APROVA",           para: "EM_ANALISE_NUGESP",            podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "EM_ANALISE_RT",    acao: "RT_REPROVA",          para: "DEVOLVIDA_UNIDADE",             podeQuem: ["REFERENCIA_TECNICA"], precisaComentario: true },
  // NUGESP analisa
  { de: "EM_ANALISE_NUGESP", acao: "NUGESP_APROVA",     para: "EM_PADRONIZACAO",              podeQuem: ["NUGESP"] },
  { de: "EM_ANALISE_NUGESP", acao: "NUGESP_REPROVA",    para: "DEVOLVIDA_NUGESP",              podeQuem: ["NUGESP"], precisaComentario: true },
  // Unidade reenvio (tanto de RT quanto de NUGESP)
  { de: "DEVOLVIDA_UNIDADE", acao: "UNIDADE_REENVIO",   para: "EM_ANALISE_RT",                 podeQuem: ["UNIDADE"], precisaArquivo: true, precisaComentario: true },
  { de: "DEVOLVIDA_NUGESP",  acao: "UNIDADE_REENVIO",   para: "EM_ANALISE_NUGESP",             podeQuem: ["UNIDADE"], precisaArquivo: true, precisaComentario: true },
  // GestDoc padroniza
  { de: "EM_PADRONIZACAO",   acao: "GESTDOC_PADRONIZOU", para: "AGUARDANDO_VALIDACAO_UNIDADE", podeQuem: ["GESTDOC"], precisaArquivo: true },
  // Unidade valida
  { de: "AGUARDANDO_VALIDACAO_UNIDADE", acao: "UNIDADE_VALIDOU", para: "AGUARDANDO_PUBLICACAO", podeQuem: ["UNIDADE"] },
  // GestDoc publica
  { de: "AGUARDANDO_PUBLICACAO", acao: "GESTDOC_PUBLICOU", para: "PUBLICADA",                  podeQuem: ["GESTDOC"] },
];

export const ETAPAS_ATIVAS: Etapa[] = [
  "ABERTA","EM_ANALISE_RT","DEVOLVIDA_UNIDADE",
  "EM_ANALISE_NUGESP","DEVOLVIDA_NUGESP",
  "EM_PADRONIZACAO","AGUARDANDO_VALIDACAO_UNIDADE","AGUARDANDO_PUBLICACAO",
];

export function transicoesPermitidas(etapa: Etapa, papel: PapelFluxo | null): Transicao[] {
  if (!papel) return [];
  return TRANSICOES.filter(t => t.de === etapa && t.podeQuem.includes(papel as any));
}

export function podeCancelar(etapa: Etapa, papel: PapelFluxo | null): boolean {
  if (!papel || !ETAPAS_ATIVAS.includes(etapa)) return false;
  return papel === "GESTDOC" || papel === "ADMIN" || ETAPA_RESPONSAVEL[etapa] === papel;
}

export function aplicarTransicao(etapa: Etapa, acao: Acao, papel: PapelFluxo | null): Etapa {
  if (acao === "CANCELOU") {
    if (!podeCancelar(etapa, papel)) throw new Error("Sem permissão para cancelar nesta etapa.");
    return "CANCELADA";
  }
  const t = transicoesPermitidas(etapa, papel).find(t => t.acao === acao);
  if (!t) throw new Error("Ação não permitida para o seu papel nesta etapa.");
  return t.para;
}
