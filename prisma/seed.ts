import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");

  // Tipos de documento conforme Norma Zero
  const tipos = [
    { sigla:"FTI", nome:"Ficha Técnica do Indicador",   nivel:3, cor:"#6366f1" },
    { sigla:"FFO", nome:"Fichas e Formulários",          nivel:3, cor:"#8b5cf6" },
    { sigla:"FLU", nome:"Fluxograma",                   nivel:2, cor:"#0ea5e9" },
    { sigla:"INT", nome:"Interação de Processos",        nivel:2, cor:"#06b6d4" },
    { sigla:"MAN", nome:"Manual",                       nivel:1, cor:"#dc2626" },
    { sigla:"MAP", nome:"Mapeamento de Processos",       nivel:1, cor:"#b91c1c" },
    { sigla:"MOD", nome:"Modelagem",                    nivel:2, cor:"#7c3aed" },
    { sigla:"NOR", nome:"Normatização",                  nivel:1, cor:"#1d4ed8" },
    { sigla:"PLC", nome:"Plano de Contingência",         nivel:2, cor:"#d97706" },
    { sigla:"POL", nome:"Política",                     nivel:1, cor:"#0f766e" },
    { sigla:"PRO", nome:"Protocolo",                    nivel:2, cor:"#16a34a" },
    { sigla:"PCG", nome:"Protocolo Clínico Gerenciado", nivel:2, cor:"#15803d" },
    { sigla:"POP", nome:"Procedimento Operacional Padrão", nivel:3, cor:"#2563eb" },
    { sigla:"REG", nome:"Regimento",                    nivel:1, cor:"#9f1239" },
    { sigla:"REL", nome:"Regulamento",                  nivel:1, cor:"#be123c" },
  ];
  for (const t of tipos) {
    await prisma.tipoDocumento.upsert({ where:{ sigla:t.sigla }, update:{}, create:t });
  }

  // Unidades ISGH
  const unidades = [
    { sigla:"HRSC", nome:"Hospital Regional do Sertão Central" },
    { sigla:"HGWA", nome:"Hospital Geral Dr. Waldemar Alcântara" },
    { sigla:"HRN",  nome:"Hospital Regional Norte" },
    { sigla:"HRC",  nome:"Hospital Regional do Cariri" },
    { sigla:"HLV",  nome:"Hospital Leonardo Da Vinci" },
    { sigla:"UPA",  nome:"Unidade de Pronto Atendimento" },
    { sigla:"APS",  nome:"Atenção Primária à Saúde" },
    { sigla:"ESG",  nome:"Escola de Saúde e Gestão" },
    { sigla:"SEDE", nome:"Sede ISGH" },
  ];
  for (const u of unidades) {
    await prisma.unidade.upsert({ where:{ sigla:u.sigla }, update:{}, create:u });
  }

  // Setores e áreas conforme Tabela IV da Norma Zero
  const hgwa = await prisma.unidade.findUnique({ where:{ sigla:"HGWA" } });
  if (hgwa) {
    const setorClinco = await prisma.setor.create({ data:{ nome:"Setor Clínico", sigla:"CLI", unidadeId:hgwa.id } });
    await prisma.area.createMany({ data:[
      { nome:"UTI Adulto", sigla:"UTI", setorId:setorClinco.id },
      { nome:"Emergência", sigla:"EMG", setorId:setorClinco.id },
      { nome:"Clínica Médica", sigla:"CLM", setorId:setorClinco.id },
      { nome:"Clínica Cirúrgica", sigla:"CLC", setorId:setorClinco.id },
      { nome:"Centro Cirúrgico Geral", sigla:"CCG", setorId:setorClinco.id },
      { nome:"Clínica Obstétrica", sigla:"CLO", setorId:setorClinco.id },
      { nome:"Clínica Pediátrica", sigla:"CLP", setorId:setorClinco.id },
    ]});
    const setorApoio = await prisma.setor.create({ data:{ nome:"Setor de Apoio", sigla:"APO", unidadeId:hgwa.id } });
    await prisma.area.createMany({ data:[
      { nome:"Núcleo de Assistência Farmacêutica", sigla:"FAR", setorId:setorApoio.id },
      { nome:"Laboratório de Análises Clínicas", sigla:"LAB", setorId:setorApoio.id },
      { nome:"Nutrição", sigla:"NUT", setorId:setorApoio.id },
      { nome:"Fisioterapia", sigla:"FIS", setorId:setorApoio.id },
      { nome:"Central de Material e Esterilização", sigla:"CME", setorId:setorApoio.id },
      { nome:"Agência Transfusional", sigla:"AGT", setorId:setorApoio.id },
    ]});
    const setorGestao = await prisma.setor.create({ data:{ nome:"Gestão e Qualidade", sigla:"GES", unidadeId:hgwa.id } });
    await prisma.area.createMany({ data:[
      { nome:"Núcleo de Gestão e Segurança do Paciente", sigla:"NGS", setorId:setorGestao.id },
      { nome:"Núcleo de Gestão de Pessoas", sigla:"NGP", setorId:setorGestao.id },
      { nome:"Núcleo Administrativo Financeiro", sigla:"NAF", setorId:setorGestao.id },
      { nome:"Direção", sigla:"DIR", setorId:setorGestao.id },
      { nome:"Geral", sigla:"GER", setorId:setorGestao.id },
    ]});
  }

  // Itens ONA
  const itensONA = [
    { codigo:"1.2.1", titulo:"Sistema de controle de documentos", descricao:"Sistema formal de controle de documentos implantado", nivel:1, secao:"1.2 Gestão de documentos" },
    { codigo:"1.2.2", titulo:"Documentos aprovados e identificados", descricao:"Documentos com aprovação, data e versão identificadas", nivel:1, secao:"1.2 Gestão de documentos" },
    { codigo:"1.2.3", titulo:"Documentos obsoletos retirados", descricao:"Documentos obsoletos retirados de circulação de forma controlada", nivel:1, secao:"1.2 Gestão de documentos" },
    { codigo:"1.3.2", titulo:"Educação permanente", descricao:"Programa de educação permanente documentado e com registros", nivel:1, secao:"1.3 Recursos humanos" },
    { codigo:"2.1.1", titulo:"Identificação segura do paciente", descricao:"Protocolo de identificação segura implantado", nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.1.2", titulo:"Comunicação efetiva", descricao:"Passagem de plantão estruturada e documentada", nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.1.3", titulo:"Segurança na medicação", descricao:"Protocolo de segurança na prescrição e administração", nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.1.5", titulo:"Prevenção de quedas", descricao:"Protocolo de prevenção de quedas implantado", nivel:2, secao:"2.1 Segurança do paciente" },
    { codigo:"2.2.1", titulo:"Notificação de eventos", descricao:"Sistema de notificação de eventos adversos", nivel:2, secao:"2.2 Gestão de risco" },
    { codigo:"3.1.1", titulo:"Ciclo PDCA", descricao:"PDCA documentado para processos críticos", nivel:3, secao:"3.1 Excelência em gestão" },
  ];
  for (const i of itensONA) {
    await prisma.itemONA.upsert({ where:{ codigo:i.codigo }, update:{}, create:i });
  }

  console.log("✅ Seed concluído!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
