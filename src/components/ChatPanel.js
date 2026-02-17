import React, { useEffect, useMemo, useRef, useState } from "react";

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ messages, connectedUsers, onSend, currentUser, compact = false }) {
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  const normalized = useMemo(
    () =>
      (messages || []).map((msg) => ({
        ...msg,
        mine: msg.user === currentUser || msg.user === "You"
      })),
    [messages, currentUser]
  );

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [normalized]);

  const submit = (event) => {
    event.preventDefault();
    onSend(draft);
    setDraft("");
  };

  return (
    <section className={`panel chat-panel ${compact ? "compact" : ""}`}>
      <div className="panel-heading">
        <h3>Realtime Chat</h3>
        <p>{connectedUsers.length} online</p>
      </div>
      <div className="connected-users">
        {connectedUsers.map((name) => (
          <span key={name} className="chip">
            {name}
          </span>
        ))}
      </div>

      <div className="chat-list" ref={listRef}>
        {normalized.map((msg) => (
          <article key={msg.id} className={`chat-row ${msg.mine ? "mine" : "other"} ${msg.type === "system" ? "system" : ""}`}>
            <div className="chat-bubble">
              {msg.type !== "system" && <header>{msg.user}</header>}
              <p>{msg.message}</p>
              <small>{formatTime(msg.createdAt)}</small>
            </div>
          </article>
        ))}
      </div>

      <form onSubmit={submit} className="chat-form">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message..."
          maxLength={240}
        />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}
