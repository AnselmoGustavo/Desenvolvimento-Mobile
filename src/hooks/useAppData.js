import { STORAGE_KEYS } from "../constants";
import { genId, getUnitLabel } from "../utils";
import { normalizeFornecedores, normalizeProdutos, syncProdutos } from "../normalize";
import { useLocalStorage } from "./useLocalStorage";

export function useAppData() {
  const [pedidos, setPedidos, r1] = useLocalStorage(STORAGE_KEYS.pedidos, []);
  const [fornecedores, setFornecedores, r2] = useLocalStorage(STORAGE_KEYS.fornecedores, []);
  const [produtos, setProdutos, r3] = useLocalStorage(STORAGE_KEYS.produtos, []);
  const [historico, setHistorico, r4] = useLocalStorage(STORAGE_KEYS.historico, []);

  const loading = !r1 || !r2 || !r3 || !r4;

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
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pedido;
        return next;
      }
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
      setHistorico((prev) => [
        { ...p, status: "entregue", dataEntrega: new Date().toLocaleDateString("pt-BR") },
        ...prev,
      ]);
      setPedidos((prev) => prev.filter((x) => x.id !== id));
    } else {
      setPedidos((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    }
  }

  function salvarFornecedor(fornecedor, listaProdutos) {
    let newFornecedores;
    if (fornecedor.id) {
      newFornecedores = normFornecedores.map((f) =>
        f.id === fornecedor.id ? { ...f, ...fornecedor, produtos: listaProdutos } : f
      );
    } else {
      const existente = normFornecedores.find(
        (f) => f.nome.toLowerCase() === fornecedor.nome.toLowerCase()
      );
      if (existente) {
        const mapa = {};
        (existente.produtos || []).forEach((p) => { mapa[p.nome.toLowerCase()] = { ...p }; });
        listaProdutos.forEach((p) => { mapa[p.nome.toLowerCase()] = { ...p }; });
        newFornecedores = normFornecedores.map((f) =>
          f.id === existente.id
            ? { ...f, contato: fornecedor.contato || f.contato, produtos: Object.values(mapa) }
            : f
        );
      } else {
        newFornecedores = [...normFornecedores, { ...fornecedor, id: genId(), produtos: listaProdutos }];
      }
    }
    setFornecedores(newFornecedores);
    setProdutos(syncProdutos(newFornecedores, normProdutos));
  }

  function excluirFornecedor(id) {
    const newFornecedores = normFornecedores.filter((f) => f.id !== id);
    setFornecedores(newFornecedores);
    setProdutos(syncProdutos(newFornecedores, normProdutos));
  }

  function exportarDados() {
    const data = {
      pedidos, fornecedores, produtos, historico,
      exportadoEm: new Date().toLocaleString("pt-BR"),
    };
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
    loading,
    pedidos, fornecedores: normFornecedores, produtos: normProdutos, historico,
    getRelacoesProduto, getFornecedorNome, getPrecoEstimado, getUnidade, calcTotal,
    listarProdutosDisponiveis, salvarPedido, excluirPedido, mudarStatus,
    salvarFornecedor, excluirFornecedor, exportarDados, importarDados,
  };
}
