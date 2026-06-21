import { useApp } from "../context/AppContext";
import { T, S } from "../tokens";
import { getInitials, formatCurrency } from "../utils";
import { Badge, SectionLabel } from "../components";

export function HistoricoScreen() {
  const { historico, fornecedores, getUnidade, calcTotal } = useApp();

  if (!historico.length) {
    return (
      <div style={S.emptyState}>
        <div style={S.emptyIcon}>📋</div>
        Nenhum pedido entregue ainda.
      </div>
    );
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
                <div style={{ fontSize: 12, color: T.stone400 }}>
                  {ps.length} pedido{ps.length > 1 ? "s" : ""} · {total} itens no total
                </div>
              </div>
            </div>
            {ps.map((p) => (
              <div key={p.id} style={S.histPedido}>
                <div style={{ ...S.flexBetween, marginBottom: 6 }}>
                  <Badge color={T.stone600} bg={T.stone100}>{p.data}</Badge>
                  <Badge color={T.green600} bg={T.green50}>Entregue</Badge>
                </div>
                {p.itens.map((i, idx) => {
                  const forn = fornecedores.find((x) => x.id === i.fornId);
                  const unidade = i.unidade || getUnidade(i.produto, i.fornId || "");
                  return (
                    <div
                      key={idx}
                      style={{
                        ...S.pedidoItem,
                        borderBottom: idx < p.itens.length - 1 ? `1px dashed ${T.stone100}` : "none",
                      }}
                    >
                      <div>
                        <div style={S.pedidoItemNome}>{i.produto}</div>
                        {forn && <div style={S.pedidoItemForn}>{forn.nome}</div>}
                      </div>
                      <div style={S.pedidoItemQtd}>{i.qtd} {unidade}</div>
                    </div>
                  );
                })}
                <div style={{ ...S.pedidoObs, marginTop: 6 }}>
                  <strong>Valor do pedido:</strong> {formatCurrency(calcTotal(p))}
                </div>
                {p.obs && <div style={{ ...S.pedidoObs, marginTop: 6 }}>💬 {p.obs}</div>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
