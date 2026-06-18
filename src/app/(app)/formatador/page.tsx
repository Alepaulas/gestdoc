"use client";
import { useState, useRef, useCallback } from "react";
import { FileText, Upload, Download, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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
  const [items, setItems] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => /\.(docx|dotx|dotm)$/i.test(f.name));
    if (!valid.length) return;
    setItems((prev) => {
      const existing = new Set(prev.map((i) => i.file.name + i.file.size));
      const newItems: FileItem[] = valid
        .filter((f) => !existing.has(f.name + f.size))
        .map((f) => ({ id: Math.random().toString(36).slice(2), file: f, status: "pending" }));
      return [...prev, ...newItems];
    });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const processAll = async () => {
    setRunning(true);
    const pending = items.filter((i) => i.status === "pending");
    for (const item of pending) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "processing" } : i))
      );
      try {
        const fd = new FormData();
        fd.append("file", item.file);
        const res = await fetch("/api/formatador", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? res.statusText);
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") ?? "";
        const match = cd.match(/filename="?([^"]+)"?/);
        const outName = match?.[1] ?? item.file.name.replace(/(\.\w+)$/, "_formatado$1");
        const outUrl = URL.createObjectURL(blob);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "done", outUrl, outName } : i
          )
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "error", error: err.message } : i
          )
        );
      }
    }
    setRunning(false);
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Formatador de Documentos</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Aplica <strong>Calibri 10pt Negrito</strong> em lote nos seus arquivos Word.
        </p>
      </div>

      {/* Spec pills */}
      <div className="flex gap-2 mb-6 ml-12">
        {["Calibri", "10pt", "Negrito"].map((s) => (
          <span
            key={s}
            className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-0.5 text-xs font-semibold"
          >
            {s}
          </span>
        ))}
        <span className="bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-3 py-0.5 text-xs">
          .docx · .dotx · .dotm
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-4
          ${dragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".docx,.dotx,.dotm"
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dragging ? "text-blue-500" : "text-slate-400"}`} />
        <p className="font-semibold text-slate-700">Arraste arquivos ou clique para selecionar</p>
        <p className="text-slate-400 text-sm mt-1">.docx · .dotx · .dotm — até 50 MB por arquivo</p>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="space-y-2 mb-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm"
            >
              {/* Status icon */}
              <div className="w-5 flex-shrink-0">
                {item.status === "pending" && <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                {item.status === "processing" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {item.status === "done" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {item.status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{item.file.name}</p>
                {item.status === "error" && (
                  <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
                )}
                {item.status === "pending" && (
                  <p className="text-xs text-slate-400">{formatBytes(item.file.size)}</p>
                )}
                {item.status === "done" && (
                  <p className="text-xs text-green-600">Formatado com sucesso</p>
                )}
              </div>

              {item.status === "done" && item.outUrl && (
                <a
                  href={item.outUrl}
                  download={item.outName}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Baixar
                </a>
              )}

              {item.status !== "processing" && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 hover:text-slate-500 transition-colors ml-1"
                >
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
            disabled={running || pendingCount === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Formatando…</>
            ) : (
              <><FileText className="w-4 h-4" /> Formatar {pendingCount} arquivo{pendingCount !== 1 ? "s" : ""}</>
            )}
          </button>
          <button
            onClick={() => setItems([])}
            disabled={running}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors text-sm font-medium"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Summary */}
      {doneCount > 0 && !running && (
        <p className="text-center text-sm text-green-600 mt-4 font-medium">
          ✓ {doneCount} arquivo{doneCount !== 1 ? "s" : ""} formatado{doneCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
