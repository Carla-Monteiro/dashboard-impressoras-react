if (req.query.aba === 'contadores') {
  const datas = linhas[0].slice(5).map((d) => String(d));
  const ultimasDatas = datas.slice(-7);  // últimos 7 dias

  dados = dados.map((o) => {
    const historicoCompleto = ultimasDatas
      .map((d) => ({ data: d, valor: o[chave(d)] }))
      .filter((h) => h.valor !== '');

    const ultimaDia = ultimasDatas[ultimasDatas.length - 1];
    const bruto = o[chave(ultimaDia)];
    const numero = typeof bruto === 'number' ? bruto : null;

    return {
      _row: o._row,
      setor: o.setor,
      ip: o.ip,
      marca: o.marca,
      modelo: o.modelo,
      datas: ultimasDatas,  // NOVO: todas as datas
      contadores: ultimasDatas.map(d => {
        const val = o[chave(d)];
        return typeof val === 'number' ? val : null;
      }),  // NOVO: array de contadores por data
      data_leitura: ultimaDia,
      contador: numero,
      online: numero !== null,
      falha: numero === null ? String(bruto || 'sem leitura') : null,
      historico: historicoCompleto,
    };
  });
}