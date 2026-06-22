// Máquina de estados do fluxo de Solicitação de Padronização.

export type Etapa =
  | "ABERTA"
  | "EM_ANALISE_RT"
  | "DEVOLVIDA_UNIDADE"
  | "EM_PADRONIZACAO"
  | "AGUARDANDO_VALIDACAO_UNIDADE"
  | "AGUARDANDO_PUBLICACAO"
  | "PUBLICADA"
  | "CANCELADA";

export type PapelFluxo = "UNIDADE" | "REFERENCIA_TECNICA" | "GESTDOC" | "OPERACIONAL" | "ADMIN";

export type Acao =
  | "ABERTURA"
  | "VALIDOU"
  | "NAO_VALIDOU"
  | "REENVIO"
  | "PADRONIZOU"
  | "VALIDOU_UNIDADE"
  | "PUBLICOU"
  | "CANCELOU";

export const ETAPA_LABELS: Record<Etapa, string> = {
  ABERTA:                       "Aberta — aguardando triagem",
  EM_ANALISE_RT:                "Em análise — Referência Técnica",
  DEVOLVIDA_UNIDADE:            "Devolvida — aguardando Unidade",
  EM_PADRONIZACAO:              "Em padronização — GestDoc",
  AGUARDANDO_VALIDACAO_UNIDADE: "Aguardando validação da Unidade",
  AGUARDANDO_PUBLICACAO:        "Aguardando publicação — GestDoc",
  PUBLICADA:                    "Publicada",
  CANCELADA:                    "Cancelada",
};

export const ETAPA_RESPONSAVEL: Record<Etapa, PapelFluxo | null> = {
  ABERTA:                       "REFERENCIA_TECNICA",
  EM_ANALISE_RT:                "REFERENCIA_TECNICA",
  DEVOLVIDA_UNIDADE:            "UNIDADE",
  EM_PADRONIZACAO:              "GESTDOC",
  AGUARDANDO_VALIDACAO_UNIDADE: "UNIDADE",
  AGUARDANDO_PUBLICACAO:        "GESTDOC",
  PUBLICADA:                    null,
  CANCELADA:                    null,
};

type Transicao = { de: Etapa; acao: Acao; para: Etapa; podeQuem: PapelFluxo[] };

export const TRANSICOES: Transicao[] = [
  // RT analisa
  { de: "ABERTA",                         acao: "VALIDOU",         para: "EM_PADRONIZACAO",              podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "ABERTA",                         acao: "NAO_VALIDOU",     para: "DEVOLVIDA_UNIDADE",             podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "EM_ANALISE_RT",                  acao: "VALIDOU",         para: "EM_PADRONIZACAO",              podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "EM_ANALISE_RT",                  acao: "NAO_VALIDOU",     para: "DEVOLVIDA_UNIDADE",             podeQuem: ["REFERENCIA_TECNICA"] },
  // Unidade responde devolução
  { de: "DEVOLVIDA_UNIDADE",              acao: "REENVIO",         para: "EM_ANALISE_RT",                 podeQuem: ["UNIDADE"] },
  // GestDoc padroniza
  { de: "EM_PADRONIZACAO",               acao: "PADRONIZOU",      para: "AGUARDANDO_VALIDACAO_UNIDADE",  podeQuem: ["GESTDOC"] },
  // Unidade valida o padronizado
  { de: "AGUARDANDO_VALIDACAO_UNIDADE",  acao: "VALIDOU_UNIDADE", para: "AGUARDANDO_PUBLICACAO",         podeQuem: ["UNIDADE"] },
  // GestDoc publica → grava na Lista Mestra
  { de: "AGUARDANDO_PUBLICACAO",         acao: "PUBLICOU",        para: "PUBLICADA",                     podeQuem: ["GESTDOC"] },
];

export const ETAPAS_ATIVAS: Etapa[] = [
  "ABERTA", "EM_ANALISE_RT", "DEVOLVIDA_UNIDADE",
  "EM_PADRONIZACAO", "AGUARDANDO_VALIDACAO_UNIDADE", "AGUARDANDO_PUBLICACAO",
];

export function transicoesPermitidas(etapaAtual: Etapa, papel: PapelFluxo | null): Transicao[] {
  if (!papel) return [];
  return TRANSICOES.filter(t => t.de === etapaAtual && t.podeQuem.includes(papel as any));
}

export function podeCancelar(etapaAtual: Etapa, papel: PapelFluxo | null): boolean {
  if (!papel) return false;
  if (!ETAPAS_ATIVAS.includes(etapaAtual)) return false;
  return papel === "GESTDOC" || papel === "ADMIN" || ETAPA_RESPONSAVEL[etapaAtual] === papel;
}

export function aplicarTransicao(etapaAtual: Etapa, acao: Acao, papel: PapelFluxo | null): Etapa {
  if (acao === "CANCELOU") {
    if (!podeCancelar(etapaAtual, papel))
      throw new Error("Você não tem permissão para cancelar esta solicitação nesta etapa.");
    return "CANCELADA";
  }
  const permitidas = transicoesPermitidas(etapaAtual, papel);
  const transicao = permitidas.find(t => t.acao === acao);
  if (!transicao)
    throw new Error("Ação não permitida para o seu papel nesta etapa do fluxo.");
  return transicao.para;
}
