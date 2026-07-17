import React, { useState, useMemo } from "react";
import {
  Search, Printer, Wifi, WifiOff, AlertTriangle, Activity,
  LayoutGrid, CalendarDays, TrendingUp, Filter, X, Package,
  ArrowDownCircle, ArrowUpCircle, PlusCircle, PackageX,
  Droplet, Clock, ChevronDown, ChevronRight,
} from "lucide-react";

/* ============================================================
   DADOS REAIS — extraídos do PDF "Gestão de Estoque TI"
   ============================================================ */

const raw = [
  ["Almoxarifado", "10.16.0.150", "Kyocera", "FS1135", "TK-1147", 113198, "online"],
  ["Biblioteca", "10.16.0.172", "Kyocera", "M2035", "TK-1147", null, "offline"],
  ["Secretaria dep. Bolsas", "10.16.0.160", "Ricoh", "SP377", "SP-377 (SP310)", null, "offline"],
  ["Coord. Professores (Em baixo)", "10.16.0.164", "Kyocera", "M2040", "TK-1175", 121805, "online"],
  ["Coord. Professores (Em cima)", "10.16.0.165", "Kyocera", "M2040", "TK-1175", 49629, "online"],
  ["Coord. Professores (Atend.)", "10.16.0.163", "—", "—", "—", null, "offline"],
  ["Clínica Coordenação", "10.16.0.154", "Kyocera", "FS1035", "TK-1147", 122957, "online"],
  ["Clínica Recepção", "10.16.0.152", "Kyocera", "FS1135", "TK-1147", 154826, "online"],
  ["Clínica Gerência", "10.16.0.153", "Kyocera", "FS4200", "TK-3122", null, "offline"],
  ["Colégio FEB", "10.16.0.170", "Kyocera", "FS4200", "TK-3122", null, "offline"],
  ["Colégio FEB (Colorida)", "10.16.0.182", "Canon", "C5030", "GPR-31 BLACK", null, "offline"],
  ["Departamento de Tecnologia", "10.16.0.175", "Ricoh", "SP377", "SP-377 (SP310)", 93901, "online"],
  ["Matrícula", "10.16.0.179", "HP", "M428fdw", "CF258X", 246306, "online"],
  ["Secretaria Atend. Protocolo", "10.16.0.158", "Ricoh", "SP377", "SP-377 (SP310)", 65077, "online"],
  ["Secretaria Sala de Diplomas", "10.16.0.161", "Kyocera", "M2035", "TK-1147", null, "offline"],
  ["Coordenação Laboratórios", "10.16.0.188", "Canon", "IR1025", "GPR-22", 127780, "online"],
  ["Manutenção", "10.16.0.151", "Ricoh", "SP377", "SP-377 (SP310)", 62100, "online"],
  ["Comissão Própria Aval. (CPA)", "10.16.0.110", "OKI", "ES4172", "ES 5112", null, "erro"],
  ["NEU", "10.16.0.177", "OKI", "ES4172", "ES 5112", null, "offline"],
  ["Marketing", "10.16.0.180", "Ricoh", "SP377", "SP-377 (SP310)", 83519, "online"],
  ["Marketing Produção", "10.16.0.171", "Canon", "C5030", "GPR-31 BLACK", null, "offline"],
  ["NAPE", "10.16.0.166", "HP", "M428fdw", "CF258X", 66127, "online"],
  ["Cartório - NPJ", "—", "Kyocera", "FS1035", "TK-1147", null, "erro"],
  ["Núcleo Práticas Jurídicas", "10.16.0.173", "OKI", "ES4172", "ES 5112", null, "offline"],
  ["Núcleo Educação Distância (NEAD)", "10.16.0.178", "OKI", "ES5112", "ES 5112", null, "offline"],
  ["Pós graduação", "10.0.0.124", "Ricoh", "SP377", "SP-377 (SP310)", null, "offline"],
  ["Atendimento financeiro", "10.16.0.157", "Ricoh", "SP377", "SP-377 (SP310)", 146585, "online"],
  ["PRADM", "10.16.0.156", "Kyocera", "M3550", "TK-3122", 410607, "online"],
  ["Departamento Jurídico (DEJUR)", "10.16.0.168", "OKI", "ES4172", "ES 5112", null, "offline"],
  ["Pró Aluno", "10.16.0.181", "Ricoh", "SP377", "SP-377 (SP310)", 20429, "online"],
  ["Reitoria", "10.16.0.187", "Epson", "WF-C5790", "R04L BLACK", 73042, "online"],
  ["RH", "10.16.0.155", "OKI", "ES4172", "ES 5112", null, "offline"],
  ["Secretaria", "10.16.0.159", "OKI", "ES4172", "ES 5112", null, "offline"],
  ["Secretaria Provas (6075)", "10.16.0.184", "Canon", "IR6075", "GPR-38", null, "offline"],
  ["Secretaria Provas (6275)", "10.16.0.183", "Canon", "IR6275", "GPR-38", null, "offline"],
  ["Núcleo Suporte Técnico (NST)", "10.16.0.162", "HP", "M248F", "CF258X", 4132, "online"],
  ["Conselho Curador", "10.16.0.167", "—", "—", "—", 124950, "online"],
  ["Medicina Veterinária", "10.16.0.174", "—", "—", "—", 59015, "online"],
  ["Diretoria Acadêmica (Reitoria)", "10.16.0.169", "OKI", "ES4172LP MFP", "ES 5112", null, "offline"],
  ["Sala atend. professor ao aluno", "10.16.0.176", "OKI", "—", "ES 5112", null, "offline"],
];

const DATAS = ["10/07", "11/07", "12/07", "13/07", "14/07"];

// rendimento aproximado por modelo de toner (páginas) — ajuste conforme seus dados
const RENDIMENTO = {
  "TK-322": 15000, "TK-1175": 12000, "TK-1147": 7200, "TK-3122": 21000,
  "GPR-22": 8400, "GPR-31 BLACK": 19000, "GPR-31 CYAN": 19000,
  "GPR-31 MAGENTA": 19000, "GPR-31 YELLOW": 19000, "GPR-38": 56000,
  "R04L BLACK": 10000, "R04L CYAN": 10000, "R04L MAGENTA": 10000, "R04L YELLOW": 10000,
  "SP-377 (SP310)": 6400, "CF258X": 10000, "ES 5112": 12000,
};

function gerarHistorico(atual, seed) {
  if (atual == null) return DATAS.map(() => null);
  const passoBase = 40 + ((seed * 37) % 260);
  const hist = [];
  let v = atual;
  for (let i = DATAS.length - 1; i >= 0; i--) {
    hist[i] = v;
    const variacao = passoBase + ((seed * (i + 3)) % 90) - 30;
    v = Math.max(0, v - Math.max(0, variacao));
  }
  return hist;
}

function mediaPorDia(hist) {
  const deltas = [];
  for (let i = 1; i < hist.length; i++) {
    if (hist[i] != null && hist[i - 1] != null) deltas.push(Math.max(0, hist[i] - hist[i - 1]));
  }
  if (!deltas.length) return 0;
  return Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
}

const printers = raw.map((r, i) => {
  const [setor, ip, marca, modelo, toner, contador, status] = r;
  const historico = gerarHistorico(contador, i + 1);
  const media = mediaPorDia(historico);
  const nivel = status === "online" ? 8 + ((i * 17) % 88) : null;
  const rend = RENDIMENTO[toner] || null;
  const diasRestantes = nivel != null && rend && media > 0
    ? Math.round((nivel / 100) * rend / media) : null;
  return { id: i + 1, setor, ip, marca, modelo, toner, contador, status, historico, media, nivel, rend, diasRestantes };
});

const estoqueInicial = [
  { id: 1, fab: "Kyocera", modelo: "TK-322", atual: 3, min: 2 },
  { id: 2, fab: "Kyocera", modelo: "TK-1175", atual: 10, min: 2 },
  { id: 3, fab: "Kyocera", modelo: "TK-1147", atual: 1, min: 2 },
  { id: 4, fab: "Kyocera", modelo: "TK-3122", atual: 2, min: 2 },
  { id: 5, fab: "Canon", modelo: "GPR-22", atual: 1, min: 2 },
  { id: 6, fab: "Canon", modelo: "GPR-31 CYAN", atual: 1, min: 2 },
  { id: 7, fab: "Canon", modelo: "GPR-31 MAGENTA", atual: 0, min: 2 },
  { id: 8, fab: "Canon", modelo: "GPR-31 YELLOW", atual: 1, min: 2 },
  { id: 9, fab: "Canon", modelo: "GPR-31 BLACK", atual: 1, min: 2 },
  { id: 10, fab: "Canon", modelo: "GPR-38", atual: 4, min: 2 },
  { id: 11, fab: "Epson", modelo: "R04L CYAN", atual: 0, min: 2 },
  { id: 12, fab: "Epson", modelo: "R04L MAGENTA", atual: 0, min: 2 },
  { id: 13, fab: "Epson", modelo: "R04L YELLOW", atual: 0, min: 2 },
  { id: 14, fab: "Epson", modelo: "R04L BLACK", atual: 0, min: 2 },
  { id: 15, fab: "Ricoh", modelo: "SP-377 (SP310)", atual: 2, min: 2 },
  { id: 16, fab: "HP", modelo: "CF258X", atual: 2, min: 2 },
  { id: 17, fab: "OKI", modelo: "ES 5112", atual: 3, min: 2 },
];

const impressorasPorToner = (modelo) => printers.filter((p) => p.toner === modelo);

/* ============================================================ */

const COR = {
  bg: "#0e1420", panel: "#161d2b", panelAlt: "#1b2434", border: "#26324a",
  ink: "#e8edf6", sub: "#8b98b0", faint: "#5b6880",
  online: "#34d399", offline: "#f43f5e", erro: "#f59e0b",
  accent: "#38bdf8", accentSoft: "rgba(56,189,248,0.12)",
};

const statusMeta = {
  online: { label: "Online", cor: COR.online, Icon: Wifi },
  offline: { label: "Offline", cor: COR.offline, Icon: WifiOff },
  erro: { label: "Erro SNMP", cor: COR.erro, Icon: AlertTriangle },
};

const nf = (n) => (n == null ? "—" : n.toLocaleString("pt-BR"));

function corDias(d) {
  if (d == null) return COR.faint;
  if (d <= 7) return COR.offline;
  if (d <= 20) return COR.erro;
  return COR.online;
}

function StatusBadge({ status }) {
  const m = statusMeta[status];
  const Icon = m.Icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: m.cor, background: `${m.cor}1f`, border: `1px solid ${m.cor}44` }}>
      <Icon size={13} strokeWidth={2.4} />{m.label}
    </span>
  );
}

function Dot({ cor, pulse }) {
  return (
    <span className="relative inline-flex" style={{ width: 9, height: 9 }}>
      {pulse && <span className="absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: cor, animation: "ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />}
      <span className="relative inline-flex rounded-full" style={{ width: 9, height: 9, background: cor }} />
    </span>
  );
}

function KPI({ Icon, valor, label, cor }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
      <div className="flex items-center justify-center rounded-lg" style={{ width: 42, height: 42, background: `${cor}1c`, color: cor }}>
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <div className="text-2xl font-bold tracking-tight" style={{ color: COR.ink, fontVariantNumeric: "tabular-nums" }}>{valor}</div>
        <div className="text-xs font-medium" style={{ color: COR.sub }}>{label}</div>
      </div>
    </div>
  );
}

function BarraNivel({ nivel }) {
  if (nivel == null) return <span style={{ color: COR.faint }}>—</span>;
  const cor = nivel <= 15 ? COR.offline : nivel <= 35 ? COR.erro : COR.online;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 rounded-full" style={{ width: 70, background: COR.panelAlt, border: `1px solid ${COR.border}` }}>
        <div className="h-full rounded-full" style={{ width: `${nivel}%`, background: cor }} />
      </div>
      <span className="mono text-xs font-semibold" style={{ color: cor, minWidth: 30 }}>{nivel}%</span>
    </div>
  );
}

export default function DashboardImpressoras() {
  const [aba, setAba] = useState("monitoramento");
  const [busca, setBusca] = useState("");
  const [setorSel, setSetorSel] = useState("todos");
  const [statusSel, setStatusSel] = useState("todos");

  const [estoque, setEstoque] = useState(estoqueInicial);
  const [movs, setMovs] = useState([]);
  const [form, setForm] = useState({ tipo: "Retirada", modelo: estoqueInicial[0].modelo, qtd: 1, resp: "" });
  const [soRepor, setSoRepor] = useState(false);
  const [expandido, setExpandido] = useState(null);

  const setores = useMemo(() => ["todos", ...Array.from(new Set(printers.map((p) => p.setor))).sort()], []);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return printers.filter((p) => {
      if (setorSel !== "todos" && p.setor !== setorSel) return false;
      if (statusSel !== "todos" && p.status !== statusSel) return false;
      if (!t) return true;
      return p.setor.toLowerCase().includes(t) || p.ip.toLowerCase().includes(t) ||
        `${p.marca} ${p.modelo}`.toLowerCase().includes(t) || (p.toner || "").toLowerCase().includes(t);
    });
  }, [busca, setorSel, statusSel]);

  const kpis = useMemo(() => ({
    total: printers.length,
    online: printers.filter((p) => p.status === "online").length,
    offline: printers.filter((p) => p.status === "offline").length,
    erro: printers.filter((p) => p.status === "erro").length,
    totalPag: printers.reduce((s, p) => s + (p.contador || 0), 0),
  }), []);

  const estoqueKpi = useMemo(() => ({
    totalUnid: estoque.reduce((s, e) => s + e.atual, 0),
    repor: estoque.filter((e) => e.atual <= e.min).length,
    modelos: estoque.length,
  }), [estoque]);

  const vidaToner = useMemo(() =>
    printers.filter((p) => p.nivel != null && p.toner !== "—")
      .sort((a, b) => (a.diasRestantes ?? 9999) - (b.diasRestantes ?? 9999)), []);

  const vidaKpi = useMemo(() => ({
    criticas: vidaToner.filter((p) => p.diasRestantes != null && p.diasRestantes <= 7).length,
    atencao: vidaToner.filter((p) => p.diasRestantes != null && p.diasRestantes > 7 && p.diasRestantes <= 20).length,
    monitoradas: vidaToner.length,
  }), [vidaToner]);

  const temFiltro = setorSel !== "todos" || statusSel !== "todos" || busca.trim() !== "";
  const filtroImpressoras = aba === "monitoramento" || aba === "contadores" || aba === "vida";

  function registrarMov() {
    const qtd = parseInt(form.qtd, 10);
    if (!qtd || qtd < 1) return;
    const delta = form.tipo === "Retirada" ? -qtd : qtd;
    setEstoque((prev) => prev.map((e) => e.modelo === form.modelo ? { ...e, atual: Math.max(0, e.atual + delta) } : e));
    const agora = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    setMovs((prev) => [{ id: Date.now(), data: agora, tipo: form.tipo, modelo: form.modelo, qtd, resp: form.resp || "—" }, ...prev]);
    setForm((f) => ({ ...f, qtd: 1, resp: "" }));
  }

  const estoqueVis = soRepor ? estoque.filter((e) => e.atual <= e.min) : estoque;
  const listaVida = vidaToner.filter((p) => setorSel === "todos" || p.setor === setorSel)
    .filter((p) => !busca.trim() || p.setor.toLowerCase().includes(busca.trim().toLowerCase()) || (p.toner || "").toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div style={{ background: COR.bg, color: COR.ink, minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes ping { 75%,100% { transform: scale(2.2); opacity: 0; } }
        .row-hover:hover { background: ${COR.panelAlt} !important; }
        ::-webkit-scrollbar { height: 10px; width: 10px; }
        ::-webkit-scrollbar-thumb { background: ${COR.border}; border-radius: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .mono { font-family: 'JetBrains Mono','SF Mono',ui-monospace,monospace; }
        input::placeholder { color: ${COR.faint}; }
      `}</style>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 46, height: 46, background: COR.accentSoft, color: COR.accent, border: `1px solid ${COR.border}` }}>
              <Printer size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestão de Impressoras & Toner · TI</h1>
              <p className="text-xs" style={{ color: COR.sub }}>Leitura SNMP · última coleta <span className="mono">14/07/2026 09:15</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
            <Dot cor={COR.online} pulse /><span className="text-xs font-medium" style={{ color: COR.sub }}>Coleta ativa</span>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {aba === "movimentacoes" ? (
            <>
              <KPI Icon={Package} valor={estoqueKpi.totalUnid} label="Toners em estoque" cor={COR.accent} />
              <KPI Icon={PackageX} valor={estoqueKpi.repor} label="Modelos p/ repor" cor={COR.offline} />
              <KPI Icon={LayoutGrid} valor={estoqueKpi.modelos} label="Modelos cadastrados" cor="#a78bfa" />
              <KPI Icon={ArrowDownCircle} valor={movs.filter((m) => m.tipo === "Retirada").length} label="Retiradas (sessão)" cor={COR.erro} />
              <KPI Icon={ArrowUpCircle} valor={movs.filter((m) => m.tipo === "Entrada").length} label="Entradas (sessão)" cor={COR.online} />
            </>
          ) : aba === "vida" ? (
            <>
              <KPI Icon={Droplet} valor={vidaKpi.monitoradas} label="Toners monitorados" cor={COR.accent} />
              <KPI Icon={AlertTriangle} valor={vidaKpi.criticas} label="Trocar em ≤7 dias" cor={COR.offline} />
              <KPI Icon={Clock} valor={vidaKpi.atencao} label="Atenção (≤20 dias)" cor={COR.erro} />
              <KPI Icon={Wifi} valor={kpis.online} label="Online" cor={COR.online} />
              <KPI Icon={Activity} valor={nf(kpis.totalPag)} label="Páginas (soma)" cor="#a78bfa" />
            </>
          ) : (
            <>
              <KPI Icon={LayoutGrid} valor={kpis.total} label="Impressoras" cor={COR.accent} />
              <KPI Icon={Wifi} valor={kpis.online} label="Online" cor={COR.online} />
              <KPI Icon={WifiOff} valor={kpis.offline} label="Offline" cor={COR.offline} />
              <KPI Icon={AlertTriangle} valor={kpis.erro} label="Com erro" cor={COR.erro} />
              <KPI Icon={Activity} valor={nf(kpis.totalPag)} label="Páginas (soma)" cor="#a78bfa" />
            </>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-1 rounded-xl p-1" style={{ background: COR.panel, border: `1px solid ${COR.border}`, width: "fit-content" }}>
          {[
            { id: "monitoramento", label: "Monitoramento", Icon: Activity },
            { id: "contadores", label: "Contadores Diários", Icon: CalendarDays },
            { id: "vida", label: "Vida do Toner", Icon: Droplet },
            { id: "movimentacoes", label: "Movimentações", Icon: Package },
          ].map((t) => {
            const ativa = aba === t.id;
            return (
              <button key={t.id} onClick={() => setAba(t.id)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: ativa ? COR.accentSoft : "transparent", color: ativa ? COR.accent : COR.sub, border: `1px solid ${ativa ? COR.border : "transparent"}` }}>
                <t.Icon size={16} strokeWidth={2.2} />{t.label}
              </button>
            );
          })}
        </div>

        {filtroImpressoras && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1" style={{ minWidth: 220 }}>
              <Search size={16} className="absolute top-1/2 -translate-y-1/2" style={{ left: 12, color: COR.faint }} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por setor, IP, modelo ou toner..."
                className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }} />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={15} style={{ color: COR.faint }} />
              <select value={setorSel} onChange={(e) => setSetorSel(e.target.value)} className="rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink, maxWidth: 240 }}>
                {setores.map((s) => <option key={s} value={s} style={{ background: COR.panel }}>{s === "todos" ? "Todos os setores" : s}</option>)}
              </select>
            </div>
            {aba !== "vida" && (
              <select value={statusSel} onChange={(e) => setStatusSel(e.target.value)} className="rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }}>
                <option value="todos" style={{ background: COR.panel }}>Todos os status</option>
                <option value="online" style={{ background: COR.panel }}>Online</option>
                <option value="offline" style={{ background: COR.panel }}>Offline</option>
                <option value="erro" style={{ background: COR.panel }}>Erro SNMP</option>
              </select>
            )}
            {temFiltro && (
              <button onClick={() => { setBusca(""); setSetorSel("todos"); setStatusSel("todos"); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium" style={{ background: COR.panelAlt, border: `1px solid ${COR.border}`, color: COR.sub }}>
                <X size={14} /> Limpar
              </button>
            )}
          </div>
        )}

        {/* MONITORAMENTO */}
        {aba === "monitoramento" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead><tr style={{ background: COR.panelAlt }}>
                {["", "Setor", "IP", "Marca / Modelo", "Toner", "Contador", "Status"].map((h, i) => (
                  <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtradas.map((p) => {
                  const m = statusMeta[p.status];
                  return (
                    <tr key={p.id} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><Dot cor={m.cor} pulse={p.status === "online"} /></td>
                      <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.setor}</td>
                      <td className="mono px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.ip}</td>
                      <td className="px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>
                        <span style={{ color: COR.ink }}>{p.marca}</span> <span className="mono text-xs">{p.modelo}</span>
                      </td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{p.toner}</span>
                      </td>
                      <td className="mono px-3 py-3 font-semibold" style={{ color: p.contador ? COR.ink : COR.faint, borderBottom: `1px solid ${COR.border}`, fontVariantNumeric: "tabular-nums" }}>{nf(p.contador)}</td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
                {filtradas.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Nenhuma impressora encontrada.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* CONTADORES DIÁRIOS */}
        {aba === "contadores" && (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: COR.sub }}>
              <TrendingUp size={14} style={{ color: COR.accent }} />
              Cada data é uma coluna. O número menor abaixo é o volume impresso naquele dia (Δ diário).
            </div>
            <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
              <table className="w-full border-collapse text-sm">
                <thead><tr style={{ background: COR.panelAlt }}>
                  <th className="sticky left-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, background: COR.panelAlt, minWidth: 220 }}>Impressora</th>
                  {DATAS.map((d, i) => (
                    <th key={d} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                      style={{ color: i === DATAS.length - 1 ? COR.accent : COR.sub, borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}`, minWidth: 108 }}>
                      {d}{i === DATAS.length - 1 && <span className="ml-1 text-[10px]">(real)</span>}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtradas.map((p) => (
                    <tr key={p.id} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="sticky left-0 z-10 px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}`, background: COR.panel }}>
                        <div className="flex items-center gap-2"><Dot cor={statusMeta[p.status].cor} />
                          <div><div className="font-medium leading-tight" style={{ color: COR.ink }}>{p.setor}</div>
                            <div className="mono text-xs" style={{ color: COR.faint }}>{p.ip}</div></div>
                        </div>
                      </td>
                      {p.historico.map((v, i) => {
                        const anterior = i > 0 ? p.historico[i - 1] : null;
                        const delta = v != null && anterior != null ? v - anterior : null;
                        const ultima = i === DATAS.length - 1;
                        return (
                          <td key={i} className="px-3 py-3 text-right align-top" style={{ borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}`, background: ultima ? COR.accentSoft : "transparent" }}>
                            <div className="mono font-semibold" style={{ color: v != null ? COR.ink : COR.faint, fontVariantNumeric: "tabular-nums" }}>{nf(v)}</div>
                            {delta != null && delta > 0 && <div className="mono text-xs" style={{ color: COR.online }}>+{delta.toLocaleString("pt-BR")}</div>}
                            {delta === 0 && <div className="mono text-xs" style={{ color: COR.faint }}>0</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {filtradas.length === 0 && <tr><td colSpan={DATAS.length + 1} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Nenhuma impressora encontrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* VIDA DO TONER */}
        {aba === "vida" && (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: COR.sub }}>
              <Droplet size={14} style={{ color: COR.accent }} />
              Estimativa = (nível % × rendimento do toner) ÷ média de páginas/dia. Ordenado do mais urgente ao menos.
            </div>
            <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
              <table className="w-full border-collapse text-sm">
                <thead><tr style={{ background: COR.panelAlt }}>
                  {["Setor", "Toner", "Nível", "Páginas/dia", "Rendimento", "Dias restantes"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {listaVida.map((p) => (
                    <tr key={p.id} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <div className="font-medium" style={{ color: COR.ink }}>{p.setor}</div>
                        <div className="mono text-xs" style={{ color: COR.faint }}>{p.ip}</div>
                      </td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{p.toner}</span>
                      </td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><BarraNivel nivel={p.nivel} /></td>
                      <td className="mono px-3 py-3" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{nf(p.media)}</td>
                      <td className="mono px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.rend ? nf(p.rend) : "—"}</td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        {p.diasRestantes != null ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold mono"
                            style={{ color: corDias(p.diasRestantes), background: `${corDias(p.diasRestantes)}1f`, border: `1px solid ${corDias(p.diasRestantes)}44` }}>
                            <Clock size={12} />~{p.diasRestantes} dias
                          </span>
                        ) : <span style={{ color: COR.faint }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {listaVida.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Sem impressoras com nível de toner disponível.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs" style={{ color: COR.faint }}>
              O nível (%) vem do SNMP (prtMarkerSuppliesLevel) na versão real do <span className="mono">leitor.py</span>. Aqui os níveis são exemplos. Rendimentos por modelo são aproximados e editáveis no código.
            </p>
          </>
        )}

        {/* MOVIMENTAÇÕES */}
        {aba === "movimentacoes" && (
          <div className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-xl p-4" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: COR.ink }}>
                  <PlusCircle size={16} style={{ color: COR.accent }} /> Registrar movimentação
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {["Retirada", "Entrada"].map((t) => {
                    const ativo = form.tipo === t;
                    const cor = t === "Retirada" ? COR.offline : COR.online;
                    return (
                      <button key={t} onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                        className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors"
                        style={{ background: ativo ? `${cor}22` : COR.panelAlt, color: ativo ? cor : COR.sub, border: `1px solid ${ativo ? `${cor}66` : COR.border}` }}>
                        {t === "Retirada" ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}{t}
                      </button>
                    );
                  })}
                </div>
                <label className="mb-1 block text-xs font-medium" style={{ color: COR.sub }}>Modelo do toner</label>
                <select value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                  className="mb-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: COR.panelAlt, border: `1px solid ${COR.border}`, color: COR.ink }}>
                  {estoque.map((e) => <option key={e.id} value={e.modelo} style={{ background: COR.panel }}>{e.modelo} (estoque: {e.atual})</option>)}
                </select>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: COR.sub }}>Quantidade</label>
                    <input type="number" min="1" value={form.qtd} onChange={(e) => setForm((f) => ({ ...f, qtd: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: COR.panelAlt, border: `1px solid ${COR.border}`, color: COR.ink }} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: COR.sub }}>Responsável / setor</label>
                    <input value={form.resp} onChange={(e) => setForm((f) => ({ ...f, resp: e.target.value }))} placeholder="Nome"
                      className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: COR.panelAlt, border: `1px solid ${COR.border}`, color: COR.ink }} />
                  </div>
                </div>
                <button onClick={registrarMov} className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors" style={{ background: COR.accent, color: "#04121e" }}>Lançar movimentação</button>
              </div>

              <div className="rounded-xl" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
                <div className="border-b px-4 py-3 text-sm font-semibold" style={{ color: COR.ink, borderColor: COR.border }}>Últimas movimentações</div>
                <div className="max-h-72 overflow-y-auto">
                  {movs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm" style={{ color: COR.faint }}>Nenhuma movimentação lançada ainda.<br />Registre uma retirada acima.</div>
                  ) : movs.map((m) => {
                    const cor = m.tipo === "Retirada" ? COR.offline : COR.online;
                    return (
                      <div key={m.id} className="flex items-center gap-3 border-b px-4 py-2.5 text-sm" style={{ borderColor: COR.border }}>
                        {m.tipo === "Retirada" ? <ArrowDownCircle size={16} style={{ color: cor }} /> : <ArrowUpCircle size={16} style={{ color: cor }} />}
                        <div className="flex-1">
                          <div className="font-medium" style={{ color: COR.ink }}>{m.modelo}</div>
                          <div className="text-xs" style={{ color: COR.faint }}>{m.data} · {m.resp}</div>
                        </div>
                        <div className="mono font-semibold" style={{ color: cor }}>{m.tipo === "Retirada" ? "-" : "+"}{m.qtd}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold" style={{ color: COR.ink }}>Estoque de toners</div>
                <button onClick={() => setSoRepor((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{ background: soRepor ? `${COR.offline}22` : COR.panel, color: soRepor ? COR.offline : COR.sub, border: `1px solid ${soRepor ? `${COR.offline}55` : COR.border}` }}>
                  <PackageX size={14} /> {soRepor ? "Mostrando só p/ repor" : "Só os que precisam repor"}
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
                <table className="w-full border-collapse text-sm">
                  <thead><tr style={{ background: COR.panelAlt }}>
                    {["Fabricante", "Modelo", "Estoque", "Mín.", "Impressoras", "Status"].map((h, i) => (
                      <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {estoqueVis.map((e) => {
                      const repor = e.atual <= e.min;
                      const cor = repor ? COR.offline : COR.online;
                      const usam = impressorasPorToner(e.modelo);
                      const aberto = expandido === e.id;
                      return (
                        <React.Fragment key={e.id}>
                          <tr className="row-hover transition-colors" style={{ background: COR.panel }}>
                            <td className="px-3 py-2.5" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{e.fab}</td>
                            <td className="px-3 py-2.5 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{e.modelo}</td>
                            <td className="mono px-3 py-2.5 font-bold" style={{ color: repor ? COR.offline : COR.ink, borderBottom: `1px solid ${COR.border}` }}>{e.atual}</td>
                            <td className="mono px-3 py-2.5" style={{ color: COR.faint, borderBottom: `1px solid ${COR.border}` }}>{e.min}</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${COR.border}` }}>
                              {usam.length > 0 ? (
                                <button onClick={() => setExpandido(aberto ? null : e.id)} className="flex items-center gap-1 text-xs font-medium" style={{ color: COR.accent }}>
                                  {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{usam.length} impressora{usam.length > 1 ? "s" : ""}
                                </button>
                              ) : <span className="text-xs" style={{ color: COR.faint }}>—</span>}
                            </td>
                            <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${COR.border}` }}>
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: cor, background: `${cor}1f`, border: `1px solid ${cor}44` }}>
                                {repor ? <><AlertTriangle size={12} /> Repor</> : <>OK</>}
                              </span>
                            </td>
                          </tr>
                          {aberto && (
                            <tr style={{ background: COR.panelAlt }}>
                              <td colSpan={6} className="px-3 py-2" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                <div className="flex flex-wrap gap-1.5">
                                  {usam.map((p) => (
                                    <span key={p.id} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.sub }}>
                                      <Dot cor={statusMeta[p.status].cor} />{p.setor} <span className="mono" style={{ color: COR.faint }}>{p.ip}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs" style={{ color: COR.faint }}>
                Clique em "impressoras" para ver quais equipamentos usam cada toner — assim você sabe quem fica parado se um modelo zerar. As movimentações aqui valem para esta sessão; no uso real, entram pelo QR/formulário do armário.
              </p>
            </div>
          </div>
        )}

        <footer className="mt-6 text-center text-xs" style={{ color: COR.faint }}>
          Dados reais de <span className="mono">14/07/2026</span>. Histórico diário, níveis de toner e movimentações são exemplos para demonstração.
        </footer>
      </div>
    </div>
  );
}
