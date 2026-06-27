"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, FileText, Loader2, ClipboardPlus } from "lucide-react";
import Link from "next/link";
import { TIPOS_DOCUMENTO_SOLICITACAO, SETORES_OPTIONS, ABRANGENCIAS, TIPOS_REQUISICAO } from "@/lib/setores";

function Field({ label, required, children }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";
const SELECT_CLS = `${INPUT_CLS} bg-white`;

export default function NovaSolicitacaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);

  const [form, setForm] = useState({
    tipoRequisicao: "Elaboração",
    abrangencia: "",
    tipoDocumento: "",
    setorSigla: "",
    titulo: "",
    descricao: "",
    numeroDocumento: "",
    codigoDocumento: "",
  });

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const isRevisao = form.tipoRequisicao === "Revisão";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validações frontend
    const erros: string[] = [];
    if (!form.titulo.trim())      erros.push("Título é obrigatório.");
    if (!form.tipoDocumento)      erros.push("Tipo de Documento é obrigatório.");
    if (!form.setorSigla)         erros.push("Setor é obrigatório.");
    if (!form.abrangencia)        erros.push("Abrangência é obrigatória.");
    if (isRevisao && !form.numeroDocumento) erros.push("Número do Documento é obrigatório para revisões.");
    if (isRevisao && !form.codigoDocumento) erros.push("Código do Documento é obrigatório para revisões.");
    if (arquivos.length === 0)    erros.push("Anexe ao menos um documento.");
    if (erros.length > 0) { setError(erros.join("\n")); return; }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      arquivos.forEach(f => fd.append("arquivos", f));

      const res = await fetch("/api/solicitacoes", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao enviar.");
      router.push(`/solicitacoes/${j.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/solicitacoes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <ClipboardPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nova Solicitação</h1>
          <p className="text-slate-500 text-xs mt-0.5">Solicitação de padronização de documento</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">

        {/* Tipo de Requisição */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 border-b border-slate-100 pb-2">Tipo de Requisição</h2>

          <div className="flex gap-4">
            {TIPOS_REQUISICAO.map(t => (
              <label key={t} className={`flex-1 flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all ${
                form.tipoRequisicao === t ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
              }`}>
                <input type="radio" name="tipoRequisicao" value={t}
                  checked={form.tipoRequisicao === t}
                  onChange={() => set("tipoRequisicao")(t)}
                  className="accent-blue-600"/>
                <span className="text-sm font-semibold text-slate-700">{t}</span>
              </label>
            ))}
          </div>

          {isRevisao && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700">Dados do documento existente (obrigatório para revisão):</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número do Documento" required>
                  <input value={form.numeroDocumento} onChange={e => set("numeroDocumento")(e.target.value)}
                    placeholder="Ex: 001" className={INPUT_CLS}/>
                </Field>
                <Field label="Código do Documento" required>
                  <input value={form.codigoDocumento} onChange={e => set("codigoDocumento")(e.target.value)}
                    placeholder="Ex: POP.AGT.001" className={INPUT_CLS}/>
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Dados do documento */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 border-b border-slate-100 pb-2">Dados do Documento</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Abrangência" required>
              <select value={form.abrangencia} onChange={e => set("abrangencia")(e.target.value)} className={SELECT_CLS}>
                <option value="">Selecione...</option>
                {ABRANGENCIAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Tipo de Documento" required>
              <select value={form.tipoDocumento} onChange={e => set("tipoDocumento")(e.target.value)} className={SELECT_CLS}>
                <option value="">Selecione...</option>
                {TIPOS_DOCUMENTO_SOLICITACAO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Setor" required>
            <select value={form.setorSigla} onChange={e => set("setorSigla")(e.target.value)} className={SELECT_CLS}>
              <option value="">Selecione o setor...</option>
              {SETORES_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>

          <Field label="Título do Documento" required>
            <input value={form.titulo} onChange={e => set("titulo")(e.target.value)}
              placeholder="Ex: POP de Higienização de Mãos" className={INPUT_CLS}/>
          </Field>

          <Field label="Descrição / Justificativa">
            <textarea value={form.descricao} onChange={e => set("descricao")(e.target.value)}
              rows={4} placeholder="Descreva o motivo da solicitação e informações relevantes..."
              className={`${INPUT_CLS} resize-none`}/>
          </Field>
        </div>

        {/* Anexos */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 border-b border-slate-100 pb-2">Documentos Anexos <span className="text-red-500">*</span></h2>

          <label htmlFor="file-upload"
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-slate-50 transition-colors block">
            <input id="file-upload" type="file" multiple className="hidden"
              onChange={e => { if (e.target.files) setArquivos(p => [...p, ...Array.from(e.target.files!)]); e.target.value = ""; }}/>
            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-2"/>
            <p className="text-sm text-slate-500">Clique para anexar documentos</p>
          </label>

          {arquivos.length > 0 && (
            <div className="space-y-2">
              {arquivos.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                  <span className="flex-1 truncate text-slate-700">{f.name}</span>
                  <button type="button" onClick={() => setArquivos(p => p.filter((_, j) => j !== i))}
                    className="text-slate-300 hover:text-red-500"><X className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 whitespace-pre-line">{error}</div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin"/> Enviando...</> : "Enviar Solicitação"}
        </button>
      </form>
    </div>
  );
}
