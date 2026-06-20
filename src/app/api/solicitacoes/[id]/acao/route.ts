import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadToDrive } from "@/lib/drive";
import { aplicarTransicao, type Acao, type Etapa, type PapelFluxo } from "@/lib/solicitacaoFlow";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.papelFluxo) {
    return NextResponse.json(
      { error: "Seu usuário não tem papel definido no fluxo. Contate o administrador." },
      { status: 403 }
    );
  }

  const solicitacao = await prisma.solicitacao.findUnique({ where: { id } });
  if (!solicitacao) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });

  // Restringe ações de UNIDADE à própria unidade da solicitação
  if (user.papelFluxo === "UNIDADE" && user.unidadeId !== solicitacao.unidadeId) {
    return NextResponse.json(
      { error: "Você só pode agir em solicitações da sua própria unidade." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const acao = formData.get("acao") as Acao;
  const comentario = (formData.get("comentario") as string) ?? "";
  const arquivos = formData.getAll("arquivos") as File[];

  let novaEtapa: Etapa;
  try {
    novaEtapa = aplicarTransicao(
      solicitacao.etapaAtual as Etapa,
      acao,
      user.papelFluxo as PapelFluxo
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  // Ações que exigem reanexar documento
  if ((acao === "REENVIO" || acao === "PADRONIZOU") && arquivos.length === 0) {
    return NextResponse.json(
      { error: "É necessário anexar ao menos um documento para esta ação." },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.solicitacao.update({
        where: { id },
        data: { etapaAtual: novaEtapa },
      });

      await tx.solicitacaoEtapa.create({
        data: {
          solicitacaoId: id,
          etapa: novaEtapa,
          acao,
          comentario: comentario.trim() || null,
          responsavelId: user.id,
        },
      });
    });

    // Upload de anexos fora da transação (chamada externa ao Drive)
    for (const file of arquivos) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadToDrive(user.id, file.name, file.type || "application/octet-stream", buffer);
      await prisma.solicitacaoAnexo.create({
        data: {
          solicitacaoId: id,
          nome: uploaded.fileName,
          url: uploaded.fileUrl,
          enviadoPorId: user.id,
          etapa: novaEtapa,
        },
      });
    }

    return NextResponse.json({ success: true, novaEtapa });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erro ao processar ação." }, { status: 500 });
  }
}
