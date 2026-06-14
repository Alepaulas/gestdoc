import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lerPlanilha } from "@/lib/sheets";

// Itens ONA fixos conforme norma
const ITENS_ONA = [
  { codigo:"1.2.1", titulo:"Sistema de controle de documentos",    descricao:"Sistema formal de controle de documentos implantado", nivel:1, secao:"1.2 Gestão de documentos" },
  { codigo:"1.2.2", titulo:"Documentos aprovados e identificados", descricao:"Documentos com aprovação, data e versão identificadas", nivel:1, secao:"1.2 Gestão de documentos" },
  { codigo:"1.2.3", titulo:"Documentos obsoletos retirados",       descricao:"Documentos obsoletos retirados de circulação",         nivel:1, secao:"1.2 Gestão de documentos" },
  { codigo:"1.3.2", titulo:"Educação permanente",                  descricao:"Programa de educação permanente documentado",          nivel:1, secao:"1.3 Recursos humanos" },
  { codigo:"2.1.1", titulo:"Identificação segura do paciente",     descricao:"Protocolo de identificação segura implantado",         nivel:2, secao:"2.1 Segurança do paciente" },
  { codigo:"2.1.2", titulo:"Comunicação efetiva",                  descricao:"Passagem de plantão estruturada e documentada",        nivel:2, secao:"2.1 Segurança do paciente" },
  { codigo:"2.1.3", titulo:"Segurança na medicação",               descricao:"Protocolo de segurança na administração de medicamentos", nivel:2, secao:"2.1 Segurança do paciente" },
  { codigo:"2.1.5", titulo:"Prevenção de quedas",                  descricao:"Protocolo de prevenção de quedas implantado",          nivel:2, secao:"2.1 Segurança do paciente" },
  { codigo:"2.2.1", titulo:"Notificação de eventos",               descricao:"Sistema de notificação de eventos adversos",           nivel:2, secao:"2.2 Gestão de risco" },
  { codigo:"3.1.1", titulo:"Ciclo PDCA",                           descricao:"PDCA documentado para processos críticos",             nivel:3, secao:"3.1 Excelência em gestão" },
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nivel = parseInt(new URL(req.url).searchParams.get("nivel") ?? "1");
  const accessToken = (session as any).accessToken;
  const refreshToken = (session as any).refreshToken;

  if (!accessToken) return NextResponse.json({ error: "Token Google não encontrado" }, { status: 401 });

  // Lê documentos da planilha
  const docs = await lerPlanilha(accessToken, refreshToken);

  // Filtra itens pelo nível
  const itensFiltrados = ITENS_ONA.filter(i => i.nivel <= nivel);

  // Cruza itens ONA com documentos
  const resultado = itensFiltrados.map(item => {
    const docsVinculados = docs.filter(d =>
      d.itensONA.includes(item.codigo)
    );
    const vigentes = docsVinculados.filter(d => d.status === "VIGENTE");
    const status = docsVinculados.length === 0 ? "gap"
      : vigentes.length > 0 ? "ok"
      : "warn";
    return { ...item, docs: docsVinculados, status };
  });

  // Agrupa por seção
  const grouped: Record<string, typeof resultado> = {};
  resultado.forEach(i => {
    if (!grouped[i.secao]) grouped[i.secao] = [];
    grouped[i.secao].push(i);
  });

  const secoes = Object.entries(grouped).map(([secao, itens]) => {
    const ok   = itens.filter(i => i.status === "ok").length;
    const warn = itens.filter(i => i.status === "warn").length;
    const gap  = itens.filter(i => i.status === "gap").length;
    const pct  = itens.length > 0 ? Math.round(((ok + warn * 0.5) / itens.length) * 100) : 0;
    return { secao, itens, ok, warn, gap, pct };
  });

  const totalOk   = resultado.filter(i => i.status === "ok").length;
  const totalWarn = resultado.filter(i => i.status === "warn").length;
  const totalGap  = resultado.filter(i => i.status === "gap").length;
  const conformidade = resultado.length > 0
    ? Math.round(((totalOk + totalWarn * 0.5) / resultado.length) * 100) : 0;

  return NextResponse.json({ secoes, conformidade, totalOk, totalWarn, totalGap, totalItens: resultado.length });
}
