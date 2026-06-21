import { T } from "../tokens";

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: 12, color: T.red600, marginTop: 4, fontWeight: 500 }}>{children}</div>
  );
}
