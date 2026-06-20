"use client";
import { useState, useRef } from "react";
import { GitCompare, Upload, X, Loader2, Plus, Minus, FileText } from "lucide-react";

type DiffOp = { type: "equal" | "insert" | "delete"; text: string };
type Stats = { added: number; removed: number; unchanged: number };

function FileSlot({
  label,
  file,
  onPick,
  onClear,
  accent,
}: {
  label: string;
  file: File | null;
  onPick: (f: File) => void;
  onClear: () => void;
  accent: "old" | "new";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const color = accent === "old" ? "border-slate-300" : "border-blue-300";
  const bg = accent === "old" ? "bg-slate-50" : "bg-blue-50";

  return (
    <div
      onClick={() => !file && inputRef.current?.click()}
      className={`relative flex-1 rounded-xl border-2 border-dashed ${color} ${file ? "bg-white" : bg} p-5 text-center cursor-pointer transition-colors hover:border-blue-400`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.dotx,.dotm,.txt"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onPick(e.target.files[0]); e.target.value = ""; }}
      />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      {file ? (
        <div className="flex items-center justify-center gap-2">
          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{file.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-slate-300 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <Upload className="w-5 h-5" />
          <span className="text-sm">Clique para enviar</span>
        </div>
      )}
    </div>
  );
}

export default function RevisorPage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ops, setOps] = useState<DiffOp[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const canCompare = fileA && fileB && !loading;

  const compare = async () => {
    if (!fileA || !fileB) return;
    setLoading(true);
    setError(null);
    setOps(null);
    setStats(null);
    try {
      const fd = new FormData();
      fd.append("fileA", fileA);
      fd.append("fileB", fileB);
      const res = await fetch("/api/revisor", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Erro ao comparar.");
      setOps(j.ops);
      setStats(j.stats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFileA(null); setFileB(null); setOps(null); setStats(null); setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Revisor de Documentos</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Compare duas versões de um documento e veja as diferenças na hora — nada é salvo.
        </p>
      </div>

      {/* Upload slots */}
      <div className="flex gap-4 mb-4">
        <FileSlot label="Versão antiga" file={fileA} onPick={setFileA} onClear={() => setFileA(null)} accent="old" />
        <FileSlot label="Versão nova" file={fileB} onPick={setFileB} onClear={() => setFileB(null)} accent="new" />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={compare}
          disabled={!canCompare}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Comparando…</>
          ) : (
            <><GitCompare className="w-4 h-4" /> Comparar documentos</>
          )}
        </button>
        {(fileA || fileB || ops) && (
          <button
            onClick={reset}
            disabled={loading}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm font-medium"
          >
            Limpar
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-700 leading-none">{stats.added}</p>
              <p className="text-xs text-green-600">palavras adicionadas</p>
            </div>
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <Minus className="w-4 h-4 text-red-600" />
            <div>
              <p className="text-lg font-bold text-red-700 leading-none">{stats.removed}</p>
              <p className="text-xs text-red-600">palavras removidas</p>
            </div>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <div>
              <p className="text-lg font-bold text-slate-700 leading-none">{stats.unchanged}</p>
              <p className="text-xs text-slate-500">inalteradas</p>
            </div>
          </div>
        </div>
      )}

      {/* Diff output */}
      {ops && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 leading-relaxed text-sm whitespace-pre-wrap">
          {ops.map((op, idx) => {
            if (op.type === "equal") {
              return <span key={idx} className="text-slate-700">{op.text}</span>;
            }
            if (op.type === "insert") {
              return (
                <span key={idx} className="bg-green-100 text-green-800 rounded px-0.5">
                  {op.text}
                </span>
              );
            }
            return (
              <span key={idx} className="bg-red-100 text-red-700 line-through rounded px-0.5">
                {op.text}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
