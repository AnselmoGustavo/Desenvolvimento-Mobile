export function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!isFinite(num)) return "";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parsePrice(val) {
  const txt = (val || "").toString().trim();
  if (!txt) return null;
  const norm = txt.replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
  const num = Number(norm);
  return isFinite(num) ? num : null;
}

export function getUnitLabel(unidadeTipo, unidadeOutro) {
  if (unidadeTipo === "Outro") return (unidadeOutro || "").trim() || "Outro";
  return unidadeTipo || "Unidade";
}

export function getInitials(name) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function genId() {
  return Date.now().toString() + Math.floor(Math.random() * 9999).toString();
}
