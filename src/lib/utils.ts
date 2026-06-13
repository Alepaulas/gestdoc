import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date) {
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

export function diasRestantes(dataRevisao: string) {
  return differenceInDays(new Date(dataRevisao), new Date());
}

export function calcStatus(dataRevisao: string, statusAtual: string): string {
  if (statusAtual === "RASCUNHO" || statusAtual === "EM_REVISAO" || statusAtual === "OBSOLETO") return statusAtual;
  const dias = diasRestantes(dataRevisao);
  if (dias < 0) return "VENCIDO";
  if (dias <= 30) return "VENCENDO";
  return "VIGENTE";
}

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  VIGENTE:    { label: "Vigente",    bg: "#eaf3de", text: "#27500a" },
  VENCENDO:   { label: "Vencendo",   bg: "#faeeda", text: "#633806" },
  VENCIDO:    { label: "Vencido",    bg: "#fcebeb", text: "#791f1f" },
  EM_REVISAO: { label: "Em Revisão", bg: "#dbeafe", text: "#1e40af" },
  RASCUNHO:   { label: "Rascunho",   bg: "#f1f5f9", text: "#475569" },
  OBSOLETO:   { label: "Obsoleto",   bg: "#f1f5f9", text: "#64748b" },
};

export function gerarId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
