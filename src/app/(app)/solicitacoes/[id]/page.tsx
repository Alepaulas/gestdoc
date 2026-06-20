"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, Building2, User as UserIcon, FileText, Loader2,
  CheckCircle2, XCircle, RotateCcw, Stamp, Send, ThumbsUp, Ban, Upload, X, ExternalLink,
} from "lucide-react";
import { ETAPA_LABELS, type Etapa, type Acao } from "@/lib/solicitacaoFlow";

type Anexo = {
  id: string; nome: string; url: string; etapa: string; createdAt: string;
  enviadoPor: { name: string | null; email: string | null } | null;
};
type EtapaHist = {
  id: string; etapa: string; acao: string; comentario: string | null; createdAt: string;
  responsavel: { name: string | null; email: string | null; papelFluxo: string | null };
};
type Detalhe = {
  id: string; codigo: string; titulo: string; descricao: string;
  etapaAtual: Etapa; createdAt: string; updatedAt: string;
  unidade: { nome: string; sigla: string };
  solicitante: { name: string | null; email: string | null };
  anexos: Anexo[];
  etapas: EtapaHist[];
};

const ACAO_LABELS: Record<string, string> = {
  ABERTURA: "Abriu a solicitação",
  VALIDOU: "Validou",
  NAO_VALIDOU: "Não validou — devolveu para a unidade",
  REENVIO: "Reenviou o documento",
  PADRONIZOU: "Padronizou o documento",
  ENVIOU_VALIDACAO: "Enviou para validação da unidade",
  VALIDOU_UNIDADE: "Validou o documento padronizado",
  PUBLICOU: "Publicou",
  CANCELOU: "Cancelou a solicitação",
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

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function tempoDecorrido(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const dias = Math.floor(diffMs / 86400000);
  if (dias === 0) {
    const horas = Math.floor(diffMs / 3600000);
    if (horas === 0) return `${Math.max(1, Math.floor(diffMs / 60000))} min`;
    return `${horas}h`;
  }
  return `${dias} dia${dias !== 1 ? "s" : ""}`;
}

// Botões de ação disponíveis — a permissão real é validada no backend;
// aqui é só sugestão de UI baseada na etapa atual.
const ACOES_POR_ETAPA: Record<Etapa, { acao: Acao; label: string; icon: any; style: string; precisaArquivo?: boolean; precisaComentario?: boolean }[]> = {
  ABERTA: [
    { acao: "VALIDOU", label: "Validar", icon: CheckCircle2, style: "bg-green-600 hover:bg-green-700" },
    { acao: "NAO_VALIDOU", label: "Não validar (devolver)", icon: XCircle, style: "bg-red-500 hover:bg-red-600", precisaComentario: true },
  ],
  EM_ANALISE_RT: [
    { acao: "VALIDOU", label: "Validar", icon: CheckCircle2, style: "bg-green-600 hover:bg-green-700" },
    { acao: "NAO_VALIDOU", label: "Não validar (devolver)", icon: XCircle, style: "bg-red-500 hover:bg-red-600", precisaComentario: true },
  ],
  DEVOLVIDA_UNIDADE: [
    { acao: "REENVIO", label: "Responder e reenviar", icon: RotateCcw, style: "bg-blue-600 hover:bg-blue-700", precisaArquivo: true, precisaComentario: true },
  ],
  EM_PADRONIZACAO: [
    { acao: "PADRONIZOU", label: "Concluir padronização e enviar p/ validação", icon: Stamp, style: "bg-purple-600 hover:bg-purple-700", precisaArquivo: true },
  ],
  AGUARDANDO_VALIDACAO_UNIDADE: [
    { acao: "VALIDOU_UNIDADE", label: "Validar e publicar", icon: ThumbsUp, style: "bg-green-600 hover:bg-green-700" },
  ],
  PUBLICADA: [],
  CANCELADA: [],
};

export default function SolicitacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<Detalhe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [acaoAtiva, setAcaoAtiva] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/solicitacoes/${id}`)
      .then((r) => r.json())
      .then((j) => { if (j.error) setError(j.error); else setData(j); })
      .catch(() => setError("Erro ao carregar solicitação."));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const executarAcao = async (acao: Acao, precisaArquivo?: boolean) => {
    if (precisaArquivo && arquivos.length === 0) {
      setActionError("Anexe ao menos um documento para esta ação.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const fd = new FormData();
      fd.append("acao", acao);
      fd.append("comentario", comentario);
      arquivos.forEach((f) => fd.append("arquivos", f));
      const res = await fetch(`/api/solicitacoes/${id}/acao`, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao executar ação.");
      setComentario("");
      setArquivos([]);
      setAcaoAtiva(null);
      load();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-red-500">{error}</p>
        <Link href="/solicitacoes" className="text-blue-600 text-sm mt-3 inline-block">Voltar</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>;
  }

  const acoesDisponiveis = ACOES_POR_ETAPA[data.etapaAtual] ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/solicitacoes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar para solicitações
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-slate-400">{data.codigo}</span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ETAPA_COLOR[data.etapaAtual]}`}>
            {ETAPA_LABELS[data.etapaAtual]}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">{data.titulo}</h1>
        <p className="text-slate-600 text-sm whitespace-pre-wrap mb-4">{data.descricao}</p>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {data.unidade.nome}</span>
          <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> {data.solicitante.name ?? data.solicitante.email}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> aberta em {formatDate(data.createdAt)}</span>
          <span className="flex items-center gap-1 font-medium text-slate-500">
            <Clock className="w-3.5 h-3.5" /> nesta etapa há {tempoDecorrido(data.updatedAt)}
          </span>
        </div>
      </div>

      {/* Anexos */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Documentos anexados</h2>
        <div className="space-y-2">
          {data.anexos.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm hover:border-blue-300 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="flex-1 truncate text-slate-700">{a.nome}</span>
              <span className="text-xs text-slate-400">{ETAPA_LABELS[a.etapa as Etapa] ?? a.etapa}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Ações disponíveis */}
      {acoesDisponiveis.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Ações disponíveis</h2>

          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3.5 py-2.5 mb-3">
              {actionError}
            </div>
          )}

          {acaoAtiva && (
            <div className="mb-4 space-y-3">
              {acoesDisponiveis.find((a) => a.acao === acaoAtiva)?.precisaComentario && (
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Comentário (explique o motivo)..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              )}
              {acoesDisponiveis.find((a) => a.acao === acaoAtiva)?.precisaArquivo && (
                <div>
                  <label className="inline-flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Anexar documento(s)
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => { if (e.target.files) setArquivos(Array.from(e.target.files)); }}
                    />
                  </label>
                  {arquivos.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {arquivos.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1">
                          <FileText className="w-3 h-3" /> {f.name}
                          <button onClick={() => setArquivos((prev) => prev.filter((_, i) => i !== idx))} className="ml-auto text-slate-300 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {acoesDisponiveis.map(({ acao, label, icon: Icon, style, precisaArquivo, precisaComentario }) => (
              <button
                key={acao}
                onClick={() => {
                  if (acaoAtiva === acao || (!precisaArquivo && !precisaComentario)) {
                    executarAcao(acao, precisaArquivo);
                  } else {
                    setAcaoAtiva(acao);
                  }
                }}
                disabled={actionLoading}
                className={`${style} text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {acaoAtiva === acao ? `Confirmar: ${label}` : label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Histórico do fluxo</h2>
        <div className="space-y-0">
          {data.etapas.map((e, idx) => (
            <div key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                {idx < data.etapas.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
              </div>
              <div className="pb-5 flex-1">
                <p className="text-sm font-medium text-slate-700">
                  {ACAO_LABELS[e.acao] ?? e.acao}
                </p>
                {e.comentario && (
                  <p className="text-sm text-slate-500 mt-0.5 italic">"{e.comentario}"</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {e.responsavel.name ?? e.responsavel.email} · {formatDate(e.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
