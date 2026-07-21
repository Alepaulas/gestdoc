"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// Hook para registrar acesso a uma página automaticamente
export function useAuditoria(modulo: string, detalhe?: string) {
  const { data: session } = useSession();
  const registrado = useRef(false);

  useEffect(() => {
    if (!session || registrado.current) return;
    registrado.current = true;
    fetch("/api/auditoria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "ACESSO", modulo, detalhe: detalhe ?? `Acessou ${modulo}` }),
    }).catch(() => {});
  }, [session, modulo, detalhe]);
}

// Função para registrar ações específicas (edições, exportações, etc.)
export function auditarAcao(acao: string, modulo: string, detalhe?: string) {
  fetch("/api/auditoria", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, modulo, detalhe }),
  }).catch(() => {});
}
