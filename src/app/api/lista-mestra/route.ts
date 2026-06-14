import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha, adicionarNaPlanilha, gerarCodigo } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado. Faça logout e login novamente." }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const tipo = searchParams.get("tipo") ?? "";
    const status = searchParams.get("status") ?? "";
    const unidade = searchParams.get("unidade") ?? "";

    let docs = await lerPlanilha(accessToken, refreshToken);

    if (search) docs = docs.filter(d =>
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.codigo.toLowerCase().includes(search.toLowerCase()) ||
      d.nome.toLowerCase().includes(search.toLowerCase())
    );
    if (tipo) docs = docs.filter(d => d.tipo.includes(tipo));
    if (status) docs = docs.filter(d => d.status === status);
    if (unidade) docs = docs.filter(d => d.unidade.toLowerCase().includes(unidade.toLowerCase()));

    return NextResponse.json({ docs, total: docs.length });
  } catch (e: any) {
    console.error("Sheets error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;
  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado" }, { status: 401 });

  const body = await req.json();
  const { tipoSigla, areaSigla, itensONASelecionados, ...resto } = body;

  try {
    const codigo = await gerarCodigo(accessToken, refreshToken, tipoSigla, areaSigla);
    await adicionarNaPlanilha(accessToken, refreshToken, {
      ...resto,
      codigo,
      itensONA: (itensONASelecionados ?? []).join(", "),
    });
    return NextResponse.json({ success: true, codigo });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
