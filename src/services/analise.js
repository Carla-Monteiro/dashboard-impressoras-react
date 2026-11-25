/* ============================================================
   Análises sobre o histórico (sem dependência de React)
   - previsão de quando o toner acaba
   - detecção de trocas de toner
   - cruzamento de trocas com retiradas do formulário
   - normalização de nomes de setor
   ============================================================ */
import { familia, parseDataBR } from "./sheetsApi";

const DIA = 86400000;
export const SALTO_TROCA = 30;        // nível subiu 30+ pontos = toner trocado
export const JANELA_RITMO_DIAS = 21;  // usa no máximo as últimas 3 semanas
export const MIN_PONTOS = 3;          // precisa de 3 leituras (em 2+ dias) para prever

/* pontos {d: Date, v: número} do histórico diário de nível */
function pontosNivel(p) {
  const out = [];
  (p.nivelDatas || []).forEach((ds, i) => {
    const v = p.nivelHistorico ? p.nivelHistorico[i] : null;
    const d = parseDataBR(ds);
    if (d && typeof v === "number" && v >= 0 && v <= 100) out.push({ d, v });
  });
  return out.sort((a, b) => a.d - b.d);
}

/* contador de páginas mais próximo (até a data) */
function contadorAte(p, data) {
  let melhor = null;
  (p.datas || []).forEach((ds, i) => {
    const d = parseDataBR(ds);
    const v = p.contadores ? p.contadores[i] : null;
    if (d && v != null && d <= data) melhor = v;
  });
  return melhor;
}

/* Analisa uma impressora: trocas, ritmo de consumo e previsão. */
export function analisarNivel(p) {
  const pts = pontosNivel(p);

  // trocas = subida grande de nível entre duas leituras
  const trocas = [];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].v - pts[i - 1].v >= SALTO_TROCA) {
      trocas.push({ data: pts[i].d, de: pts[i - 1].v, para: pts[i].v });
    }
  }
  // rendimento real = páginas impressas entre uma troca e a seguinte
  trocas.forEach((t, i) => {
    if (i === 0) { t.paginas = null; return; }
    const a = contadorAte(p, trocas[i - 1].data);
    const b = contadorAte(p, t.data);
    t.paginas = a != null && b != null && b > a ? b - a : null;
  });

  // ritmo: regressão linear dos pontos desde a última troca (máx. 21 dias)
  const inicio = trocas.length ? trocas[trocas.length - 1].data : new Date(0);
  const ultimo = pts.length ? pts[pts.length - 1].d : null;
  const usados = pts.filter((x) => x.d >= inicio && ultimo && (ultimo - x.d) / DIA <= JANELA_RITMO_DIAS);
  const diasHistorico = usados.length ? Math.round((usados[usados.length - 1].d - usados[0].d) / DIA) : 0;

  let ritmo = null;          // pontos percentuais por dia (negativo = gastando)
  let diasRestantes = null;
  let dataFim = null;
  if (usados.length >= MIN_PONTOS && diasHistorico >= 2) {
    const xs = usados.map((x) => (x.d - usados[0].d) / DIA);
    const ys = usados.map((x) => x.v);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0, den = 0;
    xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
    ritmo = den > 0 ? num / den : null;
    const nivelAtual = p.nivel != null ? p.nivel : ys[ys.length - 1];
    if (ritmo != null && ritmo < -0.05) {
      diasRestantes = Math.max(0, nivelAtual / -ritmo);
      dataFim = new Date(Date.now() + diasRestantes * DIA);
    }
  }

  return { pontos: pts, trocas, ritmo, diasRestantes, dataFim, diasHistorico, nPontos: usados.length };
}

/* Para cada troca detectada, procura uma retirada do mesmo toner
   no formulário entre 7 dias antes e 3 dias depois. */
export function cruzarTrocas(impressoras, movimentacoes) {
  const saidas = movimentacoes.filter((m) => m.tipo === "saida" && m.quando);
  const usadas = new Set();
  const lista = [];
  impressoras.forEach((p) => {
    const a = analisarNivel(p);
    a.trocas.forEach((t) => {
      const f = familia(p.toner);
      const achou = saidas.find((m, idx) => !usadas.has(idx)
        && familia(m.toner) === f
        && m.quando >= new Date(t.data.getTime() - 7 * DIA)
        && m.quando <= new Date(t.data.getTime() + 3 * DIA)
        && (usadas.add(idx), true));
      lista.push({ p, ...t, registro: achou || null });
    });
  });
  return lista.sort((x, y) => y.data - x.data);
}

/* "Colégio FEB ", "colegio feb" -> "colegio feb" */
export function chaveSetor(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/* agrupa variações de escrita e devolve o nome mais usado de cada grupo */
export function nomesCanonicos(nomes) {
  const grupos = new Map();
  nomes.filter(Boolean).forEach((n) => {
    const k = chaveSetor(n);
    if (!k) return;
    const g = grupos.get(k) || new Map();
    const limpo = String(n).trim();
    g.set(limpo, (g.get(limpo) || 0) + 1);
    grupos.set(k, g);
  });
  const out = new Map();
  grupos.forEach((g, k) => {
    const [nome] = [...g.entries()].sort((a, b) => b[1] - a[1])[0];
    out.set(k, { nome, variacoes: [...g.keys()] });
  });
  return out;
}

/* impressoras de um setor (casamento tolerante: um nome contém o outro) */
export function impressorasDoSetor(impressoras, setor) {
  const k = chaveSetor(setor);
  if (!k) return [];
  return impressoras.filter((p) => {
    const kp = chaveSetor(p.setor);
    return kp && (kp === k || kp.includes(k) || k.includes(kp));
  });
}
