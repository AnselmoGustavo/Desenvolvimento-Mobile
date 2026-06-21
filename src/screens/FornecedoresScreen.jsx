import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { UNIDADE_OPTIONS } from "../constants";
import { genId, parsePrice, getUnitLabel, formatCurrency } from "../utils";
import { T, S } from "../tokens";
import { Btn, Chip, FormGroup, StyledInput, StyledSelect, SectionLabel, ConfirmModal, FormError } from "../components";

function LinhaFornecedorProduto({ prod, onChange, onRemove }) {
  const [unidadeTipo, setUnidadeTipo] = useState(prod.unidadeTipo || "Unidade");
  const [unidadeOutro, setUnidadeOutro] = useState(prod.unidadeOutro || "");

  function update(field, value) {
    const updated = { ...prod, [field]: value };
    if (field === "unidadeTipo") {
      updated.unidadeTipo = value;
      if (value !== "Outro") updated.unidadeOutro = "";
    }
    if (field === "unidadeOutro") updated.unidadeOutro = value;
    onChange(updated);
  }

  useEffect(() => {
    setUnidadeTipo(prod.unidadeTipo || "Unidade");
    setUnidadeOutro(prod.unidadeOutro || "");
  }, []);

  return (
    <div style={{ border: `1px solid ${T.stone100}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <FormGroup label="Produto">
        <StyledInput value={prod.nome || ""} onChange={(v) => update("nome", v)} placeholder="Ex: Manjericão" />
      </FormGroup>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <FormGroup label="Qtd tipo">
          <StyledSelect
            value={unidadeTipo}
            onChange={(v) => { setUnidadeTipo(v); update("unidadeTipo", v); }}
          >
            {UNIDADE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </StyledSelect>
        </FormGroup>
        <FormGroup label="Estimativa">
          <StyledInput
            value={
              prod.precoEstimadoRaw !== undefined
                ? prod.precoEstimadoRaw
                : prod.precoEstimado !== null && prod.precoEstimado !== undefined
                  ? String(prod.precoEstimado)
                  : ""
            }
            onChange={(v) => update("precoEstimadoRaw", v)}
            placeholder="R$ (opcional)"
          />
        </FormGroup>
      </div>
      {unidadeTipo === "Outro" && (
        <FormGroup label="Qtd tipo (Outro)">
          <StyledInput
            value={unidadeOutro}
            onChange={(v) => { setUnidadeOutro(v); update("unidadeOutro", v); }}
            placeholder="Qual unidade?"
          />
        </FormGroup>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Btn sm variant="danger" onClick={onRemove}>Cancelar inserção</Btn>
      </div>
    </div>
  );
}

export function FornecedoresScreen() {
  const { fornecedores, salvarFornecedor, excluirFornecedor } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [linhasProd, setLinhasProd] = useState([
    { _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" },
  ]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors] = useState({});

  function limpar() {
    setEditingId(null); setNome(""); setContato(""); setErrors({});
    setLinhasProd([{ _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" }]);
  }

  function editar(id) {
    const f = fornecedores.find((x) => x.id === id);
    if (!f) return;
    setEditingId(id);
    setNome(f.nome || "");
    setContato(f.contato || "");
    setErrors({});
    const lista = (f.produtos || []).filter((p) => p && p.nome);
    setLinhasProd(
      lista.length
        ? lista.map((p) => ({ _id: genId(), ...p }))
        : [{ _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" }]
    );
  }

  function adicionarLinha() {
    setLinhasProd([...linhasProd, { _id: genId(), nome: "", precoEstimado: null, unidadeTipo: "Unidade", unidadeOutro: "" }]);
  }

  function salvar() {
    const newErrors = {};
    if (!nome.trim()) newErrors.nome = "Informe o nome do fornecedor";

    const linhasComNome = linhasProd.filter((l) => l.nome && l.nome.trim());
    if (!linhasComNome.length) {
      newErrors.produtos = "Adicione pelo menos um produto";
    } else {
      const invalida = linhasComNome.find((l) => l.unidadeTipo === "Outro" && !l.unidadeOutro?.trim());
      if (invalida) newErrors.unidade = `Informe o tipo de quantidade para "${invalida.nome}"`;
    }

    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    const listaProdutos = linhasComNome.map((l) => {
      const rawPreco =
        l.precoEstimadoRaw !== undefined
          ? l.precoEstimadoRaw
          : l.precoEstimado !== null && l.precoEstimado !== undefined
            ? String(l.precoEstimado)
            : "";
      return {
        nome: l.nome.trim(),
        precoEstimado: parsePrice(rawPreco),
        unidadeTipo: l.unidadeTipo || "Unidade",
        unidadeOutro: (l.unidadeOutro || "").trim(),
      };
    });

    salvarFornecedor({ id: editingId || null, nome: nome.trim(), contato: contato.trim() }, listaProdutos);
    limpar();
  }

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardTitle}>{editingId ? "Editar fornecedor" : "Cadastrar fornecedor"}</div>

        <FormGroup label="Qual fornecedor">
          <StyledInput
            value={nome}
            onChange={(v) => { setNome(v); if (errors.nome) setErrors((e) => ({ ...e, nome: null })); }}
            placeholder="Ex: Sítio Verde das Gerais"
          />
          <FormError>{errors.nome}</FormError>
        </FormGroup>

        <div style={{ ...S.flexBetween, alignItems: "center", marginBottom: 6 }}>
          <label style={{ ...S.formLabel, marginBottom: 0 }}>Produtos</label>
          <Btn style={{ padding: "8px 14px", fontSize: 13 }} onClick={adicionarLinha}>+ Produto</Btn>
        </div>

        {linhasProd.map((prod, idx) => (
          <LinhaFornecedorProduto
            key={prod._id}
            prod={prod}
            onChange={(updated) =>
              setLinhasProd(linhasProd.map((l, i) => (i === idx ? { ...l, ...updated } : l)))
            }
            onRemove={() => setLinhasProd(linhasProd.filter((_, i) => i !== idx))}
          />
        ))}

        <FormError>{errors.produtos}</FormError>
        <FormError>{errors.unidade}</FormError>

        <FormGroup label="Número para contato do fornecedor" >
          <StyledInput type="tel" value={contato} onChange={setContato} placeholder="(11) 99999-0000" />
        </FormGroup>

        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="primary" full onClick={salvar}>
            {editingId ? "Atualizar fornecedor" : "Salvar fornecedor"}
          </Btn>
          {editingId && <Btn full onClick={limpar}>Cancelar edição</Btn>}
        </div>
      </div>

      <SectionLabel style={{ marginTop: 16 }}>Fornecedores cadastrados ({fornecedores.length})</SectionLabel>
      <div style={S.card}>
        {fornecedores.length === 0 ? (
          <div style={S.emptyState}>Nenhum fornecedor ainda</div>
        ) : (
          fornecedores.map((f, idx) => (
            <div
              key={f.id}
              style={{
                ...S.fornItem,
                borderBottom: idx < fornecedores.length - 1 ? `1px solid ${T.stone100}` : "none",
              }}
            >
              <div>
                <div style={S.fornName}>{f.nome}</div>
                <div style={S.fornMeta}>{f.contato || "Sem contato informado"}</div>
                <div style={S.chips}>
                  {(f.produtos || []).map((p, pi) => (
                    <Chip key={pi}>
                      {p.nome} ({getUnitLabel(p.unidadeTipo, p.unidadeOutro)})
                      {p.precoEstimado !== null && p.precoEstimado !== undefined
                        ? ` · ${formatCurrency(p.precoEstimado)}`
                        : ""}
                    </Chip>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn sm onClick={() => editar(f.id)}>Editar</Btn>
                <Btn sm variant="danger" onClick={() => setConfirmDelete(f.id)}>Excluir</Btn>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        open={confirmDelete !== null}
        message="Tem certeza que deseja excluir este fornecedor? Os produtos vinculados a ele serão removidos dos pedidos."
        onConfirm={() => { excluirFornecedor(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
