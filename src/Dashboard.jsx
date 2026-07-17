import React, { useState } from 'react';
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
    <div className="rounded-xl p-4" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: COR.ink }}>
        <Package size={16} style={{ color: COR.accent }} /> Últimas movimentações
      </div>

      {movimentacoes.length === 0 ? (
        <div className="py-10 text-center text-sm leading-relaxed" style={{ color: COR.sub }}>
          Nenhuma movimentação lançada ainda.<br />Registre uma retirada acima.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: COR.sub }}>
                {["Data / Hora", "Tipo", "Toner", "Quantidade", "Responsável"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m, i) => {
                const cor = m.tipo === "Retirada" ? COR.offline : COR.online;
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${COR.border}` }}>
                    <td className="whitespace-nowrap px-3 py-2.5" style={{ color: COR.sub }}>{m.data}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold"
                        style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}66` }}>
                        {m.tipo === "Retirada" ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: COR.ink }}>{m.toner}</td>
                    <td className="px-3 py-2.5 tabular-nums" style={{ color: COR.ink }}>{m.quantidade}</td>
                    <td className="px-3 py-2.5" style={{ color: COR.sub }}>{m.responsavel || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
 )}
    </div>
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
