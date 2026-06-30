"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft, Loader2, Hash } from "lucide-react";
import Link from "next/link";
import { TIPOS_ORDENADOS, TIPO_NIVEL, TIPO_VIGENCIA_ANOS, calcularProximaRevisao, type TipoDocumento } from "@/lib/normaZero";
import { UNIDADES_OPTIONS } from "@/lib/unidades";

const AREAS = [
  {sigla:"AGT",nome:"Agência Transfusional"},{sigla:"ALM",nome:"Almoxarifado"},
  {sigla:"AMB",nome:"Ambulatório Geral"},{sigla:"CCG",nome:"Centro Cirúrgico"},
  {sigla:"CME",nome:"CME"},{sigla:"CLM",nome:"Clínica Médica"},
  {sigla:"CLC",nome:"Clínica Cirúrgica"},{sigla:"CLP",nome:"Clínica Pediátrica"},
  {sigla:"CLO",nome:"Clínica Obstétrica"},{sigla:"DIR",nome:"Direção"},
  {sigla:"EMG",nome:"Emergência"},{sigla:"ENF",nome:"Enfermagem"},
  {sigla:"FAR",nome:"Farmácia"},{sigla:"FIS",nome:"Fisioterapia"},
  {sigla:"GER",nome:"Geral"},{sigla:"HIG",nome:"Higienização"},
  {sigla:"LAB",nome:"Laboratório"},{sigla:"MED",nome:"Medicina"},
  {sigla:"NAC",nome:"Núcleo Atendimento ao Cliente"},{sigla:"NAF",nome:"Núcleo Adm. Financeiro"},
  {sigla:"NGP",nome:"Núcleo Gestão de Pessoas"},{sigla:"NGS",nome:"NUGESP"},
  {sigla:"NUT",nome:"Nutrição"},{sigla:"PSI",nome:"Psicologia"},
  {sigla:"UTI",nome:"UTI Adulto"},{sigla:"NEO",nome:"UTI Neonatal"},
  {sigla:"UTP",nome:"UTI Pediátrica"},{sigla:"SGQ",nome:"Sistema de Qualidade"},
];

const hoje = new Date().toLocaleDateString("pt-BR");

function Input({ label, value, onChange, placeholder, type="text", required=false, readOnly=false, hint="" }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${readOnly ? "bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200"}`}/>
    </div>
  );
}

function Select({ label, value, onChange, options, required=false, readOnly=false }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={e=>onChange?.(e.target.value)} disabled={readOnly}
        className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${readOnly ? "bg-slate-50 text-slate-500" : "bg-white"}`}>
        <option value="">Selecione...</option>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Section({ title, children, highlight=false }: any) {
  return (
    <div className={`rounded-2xl border shadow-sm p-6 space-y-4 ${highlight ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"}`}>
      <h2 className="font-bold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-200 pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function NovoDocumentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [codigoPreview, setCodigoPreview] = useState("");
  const [codigoLoading, setCodigoLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<{id:string;name:string|null;email:string|null}[]>([]);
  const [elaboradoresSelecionados, setElaboradoresSelecionados] = useState<string[]>([]);
  const [showElaboradores, setShowElaboradores] = useState(false);
  const [unidades] = useState(UNIDADES_OPTIONS);

  useEffect(() => {
    fetch("/api/users").then(r=>r.json()).then(d => { if (Array.isArray(d)) setUsuarios(d); }).catch(()=>{});
  }, []);

  function toggleElaborador(nome: string) {
    setElaboradoresSelecionados(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    );
  }

  // Campos automáticos derivados do tipo
  const [tipoSigla, setTipoSigla] = useState<TipoDocumento | "">("");
  const [areaSigla, setAreaSigla] = useState("");
  const nivel = tipoSigla ? (TIPO_NIVEL[tipoSigla] ?? "") : "";
  const anosVigencia = tipoSigla ? (TIPO_VIGENCIA_ANOS[tipoSigla] ?? 2) : 2;
  const vigenciaLabel = tipoSigla ? (anosVigencia === 1 ? "1 ano" : `${anosVigencia} anos`) : "";

  const [form, setForm] = useState({
    titulo: "", unidade: "", setor: "",
    statusDemanda: "Em andamento", statusDocumento: "",
    dataSolicitacao: hoje, linkEmail: "",
    encaminhadoValidacao: "", dataValidacao: "",
    prazoMaxPadronizacao: "",
    dataPadronizacao: hoje,
    dataPublicacao: "",
    versao: "00", revisao: "00",
    elaborador: "", aprovador: "", concluidaPor: "",
    itensONA: "",
  });

  const set = (key: string) => (val: string) => setForm(f => ({...f, [key]: val}));

  // Próxima revisão calculada automaticamente
  const proximaRevisao = tipoSigla && form.dataPadronizacao
    ? calcularProximaRevisao(form.dataPadronizacao, tipoSigla)
    : "";

  async function buscarCodigo(tipo: string, area: string) {
    if (!tipo || !area) { setCodigoPreview(""); return; }
    setCodigoLoading(true);
    try {
      const res = await fetch(`/api/codigo-documento?tipo=${tipo}&area=${area}`);
      const j = await res.json();
      setCodigoPreview(j.codigo ?? `${tipo}.${area}.001`);
    } catch { setCodigoPreview(`${tipo}.${area}.001`); }
    finally { setCodigoLoading(false); }
  }

  function handleTipo(v: string) {
    setTipoSigla(v as TipoDocumento);
    buscarCodigo(v, areaSigla);
  }
  function handleArea(v: string) {
    setAreaSigla(v);
    buscarCodigo(tipoSigla, v);
  }

  async function submit(e: any) {
    e.preventDefault();
    if (!tipoSigla || !areaSigla || !form.titulo) {
      alert("Preencha Tipo, Área e Título."); return;
    }
    setLoading(true);
    try {
      const tipoNome = TIPOS_ORDENADOS.find(t => t.codigo === tipoSigla)?.nome ?? tipoSigla;
      const setorNome = AREAS.find(a => a.sigla === areaSigla)?.nome ?? areaSigla;

      const payload = {
        tipoDocumento:        `${tipoSigla} — ${tipoNome}`,
        nivel,
        codigo:               codigoPreview,
        titulo:               form.titulo,
        unidade:              form.unidade,
        setor:                setorNome,
        statusDemanda:        form.statusDemanda,
        statusDocumento:      form.statusDocumento,
        vigencia:             vigenciaLabel,
        dataSolicitacao:      form.dataSolicitacao,
        linkEmail:            form.linkEmail,
        encaminhadoValidacao: form.encaminhadoValidacao,
        dataValidacao:        form.dataValidacao,
        prazoMaxPadronizacao: form.prazoMaxPadronizacao,
        dataPadronizacao:     form.dataPadronizacao,
        dataProximaRevisao:   proximaRevisao,
        dataPublicacao:       form.dataPublicacao,
        versao:               form.versao,
        revisao:              form.revisao,
        elaborador:           elaboradoresSelecionados.join(", "),
        aprovador:            form.aprovador,
        concluidaPor:         form.concluidaPor,
        itensONA:             form.itensONA,
      };

      const res = await fetch("/api/lista-mestra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) router.push("/documentos/lista-mestra");
      else { alert(data.error || "Erro ao cadastrar"); setLoading(false); }
    } catch { alert("Erro ao salvar"); setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/documentos/lista-mestra" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar para Lista Mestra
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Novo Documento</h1>
          <p className="text-slate-500 text-xs mt-0.5">Registrar na Lista Mestra conforme Norma Zero ISGH</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">

        {/* Identificação */}
        <Section title="Identificação do Documento">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo de Documento" required value={tipoSigla} onChange={handleTipo}
              options={TIPOS_ORDENADOS.map(t => ({ value: t.codigo, label: `${t.codigo} — ${t.nome}` }))}/>
            <Select label="Setor / Área" required value={areaSigla} onChange={handleArea}
              options={AREAS.map(a => ({ value: a.sigla, label: `${a.sigla} — ${a.nome}` }))}/>
          </div>

          {/* Campos automáticos */}
          {tipoSigla && (
            <div className="grid grid-cols-3 gap-3">
              <Input label="Nível" value={nivel} readOnly hint="automático"/>
              <Input label="Vigência" value={vigenciaLabel} readOnly hint="automático"/>
              <div className="flex items-end">
                {codigoPreview && (
                  <div className="w-full flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5">
                    <Hash className="w-4 h-4 text-indigo-600 flex-shrink-0"/>
                    <div>
                      <p className="text-xs text-indigo-500">Código</p>
                      {codigoLoading
                        ? <p className="text-xs text-indigo-400 animate-pulse">Consultando...</p>
                        : <p className="font-mono font-bold text-indigo-800 text-sm">{codigoPreview}</p>
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Input label="Título do Documento" required value={form.titulo} onChange={set("titulo")}
            placeholder="Ex: POP de Higienização de Mãos"/>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Unidade" value={form.unidade} onChange={set("unidade")}
              options={UNIDADES_OPTIONS}/>
          </div>
        </Section>

        {/* Demanda */}
        <Section title="Dados da Demanda (FLUIG)">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status da Demanda" value={form.statusDemanda} onChange={set("statusDemanda")}
              options={["Em andamento","Concluída","Cancelada","Pendente"].map(s=>({value:s,label:s}))}/>
            <Select label="Status do Documento" value={form.statusDocumento} onChange={set("statusDocumento")}
              options={["VIGENTE","VENCENDO","VENCIDO","OBSOLETO","EM ELABORAÇÃO"].map(s=>({value:s,label:s}))}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data da Solicitação (E-mail/FLUIG)" value={form.dataSolicitacao}
              onChange={set("dataSolicitacao")} placeholder="DD/MM/AAAA"/>
            <Input label="Link E-mail / FLUIG" value={form.linkEmail}
              onChange={set("linkEmail")} placeholder="https://..."/>
          </div>
        </Section>

        {/* Validação */}
        <Section title="Validação">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Encaminhado para Validação" value={form.encaminhadoValidacao}
              onChange={set("encaminhadoValidacao")} placeholder="DD/MM/AAAA"/>
            <Input label="Data da Validação" value={form.dataValidacao}
              onChange={set("dataValidacao")} placeholder="DD/MM/AAAA"/>
            <Input label="Prazo Máximo para Padronização" value={form.prazoMaxPadronizacao}
              onChange={set("prazoMaxPadronizacao")} placeholder="DD/MM/AAAA"/>
          </div>
        </Section>

        {/* Padronização */}
        <Section title="Padronização e Publicação">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data da Padronização/Revisão" value={form.dataPadronizacao}
              onChange={set("dataPadronizacao")} placeholder="DD/MM/AAAA" hint="hoje por padrão"/>
            <Input label="Data da Próxima Revisão" value={proximaRevisao}
              readOnly hint="calculado automaticamente"/>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Data da Publicação" value={form.dataPublicacao}
              onChange={set("dataPublicacao")} placeholder="DD/MM/AAAA"/>
            <Input label="Versão" value={form.versao} onChange={set("versao")} placeholder="00"/>
            <Input label="Revisão" value={form.revisao} onChange={set("revisao")} placeholder="00"/>
          </div>
        </Section>

        {/* Itens ONA */}
        <Section title="Vínculo com Acreditação ONA">
          <Input label="Itens ONA atendidos" value={form.itensONA} onChange={set("itensONA")}
            placeholder="Ex: 1.2.1, 2.1.3, 3.1.1"/>
          <p className="text-xs text-slate-400 -mt-2">Separe múltiplos códigos por vírgula. Deixe em branco se não aplicável.</p>
        </Section>

        {/* Autoria */}
        <Section title="Autoria e Responsabilidade">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Elaborador(es)</label>
            <div className="relative">
              <button type="button" onClick={() => setShowElaboradores(v => !v)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 flex items-center justify-between">
                <span className={elaboradoresSelecionados.length ? "text-slate-800" : "text-slate-400"}>
                  {elaboradoresSelecionados.length
                    ? elaboradoresSelecionados.join(", ")
                    : "Selecione os elaboradores..."}
                </span>
                <span className="text-slate-400 text-xs">{showElaboradores ? "▲" : "▼"}</span>
              </button>
              {showElaboradores && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                  {usuarios.length === 0
                    ? <p className="px-4 py-3 text-xs text-slate-400">Nenhum usuário cadastrado</p>
                    : usuarios.map(u => {
                        const nome = u.name ?? u.email ?? "";
                        const selecionado = elaboradoresSelecionados.includes(nome);
                        return (
                          <button key={u.id} type="button"
                            onClick={() => toggleElaborador(nome)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${selecionado ? "bg-blue-50" : ""}`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selecionado ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                              {selecionado && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className={selecionado ? "text-blue-700 font-medium" : "text-slate-700"}>{nome}</span>
                          </button>
                        );
                      })
                  }
                  <div className="border-t border-slate-100 px-4 py-2">
                    <button type="button" onClick={() => setShowElaboradores(false)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Confirmar seleção
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Aprovador" value={form.aprovador} onChange={set("aprovador")}
              placeholder="Nome e cargo"/>
            <Input label="Concluída por" value={form.concluidaPor} onChange={set("concluidaPor")}
              placeholder="Nome"/>
          </div>
        </Section>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin"/> Salvando na Lista Mestra...</>
            : "✓ Salvar na Lista Mestra"
          }
        </button>
      </form>
    </div>
  );
}
