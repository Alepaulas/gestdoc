"use client";
import { useState, useRef } from "react";
import { WandSparkles, Upload, X, Download, FileText, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { TIPOS_ORDENADOS, REGRAS_FORMATACAO, type TipoDocumento } from "@/lib/normaZero";

type FileItem = {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  outUrl?: string;
  outName?: string;
  error?: string;
};

function formatBytes(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}

export default function FormatadorPage() {
  const [tipo, setTipo] = useState<TipoDocumento | "">("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const regra = tipo ? REGRAS_FORMATACAO[tipo] : null;

  const addFiles = (files: FileList) => {
    const arr = Array.from(files).filter(f => /\.(docx|dotx|dotm)$/i.test(f.name));
    setItems(prev => {
      const existing = new Set(prev.map(i => i.file.name + i.file.size));
      return [...prev, ...arr.filter(f => !existing.has(f.name + f.size)).map(f => ({
        id: Math.random().toString(36).slice(2), file: f, status: "pending" as const,
      }))];
    });
  };

  const processAll = async () => {
    if (!tipo) return;
    setRunning(true);
    const pending = items.filter(i => i.status === "pending");
    for (const item of pending) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "processing" } : i));
      try {
        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("tipo", tipo);
        const res = await fetch("/api/formatador", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? res.statusText);
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") ?? "";
        const match = cd.match(/filename="?([^"]+)"?/);
        const outName = match?.[1] ?? item.file.name.replace(/(\.\w+)$/, `_${tipo}_formatado$1`);
        const outUrl = URL.createObjectURL(blob);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "done", outUrl, outName } : i));
      } catch (err: any) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: err.message } : i));
      }
    }
    setRunning(false);
  };

  const pendingCount = items.filter(i => i.status === "pending").length;
  const doneCount = items.filter(i => i.status === "done").length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <WandSparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Formatador de Documentos</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Formata documentos conforme a <strong>Norma Zero ISGH</strong> — selecione o tipo antes de enviar.
        </p>
      </div>

      {/* Seletor de tipo */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Tipo de documento <span className="text-red-500">*</span>
        </label>
        <select
          value={tipo}
          onChange={e => setTipo(e.target.value as TipoDocumento | "")}
          className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
        >
          <option value="">Selecione o tipo de documento...</option>
          {TIPOS_ORDENADOS.map(t => (
            <option key={t.codigo} value={t.codigo}>
              {t.codigo} — {t.nome}
            </option>
          ))}
        </select>

        {/* Resumo das regras do tipo selecionado */}
        {regra && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-blue-800">Regras aplicadas — {regra.nome}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-blue-700">
              <div><span className="font-medium">Fonte:</span> {regra.corpo.fonte}</div>
              <div><span className="font-medium">Tamanho:</span> {regra.corpo.tamanho / 2}pt</div>
              <div><span className="font-medium">Negrito:</span> {regra.corpo.negrito ? "Sim" : "Não"}</div>
              <div><span className="font-medium">Alinhamento:</span> {regra.corpo.alinhamento === "both" ? "Justificado" : "Esquerda"}</div>
              <div><span className="font-medium">Espaçamento:</span> {regra.corpo.espacamentoLinha === 360 ? "1,5 linhas" : "Simples"}</div>
              <div><span className="font-medium">Margens:</span> {regra.margens.esquerda === 284 ? "0,5cm" : "2cm/1,5cm"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => tipo && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-all ${
          tipo
            ? "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50 cursor-pointer"
            : "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".docx,.dotx,.dotm"
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          disabled={!tipo}
        />
        <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-600">
          {tipo ? "Arraste ou clique para selecionar arquivos" : "Selecione o tipo de documento primeiro"}
        </p>
        <p className="text-xs text-slate-400 mt-1">.docx · .dotx · .dotm</p>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-2 mb-5">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="w-5 flex-shrink-0">
                {item.status === "pending"    && <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                {item.status === "processing" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {item.status === "done"       && <CheckCircle className="w-4 h-4 text-green-500" />}
                {item.status === "error"      && <AlertCircle className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{item.file.name}</p>
                {item.status === "pending"    && <p className="text-xs text-slate-400">{formatBytes(item.file.size)}</p>}
                {item.status === "done"       && <p className="text-xs text-green-600">Formatado — {tipo} ({regra?.nome})</p>}
                {item.status === "error"      && <p className="text-xs text-red-500">{item.error}</p>}
              </div>
              {item.status === "done" && item.outUrl && (
                <a href={item.outUrl} download={item.outName}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  <Download className="w-3 h-3" /> Baixar
                </a>
              )}
              {item.status !== "processing" && (
                <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                  className="text-slate-300 hover:text-slate-500 transition-colors ml-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {items.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={processAll}
            disabled={running || pendingCount === 0 || !tipo}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {running
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Formatando…</>
              : <><WandSparkles className="w-4 h-4" /> Formatar {pendingCount} arquivo{pendingCount !== 1 ? "s" : ""} como {tipo}</>
            }
          </button>
          <button onClick={() => setItems([])} disabled={running}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm font-medium">
            Limpar
          </button>
        </div>
      )}

      {doneCount > 0 && !running && (
        <p className="text-center text-sm text-green-600 mt-4 font-medium">
          ✓ {doneCount} arquivo{doneCount !== 1 ? "s" : ""} formatado{doneCount !== 1 ? "s" : ""} conforme Norma Zero
        </p>
      )}
    </div>
  );
}
