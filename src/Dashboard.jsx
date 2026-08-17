import React, { useState, useMemo } from "react";
import {
  Search, Printer, Wifi, WifiOff, AlertTriangle, Activity,
  LayoutGrid, CalendarDays, TrendingUp, Filter, X, Package,
  ArrowDownCircle, ArrowUpCircle, PackageX, Droplet, RefreshCw,
  ChevronDown, ChevronRight, Link2, Clock,
} from "lucide-react";
import { useDashboard, useMovimentacoes } from "./services/sheetsApi";

/* ============================================================
   PALETA
   ============================================================ */
const COR = {
  bg: "#0e1420", panel: "#161d2b", panelAlt: "#1b2434", border: "#26324a",
  ink: "#e8edf6", sub: "#8b98b0", faint: "#5b6880",
  online: "#34d399", offline: "#f43f5e", erro: "#f59e0b",
  accent: "#38bdf8", accentSoft: "rgba(56,189,248,0.12)",
};

const statusMeta = {
  online: { label: "Online", cor: COR.online, Icon: Wifi },
  offline: { label: "Offline", cor: COR.offline, Icon: WifiOff },
  erro: { label: "Problema", cor: COR.erro, Icon: AlertTriangle },
};

const nf = (n) => (n == null || n === "" ? "—" : Number(n).toLocaleString("pt-BR"));

/* deriva o status a partir dos campos reais da planilha.
   p.erro = problema específico do SNMP (sem papel, atolada...)
   p.online = coluna STATUS que o leitor.py grava */
const statusDe = (p) => {
  if (p.erro) return "erro";       // online, mas com problema reportado
  if (p.online) return "online";
  return "offline";
};

/* ============================================================
   COMPONENTES BASE
   ============================================================ */
function StatusBadge({ status, motivo }) {
  const m = statusMeta[status];
  const Icon = m.Icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: m.cor, background: `${m.cor}1f`, border: `1px solid ${m.cor}44` }}
      title={motivo || m.label}>
      <Icon size={13} strokeWidth={2.4} />{motivo || m.label}
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
  if (nivel == null || nivel === "") return <span style={{ color: COR.faint }}>—</span>;
  const n = Number(nivel);
  const cor = n <= 15 ? COR.offline : n <= 35 ? COR.erro : COR.online;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 rounded-full overflow-hidden" style={{ width: 70, background: COR.panelAlt, border: `1px solid ${COR.border}` }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, n))}%`, background: cor, transition: "width .3s" }} />
      </div>
      <span className="mono text-xs font-semibold" style={{ color: cor, minWidth: 30 }}>{n}%</span>
    </div>
  );
}

function Aviso({ children }) {
  return <div className="rounded-xl px-4 py-10 text-center text-sm" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.faint }}>{children}</div>;
}

function Th({ children, align = "left", ...rest }) {
  return (
    <th className={`px-3 py-3 text-${align} text-xs font-semibold uppercase tracking-wide`}
      style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, ...rest.style }}>{children}</th>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
export default function Dashboard() {
  const [aba, setAba] = useState("monitoramento");
  const [busca, setBusca] = useState("");
  const [setorSel, setSetorSel] = useState("todos");
  const [statusSel, setStatusSel] = useState("todos");
  const [soRepor, setSoRepor] = useState(false);
  const [expandido, setExpandido] = useState(null);

  const { impressoras = [], estoque = [], repor = [], comProblema = [], carregando, erro, recarregar } = useDashboard({ intervalo: 60000 });
  const { dados: movimentacoes = [], carregando: movCarregando, erro: movErro, recarregar: movRecarregar } = useMovimentacoes({ intervalo: 30000 });

  const setores = useMemo(
    () => ["todos", ...Array.from(new Set(impressoras.map((p) => p.setor).filter(Boolean))).sort()],
    [impressoras]
  );

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return impressoras.filter((p) => {
      if (setorSel !== "todos" && p.setor !== setorSel) return false;
      if (statusSel !== "todos" && statusDe(p) !== statusSel) return false;
      if (!t) return true;
      return (p.setor || "").toLowerCase().includes(t)
        || (p.ip || "").toLowerCase().includes(t)
        || `${p.marca || ""} ${p.modelo || ""}`.toLowerCase().includes(t)
        || (p.toner || "").toLowerCase().includes(t);
    });
  }, [impressoras, busca, setorSel, statusSel]);

  const kpis = useMemo(() => ({
    total: impressoras.length,
    online: impressoras.filter((p) => p.online).length,
    offline: impressoras.filter((p) => !p.online && !p.erro).length,
    erro: impressoras.filter((p) => p.erro).length,
    totalPag: impressoras.reduce((s, p) => s + (Number(p.contador) || 0), 0),
  }), [impressoras]);

  const estoqueKpi = useMemo(() => ({
    totalUnid: estoque.reduce((s, e) => s + (Number(e.estoque_atual) || 0), 0),
    repor: estoque.filter((e) => Number(e.estoque_atual) <= Number(e.minimo_estipulado)).length,
    modelos: estoque.length,
  }), [estoque]);

  /* impressoras que usam determinado modelo de toner */
  const impressorasPorToner = (modelo) => impressoras.filter((p) => p.toner === modelo);

  /* análise de criticidade por toner (mesma lógica da versão anterior) */
  const analiseToner = useMemo(() => {
    return estoque.map((e) => {
      const usam = impressorasPorToner(e.modelo_toner);
      const saldo = Number(e.estoque_atual) || 0;
      return { toner: e, saldo, usam, critico: saldo <= 1 && usam.length >= 5 };
    }).sort((a, b) => b.usam.length - a.usam.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estoque, impressoras]);

  const vidaKpi = useMemo(() => ({
    criticos: analiseToner.filter((a) => a.critico).length,
    alto: analiseToner.filter((a) => !a.critico && a.usam.length >= 5).length,
    modelos: analiseToner.length,
  }), [analiseToner]);

  /* impressoras que reportaram nivel de toner via SNMP */
  const comNivel = useMemo(
    () => impressoras.filter((p) => p.nivel != null && p.nivel !== "")
      .sort((a, b) => Number(a.nivel) - Number(b.nivel)),
    [impressoras]
  );

  const nivelKpi = useMemo(() => ({
    monitoradas: comNivel.length,
    criticas: comNivel.filter((p) => Number(p.nivel) <= 15).length,
    atencao: comNivel.filter((p) => Number(p.nivel) > 15 && Number(p.nivel) <= 35).length,
  }), [comNivel]);

  const datas = impressoras[0]?.datas || [];
  const estoqueVis = soRepor
    ? estoque.filter((e) => Number(e.estoque_atual) <= Number(e.minimo_estipulado))
    : estoque;

  const temFiltro = setorSel !== "todos" || statusSel !== "todos" || busca.trim() !== "";
  const filtroImpressoras = ["monitoramento", "contadores", "mapeamento"].includes(aba);
  const carregandoAba = aba === "movimentacoes" ? movCarregando : carregando;
  const erroAba = aba === "movimentacoes" ? movErro : erro;

  return (
    <div style={{ background: COR.bg, color: COR.ink, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes ping { 75%,100% { transform: scale(2.2); opacity: 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .row-hover:hover { background: ${COR.panelAlt} !important; }
        ::-webkit-scrollbar { height: 10px; width: 10px; }
        ::-webkit-scrollbar-thumb { background: ${COR.border}; border-radius: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .mono { font-family: 'JetBrains Mono','SF Mono',ui-monospace,monospace; }
        input::placeholder { color: ${COR.faint}; }
      `}</style>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {/* HEADER */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl" style={{ width: 46, height: 46, background: COR.accentSoft, color: COR.accent, border: `1px solid ${COR.border}` }}>
              <Printer size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestão de Impressoras &amp; Toner · UNIFEB TI</h1>
              <p className="text-xs" style={{ color: COR.sub }}>
                Leitura SNMP · última coleta <span className="mono">{new Date().toLocaleString("pt-BR")}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { recarregar(); movRecarregar(); }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
              style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.sub }}>
              <RefreshCw size={14} style={{ animation: carregando ? "spin 1s linear infinite" : "none" }} /> Atualizar
            </button>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
              <Dot cor={kpis.online > 0 ? COR.online : COR.offline} pulse />
              <span className="text-xs font-medium" style={{ color: COR.sub }}>Coleta ativa</span>
            </div>
          </div>
        </header>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {aba === "movimentacoes" || aba === "estoque" ? (
            <>
              <KPI Icon={Package} valor={estoqueKpi.totalUnid} label="Toners em estoque" cor={COR.accent} />
              <KPI Icon={PackageX} valor={estoqueKpi.repor} label="Modelos p/ repor" cor={COR.offline} />
              <KPI Icon={LayoutGrid} valor={estoqueKpi.modelos} label="Modelos cadastrados" cor="#a78bfa" />
              <KPI Icon={ArrowDownCircle} valor={movimentacoes.filter((m) => m.tipo === "Retirada").length} label="Retiradas" cor={COR.erro} />
              <KPI Icon={ArrowUpCircle} valor={movimentacoes.filter((m) => m.tipo === "Entrada").length} label="Entradas" cor={COR.online} />
            </>
          ) : aba === "vida" ? (
            <>
              <KPI Icon={Droplet} valor={nivelKpi.monitoradas} label="Com nível SNMP" cor={COR.accent} />
              <KPI Icon={AlertTriangle} valor={nivelKpi.criticas} label="Nível crítico (≤15%)" cor={COR.offline} />
              <KPI Icon={Clock} valor={nivelKpi.atencao} label="Atenção (≤35%)" cor={COR.erro} />
              <KPI Icon={PackageX} valor={vidaKpi.criticos} label="Modelos críticos" cor="#a78bfa" />
              <KPI Icon={Package} valor={estoqueKpi.totalUnid} label="Toners em estoque" cor={COR.online} />
            </>
          ) : (
            <>
              <KPI Icon={LayoutGrid} valor={kpis.total} label="Impressoras" cor={COR.accent} />
              <KPI Icon={Wifi} valor={kpis.online} label="Online" cor={COR.online} />
              <KPI Icon={WifiOff} valor={kpis.offline} label="Offline" cor={COR.offline} />
              <KPI Icon={AlertTriangle} valor={kpis.erro} label="Com problema" cor={COR.erro} />
              <KPI Icon={Activity} valor={nf(kpis.totalPag)} label="Páginas (soma)" cor="#a78bfa" />
            </>
          )}
        </div>

        {/* ABAS */}
        <div className="mb-4 flex flex-wrap gap-1 rounded-xl p-1" style={{ background: COR.panel, border: `1px solid ${COR.border}`, width: "fit-content" }}>
          {[
            { id: "monitoramento", label: "Monitoramento", Icon: Activity },
            { id: "contadores", label: "Contadores Diários", Icon: CalendarDays },
            { id: "mapeamento", label: "Mapeamento", Icon: Link2 },
            { id: "estoque", label: "Estoque", Icon: PackageX },
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

        {/* FILTROS */}
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
            <select value={statusSel} onChange={(e) => setStatusSel(e.target.value)} className="rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }}>
              <option value="todos" style={{ background: COR.panel }}>Todos os status</option>
              <option value="online" style={{ background: COR.panel }}>Online</option>
              <option value="offline" style={{ background: COR.panel }}>Offline</option>
              <option value="erro" style={{ background: COR.panel }}>Erro SNMP</option>
            </select>
            {temFiltro && (
              <button onClick={() => { setBusca(""); setSetorSel("todos"); setStatusSel("todos"); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium" style={{ background: COR.panelAlt, border: `1px solid ${COR.border}`, color: COR.sub }}>
                <X size={14} /> Limpar
              </button>
            )}
          </div>
        )}

        {/* ALERTAS — problemas detectados via SNMP */}
        {!carregando && comProblema.length > 0 && (
          <div className="mb-4 rounded-xl p-4" style={{ background: `${COR.erro}0f`, border: `1px solid ${COR.erro}44` }}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: COR.erro }}>
              <AlertTriangle size={16} />
              {comProblema.length} impressora{comProblema.length > 1 ? "s precisam" : " precisa"} de atenção
            </div>
            <div className="flex flex-wrap gap-2">
              {comProblema.map((p, i) => (
                <button key={i} onClick={() => { setAba("monitoramento"); setBusca(p.setor); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors"
                  style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink }}>
                  <span className="font-medium">{p.setor}</span>
                  <span style={{ color: COR.erro }}>{p.erro}</span>
                  <span className="mono" style={{ color: COR.faint }}>{p.ip}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ESTADOS DE CARGA / ERRO */}
        {carregandoAba ? <Aviso>Carregando dados...</Aviso>
          : erroAba ? (
            <div className="rounded-xl px-4 py-6 text-center text-sm" style={{ background: `${COR.offline}12`, border: `1px solid ${COR.offline}44`, color: COR.offline }}>
              <AlertTriangle size={18} className="mx-auto mb-2" /> Erro: {erroAba}
            </div>
          ) : (
            <>
              {/* MONITORAMENTO */}
              {aba === "monitoramento" && (
                <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
                  <table className="w-full border-collapse text-sm">
                    <thead><tr style={{ background: COR.panelAlt }}>
                      {["", "Setor", "IP", "Marca / Modelo", "Série", "Contador", "Status"].map((h, i) => <Th key={i}>{h}</Th>)}
                    </tr></thead>
                    <tbody>
                      {filtradas.map((p, i) => {
                        const st = statusDe(p);
                        return (
                          <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                            <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><Dot cor={statusMeta[st].cor} pulse={st === "online"} /></td>
                            <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.setor}</td>
                            <td className="mono px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{p.ip || "—"}</td>
                            <td className="px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>
                              <span style={{ color: COR.ink }}>{p.marca}</span> <span className="mono text-xs">{p.modelo}</span>
                            </td>
                            <td className="mono px-3 py-3 text-xs" style={{ color: COR.faint, borderBottom: `1px solid ${COR.border}` }}>{p.serie || "—"}</td>
                            <td className="mono px-3 py-3 font-semibold" style={{ color: p.contador ? COR.ink : COR.faint, borderBottom: `1px solid ${COR.border}`, fontVariantNumeric: "tabular-nums" }}>{nf(p.contador)}</td>
                            <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                              <StatusBadge status={st} motivo={p.erro} />
                              {!p.erro && p.falha && <div className="mt-1 text-xs" style={{ color: COR.faint }}>{p.falha}</div>}
                            </td>
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
                        <th className="sticky left-0 z-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                          style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, background: COR.panelAlt, minWidth: 220 }}>Impressora</th>
                        {datas.map((d, i) => (
                          <th key={i} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide"
                            style={{ color: i === datas.length - 1 ? COR.accent : COR.sub, borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}`, minWidth: 108 }}>{d}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {filtradas.map((p, i) => (
                          <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                            <td className="sticky left-0 z-10 px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}`, background: COR.panel }}>
                              <div className="flex items-center gap-2"><Dot cor={statusMeta[statusDe(p)].cor} />
                                <div>
                                  <div className="font-medium leading-tight" style={{ color: COR.ink }}>{p.setor}</div>
                                  <div className="mono text-xs" style={{ color: COR.faint }}>{p.ip}</div>
                                </div>
                              </div>
                            </td>
                            {datas.map((_, idx) => {
                              const v = p.contadores?.[idx];
                              const ant = idx > 0 ? p.contadores?.[idx - 1] : null;
                              const delta = v != null && ant != null ? Math.max(0, v - ant) : null;
                              const ultima = idx === datas.length - 1;
                              return (
                                <td key={idx} className="px-3 py-3 text-right align-top"
                                  style={{ borderBottom: `1px solid ${COR.border}`, borderLeft: `1px solid ${COR.border}`, background: ultima ? COR.accentSoft : "transparent" }}>
                                  <div className="mono font-semibold" style={{ color: v != null ? COR.ink : COR.faint, fontVariantNumeric: "tabular-nums" }}>{nf(v)}</div>
                                  {delta != null && delta > 0 && <div className="mono text-xs" style={{ color: COR.online }}>+{nf(delta)}</div>}
                                  {delta === 0 && <div className="mono text-xs" style={{ color: COR.faint }}>0</div>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {filtradas.length === 0 && <tr><td colSpan={datas.length + 1} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Nenhuma impressora encontrada.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* MAPEAMENTO */}
              {aba === "mapeamento" && (
                <>
                  <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: COR.sub }}>
                    <Link2 size={14} style={{ color: COR.accent }} /> Mapeamento de toners compatíveis por impressora.
                  </div>
                  <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
                    <table className="w-full border-collapse text-sm">
                      <thead><tr style={{ background: COR.panelAlt }}>
                        {["Setor", "Marca / Modelo", "Série", "Toner compatível"].map((h, i) => <Th key={i}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {filtradas.map((p, i) => (
                          <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                            <td className="px-3 py-3 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{p.setor}</td>
                            <td className="px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>
                              <span style={{ color: COR.ink }}>{p.marca}</span> <span className="mono text-xs">{p.modelo}</span>
                            </td>
                            <td className="mono px-3 py-3 text-xs" style={{ color: COR.faint, borderBottom: `1px solid ${COR.border}` }}>{p.serie || "—"}</td>
                            <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                              <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{p.toner || "—"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ESTOQUE */}
              {aba === "estoque" && (
                <>
                  {repor.length > 0 && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold"
                      style={{ background: `${COR.offline}12`, border: `1px solid ${COR.offline}44`, color: COR.offline }}>
                      <AlertTriangle size={16} /> {repor.length} toner(es) precisando reposição
                    </div>
                  )}
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
                        {["Fabricante", "Modelo", "Estoque", "Mín.", "Impressoras", "Status"].map((h, i) => <Th key={i}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {estoqueVis.map((e, i) => {
                          const atual = Number(e.estoque_atual) || 0;
                          const min = Number(e.minimo_estipulado) || 0;
                          const precisa = atual <= min;
                          const cor = precisa ? COR.offline : COR.online;
                          const usam = impressorasPorToner(e.modelo_toner);
                          const aberto = expandido === i;
                          return (
                            <React.Fragment key={i}>
                              <tr className="row-hover transition-colors" style={{ background: COR.panel }}>
                                <td className="px-3 py-2.5" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{e.fabricante}</td>
                                <td className="px-3 py-2.5 font-medium" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{e.modelo_toner}</td>
                                <td className="mono px-3 py-2.5 font-bold" style={{ color: precisa ? COR.offline : COR.ink, borderBottom: `1px solid ${COR.border}` }}>{atual}</td>
                                <td className="mono px-3 py-2.5" style={{ color: COR.faint, borderBottom: `1px solid ${COR.border}` }}>{min}</td>
                                <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                  {usam.length > 0 ? (
                                    <button onClick={() => setExpandido(aberto ? null : i)} className="flex items-center gap-1 text-xs font-medium" style={{ color: COR.accent }}>
                                      {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{usam.length} impressora{usam.length > 1 ? "s" : ""}
                                    </button>
                                  ) : <span className="text-xs" style={{ color: COR.faint }}>—</span>}
                                </td>
                                <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: cor, background: `${cor}1f`, border: `1px solid ${cor}44` }}>
                                    {precisa ? <><AlertTriangle size={12} /> Repor</> : "OK"}
                                  </span>
                                </td>
                              </tr>
                              {aberto && (
                                <tr style={{ background: COR.panelAlt }}>
                                  <td colSpan={6} className="px-3 py-2" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                    <div className="flex flex-wrap gap-1.5">
                                      {usam.map((p, j) => (
                                        <span key={j} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.sub }}>
                                          <Dot cor={statusMeta[statusDe(p)].cor} />{p.setor} <span className="mono" style={{ color: COR.faint }}>{p.ip}</span>
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
                </>
              )}

              {/* VIDA DO TONER */}
              {aba === "vida" && (
                <>
                  {/* --- Níveis reais via SNMP --- */}
                  <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: COR.sub }}>
                    <Droplet size={14} style={{ color: COR.accent }} />
                    Nível lido via SNMP (prtMarkerSuppliesLevel). Ordenado do mais vazio ao mais cheio. Impressoras que não reportam nível não aparecem aqui.
                  </div>
                  <div className="mb-6 overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
                    <table className="w-full border-collapse text-sm">
                      <thead><tr style={{ background: COR.panelAlt }}>
                        {["Setor", "Toner", "Nível", "Contador", "Status"].map((h, i) => <Th key={i}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {comNivel.map((p, i) => (
                          <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                            <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                              <div className="font-medium" style={{ color: COR.ink }}>{p.setor}</div>
                              <div className="mono text-xs" style={{ color: COR.faint }}>{p.ip}</div>
                            </td>
                            <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                              <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{p.toner || "—"}</span>
                            </td>
                            <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><BarraNivel nivel={p.nivel} /></td>
                            <td className="mono px-3 py-3" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{nf(p.contador)}</td>
                            <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}><StatusBadge status={statusDe(p)} /></td>
                          </tr>
                        ))}
                        {comNivel.length === 0 && (
                          <tr><td colSpan={5} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>
                            Nenhuma impressora reportou nível de toner.<br />
                            <span className="text-xs">Verifique se o leitor.py está coletando a coluna NIVEL_TONER.</span>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* --- Criticidade por estoque --- */}
                  <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: COR.sub }}>
                    <TrendingUp size={14} style={{ color: COR.accent }} /> Criticidade por modelo — saldo em estoque × número de impressoras que dependem dele.
                  </div>
                  <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
                    <table className="w-full border-collapse text-sm">
                      <thead><tr style={{ background: COR.panelAlt }}>
                        {["Toner", "Saldo", "Impressoras usando", "Criticidade"].map((h, i) => <Th key={i}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {analiseToner.map((a, i) => {
                          const cor = a.critico ? COR.offline : a.usam.length >= 5 ? COR.erro : COR.online;
                          const label = a.critico ? "Crítico" : a.usam.length >= 5 ? "Alto" : "Baixo";
                          return (
                            <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                              <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{a.toner.modelo_toner}</span>
                                <div className="mt-1 text-xs" style={{ color: COR.faint }}>{a.toner.fabricante}</div>
                              </td>
                              <td className="mono px-3 py-3 font-bold" style={{ color: a.saldo <= 2 ? COR.offline : COR.ink, borderBottom: `1px solid ${COR.border}` }}>{a.saldo}</td>
                              <td className="mono px-3 py-3" style={{ color: COR.ink, borderBottom: `1px solid ${COR.border}` }}>{a.usam.length}</td>
                              <td className="px-3 py-3" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: cor, background: `${cor}1f`, border: `1px solid ${cor}44` }}>
                                  {a.critico && <AlertTriangle size={12} />}{label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {analiseToner.length === 0 && <tr><td colSpan={4} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Sem dados de toner.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* MOVIMENTAÇÕES */}
              {aba === "movimentacoes" && (
                <>
                  <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: COR.sub }}>
                    <Package size={14} style={{ color: COR.accent }} /> Histórico de toners retirados/devolvidos pelo armário via QR code.
                  </div>
                  {movimentacoes.length === 0 ? (
                    <Aviso>Nenhuma movimentação registrada ainda.<br />As retiradas entram pelo QR code do armário.</Aviso>
                  ) : (
                    <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COR.border}` }}>
                      <table className="w-full border-collapse text-sm">
                        <thead><tr style={{ background: COR.panelAlt }}>
                          {["Data / Hora", "Tipo", "Toner", "Quantidade", "Responsável"].map((h, i) => <Th key={i}>{h}</Th>)}
                        </tr></thead>
                        <tbody>
                          {movimentacoes.map((m, i) => {
                            const cor = m.tipo === "Retirada" ? COR.offline : COR.online;
                            return (
                              <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                                <td className="mono px-3 py-2.5 whitespace-nowrap" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{m.data}</td>
                                <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: cor, background: `${cor}1f`, border: `1px solid ${cor}44` }}>
                                    {m.tipo === "Retirada" ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}{m.tipo}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5" style={{ borderBottom: `1px solid ${COR.border}` }}>
                                  <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{m.toner}</span>
                                </td>
                                <td className="mono px-3 py-2.5 font-bold" style={{ color: cor, borderBottom: `1px solid ${COR.border}` }}>
                                  {m.tipo === "Retirada" ? "-" : "+"}{m.quantidade}
                                </td>
                                <td className="px-3 py-2.5" style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}` }}>{m.responsavel || "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}

        <footer className="mt-6 text-center text-xs" style={{ color: COR.faint }}>
          Dados em tempo real via SNMP · atualização automática a cada 60s.
        </footer>
      </div>
    </div>
  );
}
