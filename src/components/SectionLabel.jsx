import { S } from "../tokens";

export function SectionLabel({ children, style: extra = {} }) {
  return <div style={{ ...S.sectionLabel, ...extra }}>{children}</div>;
}
