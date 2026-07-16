import { useState, useEffect, useCallback, useMemo } from 'react';

const BASE = '/api/sheets';

async function listar(aba) {
  const res = await fetch(`${BASE}?aba=${aba}`);
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(corpo.erro || `Erro ${res.status}`);
  return corpo;
}

const CORES = ['black', 'cyan', 'magenta', 'yellow'];
function familia(toner) {
  const t = String(toner || '').trim().toLowerCase();
  const partes = t.split(/\s+/);
  if (partes.length > 1 && CORES.includes(partes[partes.length - 1])) {
    return partes.slice(0, -1).join(' ');
  }
  return t;
}

export function useAba(aba, { intervalo } = {}) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setErro(null);
      setDados(await listar(aba));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [aba]);

  useEffect(() => {
    let vivo = true;
    const rodar = () => { if (vivo) recarregar(); };
    rodar();
    if (!intervalo) return () => { vivo = false; };
    const id = setInterval(rodar, intervalo);
    return () => { vivo = false; clearInterval(id); };
  }, [recarregar, intervalo]);

  return { dados, carregando, erro, recarregar };
}

export function useDashboard({ intervalo } = {}) {
  const imp = useAba('impressoras', { intervalo });
  const est = useAba('estoque', { intervalo });
  const cnt = useAba('contadores', { intervalo });

  const porFamilia = useMemo(() => {
    const m = new Map();
    est.dados.forEach((e) => {
      const f = familia(e.modelo_toner);
      if (!m.has(f)) m.set(f, []);
      m.get(f).push(e);
    });
    return m;
  }, [est.dados]);

  const porIp = useMemo(() => {
    const m = new Map();
    cnt.dados.forEach((c) => m.set(String(c.ip).trim(), c));
    return m;
  }, [cnt.dados]);

  const impressoras = useMemo(
    () =>
      imp.dados.map((p) => {
        const c = porIp.get(String(p.ip).trim());
        return {
          setor: p.setor,
          ip: p.ip,
          marca: p.marca_impressora,
          modelo: p.modelo_impressora,
          serie: p.serie,
          toner: p.modelo_toner_compativel,
          destaque: p.destaque_suporte,
          toners: porFamilia.get(familia(p.modelo_toner_compativel)) || [],
          contador: c ? c.contador : null,
          data_leitura: c ? c.data_leitura : null,
          online: c ? c.online : false,
          falha: c ? c.falha : 'sem leitura',
          historico: c ? c.historico : [],
          datas: c ? c.datas : [],
          contadores: c ? c.contadores : [],
        };
      }),
    [imp.dados, porFamilia, porIp]
  );

  const repor = useMemo(
    () => est.dados.filter((e) => Number(e.estoque_atual) <= Number(e.minimo_estipulado)),
    [est.dados]
  );

  const offline = useMemo(() => impressoras.filter((p) => !p.online), [impressoras]);

  const semToner = useMemo(
    () => impressoras.filter((p) => p.toner && p.toners.length === 0),
    [impressoras]
  );

  const tonerOrfao = useMemo(() => {
    const usadas = new Set(impressoras.map((p) => familia(p.toner)).filter(Boolean));
    return est.dados.filter((e) => !usadas.has(familia(e.modelo_toner)));
  }, [impressoras, est.dados]);

  return {
    impressoras,
    estoque: est.dados,
    repor,
    offline,
    semToner,
    tonerOrfao,
    carregando: imp.carregando || est.carregando || cnt.carregando,
    erro: imp.erro || est.erro || cnt.erro,
    recarregar: () => Promise.all([imp.recarregar(), est.recarregar(), cnt.recarregar()]),
  };
}

export function useMovimentacoes({ intervalo } = {}) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setErro(null);
      const mov = await listar('movimentacoes');
      const formatado = mov.map((m) => ({
        data: m.carimbo_de_data_hora || m['carimbo de data/hora'] || '—',
        tipo: m.tipo_de_movimentacao || m['tipo de movimentacao'] || '—',
        toner: m.modelo_do_toner || m['modelo do toner'] || '—',
        quantidade: m.quantidade || '—',
        responsavel: m.responsavel_e_setor_de_destino || m['responsavel e setor de destino'] || '—',
      }));
      setDados(formatado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    const rodar = () => { if (vivo) recarregar(); };
    rodar();
    if (!intervalo) return () => { vivo = false; };
    const id = setInterval(rodar, intervalo);
    return () => { vivo = false; clearInterval(id); };
  }, [recarregar, intervalo]);

  return { dados, carregando, erro, recarregar };
}