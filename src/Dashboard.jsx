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
  const [indiceData, setIndiceData] = useState(0);
  
  if (carregando) return <div className="loading">Carregando...</div>;
  if (erro) return <div className="erro">Erro: {erro}</div>;
  if (!dados.length) return <div className="loading">Sem dados de contadores</div>;

  const datasDisponiveis = dados[0]?.datas || [];
  const indicesVisiveis = [
    Math.max(0, datasDisponiveis.length - 2 - indiceData),
    Math.max(0, datasDisponiveis.length - 1 - indiceData)
  ].filter(i => datasDisponiveis[i]);

  const colunasVisiveis = indicesVisiveis.map(i => ({ indice: i, data: datasDisponiveis[i] }));

  return (
    <div className="aba">
      <h2>Histórico de Contadores</h2>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: '#9ca3af', marginRight: '1rem' }}>Selecione o período:</label>
        <select 
          value={indiceData} 
          onChange={(e) => setIndiceData(Number(e.target.value))}
          style={{
            padding: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: '#1a1f26',
            color: '#e5e7eb',
            border: '1px solid #374151',
            cursor: 'pointer'
          }}
        >
          {datasDisponiveis.map((data, i) => (
            <option key={i} value={datasDisponiveis.length - 2 - i}>
              {datasDisponiveis.length - 1 - i === 0 ? 'Hoje' : `${datasDisponiveis.length - 1 - i} dia(s) atrás`} ({data})
            </option>
          ))}
        </select>
      </div>

      <table className="tabela">
        <thead>
          <tr>
            <th>Setor</th>
            <th>IP</th>
            <th>Marca / Modelo</th>
            <th>Série</th>
            {colunasVisiveis.map(col => (<th key={col.indice}>{col.data}</th>))}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((p, i) => (
            <tr key={i} className={p.online ? '' : 'offline'}>
              <td>{p.setor}</td>
              <td className="codigo">{p.ip}</td>
              <td>{p.marca} {p.modelo}</td>
              <td className="codigo pequeno">{p.serie || '—'}</td>
              {colunasVisiveis.map(col => (
                <td key={col.indice} className="numero">
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
            <th>Estoque Atual</th>
            <th>Mínimo</th>
            <th>Status</th>
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
                <td className={precisa ? 'repor' : 'ok'}>{precisa ? '🔴 REPOR' : '✓ OK'}</td>
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
  impressoras.forEach((p) => {
    if (p.toners.length > 0) {
      p.toners.forEach((t) => {
        const chave = t.modelo_toner;
        if (!porToner.has(chave)) porToner.set(chave, { toner: t, impressoras: [] });
        porToner.get(chave).impressoras.push(p.setor);
      });
    }
  });

  const analise = Array.from(porToner.values()).sort((a, b) => b.impressoras.length - a.impressoras.length);

  return (
    <div className="aba">
      <h2>Análise de Consumo por Toner</h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Toner</th>
            <th>Saldo</th>
            <th>Impressoras Usando</th>
            <th>Criticidade</th>
          </tr>
        </thead>
        <tbody>
          {analise.map((item, i) => {
            const saldo = Number(item.toner.estoque_atual);
            const impressoras = item.impressoras.length;
            const critico = saldo <= 1 && impressoras >= 5;
            return (
              <tr key={i} className={critico ? 'critico' : ''}>
                <td>{item.toner.modelo_toner}</td>
                <td className={`numero ${saldo <= 2 ? 'baixo' : ''}`}>{saldo}</td>
                <td>{impressoras}</td>
                <td>{critico ? '🔴 CRÍTICO' : impressoras >= 5 ? '🟡 ALTO' : '🟢 BAIXO'}</td>
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
              <th>Quantidade</th>
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
