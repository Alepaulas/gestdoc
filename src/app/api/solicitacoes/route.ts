import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/drive";

async function gerarCodigo(): Promise<string> {
  const ano = new Date().getFullYear();
  const count = await prisma.solicitacao.count({
    where: { codigo: { startsWith: `SOL-${ano}-` } },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `SOL-${ano}-${seq}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const { searchParams } = new URL(req.url);
  const filtro = searchParams.get("filtro"); // "minhas" | "fila" | null (todas)

  let where: any = {};
  if (filtro === "minhas") {
    where = { unidadeId: user?.unidadeId ?? "___none___" };
  } else if (filtro === "fila" && user?.papelFluxo) {
    // Solicitações cuja etapa atual está com o papel do usuário logado
    const etapasPorPapel: Record<string, string[]> = {
      UNIDADE: ["DEVOLVIDA_UNIDADE", "AGUARDANDO_VALIDACAO_UNIDADE"],
      REFERENCIA_TECNICA: ["ABERTA", "EM_ANALISE_RT"],
      GESTDOC: ["EM_PADRONIZACAO"],
    };
    where = { etapaAtual: { in: etapasPorPapel[user.papelFluxo] ?? [] } };
  }

  const solicitacoes = await prisma.solicitacao.findMany({
    where,
    include: {
      unidade: { select: { nome: true, sigla: true } },
      solicitante: { select: { name: true, email: true } },
      _count: { select: { anexos: true } },
      etapas: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(solicitacoes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.unidadeId) {
    return NextResponse.json(
      { error: "Seu usuário não está vinculado a uma unidade. Contate o administrador." },
      { status: 400 }
    );
  }
  if (user.papelFluxo !== "UNIDADE") {
    return NextResponse.json(
      { error: "Apenas usuários com papel UNIDADE podem abrir solicitações de padronização." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const titulo = formData.get("titulo") as string;
  const descricao = formData.get("descricao") as string;
  const arquivos = formData.getAll("arquivos") as File[];

  if (!titulo?.trim() || !descricao?.trim()) {
    return NextResponse.json({ error: "Título e descrição são obrigatórios." }, { status: 400 });
  }
  if (arquivos.length === 0) {
    return NextResponse.json({ error: "Anexe ao menos um documento." }, { status: 400 });
  }

  const codigo = await gerarCodigo();

  try {
    const solicitacao = await prisma.solicitacao.create({
      data: {
        codigo,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        etapaAtual: "ABERTA",
        unidadeId: user.unidadeId,
        solicitanteId: user.id,
        etapas: {
          create: {
            etapa: "ABERTA",
            acao: "ABERTURA",
            comentario: "Solicitação aberta pela unidade.",
            responsavelId: user.id,
          },
        },
      },
    });

    // Upload dos anexos para o Drive do solicitante
    for (const file of arquivos) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadToDrive(user.id, file.name, file.type || "application/octet-stream", buffer);
      await prisma.solicitacaoAnexo.create({
        data: {
          solicitacaoId: solicitacao.id,
          nome: uploaded.fileName,
          url: uploaded.fileUrl,
          enviadoPorId: user.id,
          etapa: "ABERTA",
        },
      });
    }

    return NextResponse.json({ success: true, id: solicitacao.id, codigo: solicitacao.codigo });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao criar solicitação." }, { status: 500 });
  }
}
