import { genId } from "./utils";

export function normalizeFornecedores(raw) {
  return (raw || []).map((f) => {
    const produtos = Array.isArray(f.produtos)
      ? f.produtos
          .map((p) => {
            if (typeof p === "string")
              return { nome: p.trim(), precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" };
            const nome = ((p && p.nome) || "").trim();
            const preco =
              p && p.precoEstimado !== undefined && p.precoEstimado !== null && p.precoEstimado !== ""
                ? Number(p.precoEstimado)
                : null;
            let unidadeTipo = p && p.unidadeTipo ? p.unidadeTipo : "Unidade";
            let unidadeOutro = ((p && p.unidadeOutro) || "").trim();
            if (unidadeTipo === "g" || unidadeTipo === "L") {
              unidadeTipo = "Outro";
              if (!unidadeOutro) unidadeOutro = (p && p.unidadeTipo) || "";
            }
            return { nome, precoEstimado: isFinite(preco) ? preco : null, unidadeTipo, unidadeOutro };
          })
          .filter((p) => p.nome)
      : [];
    return { ...f, contato: f.contato || "", produtos };
  });
}

export function normalizeProdutos(raw) {
  return (raw || []).map((p) => {
    if (Array.isArray(p.fornIds)) return { ...p, fornIds: p.fornIds.filter(Boolean) };
    if (p.fornId) return { ...p, fornIds: [p.fornId] };
    return { ...p, fornIds: [] };
  });
}

export function syncProdutos(fornecedores, produtosAtuais) {
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
