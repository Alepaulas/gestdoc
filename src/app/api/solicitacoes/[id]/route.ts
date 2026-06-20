import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      unidade: { select: { nome: true, sigla: true } },
      solicitante: { select: { name: true, email: true } },
      anexos: { orderBy: { createdAt: "asc" }, include: { } },
      etapas: {
        orderBy: { createdAt: "asc" },
        include: { responsavel: { select: { name: true, email: true, papelFluxo: true } } },
      },
    },
  });

  if (!solicitacao) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });

  // Junta o nome de quem enviou cada anexo
  const userIds = Array.from(new Set(solicitacao.anexos.map((a) => a.enviadoPorId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const anexosComUsuario = solicitacao.anexos.map((a) => ({
    ...a,
    enviadoPor: userMap[a.enviadoPorId] ?? null,
  }));

  return NextResponse.json({ ...solicitacao, anexos: anexosComUsuario });
}
