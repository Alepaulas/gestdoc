import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { gerarId } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cats = await query<any>(`SELECT c.*,COUNT(d.id) as total FROM Categoria c LEFT JOIN Documento d ON c.id=d.categoriaId AND d.status!='OBSOLETO' GROUP BY c.id ORDER BY c.nome`);
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { nome, sigla, cor } = await req.json();
  const id = gerarId();
  await execute("INSERT INTO Categoria(id,nome,sigla,cor) VALUES(?,?,?,?)", [id, nome, sigla, cor||"#1D4ED8"]);
  return NextResponse.json({ id, nome, sigla, cor }, { status: 201 });
}
