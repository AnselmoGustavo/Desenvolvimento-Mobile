import { S } from "../tokens";

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.modal}>
        <button style={S.modalClose} onClick={onClose}>✕</button>
        <div style={S.modalTitle}>{title}</div>
        {children}
      </div>
    </div>
  );
}
