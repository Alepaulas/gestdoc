import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json([
    { id:"1", sigla:"SEDE", nome:"Sede ISGH" },
    { id:"2", sigla:"HGWA", nome:"Hospital Geral Dr. Waldemar Alcântara" },
    { id:"3", sigla:"HLV",  nome:"Hospital Leonardo Da Vinci" },
    { id:"4", sigla:"HRVJ", nome:"Hospital Regional de Várzea Alegre" },
    { id:"5", sigla:"HRN",  nome:"Hospital Regional Norte" },
    { id:"6", sigla:"HRC",  nome:"Hospital Regional do Cariri" },
    { id:"7", sigla:"HRSC", nome:"Hospital Regional do Sertão Central" },
    { id:"8", sigla:"UPA",  nome:"Unidade de Pronto Atendimento" },
    { id:"9", sigla:"APS",  nome:"Atenção Primária à Saúde" },
    { id:"10",sigla:"ESG",  nome:"Escola de Saúde e Gestão" },
  ]);
}
