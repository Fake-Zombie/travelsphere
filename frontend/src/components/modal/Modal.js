import React from "react";
import ReactDOM from "react-dom";
import "./modal.css";

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onConfirm, 
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "default"
}) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content modal-${type}`} onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            {cancelText}
          </button>
          {onConfirm && (
            <button className={`confirm-btn ${type}`} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

export default Modal;