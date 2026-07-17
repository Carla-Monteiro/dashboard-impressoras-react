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
