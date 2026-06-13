import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [total, vigentes, vencendo, vencidos, emRevisao] = await Promise.all([
    prisma.documento.count({ where:{ status:{ not:"OBSOLETO" } } }),
    prisma.documento.count({ where:{ status:"VIGENTE" } }),
    prisma.documento.count({ where:{ status:"VENCENDO" } }),
    prisma.documento.count({ where:{ status:"VENCIDO" } }),
    prisma.documento.count({ where:{ status:"EM_REVISAO" } }),
  ]);

  const alertas = await prisma.documento.findMany({
    where:{ status:{ in:["VENCENDO","VENCIDO"] } },
    include:{
      tipo:true,
      area:{ include:{ setor:{ include:{ unidade:true } } } },
      responsavel:{ select:{ name:true } },
    },
    orderBy:{ proximaRevisao:"asc" },
    take:10,
  });

  const porCategoria = await prisma.tipoDocumento.findMany({
    include:{ _count:{ select:{ documentos:{ where:{ status:{ not:"OBSOLETO" } } } } } },
    orderBy:{ sigla:"asc" },
  });

  return NextResponse.json({
    total, vigentes, vencendo, vencidos, emRevisao,
    revisoesPendentes: vencendo + vencidos,
    alertas: alertas.map(d => ({
      id:d.id, titulo:d.titulo, codigo:d.codigo, status:d.status,
      dataRevisao:d.dataRevisao, proximaRevisao:d.proximaRevisao,
      unidade:d.area.setor.unidade.nome,
      setor:d.area.setor.nome,
      area:d.area.nome,
    })),
    porCategoria: porCategoria.map(c => ({
      id:c.id, sigla:c.sigla, nome:c.nome, cor:c.cor,
      total:c._count.documentos,
    })),
  });
}
