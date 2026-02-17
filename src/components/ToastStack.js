import React from "react";

export default function ToastStack({ toasts = [] }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type || "info"}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
