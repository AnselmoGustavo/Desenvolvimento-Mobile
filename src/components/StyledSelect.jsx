import { S, T } from "../tokens";

export function StyledSelect({ value, onChange, children }) {
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={S.select}>
        {children}
      </select>
      <span
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", color: T.stone400, fontSize: 10,
        }}
      >
        ▼
      </span>
    </div>
  );
}
