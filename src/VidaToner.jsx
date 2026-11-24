import React, { useMemo } from "react";
import { Droplet, AlertTriangle, RefreshCw, EyeOff, CalendarClock, Check, Info, PackageX } from "lucide-react";
import { COR, KPI, BarraNivel, LinkIP, nf, statusDe } from "./ui";
import { familia } from "./services/sheetsApi";
import { analisarNivel, cruzarTrocas, MIN_PONTOS } from "./services/analise";

const LINHA = "1px solid " + COR.border;
const DIA = 86400000;
const fmtData = (d) => (d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—");
const fmtDataAno = (d) => (d ? d.toLocaleDateString("pt-BR") : "—");

function Painel({ titulo, Icon, extra, children }) {
  return (
    <section className="rounded-xl" style={{ background: COR.panel, border: LINHA }}>
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: COR.ink }}>
          <Icon size={16} style={{ color: COR.accent }} />{titulo}
        </h2>
        {extra && <div className="text-xs" style={{ color: COR.faint }}>{extra}</div>}
      </header>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function Th({ children, align = "left" }) {
  return <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub, borderBottom: LINHA, textAlign: align, whiteSpace: "nowrap" }}>{children}</th>;
}

function corDias(d) {
  if (d == null) return COR.sub;
  if (d <= 7) return COR.offline;
  if (d <= 15) return COR.erro;
  return COR.online;
}

export default function VidaToner({ impressoras, estoque, movimentacoes }) {
  const analises = useMemo(
    () => impressoras.map((p) => ({ p, a: analisarNivel(p) })),
    [impressoras]
  );

  const comNivel = analises.filter((x) => x.p.nivel != null);
  const previsao = [...comNivel].sort((x, y) => {
    const dx = x.a.diasRestantes, dy = y.a.diasRestantes;
    if (dx != null && dy != null) return dx - dy;
    if (dx != null) return -1;
    if (dy != null) return 1;
    return x.p.nivel - y.p.nivel;
  });

  const trocas = useMemo(() => cruzarTrocas(impressoras, movimentacoes), [impressoras, movimentacoes]);
  const trocas30 = trocas.filter((t) => Date.now() - t.data <= 30 * DIA);
  const semRegistro = trocas30.filter((t) => !t.registro);
  const acabam7 = comNivel.filter((x) => x.a.diasRestantes != null && x.a.diasRestantes <= 7);

  /* quando começou o histórico de nível */
  const inicioHistorico = useMemo(() => {
    let min = null;
    analises.forEach(({ a }) => a.pontos.forEach((pt) => { if (!min || pt.d < min) min = pt.d; }));
    return min;
  }, [analises]);
  const temPrevisao = comNivel.some((x) => x.a.ritmo != null);

  /* demanda prevista para 30 dias, por família de toner */
  const demanda = useMemo(() => {
    const m = new Map();
    comNivel.forEach(({ p, a }) => {
      const vaiTrocar = a.diasRestantes != null ? a.diasRestantes <= 30 : p.nivel <= 10;
      if (!vaiTrocar || !p.toner) return;
      const f = familia(p.toner);
      const g = m.get(f) || { nome: p.toner, toners: p.toners || [], impressoras: [] };
      g.impressoras.push(p);
      m.set(f, g);
    });
    return [...m.values()].map((g) => {
      const saldo = g.toners.reduce((s, t) => s + (Number(t.estoque_atual) || 0), 0);
      const colorido = g.toners.length > 1;
      return { ...g, saldo, colorido, falta: Math.max(0, g.impressoras.length - saldo) };
    }).sort((a, b) => b.falta - a.falta || b.impressoras.length - a.impressoras.length);
  }, [comNivel]);

  /* quem não informa nível, separado pelo motivo */
  const semNivel = impressoras.filter((p) => p.nivel == null);
  const gruposSem = [
    { titulo: "Offline", cor: COR.offline, lista: semNivel.filter((p) => statusDe(p) === "offline"),
      dica: "Desligadas ou fora da rede no momento da leitura." },
    { titulo: "Só respondem ping (sem SNMP)", cor: COR.erro, lista: semNivel.filter((p) => statusDe(p) !== "offline" && p.soPing),
      dica: "Precisam ter o SNMP habilitado no painel da impressora (community \"public\")." },
    { titulo: "Respondem SNMP mas não informam nível", cor: COR.sub, lista: semNivel.filter((p) => statusDe(p) !== "offline" && !p.soPing),
      dica: "Modelo não publica o nível pelo padrão SNMP (ex.: Epson). Conferir no painel da impressora." },
  ].filter((g) => g.lista.length);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI Icon={Droplet} valor={comNivel.length + "/" + impressoras.length} label="Com nível monitorado" cor={COR.accent} />
        <KPI Icon={CalendarClock} valor={temPrevisao ? acabam7.length : "—"} label="Acabam em até 7 dias" cor={COR.offline} />
        <KPI Icon={RefreshCw} valor={trocas30.length} label="Trocas detectadas (30 dias)" cor={COR.online} />
        <KPI Icon={AlertTriangle} valor={semRegistro.length} label="Trocas sem retirada registrada" cor={COR.erro} />
      </div>

      {!temPrevisao && (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs" style={{ background: COR.accentSoft, border: LINHA, color: COR.sub }}>
          <Info size={15} style={{ color: COR.accent, flexShrink: 0, marginTop: 1 }} />
          <div>
            O histórico diário de nível {inicioHistorico ? "começou a ser gravado em " + fmtDataAno(inicioHistorico) : "começa na próxima leitura do leitor.py"}.
            A previsão de quando cada toner acaba aparece depois de {MIN_PONTOS} dias de leitura,
            e as trocas são detectadas automaticamente quando o nível sobe de repente.
          </div>
        </div>
      )}

      {/* PREVISÃO */}
      <Painel titulo="Quando o toner acaba" Icon={CalendarClock} extra="ritmo de consumo dos últimos dias, desde a última troca">
        <div className="overflow-x-auto rounded-lg" style={{ border: LINHA }}>
          <table className="w-full border-collapse text-sm">
            <thead><tr style={{ background: COR.panelAlt }}>
              <Th>Impressora</Th><Th>Toner</Th><Th>Nível</Th><Th>Ritmo</Th><Th>Acaba em</Th>
            </tr></thead>
            <tbody>
              {previsao.map(({ p, a }, i) => {
                const saldo = (p.toners || []).reduce((s, t) => s + (Number(t.estoque_atual) || 0), 0);
                return (
                  <tr key={i} className="row-hover" style={{ background: COR.panel }}>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                      <div className="font-medium" style={{ color: COR.ink }}>{p.setor}</div>
                      <div className="text-xs"><LinkIP ip={p.ip} cor={COR.faint} /></div>
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                      <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: LINHA }}>{p.toner || "—"}</span>
                      <div className="mt-1 text-xs" style={{ color: saldo === 0 ? COR.offline : COR.faint }}>{saldo} em estoque</div>
                    </td>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}><BarraNivel nivel={p.nivel} /></td>
                    <td className="mono px-3 py-2.5 text-xs" style={{ color: COR.sub, borderBottom: LINHA, whiteSpace: "nowrap" }}>
                      {a.ritmo != null
                        ? (a.ritmo < -0.05 ? "−" + Math.abs(a.ritmo).toFixed(1).replace(".", ",") + "%/dia" : "estável")
                        : <span style={{ color: COR.faint }}>coletando ({a.nPontos}/{MIN_PONTOS} leituras)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-semibold" style={{ color: corDias(a.diasRestantes), borderBottom: LINHA, whiteSpace: "nowrap" }}>
                      {a.diasRestantes != null
                        ? (a.diasRestantes < 1 ? "hoje/amanhã" : "~" + Math.round(a.diasRestantes) + (Math.round(a.diasRestantes) === 1 ? " dia" : " dias")) + " · " + fmtData(a.dataFim)
                        : <span className="text-xs font-normal" style={{ color: COR.faint }}>{p.nivel <= 10 ? "já está no fim" : "—"}</span>}
                    </td>
                  </tr>
                );
              })}
              {previsao.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-sm" style={{ color: COR.faint }}>Nenhuma impressora informou nível de toner.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* DEMANDA PREVISTA */}
        <Painel titulo="Trocas previstas nos próximos 30 dias" Icon={PackageX} extra="comparado com o estoque">
          {demanda.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: COR.faint }}>
              {temPrevisao ? "Nenhuma troca prevista para os próximos 30 dias." : "Aparece quando houver histórico suficiente."}
            </div>
          ) : (
            <ul className="space-y-2">
              {demanda.map((g) => (
                <li key={g.nome} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: COR.panelAlt, border: LINHA }}>
                  <div className="min-w-0">
                    <div className="mono text-sm" style={{ color: COR.accent }}>{g.colorido ? familia(g.nome).toUpperCase() + " (colorido)" : g.nome}</div>
                    <div className="truncate text-xs" style={{ color: COR.faint }}>{g.impressoras.map((p) => p.setor).join(", ")}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs" style={{ color: COR.sub }}>
                    <div><b style={{ color: COR.ink }}>{g.impressoras.length}</b> troca{g.impressoras.length > 1 ? "s" : ""} · <b style={{ color: COR.ink }}>{g.saldo}</b> em estoque</div>
                    {g.falta > 0
                      ? <div className="font-semibold" style={{ color: COR.offline }}>faltam {g.falta}</div>
                      : <div style={{ color: COR.online }}>estoque cobre</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        {/* SEM MONITORAMENTO */}
        <Painel titulo="Sem leitura de nível" Icon={EyeOff} extra={semNivel.length + " impressoras — conferir manualmente"}>
          {gruposSem.length === 0 ? (
            <div className="py-6 text-center text-sm" style={{ color: COR.online }}><Check size={16} className="mr-1 inline" />Todas informam nível.</div>
          ) : gruposSem.map((g) => (
            <div key={g.titulo} className="mb-3 last:mb-0">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: g.cor }}>{g.titulo} ({g.lista.length})</div>
              <div className="mb-1.5 text-xs" style={{ color: COR.faint }}>{g.dica}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.lista.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs" style={{ background: COR.panelAlt, border: LINHA, color: COR.ink }}>
                    {p.setor} <LinkIP ip={p.ip} cor={COR.faint} />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </Painel>
      </div>

      {/* TROCAS DETECTADAS */}
      <Painel titulo="Trocas de toner detectadas" Icon={RefreshCw} extra="nível subiu de repente = toner trocado">
        {trocas.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: COR.faint }}>
            Nenhuma troca detectada ainda. Elas aparecem aqui conforme o histórico de nível for sendo gravado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ border: LINHA }}>
            <table className="w-full border-collapse text-sm">
              <thead><tr style={{ background: COR.panelAlt }}>
                <Th>Data</Th><Th>Impressora</Th><Th>Toner</Th><Th>Nível</Th><Th align="right">Rendimento</Th><Th>Retirada no formulário</Th>
              </tr></thead>
              <tbody>
                {trocas.map((t, i) => (
                  <tr key={i} className="row-hover" style={{ background: COR.panel }}>
                    <td className="mono px-3 py-2.5 text-xs" style={{ color: COR.sub, borderBottom: LINHA }}>{fmtDataAno(t.data)}</td>
                    <td className="px-3 py-2.5" style={{ borderBottom: LINHA }}>
                      <div style={{ color: COR.ink }}>{t.p.setor}</div>
                      <div className="text-xs"><LinkIP ip={t.p.ip} cor={COR.faint} /></div>
                    </td>
                    <td className="mono px-3 py-2.5 text-xs" style={{ color: COR.accent, borderBottom: LINHA }}>{t.p.toner}</td>
                    <td className="mono px-3 py-2.5 text-xs" style={{ color: COR.sub, borderBottom: LINHA }}>{t.de}% → {t.para}%</td>
                    <td className="mono px-3 py-2.5 text-right text-xs" style={{ color: COR.ink, borderBottom: LINHA }}>{t.paginas ? nf(t.paginas) + " pág." : "—"}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ borderBottom: LINHA }}>
                      {t.registro
                        ? <span style={{ color: COR.online }}><Check size={12} className="mr-1 inline" />{t.registro.data.slice(0, 10)}{t.registro.quem ? " · " + t.registro.quem : ""}</span>
                        : <span className="font-semibold" style={{ color: COR.erro }}><AlertTriangle size={12} className="mr-1 inline" />sem retirada registrada</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs" style={{ color: COR.faint }}>
          Rendimento = páginas impressas entre uma troca e a seguinte. "Sem retirada registrada" = não há saída do mesmo toner no formulário
          entre 7 dias antes e 3 dias depois da troca.
        </p>
      </Painel>
    </div>
  );
}
