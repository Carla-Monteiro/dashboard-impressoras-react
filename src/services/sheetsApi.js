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

/* ------------------------------------------------------------
   Utilitários
   ------------------------------------------------------------ */
const CORES = ['black', 'cyan', 'magenta', 'yellow', 'preto', 'ciano', 'amarelo'];

/* "GPR-31 CYAN" e "GPR-31" pertencem à mesma família de toner.
   Usado para ligar impressora ↔ estoque mesmo com toners coloridos. */
export function familia(toner) {
  const t = String(toner || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const partes = t.split(' ');
  if (partes.length > 1 && CORES.includes(partes[partes.length - 1])) {
    return partes.slice(0, -1).join(' ');
  }
  return t;
}

/* Converte o NIVEL_TONER da planilha em número 0-100, ou null. */
function parseNivel(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

/* "24/11/2026" ou "24/11/2026 11:38:20" -> Date (horário local) */
export function parseDataBR(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, d, mo, a, h = 0, mi = 0, se = 0] = m;
  return new Date(Number(a), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se));
}

/* Procura um campo pelo começo do nome normalizado. Deixa a leitura
   do formulário resistente a pequenas mudanças no cabeçalho
   (espaços, acentos, "data/hora", etc). */
function campo(obj, ...prefixos) {
  const chaves = Object.keys(obj);
  for (const p of prefixos) {
    const k = chaves.find((c) => c.startsWith(p));
    if (k && String(obj[k]).trim() !== '') return String(obj[k]).trim();
  }
  return '';
}

/* "Saídas", "Saída", "Retirada" -> "saida"; "Entradas", "Devolução" -> "entrada" */
function normalizaTipo(t) {
  const s = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  if (s.startsWith('said') || s.startsWith('retir')) return 'saida';
  if (s.startsWith('entr') || s.startsWith('devol') || s.startsWith('compr')) return 'entrada';
  return 'outro';
}

/* ------------------------------------------------------------
   Hooks
   ------------------------------------------------------------ */
export function useAba(aba, { intervalo, opcional = false } = {}) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setErro(null);
      setDados(await listar(aba));
    } catch (e) {
      if (!opcional) setErro(e.message);
      setDados([]);          // nunca deixa o estado virar não-array
    } finally {
      setCarregando(false);
    }
  }, [aba, opcional]);

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
  // aba "Status Coleta" é gravada pelo leitor.py novo; se ainda não existir,
  // o dashboard funciona normalmente, só sem o horário real da coleta.
  const colRaw = useAba('coleta', { intervalo, opcional: true });

  // useAba sempre devolve array (ver listar/recarregar), então dá para usar direto
  const imp = impRaw.dados;
  const est = estRaw.dados;
  const cnt = cntRaw.dados;
  const col = colRaw.dados;

  const porFamilia = useMemo(() => {
    const m = new Map();
    est.forEach((e) => {
      const f = familia(e.modelo_toner);
      if (!m.has(f)) m.set(f, []);
      m.get(f).push(e);
    });
    return m;
  }, [est]);

  const porIp = useMemo(() => {
    const m = new Map();
    cnt.forEach((c) => m.set(String(c.ip).trim(), c));
    return m;
  }, [cnt]);

  const impressoras = useMemo(
    () =>
      imp.map((p) => {
        const c = porIp.get(String(p.ip).trim());

        /* STATUS (coluna F, gravada pelo leitor.py):
           "Online"         -> respondeu SNMP
           "Online (PING)"  -> responde ping, mas não SNMP (sem contador/toner)
           "Offline"        -> não responde */
        const statusPlanilha = String(p.status || '').trim().toLowerCase();
        const online = statusPlanilha
          ? statusPlanilha.startsWith('online')
          : (c ? c.online : false);
        const soPing = statusPlanilha.includes('ping');

        const erroDetectado = String(p.erro_detectado || '').trim();
        let falha = null;
        if (erroDetectado) falha = erroDetectado;
        else if (!online) falha = 'Não responde (desligada ou fora da rede?)';
        else if (soPing) falha = 'Responde ping, mas não SNMP';

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
          soPing,
          falha,
          erro: erroDetectado || null,
          nivel: parseNivel(p.nivel_toner),

          datas: c ? c.datas : [],
          contadores: c ? c.contadores : [],
        };
      }),
    [imp, porFamilia, porIp]
  );

  const repor = useMemo(
    () => est.filter((e) => Number(e.estoque_atual) <= Number(e.minimo_estipulado)),
    [est]
  );

  const offline = useMemo(() => impressoras.filter((p) => !p.online), [impressoras]);
  const comProblema = useMemo(() => impressoras.filter((p) => p.erro), [impressoras]);

  /* hora real da última coleta (aba Status Coleta) */
  const coleta = useMemo(() => {
    const kv = {};
    col.forEach((l) => { if (l.chave) kv[String(l.chave).trim()] = l.valor; });
    const quando = parseDataBR(kv.ultima_coleta);
    return {
      quando,
      duracao: kv.duracao_segundos != null && kv.duracao_segundos !== '' ? Number(kv.duracao_segundos) : null,
    };
  }, [col]);

  return {
    impressoras,
    estoque: est,
    repor,
    offline,
    comProblema,
    coleta,
    carregando: impRaw.carregando || estRaw.carregando || cntRaw.carregando,
    erro: impRaw.erro || estRaw.erro || cntRaw.erro,
    recarregar: () => Promise.all([impRaw.recarregar(), estRaw.recarregar(), cntRaw.recarregar(), colRaw.recarregar()]),
  };
}

export function useMovimentacoes({ intervalo } = {}) {
  const { dados: mov, carregando, erro, recarregar } = useAba('movimentacoes', { intervalo });

  const dados = useMemo(() => {
    const lista = (Array.isArray(mov) ? mov : []).map((m) => {
      const data = campo(m, 'carimbo');
      const tipoTexto = campo(m, 'tipo');
      const setor = campo(m, 'setor', 'responsavel_e_setor');
      const quem = campo(m, 'quem', 'responsavel');
      return {
        data,
        quando: parseDataBR(data),
        tipo: normalizaTipo(tipoTexto),
        tipoTexto: tipoTexto || '—',
        toner: campo(m, 'modelo') || '—',
        quantidade: Number(campo(m, 'quantidade')) || 0,
        setor,
        quem,
      };
    }).filter((m) => m.data || m.toner !== '—');
    // mais recentes primeiro
    lista.sort((a, b) => (b.quando?.getTime() || 0) - (a.quando?.getTime() || 0));
    return lista;
  }, [mov]);

  return { dados, carregando, erro, recarregar };
}

/* ------------------------------------------------------------
   Consumo (páginas impressas) a partir dos contadores diários.
   O volume de um dia = contador do dia − última leitura anterior.
   Leituras que diminuem (troca de placa/reset) são ignoradas, e também
   saltos com mais de MAX_LACUNA_DIAS sem leitura (ex.: coleta parada por
   semanas) — senão todo o período parado cairia num único dia. */
const MAX_LACUNA_DIAS = 4;
/*
   ------------------------------------------------------------ */
export function calcularConsumo(impressoras, dias = 30) {
  const datas = impressoras.find((p) => p.datas?.length)?.datas || [];
  const objs = datas.map(parseDataBR);
  // janela termina na data mais recente da planilha (não em "hoje"),
  // assim o gráfico continua útil mesmo se a coleta parou por uns dias.
  const ultima = objs.filter(Boolean).reduce((a, b) => (b > a ? b : a), new Date(0));
  const limite = new Date(ultima.getFullYear(), ultima.getMonth(), ultima.getDate() - (dias - 1));

  const porDia = new Map();       // "dd/mm/aaaa" -> páginas
  const porSetor = new Map();     // setor -> páginas
  datas.forEach((d, i) => { if (objs[i] && objs[i] >= limite) porDia.set(d, 0); });

  impressoras.forEach((p) => {
    let anterior = null;
    let dataAnterior = null;
    (p.contadores || []).forEach((v, i) => {
      if (v == null) return;
      const lacunaOk = dataAnterior && objs[i] && (objs[i] - dataAnterior) / 86400000 <= MAX_LACUNA_DIAS;
      if (anterior != null && lacunaOk && v >= anterior && objs[i] >= limite) {
        const delta = v - anterior;
        porDia.set(datas[i], (porDia.get(datas[i]) || 0) + delta);
        const s = p.setor || '—';
        porSetor.set(s, (porSetor.get(s) || 0) + delta);
      }
      anterior = v;
      dataAnterior = objs[i];
    });
  });

  return {
    diario: Array.from(porDia, ([data, paginas]) => ({ data, paginas })),
    setores: Array.from(porSetor, ([setor, paginas]) => ({ setor, paginas }))
      .filter((s) => s.paginas > 0)
      .sort((a, b) => b.paginas - a.paginas),
  };
}
