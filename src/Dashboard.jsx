// Componente de Contadores
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

  const colunasVisiveis = indicesVisiveis.map(i => ({
    indice: i,
    data: datasDisponiveis[i]
  }));

  return (
    <div className="aba">
      <h2>Histórico de Contadores</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ color: '#9ca3af', marginRight: '1rem' }}>
          Selecione o período:
        </label>
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
            {colunasVisiveis.map(col => (
              <th key={col.indice}>{col.data}</th>
            ))}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((p, i) => (
            <tr key={i} className={p.online ? '' : 'offline'}>
              <td>{p.setor}</td>
              <td className="codigo">{p.ip}</td>
              <td>
                {p.marca} {p.modelo}
              </td>
              <td className="codigo pequeno">{p.serie || '—'}</td>
              {colunasVisiveis.map(col => (
                <td key={col.indice} className="numero">
                  {p.contadores[col.indice] ? p.contadores[col.indice].toLocaleString('pt-BR') : '—'}
                </td>
              ))}
              <td className="status">
                {p.online ? (
                  <span className="online">● Online</span>
                ) : (
                  <>
                    <span className="offline-badge">● Offline</span>
                    {p.falha && <div className="falha">{p.falha}</div>}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}