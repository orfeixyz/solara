import React from "react";
import ChatPanel from "./ChatPanel";

export default function ChatDrawer({ open, onClose, messages, connectedUsers, onSend, currentUser }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal chat-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <h3>Solar Network Chat</h3>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <ChatPanel
          messages={messages}
          connectedUsers={connectedUsers}
          onSend={onSend}
          currentUser={currentUser}
          compact
        />
      </div>
    </div>
  );
}
