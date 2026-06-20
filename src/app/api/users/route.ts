import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await prisma.user.findMany({
    select:{ id:true, name:true, email:true, image:true, role:true, unidadeId:true, papelFluxo:true,
      unidade:{ select:{ nome:true, sigla:true } } },
    orderBy:{ name:"asc" },
  });
  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, role, unidadeId, papelFluxo } = await req.json();
  const data: any = {};
  if (role !== undefined) data.role = role;
  if (unidadeId !== undefined) data.unidadeId = unidadeId || null;
  if (papelFluxo !== undefined) data.papelFluxo = papelFluxo || null;
  await prisma.user.update({ where:{ id:userId }, data });
  return NextResponse.json({ success:true });
}
