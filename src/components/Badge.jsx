import { S } from "../tokens";

export function Badge({ children, color, bg }) {
  return <span style={{ ...S.badge, color, background: bg }}>{children}</span>;
}
