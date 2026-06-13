"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, Search, FileText, ExternalLink, Edit2, Download } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, diasRestantes } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

export default function Documentos() {
  const sp = useSearchParams();
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(sp.get("status")||"");
  const [cats, setCats] = useState<any[]>([]);
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<any>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search",search);
    if (statusFilter) p.set("status",statusFilter);
    if (catFilter) p.set("categoriaId",catFilter);
    p.set("page",String(page));
    const r = await fetch(`/api/documentos?${p}`);
    const data = await r.json();
    setDocs(data.documentos||[]); setTotal(data.total||0); setLoading(false);
  }, [search,statusFilter,catFilter,page]);

  useEffect(() => { fetchDocs(); fetch("/api/categorias").then(r=>r.json()).then(setCats); }, [fetchDocs]);

  async function baixarDocx(docId: string, codigo: string, versao: string) {
    const res = await fetch(`/api/docx?id=${docId}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`${codigo}_v${versao}.docx`; a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total/20);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Documentos</h1><p className="text-slate-500 text-sm mt-0.5">{total} documentos</p></div>
        <button onClick={()=>{setEditDoc(null);setModalOpen(true);}} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"><Plus className="w-4 h-4"/>Novo documento</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5 flex items-center gap-3">
        <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar por título ou código..." className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
        <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          {["VIGENTE","VENCENDO","VENCIDO","EM_REVISAO","RASCUNHO"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
        <select value={catFilter} onChange={e=>{setCatFilter(e.target.value);setPage(1);}} className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todas as categorias</option>
          {cats.map((c:any)=><option key={c.id} value={c.id}>{c.sigla} — {c.nome}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
        : docs.length===0 ? <div className="flex flex-col items-center h-48 justify-center text-slate-400"><FileText className="w-12 h-12 mb-2 text-slate-200"/><p className="text-sm">Nenhum documento encontrado</p></div>
        : <table className="w-full">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Código</th>
              <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
              <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</th>
              <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável</th>
              <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Revisão</th>
              <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc:any)=>{ const dias=diasRestantes(doc.dataRevisao); return (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:doc.cor}}/><span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{doc.codigo}</span></div></td>
                  <td className="px-5 py-4"><p className="font-semibold text-sm text-slate-900">{doc.titulo}</p><p className="text-xs text-slate-400">v{doc.versao}</p></td>
                  <td className="px-5 py-4"><p className="font-medium text-xs text-slate-700">{doc.unidade}</p><p className="text-xs text-slate-400">{doc.setor} › {doc.area}</p></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-2">{doc.responsavelImg?<img src={doc.responsavelImg} className="w-6 h-6 rounded-full" alt=""/>:<div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs text-blue-700 font-bold">{doc.responsavelNome?.[0]}</div>}<span className="text-xs text-slate-700">{doc.responsavelNome}</span></div></td>
                  <td className="px-5 py-4"><p className="text-sm text-slate-700">{formatDate(doc.dataRevisao)}</p>{dias<0?<p className="text-xs text-red-500 font-medium">{Math.abs(dias)}d vencido</p>:dias<=30?<p className="text-xs text-amber-500 font-medium">Vence em {dias}d</p>:null}</td>
                  <td className="px-5 py-4"><StatusBadge status={doc.status}/></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-1">
                    {doc.driveFileUrl&&<a href={doc.driveFileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Drive"><ExternalLink className="w-3.5 h-3.5"/></a>}
                    <button onClick={()=>baixarDocx(doc.id,doc.codigo,doc.versao)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Baixar .docx"><Download className="w-3.5 h-3.5"/></button>
                    <button onClick={()=>{setEditDoc(doc);setModalOpen(true);}} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5"/></button>
                  </div></td>
                </tr>);})}
            </tbody>
          </table>}
        {totalPages>1&&<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50"><p className="text-sm text-slate-500">Página {page} de {totalPages}</p><div className="flex gap-2"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-white">← Anterior</button><button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-white">Próxima →</button></div></div>}
      </div>
      {modalOpen && <DocModal open={modalOpen} onClose={()=>{setModalOpen(false);setEditDoc(null);}} onSuccess={fetchDocs} doc={editDoc}/>}
    </div>
  );
}

function DocModal({ open, onClose, onSuccess, doc }: any) {
  const [cats, setCats] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [itensONA, setItensONA] = useState<any[]>([]);
  const [selUnidade, setSelUnidade] = useState("");
  const [selSetor, setSelSetor] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ titulo:"",categoriaId:"",areaId:"",responsavelId:"",versao:"1.0",dataEmissao:new Date().toISOString().split("T")[0],dataRevisao:"",descricao:"",itensONA:[] as string[],driveFileId:"",driveFileUrl:"",driveFileName:"" });

  useEffect(()=>{
    if(!open) return;
    Promise.all([fetch("/api/categorias").then(r=>r.json()),fetch("/api/unidades").then(r=>r.json()),fetch("/api/users").then(r=>r.json()),fetch("/api/ona/itens").then(r=>r.json())]).then(([c,u,us,i])=>{setCats(c);setUnidades(u);setUsers(us);setItensONA(i);});
    if(doc) setForm({titulo:doc.titulo,categoriaId:doc.categoriaId,areaId:doc.areaId,responsavelId:doc.responsavelId,versao:doc.versao,dataEmissao:doc.dataEmissao?.split("T")[0],dataRevisao:doc.dataRevisao?.split("T")[0],descricao:doc.descricao||"",itensONA:[],driveFileId:doc.driveFileId||"",driveFileUrl:doc.driveFileUrl||"",driveFileName:doc.driveFileName||""});
  },[open,doc]);

  const setores = unidades.find((u:any)=>u.id===selUnidade)?.setores??[];
  const areas = setores.find((s:any)=>s.id===selSetor)?.areas??[];

  async function submit(e: any) {
    e.preventDefault(); setLoading(true);
    const url = doc?`/api/documentos/${doc.id}`:"/api/documentos";
    await fetch(url,{method:doc?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    setLoading(false); onSuccess(); onClose();
  }

  if(!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">{doc?"Editar":"Novo"} Documento</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Título *</label><input required value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoria *</label><select required value={form.categoriaId} onChange={e=>setForm(f=>({...f,categoriaId:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Selecione...</option>{cats.map((c:any)=><option key={c.id} value={c.id}>{c.sigla} — {c.nome}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Versão</label><input value={form.versao} onChange={e=>setForm(f=>({...f,versao:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estrutura Organizacional</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Unidade *</label><select required value={selUnidade} onChange={e=>{setSelUnidade(e.target.value);setSelSetor("");setForm(f=>({...f,areaId:""}));}} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">...</option>{unidades.map((u:any)=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Setor *</label><select required disabled={!selUnidade} value={selSetor} onChange={e=>{setSelSetor(e.target.value);setForm(f=>({...f,areaId:""}));}} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"><option value="">...</option>{setores.map((s:any)=><option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Área *</label><select required disabled={!selSetor} value={form.areaId} onChange={e=>setForm(f=>({...f,areaId:e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"><option value="">...</option>{areas.map((a:any)=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
            </div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Responsável *</label><select required value={form.responsavelId} onChange={e=>setForm(f=>({...f,responsavelId:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Selecione...</option>{users.map((u:any)=><option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Data de Emissão *</label><input required type="date" value={form.dataEmissao} onChange={e=>setForm(f=>({...f,dataEmissao:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Próxima Revisão *</label><input required type="date" value={form.dataRevisao} onChange={e=>setForm(f=>({...f,dataRevisao:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/></div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label><textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/></div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 mb-2">Vincular aos itens ONA</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {itensONA.map((item:any)=>(
                <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-blue-100 rounded">
                  <input type="checkbox" checked={form.itensONA.includes(item.id)} onChange={e=>setForm(f=>({...f,itensONA:e.target.checked?[...f.itensONA,item.id]:f.itensONA.filter(x=>x!==item.id)}))}/>
                  <span className="font-mono text-blue-700 flex-shrink-0">{item.codigo}</span>
                  <span className="text-slate-600 truncate">{item.titulo}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{loading?"Salvando...":doc?"Atualizar":"Cadastrar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
