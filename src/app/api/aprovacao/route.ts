import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { gerarId } from "@/lib/utils";
import { sendEmail, htmlAprovacao } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { documentoId, revisorId, aprovadorId } = await req.json();

  const doc = await queryOne<any>("SELECT * FROM Documento WHERE id=?", [documentoId]);
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  // Criar fluxo
  const fluxoId = gerarId();
  await execute("INSERT INTO FluxoAprovacao(id,documentoId,status) VALUES(?,?,?)", [fluxoId, documentoId, "PENDENTE"]);
  await execute("UPDATE Documento SET status='EM_REVISAO',updatedAt=datetime('now') WHERE id=?", [documentoId]);

  const prazoRevisor = new Date(); prazoRevisor.setDate(prazoRevisor.getDate()+7);
  const prazoAprovador = new Date(); prazoAprovador.setDate(prazoAprovador.getDate()+14);

  const e1Id = gerarId(); const e2Id = gerarId();
  await execute("INSERT INTO EtapaAprovacao(id,fluxoId,ordem,tipo,userId,status,prazo) VALUES(?,?,?,?,?,?,?)",
    [e1Id, fluxoId, 1, "REVISOR", revisorId, "PENDENTE", prazoRevisor.toISOString()]);
  await execute("INSERT INTO EtapaAprovacao(id,fluxoId,ordem,tipo,userId,status,prazo) VALUES(?,?,?,?,?,?,?)",
    [e2Id, fluxoId, 2, "APROVADOR", aprovadorId, "AGUARDANDO", prazoAprovador.toISOString()]);

  // Notificar revisor
  const revisor = await queryOne<any>("SELECT * FROM User WHERE id=?", [revisorId]);
  const adminUser = await queryOne<any>("SELECT * FROM User WHERE role='ADMIN' LIMIT 1");
  if (revisor?.email && adminUser) {
    await sendEmail(adminUser.id, revisor.email,
      `[GestDoc] Documento para revisão: ${doc.codigo}`,
      htmlAprovacao(doc.titulo, doc.codigo, "REVISOR", e1Id));
  }

  await execute("INSERT INTO AuditLog(id,acao,descricao,documentoId,userId) VALUES(?,?,?,?,?)",
    [gerarId(), "FLUXO_INICIADO", `Fluxo de aprovação iniciado`, documentoId, (session.user as any).id]);

  return NextResponse.json({ fluxoId, success: true }, { status: 201 });
}
