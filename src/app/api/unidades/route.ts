import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { gerarId } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unidades = await query<any>("SELECT * FROM Unidade ORDER BY nome");
  for (const u of unidades) {
    u.setores = await query<any>("SELECT * FROM Setor WHERE unidadeId=? ORDER BY nome", [u.id]);
    for (const s of u.setores) s.areas = await query<any>("SELECT * FROM Area WHERE setorId=? ORDER BY nome", [s.id]);
  }
  return NextResponse.json(unidades);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { nome, codigo } = await req.json();
  const id = gerarId();
  await execute("INSERT INTO Unidade(id,nome,codigo) VALUES(?,?,?)", [id, nome, codigo]);
  return NextResponse.json({ id, nome, codigo }, { status: 201 });
}
