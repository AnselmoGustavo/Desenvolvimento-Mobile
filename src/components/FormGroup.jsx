import { S } from "../tokens";

export function FormGroup({ label, children }) {
  return (
    <div style={S.formGroup}>
      {label && <label style={S.formLabel}>{label}</label>}
      {children}
    </div>
  );
}
