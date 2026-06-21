import { S } from "../tokens";

export function Btn({ children, onClick, variant = "default", sm = false, full = false, style: extra = {} }) {
  const variantStyle =
    variant === "primary" ? S.btnPrimary :
    variant === "danger"  ? S.btnDanger  :
    variant === "amber"   ? S.btnAmber   : {};
  return (
    <button
      onClick={onClick}
      style={{ ...S.btn, ...(sm ? S.btnSm : {}), ...(full ? S.btnFull : {}), ...variantStyle, ...extra }}
    >
      {children}
    </button>
  );
}
