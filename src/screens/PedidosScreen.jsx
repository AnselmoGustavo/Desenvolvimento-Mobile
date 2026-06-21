import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { STATUS_MAP } from "../constants";
import { formatCurrency, genId } from "../utils";
import { T, S } from "../tokens";
import {
  Badge, Chip, Btn, FormGroup, StyledInput, StyledSelect, StyledTextarea,
  SectionLabel, Modal, ConfirmModal, FormError,
} from "../components";

export function PedidosScreen() {
  const {
    pedidos, fornecedores, getFornecedorNome, getRelacoesProduto, getPrecoEstimado,
    getUnidade, calcTotal, listarProdutosDisponiveis, salvarPedido, excluirPedido,
    mudarStatus, historico,
  } = useApp();

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
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors] = useState({});

  const produtosDisponiveis = listarProdutosDisponiveis();

  const fornecedoresParaProduto = selectedProduto
    ? getRelacoesProduto(selectedProduto).sort((a, b) =>
        a.fornecedorNome.localeCompare(b.fornecedorNome, "pt-BR")
      )
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
    setErrors({});
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

  function fecharModal() { setModalOpen(false); setAcVisible(false); setErrors({}); }

  function handleClienteChange(val) {
    setCliente(val);
    if (errors.cliente) setErrors((e) => ({ ...e, cliente: null }));
    if (val.length >= 2) {
      const todos = [...pedidos, ...historico];
      const sugs = [...new Set(todos.map((p) => p.cliente))]
        .filter((c) => c.toLowerCase().includes(val.toLowerCase()))
        .slice(0, 6);
      setAcItems(sugs);
      setAcVisible(sugs.length > 0);
    } else {
      setAcVisible(false);
    }
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
    if (!selectedProduto) { setErrors({ addItem: "Selecione um produto" }); return; }
    if (!selectedFornId) { setErrors({ addItem: "Selecione um fornecedor" }); return; }
    setErrors({});
    const qtd = Math.max(1, parseInt(itemQtd, 10) || 1);
    const unidade = getUnidade(selectedProduto, selectedFornId);
    const existente = itens.find(
      (i) => i.produto.toLowerCase() === selectedProduto.toLowerCase() && i.fornId === selectedFornId
    );
    if (existente) {
      setItens(itens.map((i) => (i === existente ? { ...i, qtd: i.qtd + qtd } : i)));
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
    if (!cliente.trim()) { setErrors({ cliente: "Informe o nome do cliente" }); return; }
    if (!itens.length) { setErrors({ itens: "Adicione pelo menos um item ao pedido" }); return; }
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

  const idsUsados = [
    ...new Set(
      pedidos.flatMap((p) => p.itens.flatMap((i) => (i.fornId ? [i.fornId] : []))).filter(Boolean)
    ),
  ];

  let listaFiltrada = pedidos;
  if (filtroAtivo === "__sem__") listaFiltrada = pedidos.filter((p) => p.itens.some((i) => !i.fornId));
  else if (filtroAtivo) listaFiltrada = pedidos.filter((p) => p.itens.some((i) => i.fornId === filtroAtivo));

  return (
    <div>
      <div style={{ ...S.flexBetween, marginBottom: 8 }}>
        <SectionLabel style={{ margin: 0 }}>Pedidos</SectionLabel>
      </div>

      <div style={S.filtrosBar}>
        {[
          { id: "", label: "Todos" },
          { id: "__sem__", label: "Sem fornecedor" },
          ...idsUsados.map((id) => ({
            id,
            label: fornecedores.find((f) => f.id === id)?.nome || id,
          })),
        ].map((f) => (
          <div
            key={f.id}
            style={{ ...S.filtroChip, ...(filtroAtivo === f.id ? S.filtroChipActive : {}) }}
            onClick={() => setFiltroAtivo(f.id)}
          >
            {f.label}
          </div>
        ))}
      </div>

      {listaFiltrada.length === 0 ? (
        <div style={S.emptyState}>
          <div style={S.emptyIcon}>🌱</div>
          Nenhum pedido aqui ainda.
        </div>
      ) : (
        listaFiltrada.map((p) => {
          const statusInfo = STATUS_MAP[p.status] || STATUS_MAP.pendente;
          const total = calcTotal(p);
          const fns = [
            ...new Set(
              p.itens
                .flatMap((i) => getRelacoesProduto(i.produto).map((r) => r.fornecedorNome))
                .filter(Boolean)
            ),
          ];
          return (
            <div key={p.id} style={S.pedidoCard}>
              <div style={S.pedidoHeader}>
                <div>
                  <div style={S.pedidoCliente}>{p.cliente}</div>
                  <div style={S.pedidoMeta}>
                    {p.data}
                    {p.dataEntrega ? ` · Entrega: ${p.dataEntrega}` : ""}
                    {p.contato ? ` · ${p.contato}` : ""}
                  </div>
                </div>
                <Badge color={statusInfo.color} bg={statusInfo.bg}>{statusInfo.label}</Badge>
              </div>
              <div style={S.pedidoBody}>
                {p.itens.map((item, idx) => {
                  const preco = getPrecoEstimado(item.produto, item.fornId || "");
                  const unidade = item.unidade || getUnidade(item.produto, item.fornId || "");
                  return (
                    <div
                      key={idx}
                      style={{
                        ...S.pedidoItem,
                        borderBottom: idx < p.itens.length - 1 ? `1px dashed ${T.stone100}` : "none",
                      }}
                    >
                      <div>
                        <div style={S.pedidoItemNome}>{item.produto}</div>
                        <div style={S.pedidoItemForn}>
                          {getFornecedorNome(item.fornId)} · Estimativa:{" "}
                          {preco !== null ? formatCurrency(preco * item.qtd) : "Sem estimativa"}
                        </div>
                      </div>
                      <div style={S.pedidoItemQtd}>{item.qtd} {unidade}</div>
                    </div>
                  );
                })}
                <div style={S.pedidoObs}><strong>Valor final:</strong> {formatCurrency(total)}</div>
                {p.obs && <div style={{ ...S.pedidoObs, marginTop: 6 }}>💬 {p.obs}</div>}
                {fns.length > 0 && (
                  <div style={S.chips}>{fns.map((n) => <Chip key={n}>{n}</Chip>)}</div>
                )}
              </div>
              <div style={S.pedidoFooter}>
                <StyledSelect value={p.status} onChange={(val) => mudarStatus(p.id, val)}>
                  <option value="pendente">Pendente</option>
                  <option value="em_preparo">Em preparo</option>
                  <option value="entregue">Entregue ✓</option>
                </StyledSelect>
                <Btn sm onClick={() => abrirModal(p.id)}>Editar</Btn>
                <Btn sm variant="danger" onClick={() => setConfirmDelete(p.id)}>Excluir</Btn>
              </div>
            </div>
          );
        })
      )}

      <Btn variant="primary" full onClick={() => abrirModal()}>+ Novo Pedido</Btn>

      <ConfirmModal
        open={confirmDelete !== null}
        message="Tem certeza que deseja excluir este pedido?"
        onConfirm={() => { excluirPedido(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />

      <Modal open={modalOpen} onClose={fecharModal} title={editingId ? "Editar Pedido" : "Novo Pedido"}>
        <FormGroup label="Nome do cliente *">
          <div style={S.acWrap}>
            <input
              type="text"
              value={cliente}
              onChange={(e) => handleClienteChange(e.target.value)}
              placeholder="Ex: Maria Silva"
              style={{ ...S.input, ...(errors.cliente ? { borderColor: T.red600 } : {}) }}
              autoComplete="off"
            />
            {acVisible && (
              <div style={S.acList}>
                {acItems.map((c) => (
                  <div
                    key={c}
                    style={S.acItem}
                    onClick={() => selecionarCliente(c)}
                    onMouseOver={(e) => (e.currentTarget.style.background = T.green50)}
                    onMouseOut={(e) => (e.currentTarget.style.background = "")}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
          <FormError>{errors.cliente}</FormError>
        </FormGroup>

        <FormGroup label="WhatsApp">
          <StyledInput type="tel" value={contato} onChange={setContato} placeholder="(11) 99999-0000" />
        </FormGroup>
        <FormGroup label="Observações">
          <StyledTextarea
            value={obs}
            onChange={setObs}
            placeholder="Endereço, horário preferido, forma de pagamento..."
          />
        </FormGroup>

        <SectionLabel style={{ marginTop: 8 }}>Itens do pedido</SectionLabel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <FormGroup label="Produto">
            <StyledSelect value={selectedProduto} onChange={setSelectedProduto}>
              {produtosDisponiveis.length === 0
                ? <option value="">Nenhum produto</option>
                : produtosDisponiveis.map((p) => (
                    <option key={p.nome} value={p.nome}>{p.nome}</option>
                  ))}
            </StyledSelect>
          </FormGroup>
          <FormGroup label="Quantidade">
            <input
              type="number"
              value={itemQtd}
              min={1}
              onChange={(e) => setItemQtd(e.target.value)}
              style={S.input}
            />
          </FormGroup>
        </div>

        <FormGroup label="Fornecedor do produto">
          <StyledSelect value={selectedFornId} onChange={setSelectedFornId}>
            {fornecedoresParaProduto.length === 0
              ? <option value="">Sem fornecedor para este produto</option>
              : fornecedoresParaProduto.map((r) => {
                  const precoTxt =
                    r.precoEstimado !== null && isFinite(Number(r.precoEstimado))
                      ? formatCurrency(Number(r.precoEstimado))
                      : "Sem estimativa";
                  const unTxt = r.unidadeTipo === "Outro"
                    ? (r.unidadeOutro || "").trim() || "Outro"
                    : r.unidadeTipo || "Unidade";
                  return (
                    <option key={r.fornecedorId} value={r.fornecedorId}>
                      {r.fornecedorNome} — {precoTxt} / {unTxt}
                    </option>
                  );
                })}
          </StyledSelect>
        </FormGroup>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <Btn variant="primary" onClick={adicionarItem}>Adicionar</Btn>
        </div>
        <FormError>{errors.addItem}</FormError>

        {itens.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 70px 120px 34px", gap: 5, margin: "8px 0 4px", padding: "0 2px" }}>
            {["Produto", "Fornecedor", "Qtd", "Estimativa", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: T.stone400 }}>
                {h}
              </span>
            ))}
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
              <button
                onClick={() => removerItem(idx)}
                style={{ background: T.red50, color: T.red600, border: `1px solid ${T.red200}`, borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          );
        })}

        <FormError>{errors.itens}</FormError>

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
