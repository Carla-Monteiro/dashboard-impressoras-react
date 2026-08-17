import { useState, useEffect, useCallback, useMemo } from 'react';

const BASE = '/api/sheets';

async function listar(aba) {
  const res = await fetch(`${BASE}?aba=${aba}`);
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(corpo.erro || `Erro ${res.status}`);
  // a API pode devolver {erro: "..."} com status 200, ou algo inesperado.
  // Garante array para quem consome não quebrar com .forEach/.map.
  if (!Array.isArray(corpo)) {
    console.error(`[sheetsApi] aba "${aba}" nao devolveu lista:`, corpo);
    throw new Error(corpo?.erro || `Resposta inesperada da aba "${aba}"`);
  }
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

/* Converte o NIVEL_TONER da planilha em número 0-100, ou null.
   A célula pode vir vazia (marca não informa) ou como texto. */
function parseNivel(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
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
      setDados([]);          // nunca deixa o estado virar não-array
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
  const impRaw = useAba('impressoras', { intervalo });
  const estRaw = useAba('estoque', { intervalo });
  const cntRaw = useAba('contadores', { intervalo });

  /* Blindagem: se qualquer aba devolver algo que não seja lista,
     trata como vazia em vez de quebrar a tela inteira. */
  const imp = { ...impRaw, dados: Array.isArray(impRaw.dados) ? impRaw.dados : [] };
  const est = { ...estRaw, dados: Array.isArray(estRaw.dados) ? estRaw.dados : [] };
  const cnt = { ...cntRaw, dados: Array.isArray(cntRaw.dados) ? cntRaw.dados : [] };

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

        /* ------------------------------------------------------------
           STATUS: vem da coluna F que o leitor.py grava, não mais de
           "contador é null logo está offline". A inferência antiga
           marcava offline qualquer impressora sem leitura do dia.
           Fallback para o contador só se a coluna estiver vazia.
           ------------------------------------------------------------ */
        const statusPlanilha = String(p.status || '').trim().toLowerCase();
        const online = statusPlanilha
          ? statusPlanilha === 'online'
          : (c ? c.online : false);

        /* ------------------------------------------------------------
           FALHA: prioriza o erro real detectado via SNMP
           ("Papel atolado", "Sem papel"). Só cai no texto genérico
           quando não há erro específico.
           ------------------------------------------------------------ */
        const erroDetectado = String(p.erro_detectado || '').trim();
        let falha = null;
        if (erroDetectado) {
          falha = erroDetectado;
        } else if (!online) {
          falha = c && c.falha ? c.falha : 'Sem resposta SNMP';
        }

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

          online,
          falha,
          erro: erroDetectado || null,       // só o problema específico
          nivel: parseNivel(p.nivel_toner),  // 0-100 ou null

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

  /* impressoras online mas com problema reportado (sem papel, atolada...) */
  const comProblema = useMemo(
    () => impressoras.filter((p) => p.erro),
    [impressoras]
  );

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
    comProblema,
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
      const formatado = (Array.isArray(mov) ? mov : []).map((m) => ({
        data: m.carimbo_de_data_hora || m['carimbo de data/hora'] || '—',
        tipo: m.tipo_de_movimentacao || m['tipo de movimentacao'] || '—',
        toner: m.modelo_do_toner || m['modelo do toner'] || '—',
        quantidade: m.quantidade || '—',
        responsavel: m.responsavel_e_setor_de_destino || m['responsavel e setor de destino'] || '—',
      }));
      setDados(formatado);
    } catch (e) {
      setErro(e.message);
      setDados([]);
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