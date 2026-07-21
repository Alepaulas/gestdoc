import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TIPOS = [
  { id:"1", sigla:"POP", nome:"Procedimento Operacional Padrão", nivel:3, cor:"#2563eb" },
  { id:"2", sigla:"FFO", nome:"Formulário",                      nivel:3, cor:"#8b5cf6" },
  { id:"3", sigla:"FTI", nome:"Ficha Técnica do Indicador",      nivel:3, cor:"#6366f1" },
  { id:"4", sigla:"FLU", nome:"Fluxograma",                      nivel:2, cor:"#0ea5e9" },
  { id:"5", sigla:"MAN", nome:"Manual",                          nivel:1, cor:"#dc2626" },
  { id:"6", sigla:"NOR", nome:"Normatização",                    nivel:1, cor:"#1d4ed8" },
  { id:"7", sigla:"PRO", nome:"Protocolo",                       nivel:2, cor:"#16a34a" },
  { id:"8", sigla:"PCG", nome:"Protocolo Clínico Gerenciado",    nivel:2, cor:"#15803d" },
  { id:"9", sigla:"POL", nome:"Política",                        nivel:1, cor:"#0f766e" },
  { id:"10",sigla:"REG", nome:"Regimento",                       nivel:1, cor:"#9f1239" },
  { id:"11",sigla:"INT", nome:"Interação de Processos",          nivel:2, cor:"#06b6d4" },
  { id:"12",sigla:"MAP", nome:"Mapeamento de Processos",         nivel:1, cor:"#b91c1c" },
  { id:"13",sigla:"MOD", nome:"Modelagem",                       nivel:2, cor:"#7c3aed" },
  { id:"14",sigla:"PLC", nome:"Plano de Contingência",           nivel:2, cor:"#d97706" },
  { id:"15",sigla:"REL", nome:"Regulamento",                     nivel:1, cor:"#be123c" },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(TIPOS);
}
