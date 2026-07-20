import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function gerarCodigo(): Promise<string> {
  const ano = new Date().getFullYear();
  const count = await prisma.solicitacao.count({
    where: { codigo: { startsWith: `SOL-${ano}-` } },
  });
  return `SOL-${ano}-${String(count + 1).padStart(4, "0")}`;
}

type EmailPayload = {
  messageId: string;
  assunto?: string;
  remetente?: string;
  destinatario?: string;
  dataEnvio?: string; // ISO string
  snippet?: string;
};

// Webhook chamado pelo Google Apps Script (gatilho automático na caixa de entrada).
// Autenticação via Bearer token (não usa sessão de usuário — não há usuário logado
// quando o gatilho do Apps Script dispara sozinho).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const autorizado = authHeader === `Bearer ${process.env.GMAIL_IMPORT_API_KEY}`;
  if (!autorizado) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const emails: EmailPayload[] = body?.emails ?? [];
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ success: true, importados: 0, ignorados: 0, itens: [] });
  }

  // Usuário "sistema" ao qual as solicitações importadas automaticamente ficam vinculadas.
  // Precisa existir previamente (ver instruções de configuração).
  const sistemaEmail = process.env.GMAIL_IMPORT_SISTEMA_EMAIL ?? process.env.ADMIN_EMAIL;
  const usuarioSistema = sistemaEmail
    ? await prisma.user.findUnique({ where: { email: sistemaEmail } })
    : null;
  if (!usuarioSistema) {
    return NextResponse.json({
      error: "Usuário do sistema não configurado. Defina GMAIL_IMPORT_SISTEMA_EMAIL (ou ADMIN_EMAIL) apontando para um usuário já cadastrado no GestDoc.",
    }, { status: 500 });
  }

  try {
    const existentes = await prisma.solicitacao.findMany({
      where: { emailMessageId: { in: emails.map(e => e.messageId).filter(Boolean) } },
      select: { emailMessageId: true },
    });
    const jaExistem = new Set(existentes.map(s => s.emailMessageId));
    const novos = emails.filter(e => e.messageId && !jaExistem.has(e.messageId));

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
          solicitanteId: usuarioSistema.id,
          origem: "EMAIL",
          emailMessageId: email.messageId,
          emailAssunto: email.assunto ?? "",
          emailRemetente: email.remetente ?? "",
          emailDestinatario: email.destinatario ?? "",
          emailDataEnvio: email.dataEnvio ? new Date(email.dataEnvio) : null,
          etapas: {
            create: {
              etapa: "ABERTA",
              acao: "ABERTURA",
              comentario: `Importado automaticamente do Gmail via Apps Script (de: ${email.remetente ?? "desconhecido"}).`,
              responsavelId: usuarioSistema.id,
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
