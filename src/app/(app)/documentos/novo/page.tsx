"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

const TIPOS = [
  { sigla:"POP", nome:"Procedimento Operacional Padrão" },
  { sigla:"FFO", nome:"Formulário" },
  { sigla:"FTI", nome:"Ficha Técnica do Indicador" },
  { sigla:"FLU", nome:"Fluxograma" },
  { sigla:"MAN", nome:"Manual" },
  { sigla:"NOR", nome:"Normatização" },
  { sigla:"PRO", nome:"Protocolo" },
  { sigla:"PCG", nome:"Protocolo Clínico Gerenciado" },
  { sigla:"POL", nome:"Política" },
  { sigla:"REG", nome:"Regimento" },
  { sigla:"INT", nome:"Interação de Processos" },
  { sigla:"MAP", nome:"Mapeamento de Processos" },
  { sigla:"MOD", nome:"Modelagem" },
  { sigla:"PLC", nome:"Plano de Contingência" },
  { sigla:"REL", nome:"Regulamento" },
];

const AREAS = [
  {sigla:"AGT",nome:"Agência Transfusional"},{sigla:"ALM",nome:"Almoxarifado"},
  {sigla:"AMB",nome:"Ambulatório Geral"},{sigla:"CCG",nome:"Centro Cirúrgico Geral"},
  {sigla:"CME",nome:"Central de Material e Esterilização"},{sigla:"CLM",nome:"Clínica Médica"},
  {sigla:"CLC",nome:"Clínica Cirúrgica"},{sigla:"CLP",nome:"Clínica Pediátrica"},
  {sigla:"CLO",nome:"Clínica Obstétrica"},{sigla:"DIR",nome:"Direção"},
  {sigla:"EMG",nome:"Emergência"},{sigla:"ENF",nome:"Enfermagem"},
  {sigla:"FAR",nome:"Farmácia"},{sigla:"FIS",nome:"Fisioterapia"},
  {sigla:"GER",nome:"Geral"},{sigla:"HIG",nome:"Higienização"},
  {sigla:"LAB",nome:"Laboratório"},{sigla:"MED",nome:"Medicina"},
  {sigla:"NAC",nome:"Núcleo de Atendimento ao Cliente"},
  {sigla:"NAF",nome:"Núcleo Administrativo Financeiro"},
  {sigla:"NGP",nome:"Núcleo de Gestão de Pessoas"},
  {sigla:"NGS",nome:"Núcleo de Gestão e Segurança do Paciente"},
  {sigla:"NUT",nome:"Nutrição"},{sigla:"PSI",nome:"Psicologia"},
  {sigla:"UTI",nome:"UTI Adulto"},
];

const ITENS_ONA = [
  { codigo:"1.2.1", titulo:"Sistema de controle de documentos" },
  { codigo:"1.2.2", titulo:"Documentos aprovados e identificados" },
  { codigo:"1.2.3", titulo:"Documentos obsoletos retirados" },
  { codigo:"1.3.2", titulo:"Educação permanente" },
  { codigo:"2.1.1", titulo:"Identificação segura do paciente" },
  { codigo:"2.1.2", titulo:"Comunicação efetiva" },
  { codigo:"2.1.3", titulo:"Segurança na medicação" },
  { codigo:"2.1.5", titulo:"Prevenção de quedas" },
  { codigo:"2.2.1", titulo:"Notificação de eventos adversos" },
  { codigo:"3.1.1", titulo:"Ciclo PDCA" },
];

export default function NovoDocumento() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [codigoPreview, setCodigoPreview] = useState("");
  const [naoAplicaONA, setNaoAplicaONA] = useState(false);
  const [form, setForm] = useState({
    nome: "", titulo: "", linkEditavel: "",
    tipoSigla: "", areaSigla: "",
    unidade: "", localizacao: "",
    status: "VIGENTE", observacao: "",
    dataPadronizacao: new Date().toLocaleDateString("pt-BR"),
    dataRevisao: "",
    itensONASelecionados: [] as string[],
  });

  function updatePreview(tipoSigla: string, areaSigla: string) {
    if (tipoSigla && areaSigla) setCodigoPreview(`${tipoSigla}.${areaSigla}.001`);
    else setCodigoPreview("");
  }

  function toggleNaoAplica(checked: boolean) {
    setNaoAplicaONA(checked);
    setForm(f => ({ ...f, itensONASelecionados: checked ? ["N/A"] : [] }));
  }

  function toggleItemONA(codigo: string, checked: boolean) {
    setForm(f => ({
      ...f,
      itensONASelecionados: checked
        ? [...f.itensONASelecionados, codigo]
        : f.itensONASelecionados.filter(x => x !== codigo),
    }));
  }

  async function submit(e: any) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/lista-mestra", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        area: AREAS.find(a => a.sigla === form.areaSigla)?.nome ?? form.areaSigla,
        tipo: `${form.tipoSigla} — ${TIPOS.find(t => t.sigla === form.tipoSigla)?.nome ?? ""}`,
        itensONASelecionados: form.itensONASelecionados,
      }),
    });
    const data = await res.json();
    if (data.success) router.push("/documentos/lista-mestra");
    else { alert(data.error || "Erro ao cadastrar"); setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/documentos/lista-mestra" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-4 h-4 text-slate-600"/>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Novo Documento</h1>
          <p className="text-slate-500 text-sm">Código gerado automaticamente · salvo na planilha LISTA_MESTRE</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Identificação */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Identificação</h2>

          {codigoPreview && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-xs text-blue-600 font-medium">Código gerado automaticamente:</span>
              <span className="font-mono font-bold text-blue-800 text-sm">{codigoPreview}</span>
              <span className="text-xs text-blue-400">(número final ajustado ao salvar)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de documento *</label>
              <select required value={form.tipoSigla}
                onChange={e=>{setForm(f=>({...f,tipoSigla:e.target.value}));updatePreview(e.target.value,form.areaSigla);}}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {TIPOS.map(t=><option key={t.sigla} value={t.sigla}>{t.sigla} — {t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Área *</label>
              <select required value={form.areaSigla}
                onChange={e=>{setForm(f=>({...f,areaSigla:e.target.value}));updatePreview(form.tipoSigla,e.target.value);}}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione...</option>
                {AREAS.map(a=><option key={a.sigla} value={a.sigla}>{a.sigla} — {a.nome}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nome do documento *</label>
            <input required value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Higienização das Mãos"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Responsável</label>
              <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do responsável"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unidade</label>
              <input value={form.unidade} onChange={e=>setForm(f=>({...f,unidade:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: HGWA"/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Localização</label>
            <input value={form.localizacao} onChange={e=>setForm(f=>({...f,localizacao:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Setor Clínico › UTI Adulto"/>
          </div>
        </div>

        {/* Datas e links */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Datas e links</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data de padronização *</label>
              <input required value={form.dataPadronizacao} onChange={e=>setForm(f=>({...f,dataPadronizacao:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="dd/mm/aaaa"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data de revisão</label>
              <input value={form.dataRevisao} onChange={e=>setForm(f=>({...f,dataRevisao:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="dd/mm/aaaa"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Link do documento editável</label>
            <input value={form.linkEditavel} onChange={e=>setForm(f=>({...f,linkEditavel:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://docs.google.com/..."/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Observação</label>
            <textarea value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}
              rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>
        </div>

        {/* Itens ONA */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 text-sm mb-1">Conformidade ONA</h2>
          <p className="text-xs text-slate-400 mb-4">Selecione os itens da norma que este documento atende, ou marque "Não se aplica".</p>

          <label className="flex items-center gap-3 text-sm cursor-pointer mb-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
            <input type="checkbox" checked={naoAplicaONA} onChange={e => toggleNaoAplica(e.target.checked)}
              className="rounded w-4 h-4 accent-slate-600"/>
            <div>
              <span className="font-semibold text-slate-700">Não se aplica à ONA</span>
              <p className="text-xs text-slate-400 mt-0.5">Documento institucional sem vínculo com a acreditação</p>
            </div>
          </label>

          {!naoAplicaONA && (
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              {ITENS_ONA.map(item => (
                <label key={item.codigo} className="flex items-start gap-2 text-xs cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors">
                  <input type="checkbox"
                    checked={form.itensONASelecionados.includes(item.codigo)}
                    onChange={e => toggleItemONA(item.codigo, e.target.checked)}
                    className="rounded mt-0.5 accent-blue-600 flex-shrink-0 w-3.5 h-3.5"/>
                  <div>
                    <span className="font-mono text-blue-700 font-bold">{item.codigo}</span>
                    <span className="text-slate-500 ml-1">{item.titulo}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Link href="/documentos/lista-mestra"
            className="flex-1 text-center border border-slate-200 text-slate-700 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2">
            <Save className="w-4 h-4"/>
            {loading ? "Salvando na planilha..." : "Cadastrar documento"}
          </button>
        </div>
      </form>
    </div>
  );
}
