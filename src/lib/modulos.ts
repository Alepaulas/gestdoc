// Controle de acesso por módulo — baseado no papelFluxo do usuário.
// Para adicionar um novo módulo: inclua em NAV_ITEMS e em PAPEL_MODULOS.

import { Home, FileText, Map, ClipboardList, Settings, WandSparkles, GitCompare, type LucideIcon } from "lucide-react";

export type Modulo =
  | "dashboard"
  | "documentos"
  | "ona"
  | "auditoria"
  | "formatador"
  | "revisor"
  | "configuracoes";

export type PapelFluxo =
  | "UNIDADE"
  | "REFERENCIA_TECNICA"
  | "GESTDOC"
  | "OPERACIONAL"
  | "ADMIN";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; modulo: Modulo }[] = [
  { href: "/dashboard",     label: "Home",          icon: Home,          modulo: "dashboard"    },
  { href: "/documentos",    label: "Documentos",    icon: FileText,      modulo: "documentos"   },
  { href: "/ona",           label: "Mapa ONA",      icon: Map,           modulo: "ona"          },
  { href: "/auditoria",     label: "Auditoria",     icon: ClipboardList, modulo: "auditoria"    },
  { href: "/formatador",    label: "Formatador",    icon: WandSparkles,  modulo: "formatador"   },
  { href: "/revisor",       label: "Revisor",       icon: GitCompare,    modulo: "revisor"      },
  { href: "/configuracoes", label: "Configurações", icon: Settings,      modulo: "configuracoes"},
];

export const PAPEL_MODULOS: Record<PapelFluxo, Modulo[]> = {
  UNIDADE: [
    "dashboard", "documentos",
  ],
  REFERENCIA_TECNICA: [
    "dashboard", "documentos",
  ],
  GESTDOC: [
    "dashboard", "documentos", "formatador", "revisor",
  ],
  OPERACIONAL: [
    "dashboard", "formatador",
  ],
  ADMIN: [
    "dashboard", "documentos", "ona", "auditoria",
    "formatador", "revisor", "configuracoes",
  ],
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
