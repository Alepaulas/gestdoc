import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tipos = await prisma.tipoDocumento.findMany({
    include:{ _count:{ select:{ documentos:true } } },
    orderBy:{ sigla:"asc" },
  });
  return NextResponse.json(tipos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { sigla, nome, nivel, cor } = await req.json();
  const tipo = await prisma.tipoDocumento.create({ data:{ sigla, nome, nivel:parseInt(nivel), cor:cor||"#1D4ED8" } });
  return NextResponse.json(tipo, { status:201 });
}
