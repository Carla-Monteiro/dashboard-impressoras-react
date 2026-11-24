import React, { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Printer, Layers, Download } from "lucide-react";
import { COR, Dot, BarraNivel, statusMeta, statusDe } from "./ui";
import { familia } from "./services/sheetsApi";

const LINHA = "1px solid " + COR.border;

/* cor do saldo de um toner: vermelho zerado/abaixo do mínimo, âmbar no mínimo+1 */
function corSaldo(atual, minimo) {
  if (atual <= 0) return COR.offline;
  if (atual <= minimo) return COR.offline;
  if (atual <= minimo + 1) return COR.erro;
  return COR.online;
}

function SaldoToner({ toners }) {
  if (!toners.length) {
    return (
      <span className="inline-flex items-center gap-1 text-xs" style={{ color: COR.erro }} title="Esse toner não está cadastrado na aba Estoque Atual">
        <AlertTriangle size={12} /> não cadastrado
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {toners.map((t) => {
        const atual = Number(t.estoque_atual) || 0;
        const cor = corSaldo(atual, Number(t.minimo_estipulado) || 0);
        const nome = String(t.modelo_toner);
        const curto = toners.length > 1 ? nome.split(" ").slice(-1)[0] : "em estoque";
        return (
          <span key={nome} title={nome + ": " + atual + " em estoque (mínimo " + t.minimo_estipulado + ")"}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
            style={{ background: cor + "1a", border: "1px solid " + cor + "44", color: COR.ink }}>
            <b className="mono" style={{ color: cor }}>{atual}</b>
            <span style={{ color: COR.sub }}>{curto.toLowerCase()}</span>
          </span>
        );
      })}
    </div>
  );
}

function LinkPainel({ ip }) {
  if (!ip) return <span style={{ color: COR.faint }}>—</span>;
  return (
    <a href={"http://" + ip} target="_blank" rel="noreferrer" title="Abrir o painel web da impressora (só funciona dentro da rede)"
      className="mono inline-flex items-center gap-1 hover:underline" style={{ color: COR.sub }}>
      {ip}<ExternalLink size={11} style={{ color: COR.faint }} />
    </a>
  );
}

export default function Mapeamento({ impressoras, filtradas, estoque }) {
  const [visao, setVisao] = useState("toner");

  /* agrupa por família de toner */
  const grupos = useMemo(() => {
    const m = new Map();
    filtradas.forEach((p) => {
      const f = familia(p.toner) || "(sem toner informado)";
      if (!m.has(f)) m.set(f, { familia: f, nome: p.toner || "Sem toner informado", impressoras: [], toners: p.toners || [] });
      m.get(f).impressoras.push(p);
    });
    return Array.from(m.values()).sort((a, b) => b.impressoras.length - a.impressoras.length);
  }, [filtradas]);

  /* inconsistências do cadastro */
  const semCadastro = useMemo(
    () => impressoras.filter((p) => p.toner && (!p.toners || p.toners.length === 0)),
    [impressoras]
  );
  const semToner = useMemo(() => impressoras.filter((p) => !p.toner), [impressoras]);
  const orfaos = useMemo(() => {
    const usadas = new Set(impressoras.map((p) => familia(p.toner)).filter(Boolean));
    return estoque.filter((e) => !usadas.has(familia(e.modelo_toner)));
  }, [impressoras, estoque]);

  const marcas = new Set(impressoras.map((p) => p.marca).filter(Boolean)).size;

  const exportarCsv = () => {
    const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const cab = ["Setor", "IP", "Marca", "Modelo", "Série", "Toner", "Em estoque", "Nível (%)", "Status"];
    const rows = filtradas.map((p) => [
      p.setor, p.ip, p.marca, p.modelo, p.serie, p.toner,
      (p.toners || []).map((t) => t.modelo_toner + ": " + t.estoque_atual).join(" / "),
      p.nivel == null ? "" : p.nivel, statusMeta[statusDe(p)].label,
    ]);
    const csv = "\uFEFF" + [cab, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "mapeamento-impressoras-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* RESUMO + ALERTAS DE CADASTRO */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs" style={{ color: COR.sub }}>
          <b style={{ color: COR.ink }}>{impressoras.length}</b> impressoras · <b style={{ color: COR.ink }}>{marcas}</b> marcas ·{" "}
          <b style={{ color: COR.ink }}>{new Set(impressoras.map((p) => familia(p.toner)).filter(Boolean)).size}</b> modelos de toner
          {filtradas.length !== impressoras.length && <span> · mostrando {filtradas.length}</span>}
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg p-0.5" style={{ background: COR.panel, border: LINHA }}>
            {[["toner", "Por toner", Layers], ["impressora", "Por impressora", Printer]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setVisao(id)} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
                style={{ background: visao === id ? COR.accentSoft : "transparent", color: visao === id ? COR.accent : COR.sub }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
          <button onClick={exportarCsv} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{ background: COR.panel, color: COR.sub, border: LINHA }}>
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {(semCadastro.length > 0 || semToner.length > 0 || orfaos.length > 0) && (
        <div className="rounded-xl p-3 text-xs" style={{ background: COR.erro + "0f", border: "1px solid " + COR.erro + "44", color: COR.sub }}>
          <div className="mb-1 flex items-center gap-2 font-semibold" style={{ color: COR.erro }}><AlertTriangle size={14} /> Cadastro para revisar</div>
          {semCadastro.length > 0 && (
            <div>Toner da impressora não existe no estoque: {semCadastro.map((p) => p.setor + " (" + p.toner + ")").join(", ")}</div>
          )}
          {semToner.length > 0 && <div>Impressora sem toner informado: {semToner.map((p) => p.setor).join(", ")}</div>}
          {orfaos.length > 0 && (
            <div>No estoque, mas nenhuma impressora usa: {orfaos.map((e) => e.modelo_toner + " (" + e.estoque_atual + " un.)").join(", ")}</div>
          )}
        </div>
      )}

      {/* VISÃO POR TONER */}
      {visao === "toner" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {grupos.map((g) => (
            <section key={g.familia} className="rounded-xl" style={{ background: COR.panel, border: LINHA }}>
              <header className="flex items-start justify-between gap-2 px-4 pt-3 pb-2" style={{ borderBottom: LINHA }}>
                <div>
                  <div className="mono text-sm font-semibold" style={{ color: COR.accent }}>
                    {g.toners.length > 1 ? g.familia.toUpperCase() + " (colorido)" : g.nome}
                  </div>
                  <div className="text-xs" style={{ color: COR.faint }}>
                    {g.impressoras.length} impressora{g.impressoras.length > 1 ? "s" : ""}
                  </div>
                </div>
                <SaldoToner toners={g.toners} />
              </header>
              <ul className="px-2 py-1">
                {[...g.impressoras].sort((a, b) => String(a.setor).localeCompare(String(b.setor))).map((p, j) => (
                  <li key={j} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <Dot cor={statusMeta[statusDe(p)].cor} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium" style={{ color: COR.ink }}>{p.setor}</div>
                        <div className="text-xs" style={{ color: COR.faint }}>
                          {p.marca} {p.modelo} · <LinkPainel ip={p.ip} />
                        </div>
                      </div>
                    </div>
                    {p.nivel != null ? <BarraNivel nivel={p.nivel} /> : <span className="text-xs" style={{ color: COR.faint }}>—</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {grupos.length === 0 && <div className="py-10 text-center text-sm" style={{ color: COR.faint }}>Nenhuma impressora encontrada.</div>}
        </div>
      )}

      {/* VISÃO POR IMPRESSORA */}
      {visao === "impressora" && (
        <div className="overflow-x-auto rounded-xl" style={{ border: LINHA }}>
          <table className="w-full border-collapse text-sm">
            <thead><tr style={{ background: COR.panelAlt }}>
              {["", "Setor", "IP (painel)", "Marca / Modelo", "Série", "Toner", "Em estoque", "Nível"].map((h, i) => (
                <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: LINHA, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtradas.map((p, i) => (
                <tr key={i} className="row-hover transition-colors" style={{ background: COR.panel }}>
                  <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}><Dot cor={statusMeta[statusDe(p)].cor} /></td>
                  <td className="px-3 py-2.5 font-medium" style={{ color: COR.ink, borderBottom: LINHA }}>{p.setor}</td>
                  <td className="px-3 py-2.5 text-xs" style={{ borderBottom: LINHA }}><LinkPainel ip={p.ip} /></td>
                  <td className="px-3 py-2.5" style={{ color: COR.sub, borderBottom: LINHA }}>
                    <span style={{ color: COR.ink }}>{p.marca}</span> <span className="mono text-xs">{p.modelo}</span>
                  </td>
                  <td className="mono px-3 py-2.5 text-xs" style={{ color: COR.faint, borderBottom: LINHA }}>{p.serie || "—"}</td>
                  <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                    <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: LINHA }}>{p.toner || "—"}</span>
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>{p.toner ? <SaldoToner toners={p.toners || []} /> : "—"}</td>
                  <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}><BarraNivel nivel={p.nivel} /></td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-sm" style={{ color: COR.faint, background: COR.panel }}>Nenhuma impressora encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
