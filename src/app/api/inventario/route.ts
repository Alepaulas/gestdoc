import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha } from "@/lib/sheets";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado." }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { searchParams } = new URL(req.url);

  // Admin/GestDoc pode filtrar manualmente; outros veem só a sua área
  const role      = (session.user as any).role as string;
  const papel     = (session.user as any).papelFluxo as string;
  const isAdmin   = role === "ADMIN" || papel === "GESTDOC";

  // Busca unidade e setor do usuário logado
  let unidadeFiltro = searchParams.get("unidade") ?? "";
  let setorFiltro   = searchParams.get("setor")   ?? "";
  const busca       = searchParams.get("busca")   ?? "";
  const status      = searchParams.get("status")  ?? "";

  if (!isAdmin) {
    // Busca a unidade vinculada ao usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { unidade: true },
    });
    if (user?.unidade) {
      unidadeFiltro = user.unidade.sigla;
    }
  }

  try {
    let docs = await lerPlanilha(accessToken, refreshToken);

    // Filtra por unidade E/OU setor
    if (unidadeFiltro || setorFiltro) {
      docs = docs.filter(d => {
        const matchUnidade = unidadeFiltro
          ? d.unidade.toUpperCase().includes(unidadeFiltro.toUpperCase())
          : true;
        const matchSetor = setorFiltro
          ? d.setor.toUpperCase().includes(setorFiltro.toUpperCase())
          : true;
        return matchUnidade || matchSetor;
      });
    }

    if (busca) {
      docs = docs.filter(d =>
        d.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        d.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        d.tipoDocumento.toLowerCase().includes(busca.toLowerCase())
      );
    }

    if (status) docs = docs.filter(d => d.statusValidade === status);

    return NextResponse.json({ docs, total: docs.length, isAdmin, unidadeFiltro });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
