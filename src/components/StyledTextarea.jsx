import { S } from "../tokens";

export function StyledTextarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={S.textarea}
    />
  );
}
