import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listarEmailsRecebidos } from "@/lib/gmail";

async function gerarCodigo(): Promise<string> {
  const ano = new Date().getFullYear();
  const count = await prisma.solicitacao.count({
    where: { codigo: { startsWith: `SOL-${ano}-` } },
  });
  return `SOL-${ano}-${String(count + 1).padStart(4, "0")}`;
}

// GET → pré-visualiza os e-mails recebidos (sem gravar nada)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const papel = (session.user as any).papelFluxo as string | null;
  const role  = (session.user as any).role as string;
  if (papel !== "GESTDOC" && role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas GestDoc/Admin podem importar e-mails." }, { status: 403 });
  }

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado. Faça logout e login novamente." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") ?? "in:inbox";
  const max   = Number(searchParams.get("max") ?? "25");

  try {
    const emails = await listarEmailsRecebidos(accessToken, refreshToken, query, max);
    const jaImportados = await prisma.solicitacao.findMany({
      where: { emailMessageId: { in: emails.map(e => e.messageId) } },
      select: { emailMessageId: true },
    });
    const importadosSet = new Set(jaImportados.map(s => s.emailMessageId));

    return NextResponse.json({
      emails: emails.map(e => ({ ...e, jaImportado: importadosSet.has(e.messageId) })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST → importa de fato: cria uma Solicitacao "ABERTA" para cada e-mail novo
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const papel  = (session.user as any).papelFluxo as string | null;
  const role   = (session.user as any).role as string;
  if (papel !== "GESTDOC" && role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas GestDoc/Admin podem importar e-mails." }, { status: 403 });
  }

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado. Faça logout e login novamente." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const query = body.query ?? "in:inbox";
  const max   = Number(body.max ?? 25);
  // Permite importar só os e-mails escolhidos na pré-visualização (opcional)
  const messageIdsFiltro: string[] | undefined = body.messageIds;

  try {
    let emails = await listarEmailsRecebidos(accessToken, refreshToken, query, max);
    if (messageIdsFiltro?.length) {
      emails = emails.filter(e => messageIdsFiltro.includes(e.messageId));
    }
    if (emails.length === 0) {
      return NextResponse.json({ success: true, importados: 0, ignorados: 0, itens: [] });
    }

    // Evita duplicar: verifica quais messageIds já viraram Solicitação
    const existentes = await prisma.solicitacao.findMany({
      where: { emailMessageId: { in: emails.map(e => e.messageId) } },
      select: { emailMessageId: true },
    });
    const jaExistem = new Set(existentes.map(s => s.emailMessageId));
    const novos = emails.filter(e => !jaExistem.has(e.messageId));

    const criados = [];
    for (const email of novos) {
      const codigo = await gerarCodigo();
      const solicitacao = await prisma.solicitacao.create({
        data: {
          codigo,
          titulo: email.assunto || "(sem assunto)",
          descricao: email.snippet || null,
          tipoRequisicao: "Elaboração",
          abrangencia: "Institucional",
          etapaAtual: "ABERTA",
          solicitanteId: userId,
          origem: "EMAIL",
          emailMessageId: email.messageId,
          emailAssunto: email.assunto,
          emailRemetente: email.remetente,
          emailDestinatario: email.destinatario,
          emailDataEnvio: email.dataEnvio,
          etapas: {
            create: {
              etapa: "ABERTA",
              acao: "ABERTURA",
              comentario: `Importado automaticamente do Gmail (de: ${email.remetente}).`,
              responsavelId: userId,
            },
          },
        },
      });
      criados.push({ id: solicitacao.id, codigo, assunto: email.assunto });
    }

    return NextResponse.json({
      success: true,
      importados: criados.length,
      ignorados: emails.length - novos.length,
      itens: criados,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
