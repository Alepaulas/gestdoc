// Registra auditoria na planilha via API (fire-and-forget)
export type AcaoAuditoria =
  | "CADASTRO_DOCUMENTO" | "ATUALIZACAO_DOCUMENTO"
  | "FORMATADOR_USO" | "REVISOR_USO"
  | "INVENTARIO_ACESSO" | "LISTA_MESTRA_ACESSO"
  | "ACESSO" | "EDIÇÃO" | "EXPORTAÇÃO";

export async function registrarAuditoria(params: {
  userId?: string;
  acao: string;
  descricao?: string;
  documentoId?: string;
}): Promise<void> {
  // No servidor não temos acesso ao token do usuário aqui
  // A auditoria real é feita pelo useAuditoria hook no cliente
  // Este stub evita erros em chamadas de server components
  console.log(`[Auditoria] ${params.acao}: ${params.descricao ?? ""}`);
}
