"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, Building2, User as UserIcon, FileText, Loader2,
  CheckCircle2, XCircle, RotateCcw, Stamp, ThumbsUp, X, Upload,
  ExternalLink, Hash, Ban,
} from "lucide-react";
import { ETAPA_LABELS, type Etapa, type Acao } from "@/lib/solicitacaoFlow";
import { TIPOS_ORDENADOS } from "@/lib/normaZero";

// Siglas de área da Norma Zero
const AREAS = [
  {sigla:"AGT",nome:"Agência Transfusional"},{sigla:"ALM",nome:"Almoxarifado"},
  {sigla:"AMB",nome:"Ambulatório Geral"},{sigla:"CCG",nome:"Centro Cirúrgico Geral"},
  {sigla:"CME",nome:"CME"},{sigla:"CLM",nome:"Clínica Médica"},
  {sigla:"CLC",nome:"Clínica Cirúrgica"},{sigla:"CLP",nome:"Clínica Pediátrica"},
  {sigla:"CLO",nome:"Clínica Obstétrica"},{sigla:"DIR",nome:"Direção"},
  {sigla:"EMG",nome:"Emergência"},{sigla:"ENF",nome:"Enfermagem"},
  {sigla:"FAR",nome:"Farmácia"},{sigla:"FIS",nome:"Fisioterapia"},
  {sigla:"GER",nome:"Geral"},{sigla:"HIG",nome:"Higienização"},
  {sigla:"LAB",nome:"Laboratório"},{sigla:"MED",nome:"Medicina"},
  {sigla:"NAC",nome:"Núcleo Atendimento ao Cliente"},{sigla:"NAF",nome:"Núcleo Adm. Financeiro"},
  {sigla:"NGP",nome:"Núcleo Gestão de Pessoas"},{sigla:"NGS",nome:"NUGESP"},
  {sigla:"NUT",nome:"Nutrição"},{sigla:"PSI",nome:"Psicologia"},
  {sigla:"UTI",nome:"UTI Adulto"},{sigla:"NEO",nome:"UTI Neonatal"},
  {sigla:"UTP",nome:"UTI Pediátrica"},{sigla:"SGQ",nome:"Sistema de Qualidade"},
];

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
  codigoGerado: string | null; tipoDocumento: string | null; areaDocumento: string | null;
  elaborador: string | null; aprovador: string | null; versao: string | null;
  criticidade: string | null; linkPublicado: string | null;
  unidade: { nome: string; sigla: string };
  solicitante: { name: string | null; email: string | null };
  anexos: Anexo[];
  etapas: EtapaHist[];
};

const ACAO_LABELS: Record<string, string> = {
  ABERTURA: "Abriu a solicitação",
  VALIDOU: "Validou — gerou código e encaminhou ao GestDoc",
  NAO_VALIDOU: "Não validou — devolveu para a unidade",
  REENVIO: "Reenviou o documento",
  PADRONIZOU: "Padronizou e enviou para validação da unidade",
  VALIDOU_UNIDADE: "Validou o documento padronizado",
  PUBLICOU: "Publicou — registrado na Lista Mestra",
  CANCELOU: "Cancelou a solicitação",
};

const ETAPA_COLOR: Record<Etapa, string> = {
  ABERTA: "bg-amber-100 text-amber-700 border-amber-200",
  EM_ANALISE_RT: "bg-blue-100 text-blue-700 border-blue-200",
  DEVOLVIDA_UNIDADE: "bg-orange-100 text-orange-700 border-orange-200",
  EM_PADRONIZACAO: "bg-purple-100 text-purple-700 border-purple-200",
  AGUARDANDO_VALIDACAO_UNIDADE: "bg-cyan-100 text-cyan-700 border-cyan-200",
  AGUARDANDO_PUBLICACAO: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PUBLICADA: "bg-green-100 text-green-700 border-green-200",
  CANCELADA: "bg-slate-100 text-slate-500 border-slate-200",
};

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function tempoDecorrido(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const dias = Math.floor(diffMs / 86400000);
  if (dias === 0) {
    const h = Math.floor(diffMs / 3600000);
    if (h === 0) return `${Math.max(1, Math.floor(diffMs/60000))} min`;
    return `${h}h`;
  }
  return `${dias} dia${dias !== 1 ? "s" : ""}`;
}

export default function SolicitacaoDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<Detalhe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acaoAtiva, setAcaoAtiva] = useState<Acao | null>(null);

  // Campos do formulário de ação
  const [comentario, setComentario]       = useState("");
  const [arquivos, setArquivos]           = useState<File[]>([]);
  const [tipoDoc, setTipoDoc]             = useState("");
  const [areaDoc, setAreaDoc]             = useState("");
  const [elaborador, setElaborador]       = useState("");
  const [aprovador, setAprovador]         = useState("");
  const [versao, setVersao]               = useState("00");
  const [criticidade, setCriticidade]     = useState("");
  const [linkPublicado, setLinkPublicado] = useState("");
  const [codigoPreview, setCodigoPreview] = useState("");
  const [codigoLoading, setCodigoLoading] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/solicitacoes/${id}`)
      .then(r => r.json())
      .then(j => { if (j.error) setError(j.error); else setData(j); })
      .catch(() => setError("Erro ao carregar solicitação."));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function buscarCodigoPreview(tipo: string, area: string) {
    if (!tipo || !area) { setCodigoPreview(""); return; }
    setCodigoLoading(true);
    try {
      const res = await fetch(`/api/codigo-documento?tipo=${tipo}&area=${area}`);
      const j = await res.json();
      setCodigoPreview(j.codigo ?? `${tipo}.${area}.001`);
    } catch { setCodigoPreview(`${tipo}.${area}.001`); }
    finally { setCodigoLoading(false); }
  }

  const resetForm = () => {
    setComentario(""); setArquivos([]); setTipoDoc(""); setAreaDoc("");
    setElaborador(""); setAprovador(""); setVersao("00"); setCriticidade("");
    setLinkPublicado(""); setCodigoPreview(""); setAcaoAtiva(null);
  };

  const executarAcao = async (acao: Acao) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const fd = new FormData();
      fd.append("acao", acao);
      fd.append("comentario", comentario);
      fd.append("tipoDocumento", tipoDoc);
      fd.append("areaDocumento", areaDoc);
      fd.append("elaborador", elaborador);
      fd.append("aprovador", aprovador);
      fd.append("versao", versao);
      fd.append("criticidade", criticidade);
      fd.append("linkPublicado", linkPublicado);
      arquivos.forEach(f => fd.append("arquivos", f));

      const res = await fetch(`/api/solicitacoes/${id}/acao`, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao executar ação.");
      resetForm();
      load();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (error) return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <p className="text-red-500">{error}</p>
      <Link href="/solicitacoes" className="text-blue-600 text-sm mt-3 inline-block">Voltar</Link>
    </div>
  );
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>;

  const etapaAtual = data.etapaAtual;
  const isAtiva = !["PUBLICADA", "CANCELADA"].includes(etapaAtual);

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/solicitacoes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400">{data.codigo}</span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ETAPA_COLOR[etapaAtual]}`}>
            {ETAPA_LABELS[etapaAtual]}
          </span>
          {data.codigoGerado && (
            <span className="flex items-center gap-1 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              <Hash className="w-3 h-3" /> {data.codigoGerado}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">{data.titulo}</h1>
        <p className="text-slate-600 text-sm whitespace-pre-wrap mb-4">{data.descricao}</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {data.unidade.nome}</span>
          <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" /> {data.solicitante.name ?? data.solicitante.email}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> aberta em {formatDate(data.createdAt)}</span>
          {isAtiva && <span className="flex items-center gap-1 font-medium text-slate-500"><Clock className="w-3.5 h-3.5" /> nesta etapa há {tempoDecorrido(data.updatedAt)}</span>}
        </div>
      </div>

      {/* Dados de publicação (se já gerou código) */}
      {data.codigoGerado && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div><span className="font-semibold text-indigo-700">Código:</span> <span className="font-mono font-bold">{data.codigoGerado}</span></div>
          <div><span className="font-semibold text-indigo-700">Tipo:</span> {data.tipoDocumento}</div>
          <div><span className="font-semibold text-indigo-700">Área:</span> {data.areaDocumento}</div>
          <div><span className="font-semibold text-indigo-700">Versão:</span> {data.versao}</div>
          {data.elaborador && <div><span className="font-semibold text-indigo-700">Elaborador:</span> {data.elaborador}</div>}
          {data.aprovador  && <div><span className="font-semibold text-indigo-700">Aprovador:</span> {data.aprovador}</div>}
          {data.criticidade && <div><span className="font-semibold text-indigo-700">Criticidade:</span> {data.criticidade}</div>}
          {data.linkPublicado && (
            <div className="col-span-2">
              <span className="font-semibold text-indigo-700">Link publicado:</span>{" "}
              <a href={data.linkPublicado} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Abrir</a>
            </div>
          )}
        </div>
      )}

      {/* Anexos */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Documentos anexados</h2>
        {data.anexos.length === 0
          ? <p className="text-xs text-slate-400">Nenhum anexo ainda.</p>
          : (
          <div className="space-y-2">
            {data.anexos.map(a => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm hover:border-blue-300 transition-colors">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="flex-1 truncate text-slate-700">{a.nome}</span>
                <span className="text-xs text-slate-400">{ETAPA_LABELS[a.etapa as Etapa] ?? a.etapa}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Ações disponíveis */}
      {isAtiva && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Ações disponíveis</h2>

          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3.5 py-2.5 mb-3">{actionError}</div>
          )}

          {/* Formulário contextual por ação */}
          {acaoAtiva && (
            <div className="mb-4 space-y-3 bg-white border border-slate-200 rounded-xl p-4">

              {/* RT valida → pede Tipo, Área, Elaborador, Aprovador, Versão, Criticidade */}
              {acaoAtiva === "VALIDOU" && (
                <>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Dados do documento para gerar o código (Norma Zero):</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
                      <select value={tipoDoc} onChange={e => { setTipoDoc(e.target.value); buscarCodigoPreview(e.target.value, areaDoc); }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="">Selecione...</option>
                        {TIPOS_ORDENADOS.map(t => <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Área *</label>
                      <select value={areaDoc} onChange={e => { setAreaDoc(e.target.value); buscarCodigoPreview(tipoDoc, e.target.value); }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="">Selecione...</option>
                        {AREAS.map(a => <option key={a.sigla} value={a.sigla}>{a.sigla} — {a.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  {codigoPreview && (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                      <Hash className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs text-indigo-600 font-medium">Código a ser gerado:</span>
                      {codigoLoading
                        ? <span className="text-xs text-indigo-400 animate-pulse">Consultando...</span>
                        : <span className="font-mono font-bold text-indigo-800 text-sm">{codigoPreview}</span>
                      }
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Versão</label>
                      <input value={versao} onChange={e => setVersao(e.target.value)} placeholder="00"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Criticidade</label>
                      <select value={criticidade} onChange={e => setCriticidade(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="">Selecione...</option>
                        <option value="ALTA">Alta</option>
                        <option value="MEDIA">Média</option>
                        <option value="BAIXA">Baixa</option>
                      </select>
                    </div>
                    <div>{/* spacer */}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Elaborador</label>
                      <input value={elaborador} onChange={e => setElaborador(e.target.value)} placeholder="Nome e cargo"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Aprovador</label>
                      <input value={aprovador} onChange={e => setAprovador(e.target.value)} placeholder="Nome e cargo"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                    </div>
                  </div>
                </>
              )}

              {/* Comentário (devolução / reenvio) */}
              {(acaoAtiva === "NAO_VALIDOU" || acaoAtiva === "REENVIO") && (
                <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                  placeholder={acaoAtiva === "NAO_VALIDOU" ? "Explique o motivo da devolução..." : "Descreva as alterações realizadas..."}
                  rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
              )}

              {/* Arquivo (padronização / reenvio) */}
              {(acaoAtiva === "PADRONIZOU" || acaoAtiva === "REENVIO") && (
                <div>
                  <label className="inline-flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Anexar documento{acaoAtiva === "PADRONIZOU" ? " padronizado" : ""}
                    <input type="file" multiple className="hidden"
                      onChange={e => { if (e.target.files) setArquivos(Array.from(e.target.files)); }}/>
                  </label>
                  {arquivos.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {arquivos.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded px-2 py-1">
                          <FileText className="w-3 h-3" /> {f.name}
                          <button onClick={() => setArquivos(prev => prev.filter((_,i) => i !== idx))} className="ml-auto text-slate-300 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Publicação → link */}
              {acaoAtiva === "PUBLICOU" && (
                <>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-700">
                    <strong>Código:</strong> {data.codigoGerado} — ao publicar, este documento será registrado automaticamente na Lista Mestra.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Link do documento publicado (opcional)</label>
                    <input value={linkPublicado} onChange={e => setLinkPublicado(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                  </div>
                  <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                    placeholder="Observações da publicação (opcional)..." rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </>
              )}

              {/* Botões confirmar/cancelar */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => executarAcao(acaoAtiva)} disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar
                </button>
                <button onClick={resetForm} disabled={actionLoading}
                  className="text-slate-500 hover:text-slate-700 text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          {!acaoAtiva && (
            <div className="flex flex-wrap gap-2">
              {etapaAtual === "ABERTA" || etapaAtual === "EM_ANALISE_RT" ? (
                <>
                  <button onClick={() => setAcaoAtiva("VALIDOU")}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                    <CheckCircle2 className="w-4 h-4" /> Validar e gerar código
                  </button>
                  <button onClick={() => setAcaoAtiva("NAO_VALIDOU")}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                    <XCircle className="w-4 h-4" /> Não validar (devolver)
                  </button>
                </>
              ) : etapaAtual === "DEVOLVIDA_UNIDADE" ? (
                <button onClick={() => setAcaoAtiva("REENVIO")}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                  <RotateCcw className="w-4 h-4" /> Responder e reenviar
                </button>
              ) : etapaAtual === "EM_PADRONIZACAO" ? (
                <button onClick={() => setAcaoAtiva("PADRONIZOU")}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                  <Stamp className="w-4 h-4" /> Concluir padronização
                </button>
              ) : etapaAtual === "AGUARDANDO_VALIDACAO_UNIDADE" ? (
                <button onClick={() => executarAcao("VALIDOU_UNIDADE")} disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  Validar documento padronizado
                </button>
              ) : etapaAtual === "AGUARDANDO_PUBLICACAO" ? (
                <button onClick={() => setAcaoAtiva("PUBLICOU")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Publicar e registrar na Lista Mestra
                </button>
              ) : null}

              {/* Cancelar (sempre disponível para GestDoc/Admin) */}
              <button onClick={() => { if (confirm("Tem certeza que deseja cancelar esta solicitação?")) executarAcao("CANCELOU"); }}
                disabled={actionLoading}
                className="ml-auto text-slate-400 hover:text-red-500 text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-red-200 transition-colors flex items-center gap-1">
                <Ban className="w-3.5 h-3.5" /> Cancelar solicitação
              </button>
            </div>
          )}
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
                <p className="text-sm font-medium text-slate-700">{ACAO_LABELS[e.acao] ?? e.acao}</p>
                {e.comentario && <p className="text-sm text-slate-500 mt-0.5 italic">"{e.comentario}"</p>}
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
