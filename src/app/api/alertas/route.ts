import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  if (!isCron && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agora = new Date();
  const em30 = new Date(); em30.setDate(em30.getDate()+30);

  const docs = await prisma.documento.findMany({
    where:{ status:{ notIn:["OBSOLETO"] } },
    select:{ id:true, proximaRevisao:true, status:true },
  });

  let atualizados = 0;
  for (const doc of docs) {
    const diff = Math.ceil((doc.proximaRevisao.getTime() - agora.getTime()) / (1000*60*60*24));
    const novoStatus = diff < 0 ? "VENCIDO" : diff <= 30 ? "VENCENDO" : "VIGENTE";
    if (novoStatus !== doc.status) {
      await prisma.documento.update({ where:{ id:doc.id }, data:{ status:novoStatus } });
      atualizados++;
    }
  }
  return NextResponse.json({ processados:docs.length, atualizados, emailsEnviados:0 });
}
