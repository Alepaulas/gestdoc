"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardPlus, Clock, Building2, Loader2, ChevronRight } from "lucide-react";
import { ETAPA_LABELS, type Etapa } from "@/lib/solicitacaoFlow";

type Solicitacao = {
  id: string;
  codigo: string;
  titulo: string;
  etapaAtual: Etapa;
  createdAt: string;
  updatedAt: string;
  unidade: { nome: string; sigla: string };
  solicitante: { name: string | null; email: string | null };
  _count: { anexos: number };
};

const ETAPA_COLOR: Record<Etapa, string> = {
  ABERTA: "bg-amber-100 text-amber-700 border-amber-200",
  EM_ANALISE_RT: "bg-blue-100 text-blue-700 border-blue-200",
  DEVOLVIDA_UNIDADE: "bg-orange-100 text-orange-700 border-orange-200",
  EM_PADRONIZACAO: "bg-purple-100 text-purple-700 border-purple-200",
  AGUARDANDO_VALIDACAO_UNIDADE: "bg-cyan-100 text-cyan-700 border-cyan-200",
  PUBLICADA: "bg-green-100 text-green-700 border-green-200",
  CANCELADA: "bg-slate-100 text-slate-500 border-slate-200",
};

function tempoDecorrido(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias === 0) {
    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    if (horas === 0) {
      const min = Math.floor(diffMs / (1000 * 60));
      return `${min} min`;
    }
    return `${horas}h`;
  }
  return `${dias} dia${dias !== 1 ? "s" : ""}`;
}

export default function SolicitacoesPage() {
  const [items, setItems] = useState<Solicitacao[] | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "minhas" | "fila">("fila");

  useEffect(() => {
    setItems(null);
    const qs = filtro === "todas" ? "" : `?filtro=${filtro}`;
    fetch(`/api/solicitacoes${qs}`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, [filtro]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <ClipboardPlus className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Solicitações de Padronização</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Acompanhe o fluxo completo: triagem, padronização e validação.
          </p>
        </div>
        <Link
          href="/solicitacoes/nova"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors flex-shrink-0"
        >
          <ClipboardPlus className="w-4 h-4" />
          Nova solicitação
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: "fila", label: "Minha fila" },
          { key: "minhas", label: "Da minha unidade" },
          { key: "todas", label: "Todas" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key as any)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filtro === f.key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {items === null && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}

      {items?.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Nenhuma solicitação encontrada.
        </div>
      )}

      <div className="space-y-3">
        {items?.map((s) => (
          <Link
            key={s.id}
            href={`/solicitacoes/${s.id}`}
            className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">{s.codigo}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ETAPA_COLOR[s.etapaAtual]}`}
                  >
                    {ETAPA_LABELS[s.etapaAtual]}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 truncate">{s.titulo}</h3>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {s.unidade.sigla}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> há {tempoDecorrido(s.updatedAt)}
                  </span>
                  <span>{s._count.anexos} anexo{s._count.anexos !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
