import React, { useState, useMemo } from "react";
import { useDashboard, useMovimentacoes } from './services/sheetsApi';
import {
  Search, Printer, Wifi, WifiOff, AlertTriangle, Activity,
  LayoutGrid, CalendarDays, Filter, X, Package,
  ArrowDownCircle, ArrowUpCircle, PackageX, Droplet, Clock, 
  ChevronDown, ChevronRight, RefreshCw, Link2
} from "lucide-react";

/* ============================================================
   CONFIGURAÇÃO DE CORES (DARK MODE DO DASHBOARD_1)
   ============================================================ */
const COR = {
  bg: "#0f172a",       /* Cor de fundo principal solicitada */
  panel: "#161d2b",    /* Cartões e painéis */
  panelAlt: "#1b2434", /* Cabeçalhos e detalhes */
  border: "#26324a",   /* Borda sutil */
  ink: "#e8edf6",      /* Texto principal */
  sub: "#8b98b0",      /* Texto secundário */
  faint: "#5b6880",    /* Textos apagados / desativados */
  online: "#34d399",   /* Verde */
  offline: "#f43f5e",  /* Vermelho */
  erro: "#f59e0b",     /* Laranja */
  accent: "#38bdf8",   /* Azul destaque */
  accentSoft: "rgba(56,189,248,0.12)",
};

const statusMeta = {
  online: { label: "Online", cor: COR.online, Icon: Wifi },
  offline: { label: "Offline", cor: COR.offline, Icon: WifiOff },
  erro: { label: "Erro SNMP", cor: COR.erro, Icon: AlertTriangle },
};

const nf = (n) => (n == null ? "—" : n.toLocaleString("pt-BR"));

/* ============================================================
   COMPONENTES AUXILIARES
   ============================================================ */
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
  const num = Number(nivel);
  const cor = num <= 15 ? COR.offline : num <= 35 ? COR.erro : COR.online;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 rounded-full" style={{ width: 70, background: COR.panelAlt, border: `1px solid ${COR.border}` }}>
        <div className="h-full rounded-full" style={{ width: `${num}%`, background: cor }} />
      </div>
      <span className="mono text-xs font-semibold" style={{ color: cor, minWidth: 30 }}>{num}%</span>
    </div>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState("monitoramento");
  const [busca, setBusca] = useState("");
  const [setorSel, setSetorSel] = useState("todos");
  const [statusSel, setStatusSel] = useState("todos");
  const [expandido, setExpandido] = useState(null);

  // Consumindo seus Hooks de dados reais da Planilha
  const { impressoras = [], estoque = [], repor = [], carregando, erro, recarregar } = useDashboard({ intervalo: 60000 });
  const { dados: movimentacoes = [], carregando: movCarregando, erro: movErro, recarregar: movRecarregar } = useMovimentacoes({ intervalo: 30000 });

  // Lista dinâmica de setores para o Filtro
  const setores = useMemo(() => {
    return ["todos", ...Array.from(new Set(impressoras.map((p) => p.setor))).filter(Boolean).sort()];
  }, [impressoras]);

  // Filtro de impressoras unificado
  const filtradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return impressoras.filter((p) => {
      if (setorSel !== "todos" && p.setor !== setorSel) return false;
      
      const statusFinal = p.falha ? "erro" : p.online ? "online" : "offline";
      if (statusSel !== "todos" && statusFinal !== statusSel) return false;
      
      if (!term) return true;
      return (
        (p.setor || "").toLowerCase().includes(term) ||
        (p.ip || "").toLowerCase().includes(term) ||
        `${p.marca} ${p.modelo}`.toLowerCase().includes(term) ||
        (p.toner || "").toLowerCase().includes(term)
      );
    });
  }, [impressoras, busca, setorSel, statusSel]);

  // KPIs dinâmicos calculados a partir dos dados em tempo real
  const kpis = useMemo(() => {
    const total = impressoras.length;
    const online = impressoras.filter((p) => p.online && !p.falha).length;
    const offline = impressoras.filter((p) => !p.online).length;
    const erroCount = impressoras.filter((p) => p.falha).length;
    const totalPag = impressoras.reduce((s, p) => s + (p.contador || 0), 0);
    return { total, online, offline, erro: erroCount, totalPag };
  }, [impressoras]);

  // Dados estruturados para a aba de análise do Toner
  const analiseToner = useMemo(() => {
    const porToner = new Map();
    estoque.forEach((e) => {
      if (!porToner.has(e.modelo_toner)) {
        porToner.set(e.modelo_toner, { toner: e, impressoras: [], saldo: Number(e.estoque_atual || 0) });
      }
    });
    impressoras.forEach((p) => {
      if (p.toner && porToner.has(p.toner)) {
        porToner.get(p.toner).impressoras.push(p);
      }
    });
    return Array.from(porToner.values()).sort((a, b) => b.impressoras.length - a.impressoras.length);
  }, [impressoras, estoque]);

  const temFiltro = setorSel !== "todos" || statusSel !== "todos" || busca.trim() !== "";
  const mostraFiltros = ["monitoramento", "contadores", "mapeamento", "vida-toner"].includes(abaAtiva);

  if (carregando || movCarregando) return <div className="flex h-screen items-center justify-center text-lg font-semibold" style={{ background: COR.bg, color: COR.ink }}>Carregando dados estruturados...</div>;
  if (erro || movErro) return <div className="flex h-screen items-center justify-center text-lg font-semibold" style={{ background: COR.bg, color: COR.offline }}>Erro na sincronização: {erro || movErro}</div>;

  return (
    <div style={{ background: COR.bg, color: COR.ink, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes ping { 75%,100% { transform: scale(2.2); opacity: 0; } }
        .row-hover:hover { background: ${COR.panelAlt} !important; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${COR.border}; border-radius: 6px; }
        .mono { font-family: 'JetBrains Mono','SF Mono',ui-monospace,monospace; }
        select option { background: ${COR.panel} !important; color: ${COR.ink}; }
      `}</style>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {/* HEADER */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 46, height: 46, background: COR.accentSoft, color: COR.accent, border: `1px solid ${COR.border}` }}>
              <Printer size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestão de Impressoras & Toner · UNIFEB TI</h1>
              <p className="text-xs" style={{ color: COR.sub }}>Leitura SNMP ativo · Atualizado em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { recarregar(); movRecarregar(); }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }}>
              <RefreshCw size={14} /> Atualizar Planilha
            </button>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
              <Dot cor={COR.online} pulse /><span className="text-xs font-medium" style={{ color: COR.sub }}>Coleta ativa</span>
            </div>
          </div>
        </header>

        {/* CONTADORES SUPERIORES (KPIs) */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {["estoque", "movimentacoes"].includes(abaAtiva) ? (
            <>
              <KPI Icon={Package} valor={estoque.reduce((s, e) => s + Number(e.estoque_atual || 0), 0)} label="Toners em Estoque" cor={COR.accent} />
              <KPI Icon={PackageX} valor={repor.length} label="Modelos p/ Repor" cor={COR.offline} />
              <KPI Icon={LayoutGrid} valor={estoque.length} label="Modelos Cadastrados" cor="#a78bfa" />
              <KPI Icon={ArrowDownCircle} valor={movimentacoes.filter(m => m.tipo?.toLowerCase().includes("retirada") || m.tipo?.toLowerCase().includes("saída")).length} label="Total de Retiradas" cor={COR.erro} />
              <KPI Icon={ArrowUpCircle} valor={movimentacoes.filter(m => m.tipo?.toLowerCase().includes("entrada") || m.tipo?.toLowerCase().includes("devolução")).length} label="Total de Entradas" cor={COR.online} />
            </>
          ) : (
            <>
              <KPI Icon={LayoutGrid} valor={kpis.total} label="Impressoras" cor={COR.accent} />
              <KPI Icon={Wifi} valor={kpis.online} label="Online" cor={COR.online} />
              <KPI Icon={WifiOff} valor={kpis.offline} label="Offline" cor={COR.offline} />
              <KPI Icon={AlertTriangle} valor={kpis.erro} label="Com Erro" cor={COR.erro} />
              <KPI Icon={Activity} valor={nf(kpis.totalPag)} label="Páginas (Soma)" cor="#a78bfa" />
            </>
          )}
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="mb-4 flex flex-wrap gap-1 rounded-xl p-1" style={{ background: COR.panel, border: `1px solid ${COR.border}`, width: "fit-content" }}>
          {[
            { id: "monitoramento", label: "Monitoramento", Icon: Activity },
            { id: "contadores", label: "Contadores Diários", Icon: CalendarDays },
            { id: "mapeamento", label: "Mapeamento", Icon: Link2 },
            { id: "estoque", label: "Estoque", Icon: Package },
            { id: "vida-toner", label: "Vida do Toner", Icon: Droplet },
            { id: "movimentacoes", label: "Movimentações", Icon: Package },
          ].map((t) => {
            const ativa = abaAtiva === t.id;
            return (
              <button key={t.id} onClick={() => setAbaAtiva(t.id)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: ativa ? COR.accentSoft : "transparent", color: ativa ? COR.accent : COR.sub, border: `1px solid ${ativa ? COR.border : "transparent"}` }}>
                <t.Icon size={16} strokeWidth={2.2} />{t.label}
              </button>
            );
          })}
        </div>

        {/* BARRA DE FILTROS */}
        {mostraFiltros && (
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
                {setores.map((s) => <option key={s} value={s}>{s === "todos" ? "Todos os setores" : s}</option>)}
              </select>
            </div>
            {abaAtiva === "monitoramento" && (
              <select value={statusSel} onChange={(e) => setStatusSel(e.target.value)} className="rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }}>
                <option value="todos">Todos os status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="erro">Erro SNMP</option>
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

        {/* CONTEÚDO DAS ABAS */}
        
        {/* ABA: MONITORAMENTO */}
        {abaAtiva === "monitoramento" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["", "Setor", "IP", "Marca / Modelo", "Série", "Contador", "Status"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => {
                  const statusFinal = p.falha ? "erro" : p.online ? "online" : "offline";
                  const meta = statusMeta[statusFinal];
                  return (
                    <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><Dot cor={meta.cor} pulse={p.online && !p.falha} /></td>
                      <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.setor}</td>
                      <td className="mono px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.ip}</td>
                      <td className="px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>
                        <span style={{ color: COR.ink }}>{p.marca}</span> <span className="mono text-xs">{p.modelo}</span>
                      </td>
                      <td className="mono px-3 py-3 text-xs" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.serie || "—"}</td>
                      <td className="mono px-3 py-3 font-semibold" style={{ color: p.contador ? COR.ink : COR.faint, borderBottom: `1px solid ${COR.border}` }}>{nf(p.contador)}</td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: meta.cor, background: `${meta.cor}1f`, border: `1px solid ${meta.cor}44` }}>
                            <meta.Icon size={13} strokeWidth={2.4} />{meta.label}
                          </span>
                          {p.falha && <span className="text-[11px] block mt-1" style={{ color: COR.erro }}>{p.falha}</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: CONTADORES DIÁRIOS */}
        {abaAtiva === "contadores" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, minWidth: 200 }}>Impressora</th>
                  {(impressoras[0]?.datas || []).map((d, idx) => (
                    <th key={idx} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>{d}</th>
                  ))}
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => (
                  <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                    <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                      <div className="font-medium" style={{ color: COR.ink }}>{p.setor}</div>
                      <div className="mono text-xs" style={{ color: COR.faint }}>{p.ip}</div>
                    </td>
                    {(p.contadores || []).map((valor, idx) => {
                      let delta = null;
                      if (valor && idx > 0 && p.contadores[idx - 1]) {
                        delta = Math.max(0, valor - p.contadores[idx - 1]);
                      }
                      return (
                        <td key={idx} className="px-3 py-3 text-right" style={{ borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>
                          <div className="mono font-semibold" style={{ color: COR.ink }}>{valor ? nf(valor) : "—"}</div>
                          {delta !== null && <div className="mono text-xs" style={{ color: COR.online }}>+{nf(delta)}</div>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right" style={{ borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>
                      <Dot cor={p.falha ? COR.erro : p.online ? COR.online : COR.offline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: MAPEAMENTO */}
        {abaAtiva === "mapeamento" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Setor", "Marca / Modelo", "Número de Série", "Toner Compatível"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => (
                  <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                    <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.setor}</td>
                    <td className="px-3 py-3" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.marca} <strong>{p.modelo}</strong></td>
                    <td className="mono px-3 py-3 text-xs" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.serie || "—"}</td>
                    <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                      <span className="mono rounded px-2 py-0.5 text-xs font-bold" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{p.toner || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: ESTOQUE */}
        {abaAtiva === "estoque" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Fabricante", "Modelo Toner", "Estoque Atual", "Mínimo Estipulado", "Status"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estoque.map((e, i) => {
                  const precisa = Number(e.estoque_atual) <= Number(e.minimo_estipulado);
                  const corStatus = precisa ? COR.offline : COR.online;
                  return (
                    <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{e.fabricante}</td>
                      <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{e.modelo_toner}</td>
                      <td className="mono px-3 py-3 font-bold text-base" style={{ color: precisa ? COR.offline : COR.ink, borderBottom: `1px solid ${COR.border}` }}>{e.estoque_atual}</td>
                      <td className="mono px-3 py-3" style={{ color: COR.faint, borderBottom: `1px solid ${COR.border}` }}>{e.minimo_estipulado}</td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: corStatus, background: `${corStatus}1f`, border: `1px solid ${corStatus}44` }}>
                          {precisa ? "🔴 REPOR" : "✓ OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: VIDA DO TONER (CRITICIDADE) */}
        {abaAtiva === "vida-toner" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Modelo Toner", "Saldo em Estoque", "Impressoras Associadas", "Nível / Criticidade"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analiseToner.map((item, i) => {
                  const impCount = item.impressoras.length;
                  const critico = item.saldo <= 1 && impCount >= 5;
                  const aberto = expandido === i;
                  return (
                    <React.Fragment key={i}>
                      <tr className="row-hover transition-colors" style={{ background: COR.panel }}>
                        <td className="px-3 py-3 font-bold" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{item.toner?.modelo_toner}</td>
                        <td className="mono px-3 py-3 font-semibold" style={{ color: item.saldo <= 2 ? COR.offline : COR.ink, borderBottom: `1px solid ${COR.border}` }}>{item.saldo} un.</td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                          {impCount > 0 ? (
                            <button onClick={() => setExpandido(aberto ? null : i)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: COR.accent }}>
                              {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{impCount} ativa{impCount > 1 ? "s" : ""}
                            </button>
                          ) : <span className="text-xs" style={{ color: COR.faint }}>Nenhuma</span>}
                        </td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" 
                            style={{ 
                              color: critico ? COR.offline : impCount >= 5 ? COR.erro : COR.online, 
                              background: critico ? `${COR.offline}1f` : impCount >= 5 ? `${COR.erro}1f` : `${COR.online}1f` 
                            }}>
                            {critico ? "🔴 CRÍTICO" : impCount >= 5 ? "🟡 DEMANDA ALTA" : "🟢 BAIXA CRITICIDADE"}
                          </span>
                        </td>
                      </tr>
                      {aberto && (
                        <tr style={{ background: COR.panelAlt }}>
                          <td colSpan={4} className="px-4 py-2" style={{ borderBottom: `1px solid ${COR.border}` }}>
                            <div className="flex flex-wrap gap-1.5">
                              {item.impressoras.map((p, pIdx) => (
                                <span key={pIdx} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.sub }}>
                                  <Dot cor={p.falha ? COR.erro : p.online ? COR.online : COR.offline} /> {p.setor}
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
        )}

        {/* ABA: MOVIMENTAÇÕES */}
        {abaAtiva === "movimentacoes" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Data / Hora", "Operação", "Toner", "Qtd", "Responsável"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m, i) => {
                  const IsRetirada = m.tipo?.toLowerCase().includes("retirada") || m.tipo?.toLowerCase().includes("saída");
                  return (
                    <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="mono px-3 py-3 text-xs" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{m.data}</td>
                      <td className="px-3 py-3 font-semibold" style={{ color: IsRetirada ? COR.offline : COR.online, borderBottom: `1px solid ${COR.border}` }}>
                        <span className="flex items-center gap-1">
                          {IsRetirada ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />} {m.tipo}
                        </span>
                      </td>
                      <td className="mono px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{m.toner}</td>
                      <td className="mono px-3 py-3 font-bold" style={{ color: IsRetirada ? COR.offline : COR.online, borderBottom: `1px solid ${COR.border}` }}>
                        {IsRetirada ? "-" : "+"}{m.quantidade}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{m.responsavel || "—"}</td>
                    </tr>
                  );
                })}
                {movimentacoes.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center" style={{ color: COR.faint }}>Nenhum registro de movimentação via QR Code encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}import React, { useState, useMemo } from "react";
import { useDashboard, useMovimentacoes } from './services/sheetsApi';
import {
  Search, Printer, Wifi, WifiOff, AlertTriangle, Activity,
  LayoutGrid, CalendarDays, Filter, X, Package,
  ArrowDownCircle, ArrowUpCircle, PackageX, Droplet, Clock, 
  ChevronDown, ChevronRight, RefreshCw, Link2
} from "lucide-react";

/* ============================================================
   CONFIGURAÇÃO DE CORES (DARK MODE DO DASHBOARD_1)
   ============================================================ */
const COR = {
  bg: "#0f172a",       /* Cor de fundo principal solicitada */
  panel: "#161d2b",    /* Cartões e painéis */
  panelAlt: "#1b2434", /* Cabeçalhos e detalhes */
  border: "#26324a",   /* Borda sutil */
  ink: "#e8edf6",      /* Texto principal */
  sub: "#8b98b0",      /* Texto secundário */
  faint: "#5b6880",    /* Textos apagados / desativados */
  online: "#34d399",   /* Verde */
  offline: "#f43f5e",  /* Vermelho */
  erro: "#f59e0b",     /* Laranja */
  accent: "#38bdf8",   /* Azul destaque */
  accentSoft: "rgba(56,189,248,0.12)",
};

const statusMeta = {
  online: { label: "Online", cor: COR.online, Icon: Wifi },
  offline: { label: "Offline", cor: COR.offline, Icon: WifiOff },
  erro: { label: "Erro SNMP", cor: COR.erro, Icon: AlertTriangle },
};

const nf = (n) => (n == null ? "—" : n.toLocaleString("pt-BR"));

/* ============================================================
   COMPONENTES AUXILIARES
   ============================================================ */
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
  const num = Number(nivel);
  const cor = num <= 15 ? COR.offline : num <= 35 ? COR.erro : COR.online;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 rounded-full" style={{ width: 70, background: COR.panelAlt, border: `1px solid ${COR.border}` }}>
        <div className="h-full rounded-full" style={{ width: `${num}%`, background: cor }} />
      </div>
      <span className="mono text-xs font-semibold" style={{ color: cor, minWidth: 30 }}>{num}%</span>
    </div>
  );
}

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState("monitoramento");
  const [busca, setBusca] = useState("");
  const [setorSel, setSetorSel] = useState("todos");
  const [statusSel, setStatusSel] = useState("todos");
  const [expandido, setExpandido] = useState(null);

  // Consumindo seus Hooks de dados reais da Planilha
  const { impressoras = [], estoque = [], repor = [], carregando, erro, recarregar } = useDashboard({ intervalo: 60000 });
  const { dados: movimentacoes = [], carregando: movCarregando, erro: movErro, recarregar: movRecarregar } = useMovimentacoes({ intervalo: 30000 });

  // Lista dinâmica de setores para o Filtro
  const setores = useMemo(() => {
    return ["todos", ...Array.from(new Set(impressoras.map((p) => p.setor))).filter(Boolean).sort()];
  }, [impressoras]);

  // Filtro de impressoras unificado
  const filtradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return impressoras.filter((p) => {
      if (setorSel !== "todos" && p.setor !== setorSel) return false;
      
      const statusFinal = p.falha ? "erro" : p.online ? "online" : "offline";
      if (statusSel !== "todos" && statusFinal !== statusSel) return false;
      
      if (!term) return true;
      return (
        (p.setor || "").toLowerCase().includes(term) ||
        (p.ip || "").toLowerCase().includes(term) ||
        `${p.marca} ${p.modelo}`.toLowerCase().includes(term) ||
        (p.toner || "").toLowerCase().includes(term)
      );
    });
  }, [impressoras, busca, setorSel, statusSel]);

  // KPIs dinâmicos calculados a partir dos dados em tempo real
  const kpis = useMemo(() => {
    const total = impressoras.length;
    const online = impressoras.filter((p) => p.online && !p.falha).length;
    const offline = impressoras.filter((p) => !p.online).length;
    const erroCount = impressoras.filter((p) => p.falha).length;
    const totalPag = impressoras.reduce((s, p) => s + (p.contador || 0), 0);
    return { total, online, offline, erro: erroCount, totalPag };
  }, [impressoras]);

  // Dados estruturados para a aba de análise do Toner
  const analiseToner = useMemo(() => {
    const porToner = new Map();
    estoque.forEach((e) => {
      if (!porToner.has(e.modelo_toner)) {
        porToner.set(e.modelo_toner, { toner: e, impressoras: [], saldo: Number(e.estoque_atual || 0) });
      }
    });
    impressoras.forEach((p) => {
      if (p.toner && porToner.has(p.toner)) {
        porToner.get(p.toner).impressoras.push(p);
      }
    });
    return Array.from(porToner.values()).sort((a, b) => b.impressoras.length - a.impressoras.length);
  }, [impressoras, estoque]);

  const temFiltro = setorSel !== "todos" || statusSel !== "todos" || busca.trim() !== "";
  const mostraFiltros = ["monitoramento", "contadores", "mapeamento", "vida-toner"].includes(abaAtiva);

  if (carregando || movCarregando) return <div className="flex h-screen items-center justify-center text-lg font-semibold" style={{ background: COR.bg, color: COR.ink }}>Carregando dados estruturados...</div>;
  if (erro || movErro) return <div className="flex h-screen items-center justify-center text-lg font-semibold" style={{ background: COR.bg, color: COR.offline }}>Erro na sincronização: {erro || movErro}</div>;

  return (
    <div style={{ background: COR.bg, color: COR.ink, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes ping { 75%,100% { transform: scale(2.2); opacity: 0; } }
        .row-hover:hover { background: ${COR.panelAlt} !important; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${COR.border}; border-radius: 6px; }
        .mono { font-family: 'JetBrains Mono','SF Mono',ui-monospace,monospace; }
        select option { background: ${COR.panel} !important; color: ${COR.ink}; }
      `}</style>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {/* HEADER */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 46, height: 46, background: COR.accentSoft, color: COR.accent, border: `1px solid ${COR.border}` }}>
              <Printer size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestão de Impressoras & Toner · UNIFEB TI</h1>
              <p className="text-xs" style={{ color: COR.sub }}>Leitura SNMP ativo · Atualizado em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { recarregar(); movRecarregar(); }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }}>
              <RefreshCw size={14} /> Atualizar Planilha
            </button>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
              <Dot cor={COR.online} pulse /><span className="text-xs font-medium" style={{ color: COR.sub }}>Coleta ativa</span>
            </div>
          </div>
        </header>

        {/* CONTADORES SUPERIORES (KPIs) */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {["estoque", "movimentacoes"].includes(abaAtiva) ? (
            <>
              <KPI Icon={Package} valor={estoque.reduce((s, e) => s + Number(e.estoque_atual || 0), 0)} label="Toners em Estoque" cor={COR.accent} />
              <KPI Icon={PackageX} valor={repor.length} label="Modelos p/ Repor" cor={COR.offline} />
              <KPI Icon={LayoutGrid} valor={estoque.length} label="Modelos Cadastrados" cor="#a78bfa" />
              <KPI Icon={ArrowDownCircle} valor={movimentacoes.filter(m => m.tipo?.toLowerCase().includes("retirada") || m.tipo?.toLowerCase().includes("saída")).length} label="Total de Retiradas" cor={COR.erro} />
              <KPI Icon={ArrowUpCircle} valor={movimentacoes.filter(m => m.tipo?.toLowerCase().includes("entrada") || m.tipo?.toLowerCase().includes("devolução")).length} label="Total de Entradas" cor={COR.online} />
            </>
          ) : (
            <>
              <KPI Icon={LayoutGrid} valor={kpis.total} label="Impressoras" cor={COR.accent} />
              <KPI Icon={Wifi} valor={kpis.online} label="Online" cor={COR.online} />
              <KPI Icon={WifiOff} valor={kpis.offline} label="Offline" cor={COR.offline} />
              <KPI Icon={AlertTriangle} valor={kpis.erro} label="Com Erro" cor={COR.erro} />
              <KPI Icon={Activity} valor={nf(kpis.totalPag)} label="Páginas (Soma)" cor="#a78bfa" />
            </>
          )}
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="mb-4 flex flex-wrap gap-1 rounded-xl p-1" style={{ background: COR.panel, border: `1px solid ${COR.border}`, width: "fit-content" }}>
          {[
            { id: "monitoramento", label: "Monitoramento", Icon: Activity },
            { id: "contadores", label: "Contadores Diários", Icon: CalendarDays },
            { id: "mapeamento", label: "Mapeamento", Icon: Link2 },
            { id: "estoque", label: "Estoque", Icon: Package },
            { id: "vida-toner", label: "Vida do Toner", Icon: Droplet },
            { id: "movimentacoes", label: "Movimentações", Icon: Package },
          ].map((t) => {
            const ativa = abaAtiva === t.id;
            return (
              <button key={t.id} onClick={() => setAbaAtiva(t.id)}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                style={{ background: ativa ? COR.accentSoft : "transparent", color: ativa ? COR.accent : COR.sub, border: `1px solid ${ativa ? COR.border : "transparent"}` }}>
                <t.Icon size={16} strokeWidth={2.2} />{t.label}
              </button>
            );
          })}
        </div>

        {/* BARRA DE FILTROS */}
        {mostraFiltros && (
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
                {setores.map((s) => <option key={s} value={s}>{s === "todos" ? "Todos os setores" : s}</option>)}
              </select>
            </div>
            {abaAtiva === "monitoramento" && (
              <select value={statusSel} onChange={(e) => setStatusSel(e.target.value)} className="rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }}>
                <option value="todos">Todos os status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="erro">Erro SNMP</option>
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

        {/* CONTEÚDO DAS ABAS */}
        
        {/* ABA: MONITORAMENTO */}
        {abaAtiva === "monitoramento" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["", "Setor", "IP", "Marca / Modelo", "Série", "Contador", "Status"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => {
                  const statusFinal = p.falha ? "erro" : p.online ? "online" : "offline";
                  const meta = statusMeta[statusFinal];
                  return (
                    <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><Dot cor={meta.cor} pulse={p.online && !p.falha} /></td>
                      <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.setor}</td>
                      <td className="mono px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.ip}</td>
                      <td className="px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>
                        <span style={{ color: COR.ink }}>{p.marca}</span> <span className="mono text-xs">{p.modelo}</span>
                      </td>
                      <td className="mono px-3 py-3 text-xs" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.serie || "—"}</td>
                      <td className="mono px-3 py-3 font-semibold" style={{ color: p.contador ? COR.ink : COR.faint, borderBottom: `1px solid ${COR.border}` }}>{nf(p.contador)}</td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: meta.cor, background: `${meta.cor}1f`, border: `1px solid ${meta.cor}44` }}>
                            <meta.Icon size={13} strokeWidth={2.4} />{meta.label}
                          </span>
                          {p.falha && <span className="text-[11px] block mt-1" style={{ color: COR.erro }}>{p.falha}</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: CONTADORES DIÁRIOS */}
        {abaAtiva === "contadores" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, minWidth: 200 }}>Impressora</th>
                  {(impressoras[0]?.datas || []).map((d, idx) => (
                    <th key={idx} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>{d}</th>
                  ))}
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => (
                  <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                    <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                      <div className="font-medium" style={{ color: COR.ink }}>{p.setor}</div>
                      <div className="mono text-xs" style={{ color: COR.faint }}>{p.ip}</div>
                    </td>
                    {(p.contadores || []).map((valor, idx) => {
                      let delta = null;
                      if (valor && idx > 0 && p.contadores[idx - 1]) {
                        delta = Math.max(0, valor - p.contadores[idx - 1]);
                      }
                      return (
                        <td key={idx} className="px-3 py-3 text-right" style={{ borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>
                          <div className="mono font-semibold" style={{ color: COR.ink }}>{valor ? nf(valor) : "—"}</div>
                          {delta !== null && <div className="mono text-xs" style={{ color: COR.online }}>+{nf(delta)}</div>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right" style={{ borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}` }}>
                      <Dot cor={p.falha ? COR.erro : p.online ? COR.online : COR.offline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: MAPEAMENTO */}
        {abaAtiva === "mapeamento" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Setor", "Marca / Modelo", "Número de Série", "Toner Compatível"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((p, i) => (
                  <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                    <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.setor}</td>
                    <td className="px-3 py-3" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.marca} <strong>{p.modelo}</strong></td>
                    <td className="mono px-3 py-3 text-xs" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.serie || "—"}</td>
                    <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                      <span className="mono rounded px-2 py-0.5 text-xs font-bold" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{p.toner || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: ESTOQUE */}
        {abaAtiva === "estoque" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Fabricante", "Modelo Toner", "Estoque Atual", "Mínimo Estipulado", "Status"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estoque.map((e, i) => {
                  const precisa = Number(e.estoque_atual) <= Number(e.minimo_estipulado);
                  const corStatus = precisa ? COR.offline : COR.online;
                  return (
                    <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{e.fabricante}</td>
                      <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{e.modelo_toner}</td>
                      <td className="mono px-3 py-3 font-bold text-base" style={{ color: precisa ? COR.offline : COR.ink, borderBottom: `1px solid ${COR.border}` }}>{e.estoque_atual}</td>
                      <td className="mono px-3 py-3" style={{ color: COR.faint, borderBottom: `1px solid ${COR.border}` }}>{e.minimo_estipulado}</td>
                      <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: corStatus, background: `${corStatus}1f`, border: `1px solid ${corStatus}44` }}>
                          {precisa ? "🔴 REPOR" : "✓ OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ABA: VIDA DO TONER (CRITICIDADE) */}
        {abaAtiva === "vida-toner" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Modelo Toner", "Saldo em Estoque", "Impressoras Associadas", "Nível / Criticidade"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analiseToner.map((item, i) => {
                  const impCount = item.impressoras.length;
                  const critico = item.saldo <= 1 && impCount >= 5;
                  const aberto = expandido === i;
                  return (
                    <React.Fragment key={i}>
                      <tr className="row-hover transition-colors" style={{ background: COR.panel }}>
                        <td className="px-3 py-3 font-bold" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{item.toner?.modelo_toner}</td>
                        <td className="mono px-3 py-3 font-semibold" style={{ color: item.saldo <= 2 ? COR.offline : COR.ink, borderBottom: `1px solid ${COR.border}` }}>{item.saldo} un.</td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                          {impCount > 0 ? (
                            <button onClick={() => setExpandido(aberto ? null : i)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: COR.accent }}>
                              {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{impCount} ativa{impCount > 1 ? "s" : ""}
                            </button>
                          ) : <span className="text-xs" style={{ color: COR.faint }}>Nenhuma</span>}
                        </td>
                        <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" 
                            style={{ 
                              color: critico ? COR.offline : impCount >= 5 ? COR.erro : COR.online, 
                              background: critico ? `${COR.offline}1f` : impCount >= 5 ? `${COR.erro}1f` : `${COR.online}1f` 
                            }}>
                            {critico ? "🔴 CRÍTICO" : impCount >= 5 ? "🟡 DEMANDA ALTA" : "🟢 BAIXA CRITICIDADE"}
                          </span>
                        </td>
                      </tr>
                      {aberto && (
                        <tr style={{ background: COR.panelAlt }}>
                          <td colSpan={4} className="px-4 py-2" style={{ borderBottom: `1px solid ${COR.border}` }}>
                            <div className="flex flex-wrap gap-1.5">
                              {item.impressoras.map((p, pIdx) => (
                                <span key={pIdx} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.sub }}>
                                  <Dot cor={p.falha ? COR.erro : p.online ? COR.online : COR.offline} /> {p.setor}
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
        )}

        {/* ABA: MOVIMENTAÇÕES */}
        {abaAtiva === "movimentacoes" && (
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: COR.panelAlt }}>
                  {["Data / Hora", "Operação", "Toner", "Qtd", "Responsável"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m, i) => {
                  const IsRetirada = m.tipo?.toLowerCase().includes("retirada") || m.tipo?.toLowerCase().includes("saída");
                  return (
                    <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                      <td className="mono px-3 py-3 text-xs" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{m.data}</td>
                      <td className="px-3 py-3 font-semibold" style={{ color: IsRetirada ? COR.offline : COR.online, borderBottom: `1px solid ${COR.border}` }}>
                        <span className="flex items-center gap-1">
                          {IsRetirada ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />} {m.tipo}
                        </span>
                      </td>
                      <td className="mono px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{m.toner}</td>
                      <td className="mono px-3 py-3 font-bold" style={{ color: IsRetirada ? COR.offline : COR.online, borderBottom: `1px solid ${COR.border}` }}>
                        {IsRetirada ? "-" : "+"}{m.quantidade}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{m.responsavel || "—"}</td>
                    </tr>
                  );
                })}
                {movimentacoes.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center" style={{ color: COR.faint }}>Nenhum registro de movimentação via QR Code encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}