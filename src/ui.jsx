import React from "react";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";

/* ============================================================
   PALETA
   ============================================================ */
export const COR = {
  bg: "#0e1420", panel: "#161d2b", panelAlt: "#1b2434", border: "#26324a",
  ink: "#e8edf6", sub: "#8b98b0", faint: "#5b6880",
  online: "#34d399", offline: "#f43f5e", erro: "#f59e0b",
  accent: "#38bdf8", accentSoft: "rgba(56,189,248,0.12)",
};


/* coleta considerada atrasada se a última leitura tiver mais que isso */
export const ATRASO_MAX_MIN = 15;

export const statusMeta = {
  online: { label: "Online", cor: COR.online, Icon: Wifi },
  offline: { label: "Offline", cor: COR.offline, Icon: WifiOff },
  erro: { label: "Problema", cor: COR.erro, Icon: AlertTriangle },
};

export const nf = (n) => (n == null || n === "" ? "—" : Number(n).toLocaleString("pt-BR"));

/* deriva o status a partir dos campos reais da planilha.
   p.erro = problema específico do SNMP (sem papel, atolada...)
   p.online = coluna STATUS que o leitor.py grava */
export const statusDe = (p) => {
  if (p.erro) return "erro";       // online, mas com problema reportado
  if (p.online) return "online";
  return "offline";
};

/* ============================================================
   COMPONENTES BASE
   ============================================================ */
export function StatusBadge({ status, motivo }) {
  const m = statusMeta[status];
  const Icon = m.Icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: m.cor, background: `${m.cor}1f`, border: `1px solid ${m.cor}44` }}
      title={motivo || m.label}>
      <Icon size={13} strokeWidth={2.4} />{motivo || m.label}
    </span>
  );
}

export function Dot({ cor, pulse }) {
  return (
    <span className="relative inline-flex" style={{ width: 9, height: 9 }}>
      {pulse && <span className="absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: cor, animation: "ping 1.6s cubic-bezier(0,0,0.2,1) infinite" }} />}
      <span className="relative inline-flex rounded-full" style={{ width: 9, height: 9, background: cor }} />
    </span>
  );
}

export function KPI({ Icon, valor, label, cor }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: COR.panel, border: `1px solid ${COR.border}` }}>
      <div className="flex items-center justify-center rounded-lg" style={{ width: 42, height: 42, background: `${cor}1c`, color: cor }}>
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <div className="text-2xl font-bold tracking-tight" style={{ color: COR.ink, fontVariantNumeric: "tabular-nums" }}>{valor}</div>
        <div className="text-xs font-medium" style={{ color: COR.sub }}>{label}</div>
      </div>
    </div>
  );
}

export function BarraNivel({ nivel }) {
  if (nivel == null || nivel === "") return <span style={{ color: COR.faint }}>—</span>;
  const n = Number(nivel);
  const cor = n <= 15 ? COR.offline : n <= 35 ? COR.erro : COR.online;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 rounded-full overflow-hidden" style={{ width: 70, background: COR.panelAlt, border: `1px solid ${COR.border}` }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, n))}%`, background: cor, transition: "width .3s" }} />
      </div>
      <span className="mono text-xs font-semibold" style={{ color: cor, minWidth: 30 }}>{n}%</span>
    </div>
  );
}

export function Aviso({ children }) {
  return <div className="rounded-xl px-4 py-10 text-center text-sm" style={{ background: COR.panel, border: `1px solid ${COR.border}`, color: COR.faint }}>{children}</div>;
}

export function Th({ children, align = "left", ...rest }) {
  return (
    <th className={`px-3 py-3 text-${align} text-xs font-semibold uppercase tracking-wide`}
      style={{ color: COR.sub, borderBottom: `1px solid ${COR.border}`, ...rest.style }}>{children}</th>
  );
}

