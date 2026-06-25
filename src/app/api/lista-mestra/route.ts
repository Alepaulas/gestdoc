import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha, adicionarNaPlanilha, ensureHeaders } from "@/lib/sheets";
import { registrarAuditoria } from "@/lib/auditoria";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado. Faça logout e login novamente." }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search  = searchParams.get("search")  ?? "";
    const status  = searchParams.get("status")  ?? "";
    const unidade = searchParams.get("unidade") ?? "";

    let docs = await lerPlanilha(accessToken, refreshToken);

    if (search)  docs = docs.filter(d =>
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.codigo.toLowerCase().includes(search.toLowerCase())
    );
    if (status)  docs = docs.filter(d => d.statusValidade === status);
    if (unidade) docs = docs.filter(d => d.unidade.toLowerCase().includes(unidade.toLowerCase()));

    return NextResponse.json({ docs, total: docs.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken  = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado" }, { status: 401 });

  const body = await req.json();
  const userId   = (session.user as any).id as string;
  const userName = session.user?.name ?? "";
  const userEmail = session.user?.email ?? "";
  const cadastradoPor = `${userName} (${userEmail})`;

  try {
    await ensureHeaders(accessToken, refreshToken);
    await adicionarNaPlanilha(accessToken, refreshToken, { ...body, cadastradoPor });

    // Registra auditoria no banco
    await registrarAuditoria({
      userId,
      acao: "CADASTRO_DOCUMENTO",
      descricao: `Cadastrou documento "${body.titulo}" (${body.codigo}) na Lista Mestra`,
    });

    return NextResponse.json({ success: true, codigo: body.codigo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
