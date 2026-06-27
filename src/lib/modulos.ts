// Controle de acesso por módulo — baseado no papelFluxo do usuário.
// Para adicionar um novo módulo: inclua em NAV_ITEMS e em PAPEL_MODULOS.

import { Home, FileText, Map, ClipboardList, Settings, WandSparkles, GitCompare, Package, ClipboardPlus, BookOpen, type LucideIcon } from "lucide-react";

export type Modulo =
  | "dashboard" | "documentos" | "solicitacoes" | "publicados"
  | "inventario" | "ona" | "auditoria" | "formatador" | "revisor" | "configuracoes";

export type PapelFluxo =
  | "UNIDADE" | "REFERENCIA_TECNICA" | "NUGESP" | "GESTDOC" | "OPERACIONAL" | "ADMIN";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; modulo: Modulo }[] = [
  { href: "/dashboard",     label: "Home",          icon: Home,          modulo: "dashboard"    },
  { href: "/documentos",    label: "Documentos",    icon: FileText,      modulo: "documentos"   },
  { href: "/solicitacoes",  label: "Solicitações",  icon: ClipboardPlus, modulo: "solicitacoes" },
  { href: "/publicados",    label: "Publicados",    icon: BookOpen,      modulo: "publicados"   },
  { href: "/inventario",    label: "Inventário",    icon: Package,       modulo: "inventario"   },
  { href: "/ona",           label: "Mapa ONA",      icon: Map,           modulo: "ona"          },
  { href: "/auditoria",     label: "Auditoria",     icon: ClipboardList, modulo: "auditoria"    },
  { href: "/formatador",    label: "Formatador",    icon: WandSparkles,  modulo: "formatador"   },
  { href: "/revisor",       label: "Revisor",       icon: GitCompare,    modulo: "revisor"      },
  { href: "/configuracoes", label: "Configurações", icon: Settings,      modulo: "configuracoes"},
];

export const PAPEL_MODULOS: Record<PapelFluxo, Modulo[]> = {
  UNIDADE:            ["dashboard", "solicitacoes", "publicados", "inventario"],
  REFERENCIA_TECNICA: ["dashboard", "documentos", "solicitacoes", "publicados"],
  NUGESP:             ["dashboard", "documentos", "solicitacoes", "publicados"],
  GESTDOC:            ["dashboard", "documentos", "solicitacoes", "publicados", "formatador", "revisor"],
  OPERACIONAL:        ["dashboard", "formatador", "publicados", "inventario"],
  ADMIN:              ["dashboard", "documentos", "solicitacoes", "publicados", "inventario", "ona", "auditoria", "formatador", "revisor", "configuracoes"],
};

export function modulosPermitidos(papelFluxo: string | null | undefined, role: string | null | undefined): Modulo[] {
  // ADMIN pelo role do sistema tem acesso total independente do papelFluxo
  if (role === "ADMIN") return PAPEL_MODULOS["ADMIN"];
  if (!papelFluxo) return ["dashboard"]; // sem papel definido: só o home
  return PAPEL_MODULOS[papelFluxo as PapelFluxo] ?? ["dashboard"];
}

export function temAcesso(modulo: Modulo, papelFluxo: string | null | undefined, role: string | null | undefined): boolean {
  return modulosPermitidos(papelFluxo, role).includes(modulo);
}
