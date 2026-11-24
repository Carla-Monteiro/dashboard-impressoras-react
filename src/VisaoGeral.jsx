import React, { useMemo, useState } from "react";
import {
  AlertTriangle, WifiOff, Droplet, PackageX, CheckCircle2, Activity,
  ArrowDownCircle, ArrowUpCircle, ChevronRight, Printer, Wifi,
} from "lucide-react";
import { COR, KPI, Dot, BarraNivel, nf, LinkIP } from "./ui";
import { calcularConsumo } from "./services/sheetsApi";

const NIVEL_CRITICO = 15;

function Painel({ titulo, Icon, extra, children, className = "" }) {
  return (
    <section className={`rounded-xl ${className}`} style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: COR.ink }}>
          {Icon && <Icon size={16} style={{ color: COR.accent }} />}{titulo}
        </h2>
        {extra && <div className="text-xs" style={{ color: COR.faint }}>{extra}</div>}
      </header>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------
   Itens de "precisa de atenção"
   ------------------------------------------------------------ */
function GrupoAtencao({ Icon, cor, titulo, itens, onVerTodos }) {
  if (!itens.length) return null;
  const visiveis = itens.slice(0, 5);
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: COR.sub }}>
          <Icon size={14} style={{ color: cor }} />{titulo}
          <span className="rounded-full px-1.5 text-xs" style={{ background: `${cor}22`, color: COR.ink }}>{itens.length}</span>
        </div>
        {itens.length > visiveis.length && (
          <button onClick={onVerTodos} className="text-xs font-medium" style={{ color: COR.accent }}>ver todas</button>
        )}
      </div>
      <ul className="space-y-1">
        {visiveis.map((it, i) => (
          <li key={i}>
            {/* div em vez de button: o item tem um link (IP) dentro */}
            <div role="button" tabIndex={0} onClick={it.onClick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); it.onClick(); } }}
              className="row-hover flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors"
              style={{ background: COR.panelAlt, border: `1px solid ${COR.border}` }}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium" style={{ color: COR.ink }}>{it.titulo}</div>
                <div className="truncate text-xs" style={{ color: COR.sub }}>{it.detalhe}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {it.direita}
                <ChevronRight size={14} style={{ color: COR.faint }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------
   Gráfico: páginas por dia (uma série, uma cor, tooltip no hover)
   ------------------------------------------------------------ */
function BarrasDiarias({ dados }) {
  const [hover, setHover] = useState(null);
  if (!dados.length) {
    return <div className="py-10 text-center text-sm" style={{ color: COR.faint }}>Ainda não há dias suficientes em "Contadores Diários".</div>;
  }
  const W = 640, H = 200, padL = 44, padB = 22, padT = 8;
  const max = Math.max(1, ...dados.map((d) => d.paginas));
  // escala "redonda" para as linhas de grade
  const passo = Math.pow(10, Math.floor(Math.log10(max)));
  const topo = Math.ceil(max / passo) * passo;
  const grades = [0, topo / 2, topo];
  const larg = (W - padL) / dados.length;
  const barra = Math.max(2, Math.min(18, larg - 2));
  const y = (v) => padT + (H - padB - padT) * (1 - v / topo);
  const rotulos = new Set([0, Math.floor(dados.length / 2), dados.length - 1]);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Páginas impressas por dia">
        {grades.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={W} y1={y(g)} y2={y(g)} stroke={COR.border} strokeWidth="1" strokeDasharray={g === 0 ? "" : "2 4"} />
            <text x={padL - 6} y={y(g) + 4} textAnchor="end" fontSize="10" fill={COR.faint}>{g >= 1000 ? `${Math.round(g / 1000)} mil` : g}</text>
          </g>
        ))}
        {dados.map((d, i) => {
          const x = padL + i * larg + (larg - barra) / 2;
          const h = Math.max(0, H - padB - y(d.paginas));
          return (
            <g key={d.data} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* alvo de hover maior que a barra */}
              <rect x={padL + i * larg} y={padT} width={larg} height={H - padB - padT} fill="transparent" />
              <path
                d={h > 0
                  ? `M${x},${H - padB} v${-(h - Math.min(4, h))} q0,${-Math.min(4, h)} ${Math.min(4, barra / 2)},${-Math.min(4, h)} h${barra - 2 * Math.min(4, barra / 2)} q${Math.min(4, barra / 2)},0 ${Math.min(4, barra / 2)},${Math.min(4, h)} v${h - Math.min(4, h)} z`
                  : ""}
                fill={COR.accent} opacity={hover == null || hover === i ? 1 : 0.45}
              />
              {rotulos.has(i) && (
                <text x={x + barra / 2} y={H - 6} textAnchor={i === 0 ? "start" : i === dados.length - 1 ? "end" : "middle"} fontSize="10" fill={COR.faint}>
                  {d.data.slice(0, 5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${((padL + hover * larg + larg / 2) / W) * 100}%`, top: 0, transform: "translateX(-50%)",
            background: COR.bg, border: `1px solid ${COR.border}`, color: COR.ink, whiteSpace: "nowrap",
          }}>
          <div style={{ color: COR.sub }}>{dados[hover].data}</div>
          <div className="mono font-semibold">{nf(dados[hover].paginas)} páginas</div>
        </div>
      )}
    </div>
  );
}

/* Gráfico: consumo por setor (barras horizontais, mesmo tom) */
function BarrasSetor({ dados, onClick }) {
  if (!dados.length) return <div className="py-10 text-center text-sm" style={{ color: COR.faint }}>Sem consumo registrado no período.</div>;
  const top = dados.slice(0, 8);
  const resto = dados.slice(8).reduce((s, d) => s + d.paginas, 0);
  const linhas = resto > 0 ? [...top, { setor: `Outros (${dados.length - 8} setores)`, paginas: resto, outros: true }] : top;
  const max = Math.max(...linhas.map((d) => d.paginas));
  const total = dados.reduce((s, d) => s + d.paginas, 0);
  return (
    <ul className="space-y-2">
      {linhas.map((d) => (
        <li key={d.setor}>
          <button disabled={d.outros} onClick={() => onClick(d.setor)} className="group block w-full text-left"
            title={`${d.setor}: ${nf(d.paginas)} páginas (${Math.round((d.paginas / total) * 100)}%)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate" style={{ color: COR.ink }}>{d.setor}</span>
              <span className="mono shrink-0" style={{ color: COR.sub }}>{nf(d.paginas)}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: COR.panelAlt }}>
              <div className="h-2 rounded-full transition-opacity group-hover:opacity-80"
                style={{ width: `${Math.max(2, (d.paginas / max) * 100)}%`, background: d.outros ? COR.faint : COR.accent }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------
   VISÃO GERAL
   ------------------------------------------------------------ */
export default function VisaoGeral({ impressoras, estoque, repor, movimentacoes, kpis, impressorasPorToner, statusDe, irPara }) {
  const consumo = useMemo(() => calcularConsumo(impressoras, 30), [impressoras]);
  const total30 = consumo.diario.reduce((s, d) => s + d.paginas, 0);

  const comProblema = impressoras.filter((p) => statusDe(p) === "erro");
  const offline = impressoras.filter((p) => statusDe(p) === "offline");
  const tonerBaixo = impressoras
    .filter((p) => p.nivel != null && p.nivel <= NIVEL_CRITICO)
    .sort((a, b) => a.nivel - b.nivel);
  const reporOrdenado = repor
    .map((e) => ({ e, usam: impressorasPorToner(e.modelo_toner) }))
    .sort((a, b) => b.usam.length - a.usam.length || Number(a.e.estoque_atual) - Number(b.e.estoque_atual));

  const nadaPendente = !comProblema.length && !offline.length && !tonerBaixo.length && !reporOrdenado.length;
  const ultimas = movimentacoes.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KPI Icon={Wifi} valor={`${kpis.online}/${kpis.total}`} label="Funcionando" cor={COR.online} />
        <KPI Icon={AlertTriangle} valor={kpis.erro} label="Com problema" cor={COR.erro} />
        <KPI Icon={WifiOff} valor={kpis.offline} label="Offline" cor={COR.offline} />
        <KPI Icon={PackageX} valor={repor.length} label="Toners p/ repor" cor="#a78bfa" />
        <KPI Icon={Activity} valor={nf(total30)} label="Páginas · 30 dias" cor={COR.accent} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* PRECISA DE ATENÇÃO */}
        <Painel titulo="Precisa de atenção" Icon={AlertTriangle} className="lg:col-span-2">
          {nadaPendente ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm" style={{ color: COR.sub }}>
              <CheckCircle2 size={28} style={{ color: COR.online }} /> Tudo certo por aqui.
            </div>
          ) : (
            <>
              <GrupoAtencao Icon={AlertTriangle} cor={COR.erro} titulo="Com problema" onVerTodos={() => irPara("monitoramento", "")}
                itens={comProblema.map((p) => ({
                  titulo: p.setor, detalhe: <>{p.marca} {p.modelo} · <LinkIP ip={p.ip} /></>,
                  direita: <span className="text-xs font-semibold" style={{ color: COR.erro }}>{p.erro}</span>,
                  onClick: () => irPara("monitoramento", p.ip),
                }))} />
              <GrupoAtencao Icon={Droplet} cor={COR.offline} titulo={`Toner ≤ ${NIVEL_CRITICO}%`} onVerTodos={() => irPara("vida")}
                itens={tonerBaixo.map((p) => ({
                  titulo: p.setor,
                  detalhe: <>{p.toner || "toner ?"} · {p.toners.reduce((s, t) => s + (Number(t.estoque_atual) || 0), 0)} em estoque · <LinkIP ip={p.ip} /></>,
                  direita: <BarraNivel nivel={p.nivel} />,
                  onClick: () => irPara("vida"),
                }))} />
              <GrupoAtencao Icon={PackageX} cor="#a78bfa" titulo="Estoque abaixo do mínimo" onVerTodos={() => irPara("estoque")}
                itens={reporOrdenado.map(({ e, usam }) => ({
                  titulo: e.modelo_toner,
                  detalhe: `${usam.length} impressora${usam.length === 1 ? "" : "s"} usa${usam.length === 1 ? "" : "m"} · mínimo ${nf(e.minimo_estipulado)}`,
                  direita: <span className="mono text-sm font-bold" style={{ color: Number(e.estoque_atual) === 0 ? COR.offline : COR.ink }}>{nf(e.estoque_atual)} un.</span>,
                  onClick: () => irPara("estoque"),
                }))} />
              <GrupoAtencao Icon={WifiOff} cor={COR.offline} titulo="Offline" onVerTodos={() => irPara("monitoramento", "")}
                itens={offline.map((p) => ({
                  titulo: p.setor, detalhe: <>{p.marca} {p.modelo} · <LinkIP ip={p.ip} /></>,
                  direita: <Dot cor={COR.offline} />,
                  onClick: () => irPara("monitoramento", p.ip),
                }))} />
            </>
          )}
        </Painel>

        {/* GRÁFICOS */}
        <div className="space-y-4 lg:col-span-3">
          <Painel titulo="Páginas impressas por dia" Icon={Activity} extra="últimos 30 dias com leitura">
            <BarrasDiarias dados={consumo.diario} />
          </Painel>
          <Painel titulo="Quem mais imprime" Icon={Printer} extra="por setor · 30 dias">
            <BarrasSetor dados={consumo.setores} onClick={(setor) => irPara("contadores", setor)} />
          </Painel>
        </div>
      </div>

      {/* ÚLTIMAS MOVIMENTAÇÕES */}
      <Painel titulo="Últimas movimentações de toner" Icon={ArrowDownCircle}
        extra={<button onClick={() => irPara("movimentacoes")} style={{ color: COR.accent }}>ver todas</button>}>
        {ultimas.length === 0 ? (
          <div className="py-6 text-center text-sm" style={{ color: COR.faint }}>Nenhuma movimentação registrada.</div>
        ) : (
          <ul className="divide-y" style={{ borderColor: COR.border }}>
            {ultimas.map((m, i) => {
              const saida = m.tipo === "saida";
              const cor = saida ? COR.erro : COR.online;
              return (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2" style={{ borderColor: COR.border }}>
                  <div className="flex min-w-0 items-center gap-3">
                    {saida ? <ArrowDownCircle size={16} style={{ color: cor }} /> : <ArrowUpCircle size={16} style={{ color: cor }} />}
                    <span className="mono rounded px-2 py-0.5 text-xs" style={{ background: COR.panelAlt, color: COR.accent, border: `1px solid ${COR.border}` }}>{m.toner}</span>
                    <span className="mono text-sm font-semibold" style={{ color: COR.ink }}>{saida ? "−" : "+"}{m.quantidade}</span>
                    <span className="truncate text-sm" style={{ color: COR.sub }}>
                      {saida ? `para ${m.setor || "—"}` : "entrada no estoque"}{m.quem ? ` · ${m.quem}` : ""}
                    </span>
                  </div>
                  <span className="mono text-xs" style={{ color: COR.faint }}>{m.data}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Painel>
    </div>
  );
}
