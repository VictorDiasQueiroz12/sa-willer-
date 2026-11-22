import { useEffect, useRef } from 'react';

export function ActionErrorDialog({ message, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node.open) node.showModal();
    return () => { if (node.open) node.close(); };
  }, []);

  return (
    <dialog className="feedback-dialog panel" ref={dialog} aria-labelledby="action-error-title"
      aria-describedby="action-error-message" onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}>
      <h2 id="action-error-title">Não foi possível concluir a operação</h2>
      <p id="action-error-message">{message}</p>
      <button type="button" className="btn primary" autoFocus onClick={onClose}>Entendi</button>
    </dialog>
  );
}

export function SuccessNotice({ message, onClose }) {
  return (
    <div className="notice feedback-notice">
      <p role="status">{message}</p>
      <button type="button" className="btn small" onClick={onClose} aria-label="Dispensar notificação">×</button>
    </div>
  );
}
