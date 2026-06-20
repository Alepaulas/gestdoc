// Máquina de estados do fluxo de Solicitação de Padronização.
// Centraliza: quem pode agir em cada etapa, quais ações são válidas,
// e para qual etapa cada ação leva.

export type Etapa =
  | "ABERTA"
  | "EM_ANALISE_RT"
  | "DEVOLVIDA_UNIDADE"
  | "EM_PADRONIZACAO"
  | "AGUARDANDO_VALIDACAO_UNIDADE"
  | "PUBLICADA"
  | "CANCELADA";

export type PapelFluxo = "UNIDADE" | "REFERENCIA_TECNICA" | "GESTDOC";

export type Acao =
  | "ABERTURA"
  | "VALIDOU"
  | "NAO_VALIDOU"
  | "REENVIO"
  | "PADRONIZOU"
  | "ENVIOU_VALIDACAO"
  | "VALIDOU_UNIDADE"
  | "PUBLICOU"
  | "CANCELOU";

export const ETAPA_LABELS: Record<Etapa, string> = {
  ABERTA: "Aberta — aguardando triagem",
  EM_ANALISE_RT: "Em análise — Referência Técnica",
  DEVOLVIDA_UNIDADE: "Devolvida — aguardando Unidade",
  EM_PADRONIZACAO: "Em padronização — GestDoc",
  AGUARDANDO_VALIDACAO_UNIDADE: "Aguardando validação da Unidade",
  PUBLICADA: "Publicada",
  CANCELADA: "Cancelada",
};

// Quem está "com a bola" em cada etapa (papel responsável pela próxima ação)
export const ETAPA_RESPONSAVEL: Record<Etapa, PapelFluxo | null> = {
  ABERTA: "REFERENCIA_TECNICA",
  EM_ANALISE_RT: "REFERENCIA_TECNICA",
  DEVOLVIDA_UNIDADE: "UNIDADE",
  EM_PADRONIZACAO: "GESTDOC",
  AGUARDANDO_VALIDACAO_UNIDADE: "UNIDADE",
  PUBLICADA: null,
  CANCELADA: null,
};

type Transicao = { de: Etapa; acao: Acao; para: Etapa; podeQuem: PapelFluxo[] };

export const TRANSICOES: Transicao[] = [
  { de: "ABERTA",                         acao: "VALIDOU",          para: "EM_PADRONIZACAO",               podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "ABERTA",                         acao: "NAO_VALIDOU",      para: "DEVOLVIDA_UNIDADE",              podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "EM_ANALISE_RT",                  acao: "VALIDOU",          para: "EM_PADRONIZACAO",               podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "EM_ANALISE_RT",                  acao: "NAO_VALIDOU",      para: "DEVOLVIDA_UNIDADE",              podeQuem: ["REFERENCIA_TECNICA"] },
  { de: "DEVOLVIDA_UNIDADE",              acao: "REENVIO",          para: "EM_ANALISE_RT",                  podeQuem: ["UNIDADE"] },
  { de: "EM_PADRONIZACAO",                acao: "PADRONIZOU",       para: "AGUARDANDO_VALIDACAO_UNIDADE",   podeQuem: ["GESTDOC"] },
  { de: "AGUARDANDO_VALIDACAO_UNIDADE",   acao: "VALIDOU_UNIDADE",  para: "PUBLICADA",                      podeQuem: ["UNIDADE"] },
  // Cancelamento permitido em qualquer etapa ativa, por quem está com a bola ou pelo GestDoc (administra o fluxo)
];

export const ETAPAS_ATIVAS: Etapa[] = [
  "ABERTA", "EM_ANALISE_RT", "DEVOLVIDA_UNIDADE", "EM_PADRONIZACAO", "AGUARDANDO_VALIDACAO_UNIDADE",
];

export function transicoesPermitidas(etapaAtual: Etapa, papel: PapelFluxo | null): Transicao[] {
  if (!papel) return [];
  return TRANSICOES.filter((t) => t.de === etapaAtual && t.podeQuem.includes(papel));
}

export function podeCancelar(etapaAtual: Etapa, papel: PapelFluxo | null): boolean {
  if (!papel) return false;
  if (!ETAPAS_ATIVAS.includes(etapaAtual)) return false;
  // GestDoc administra o fluxo inteiro; o papel atualmente responsável também pode cancelar
  return papel === "GESTDOC" || ETAPA_RESPONSAVEL[etapaAtual] === papel;
}

export function aplicarTransicao(etapaAtual: Etapa, acao: Acao, papel: PapelFluxo | null): Etapa {
  if (acao === "CANCELOU") {
    if (!podeCancelar(etapaAtual, papel)) {
      throw new Error("Você não tem permissão para cancelar esta solicitação nesta etapa.");
    }
    return "CANCELADA";
  }

  const permitidas = transicoesPermitidas(etapaAtual, papel);
  const transicao = permitidas.find((t) => t.acao === acao);
  if (!transicao) {
    throw new Error("Ação não permitida para o seu papel nesta etapa do fluxo.");
  }
  return transicao.para;
}
