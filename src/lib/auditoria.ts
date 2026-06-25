// Helper central de auditoria — registra ações no AuditLog do banco
import { prisma } from "@/lib/db";

export type AcaoAuditoria =
  | "CADASTRO_DOCUMENTO"
  | "ATUALIZACAO_DOCUMENTO"
  | "FORMATADOR_USO"
  | "REVISOR_USO"
  | "INVENTARIO_ACESSO"
  | "LISTA_MESTRA_ACESSO"
  | "LOGIN"
  | "LOGOUT";

export async function registrarAuditoria({
  userId,
  acao,
  descricao,
  documentoId,
}: {
  userId: string;
  acao: AcaoAuditoria;
  descricao: string;
  documentoId?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        acao,
        descricao,
        documentoId: documentoId ?? null,
      },
    });
  } catch {
    // Não falha a operação principal por erro de auditoria
  }
}

export function formatarUsuario(name: string | null | undefined, email: string | null | undefined): string {
  if (name && email) return `${name} (${email})`;
  return name ?? email ?? "Desconhecido";
}
