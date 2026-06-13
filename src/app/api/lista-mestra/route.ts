import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const status = searchParams.get("status") ?? "";
  const unidade = searchParams.get("unidade") ?? "";

  const documentos = await prisma.documento.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { titulo: { contains: search } },
            { codigo: { contains: search } },
          ]
        } : {},
        tipo ? { tipo: { sigla: tipo } } : {},
        status ? { status } : {},
        unidade ? { area: { setor: { unidade: { sigla: unidade } } } } : {},
      ]
    },
    include: {
      tipo: true,
      area: { include: { setor: { include: { unidade: true } } } },
      responsavel: { select: { id: true, name: true, email: true } },
      itensONA: { include: { itemONA: true } },
    },
    orderBy: { codigo: "asc" },
  });

  return NextResponse.json(documentos);
}
