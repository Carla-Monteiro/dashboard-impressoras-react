import React, { useMemo, useState } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, AlertTriangle, Search, Download, ClipboardCopy,
  Check, BarChart3, ListChecks, Users,
} from "lucide-react";
import { COR, KPI, nf } from "./ui";
import { familia } from "./services/sheetsApi";
import { chaveSetor, nomesCanonicos, impressorasDoSetor } from "./services/analise";

const LINHA = "1px solid " + COR.border;
const DIA = 86400000;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function Painel({ titulo, Icon, extra, children }) {
  return (
    <section className="rounded-xl" style={{ background: COR.panel, border: LINHA }}>
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: COR.ink }}>
          <Icon size={16} style={{ color: COR.accent }} />{titulo}
        </h2>
        {extra}
      </header>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function Barras({ itens, cor }) {
  if (!itens.length) return <div className="py-6 text-center text-sm" style={{ color: COR.faint }}>Sem dados no período.</div>;
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.nome} title={i.nome + ": " + i.valor}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate" style={{ color: COR.ink }}>{i.nome}</span>
            <span className="mono shrink-0" style={{ color: COR.sub }}>{nf(i.valor)}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: COR.panelAlt }}>
            <div className="h-2 rounded-full" style={{ width: Math.max(3, (i.valor / max) * 100) + "%", background: cor || COR.accent }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Sel({ valor, onChange, opcoes }) {
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className="rounded-lg px-3 py-2 text-sm outline-none"
      style={{ background: COR.panel, border: LINHA, color: COR.ink, maxWidth: 220 }}>
      {opcoes.map(([v, l]) => <option key={v} value={v} style={{ background: COR.panel }}>{l}</option>)}
    </select>
  );
}

export default function Movimentacoes({ movimentacoes, impressoras }) {
  const [periodo, setPeriodo] = useState("tudo");
  const [tipo, setTipo] = useState("todos");
  const [toner, setToner] = useState("todos");
  const [setor, setSetor] = useState("todos");
  const [busca, setBusca] = useState("");
  const [soProblemas, setSoProblemas] = useState(false);
  const [copiado, setCopiado] = useState(false);

  /* nomes de setor padronizados (junta "Colégio FEB" e "colégio feb") */
  const canon = useMemo(() => nomesCanonicos(movimentacoes.map((m) => m.setor)), [movimentacoes]);

  /* cada movimentação com setor padronizado e problemas encontrados */
  const lista = useMemo(() => movimentacoes.map((m) => {
    const k = chaveSetor(m.setor);
    const setorNome = k && canon.get(k) ? canon.get(k).nome : (m.setor || "");
    const problemas = [];
    if (m.tipo === "saida") {
      if (!m.quem) problemas.push("sem nome de quem retirou");
      if (!m.setor) problemas.push("sem setor de destino");
      else {
        const imps = impressorasDoSetor(impressoras, m.setor);
        if (!imps.length) problemas.push("setor não encontrado no mapeamento");
        else if (!imps.some((p) => familia(p.toner) === familia(m.toner))) {
          problemas.push("nenhuma impressora do setor usa " + m.toner);
        }
      }
    }
    return { ...m, setorKey: k, setorNome, problemas };
  }), [movimentacoes, canon, impressoras]);

  const tonersOpc = useMemo(() => [...new Set(lista.map((m) => m.toner).filter((t) => t && t !== "—"))].sort(), [lista]);
  const setoresOpc = useMemo(() => {
    const m = new Map();
    lista.forEach((x) => { if (x.setorKey) m.set(x.setorKey, x.setorNome); });
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [lista]);

  const filtradas = useMemo(() => {
    const dias = { "30": 30, "90": 90, "365": 365 }[periodo];
    const limite = dias ? Date.now() - dias * DIA : null;
    const t = busca.trim().toLowerCase();
    return lista.filter((m) => {
      if (limite && (!m.quando || m.quando.getTime() < limite)) return false;
      if (tipo !== "todos" && m.tipo !== tipo) return false;
      if (toner !== "todos" && m.toner !== toner) return false;
      if (setor !== "todos" && m.setorKey !== setor) return false;
      if (soProblemas && !m.problemas.length) return false;
      if (t && !(String(m.quem).toLowerCase().includes(t) || String(m.setor).toLowerCase().includes(t) || String(m.toner).toLowerCase().includes(t))) return false;
      return true;
    });
  }, [lista, periodo, tipo, toner, setor, busca, soProblemas]);

  const saidas = filtradas.filter((m) => m.tipo === "saida");
  const entradas = filtradas.filter((m) => m.tipo === "entrada");
  const soma = (arr) => arr.reduce((s, m) => s + m.quantidade, 0);

  const somaPor = (arr, chave) => {
    const m = new Map();
    arr.forEach((x) => { const k = chave(x); if (k) m.set(k, (m.get(k) || 0) + x.quantidade); });
    return [...m.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  };
  const porSetor = somaPor(saidas, (m) => m.setorNome).slice(0, 8);
  const porToner = somaPor(saidas, (m) => m.toner).slice(0, 8);

  /* retiradas por mês (últimos 12 meses com dados) */
  const porMes = useMemo(() => {
    const m = new Map();
    saidas.forEach((x) => {
      if (!x.quando) return;
      const k = x.quando.getFullYear() * 100 + x.quando.getMonth();
      m.set(k, (m.get(k) || 0) + x.quantidade);
    });
    return [...m.entries()].sort((a, b) => a[0] - b[0]).slice(-12)
      .map(([k, v]) => ({ nome: MESES[k % 100] + "/" + String(Math.floor(k / 100)).slice(2), valor: v }));
  }, [saidas]);
  const maxMes = Math.max(1, ...porMes.map((x) => x.valor));

  /* qualidade dos registros */
  const comProblema = lista.filter((m) => m.problemas.length);
  const variacoes = [...canon.values()].filter((g) => g.variacoes.length > 1);

  /* lista de setores do mapeamento, para virar lista suspensa no Google Forms */
  const setoresMapeamento = useMemo(
    () => [...new Set(impressoras.map((p) => String(p.setor || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [impressoras]
  );
  const copiarSetores = async () => {
    const txt = setoresMapeamento.join("\n");
    try { await navigator.clipboard.writeText(txt); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch (e) { window.prompt("Copie a lista:", txt); }
  };

  const exportarCsv = () => {
    const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const cab = ["Data/hora", "Tipo", "Toner", "Quantidade", "Setor", "Setor (padronizado)", "Quem", "Problemas"];
    const rows = filtradas.map((m) => [m.data, m.tipo === "saida" ? "Saída" : m.tipo === "entrada" ? "Entrada" : m.tipoTexto,
      m.toner, m.quantidade, m.setor, m.setorNome, m.quem, m.problemas.join("; ")]);
    const csv = "﻿" + [cab, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "movimentacoes-toner-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click(); URL.revokeObjectURL(url);
  };

  const limpar = () => { setPeriodo("tudo"); setTipo("todos"); setToner("todos"); setSetor("todos"); setBusca(""); setSoProblemas(false); };

  return (
    <div className="space-y-4">
      {/* KPIs do período filtrado */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI Icon={ArrowDownCircle} valor={soma(saidas)} label="Unidades retiradas" cor={COR.erro} />
        <KPI Icon={ArrowUpCircle} valor={soma(entradas)} label="Unidades de entrada" cor={COR.online} />
        <KPI Icon={Users} valor={new Set(saidas.map((m) => m.setorKey).filter(Boolean)).size} label="Setores atendidos" cor={COR.accent} />
        <KPI Icon={AlertTriangle} valor={comProblema.length} label="Registros para revisar" cor="#a78bfa" />
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search size={16} className="absolute top-1/2 -translate-y-1/2" style={{ left: 12, color: COR.faint }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pessoa, setor ou toner..."
            className="w-full rounded-lg py-2 pl-9 pr-3 text-sm outline-none" style={{ background: COR.panel, border: LINHA, color: COR.ink }} />
        </div>
        <Sel valor={periodo} onChange={setPeriodo} opcoes={[["tudo", "Todo o período"], ["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"], ["365", "Último ano"]]} />
        <Sel valor={tipo} onChange={setTipo} opcoes={[["todos", "Saídas e entradas"], ["saida", "Só saídas"], ["entrada", "Só entradas"]]} />
        <Sel valor={toner} onChange={setToner} opcoes={[["todos", "Todos os toners"], ...tonersOpc.map((t) => [t, t])]} />
        <Sel valor={setor} onChange={setSetor} opcoes={[["todos", "Todos os setores"], ...setoresOpc]} />
        <button onClick={() => setSoProblemas((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: soProblemas ? COR.erro + "22" : COR.panel, color: soProblemas ? COR.erro : COR.sub, border: LINHA }}>
          <AlertTriangle size={14} /> Só para revisar
        </button>
        <button onClick={limpar} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: COR.panel, color: COR.sub, border: LINHA }}>Limpar</button>
        <button onClick={exportarCsv} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: COR.panel, color: COR.sub, border: LINHA }}>
          <Download size={14} /> Exportar
        </button>
      </div>

      {/* RESUMO */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Retiradas por mês" Icon={BarChart3}>
          {porMes.length === 0 ? <div className="py-6 text-center text-sm" style={{ color: COR.faint }}>Sem retiradas no período.</div> : (
            <div className="flex h-40 items-end gap-2">
              {porMes.map((x) => (
                <div key={x.nome} className="flex flex-1 flex-col items-center justify-end gap-1" title={x.nome + ": " + x.valor + " un."}>
                  <span className="mono text-xs" style={{ color: COR.sub }}>{x.valor}</span>
                  <div className="w-full rounded-t" style={{ height: Math.max(4, (x.valor / maxMes) * 110), background: COR.erro, maxWidth: 36 }} />
                  <span className="text-xs" style={{ color: COR.faint }}>{x.nome}</span>
                </div>
              ))}
            </div>
          )}
        </Painel>
        <Painel titulo="Setores que mais retiram" Icon={Users}><Barras itens={porSetor} cor={COR.erro} /></Painel>
        <Painel titulo="Toners mais retirados" Icon={ArrowDownCircle}><Barras itens={porToner} /></Painel>
      </div>

      {/* QUALIDADE DOS REGISTROS */}
      {(comProblema.length > 0 || variacoes.length > 0) && (
        <Painel titulo="Qualidade dos registros" Icon={ListChecks}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 text-xs" style={{ color: COR.sub }}>
              {variacoes.length > 0 && (
                <div>
                  <div className="mb-1 font-semibold" style={{ color: COR.ink }}>Mesmo setor escrito de jeitos diferentes (já agrupados aqui):</div>
                  {variacoes.map((g) => <div key={g.nome}>• {g.variacoes.map((v) => "\"" + v + "\"").join(", ")}</div>)}
                </div>
              )}
              {comProblema.length > 0 && (
                <div>
                  <div className="mb-1 font-semibold" style={{ color: COR.ink }}>{comProblema.length} retirada(s) com problema:</div>
                  {Object.entries(comProblema.reduce((o, m) => { m.problemas.forEach((p) => { const k = p.startsWith("nenhuma impressora") ? "toner que nenhuma impressora do setor usa" : p; o[k] = (o[k] || 0) + 1; }); return o; }, {}))
                    .map(([p, n]) => <div key={p}>• {n}× {p}</div>)}
                  <button onClick={() => setSoProblemas(true)} className="mt-1 font-semibold" style={{ color: COR.accent }}>ver na tabela</button>
                </div>
              )}
            </div>
            <div className="rounded-lg p-3 text-xs" style={{ background: COR.panelAlt, border: LINHA, color: COR.sub }}>
              <div className="mb-1 font-semibold" style={{ color: COR.ink }}>Como evitar: transformar "Setor de destino" em lista suspensa no Google Forms</div>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>Abra o formulário do QR code no Google Forms e clique na pergunta "Setor de destino".</li>
                <li>Troque o tipo de "Resposta curta" para <b>"Lista suspensa"</b>.</li>
                <li>Clique em "Copiar setores" abaixo e cole na primeira opção: o Forms cria uma opção por linha.</li>
                <li>Faça o mesmo em "Quem está retirando" (marcando como obrigatória).</li>
              </ol>
              <button onClick={copiarSetores} className="mt-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold"
                style={{ background: COR.accentSoft, color: COR.accent, border: LINHA }}>
                {copiado ? <Check size={13} /> : <ClipboardCopy size={13} />}{copiado ? "Copiado!" : "Copiar setores (" + setoresMapeamento.length + ")"}
              </button>
            </div>
          </div>
        </Painel>
      )}

      {/* TABELA */}
      <div className="overflow-x-auto rounded-xl" style={{ border: LINHA }}>
        <table className="w-full border-collapse text-sm">
          <thead><tr style={{ background: COR.panelAlt }}>
            {["Data / hora", "Tipo", "Toner", "Qtd.", "Setor de destino", "Quem", ""].map((h, i) => (
              <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: LINHA, whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtradas.map((m, i) => {
              const saida = m.tipo === "saida";
              const cor = saida ? COR.erro : m.tipo === "entrada" ? COR.online : COR.sub;
              return (
                <tr key={i} className="row-hover" style={{ background: COR.panel }}>
                  <td className="mono px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: COR.sub, borderBottom: LINHA }}>{m.data}</td>
                  <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: cor, background: cor + "1f", border: "1px solid " + cor + "44" }}>
                      {saida ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}{saida ? "Saída" : m.tipo === "entrada" ? "Entrada" : m.tipoTexto}
                    </span>
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                    <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: LINHA }}>{m.toner}</span>
                  </td>
                  <td className="mono px-3 py-2.5 font-bold" style={{ color: cor, borderBottom: LINHA }}>{saida ? "−" : "+"}{m.quantidade}</td>
                  <td className="px-3 py-2.5" style={{ color: COR.ink, borderBottom: LINHA }}>{saida ? (m.setorNome || "—") : <span style={{ color: COR.faint }}>{m.setor ? "(" + m.setor + ")" : "—"}</span>}</td>
                  <td className="px-3 py-2.5" style={{ color: COR.sub, borderBottom: LINHA }}>{m.quem || "—"}</td>
                  <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                    {m.problemas.length > 0 && (
                      <span title={m.problemas.join("\n")} className="inline-flex items-center gap-1 text-xs" style={{ color: COR.erro }}>
                        <AlertTriangle size={13} />{m.problemas.length > 1 ? m.problemas.length + " avisos" : m.problemas[0]}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Nenhuma movimentação com esses filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs" style={{ color: COR.faint }}>
        Registros do formulário do QR code do armário, mais recentes primeiro. Setores escritos de formas diferentes são agrupados automaticamente.
      </p>
    </div>
  );
}
