import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { gerarId, calcStatus, formatDate } from "@/lib/utils";
import { sendEmail, htmlAlerta } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!isCron && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await query<any>(`
    SELECT d.*,us.email,us.name FROM Documento d JOIN User us ON d.responsavelId=us.id
    WHERE d.status NOT IN ('OBSOLETO','RASCUNHO')`);

  const adminUser = await queryOne<any>("SELECT * FROM User WHERE role='ADMIN' LIMIT 1");
  let updated = 0; let sent = 0;

  for (const doc of docs) {
    const novoStatus = calcStatus(doc.dataRevisao, doc.status);
    if (novoStatus !== doc.status) {
      await execute("UPDATE Documento SET status=?,updatedAt=datetime('now') WHERE id=?", [novoStatus, doc.id]);
      updated++;
    }
    if ((novoStatus === "VENCENDO" || novoStatus === "VENCIDO") && doc.email && adminUser) {
      const ok = await sendEmail(adminUser.id, doc.email,
        `[GestDoc] ${novoStatus === "VENCIDO" ? "🚨 Vencido" : "⚠️ Vencendo"}: ${doc.codigo}`,
        htmlAlerta(doc.titulo, doc.codigo, novoStatus, formatDate(doc.dataRevisao), doc.id));
      if (ok) {
        sent++;
        await execute("INSERT INTO Notificacao(id,tipo,mensagem,documentoId,emailEnviado) VALUES(?,?,?,?,?)",
          [gerarId(), novoStatus, `${doc.codigo} — ${doc.titulo}`, doc.id, 1]);
      }
    }
  }
  return NextResponse.json({ processados: docs.length, atualizados: updated, emailsEnviados: sent });
}
