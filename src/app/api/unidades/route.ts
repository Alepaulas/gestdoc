import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unidades = await prisma.unidade.findMany({
    include:{ setores:{ include:{ areas:true } } },
    orderBy:{ sigla:"asc" },
  });
  return NextResponse.json(unidades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { nome, sigla } = await req.json();
  const unidade = await prisma.unidade.create({ data:{ nome, sigla } });
  return NextResponse.json(unidade, { status:201 });
}
