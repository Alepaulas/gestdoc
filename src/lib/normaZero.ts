// Regras de formatação baseadas na Norma Zero ISGH
// Cada tipo de documento tem sua própria especificação

export type TipoDocumento =
  | "DIZ" | "FTI" | "FFO" | "FLU" | "ITA" | "INT"
  | "MAN" | "MAP" | "MOD" | "NTE" | "NOR" | "PAC"
  | "PLA" | "PLC" | "PSP" | "POL" | "PRO" | "PCG"
  | "PSG" | "POP" | "REG" | "REL";

export type RegraFormatacao = {
  codigo: TipoDocumento;
  nome: string;
  corpo: {
    fonte: string;
    tamanho: number;        // em half-points (10pt = 20, 8pt = 16, etc.)
    negrito: boolean;
    espacamentoLinha: number; // em twips (240 = simples, 360 = 1.5)
    alinhamento: "left" | "both" | "center"; // both = justificado
  };
  cabecalho: {
    fonte: string;
    tamanho: number;
    negrito: boolean;
  };
  margens: {
    superior: number;  // em twips (1cm ≈ 567, 2cm ≈ 1134, 0.5cm ≈ 284)
    inferior: number;
    esquerda: number;
    direita: number;
  };
  historico: {
    fonte: string;
    tamanho: number;
  };
};

// Margens padrão: esq/sup 2cm, dir/inf 1,5cm
const MARGENS_PADRAO = { superior: 1134, inferior: 851, esquerda: 1134, direita: 851 };
// Margens formulários: todos 0,5cm
const MARGENS_FORMULARIO = { superior: 284, inferior: 284, esquerda: 284, direita: 284 };

// Espaçamento 1.5 linhas = 360 twips; simples = 240 twips
const ESPACO_1_5 = 360;
const ESPACO_SIMPLES = 240;

// Corpo padrão da Norma Zero: Arial 10pt justificado espaço 1.5
const CORPO_PADRAO = {
  fonte: "Arial",
  tamanho: 20, // 10pt = 20 half-points
  negrito: false,
  espacamentoLinha: ESPACO_1_5,
  alinhamento: "both" as const,
};

// Cabeçalho padrão: Arial 8pt negrito
const CABECALHO_PADRAO = { fonte: "Arial", tamanho: 16, negrito: true };

// Histórico/elaboração: Arial 8pt
const HISTORICO_PADRAO = { fonte: "Arial", tamanho: 16 };

// Corpo formulário: Arial 8pt simples
const CORPO_FORMULARIO = {
  fonte: "Arial",
  tamanho: 16, // 8pt
  negrito: false,
  espacamentoLinha: ESPACO_SIMPLES,
  alinhamento: "both" as const,
};

export const REGRAS_FORMATACAO: Record<TipoDocumento, RegraFormatacao> = {
  DIZ: { codigo: "DIZ", nome: "Diretriz",           corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  FTI: { codigo: "FTI", nome: "Ficha Técnica de Indicador", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO, historico: HISTORICO_PADRAO },
  FFO: { codigo: "FFO", nome: "Ficha e Formulário", corpo: CORPO_FORMULARIO, cabecalho: { fonte: "Arial", tamanho: 16, negrito: true }, margens: MARGENS_FORMULARIO, historico: { fonte: "Arial", tamanho: 14 } },
  FLU: { codigo: "FLU", nome: "Fluxograma",         corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  ITA: { codigo: "ITA", nome: "Instrução de Trabalho", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,  historico: HISTORICO_PADRAO },
  INT: { codigo: "INT", nome: "Interação de Processos", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO, historico: HISTORICO_PADRAO },
  MAN: { codigo: "MAN", nome: "Manual",              corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  MAP: { codigo: "MAP", nome: "Mapeamento de Processos", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO, historico: HISTORICO_PADRAO },
  MOD: { codigo: "MOD", nome: "Modelagem de Processos",  corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO, historico: HISTORICO_PADRAO },
  NTE: { codigo: "NTE", nome: "Norma Técnica",       corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  NOR: { codigo: "NOR", nome: "Normatização",        corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  PAC: { codigo: "PAC", nome: "Pactuação",           corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  PLA: { codigo: "PLA", nome: "Plano",               corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  PLC: { codigo: "PLC", nome: "Plano de Contingência", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,  historico: HISTORICO_PADRAO },
  PSP: { codigo: "PSP", nome: "Plano de Segurança do Paciente", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO, historico: HISTORICO_PADRAO },
  POL: { codigo: "POL", nome: "Política",            corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  PRO: { codigo: "PRO", nome: "Protocolo",           corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  PCG: { codigo: "PCG", nome: "Protocolo Clínico Gerenciado", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO, historico: HISTORICO_PADRAO },
  PSG: { codigo: "PSG", nome: "Protocolo de Segurança Gerenciado", corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO, historico: HISTORICO_PADRAO },
  POP: {
    codigo: "POP",
    nome: "Procedimento Operacional Padrão (POP)",
    corpo: {
      fonte: "Arial",
      tamanho: 20, // 10pt
      negrito: false,
      espacamentoLinha: ESPACO_SIMPLES, // POP usa espaço simples no corpo
      alinhamento: "both",
    },
    cabecalho: { fonte: "Arial", tamanho: 16, negrito: true }, // 8pt negrito
    margens: MARGENS_PADRAO,
    historico: HISTORICO_PADRAO,
  },
  REG: { codigo: "REG", nome: "Regimento",           corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
  REL: { codigo: "REL", nome: "Regulamento",         corpo: CORPO_PADRAO, cabecalho: CABECALHO_PADRAO, margens: MARGENS_PADRAO,     historico: HISTORICO_PADRAO },
};

export const TIPOS_ORDENADOS = Object.values(REGRAS_FORMATACAO)
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
