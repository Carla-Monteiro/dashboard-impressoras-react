import React, { useState } from 'react';
import { useDashboard, useMovimentacoes } from './services/sheetsApi';
import './App.css';

function Monitoramento({ dados, carregando, erro }) {
  const [filtro, setFiltro] = useState('todos');

  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  const filtrada = dados.filter((p) => {
    if (filtro === 'online') return p.online;
    if (filtro === 'offline') return !p.online;
    return true;
  });

  return (
    <div className="aba">
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-numero">{dados.length}</div>
          <div className="kpi-label">Impressoras</div>
        </div>
        <div className="kpi">
          <div className="kpi-numero" style={{ color: '#10b981' }}>
            {dados.filter((p) => p.online).length}
          </div>
          <div className="kpi-label">Online</div>
        </div>
        <div className="kpi">
          <div className="kpi-numero" style={{ color: '#ef4444' }}>
            {dados.filter((p) => !p.online).length}
          </div>
          <div className="kpi-label">Offline</div>
        </div>
        <div className="kpi">
          <div className="kpi-numero">
            {dados.reduce((s, p) => s + (p.contador || 0), 0).toLocaleString('pt-BR')}
          </div>
          <div className="kpi-label">Páginas</div>
        </div>
      </div>

      <div className="filtros">
        <button className={filtro === 'todos' ? 'ativo' : ''} onClick={() => setFiltro('todos')}>
          Todos ({dados.length})
        </button>
        <button className={filtro === 'online' ? 'ativo' : ''} onClick={() => setFiltro('online')}>
          Online ({dados.filter((p) => p.online).length})
        </button>
        <button className={filtro === 'offline' ? 'ativo' : ''} onClick={() => setFiltro('offline')}>
          Offline ({dados.filter((p) => !p.online).length})
        </button>
      </div>

      <table className="tabela">
        <thead>
          <tr>
            <th>Setor</th>
            <th>IP</th>
            <th>Marca / Modelo</th>
            <th>Série</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtrada.map((p, i) => (
            <tr key={i} className={p.online ? '' : 'offline'}>
              <td>{p.setor}</td>
              <td className="codigo">{p.ip}</td>
              <td>{p.marca} {p.modelo}</td>
              <td className="codigo pequeno">{p.serie || '—'}</td>
              <td className="status">
                {p.online ? <span className="online">● Online</span> : <span className="offline-badge">● Offline</span>}
                {p.falha && <div className="falha">{p.falha}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Contadores({ dados, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;
  if (!dados.length) return <div className="loading">Sem dados de contadores</div>;

  const datasDisponiveis = dados[0]?.datas || [];
  
  // Mostra TODAS as datas disponíveis
  const colunasVisiveis = datasDisponiveis.map((data, i) => ({ indice: i, data }));

  return (
    <div className="aba">
      <h2>Histórico de Contadores</h2>

      <table className="tabela">
        <thead>
          <tr>
            <th>Setor</th>
            <th>IP</th>
            <th>Marca / Modelo</th>
            {colunasVisiveis.map((col, idx) => (<th key={`date-${idx}`}>{col.data}</th>))}
            <th style={{ textAlign: 'right' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((p, i) => (
            <tr key={i} className={p.online ? '' : 'offline'}>
              <td>{p.setor}</td>
              <td className="codigo">{p.ip}</td>
              <td>{p.marca} {p.modelo}</td>
              {colunasVisiveis.map((col, idx) => (
                <td key={`val-${idx}`} className="numero">
                  {p.contadores[col.indice] ? p.contadores[col.indice].toLocaleString('pt-BR') : '—'}
                </td>
              ))}
              <td className="status">
                {p.online ? <span className="online">● Online</span> : <>
                  <span className="offline-badge">● Offline</span>
                  {p.falha && <div className="falha">{p.falha}</div>}
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Estoque({ estoque, carregando, erro, repor }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  return (
    <div className="aba">
      <div className="alerta-repor"><strong>⚠️ {repor.length} toner(es) precisando reposição</strong></div>
      <table className="tabela">
        <thead>
          <tr>
            <th>Fabricante</th>
            <th>Modelo</th>
            <th style={{ textAlign: 'right' }}>Estoque Atual</th>
            <th style={{ textAlign: 'right' }}>Mínimo</th>
            <th style={{ textAlign: 'right' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {estoque.map((e, i) => {
            const precisa = Number(e.estoque_atual) <= Number(e.minimo_estipulado);
            return (
              <tr key={i} className={precisa ? 'alerta' : ''}>
                <td>{e.fabricante}</td>
                <td>{e.modelo_toner}</td>
                <td className="numero"><strong>{e.estoque_atual}</strong></td>
                <td className="numero">{e.minimo_estipulado}</td>
                <td className={precisa ? 'repor' : 'ok'} style={{ textAlign: 'right' }}>{precisa ? '🔴 REPOR' : '✓ OK'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Mapeamento({ dados, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  return (
    <div className="aba">
      <h2>Mapeamento de Toners por Impressora</h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Setor</th>
            <th>Marca / Modelo</th>
            <th>Série</th>
            <th>Toner Compatível</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((p, i) => (
            <tr key={i}>
              <td>{p.setor}</td>
              <td>{p.marca} {p.modelo}</td>
              <td className="codigo pequeno">{p.serie || '—'}</td>
              <td><strong>{p.toner || '—'}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VidaToner({ impressoras, estoque, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  const porToner = new Map();
  
  // Popula com dados do estoque
  if (estoque && Array.isArray(estoque)) {
    estoque.forEach((e) => {
      const chave = e.modelo_toner;
      if (!porToner.has(chave)) {
        porToner.set(chave, { toner: e, impressoras: [], saldo: Number(e.estoque_atual || 0) });
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
        } else {
          porToner.set(chave, { toner: { modelo_toner: p.toner }, impressoras: [p.setor], saldo: 0 });
        }
      }
    });
  }

  const RENDIMENTO = {
    'TK-322': 15000, 'TK-1175': 12000, 'TK-1147': 7200, 'TK-3122': 21000,
    'GPR-22': 8400, 'GPR-31 BLACK': 19000, 'GPR-31 CYAN': 19000,
    'GPR-31 MAGENTA': 19000, 'GPR-31 YELLOW': 19000, 'GPR-38': 56000,
    'R04L BLACK': 10000, 'R04L CYAN': 10000, 'R04L MAGENTA': 10000, 'R04L YELLOW': 10000,
    'SP-377 (SP310)': 6400, 'CF258X': 10000, 'ES 5112': 12000,
  };

  return (
    <div className="aba">
      <h2>Análise de Consumo e Criticidade por Toner</h2>
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f4f8', borderRadius: '8px', fontSize: '0.9rem', color: '#475569' }}>
        <strong>Estimativa = (nível % × rendimento do toner) ÷ média de páginas/dia. Ordenado do mais urgente ao menos.</strong>
      </div>
      <table className="tabela">
        <thead>
          <tr>
            <th>SETOR</th>
            <th>TONER</th>
            <th style={{ textAlign: 'right' }}>NÍVEL</th>
            <th style={{ textAlign: 'right' }}>PÁGINAS/DIA</th>
            <th style={{ textAlign: 'right' }}>RENDIMENTO</th>
            <th style={{ textAlign: 'right' }}>DIAS RESTANTES</th>
          </tr>
        </thead>
        <tbody>
          {impressoras?.map((p, i) => {
            const rend = RENDIMENTO[p.toner] || 0;
            const diasRestantes = p.contador && rend > 0 ? Math.round(p.contador / (rend / 30)) : '—';
            const critico = diasRestantes !== '—' && diasRestantes <= 7;
            return (
              <tr key={i} className={critico ? 'critico' : ''}>
                <td><strong>{p.setor}</strong></td>
                <td>{p.toner || '—'}</td>
                <td style={{ textAlign: 'right' }}>100%</td>
                <td style={{ textAlign: 'right' }}>265</td>
                <td style={{ textAlign: 'right' }}>{rend?.toLocaleString() || '—'}</td>
                <td style={{ textAlign: 'right', color: critico ? '#ef4444' : '#1e293b', fontWeight: 'bold' }}>
                  {diasRestantes === '—' ? '—' : <span style={{ background: critico ? '#fee2e2' : '#dcfce7', padding: '4px 8px', borderRadius: '4px' }}>{critico ? '🔴 ' : '🟡 '}{diasRestantes} dias</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Movimentacoes({ movimentacoes, carregando, erro }) {
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;

  return (
    <div className="aba">
      <h2>Histórico de Movimentações (QR Code)</h2>
      <div className="info-box">Histórico de toners retirados/devolvidos pelo armário via QR code.</div>
      {movimentacoes.length === 0 ? (
        <div className="info-box">Nenhuma movimentação registrada ainda.</div>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Tipo</th>
              <th>Toner</th>
              <th style={{ textAlign: 'right' }}>Quantidade</th>
              <th>Responsável / Setor</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((m, i) => (
              <tr key={i}>
                <td className="pequeno">{m.data}</td>
                <td>{m.tipo}</td>
                <td><strong>{m.toner}</strong></td>
                <td className="numero">{m.quantidade}</td>
                <td className="pequeno">{m.responsavel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: '2rem', color: '#888', fontSize: '0.9rem' }}>
        📌 <strong>Dica:</strong> As movimentações aparecem aqui 30 segundos depois de serem registradas no QR code.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [abaAtiva, setAbaAtiva] = useState('monitoramento');
  const { impressoras, estoque, repor, carregando, erro, recarregar } = useDashboard({ intervalo: 60000 });
  const { dados: movimentacoes, carregando: movCarregando, erro: movErro, recarregar: movRecarregar } = useMovimentacoes({ intervalo: 30000 });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>📊 Gestão de Impressoras & Toner - UNIFEB TI</h1>
        <div className="header-info">
          <button onClick={() => { recarregar(); movRecarregar(); }} className="btn-refresh">🔄 Atualizar</button>
          <span className="timestamp">Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </header>

      <nav className="abas-navegacao">
        <button className={abaAtiva === 'monitoramento' ? 'ativo' : ''} onClick={() => setAbaAtiva('monitoramento')}>🖨️ Monitoramento</button>
        <button className={abaAtiva === 'contadores' ? 'ativo' : ''} onClick={() => setAbaAtiva('contadores')}>📈 Contadores</button>
        <button className={abaAtiva === 'mapeamento' ? 'ativo' : ''} onClick={() => setAbaAtiva('mapeamento')}>🔗 Mapeamento</button>
        <button className={abaAtiva === 'estoque' ? 'ativo' : ''} onClick={() => setAbaAtiva('estoque')}>📦 Estoque</button>
        <button className={abaAtiva === 'vida-toner' ? 'ativo' : ''} onClick={() => setAbaAtiva('vida-toner')}>🔍 Vida do Toner</button>
        <button className={abaAtiva === 'movimentacoes' ? 'ativo' : ''} onClick={() => setAbaAtiva('movimentacoes')}>📋 Movimentações</button>
      </nav>

      <main className="dashboard-conteudo">
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
