import React, { useState } from 'react';
import { useDashboard, useMovimentacoes } from './services/sheetsApi';
import {
  Search, Printer, Wifi, WifiOff, AlertTriangle, Activity,
  CalendarDays, ArrowDownCircle, ArrowUpCircle, Clock, X
} from 'lucide-react';
import './App.css';

// ===== COMPONENTE: KPI Cards =====
function KPICard({ icon: Icon, numero, label, cor = '#3b82f6' }) {
  return (
    <div className="kpi-card" style={{ borderLeftColor: cor }}>
      <div className="kpi-icon" style={{ color: cor }}>
        <Icon size={24} />
      </div>
      <div className="kpi-content">
        <div className="kpi-numero" style={{ color: cor }}>{numero}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}

// ===== COMPONENTE: Monitoramento =====
function Monitoramento({ dados, carregando, erro }) {
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  if (carregando) return <div className="loading">⏳ Carregando...</div>;
  if (erro) return <div className="erro">❌ Erro: {erro}</div>;
  if (!dados || !Array.isArray(dados) || dados.length === 0) {
    return <div className="loading">Aguardando dados...</div>;
  }

  let filtrada = dados;
  if (filtro === 'online') filtrada = dados.filter((p) => p.online);
  if (filtro === 'offline') filtrada = dados.filter((p) => !p.online);

  if (busca) {
    const termo = busca.toLowerCase();
    filtrada = filtrada.filter(
      (p) =>
        (p.setor && p.setor.toLowerCase().includes(termo)) ||
        (p.ip && p.ip.toLowerCase().includes(termo)) ||
        (p.marca && p.marca.toLowerCase().includes(termo)) ||
        (p.modelo && p.modelo.toLowerCase().includes(termo))
    );
  }

  const online = dados.filter((p) => p.online).length;
  const offlineCount = dados.filter((p) => !p.online).length;

  return (
    <div className="aba-conteudo">
      <div className="kpi-grid">
        <KPICard icon={Printer} numero={dados.length} label="Impressoras" cor="#3b82f6" />
        <KPICard icon={Wifi} numero={online} label="Online" cor="#10b981" />
        <KPICard icon={WifiOff} numero={offlineCount} label="Offline" cor="#ef4444" />
        <KPICard
          icon={Activity}
          numero={dados.reduce((s, p) => s + (p.contador || 0), 0).toLocaleString('pt-BR')}
          label="Páginas (soma)"
          cor="#8b5cf6"
        />
      </div>

      <div className="filtros-secao">
        <div className="busca-container">
          <Search size={20} className="busca-icon" />
          <input
            type="text"
            placeholder="Buscar por setor, IP, marca ou modelo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="busca-input"
          />
          {busca && <X size={18} className="busca-limpar" onClick={() => setBusca('')} />}
        </div>

        <div className="filtros-botoes">
          <button
            className={`filtro-btn ${filtro === 'todos' ? 'ativo' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Todos ({dados.length})
          </button>
          <button
            className={`filtro-btn ${filtro === 'online' ? 'ativo' : ''}`}
            onClick={() => setFiltro('online')}
          >
            <Wifi size={16} /> Online ({online})
          </button>
          <button
            className={`filtro-btn ${filtro === 'offline' ? 'ativo' : ''}`}
            onClick={() => setFiltro('offline')}
          >
            <WifiOff size={16} /> Offline ({offlineCount})
          </button>
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
            {filtrada.length === 0 ? (
              <tr>
                <td colSpan="6" className="sem-dados">
                  Nenhuma impressora encontrada
                </td>
              </tr>
            ) : (
              filtrada.map((p, i) => (
                <tr key={i} className={!p.online ? 'linha-offline' : ''}>
                  <td className="setor-cell">{p.setor || '—'}</td>
                  <td className="ip-cell">
                    <code>{p.ip || '—'}</code>
                  </td>
                  <td className="marca-cell">
                    {p.marca || '—'} <strong>{p.modelo || '—'}</strong>
                  </td>
                  <td className="serie-cell">
                    <code>{p.serie || '—'}</code>
                  </td>
                  <td className="contador-cell">
                    {p.contador !== null && p.contador !== undefined ? p.contador.toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="status-cell">
                    {p.online ? (
                      <span className="badge-online">● Online</span>
                    ) : (
                      <span className="badge-offline">● Offline</span>
                    )}
                    {p.falha && <div className="falha-msg">{p.falha}</div>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== COMPONENTE: Contadores Diários =====
function Contadores({ dados, carregando, erro }) {
  if (carregando) return <div className="loading">⏳ Carregando...</div>;
  if (erro) return <div className="erro">❌ Erro: {erro}</div>;
  if (!dados || !Array.isArray(dados) || dados.length === 0) {
    return <div className="loading">Sem dados de contadores</div>;
  }

  const datasDisponiveis = dados[0]?.datas || [];
  const ultimas5Datas = datasDisponiveis.slice(-5);

  return (
    <div className="aba-conteudo">
      <div className="info-box">
        <CalendarDays size={18} />
        Cada coluna é uma data. O número menor abaixo é o volume impresso naquele dia (Δ diário).
      </div>

      <div className="tabela-container">
        <table className="tabela-moderna">
          <thead>
            <tr>
              <th>IMPRESSORA</th>
              {ultimas5Datas.map((data, idx) => (
                <th key={`date-${idx}`} className="data-coluna">
                  {data}
                </th>
              ))}
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((p, i) => {
              const ultimosContadores = (p.contadores || []).slice(-5);
              return (
                <tr key={i} className={!p.online ? 'linha-offline' : ''}>
                  <td className="impressora-cell">
                    <div className="imp-info">
                      <strong>{p.setor || '—'}</strong>
                      <code>{p.ip || '—'}</code>
                    </div>
                  </td>
                  {ultimosContadores.map((c, idx) => {
                    let delta = '—';
                    if (
                      c !== null &&
                      idx > 0 &&
                      ultimosContadores[idx - 1] !== null
                    ) {
                      delta = Math.max(0, c - ultimosContadores[idx - 1]);
                    }
                    return (
                      <td key={`val-${idx}`} className="contador-coluna">
                        <div className="valor-principal">
                          {c !== null && c !== undefined ? c.toLocaleString('pt-BR') : '—'}
                        </div>
                        {delta !== '—' && (
                          <div className="delta-diario">+{delta}</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="status-cell">
                    {p.online ? (
                      <span className="badge-online">● Online</span>
                    ) : (
                      <>
                        <span className="badge-offline">● Offline</span>
                        {p.falha && <div className="falha-msg">{p.falha}</div>}
                      </>
                    )}
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

// ===== COMPONENTE: Estoque de Toners =====
function Estoque({ estoque, repor, carregando, erro }) {
  if (carregando) return <div className="loading">⏳ Carregando...</div>;
  if (erro) return <div className="erro">❌ Erro: {erro}</div>;
  if (!estoque || !Array.isArray(estoque) || estoque.length === 0) {
    return <div className="loading">Sem dados de estoque</div>;
  }

  return (
    <div className="aba-conteudo">
      {repor && Array.isArray(repor) && repor.length > 0 && (
        <div className="alerta-box">
          <AlertTriangle size={20} />
          <strong>{repor.length} toner(es) precisam reposição!</strong>
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
              const atual = Number(e.estoque_atual || 0);
              const minimo = Number(e.minimo_estipulado || 0);
              const precisa = atual <= minimo;

              return (
                <tr key={i} className={precisa ? 'linha-alerta' : ''}>
                  <td className="fab-cell">{e.fabricante || '—'}</td>
                  <td className="modelo-cell">{e.modelo_toner || '—'}</td>
                  <td className="numero-cell">
                    <strong style={{ color: precisa ? '#ef4444' : '#000' }}>
                      {atual}
                    </strong>
                  </td>
                  <td className="numero-cell">{minimo}</td>
                  <td className={`status-cell ${precisa ? 'repor' : 'ok'}`}>
                    {precisa ? (
                      <span className="badge-repor">🔴 REPOR</span>
                    ) : (
                      <span className="badge-ok">✓ OK</span>
                    )}
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

// ===== COMPONENTE: Movimentações =====
function Movimentacoes({ movimentacoes, carregando, erro }) {
  if (carregando) return <div className="loading">⏳ Carregando...</div>;
  if (erro) return <div className="erro">❌ Erro: {erro}</div>;
  if (!movimentacoes || !Array.isArray(movimentacoes) || movimentacoes.length === 0) {
    return <div className="sem-dados-box">Nenhuma movimentação registrada ainda.</div>;
  }

  return (
    <div className="aba-conteudo">
      <div className="info-box">
        <Clock size={18} />
        Histórico de toners retirados/devolvidos pelo armário via QR code.
      </div>

      <div className="tabela-container">
        <table className="tabela-moderna">
          <thead>
            <tr>
              <th>DATA / HORA</th>
              <th>TIPO</th>
              <th>TONER</th>
              <th style={{ textAlign: 'right' }}>QTD</th>
              <th>RESPONSÁVEL</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((m, i) => (
              <tr key={i}>
                <td className="data-cell">{m.data || '—'}</td>
                <td className="tipo-cell">
                  {m.tipo === 'Retirada' || m.tipo === 'Saída' ? (
                    <span className="badge-saida">
                      <ArrowDownCircle size={14} /> Retirada
                    </span>
                  ) : (
                    <span className="badge-entrada">
                      <ArrowUpCircle size={14} /> Entrada
                    </span>
                  )}
                </td>
                <td className="toner-cell">{m.toner || '—'}</td>
                <td className="numero-cell">{m.quantidade || 0}</td>
                <td className="responsavel-cell">{m.responsavel || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== DASHBOARD PRINCIPAL =====
export default function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState('monitoramento');
  const { impressoras, estoque, repor, carregando, erro, recarregar } = useDashboard({ intervalo: 30000 });
  const { dados: movimentacoes, carregando: movCarregando, erro: movErro, recarregar: movRecarregar } = useMovimentacoes({ intervalo: 30000 });

  const impressorasArray = impressoras || [];
  const online = impressorasArray.filter((p) => p && p.online).length;

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="dashboard-header-novo">
        <div className="header-esquerda">
          <div className="logo-secao">
            <Printer size={32} className="logo-icon" />
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

      {/* NAVEGAÇÃO */}
      <nav className="abas-nav-nova">
        <button
          className={`aba-btn ${abaAtiva === 'monitoramento' ? 'ativo' : ''}`}
          onClick={() => setAbaAtiva('monitoramento')}
        >
          📡 Monitoramento
        </button>
        <button
          className={`aba-btn ${abaAtiva === 'contadores' ? 'ativo' : ''}`}
          onClick={() => setAbaAtiva('contadores')}
        >
          📊 Contadores Diários
        </button>
        <button
          className={`aba-btn ${abaAtiva === 'estoque' ? 'ativo' : ''}`}
          onClick={() => setAbaAtiva('estoque')}
        >
          📦 Estoque
        </button>
        <button
          className={`aba-btn ${abaAtiva === 'movimentacoes' ? 'ativo' : ''}`}
          onClick={() => setAbaAtiva('movimentacoes')}
        >
          📋 Movimentações
        </button>
      </nav>

      {/* CONTEÚDO */}
      <main className="dashboard-main-novo">
        {abaAtiva === 'monitoramento' && (
          <Monitoramento dados={impressorasArray} carregando={carregando} erro={erro} />
        )}
        {abaAtiva === 'contadores' && (
          <Contadores dados={impressorasArray} carregando={carregando} erro={erro} />
        )}
        {abaAtiva === 'estoque' && (
          <Estoque estoque={estoque} repor={repor} carregando={carregando} erro={erro} />
        )}
        {abaAtiva === 'movimentacoes' && (
          <Movimentacoes movimentacoes={movimentacoes} carregando={movCarregando} erro={movErro} />
        )}
      </main>
    </div>
  );
}
