// Lista central de unidades do ISGH
// Usada em todos os módulos: formulário de documento, inventário, configurações, etc.

export type Unidade = {
  sigla: string;
  nome: string;
};

export const UNIDADES: Unidade[] = [
  { sigla: "HGWA",      nome: "Hospital Geral Dr. Waldemar Alcântara" },
  { sigla: "HELV",      nome: "Hospital Estadual Leonardo da Vinci" },
  { sigla: "HUC",       nome: "Hospital Universitário do Ceará" },
  { sigla: "UPA",       nome: "Unidade de Pronto Atendimento" },
  { sigla: "UAPS",      nome: "Unidade de Atenção Primária à Saúde" },
  { sigla: "HRSC",      nome: "Hospital Regional do Sertão Central" },
  { sigla: "HRVJ",      nome: "Hospital Regional Vale do Jaguaribe" },
  { sigla: "HRN",       nome: "Hospital Regional Norte" },
  { sigla: "HRC",       nome: "Hospital Regional do Cariri" },
  { sigla: "HRI",       nome: "Hospital Regional de Iguatu" },
  { sigla: "SEDE",      nome: "Sede ISGH" },
  { sigla: "PRIMILAB",  nome: "Primilab" },
  { sigla: "CCC",       nome: "CCC" },
  { sigla: "ARMAZÉM",   nome: "Armazém" },
  { sigla: "MAIS LAB",  nome: "Mais Lab" },
  { sigla: "ESG",       nome: "Escola de Saúde e Gestão" },
];

export const UNIDADES_OPTIONS = UNIDADES.map(u => ({
  value: u.sigla,
  label: `${u.sigla} — ${u.nome}`,
}));
