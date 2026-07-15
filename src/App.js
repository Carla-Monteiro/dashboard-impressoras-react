import React, { useState, useMemo } from "react";
import { Wifi, WifiOff, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";

const raw = [
  ["Almoxarifado", "10.16.0.150", "Kyocera", "FS1135", "TK-1147", 113198, "online"],
  ["Biblioteca", "10.16.0.172", "Kyocera", "M2035", "TK-1147", null, "offline"],
  ["Secretaria dep. Bolsas", "10.16.0.160", "Ricoh", "SP377", "SP-377 (SP310)", null, "offline"],
  ["Coord. Professores (Em baixo)", "10.16.0.164", "Kyocera", "M2040", "TK-1175", 121805, "online"],
  ["Coord. Professores (Em cima)", "10.16.0.165", "Kyocera", "M2040", "TK-1175", 49629, "online"],
  ["Clínica Coordenação", "10.16.0.154", "Kyocera", "FS1035", "TK-1147", 122957, "online"],
  ["Clínica Recepção", "10.16.0.152", "Kyocera", "FS1135", "TK-1147", 154826, "online"],
  ["Matrícula", "10.16.0.179", "HP", "M428fdw", "CF258X", 246306, "online"],
  ["Manutenção", "10.16.0.151", "Ricoh", "SP377", "SP-377", 62100, "online"],
  ["PRADM", "10.16.0.156", "Kyocera", "M3550", "TK-3122", 410607, "online"],
  ["Reitoria", "10.16.0.187", "Epson", "WF-C5790", "R04L BLACK", 73042, "online"],
  ["Departamento de Tecnologia", "10.16.0.175", "Ricoh", "SP377", "SP-377", 93901, "online"],
  ["Atendimento financeiro", "10.16.0.157", "Ricoh", "SP377", "SP-377", 146585, "online"],
  ["NAPE", "10.16.0.166", "HP", "M428fdw", "CF258X", 66127, "online"],
  ["Coordenação Laboratórios", "10.16.0.188", "Canon", "IR1025", "GPR-22", 127780, "online"],
  ["Marketing", "10.16.0.180", "Ricoh", "SP377", "SP-377", 83519, "online"],
  ["Pró Aluno", "10.16.0.181", "Ricoh", "SP377", "SP-377", 20429, "online"],
  ["Núcleo Suporte Técnico (NST)", "10.16.0.162", "HP", "M248F", "CF258X", 4132, "online"],
  ["Marketing Produção", "10.16.0.171", "Canon", "C5030", "GPR-31", null, "offline"],
];

const estoqueInicial = [
  { id: 1, fab: "Kyocera", modelo: "TK-322", atual: 3, min: 2 },
  { id: 2, fab: "Kyocera", modelo: "TK-1175", atual: 10, min: 2 },
  { id: 3, fab: "Kyocera", modelo: "TK-1147", atual: 1, min: 2 },
  { id: 4, fab: "Kyocera", modelo: "TK-3122", atual: 2, min: 2 },
  { id: 5, fab: "Canon", modelo: "GPR-22", atual: 1, min: 2 },
  { id: 6, fab: "Canon", modelo: "GPR-31 CYAN", atual: 1, min: 2 },
  { id: 7, fab: "Canon", modelo: "GPR-31 MAGENTA", atual: 0, min: 2 },
  { id: 8, fab: "Canon", modelo: "GPR-31 YELLOW", atual: 1, min: 2 },
  { id: 9, fab: "Canon", modelo: "GPR-31 BLACK", atual: 1, min: 2 },
  { id: 10, fab: "Canon", modelo: "GPR-38", atual: 4, min: 2 },
  { id: 11, fab: "Epson", modelo: "R04L CYAN", atual: 0, min: 2 },
  { id: 12, fab: "Epson", modelo: "R04L MAGENTA", atual: 0, min: 2 },
  { id: 13, fab: "Epson", modelo: "R04L YELLOW", atual: 0, min: 2 },
  { id: 14, fab: "Epson", modelo: "R04L BLACK", atual: 0, min: 2 },
  { id: 15, fab: "Ricoh", modelo: "SP-377 (SP310)", atual: 2, min: 2 },
  { id: 16, fab: "HP", modelo: "CF258X", atual: 2, min: 2 },
  { id: 17, fab: "OKI", modelo: "ES 5112", atual: 3, min: 2 },
];

const printers = raw.map((r, i) => ({
  id: i + 1,
  setor: r[0],
  ip: r[1],
  marca: r[2],
  modelo: r[3],
  toner: r[4],
  contador: r[5],
  status: r[6],
}));

const COR = {
  bg: "#0e1420",
  panel: "#161d2b",
  panelAlt: "#1b2434",
  border: "#26324a",
  ink: "#e8edf6",
  sub: "#8b98b0",
  faint: "#5b6880",
  online: "#34d399",
  offline: "#f43f5e",
  erro: "#f59e0b",
  accent: "#38bdf8",
};

function Dot({ cor }) {
  return <span style={{ width: 9, height: 9, background: cor, borderRadius: "50%", display: "inline-block" }} />;
}

function StatusIcon({ status }) {
  if (status === "online") return <Wifi size={12} />;
  if (status === "offline") return <WifiOff size={12} />;
  return <AlertTriangle size={12} />;
}

export default function App() {
  const [tab, setTab] = useState("monitoramento");
  const [pesquisa, setPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos os status");
  const [page, setPage] = useState(0);
  const [estoque, setEstoque] = useState(estoqueInicial);
  const [movs, setMovs] = useState([]);
  const [form, setForm] = useState({ tipo: "Retirada", modelo: "", qtd: "", resp: "" });

  const statusCor = { online: COR.online, offline: COR.offline, erro: COR.erro };
  const statusLabel = { online: "Online", offline: "Offline", erro: "Erro SNMP" };

  const impressoras = useMemo(() => {
    let result = printers;
    if (pesquisa) {
      result = result.filter((p) =>
        p.setor.toLowerCase().includes(pesquisa.toLowerCase()) ||
        p.ip.includes(pesquisa) ||
        p.modelo.toLowerCase().includes(pesquisa.toLowerCase())
      );
    }
    if (filtroStatus !== "Todos os status") {
      result = result.filter((p) => p.status === filtroStatus.toLowerCase());
    }
    return result;
  }, [pesquisa, filtroStatus]);

  const stats = {
    total: printers.length,
    online: printers.filter((p) => p.status === "online").length,
    offline: printers.filter((p) => p.status === "offline").length,
    erro: printers.filter((p) => p.status === "erro").length,
    paginas: printers.reduce((sum, p) => sum + (p.contador || 0), 0),
  };

  const itemsPerPage = 30;
  const paginadas = impressoras.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(impressoras.length / itemsPerPage);

  const tonerMap = useMemo(() => {
    const map = {};
    printers.forEach((p) => {
      if (p.toner && p.toner !== "—") {
        if (!map[p.toner]) map[p.toner] = [];
        map[p.toner].push(p);
      }
    });
    return map;
  }, []);

  const registrarMov = () => {
    if (!form.modelo || !form.qtd) return alert("Preencha modelo e quantidade!");
    const novoEstoque = estoque.map((e) => {
      if (e.modelo === form.modelo) {
        const novoAtual = form.tipo === "Retirada" ? e.atual - parseInt(form.qtd) : e.atual + parseInt(form.qtd);
        return { ...e, atual: Math.max(0, novoAtual) };
      }
      return e;
    });
    setEstoque(novoEstoque);
    setMovs([{
      id: movs.length + 1,
      tipo: form.tipo,
      modelo: form.modelo,
      qtd: parseInt(form.qtd),
      resp: form.resp || "Não informado",
      data: new Date().toLocaleDateString("pt-BR"),
    }, ...movs]);
    setForm({ tipo: "Retirada", modelo: "", qtd: "", resp: "" });
  };

  const estoquePageItems = 50;
  const estoquePage = Math.floor(page / 3);
  const estoqueItems = estoque.slice(estoquePage * estoquePageItems, (estoquePage + 1) * estoquePageItems);
  const estoqueTotalPages = Math.ceil(estoque.length / estoquePageItems);

  return (
    <div style={{ background: COR.bg, color: COR.ink, minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: "0.25rem", fontSize: "1.5rem", fontWeight: "700" }}>Gestão de Impressoras & Toner - TI</h1>
            <p style={{ margin: 0, color: COR.sub, fontSize: "0.875rem" }}>Leitura SNMP real • 15/07/2026 09:15</p>
          </div>
          <div style={{ background: COR.online, color: "#04121e", padding: "0.5rem 1rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600" }}>
            ● Dados reais
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Impressoras", valor: stats.total },
            { label: "Online", valor: stats.online, cor: COR.online },
            { label: "Offline", valor: stats.offline, cor: COR.offline },
            { label: "Com erro", valor: stats.erro, cor: COR.erro },
            { label: "Páginas (soma)", valor: stats.paginas.toLocaleString("pt-BR") },
          ].map((s) => (
            <div key={s.label} style={{ background: COR.panel, padding: "1.5rem", borderRadius: "12px", border: `1px solid ${COR.border}` }}>
              <div style={{ color: COR.sub, fontSize: "0.75rem", marginBottom: "0.75rem", fontWeight: "500" }}>{s.label}</div>
              <div style={{ fontSize: "2rem", fontWeight: "700", color: s.cor || COR.accent }}>{s.valor}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "2rem", borderBottom: `1px solid ${COR.border}`, display: "flex", gap: "2rem" }}>
          {[
            { id: "monitoramento", label: "Monitoramento" },
            { id: "contadores", label: "Contadores" },
            { id: "vida-do-toner", label: "Vida do Toner" },
            { id: "estoque", label: "Estoque" },
            { id: "movimentacoes", label: "Movimentações" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(0); }}
              style={{
                padding: "1rem 0",
                color: tab === t.id ? COR.accent : COR.sub,
                borderBottom: tab === t.id ? `2px solid ${COR.accent}` : "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: tab === t.id ? "600" : "400",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "monitoramento" && (
          <div>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Buscar por setor, IP, modelo ou toner..."
                value={pesquisa}
                onChange={(e) => { setPesquisa(e.target.value); setPage(0); }}
                style={{
                  flex: 1,
                  minWidth: "300px",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: COR.panel,
                  border: `1px solid ${COR.border}`,
                  color: COR.ink,
                }}
              />
              <select
                value={filtroStatus}
                onChange={(e) => { setFiltroStatus(e.target.value); setPage(0); }}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: COR.panel,
                  border: `1px solid ${COR.border}`,
                  color: COR.ink,
                }}
              >
                <option>Todos os status</option>
                <option>Online</option>
                <option>Offline</option>
                <option>Erro</option>
              </select>
              <div style={{ color: COR.sub, fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                {paginadas.length > 0 ? `${(page * itemsPerPage) + 1}-${(page * itemsPerPage) + paginadas.length}` : "0"} de {impressoras.length}
              </div>
            </div>

            <div style={{ background: COR.panel, borderRadius: "12px", border: `1px solid ${COR.border}`, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COR.border}`, background: COR.panelAlt }}>
                    {["SETOR", "IP", "MARCA / MODELO", "TONER", "CONTADOR", "STATUS"].map((h) => (
                      <th key={h} style={{ padding: "1rem", textAlign: "left", color: COR.sub, fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map((p) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${COR.border}` }}>
                      <td style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Dot cor={statusCor[p.status]} />
                        <span style={{ fontWeight: "500" }}>{p.setor}</span>
                      </td>
                      <td style={{ padding: "1rem", color: COR.accent, fontSize: "0.875rem", fontFamily: "monospace" }}>{p.ip}</td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontSize: "0.875rem", color: COR.ink }}>{p.marca} <span style={{ color: COR.accent }}>{p.modelo}</span></div>
                      </td>
                      <td style={{ padding: "1rem", color: COR.accent, fontSize: "0.875rem" }}>{p.toner}</td>
                      <td style={{ padding: "1rem", textAlign: "center", fontWeight: "600" }}>
                        {p.contador ? p.contador.toLocaleString("pt-BR") : "—"}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{
                          padding: "0.35rem 0.75rem",
                          background: `${statusCor[p.status]}1f`,
                          color: statusCor[p.status],
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}>
                          <StatusIcon status={p.status} />
                          {statusLabel[p.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink, cursor: "pointer" }}>←</button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = page + i - 2;
                if (pageNum < 0 || pageNum >= totalPages) return null;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)} style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", background: page === pageNum ? COR.accent : COR.panel, border: `1px solid ${COR.border}`, color: page === pageNum ? "#04121e" : COR.ink, cursor: "pointer", fontSize: "0.75rem" }}>
                    {pageNum + 1}
                  </button>
                );
              })}
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink, cursor: "pointer" }}>→</button>
            </div>
          </div>
        )}

        {tab === "contadores" && (
          <div style={{ background: COR.panel, borderRadius: "12px", border: `1px solid ${COR.border}`, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COR.border}`, background: COR.panelAlt }}>
                  {["SETOR", "MODELO", "CONTADOR", "STATUS"].map((h) => (
                    <th key={h} style={{ padding: "1rem", textAlign: "left", color: COR.sub, fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {printers.filter((p) => p.contador).sort((a, b) => b.contador - a.contador).map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${COR.border}` }}>
                    <td style={{ padding: "1rem", fontWeight: "500" }}>{p.setor}</td>
                    <td style={{ padding: "1rem", color: COR.accent }}>{p.modelo}</td>
                    <td style={{ padding: "1rem", fontWeight: "600", fontSize: "1.125rem" }}>{p.contador.toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "1rem" }}>
                      <Dot cor={statusCor[p.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "vida-do-toner" && (
          <div style={{ display: "grid", gap: "1rem" }}>
            {Object.entries(tonerMap).map(([toner, printers]) => (
              <div key={toner} style={{ background: COR.panel, padding: "1.5rem", borderRadius: "12px", border: `1px solid ${COR.border}` }}>
                <h3 style={{ margin: "0 0 1rem 0", color: COR.accent }}>{toner}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  {printers.map((p) => (
                    <div key={p.id} style={{ background: COR.panelAlt, padding: "1rem", borderRadius: "8px", border: `1px solid ${COR.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <Dot cor={statusCor[p.status]} />
                        <span style={{ fontWeight: "600" }}>{p.setor}</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: COR.faint }}>
                        {p.marca} {p.modelo} • {p.ip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "estoque" && (
          <div>
            <div style={{ marginBottom: "1.5rem", color: COR.sub, fontSize: "0.875rem" }}>
              {estoqueItems.length > 0 ? `${(estoquePage * estoquePageItems) + 1}-${Math.min((estoquePage + 1) * estoquePageItems, estoque.length)}` : "0"} de {estoque.length} toners
            </div>

            <div style={{ background: COR.panel, borderRadius: "12px", border: `1px solid ${COR.border}`, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COR.border}`, background: COR.panelAlt }}>
                    {["FABRICANTE", "MODELO", "ATUAL", "MÍNIMO", "STATUS"].map((h) => (
                      <th key={h} style={{ padding: "1rem", textAlign: "left", color: COR.sub, fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {estoqueItems.map((e) => {
                    const repor = e.atual <= e.min;
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${COR.border}` }}>
                        <td style={{ padding: "1rem", color: COR.sub }}>{e.fab}</td>
                        <td style={{ padding: "1rem", fontWeight: "500" }}>{e.modelo}</td>
                        <td style={{ padding: "1rem", fontWeight: "700", color: repor ? COR.offline : COR.online, fontSize: "1.125rem" }}>{e.atual}</td>
                        <td style={{ padding: "1rem", color: COR.faint }}>{e.min}</td>
                        <td style={{ padding: "1rem" }}>
                          <span style={{
                            padding: "0.35rem 0.75rem",
                            background: repor ? `${COR.offline}1f` : `${COR.online}1f`,
                            color: repor ? COR.offline : COR.online,
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                          }}>
                            {repor ? "⚠ REPOR" : "✓ OK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              <button onClick={() => setPage(Math.max(0, estoquePage - 1) * 3)} disabled={estoquePage === 0} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink, cursor: "pointer" }}>←</button>
              {Array.from({ length: estoqueTotalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i * 3)} style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", background: estoquePage === i ? COR.accent : COR.panel, border: `1px solid ${COR.border}`, color: estoquePage === i ? "#04121e" : COR.ink, cursor: "pointer", fontSize: "0.75rem" }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(Math.min(estoqueTotalPages - 1, estoquePage + 1) * 3)} disabled={estoquePage >= estoqueTotalPages - 1} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: COR.panel, border: `1px solid ${COR.border}`, color: COR.ink, cursor: "pointer" }}>→</button>
            </div>
          </div>
        )}

        {tab === "movimentacoes" && (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
            <div style={{ background: COR.panel, padding: "1.5rem", borderRadius: "12px", border: `1px solid ${COR.border}`, height: "fit-content" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "0.95rem", fontWeight: "600" }}>Registrar movimentação</h3>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {["Retirada", "Devolução"].map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setForm({ ...form, tipo })}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "6px",
                      background: form.tipo === tipo ? COR.accent : COR.panelAlt,
                      color: form.tipo === tipo ? "#04121e" : COR.ink,
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
              <label style={{ display: "block", fontSize: "0.75rem", color: COR.sub, marginBottom: "0.4rem", fontWeight: "500" }}>Modelo</label>
              <select
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  marginBottom: "1rem",
                  borderRadius: "6px",
                  background: COR.panelAlt,
                  border: `1px solid ${COR.border}`,
                  color: COR.ink,
                  fontSize: "0.75rem",
                }}
              >
                <option value="">Selecionar</option>
                {estoque.map((e) => (
                  <option key={e.id} value={e.modelo}>
                    {e.modelo} (Atual: {e.atual})
                  </option>
                ))}
              </select>
              <label style={{ display: "block", fontSize: "0.75rem", color: COR.sub, marginBottom: "0.4rem", fontWeight: "500" }}>Quantidade</label>
              <input
                type="number"
                min="1"
                value={form.qtd}
                onChange={(e) => setForm({ ...form, qtd: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  marginBottom: "1rem",
                  borderRadius: "6px",
                  background: COR.panelAlt,
                  border: `1px solid ${COR.border}`,
                  color: COR.ink,
                  fontSize: "0.75rem",
                }}
              />
              <label style={{ display: "block", fontSize: "0.75rem", color: COR.sub, marginBottom: "0.4rem", fontWeight: "500" }}>Responsável</label>
              <input
                value={form.resp}
                onChange={(e) => setForm({ ...form, resp: e.target.value })}
                placeholder="Nome"
                style={{
                  width: "100%",
                  padding: "0.6rem",
                  marginBottom: "1rem",
                  borderRadius: "6px",
                  background: COR.panelAlt,
                  border: `1px solid ${COR.border}`,
                  color: COR.ink,
                  fontSize: "0.75rem",
                }}
              />
              <button
                onClick={registrarMov}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: COR.accent,
                  color: "#04121e",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Lançar
              </button>
            </div>

            <div style={{ background: COR.panel, padding: "1.5rem", borderRadius: "12px", border: `1px solid ${COR.border}` }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "0.95rem", fontWeight: "600" }}>Histórico de movimentações</h3>
              {movs.length === 0 ? (
                <p style={{ color: COR.faint, textAlign: "center", padding: "2rem" }}>Nenhuma movimentação registrada</p>
              ) : (
                <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                  {movs.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem",
                        background: COR.panelAlt,
                        borderRadius: "8px",
                        marginBottom: "0.5rem",
                        border: `1px solid ${COR.border}`,
                      }}
                    >
                      <div style={{ color: m.tipo === "Retirada" ? COR.offline : COR.online, fontSize: "1.25rem" }}>
                        {m.tipo === "Retirada" ? <ArrowDown size={20} /> : <ArrowUp size={20} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{m.modelo}</div>
                        <div style={{ fontSize: "0.75rem", color: COR.faint }}>
                          {m.data} • {m.resp}
                        </div>
                      </div>
                      <div style={{ fontWeight: "700", color: m.tipo === "Retirada" ? COR.offline : COR.online, fontSize: "1rem" }}>
                        {m.tipo === "Retirada" ? "−" : "+"}{m.qtd}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}