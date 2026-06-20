"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPlus, Upload, X, FileText, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovaSolicitacaoPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList) => {
    setArquivos((prev) => [...prev, ...Array.from(files)]);
  };

  const removeFile = (idx: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim() || arquivos.length === 0) {
      setError("Preencha título, descrição e anexe ao menos um documento.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("titulo", titulo);
      fd.append("descricao", descricao);
      arquivos.forEach((f) => fd.append("arquivos", f));

      const res = await fetch("/api/solicitacoes", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao enviar.");

      router.push(`/solicitacoes/${j.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/solicitacoes" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar para solicitações
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <ClipboardPlus className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Nova Solicitação de Padronização</h1>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Padronização do POP de Higienização de Mãos"
            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={5}
            placeholder="Descreva o motivo da solicitação, contexto e qualquer informação relevante para a Referência Técnica."
            className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Documentos anexos</label>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-slate-50 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
            <Upload className="w-5 h-5 mx-auto text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">Clique para anexar um ou mais documentos</p>
          </div>

          {arquivos.length > 0 && (
            <div className="mt-3 space-y-2">
              {arquivos.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 truncate text-slate-700">{f.name}</span>
                  <button type="button" onClick={() => removeFile(idx)} className="text-slate-300 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</> : "Enviar solicitação"}
        </button>
      </form>
    </div>
  );
}
