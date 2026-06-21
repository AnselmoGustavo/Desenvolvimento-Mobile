import { useApp } from "../context/AppContext";
import { T, S } from "../tokens";
import { getUnitLabel, formatCurrency } from "../utils";
import { SectionLabel } from "../components";

export function ProdutosScreen() {
  const { fornecedores } = useApp();

  const mapaProdutos = {};
  fornecedores.forEach((f) => {
    (f.produtos || []).forEach((p) => {
      const nome = (p.nome || "").trim();
      if (!nome) return;
      const key = nome.toLowerCase();
      if (!mapaProdutos[key]) mapaProdutos[key] = { nome, fornecedores: [] };
      mapaProdutos[key].fornecedores.push({
        nome: f.nome,
        contato: f.contato || "",
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
        <div style={{ fontSize: 12, color: T.stone400 }}>
          Esta tela mostra somente consulta. Cadastre e edite os dados na aba Fornecedores.
        </div>
      </div>
      <SectionLabel style={{ marginTop: 16 }}>Produtos cadastrados ({lista.length})</SectionLabel>
      <div style={S.card}>
        {lista.length === 0 ? (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>📦</div>
            Nenhum produto cadastrado em fornecedores.
          </div>
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
                  [...prod.fornecedores]
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((rel, idx) => (
                      <tr key={`${prod.nome}-${idx}`}>
                        {idx === 0 && (
                          <td
                            style={{ ...S.prodTableTd, fontWeight: 600, color: T.stone800 }}
                            rowSpan={prod.fornecedores.length}
                          >
                            {prod.nome}
                          </td>
                        )}
                        <td style={S.prodTableTd}>{rel.nome}</td>
                        <td style={S.prodTableTd}>{rel.contato || "Sem contato"}</td>
                        <td style={S.prodTableTd}>{rel.unidade || "Unidade"}</td>
                        <td style={{ ...S.prodTableTd, fontWeight: 600, color: T.green600 }}>
                          {rel.precoEstimado !== null && rel.precoEstimado !== undefined
                            ? formatCurrency(rel.precoEstimado)
                            : "Sem estimativa"}
                        </td>
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
