import React, { useState, useMemo } from 'react';
import { Search, Printer, Wifi, WifiOff, AlertTriangle, Activity,
  LayoutGrid, CalendarDays, TrendingUp, Filter, X, Package,
  ArrowDownCircle, ArrowUpCircle, PlusCircle, PackageX,
  Droplet, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useDashboard, useMovimentacoes } from './services/sheetsApi';
import './App.css';

function Monitoramento({ dados, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  const filtrada = dados;

  return (
    <div className="aba-conteudo">
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-numero">{dados.length}</div>
          <div className="kpi-label">Impressoras</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-numero" style={{ color: '#10b981' }}>
            {dados.filter((p) => p.online).length}
          </div>
          <div className="kpi-label">Online</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-numero" style={{ color: '#ef4444' }}>
            {dados.filter((p) => !p.online).length}
          </div>
          <div className="kpi-label">Offline</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-numero">
            {dados.reduce((s, p) => s + (p.contador || 0), 0).toLocaleString('pt-BR')}
          </div>
          <div className="kpi-label">Páginas</div>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-item">
          <div className="status-item-icon">🟢</div>
          <div className="status-item-content">
            <div className="status-item-numero">{dados.filter((p) => p.online).length}</div>
            <div className="status-item-label">Online</div>
          </div>
        </div>
        <div className="status-item">
          <div className="status-item-icon">🔴</div>
          <div className="status-item-content">
            <div className="status-item-numero">{dados.filter((p) => !p.online).length}</div>
            <div className="status-item-label">Offline</div>
          </div>
        </div>
        <div className="status-item">
          <div className="status-item-icon">⚠️</div>
          <div className="status-item-content">
            <div className="status-item-numero">{dados.filter((p) => p.falha).length}</div>
            <div className="status-item-label">Com Erro</div>
          </div>
        </div>
      </div>

      <div className="tabela-container">
        <table className="tabela-moderna">
          <thead>
            <tr>
              <th>SETOR</th>
              <th>IP</th>
              <th>MARCA / MODELO</th>
              <th>SÉRIE</th>
              <th>CONTADOR</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtrada.map((p, i) => (
              <tr key={i} className={p.online ? '' : 'linha-offline'}>
                <td className="setor-cell">{p.setor}</td>
                <td className="ip-cell"><code>{p.ip}</code></td>
                <td className="marca-cell">{p.marca} <strong>{p.modelo}</strong></td>
                <td className="serie-cell"><code>{p.serie || '—'}</code></td>
                <td className="contador-cell">{p.contador?.toLocaleString('pt-BR') || '—'}</td>
                <td className="status-cell">
                  {p.online ? <span className="badge-online">● Online</span> : <span className="badge-offline">● Offline</span>}
                  {p.falha && <div className="falha-msg">{p.falha}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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


function Contadores({ dados, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;
  if (!dados.length) return <div className="loading">Sem dados de contadores</div>;

  const datasDisponiveis = dados[0]?.datas || [];
  const colunasVisiveis = datasDisponiveis.map((data, i) => ({ indice: i, data }));

  return (
    <div className="aba-conteudo">
      <div className="info-box">
        📊 Cada coluna é uma data. O número menor abaixo é o volume impresso naquele dia (Δ diário).
      </div>

      <div className="tabela-container">
        <table className="tabela-moderna">
          <thead>
            <tr>
              <th>IMPRESSORA</th>
              {colunasVisiveis.map((col, idx) => (<th key={`date-${idx}`} className="data-coluna">{col.data}</th>))}
              <th style={{ textAlign: 'right' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((p, i) => (
              <tr key={i} className={p.online ? '' : 'linha-offline'}>
                <td className="impressora-cell"><strong>{p.setor}</strong><br /><code>{p.ip}</code></td>
                {colunasVisiveis.map((col, idx) => {
                  const valor = p.contadores[col.indice];
                  let delta = '—';
                  if (valor && col.indice > 0 && p.contadores[col.indice - 1]) {
                    delta = Math.max(0, valor - p.contadores[col.indice - 1]);
                  }
                  return (
                    <td key={`val-${idx}`} className="contador-coluna">
                      <div className="valor-principal">{valor ? valor.toLocaleString('pt-BR') : '—'}</div>
                      {delta !== '—' && <div className="delta-diario">+{delta}</div>}
                    </td>
                  );
                })}
                <td className="status-cell">
                  {p.online ? <span className="badge-online">● Online</span> : <>
                    <span className="badge-offline">● Offline</span>
                    {p.falha && <div className="falha-msg">{p.falha}</div>}
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Mapeamento({ dados, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  return (
    <div className="aba-conteudo">
      <div className="info-box">
        🔗 Mapeamento de Toners Compatíveis por Impressora
      </div>
      <div className="tabela-container">
        <table className="tabela-moderna">
          <thead>
            <tr>
              <th>SETOR</th>
              <th>MARCA / MODELO</th>
              <th>SÉRIE</th>
              <th>TONER COMPATÍVEL</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((p, i) => (
              <tr key={i}>
                <td>{p.setor}</td>
                <td><strong>{p.marca} {p.modelo}</strong></td>
                <td className="codigo pequeno">{p.serie || '—'}</td>
                <td><strong>{p.toner || '—'}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Estoque({ estoque, carregando, erro, repor }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  return (
    <div className="aba-conteudo">
      {repor.length > 0 && (
        <div className="alerta-box">
          <strong>⚠️ {repor.length} toner(es) precisando reposição</strong>
        </div>
      )}
      <div className="tabela-container">
        <table className="tabela-moderna">
          <thead>
            <tr>
              <th>FABRICANTE</th>
              <th>MODELO</th>
              <th style={{ textAlign: 'right' }}>ESTOQUE</th>
              <th style={{ textAlign: 'right' }}>MÍNIMO</th>
              <th style={{ textAlign: 'right' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {estoque.map((e, i) => {
              const precisa = Number(e.estoque_atual) <= Number(e.minimo_estipulado);
              return (
                <tr key={i} className={precisa ? 'linha-alerta' : ''}>
                  <td className="fab-cell">{e.fabricante}</td>
                  <td className="modelo-cell">{e.modelo_toner}</td>
                  <td className="numero-cell"><strong style={{ color: precisa ? '#ef4444' : '#000' }}>{e.estoque_atual}</strong></td>
                  <td className="numero-cell">{e.minimo_estipulado}</td>
                  <td className={`status-cell ${precisa ? 'repor' : 'ok'}`}>
                    {precisa ? '🔴 REPOR' : '✓ OK'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VidaToner({ impressoras, estoque, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  // Cria mapa de toners com impressoras que usam
  const porToner = new Map();
  
  // Popula com dados do estoque
  if (estoque && Array.isArray(estoque)) {
    estoque.forEach((e) => {
      const chave = e.modelo_toner;
      if (!porToner.has(chave)) {
        porToner.set(chave, { 
          toner: e, 
          impressoras: [],
          saldo: Number(e.estoque_atual || 0)
        });
      }
    });
  }

  // Adiciona impressoras que usam cada toner
  if (impressoras && Array.isArray(impressoras)) {
    impressoras.forEach((p) => {
      if (p.toner) {
        const chave = p.toner;
        if (porToner.has(chave)) {
          porToner.get(chave).impressoras.push(p.setor);
        }
      }
    });
  }

  const analise = Array.from(porToner.values()).sort((a, b) => b.impressoras.length - a.impressoras.length);

  return (
    <div className="aba-conteudo">
      <div className="info-box">
        🔍 Análise de Consumo e Criticidade por Toner
      </div>
      <div className="tabela-container">
        <table className="tabela-moderna">
          <thead>
            <tr>
              <th>TONER</th>
              <th style={{ textAlign: 'right' }}>SALDO</th>
              <th style={{ textAlign: 'right' }}>IMPRESSORAS USANDO</th>
              <th>CRITICIDADE</th>
            </tr>
          </thead>
          <tbody>
            {analise.length > 0 ? analise.map((item, i) => {
              const saldo = item.saldo || Number(item.toner?.estoque_atual || 0);
              const impCount = item.impressoras.length;
              const critico = saldo <= 1 && impCount >= 5;
              return (
                <tr key={i} className={critico ? 'critico' : ''}>
                  <td><strong>{item.toner?.modelo_toner || '—'}</strong></td>
                  <td className={`numero-cell ${saldo <= 2 ? 'baixo' : ''}`}>{saldo}</td>
                  <td className="numero-cell">{impCount}</td>
                  <td>{critico ? '🔴 CRÍTICO' : impCount >= 5 ? '🟡 ALTO' : '🟢 BAIXO'}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  Carregando dados de toner...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Movimentacoes({ movimentacoes, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  return (
    <div className="aba-conteudo">
      <div className="info-box">
        📋 Histórico de toners retirados/devolvidos pelo armário via QR code.
      </div>
      {movimentacoes.length === 0 ? (
        <div className="sem-dados-box">Nenhuma movimentação registrada ainda.</div>
      ) : (
        <div className="tabela-container">
          <table className="tabela-moderna">
            <thead>
              <tr>
                <th>DATA / HORA</th>
                <th>TIPO</th>
                <th>TONER</th>
                <th style={{ textAlign: 'right' }}>QUANTIDADE</th>
                <th>RESPONSÁVEL</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m, i) => (
                <tr key={i}>
                  <td className="data-cell">{m.data}</td>
                  <td className="tipo-cell">{m.tipo}</td>
                  <td className="toner-cell"><strong>{m.toner}</strong></td>
                  <td className="numero-cell">{m.quantidade}</td>
                  <td className="responsavel-cell">{m.responsavel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState('monitoramento');
  const { impressoras, estoque, repor, carregando, erro, recarregar } = useDashboard({ intervalo: 60000 });
  const { dados: movimentacoes, carregando: movCarregando, erro: movErro, recarregar: movRecarregar } = useMovimentacoes({ intervalo: 30000 });

  const online = impressoras?.filter((p) => p.online).length || 0;

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header-novo">
        <div className="header-esquerda">
          <div className="logo-secao">
            <div>
              <h1>Gestão de Impressoras & Toner - UNIFEB TI</h1>
              <p className="subtitle">Leitura SNMP · Última coleta {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>
        </div>

        <div className="header-direita">
          <button className="btn-refresh" onClick={() => { recarregar(); movRecarregar(); }}>
            🔄 Atualizar
          </button>
          <div className="status-dot" style={{ backgroundColor: online > 0 ? '#10b981' : '#ef4444' }}>
            ● Coleta ativa
          </div>
        </div>
      </header>

      <nav className="abas-nav-nova">
        <button className={`aba-btn ${abaAtiva === 'monitoramento' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('monitoramento')}>
          📡 Monitoramento
        </button>
        <button className={`aba-btn ${abaAtiva === 'contadores' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('contadores')}>
          📊 Contadores Diários
        </button>
        <button className={`aba-btn ${abaAtiva === 'mapeamento' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('mapeamento')}>
          🔗 Mapeamento
        </button>
        <button className={`aba-btn ${abaAtiva === 'estoque' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('estoque')}>
          📦 Estoque
        </button>
        <button className={`aba-btn ${abaAtiva === 'vida-toner' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('vida-toner')}>
          💧 Vida do Toner
        </button>
        <button className={`aba-btn ${abaAtiva === 'movimentacoes' ? 'ativo' : ''}`} onClick={() => setAbaAtiva('movimentacoes')}>
          📋 Movimentações
        </button>
      </nav>

      <main className="dashboard-main-novo">
        {abaAtiva === 'monitoramento' && <Monitoramento dados={impressoras} carregando={carregando} erro={erro} />}
        {abaAtiva === 'contadores' && <Contadores dados={impressoras} carregando={carregando} erro={erro} />}
        {abaAtiva === 'mapeamento' && <Mapeamento dados={impressoras} carregando={carregando} erro={erro} />}
        {abaAtiva === 'estoque' && <Estoque estoque={estoque} repor={repor} carregando={carregando} erro={erro} />}
        {abaAtiva === 'vida-toner' && <VidaToner impressoras={impressoras} estoque={estoque} carregando={carregando} erro={erro} />}
        {abaAtiva === 'movimentacoes' && <Movimentacoes movimentacoes={movimentacoes} carregando={movCarregando} erro={movErro} />}
      </main>
    </div>
  );
}
