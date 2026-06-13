"use client";
import Link from "next/link";
import { FileText, List, LayoutGrid } from "lucide-react";
import { usePathname } from "next/navigation";

export default function DocumentosIndex() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documentos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestão e controle documental do ISGH</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5 max-w-2xl">
        <Link href="/documentos/lista-mestra" className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
            <List className="w-6 h-6 text-blue-700"/>
          </div>
          <h2 className="font-bold text-slate-900 mb-1">Lista Mestra</h2>
          <p className="text-sm text-slate-500">Controle oficial de todos os documentos conforme NOR.SGQ.001 — Norma Zero ISGH</p>
          <p className="text-xs text-blue-700 font-medium mt-3 group-hover:underline">Acessar →</p>
        </Link>
        <Link href="/documentos/todos" className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-slate-50 group-hover:bg-slate-100 rounded-xl flex items-center justify-center mb-4 transition-colors">
            <LayoutGrid className="w-6 h-6 text-slate-600"/>
          </div>
          <h2 className="font-bold text-slate-900 mb-1">Todos os documentos</h2>
          <p className="text-sm text-slate-500">Visualização em cards com filtros por tipo, área e status</p>
          <p className="text-xs text-blue-700 font-medium mt-3 group-hover:underline">Acessar →</p>
        </Link>
      </div>
    </div>
  );
}
