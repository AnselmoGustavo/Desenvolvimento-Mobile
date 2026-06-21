import { T } from "../tokens";
import { Modal } from "./Modal";
import { Btn } from "./Btn";

export function ConfirmModal({ open, message, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title="Confirmar">
      <p style={{ fontSize: 14, color: T.stone800, lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn onClick={onCancel}>Cancelar</Btn>
        <Btn variant="danger" onClick={onConfirm}>Confirmar</Btn>
      </div>
    </Modal>
  );
}
