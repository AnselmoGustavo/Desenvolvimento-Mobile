import { useState, useRef } from "react";
import { S, T } from "./tokens";
import { AppProvider, useApp } from "./context/AppContext";
import { PedidosScreen } from "./screens/PedidosScreen";
import { HistoricoScreen } from "./screens/HistoricoScreen";
import { FornecedoresScreen } from "./screens/FornecedoresScreen";
import { ProdutosScreen } from "./screens/ProdutosScreen";

const TABS = [
  { id: "pedidos",      label: "Pedidos" },
  { id: "historico",    label: "Histórico" },
  { id: "fornecedores", label: "Fornecedores" },
  { id: "produtos",     label: "Produtos" },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState("pedidos");
  const { exportarDados, importarDados } = useApp();
  const importRef = useRef(null);
  const [toast, setToast] = useState(null);

  function showToast(message, ok) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importarDados(file);
      showToast("Dados restaurados com sucesso!", true);
    } catch {
      showToast("Arquivo inválido.", false);
    }
    e.target.value = "";
  }

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={S.logo}><span>🌿</span> Flora Yamaguti</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={S.headerBtn} onClick={exportarDados}>⬇ Backup</button>
            <button style={S.headerBtn} onClick={() => importRef.current?.click()}>⬆ Restaurar</button>
            <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
          </div>
        </div>
        <div style={S.tabsWrap}>
          {TABS.map((t) => (
            <div
              key={t.id}
              style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </div>
          ))}
        </div>
      </div>

      <div style={S.main}>
        {activeTab === "pedidos"      && <PedidosScreen />}
        {activeTab === "historico"    && <HistoricoScreen />}
        {activeTab === "fornecedores" && <FornecedoresScreen />}
        {activeTab === "produtos"     && <ProdutosScreen />}
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 20, zIndex: 600,
          background: toast.ok ? T.green50 : T.red50,
          color: toast.ok ? T.green800 : T.red600,
          border: `1px solid ${toast.ok ? T.green100 : T.red200}`,
          borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,.12)", maxWidth: 280,
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
