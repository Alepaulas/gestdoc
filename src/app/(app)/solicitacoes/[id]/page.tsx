"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clock, Building2, UserIcon, FileText, Loader2,
  CheckCircle2, XCircle, RotateCcw, Stamp, ThumbsUp, Upload, X,
  ExternalLink, Hash, Ban, AlertTriangle,
} from "lucide-react";
import { ETAPA_LABELS, ACAO_LABELS, type Etapa, type Acao } from "@/lib/solicitacaoFlow";

type Anexo = { id: string; nome: string; url: string; etapa: string; createdAt: string; enviadoPor: any };
type EtapaHist = { id: string; etapa: string; acao: string; comentario: string | null; createdAt: string; responsavel: any };
type Detalhe = {
  id: string; codigo: string; titulo: string; descricao: string | null;
  tipoRequisicao: string; abrangencia: string; tipoDocumento: string | null;
  setorSigla: string | null; etapaAtual: Etapa;
  numeroDocumento: string | null; codigoDocumento: string | null;
  codigoGerado: string | null; elaborador: string | null; aprovador: string | null;
  versao: string | null; revisao: string | null; criticidade: string | null; linkPublicado: string | null;
  createdAt: string; updatedAt: string;
  unidade: { nome: string; sigla: string } | null;
  solicitante: { name: string | null; email: string | null };
  anexos: Anexo[]; etapas: EtapaHist[];
};

const ETAPA_COLOR: Record<string, string> = {
  ABERTA: "bg-amber-100 text-amber-700 border-amber-200",
  EM_ANALISE_RT: "bg-blue-100 text-blue-700 border-blue-200",
  DEVOLVIDA_UNIDADE: "bg-orange-100 text-orange-700 border-orange-200",
  EM_ANALISE_NUGESP: "bg-purple-100 text-purple-700 border-purple-200",
  DEVOLVIDA_NUGESP: "bg-red-100 text-red-700 border-red-200",
  EM_PADRONIZACAO: "bg-indigo-100 text-indigo-700 border-indigo-200",
  AGUARDANDO_VALIDACAO_UNIDADE: "bg-cyan-100 text-cyan-700 border-cyan-200",
  AGUARDANDO_PUBLICACAO: "bg-violet-100 text-violet-700 border-violet-200",
  PUBLICADA: "bg-green-100 text-green-700 border-green-200",
  CANCELADA: "bg-slate-100 text-slate-500 border-slate-200",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function tempo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const dias = Math.floor(ms/86400000);
  if (dias===0){const h=Math.floor(ms/3600000);return h===0?`${Math.max(1,Math.floor(ms/60000))}min`:`${h}h`;}
  return `${dias} dia${dias!==1?"s":""}`;
}

export default function SolicitacaoDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<Detalhe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acaoAtiva, setAcaoAtiva] = useState<Acao | null>(null);

  // Form state
  const [comentario, setComentario] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [elaborador, setElaborador] = useState("");
  const [aprovador, setAprovador] = useState("");
  const [versao, setVersao] = useState("00");
  const [revisao, setRevisao] = useState("00");
  const [criticidade, setCriticidade] = useState("");
  const [linkPublicado, setLinkPublicado] = useState("");
  const [dataPadronizacao, setDataPadronizacao] = useState(new Date().toLocaleDateString("pt-BR"));
  const [dataPublicacao, setDataPublicacao] = useState(new Date().toLocaleDateString("pt-BR"));
  const [prazoMax, setPrazoMax] = useState("");

  const load = useCallback(() => {
    fetch(`/api/solicitacoes/${id}`).then(r=>r.json()).then(j=>{
      if(j.error) setError(j.error); else setData(j);
    }).catch(()=>setError("Erro ao carregar."));
  }, [id]);

  useEffect(()=>{ load(); },[load]);

  const reset = () => {
    setComentario(""); setArquivos([]); setElaborador(""); setAprovador("");
    setVersao("00"); setRevisao("00"); setCriticidade(""); setLinkPublicado("");
    setAcaoAtiva(null); setActionError(null);
  };

  const executar = async (acao: Acao) => {
    // Validações frontend
    const erros: string[] = [];
    if ((acao==="RT_REPROVA"||acao==="NUGESP_REPROVA") && !comentario.trim()) erros.push("Comentário obrigatório ao reprovar.");
    if (acao==="UNIDADE_REENVIO" && arquivos.length===0) erros.push("Anexe ao menos um documento.");
    if (acao==="GESTDOC_PADRONIZOU" && arquivos.length===0) erros.push("Anexe o documento padronizado.");
    if (erros.length>0){setActionError(erros.join(" | ")); return;}

    setLoading(true); setActionError(null);
    try {
      const fd = new FormData();
      fd.append("acao", acao);
      fd.append("comentario", comentario);
      fd.append("elaborador", elaborador);
      fd.append("aprovador", aprovador);
      fd.append("versao", versao);
      fd.append("revisao", revisao);
      fd.append("criticidade", criticidade);
      fd.append("linkPublicado", linkPublicado);
      fd.append("dataPadronizacao", dataPadronizacao);
      fd.append("dataPublicacao", dataPublicacao);
      fd.append("prazoMaxPadronizacao", prazoMax);
      arquivos.forEach(f => fd.append("arquivos", f));
      const res = await fetch(`/api/solicitacoes/${id}/acao`,{method:"POST",body:fd});
      const j = await res.json();
      if(!res.ok) throw new Error(j.error??"Erro.");
      reset(); load();
    } catch(e:any){ setActionError(e.message); }
    finally { setLoading(false); }
  };

  if (error) return <div className="max-w-2xl mx-auto text-center py-16"><p className="text-red-500">{error}</p><Link href="/solicitacoes" className="text-blue-600 text-sm mt-3 inline-block">Voltar</Link></div>;
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin"/></div>;

  const isAtiva = !["PUBLICADA","CANCELADA"].includes(data.etapaAtual);

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/solicitacoes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4"/> Voltar
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400">{data.codigo}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{data.tipoRequisicao}</span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ETAPA_COLOR[data.etapaAtual]}`}>
            {ETAPA_LABELS[data.etapaAtual]}
          </span>
          {data.codigoGerado && (
            <span className="flex items-center gap-1 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              <Hash className="w-3 h-3"/> {data.codigoGerado}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">{data.titulo}</h1>
        {data.descricao && <p className="text-slate-600 text-sm whitespace-pre-wrap mb-3">{data.descricao}</p>}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span>{data.tipoDocumento} · {data.setorSigla}</span>
          <span>Abrangência: {data.abrangencia}</span>
          {data.unidade && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5"/> {data.unidade.nome}</span>}
          <span>por {data.solicitante.name ?? data.solicitante.email}</span>
          {isAtiva && <span className="text-slate-500 font-medium">nesta etapa há {tempo(data.updatedAt)}</span>}
        </div>
        {data.tipoRequisicao === "Revisão" && (data.numeroDocumento || data.codigoDocumento) && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Revisão do documento: <strong>{data.codigoDocumento}</strong> — Nº {data.numeroDocumento}
          </div>
        )}
      </div>

      {/* Dados gerados pelo NUGESP */}
      {data.codigoGerado && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div><span className="font-semibold text-indigo-700">Código:</span> <span className="font-mono font-bold">{data.codigoGerado}</span></div>
          <div><span className="font-semibold text-indigo-700">Versão:</span> {data.versao} · Revisão {data.revisao}</div>
          {data.elaborador && <div><span className="font-semibold text-indigo-700">Elaborador:</span> {data.elaborador}</div>}
          {data.aprovador  && <div><span className="font-semibold text-indigo-700">Aprovador:</span> {data.aprovador}</div>}
          {data.criticidade && <div><span className="font-semibold text-indigo-700">Criticidade:</span> {data.criticidade}</div>}
          {data.linkPublicado && <div className="col-span-2"><span className="font-semibold text-indigo-700">Publicado:</span>{" "}<a href={data.linkPublicado} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Abrir</a></div>}
        </div>
      )}

      {/* Anexos */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Documentos anexados</h2>
        {data.anexos.length === 0 ? <p className="text-xs text-slate-400">Nenhum anexo.</p> : (
          <div className="space-y-2">
            {data.anexos.map(a => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm hover:border-blue-300 transition-colors">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                <span className="flex-1 truncate text-slate-700">{a.nome}</span>
                <span className="text-xs text-slate-400">{ETAPA_LABELS[a.etapa as Etapa] ?? a.etapa}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300"/>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      {isAtiva && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Ações disponíveis</h2>

          {actionError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3.5 py-2.5 mb-3 flex items-start gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5"/>{actionError}</div>}

          {/* Formulário contextual */}
          {acaoAtiva && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">

              {/* Reprovar → comentário obrigatório */}
              {(acaoAtiva==="RT_REPROVA"||acaoAtiva==="NUGESP_REPROVA") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo da devolução <span className="text-red-500">*</span></label>
                  <textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={3}
                    placeholder="Descreva o motivo e o que precisa ser corrigido..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </div>
              )}

              {/* Reenvio → comentário + arquivo */}
              {acaoAtiva==="UNIDADE_REENVIO" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Comentário sobre as correções</label>
                  <textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={2}
                    placeholder="Descreva as alterações realizadas..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </div>
              )}

              {/* Arquivo (reenvio e padronização) */}
              {(acaoAtiva==="UNIDADE_REENVIO"||acaoAtiva==="GESTDOC_PADRONIZOU") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {acaoAtiva==="GESTDOC_PADRONIZOU" ? "Documento padronizado *" : "Documento corrigido *"}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-blue-600 cursor-pointer">
                    <Upload className="w-4 h-4"/> Anexar arquivo
                    <input type="file" multiple className="hidden" onChange={e=>{if(e.target.files)setArquivos(Array.from(e.target.files));}}/>
                  </label>
                  {arquivos.length>0&&arquivos.map((f,i)=>(
                    <div key={i} className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded px-2 py-1 mt-1">
                      <FileText className="w-3 h-3"/>{f.name}
                      <button onClick={()=>setArquivos(p=>p.filter((_,j)=>j!==i))} className="ml-auto text-slate-300 hover:text-red-500"><X className="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              )}

              {/* NUGESP aprova → elaborador, aprovador, versão, revisão, criticidade */}
              {acaoAtiva==="NUGESP_APROVA" && (
                <>
                  <p className="text-xs font-semibold text-slate-600">Preencha os dados para gerar o código:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Versão</label>
                      <input value={versao} onChange={e=>setVersao(e.target.value)} placeholder="00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Revisão</label>
                      <input value={revisao} onChange={e=>setRevisao(e.target.value)} placeholder="00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Criticidade</label>
                      <select value={criticidade} onChange={e=>setCriticidade(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white">
                        <option value="">Selecione</option>
                        <option>ALTA</option><option>MÉDIA</option><option>BAIXA</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Elaborador(es)</label>
                      <input value={elaborador} onChange={e=>setElaborador(e.target.value)} placeholder="Nome e cargo" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Aprovador</label>
                      <input value={aprovador} onChange={e=>setAprovador(e.target.value)} placeholder="Nome e cargo" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                  </div>
                </>
              )}

              {/* Publicação → datas + link */}
              {acaoAtiva==="GESTDOC_PUBLICOU" && (
                <>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-700">
                    <strong>Código:</strong> {data.codigoGerado} — ao publicar este documento será registrado na Lista Mestra automaticamente.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Data Padronização</label>
                      <input value={dataPadronizacao} onChange={e=>setDataPadronizacao(e.target.value)} placeholder="DD/MM/AAAA" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Data Publicação</label>
                      <input value={dataPublicacao} onChange={e=>setDataPublicacao(e.target.value)} placeholder="DD/MM/AAAA" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                  </div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Prazo Máximo para Padronização</label>
                    <input value={prazoMax} onChange={e=>setPrazoMax(e.target.value)} placeholder="DD/MM/AAAA" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Link do documento publicado</label>
                    <input value={linkPublicado} onChange={e=>setLinkPublicado(e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"/></div>
                  <textarea value={comentario} onChange={e=>setComentario(e.target.value)} rows={2}
                    placeholder="Observações (opcional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={()=>executar(acaoAtiva)} disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckCircle2 className="w-4 h-4"/>} Confirmar
                </button>
                <button onClick={reset} disabled={loading}
                  className="text-slate-500 hover:text-slate-700 text-sm px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">Cancelar</button>
              </div>
            </div>
          )}

          {/* Botões de ação por etapa */}
          {!acaoAtiva && (
            <div className="flex flex-wrap gap-2">
              {/* RT */}
              {(data.etapaAtual==="ABERTA"||data.etapaAtual==="EM_ANALISE_RT") && (<>
                <button onClick={()=>setAcaoAtiva("RT_APROVA")} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Aprovar → NUGESP</button>
                <button onClick={()=>setAcaoAtiva("RT_REPROVA")} className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"><XCircle className="w-4 h-4"/> Devolver à Unidade</button>
              </>)}
              {/* NUGESP */}
              {data.etapaAtual==="EM_ANALISE_NUGESP" && (<>
                <button onClick={()=>setAcaoAtiva("NUGESP_APROVA")} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Aprovar e gerar código → GestDoc</button>
                <button onClick={()=>setAcaoAtiva("NUGESP_REPROVA")} className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"><XCircle className="w-4 h-4"/> Devolver à Unidade</button>
              </>)}
              {/* Unidade reenvio */}
              {(data.etapaAtual==="DEVOLVIDA_UNIDADE"||data.etapaAtual==="DEVOLVIDA_NUGESP") && (
                <button onClick={()=>setAcaoAtiva("UNIDADE_REENVIO")} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"><RotateCcw className="w-4 h-4"/> Corrigir e reenviar</button>
              )}
              {/* GestDoc padroniza */}
              {data.etapaAtual==="EM_PADRONIZACAO" && (
                <button onClick={()=>setAcaoAtiva("GESTDOC_PADRONIZOU")} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"><Stamp className="w-4 h-4"/> Padronizar e enviar para Unidade</button>
              )}
              {/* Unidade valida */}
              {data.etapaAtual==="AGUARDANDO_VALIDACAO_UNIDADE" && (
                <button onClick={()=>executar("UNIDADE_VALIDOU")} disabled={loading} className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2">
                  {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<ThumbsUp className="w-4 h-4"/>} Validar documento padronizado
                </button>
              )}
              {/* GestDoc publica */}
              {data.etapaAtual==="AGUARDANDO_PUBLICACAO" && (
                <button onClick={()=>setAcaoAtiva("GESTDOC_PUBLICOU")} className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Publicar → Lista Mestra</button>
              )}
              {/* Cancelar */}
              <button onClick={()=>{if(confirm("Cancelar esta solicitação?"))executar("CANCELOU");}} disabled={loading}
                className="ml-auto text-slate-400 hover:text-red-500 text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-red-200 flex items-center gap-1">
                <Ban className="w-3.5 h-3.5"/> Cancelar solicitação
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Histórico</h2>
        <div className="space-y-0">
          {data.etapas.map((e,i)=>(
            <div key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${e.acao==="CANCELOU"?"bg-red-400":e.acao.includes("REPROVA")?"bg-orange-400":"bg-blue-500"}`}/>
                {i<data.etapas.length-1&&<div className="w-px flex-1 bg-slate-200 my-1"/>}
              </div>
              <div className="pb-5 flex-1">
                <p className="text-sm font-medium text-slate-700">{ACAO_LABELS[e.acao as Acao]??e.acao}</p>
                {e.comentario&&<p className="text-sm text-slate-500 mt-0.5 italic">"{e.comentario}"</p>}
                <p className="text-xs text-slate-400 mt-1">{e.responsavel?.name??e.responsavel?.email} · {fmt(e.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
