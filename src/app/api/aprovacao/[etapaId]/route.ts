import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { gerarId, formatDate } from "@/lib/utils";
import { sendEmail, htmlAprovacao, htmlLeitura } from "@/lib/gmail";

export async function PUT(req: NextRequest, { params }: { params: { etapaId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { acao, comentario } = await req.json();

  const etapa = await queryOne<any>("SELECT * FROM EtapaAprovacao WHERE id=?", [params.etapaId]);
  if (!etapa) return NextResponse.json({ error: "Etapa não encontrada" }, { status: 404 });

  const novoStatus = acao === "aprovar" ? "APROVADO" : "DEVOLVIDO";
  await execute("UPDATE EtapaAprovacao SET status=?,respondidoEm=datetime('now'),comentario=? WHERE id=?",
    [novoStatus, comentario||null, params.etapaId]);

  const fluxo = await queryOne<any>("SELECT * FROM FluxoAprovacao WHERE id=?", [etapa.fluxoId]);
  const doc = await queryOne<any>("SELECT * FROM Documento WHERE id=?", [fluxo?.documentoId]);
  const adminUser = await queryOne<any>("SELECT * FROM User WHERE role='ADMIN' LIMIT 1");

  if (acao === "aprovar" && etapa.tipo === "REVISOR") {
    // Ativar etapa do aprovador
    const proxEtapa = await queryOne<any>("SELECT * FROM EtapaAprovacao WHERE fluxoId=? AND ordem=2", [etapa.fluxoId]);
    if (proxEtapa) {
      await execute("UPDATE EtapaAprovacao SET status='PENDENTE' WHERE id=?", [proxEtapa.id]);
      const aprovador = await queryOne<any>("SELECT * FROM User WHERE id=?", [proxEtapa.userId]);
      if (aprovador?.email && adminUser && doc) {
        await sendEmail(adminUser.id, aprovador.email,
          `[GestDoc] Documento para aprovação: ${doc.codigo}`,
          htmlAprovacao(doc.titulo, doc.codigo, "APROVADOR", proxEtapa.id));
      }
    }
  } else if (acao === "aprovar" && etapa.tipo === "APROVADOR") {
    // Publicar documento
    await execute("UPDATE Documento SET status='VIGENTE',updatedAt=datetime('now') WHERE id=?", [fluxo?.documentoId]);
    await execute("UPDATE FluxoAprovacao SET status='CONCLUIDO',updatedAt=datetime('now') WHERE id=?", [etapa.fluxoId]);
    if (doc) await execute("INSERT INTO Revisao(id,documentoId,versao,descricao,dataRevisao,aprovadoPor) VALUES(?,?,?,?,?,?)",
      [gerarId(), doc.id, doc.versao, "Aprovação formal", new Date().toISOString(), (session.user as any).id]);

    // Disparar leituras obrigatórias para a área
    if (doc) {
      const users = await query<any>(`
        SELECT DISTINCT u.id,u.email,u.name FROM User u
        JOIN Documento d2 ON d2.responsavelId=u.id WHERE d2.areaId=(SELECT areaId FROM Documento WHERE id=?) AND u.email IS NOT NULL`, [doc.id]);
      const expires = new Date(); expires.setDate(expires.getDate()+30);
      for (const u of users) {
        const token = gerarId();
        try {
          await execute("INSERT OR IGNORE INTO LeituraConfirmada(id,documentoId,userId,versao,token,expiresAt) VALUES(?,?,?,?,?,?)",
            [gerarId(), doc.id, u.id, doc.versao, token, expires.toISOString()]);
          if (adminUser) await sendEmail(adminUser.id, u.email,
            `[GestDoc] Leitura obrigatória: ${doc.codigo} v${doc.versao}`,
            htmlLeitura(doc.titulo, doc.codigo, doc.versao, token));
        } catch {}
      }
    }
  } else if (acao === "devolver") {
    await execute("UPDATE Documento SET status='RASCUNHO',updatedAt=datetime('now') WHERE id=?", [fluxo?.documentoId]);
    await execute("UPDATE FluxoAprovacao SET status='DEVOLVIDO',updatedAt=datetime('now') WHERE id=?", [etapa.fluxoId]);
  }

  await execute("INSERT INTO AuditLog(id,acao,descricao,documentoId,userId) VALUES(?,?,?,?,?)",
    [gerarId(), acao.toUpperCase(), `Etapa ${etapa.tipo} ${novoStatus}`, fluxo?.documentoId, (session.user as any).id]);

  return NextResponse.json({ success: true });
}
