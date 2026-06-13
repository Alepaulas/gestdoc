import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  // Tipos de documento conforme Norma Zero
  const tipos = [
    { sigla:"POP", nome:"Procedimento Operacional Padrão", nivel:3, cor:"#2563eb" },
    { sigla:"FFO", nome:"Formulário",                      nivel:3, cor:"#8b5cf6" },
    { sigla:"FTI", nome:"Ficha Técnica do Indicador",      nivel:3, cor:"#6366f1" },
    { sigla:"FLU", nome:"Fluxograma",                      nivel:2, cor:"#0ea5e9" },
    { sigla:"MAN", nome:"Manual",                          nivel:1, cor:"#dc2626" },
    { sigla:"NOR", nome:"Normatização",                    nivel:1, cor:"#1d4ed8" },
    { sigla:"PRO", nome:"Protocolo",                       nivel:2, cor:"#16a34a" },
    { sigla:"PCG", nome:"Protocolo Clínico Gerenciado",    nivel:2, cor:"#15803d" },
    { sigla:"POL", nome:"Política",                        nivel:1, cor:"#0f766e" },
    { sigla:"REG", nome:"Regimento",                       nivel:1, cor:"#9f1239" },
    { sigla:"INT", nome:"Interação de Processos",          nivel:2, cor:"#06b6d4" },
    { sigla:"MAP", nome:"Mapeamento de Processos",         nivel:1, cor:"#b91c1c" },
    { sigla:"MOD", nome:"Modelagem",                       nivel:2, cor:"#7c3aed" },
    { sigla:"PLC", nome:"Plano de Contingência",           nivel:2, cor:"#d97706" },
    { sigla:"REL", nome:"Regulamento",                     nivel:1, cor:"#be123c" },
  ];
  for (const t of tipos) {
    await prisma.tipoDocumento.upsert({ where:{ sigla:t.sigla }, update:{}, create:t });
  }
  console.log(`✅ ${tipos.length} tipos de documento`);

  // Limpa estrutura antiga
  await prisma.area.deleteMany();
  await prisma.setor.deleteMany();
  await prisma.unidade.deleteMany();

  // Unidades para teste
  const sede = await prisma.unidade.create({ data:{ nome:"Sede ISGH", sigla:"SEDE" } });
  const hgwa = await prisma.unidade.create({ data:{ nome:"Hospital Geral Dr. Waldemar Alcântara", sigla:"HGWA" } });
  const hlv  = await prisma.unidade.create({ data:{ nome:"Hospital Leonardo Da Vinci", sigla:"HLV" } });
  const hrvj = await prisma.unidade.create({ data:{ nome:"Hospital Regional de Várzea Alegre", sigla:"HRVJ" } });
  console.log(`✅ 4 unidades`);

  // Setores e áreas da SEDE
  const setorQual = await prisma.setor.create({ data:{ nome:"Qualidade",  sigla:"QUALIDADE",  unidadeId:sede.id } });
  const setorCont = await prisma.setor.create({ data:{ nome:"Contratos",  sigla:"CONTRATOS",  unidadeId:sede.id } });
  const setorEstr = await prisma.setor.create({ data:{ nome:"Estratégia", sigla:"ESTRATEGIA", unidadeId:sede.id } });

  await prisma.area.createMany({ data:[
    { nome:"Administrativa", sigla:"ADMINISTRATIVA", setorId:setorQual.id },
    { nome:"Apoio",          sigla:"APOIO",          setorId:setorQual.id },
    { nome:"Assistência",    sigla:"ASSISTENCIA",    setorId:setorQual.id },
  ]});
  console.log(`✅ Setores e áreas da SEDE`);

  // Itens ONA
  const itens = [
    { codigo:"1.2.1", titulo:"Sistema de controle de documentos",   descricao:"Sistema formal de controle de documentos implantado", nivel:1, secao:"1.2 Gestão de documentos" },
    { codigo:"1.2.2", titulo:"Documentos aprovados e identificados", descricao:"Documentos com aprovação, data e versão identificadas", nivel:1, secao:"1.2 Gestão de documentos" },
    { codigo:"1.2.3", titulo:"Documentos obsoletos retirados",       descricao:"Documentos obsoletos retirados de circulação",         nivel:1, secao:"1.2 Gestão de documentos" },
    { codigo:"1.3.2", titulo:"Educação permanente",                  descricao:"Programa de educação permanente documentado",          nivel:1, secao:"1.3 Recursos humanos" },
    { codigo:"2.1.1", titulo:"Identificação segura do paciente",     descricao:"Protocolo de identificação segura implantado",         nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.1.2", titulo:"Comunicação efetiva",                  descricao:"Passagem de plantão estruturada e documentada",        nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.1.3", titulo:"Segurança na medicação",               descricao:"Protocolo de segurança na administração",              nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.1.5", titulo:"Prevenção de quedas",                  descricao:"Protocolo de prevenção de quedas implantado",          nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.2.1", titulo:"Notificação de eventos",               descricao:"Sistema de notificação de eventos adversos",           nivel:2, secao:"2.2 Gestão de risco" },
    { codigo:"3.1.1", titulo:"Ciclo PDCA",                           descricao:"PDCA documentado para processos críticos",             nivel:3, secao:"3.1 Excelência em gestão" },
  ];
  for (const i of itens) {
    await prisma.itemONA.upsert({ where:{ codigo:i.codigo }, update:{}, create:i });
  }
  console.log(`✅ ${itens.length} itens ONA`);
  console.log("\n🎉 Seed concluído!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
