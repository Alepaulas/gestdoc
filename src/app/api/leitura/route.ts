import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { gerarId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  const leitura = await queryOne<any>(`
    SELECT lc.*,d.titulo,d.codigo,d.versao,us.name FROM LeituraConfirmada lc
    JOIN Documento d ON lc.documentoId=d.id JOIN User us ON lc.userId=us.id
    WHERE lc.token=?`, [token]);
  if (!leitura) return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });
  return NextResponse.json(leitura);
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  const leitura = await queryOne<any>("SELECT * FROM LeituraConfirmada WHERE token=?", [token]);
  if (!leitura) return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  if (leitura.confirmadaEm) return NextResponse.json({ message: "Leitura já confirmada", already: true });
  if (new Date(leitura.expiresAt) < new Date()) return NextResponse.json({ error: "Token expirado" }, { status: 410 });

  await execute("UPDATE LeituraConfirmada SET confirmadaEm=datetime('now') WHERE token=?", [token]);
  await execute("INSERT INTO AuditLog(id,acao,descricao,documentoId,userId) VALUES(?,?,?,?,?)",
    [gerarId(), "LEITURA_CONFIRMADA", `Leitura confirmada via e-mail`, leitura.documentoId, leitura.userId]);

  return NextResponse.json({ success: true, message: "Leitura confirmada com sucesso" });
}
