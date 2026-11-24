import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ChevronDown, ChevronRight, ClipboardCopy, Download, Search,
  PackageX, TrendingDown, Check,
} from "lucide-react";
import { COR, Dot, BarraNivel, statusMeta, statusDe } from "./ui";
import { familia } from "./services/sheetsApi";

/* ------------------------------------------------------------
   Regras (ajuste aqui se quiser)
   ------------------------------------------------------------ */
const JANELA_CONSUMO_DIAS = 90;   // média de consumo dos últimos 90 dias
const MESES_COBERTURA = 2;        // sugestão de compra cobre 2 meses
const NIVEL_ALERTA = 20;          // impressora com toner <= 20% vai pedir troca logo

const LINHA = "1px solid " + COR.border;
const chaveModelo = (t) => String(t || "").trim().toUpperCase().replace(/\s+/g, " ");
const fmtData = (d) => (d ? d.toLocaleDateString("pt-BR") : "—");

/* situação de cada toner, da mais urgente para a menos urgente */
const SITUACAO = {
  zerado:  { ordem: 0, label: "Zerado",       cor: COR.offline },
  repor:   { ordem: 1, label: "Repor",        cor: COR.offline },
  atencao: { ordem: 2, label: "Acaba logo",   cor: COR.erro },
  ok:      { ordem: 3, label: "OK",           cor: COR.online },
  parado:  { ordem: 4, label: "Sem uso",      cor: COR.faint },
};

function Chip({ cor, children, title }) {
  return (
    <span title={title} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: cor, background: cor + "1f", border: "1px solid " + cor + "44" }}>{children}</span>
  );
}

function Th({ children, onClick, ativo, dir, align = "left", title }) {
  return (
    <th onClick={onClick} title={title}
      className={"px-3 py-3 text-xs font-semibold uppercase tracking-wide " + (onClick ? "cursor-pointer select-none" : "")}
      style={{ color: ativo ? COR.accent : COR.sub, borderBottom: LINHA, textAlign: align, whiteSpace: "nowrap" }}>
      {children}{ativo ? (dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );
}

export default function Estoque({ estoque, impressoras, movimentacoes }) {
  const [busca, setBusca] = useState("");
  const [fab, setFab] = useState("todos");
  const [soComprar, setSoComprar] = useState(false);
  const [ordem, setOrdem] = useState({ campo: "situacao", dir: 1 });
  const [aberto, setAberto] = useState(null);
  const [copiado, setCopiado] = useState(false);

  /* consumo por modelo, a partir do formulário de movimentações */
  const consumo = useMemo(() => {
    const limite = Date.now() - JANELA_CONSUMO_DIAS * 86400000;
    const m = new Map();
    movimentacoes.forEach((mv) => {
      if (mv.tipo !== "saida") return;
      const k = chaveModelo(mv.toner);
      const c = m.get(k) || { qtdJanela: 0, ultima: null, ultimaSetor: "", total: 0 };
      c.total += mv.quantidade;
      if (mv.quando && mv.quando.getTime() >= limite) c.qtdJanela += mv.quantidade;
      if (mv.quando && (!c.ultima || mv.quando > c.ultima)) { c.ultima = mv.quando; c.ultimaSetor = mv.setor; }
      m.set(k, c);
    });
    return m;
  }, [movimentacoes]);

  /* início real dos registros: se o formulário começou há menos de 90 dias,
     a média mensal usa o período que existe de fato */
  const diasJanela = useMemo(() => {
    const datas = movimentacoes.map((m) => m.quando).filter(Boolean);
    if (!datas.length) return JANELA_CONSUMO_DIAS;
    const primeira = Math.min(...datas.map((d) => d.getTime()));
    const dias = (Date.now() - primeira) / 86400000;
    return Math.max(30, Math.min(JANELA_CONSUMO_DIAS, dias));
  }, [movimentacoes]);

  const linhas = useMemo(() => estoque.map((e) => {
    const atual = Number(e.estoque_atual) || 0;
    const minimo = Number(e.minimo_estipulado) || 0;
    const c = consumo.get(chaveModelo(e.modelo_toner)) || { qtdJanela: 0, ultima: null, ultimaSetor: "", total: 0 };
    const porMes = c.qtdJanela / (diasJanela / 30);
    const mesesRestantes = porMes > 0 ? atual / porMes : null;

    const f = familia(e.modelo_toner);
    const usam = impressoras.filter((p) => f && familia(p.toner) === f);
    const niveis = usam.map((p) => p.nivel).filter((n) => n != null);
    const menorNivel = niveis.length ? Math.min(...niveis) : null;
    const trocasProximas = usam.filter((p) => p.nivel != null && p.nivel <= NIVEL_ALERTA).length;

    const alvo = Math.max(minimo + 1, Math.ceil(porMes * MESES_COBERTURA) + trocasProximas);
    const comprar = Math.max(0, alvo - atual);

    let situacao = "ok";
    if (atual === 0 && (usam.length || porMes > 0)) situacao = "zerado";
    else if (atual <= minimo) situacao = "repor";
    else if ((mesesRestantes != null && mesesRestantes < 1) || trocasProximas >= atual) situacao = "atencao";
    else if (!usam.length && porMes === 0) situacao = "parado";

    return {
      e, atual, minimo, porMes, mesesRestantes, usam, menorNivel, trocasProximas,
      comprar, situacao, ultima: c.ultima, ultimaSetor: c.ultimaSetor,
      familia: f,
    };
  }), [estoque, impressoras, consumo, diasJanela]);

  const fabricantes = useMemo(
    () => ["todos", ...Array.from(new Set(estoque.map((e) => e.fabricante).filter(Boolean))).sort()],
    [estoque]
  );

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const lst = linhas.filter((l) => {
      if (fab !== "todos" && l.e.fabricante !== fab) return false;
      if (soComprar && l.comprar === 0) return false;
      if (!t) return true;
      return String(l.e.modelo_toner).toLowerCase().includes(t)
        || String(l.e.fabricante).toLowerCase().includes(t)
        || l.usam.some((p) => String(p.setor).toLowerCase().includes(t));
    });
    const val = (l) => {
      switch (ordem.campo) {
        case "modelo": return String(l.e.modelo_toner);
        case "atual": return l.atual;
        case "consumo": return -l.porMes;
        case "duracao": return l.mesesRestantes == null ? 1e9 : l.mesesRestantes;
        case "usam": return -l.usam.length;
        case "comprar": return -l.comprar;
        default: return SITUACAO[l.situacao].ordem * 1000 + (l.mesesRestantes == null ? 999 : l.mesesRestantes);
      }
    };
    return [...lst].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x < y) return -1 * ordem.dir;
      if (x > y) return 1 * ordem.dir;
      return String(a.e.modelo_toner).localeCompare(String(b.e.modelo_toner));
    });
  }, [linhas, busca, fab, soComprar, ordem]);

  const ordenar = (campo) => setOrdem((o) => ({ campo, dir: o.campo === campo ? -o.dir : 1 }));

  const listaCompra = linhas.filter((l) => l.comprar > 0)
    .sort((a, b) => SITUACAO[a.situacao].ordem - SITUACAO[b.situacao].ordem);
  const totalComprar = listaCompra.reduce((s, l) => s + l.comprar, 0);

  const textoCompra = () => [
    "Lista de compras de toner — " + new Date().toLocaleDateString("pt-BR"),
    "",
    ...listaCompra.map((l) => "- " + l.comprar + "x " + l.e.modelo_toner + " (" + l.e.fabricante + ") — em estoque: " + l.atual),
    "",
    "Total: " + totalComprar + " unidade(s)",
  ].join("\n");

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoCompra());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      window.prompt("Copie a lista:", textoCompra());
    }
  };

  const exportarCsv = () => {
    const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const cab = ["Fabricante", "Modelo", "Em estoque", "Mínimo", "Consumo/mês", "Duração (meses)", "Impressoras", "Situação", "Comprar", "Última retirada"];
    const rows = visiveis.map((l) => [
      l.e.fabricante, l.e.modelo_toner, l.atual, l.minimo, l.porMes.toFixed(1).replace(".", ","),
      l.mesesRestantes == null ? "" : l.mesesRestantes.toFixed(1).replace(".", ","),
      l.usam.length, SITUACAO[l.situacao].label, l.comprar, fmtData(l.ultima),
    ]);
    const csv = "\uFEFF" + [cab, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "estoque-toner-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click(); URL.revokeObjectURL(url);
  };

  const duracaoTxt = (l) => {
    if (l.mesesRestantes == null) return l.atual > 0 ? "sem consumo" : "—";
    if (l.mesesRestantes < 1) return "~" + Math.max(1, Math.round(l.mesesRestantes * 30)) + " dias";
    return "~" + l.mesesRestantes.toFixed(1).replace(".", ",") + " meses";
  };

  return (
    <div className="space-y-4">
      {/* LISTA DE COMPRAS */}
      <section className="rounded-xl p-4" style={{ background: COR.panel, border: LINHA }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: COR.ink }}>
              <PackageX size={16} style={{ color: COR.accent }} /> Sugestão de compra
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: COR.faint }}>
              Para cobrir {MESES_COBERTURA} meses de consumo (média das retiradas dos últimos {Math.round(diasJanela)} dias),
              nunca abaixo do mínimo, somando as impressoras com toner ≤ {NIVEL_ALERTA}%.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={copiar} disabled={!listaCompra.length}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: COR.accentSoft, color: COR.accent, border: LINHA, opacity: listaCompra.length ? 1 : 0.5 }}>
              {copiado ? <Check size={14} /> : <ClipboardCopy size={14} />}{copiado ? "Copiado!" : "Copiar lista"}
            </button>
            <button onClick={exportarCsv} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: COR.panelAlt, color: COR.sub, border: LINHA }}>
              <Download size={14} /> Exportar planilha
            </button>
          </div>
        </div>
        {listaCompra.length === 0 ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: COR.online }}><Check size={16} /> Nada para comprar agora.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {listaCompra.map((l) => (
              <div key={l.e.modelo_toner} className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{ background: COR.panelAlt, border: "1px solid " + SITUACAO[l.situacao].cor + "55" }}>
                <span className="mono text-base font-bold" style={{ color: COR.ink }}>{l.comprar}×</span>
                <span className="text-sm" style={{ color: COR.ink }}>{l.e.modelo_toner}</span>
                <span className="text-xs" style={{ color: COR.faint }}>tem {l.atual}</span>
              </div>
            ))}
            <div className="flex items-center px-2 text-xs" style={{ color: COR.sub }}>Total: <b className="ml-1" style={{ color: COR.ink }}>{totalComprar} un.</b></div>
          </div>
        )}
      </section>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <Search size={16} className="absolute top-1/2 -translate-y-1/2" style={{ left: 12, color: COR.faint }} />
          <input value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder="Buscar toner, fabricante ou setor..."
            className="w-full rounded-lg py-2.5 pl-9 pr-3 text-sm outline-none" style={{ background: COR.panel, border: LINHA, color: COR.ink }} />
        </div>
        <div className="flex flex-wrap gap-1">
          {fabricantes.map((f) => (
            <button key={f} onClick={() => setFab(f)} className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: fab === f ? COR.accentSoft : COR.panel, color: fab === f ? COR.accent : COR.sub, border: LINHA }}>
              {f === "todos" ? "Todos" : f}
            </button>
          ))}
        </div>
        <button onClick={() => setSoComprar((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: soComprar ? COR.offline + "22" : COR.panel, color: soComprar ? COR.offline : COR.sub, border: LINHA }}>
          <TrendingDown size={14} /> Só o que precisa comprar
        </button>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto rounded-xl" style={{ border: LINHA }}>
        <table className="w-full border-collapse text-sm">
          <thead><tr style={{ background: COR.panelAlt }}>
            <Th onClick={() => ordenar("modelo")} ativo={ordem.campo === "modelo"} dir={ordem.dir}>Toner</Th>
            <Th onClick={() => ordenar("atual")} ativo={ordem.campo === "atual"} dir={ordem.dir}>Em estoque</Th>
            <Th onClick={() => ordenar("consumo")} ativo={ordem.campo === "consumo"} dir={ordem.dir} title="Média de unidades retiradas por mês">Consumo/mês</Th>
            <Th onClick={() => ordenar("duracao")} ativo={ordem.campo === "duracao"} dir={ordem.dir} title="Quanto tempo o estoque dura no ritmo atual">Dura</Th>
            <Th onClick={() => ordenar("usam")} ativo={ordem.campo === "usam"} dir={ordem.dir}>Impressoras</Th>
            <Th>Última retirada</Th>
            <Th onClick={() => ordenar("situacao")} ativo={ordem.campo === "situacao"} dir={ordem.dir}>Situação</Th>
            <Th onClick={() => ordenar("comprar")} ativo={ordem.campo === "comprar"} dir={ordem.dir} align="right">Comprar</Th>
          </tr></thead>
          <tbody>
            {visiveis.map((l) => {
              const s = SITUACAO[l.situacao];
              const abrir = aberto === l.e.modelo_toner;
              const pct = Math.min(100, (l.atual / Math.max(1, l.minimo * 2)) * 100);
              return (
                <React.Fragment key={l.e.modelo_toner}>
                  <tr className="row-hover transition-colors" style={{ background: COR.panel }}>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                      <div className="font-medium" style={{ color: COR.ink }}>{l.e.modelo_toner}</div>
                      <div className="text-xs" style={{ color: COR.faint }}>{l.e.fabricante}</div>
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                      <div className="flex items-center gap-2">
                        <span className="mono text-base font-bold" style={{ color: l.atual <= l.minimo ? COR.offline : COR.ink, minWidth: 22 }}>{l.atual}</span>
                        <div className="h-1.5 rounded-full" style={{ width: 56, background: COR.panelAlt }} title={"mínimo " + l.minimo}>
                          <div className="h-1.5 rounded-full" style={{ width: pct + "%", background: s.cor }} />
                        </div>
                      </div>
                      <div className="text-xs" style={{ color: COR.faint }}>mín. {l.minimo}</div>
                    </td>
                    <td className="mono px-3 py-2.5" style={{ color: l.porMes > 0 ? COR.ink : COR.faint, borderBottom: LINHA }}>
                      {l.porMes > 0 ? l.porMes.toFixed(1).replace(".", ",") : "0"}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: l.mesesRestantes != null && l.mesesRestantes < 1 ? COR.erro : COR.sub, borderBottom: LINHA, whiteSpace: "nowrap" }}>
                      {duracaoTxt(l)}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                      {l.usam.length > 0 ? (
                        <button onClick={() => setAberto(abrir ? null : l.e.modelo_toner)} className="flex items-center gap-1 text-xs font-medium" style={{ color: COR.accent }}>
                          {abrir ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          {l.usam.length} impressora{l.usam.length > 1 ? "s" : ""}
                        </button>
                      ) : <span className="text-xs" style={{ color: COR.faint }}>nenhuma</span>}
                      {l.trocasProximas > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: COR.erro }}>
                          <AlertTriangle size={11} /> {l.trocasProximas} com toner ≤ {NIVEL_ALERTA}%
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: COR.sub, borderBottom: LINHA }}>
                      <div className="mono">{fmtData(l.ultima)}</div>
                      {l.ultimaSetor && <div className="truncate" style={{ color: COR.faint, maxWidth: 160 }}>{l.ultimaSetor}</div>}
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}><Chip cor={s.cor}>{s.label}</Chip></td>
                    <td className="mono px-3 py-2.5 text-right text-base font-bold" style={{ color: l.comprar ? COR.ink : COR.faint, borderBottom: LINHA }}>
                      {l.comprar || "—"}
                    </td>
                  </tr>
                  {abrir && (
                    <tr style={{ background: COR.panelAlt }}>
                      <td colSpan={8} className="px-3 py-3" style={{ borderBottom: LINHA }}>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {[...l.usam].sort((a, b) => (a.nivel == null ? 999 : a.nivel) - (b.nivel == null ? 999 : b.nivel)).map((p, j) => (
                            <div key={j} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: COR.panel, border: LINHA }}>
                              <div className="flex min-w-0 items-center gap-2">
                                <Dot cor={statusMeta[statusDe(p)].cor} />
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-medium" style={{ color: COR.ink }}>{p.setor}</div>
                                  <div className="mono text-xs" style={{ color: COR.faint }}>{p.ip} · {p.toner}</div>
                                </div>
                              </div>
                              <BarraNivel nivel={p.nivel} />
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {visiveis.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Nenhum toner encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs" style={{ color: COR.faint }}>
        Consumo e "última retirada" vêm do formulário de movimentações (QR code do armário). Clique nos títulos das colunas para ordenar.
      </p>
    </div>
  );
}
