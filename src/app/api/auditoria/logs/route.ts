import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const role = (session.user as any).role as string;
  if (role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limite = parseInt(searchParams.get("limite") ?? "100");
  const acao = searchParams.get("acao") ?? "";
  const userId = searchParams.get("userId") ?? "";

  const where: any = {};
  if (acao) where.acao = acao;
  if (userId) where.userId = userId;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limite,
    include: {
      user: { select: { name: true, email: true, papelFluxo: true } },
    },
  });

  const stats = await prisma.auditLog.groupBy({
    by: ["acao"],
    _count: { acao: true },
    orderBy: { _count: { acao: "desc" } },
  });

  return NextResponse.json({ logs, stats });
}
