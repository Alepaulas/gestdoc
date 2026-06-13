import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { gerarId, calcStatus } from "@/lib/utils";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const doc = await queryOne<any>(`
    SELECT d.*,c.nome as catNome,c.sigla,c.cor,a.id as areaId,a.nome as area,
           s.id as setorId,s.nome as setor,u.id as unidadeId,u.nome as unidade,
           us.name as responsavelNome,us.email as responsavelEmail
    FROM Documento d JOIN Categoria c ON d.categoriaId=c.id
    JOIN Area a ON d.areaId=a.id JOIN Setor s ON a.setorId=s.id JOIN Unidade u ON s.unidadeId=u.id
    JOIN User us ON d.responsavelId=us.id WHERE d.id=?`, [params.id]);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const itensONA = await query<any>(`SELECT oi.* FROM ItemONA oi JOIN DocumentoItemONA doi ON oi.id=doi.itemONAId WHERE doi.documentoId=?`, [params.id]);
  const revisoes = await query<any>("SELECT * FROM Revisao WHERE documentoId=? ORDER BY createdAt DESC", [params.id]);
  const auditLog = await query<any>(`SELECT al.*,us.name FROM AuditLog al JOIN User us ON al.userId=us.id WHERE al.documentoId=? ORDER BY al.createdAt DESC LIMIT 20`, [params.id]);
  const leituras = await query<any>(`SELECT lc.*,us.name,us.email FROM LeituraConfirmada lc JOIN User us ON lc.userId=us.id WHERE lc.documentoId=? ORDER BY lc.expiresAt DESC`, [params.id]);
  return NextResponse.json({ ...doc, itensONA, revisoes, auditLog, leituras });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const status = body.dataRevisao ? calcStatus(body.dataRevisao, body.status || "VIGENTE") : body.status;
  await execute(`UPDATE Documento SET titulo=?,versao=?,status=?,dataEmissao=?,dataRevisao=?,descricao=?,areaId=?,responsavelId=?,driveFileId=?,driveFileUrl=?,driveFileName=?,updatedAt=datetime('now') WHERE id=?`,
    [body.titulo,body.versao,status,body.dataEmissao,body.dataRevisao,body.descricao||null,body.areaId,body.responsavelId,body.driveFileId||null,body.driveFileUrl||null,body.driveFileName||null,params.id]);
  if (body.itensONA) {
    await execute("DELETE FROM DocumentoItemONA WHERE documentoId=?", [params.id]);
    for (const itemId of body.itensONA) await execute("INSERT OR IGNORE INTO DocumentoItemONA(documentoId,itemONAId) VALUES(?,?)", [params.id,itemId]);
  }
  await execute("INSERT INTO AuditLog(id,acao,descricao,documentoId,userId) VALUES(?,?,?,?,?)",
    [gerarId(),"EDICAO","Documento atualizado",params.id,(session.user as any).id]);
  return NextResponse.json({ success: true });
}
