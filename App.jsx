import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  pedidos: "plt_pedidos",
  fornecedores: "plt_fornecedores",
  produtos: "plt_produtos",
  historico: "plt_historico",
};

const STATUS_MAP = {
  pendente: { label: "Pendente", color: "#6B6554", bg: "#EAE7DE" },
  em_preparo: { label: "Em preparo", color: "#C47F0A", bg: "#FDF4E3" },
  entregue: { label: "Entregue ✓", color: "#1E7847", bg: "#E8F5EE" },
};

const UNIDADE_OPTIONS = ["Kg", "Caixa", "Vaso", "Unidade", "Outro"];

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!isFinite(num)) return "";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parsePrice(val) {
  const txt = (val || "").toString().trim();
  if (!txt) return null;
  const norm = txt.replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
  const num = Number(norm);
  return isFinite(num) ? num : null;
}

function getUnitLabel(unidadeTipo, unidadeOutro) {
  if (unidadeTipo === "Outro") return (unidadeOutro || "").trim() || "Outro";
  return unidadeTipo || "Unidade";
}

function getInitials(name) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function genId() {
  return Date.now().toString() + Math.floor(Math.random() * 9999).toString();
}

// ─────────────────────────────────────────────────────────────
// DATA NORMALIZATION
// ─────────────────────────────────────────────────────────────

function normalizeFornecedores(raw) {
  return (raw || []).map((f) => {
    const produtos = Array.isArray(f.produtos)
      ? f.produtos
          .map((p) => {
            if (typeof p === "string")
              return { nome: p.trim(), precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" };
            const nome = ((p && p.nome) || "").trim();
            const preco = p && p.precoEstimado !== undefined && p.precoEstimado !== null && p.precoEstimado !== ""
              ? Number(p.precoEstimado) : null;
            let unidadeTipo = (p && p.unidadeTipo) ? p.unidadeTipo : "Unidade";
            let unidadeOutro = ((p && p.unidadeOutro) || "").trim();
            if (unidadeTipo === "g" || unidadeTipo === "L") { unidadeTipo = "Outro"; if (!unidadeOutro) unidadeOutro = (p && p.unidadeTipo) || ""; }
            return { nome, precoEstimado: isFinite(preco) ? preco : null, unidadeTipo, unidadeOutro };
          })
          .filter((p) => p.nome)
      : [];
    return { ...f, contato: f.contato || "", produtos };
  });
}

function normalizeProdutos(raw) {
  return (raw || []).map((p) => {
    if (Array.isArray(p.fornIds)) return { ...p, fornIds: p.fornIds.filter(Boolean) };
    if (p.fornId) return { ...p, fornIds: [p.fornId] };
    return { ...p, fornIds: [] };
  });
}

function syncProdutos(fornecedores, produtosAtuais) {
  const mapa = {};
  fornecedores.forEach((f) => {
    (f.produtos || []).forEach((p) => {
      const key = p.nome.toLowerCase();
      if (!mapa[key]) mapa[key] = { nome: p.nome, ids: new Set() };
      mapa[key].ids.add(f.id);
    });
  });
  let novos = produtosAtuais.map((p) => {
    const rel = mapa[p.nome.toLowerCase()];
    return { ...p, fornIds: rel ? Array.from(rel.ids) : [] };
  });
  Object.keys(mapa).forEach((key) => {
    if (!novos.some((p) => p.nome.toLowerCase() === key)) {
      const rel = mapa[key];
      novos.push({ id: genId(), nome: rel.nome, categoria: "", fornIds: Array.from(rel.ids) });
    }
  });
  return novos;
}

// ─────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((val) => {
    setState((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [state, set];
}

// ─────────────────────────────────────────────────────────────
// BUSINESS LOGIC HOOKS
// ─────────────────────────────────────────────────────────────

function useAppData() {
  const [pedidos, setPedidos] = useLocalStorage(STORAGE_KEYS.pedidos, []);
  const [fornecedores, setFornecedores] = useLocalStorage(STORAGE_KEYS.fornecedores, []);
  const [produtos, setProdutos] = useLocalStorage(STORAGE_KEYS.produtos, []);
  const [historico, setHistorico] = useLocalStorage(STORAGE_KEYS.historico, []);

  const normFornecedores = normalizeFornecedores(fornecedores);
  const normProdutos = normalizeProdutos(produtos);

  function getRelacoesProduto(nomeProduto) {
    const nomeBusca = (nomeProduto || "").trim().toLowerCase();
    if (!nomeBusca) return [];
    const relacoes = [];
    normFornecedores.forEach((f) => {
      (f.produtos || []).forEach((p) => {
        if ((p.nome || "").trim().toLowerCase() !== nomeBusca) return;
        relacoes.push({
          fornecedorId: f.id,
          fornecedorNome: f.nome,
          precoEstimado: p.precoEstimado,
          unidadeTipo: p.unidadeTipo || "Unidade",
          unidadeOutro: p.unidadeOutro || "",
        });
      });
    });
    return relacoes;
  }

  function getFornecedorNome(fornId) {
    const f = normFornecedores.find((x) => x.id === fornId);
    return f ? f.nome : "Fornecedor não identificado";
  }

  function getPrecoEstimado(nomeProduto, fornId) {
    if (!fornId) {
      const precos = getRelacoesProduto(nomeProduto)
        .map((r) => r.precoEstimado)
        .filter((v) => v !== null && isFinite(Number(v)))
        .map(Number);
      return precos.length ? Math.min(...precos) : null;
    }
    const rel = getRelacoesProduto(nomeProduto).find((r) => r.fornecedorId === fornId);
    if (!rel) return null;
    const p = Number(rel.precoEstimado);
    return isFinite(p) ? p : null;
  }

  function getUnidade(nomeProduto, fornId) {
    const rel = getRelacoesProduto(nomeProduto).find((r) => r.fornecedorId === fornId);
    if (!rel) return "Unidade";
    return getUnitLabel(rel.unidadeTipo, rel.unidadeOutro);
  }

  function calcTotal(pedido) {
    return (pedido.itens || []).reduce((s, i) => {
      const p = getPrecoEstimado(i.produto, i.fornId || "");
      return s + (p !== null ? p * (i.qtd || 0) : 0);
    }, 0);
  }

  function listarProdutosDisponiveis() {
    const mapa = {};
    normFornecedores.forEach((f) => {
      (f.produtos || []).forEach((p) => {
        const nome = (p.nome || "").trim();
        if (!nome) return;
        const key = nome.toLowerCase();
        if (!mapa[key]) mapa[key] = { nome, fornecedores: new Set() };
        mapa[key].fornecedores.add(f.nome);
      });
    });
    return Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function salvarPedido(pedido) {
    setPedidos((prev) => {
      const idx = prev.findIndex((p) => p.id === pedido.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = pedido; return next; }
      return [pedido, ...prev];
    });
  }

  function excluirPedido(id) {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  }

  function mudarStatus(id, status) {
    const p = pedidos.find((x) => x.id === id);
    if (!p) return;
    if (status === "entregue") {
      setHistorico((prev) => [{ ...p, status: "entregue", dataEntrega: new Date().toLocaleDateString("pt-BR") }, ...prev]);
      setPedidos((prev) => prev.filter((x) => x.id !== id));
    } else {
      setPedidos((prev) => prev.map((x) => x.id === id ? { ...x, status } : x));
    }
  }

  function salvarFornecedor(fornecedor, listaProdutos) {
    let newFornecedores;
    if (fornecedor.id) {
      newFornecedores = normFornecedores.map((f) => f.id === fornecedor.id ? { ...f, ...fornecedor, produtos: listaProdutos } : f);
    } else {
      const existente = normFornecedores.find((f) => f.nome.toLowerCase() === fornecedor.nome.toLowerCase());
      if (existente) {
        const mapa = {};
        (existente.produtos || []).forEach((p) => { mapa[p.nome.toLowerCase()] = { ...p }; });
        listaProdutos.forEach((p) => { mapa[p.nome.toLowerCase()] = { ...p }; });
        newFornecedores = normFornecedores.map((f) => f.id === existente.id ? { ...f, contato: fornecedor.contato || f.contato, produtos: Object.values(mapa) } : f);
      } else {
        newFornecedores = [...normFornecedores, { ...fornecedor, id: genId(), produtos: listaProdutos }];
      }
    }
    setFornecedores(newFornecedores);
    const syncedProdutos = syncProdutos(newFornecedores, normProdutos);
    setProdutos(syncedProdutos);
  }

  function excluirFornecedor(id) {
    const newFornecedores = normFornecedores.filter((f) => f.id !== id);
    setFornecedores(newFornecedores);
    setProdutos(syncProdutos(newFornecedores, normProdutos));
  }

  function exportarDados() {
    const data = { pedidos, fornecedores, produtos, historico, exportadoEm: new Date().toLocaleString("pt-BR") };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `backup-flora-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.json`;
    a.click();
  }

  function importarDados(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.pedidos) setPedidos(data.pedidos);
          if (data.fornecedores) setFornecedores(normalizeFornecedores(data.fornecedores));
          if (data.produtos) setProdutos(normalizeProdutos(data.produtos));
          if (data.historico) setHistorico(data.historico);
          resolve();
        } catch {
          reject(new Error("Arquivo inválido"));
        }
      };
      reader.readAsText(file);
    });
  }

  return {
    pedidos, fornecedores: normFornecedores, produtos: normProdutos, historico,
    getRelacoesProduto, getFornecedorNome, getPrecoEstimado, getUnidade, calcTotal,
    listarProdutosDisponiveis, salvarPedido, excluirPedido, mudarStatus,
    salvarFornecedor, excluirFornecedor, exportarDados, importarDados,
  };
}

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS / STYLES
// ─────────────────────────────────────────────────────────────

const T = {
  green50: "#E8F5EE", green100: "#C3E6D0", green200: "#8FCBAA",
  green400: "#3DA068", green600: "#1E7847", green800: "#0D4E2C", green900: "#062E19",
  stone50: "#F7F5F0", stone100: "#EAE7DE", stone200: "#D4CFBF",
  stone400: "#9E9882", stone600: "#6B6554", stone800: "#3D3A30", stone900: "#1E1C16",
  amber50: "#FDF4E3", amber200: "#F5CC7F", amber600: "#C47F0A",
  red50: "#FDF0F0", red200: "#F5A8A8", red600: "#C43333",
  white: "#FDFCF9",
};

const S = {
  // Layout
  screen: { minHeight: "100vh", background: T.stone50, fontFamily: "'DM Sans', sans-serif" },
  main: { maxWidth: 700, margin: "0 auto", padding: "16px 12px 100px" },
  // Header
  header: { background: T.green800, padding: "16px 16px 0", position: "sticky", top: 0, zIndex: 200 },
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  logo: { display: "flex", alignItems: "center", gap: 8, fontSize: 22, fontFamily: "'DM Serif Display', serif", color: T.green50, fontWeight: 400 },
  headerBtn: { background: "rgba(255,255,255,.12)", color: T.green100, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer" },
  // Tabs
  tabsWrap: { display: "flex", overflowX: "auto" },
  tab: { flexShrink: 0, padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.55)", cursor: "pointer", borderBottom: "2.5px solid transparent", whiteSpace: "nowrap", transition: "all .15s" },
  tabActive: { color: "#fff", borderBottomColor: T.green200 },
  // Card
  card: { background: T.white, borderRadius: 16, border: `1px solid ${T.stone100}`, padding: 16, marginBottom: 10, boxShadow: "0 1px 2px rgba(30,24,10,.06)" },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12, color: T.stone800 },
  // Form
  formLabel: { display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: T.stone600, marginBottom: 4 },
  formGroup: { marginBottom: 12 },
  input: { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.stone200}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: T.stone900, background: T.white, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.stone200}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: T.stone900, background: T.white, outline: "none", height: 72, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.stone200}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: T.stone900, background: T.white, outline: "none", appearance: "none", WebkitAppearance: "none", boxSizing: "border-box" },
  // Buttons
  btn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", border: `1.5px solid ${T.stone200}`, background: T.white, color: T.stone800 },
  btnPrimary: { background: T.green600, color: "#fff", borderColor: T.green600 },
  btnDanger: { background: T.red50, color: T.red600, borderColor: T.red200 },
  btnAmber: { background: T.amber50, color: T.amber600, borderColor: T.amber200 },
  btnSm: { padding: "6px 10px", fontSize: 12 },
  btnFull: { width: "100%" },
  // Badge
  badge: { display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 },
  chip: { display: "inline-block", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: T.green50, color: T.green800 },
  chips: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 },
  // Section
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: T.stone400, marginBottom: 8 },
  emptyState: { textAlign: "center", color: T.stone400, fontSize: 14, padding: "40px 20px" },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  flexBetween: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  // Pedido card
  pedidoCard: { background: T.white, borderRadius: 16, border: `1px solid ${T.stone100}`, marginBottom: 10, boxShadow: "0 1px 2px rgba(30,24,10,.06)", overflow: "hidden" },
  pedidoHeader: { padding: "14px 16px 10px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, borderBottom: `1px solid ${T.stone100}` },
  pedidoCliente: { fontSize: 16, fontWeight: 600, fontFamily: "'DM Serif Display', serif" },
  pedidoMeta: { fontSize: 12, color: T.stone400, marginTop: 2 },
  pedidoBody: { padding: "10px 16px" },
  pedidoItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px dashed ${T.stone100}`, fontSize: 13 },
  pedidoItemNome: { color: T.stone800, fontWeight: 500 },
  pedidoItemForn: { color: T.stone400, fontSize: 11 },
  pedidoItemQtd: { fontWeight: 600, color: T.green600, fontSize: 14, whiteSpace: "nowrap" },
  pedidoObs: { fontSize: 12, color: T.stone600, background: T.stone50, borderRadius: 8, padding: "8px 10px", marginTop: 8 },
  pedidoFooter: { padding: "10px 16px", background: T.stone50, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${T.stone100}` },
  // Filtros
  filtrosBar: { display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 },
  filtroChip: { flexShrink: 0, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: T.white, border: `1.5px solid ${T.stone200}`, color: T.stone600, cursor: "pointer", whiteSpace: "nowrap" },
  filtroChipActive: { background: T.green600, color: "#fff", borderColor: T.green600 },
  // Resumo
  resumoGroup: { background: T.white, borderRadius: 16, border: `1px solid ${T.stone100}`, marginBottom: 12, overflow: "hidden" },
  resumoHeader: { padding: "12px 16px", background: T.green800, display: "flex", alignItems: "center", justifyContent: "space-between" },
  resumoHeaderNome: { fontSize: 14, fontWeight: 600, color: T.green50, fontFamily: "'DM Serif Display', serif" },
  // Hist
  histGrupo: { marginBottom: 20 },
  histAvatar: { width: 38, height: 38, borderRadius: "50%", background: T.green600, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'DM Serif Display', serif", flexShrink: 0 },
  histClienteHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  histPedido: { background: T.white, border: `1px solid ${T.stone100}`, borderRadius: 10, padding: "10px 14px", marginBottom: 6, marginLeft: 48 },
  // Forn
  fornItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.stone100}` },
  fornName: { fontSize: 14, fontWeight: 600 },
  fornMeta: { fontSize: 12, color: T.stone400, marginTop: 2 },
  // Modal / Overlay
  overlay: { position: "fixed", inset: 0, background: "rgba(30,24,10,.45)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { background: T.white, borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", width: "100%", maxWidth: 700, maxHeight: "92vh", overflowY: "auto" },
  modalTitle: { fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 16, color: T.green800 },
  modalClose: { float: "right", background: T.stone100, border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: 18, cursor: "pointer", color: T.stone600, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  // Autocomplete
  acWrap: { position: "relative" },
  acList: { position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, background: T.white, border: `1.5px solid ${T.green400}`, borderRadius: 10, zIndex: 300, maxHeight: 160, overflowY: "auto", boxShadow: "0 4px 16px rgba(30,24,10,.1)" },
  acItem: { padding: "8px 12px", fontSize: 13, cursor: "pointer" },
  // Table
  prodTable: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: T.white },
  prodTableTh: { textAlign: "left", padding: "10px 12px", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: T.stone600, background: T.stone50, borderBottom: `1px solid ${T.stone100}` },
  prodTableTd: { padding: "10px 12px", borderBottom: `1px solid ${T.stone100}`, verticalAlign: "top" },
};

// ─────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────

function Badge({ children, color, bg }) {
  return <span style={{ ...S.badge, color, background: bg }}>{children}</span>;
}

function Chip({ children }) {
  return <span style={S.chip}>{children}</span>;
}

function Btn({ children, onClick, variant = "default", sm = false, full = false, style: extra = {} }) {
  const variantStyle = variant === "primary" ? S.btnPrimary : variant === "danger" ? S.btnDanger : variant === "amber" ? S.btnAmber : {};
  return (
    <button
      onClick={onClick}
      style={{ ...S.btn, ...(sm ? S.btnSm : {}), ...(full ? S.btnFull : {}), ...variantStyle, ...extra }}
    >
      {children}
    </button>
  );
}

function FormGroup({ label, children }) {
  return (
    <div style={S.formGroup}>
      {label && <label style={S.formLabel}>{label}</label>}
      {children}
    </div>
  );
}

function StyledInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={S.input}
    />
  );
}

function StyledSelect({ value, onChange, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={S.select}>
        {children}
      </select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.stone400, fontSize: 10 }}>▼</span>
    </div>
  );
}

function StyledTextarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={S.textarea}
    />
  );
}

function SectionLabel({ children, style: extra = {} }) {
  return <div style={{ ...S.sectionLabel, ...extra }}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────
// MODAL COMPONENT
// ─────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modal}>
        <button style={S.modalClose} onClick={onClose}>✕</button>
        <div style={S.modalTitle}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PEDIDOS SCREEN
// ─────────────────────────────────────────────────────────────

function PedidosScreen({ data }) {
  const {
    pedidos, fornecedores, getFornecedorNome, getRelacoesProduto, getPrecoEstimado,
    getUnidade, calcTotal, listarProdutosDisponiveis, salvarPedido, excluirPedido,
    mudarStatus, historico,
  } = data;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filtroAtivo, setFiltroAtivo] = useState("");
  const [cliente, setCliente] = useState("");
  const [contato, setContato] = useState("");
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState([]);
  const [selectedProduto, setSelectedProduto] = useState("");
  const [selectedFornId, setSelectedFornId] = useState("");
  const [itemQtd, setItemQtd] = useState(1);
  const [acVisible, setAcVisible] = useState(false);
  const [acItems, setAcItems] = useState([]);

  const produtosDisponiveis = listarProdutosDisponiveis();

  const fornecedoresParaProduto = selectedProduto
    ? getRelacoesProduto(selectedProduto).sort((a, b) => a.fornecedorNome.localeCompare(b.fornecedorNome, "pt-BR"))
    : [];

  useEffect(() => {
    if (produtosDisponiveis.length && !selectedProduto) {
      setSelectedProduto(produtosDisponiveis[0]?.nome || "");
    }
  }, [modalOpen]);

  useEffect(() => {
    if (fornecedoresParaProduto.length) {
      setSelectedFornId(fornecedoresParaProduto[0]?.fornecedorId || "");
    } else {
      setSelectedFornId("");
    }
  }, [selectedProduto]);

  function abrirModal(id) {
    setEditingId(id || null);
    if (id) {
      const p = pedidos.find((x) => x.id === id);
      setCliente(p.cliente);
      setContato(p.contato || "");
      setObs(p.obs || "");
      setItens(p.itens.map((i) => ({ ...i, unidade: i.unidade || getUnidade(i.produto, i.fornId || "") })));
    } else {
      setCliente(""); setContato(""); setObs(""); setItens([]);
    }
    setModalOpen(true);
  }

  function fecharModal() { setModalOpen(false); setAcVisible(false); }

  function handleClienteChange(val) {
    setCliente(val);
    if (val.length >= 2) {
      const todos = [...pedidos, ...historico];
      const sugs = [...new Set(todos.map((p) => p.cliente))].filter((c) => c.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
      setAcItems(sugs); setAcVisible(sugs.length > 0);
    } else { setAcVisible(false); }
  }

  function selecionarCliente(nome) {
    setCliente(nome);
    setAcVisible(false);
    if (!contato) {
      const ant = [...pedidos, ...historico].find((p) => p.cliente === nome && p.contato);
      if (ant) setContato(ant.contato);
    }
  }

  function adicionarItem() {
    if (!selectedProduto) { alert("Selecione um produto."); return; }
    if (!selectedFornId) { alert("Selecione um fornecedor."); return; }
    const qtd = Math.max(1, parseInt(itemQtd, 10) || 1);
    const unidade = getUnidade(selectedProduto, selectedFornId);
    const existente = itens.find((i) => i.produto.toLowerCase() === selectedProduto.toLowerCase() && i.fornId === selectedFornId);
    if (existente) {
      setItens(itens.map((i) => i === existente ? { ...i, qtd: i.qtd + qtd } : i));
    } else {
      setItens([...itens, { produto: selectedProduto, qtd, fornId: selectedFornId, unidade }]);
    }
    setItemQtd(1);
  }

  function removerItem(idx) { setItens(itens.filter((_, i) => i !== idx)); }

  function totalModal() {
    return itens.reduce((s, i) => {
      const p = getPrecoEstimado(i.produto, i.fornId || "");
      return s + (p !== null ? p * i.qtd : 0);
    }, 0);
  }

  function salvar() {
    if (!cliente.trim()) { alert("Informe o nome do cliente"); return; }
    if (!itens.length) { alert("Adicione pelo menos um item"); return; }
    const antigo = editingId ? pedidos.find((p) => p.id === editingId) || {} : {};
    const pedido = {
      id: editingId || genId(),
      cliente: cliente.trim(),
      contato: contato.trim(),
      obs: obs.trim(),
      dataEntrega: antigo.dataEntrega || "",
      itens,
      data: antigo.data || new Date().toLocaleDateString("pt-BR"),
      status: antigo.status || "pendente",
    };
    salvarPedido(pedido);
    fecharModal();
  }

  // Filtros
  const idsUsados = [...new Set(pedidos.flatMap((p) => p.itens.flatMap((i) => i.fornId ? [i.fornId] : [])).filter(Boolean))];

  let listaFiltrada = pedidos;
  if (filtroAtivo === "__sem__") listaFiltrada = pedidos.filter((p) => p.itens.some((i) => !i.fornId));
  else if (filtroAtivo) listaFiltrada = pedidos.filter((p) => p.itens.some((i) => i.fornId === filtroAtivo));

  return (
    <div>
      <div style={{ ...S.flexBetween, marginBottom: 8 }}>
        <SectionLabel style={{ margin: 0 }}>Pedidos</SectionLabel>
      </div>

      {/* Filtros */}
      <div style={S.filtrosBar}>
        {[{ id: "", label: "Todos" }, { id: "__sem__", label: "Sem fornecedor" }, ...idsUsados.map((id) => ({ id, label: fornecedores.find((f) => f.id === id)?.nome || id }))].map((f) => (
          <div key={f.id} style={{ ...S.filtroChip, ...(filtroAtivo === f.id ? S.filtroChipActive : {}) }} onClick={() => setFiltroAtivo(f.id)}>{f.label}</div>
        ))}
      </div>

      {/* Lista */}
      {listaFiltrada.length === 0 ? (
        <div style={S.emptyState}><div style={S.emptyIcon}>🌱</div>Nenhum pedido aqui ainda.</div>
      ) : (
        listaFiltrada.map((p) => {
          const statusInfo = STATUS_MAP[p.status] || STATUS_MAP.pendente;
          const total = calcTotal(p);
          const fns = [...new Set(p.itens.flatMap((i) => getRelacoesProduto(i.produto).map((r) => r.fornecedorNome)).filter(Boolean))];
          return (
            <div key={p.id} style={S.pedidoCard}>
              <div style={S.pedidoHeader}>
                <div>
                  <div style={S.pedidoCliente}>{p.cliente}</div>
                  <div style={S.pedidoMeta}>{p.data}{p.dataEntrega ? ` · Entrega: ${p.dataEntrega}` : ""}{p.contato ? ` · ${p.contato}` : ""}</div>
                </div>
                <Badge color={statusInfo.color} bg={statusInfo.bg}>{statusInfo.label}</Badge>
              </div>
              <div style={S.pedidoBody}>
                {p.itens.map((item, idx) => {
                  const preco = getPrecoEstimado(item.produto, item.fornId || "");
                  const unidade = item.unidade || getUnidade(item.produto, item.fornId || "");
                  return (
                    <div key={idx} style={{ ...S.pedidoItem, borderBottom: idx < p.itens.length - 1 ? `1px dashed ${T.stone100}` : "none" }}>
                      <div>
                        <div style={S.pedidoItemNome}>{item.produto}</div>
                        <div style={S.pedidoItemForn}>{getFornecedorNome(item.fornId)} · Estimativa: {preco !== null ? formatCurrency(preco * item.qtd) : "Sem estimativa"}</div>
                      </div>
                      <div style={S.pedidoItemQtd}>{item.qtd} {unidade}</div>
                    </div>
                  );
                })}
                <div style={S.pedidoObs}><strong>Valor final:</strong> {formatCurrency(total)}</div>
                {p.obs && <div style={{ ...S.pedidoObs, marginTop: 6 }}>💬 {p.obs}</div>}
                {fns.length > 0 && <div style={S.chips}>{fns.map((n) => <Chip key={n}>{n}</Chip>)}</div>}
              </div>
              <div style={S.pedidoFooter}>
                <StyledSelect value={p.status} onChange={(val) => mudarStatus(p.id, val)}>
                  <option value="pendente">Pendente</option>
                  <option value="em_preparo">Em preparo</option>
                  <option value="entregue">Entregue ✓</option>
                </StyledSelect>
                <Btn sm onClick={() => abrirModal(p.id)}>Editar</Btn>
                <Btn sm variant="danger" onClick={() => { if (confirm("Excluir este pedido?")) excluirPedido(p.id); }}>Excluir</Btn>
              </div>
            </div>
          );
        })
      )}

      <Btn variant="primary" full onClick={() => abrirModal()}>+ Novo Pedido</Btn>

      {/* Modal */}
      <Modal open={modalOpen} onClose={fecharModal} title={editingId ? "Editar Pedido" : "Novo Pedido"}>
        <FormGroup label="Nome do cliente *">
          <div style={S.acWrap}>
            <input type="text" value={cliente} onChange={(e) => handleClienteChange(e.target.value)} placeholder="Ex: Maria Silva" style={S.input} autoComplete="off" />
            {acVisible && (
              <div style={S.acList}>
                {acItems.map((c) => (
                  <div key={c} style={S.acItem} onClick={() => selecionarCliente(c)} onMouseOver={(e) => e.currentTarget.style.background = T.green50} onMouseOut={(e) => e.currentTarget.style.background = ""}>{c}</div>
                ))}
              </div>
            )}
          </div>
        </FormGroup>
        <FormGroup label="WhatsApp">
          <StyledInput type="tel" value={contato} onChange={setContato} placeholder="(11) 99999-0000" />
        </FormGroup>
        <FormGroup label="Observações">
          <StyledTextarea value={obs} onChange={setObs} placeholder="Endereço, horário preferido, forma de pagamento..." />
        </FormGroup>

        <SectionLabel style={{ marginTop: 8 }}>Itens do pedido</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <FormGroup label="Produto">
            <StyledSelect value={selectedProduto} onChange={(val) => { setSelectedProduto(val); }}>
              {produtosDisponiveis.length === 0 ? <option value="">Nenhum produto</option> : produtosDisponiveis.map((p) => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
            </StyledSelect>
          </FormGroup>
          <FormGroup label="Quantidade">
            <input type="number" value={itemQtd} min={1} onChange={(e) => setItemQtd(e.target.value)} style={S.input} />
          </FormGroup>
        </div>
        <FormGroup label="Fornecedor do produto">
          <StyledSelect value={selectedFornId} onChange={setSelectedFornId}>
            {fornecedoresParaProduto.length === 0
              ? <option value="">Sem fornecedor para este produto</option>
              : fornecedoresParaProduto.map((r) => {
                  const precoTxt = r.precoEstimado !== null && isFinite(Number(r.precoEstimado)) ? formatCurrency(Number(r.precoEstimado)) : "Sem estimativa";
                  const unTxt = getUnitLabel(r.unidadeTipo, r.unidadeOutro);
                  return <option key={r.fornecedorId} value={r.fornecedorId}>{r.fornecedorNome} — {precoTxt} / {unTxt}</option>;
                })}
          </StyledSelect>
        </FormGroup>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <Btn variant="primary" onClick={adicionarItem}>Adicionar</Btn>
        </div>

        {/* Cabeçalho colunas */}
        {itens.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 70px 120px 34px", gap: 5, marginBottom: 4, padding: "0 2px" }}>
            {["Produto", "Fornecedor", "Qtd", "Estimativa", ""].map((h, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: T.stone400 }}>{h}</span>)}
          </div>
        )}
        {itens.map((item, idx) => {
          const preco = getPrecoEstimado(item.produto, item.fornId || "");
          return (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 120px 70px 120px 34px", gap: 5, marginBottom: 6, alignItems: "center" }}>
              <div style={{ fontSize: 13, color: T.stone800 }}>{item.produto}</div>
              <div style={{ fontSize: 12, color: T.stone600 }}>{getFornecedorNome(item.fornId)}</div>
              <div style={{ fontSize: 13, textAlign: "center" }}>{item.qtd} {item.unidade}</div>
              <div style={{ fontSize: 12, color: T.stone600 }}>{preco !== null ? formatCurrency(preco * item.qtd) : "—"}</div>
              <button onClick={() => removerItem(idx)} style={{ background: T.red50, color: T.red600, border: `1px solid ${T.red200}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          );
        })}
        <div style={{ ...S.flexBetween, marginTop: 8 }}>
          <div style={{ fontSize: 12, color: T.stone400 }}>Valor final estimado</div>
          <div style={{ fontWeight: 600, color: T.green600, fontSize: 14 }}>{formatCurrency(totalModal())}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <Btn variant="primary" onClick={salvar}>Salvar pedido</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HISTÓRICO SCREEN
// ─────────────────────────────────────────────────────────────

function HistoricoScreen({ data }) {
  const { historico, fornecedores, getUnidade, calcTotal } = data;

  if (!historico.length) {
    return <div style={S.emptyState}><div style={S.emptyIcon}>📋</div>Nenhum pedido entregue ainda.</div>;
  }

  const porCliente = {};
  historico.forEach((p) => {
    if (!porCliente[p.cliente]) porCliente[p.cliente] = [];
    porCliente[p.cliente].push(p);
  });

  return (
    <div>
      <SectionLabel style={{ marginBottom: 12 }}>Histórico por cliente</SectionLabel>
      {Object.keys(porCliente).sort().map((cliente) => {
        const ps = porCliente[cliente];
        const total = ps.reduce((s, p) => s + p.itens.reduce((ss, i) => ss + i.qtd, 0), 0);
        return (
          <div key={cliente} style={S.histGrupo}>
            <div style={S.histClienteHeader}>
              <div style={S.histAvatar}>{getInitials(cliente)}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{cliente}</div>
                <div style={{ fontSize: 12, color: T.stone400 }}>{ps.length} pedido{ps.length > 1 ? "s" : ""} · {total} itens no total</div>
              </div>
            </div>
            {ps.map((p) => {
              const f = fornecedores.find;
              return (
                <div key={p.id} style={S.histPedido}>
                  <div style={{ ...S.flexBetween, marginBottom: 6 }}>
                    <Badge color={T.stone600} bg={T.stone100}>{p.data}</Badge>
                    <Badge color={T.green600} bg={T.green50}>Entregue</Badge>
                  </div>
                  {p.itens.map((i, idx) => {
                    const forn = fornecedores.find((x) => x.id === i.fornId);
                    const unidade = i.unidade || getUnidade(i.produto, i.fornId || "");
                    return (
                      <div key={idx} style={{ ...S.pedidoItem, borderBottom: idx < p.itens.length - 1 ? `1px dashed ${T.stone100}` : "none" }}>
                        <div>
                          <div style={S.pedidoItemNome}>{i.produto}</div>
                          {forn && <div style={S.pedidoItemForn}>{forn.nome}</div>}
                        </div>
                        <div style={S.pedidoItemQtd}>{i.qtd} {unidade}</div>
                      </div>
                    );
                  })}
                  <div style={{ ...S.pedidoObs, marginTop: 6 }}><strong>Valor do pedido:</strong> {formatCurrency(calcTotal(p))}</div>
                  {p.obs && <div style={{ ...S.pedidoObs, marginTop: 6 }}>💬 {p.obs}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORNECEDORES SCREEN
// ─────────────────────────────────────────────────────────────

function LinhaFornecedorProduto({ prod, onChange, onRemove }) {
  const [unidadeTipo, setUnidadeTipo] = useState(prod.unidadeTipo || "Unidade");
  const [unidadeOutro, setUnidadeOutro] = useState(prod.unidadeOutro || "");

  function update(field, value) {
    const updated = { ...prod, [field]: value };
    if (field === "unidadeTipo") { updated.unidadeTipo = value; if (value !== "Outro") updated.unidadeOutro = ""; }
    if (field === "unidadeOutro") updated.unidadeOutro = value;
    onChange(updated);
  }

  useEffect(() => { setUnidadeTipo(prod.unidadeTipo || "Unidade"); setUnidadeOutro(prod.unidadeOutro || ""); }, []);

  return (
    <div style={{ border: `1px solid ${T.stone100}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <FormGroup label="Produto">
        <StyledInput value={prod.nome || ""} onChange={(v) => update("nome", v)} placeholder="Ex: Manjericão" />
      </FormGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FormGroup label="Qtd tipo">
          <StyledSelect value={unidadeTipo} onChange={(v) => { setUnidadeTipo(v); update("unidadeTipo", v); }}>
            {UNIDADE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </StyledSelect>
        </FormGroup>
        <FormGroup label="Estimativa">
          <StyledInput value={prod.precoEstimadoRaw !== undefined ? prod.precoEstimadoRaw : (prod.precoEstimado !== null && prod.precoEstimado !== undefined ? String(prod.precoEstimado) : "")} onChange={(v) => update("precoEstimadoRaw", v)} placeholder="R$ (opcional)" />
        </FormGroup>
      </div>
      {unidadeTipo === "Outro" && (
        <FormGroup label="Qtd tipo (Outro)">
          <StyledInput value={unidadeOutro} onChange={(v) => { setUnidadeOutro(v); update("unidadeOutro", v); }} placeholder="Qual unidade?" />
        </FormGroup>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn sm variant="danger" onClick={onRemove}>Cancelar inserção</Btn>
      </div>
    </div>
  );
}

function FornecedoresScreen({ data }) {
  const { fornecedores, salvarFornecedor, excluirFornecedor } = data;
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [linhasProd, setLinhasProd] = useState([{ _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" }]);

  function limpar() {
    setEditingId(null); setNome(""); setContato("");
    setLinhasProd([{ _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" }]);
  }

  function editar(id) {
    const f = fornecedores.find((x) => x.id === id);
    if (!f) return;
    setEditingId(id);
    setNome(f.nome || "");
    setContato(f.contato || "");
    const lista = (f.produtos || []).filter((p) => p && p.nome);
    setLinhasProd(lista.length ? lista.map((p) => ({ _id: genId(), ...p })) : [{ _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" }]);
  }

  function adicionarLinha() {
    setLinhasProd([...linhasProd, { _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" }]);
  }

  function salvar() {
    if (!nome.trim()) { alert("Informe o nome do fornecedor"); return; }
    const listaProdutos = linhasProd
      .filter((l) => l.nome && l.nome.trim())
      .map((l) => {
        const rawPreco = l.precoEstimadoRaw !== undefined ? l.precoEstimadoRaw : (l.precoEstimado !== null && l.precoEstimado !== undefined ? String(l.precoEstimado) : "");
        const preco = parsePrice(rawPreco);
        if (l.unidadeTipo === "Outro" && !l.unidadeOutro?.trim()) {
          alert(`Informe qual é o tipo de quantidade para o produto ${l.nome}.`);
          return null;
        }
        return { nome: l.nome.trim(), precoEstimado: preco, unidadeTipo: l.unidadeTipo || "Unidade", unidadeOutro: (l.unidadeOutro || "").trim() };
      });
    if (listaProdutos.includes(null)) return;
    if (!listaProdutos.length) { alert("Adicione pelo menos um produto"); return; }
    salvarFornecedor({ id: editingId || null, nome: nome.trim(), contato: contato.trim() }, listaProdutos);
    limpar();
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>{editingId ? "Editar fornecedor" : "Cadastrar fornecedor"}</div>
        <FormGroup label="Qual fornecedor">
          <StyledInput value={nome} onChange={setNome} placeholder="Ex: Sítio Verde das Gerais" />
        </FormGroup>
        <div style={{ ...S.flexBetween, alignItems: "center", marginBottom: 6 }}>
          <label style={{ ...S.formLabel, marginBottom: 0 }}>Produtos</label>
          <Btn style={{ padding: "8px 14px", fontSize: 13 }} onClick={adicionarLinha}>+ Produto</Btn>
        </div>
        {linhasProd.map((prod, idx) => (
          <LinhaFornecedorProduto
            key={prod._id}
            prod={prod}
            onChange={(updated) => setLinhasProd(linhasProd.map((l, i) => i === idx ? { ...l, ...updated } : l))}
            onRemove={() => setLinhasProd(linhasProd.filter((_, i) => i !== idx))}
          />
        ))}
        <FormGroup label="Número para contato do fornecedor">
          <StyledInput type="tel" value={contato} onChange={setContato} placeholder="(11) 99999-0000" />
        </FormGroup>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="primary" full onClick={salvar}>{editingId ? "Atualizar fornecedor" : "Salvar fornecedor"}</Btn>
          {editingId && <Btn full onClick={limpar}>Cancelar edição</Btn>}
        </div>
      </div>

      <SectionLabel style={{ marginTop: 16 }}>Fornecedores cadastrados ({fornecedores.length})</SectionLabel>
      <div style={S.card}>
        {fornecedores.length === 0 ? (
          <div style={S.emptyState}>Nenhum fornecedor ainda</div>
        ) : (
          fornecedores.map((f, idx) => (
            <div key={f.id} style={{ ...S.fornItem, borderBottom: idx < fornecedores.length - 1 ? `1px solid ${T.stone100}` : "none" }}>
              <div>
                <div style={S.fornName}>{f.nome}</div>
                <div style={S.fornMeta}>{f.contato || "Sem contato informado"}</div>
                <div style={S.chips}>
                  {(f.produtos || []).map((p, pi) => (
                    <Chip key={pi}>{p.nome} ({getUnitLabel(p.unidadeTipo, p.unidadeOutro)}){p.precoEstimado !== null && p.precoEstimado !== undefined ? ` · ${formatCurrency(p.precoEstimado)}` : ""}</Chip>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn sm onClick={() => editar(f.id)}>Editar</Btn>
                <Btn sm variant="danger" onClick={() => { if (confirm("Excluir este fornecedor?")) excluirFornecedor(f.id); }}>Excluir</Btn>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PRODUTOS SCREEN
// ─────────────────────────────────────────────────────────────

function ProdutosScreen({ data }) {
  const { fornecedores } = data;

  const mapaProdutos = {};
  fornecedores.forEach((f) => {
    (f.produtos || []).forEach((p) => {
      const nome = (p.nome || "").trim();
      if (!nome) return;
      const key = nome.toLowerCase();
      if (!mapaProdutos[key]) mapaProdutos[key] = { nome, fornecedores: [] };
      mapaProdutos[key].fornecedores.push({
        nome: f.nome, contato: f.contato || "",
        unidade: getUnitLabel(p.unidadeTipo, p.unidadeOutro),
        precoEstimado: p.precoEstimado,
      });
    });
  });

  const lista = Object.values(mapaProdutos).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>Produtos por fornecedor (visualização)</div>
        <div style={{ fontSize: 12, color: T.stone400 }}>Esta tela mostra somente consulta. Cadastre e edite os dados na aba Fornecedores.</div>
      </div>
      <SectionLabel style={{ marginTop: 16 }}>Produtos cadastrados ({lista.length})</SectionLabel>
      <div style={S.card}>
        {lista.length === 0 ? (
          <div style={S.emptyState}><div style={S.emptyIcon}>📦</div>Nenhum produto cadastrado em fornecedores.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...S.prodTable, minWidth: 600 }}>
              <thead>
                <tr>
                  {["Produto", "Fornecedor", "Contato", "Unidade", "Preço estimado"].map((h) => (
                    <th key={h} style={S.prodTableTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.flatMap((prod) =>
                  [...prod.fornecedores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((rel, idx) => (
                    <tr key={`${prod.nome}-${idx}`}>
                      {idx === 0 && <td style={{ ...S.prodTableTd, fontWeight: 600, color: T.stone800 }} rowSpan={prod.fornecedores.length}>{prod.nome}</td>}
                      <td style={S.prodTableTd}>{rel.nome}</td>
                      <td style={S.prodTableTd}>{rel.contato || "Sem contato"}</td>
                      <td style={S.prodTableTd}>{rel.unidade || "Unidade"}</td>
                      <td style={{ ...S.prodTableTd, fontWeight: 600, color: T.green600 }}>{rel.precoEstimado !== null && rel.precoEstimado !== undefined ? formatCurrency(rel.precoEstimado) : "Sem estimativa"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("pedidos");
  const data = useAppData();
  const importRef = useRef(null);

  const TABS = [
    { id: "pedidos", label: "Pedidos" },
    { id: "historico", label: "Histórico" },
    { id: "fornecedores", label: "Fornecedores" },
    { id: "produtos", label: "Produtos" },
  ];

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await data.importarDados(file);
      alert("Dados restaurados com sucesso!");
    } catch {
      alert("Arquivo inválido.");
    }
    e.target.value = "";
  }

  return (
    <div style={S.screen}>
      {/* Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={S.logo}><span>🌿</span> Flora Yamaguti</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={S.headerBtn} onClick={data.exportarDados}>⬇ Backup</button>
            <button style={S.headerBtn} onClick={() => importRef.current?.click()}>⬆ Restaurar</button>
            <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
          </div>
        </div>
        <div style={S.tabsWrap}>
          {TABS.map((t) => (
            <div key={t.id} style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }} onClick={() => setActiveTab(t.id)}>{t.label}</div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        {activeTab === "pedidos" && <PedidosScreen data={data} />}
        {activeTab === "historico" && <HistoricoScreen data={data} />}
        {activeTab === "fornecedores" && <FornecedoresScreen data={data} />}
        {activeTab === "produtos" && <ProdutosScreen data={data} />}
      </div>
    </div>
  );
}
