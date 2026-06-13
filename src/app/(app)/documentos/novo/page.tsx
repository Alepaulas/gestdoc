"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NovoDocumento() {
  const router = useRouter();
  const { data: session } = useSession();
  const [tipos, setTipos] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [itensONA, setItensONA] = useState<any[]>([]);
  const [selUnidade, setSelUnidade] = useState("");
  const [selSetor, setSelSetor] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: "", tipoId: "", areaId: "", responsavelId: "",
    versao: "00", dataPadronizacao: new Date().toISOString().split("T")[0],
    dataRevisao: new Date().toISOString().split("T")[0],
    proximaRevisao: "", descricao: "", observacao: "",
    linkEditavel: "", linkPdf: "", itensONA: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/categorias").then(r => r.json()),
      fetch("/api/unidades").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
      fetch("/api/ona/itens").then(r => r.json()),
    ]).then(([t, u, us, i]) => { setTipos(t); setUnidades(u); setUsers(us); setItensONA(i); });
  }, []);

  const setores = unidades.find((u: any) => u.id === selUnidade)?.setores ?? [];
  const areas = setores.find((s: any) => s.id === selSetor)?.areas ?? [];

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/documentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      // Sincroniza com sheets em background
      fetch("/api/sheets", { method: "POST" }).catch(() => {});
      router.push("/documentos/lista-mestra");
    } else {
      alert("Erro ao cadastrar documento.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/documentos/lista-mestra" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Novo Documento</h1>
          <p className="text-slate-500 text-sm">Codificação automática conforme Norma Zero ISGH</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Título */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Identificação</h2>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome do documento *</label>
            <input required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: POP de Higienização das Mãos" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de documento *</label>
              <select required value={form.tipoId} onChange={e => setForm(f => ({ ...f, tipoId: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {tipos.map((t: any) => <option key={t.id} value={t.id}>{t.sigla} — {t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Versão</label>
              <input value={form.versao} onChange={e => setForm(f => ({ ...f, versao: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="00" />
            </div>
          </div>
        </div>

        {/* Estrutura */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Localização</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unidade *</label>
              <select required value={selUnidade} onChange={e => { setSelUnidade(e.target.value); setSelSetor(""); setForm(f => ({ ...f, areaId: "" })); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {unidades.map((u: any) => <option key={u.id} value={u.id}>{u.sigla} — {u.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Setor *</label>
              <select required disabled={!selUnidade} value={selSetor} onChange={e => { setSelSetor(e.target.value); setForm(f => ({ ...f, areaId: "" })); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">Selecione...</option>
                {setores.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Área *</label>
              <select required disabled={!selSetor} value={form.areaId} onChange={e => setForm(f => ({ ...f, areaId: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                <option value="">Selecione...</option>
                {areas.map((a: any) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Responsável *</label>
            <select required value={form.responsavelId} onChange={e => setForm(f => ({ ...f, responsavelId: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
            </select>
          </div>
        </div>

        {/* Datas */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Datas</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de padronização *</label>
              <input required type="date" value={form.dataPadronizacao} onChange={e => setForm(f => ({ ...f, dataPadronizacao: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data de revisão *</label>
              <input required type="date" value={form.dataRevisao} onChange={e => setForm(f => ({ ...f, dataRevisao: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Próxima revisão *</label>
              <input required type="date" value={form.proximaRevisao} onChange={e => setForm(f => ({ ...f, proximaRevisao: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Links e obs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Links e observações</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Link do documento editável</label>
              <input value={form.linkEditavel} onChange={e => setForm(f => ({ ...f, linkEditavel: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://docs.google.com/..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Link do PDF</label>
              <input value={form.linkPdf} onChange={e => setForm(f => ({ ...f, linkPdf: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://drive.google.com/..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Observação</label>
            <textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Observações sobre o documento..." />
          </div>
        </div>

        {/* Itens ONA */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-sm mb-3">Vincular a itens ONA</h2>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {itensONA.map((item: any) => (
              <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer p-2 hover:bg-blue-50 rounded-lg">
                <input type="checkbox"
                  checked={form.itensONA.includes(item.id)}
                  onChange={e => setForm(f => ({ ...f, itensONA: e.target.checked ? [...f.itensONA, item.id] : f.itensONA.filter(x => x !== item.id) }))} />
                <span className="font-mono text-blue-700 flex-shrink-0">{item.codigo}</span>
                <span className="text-slate-600 truncate">{item.titulo}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/documentos/lista-mestra" className="flex-1 text-center border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {loading ? "Cadastrando..." : "Cadastrar documento"}
          </button>
        </div>
      </form>
    </div>
  );
}
