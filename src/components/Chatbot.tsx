"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "👋 Hi! I'm the DSA Assistant. I can help you:\n\n🆕 **Apply** for Disabled Students Allowance\n🔍 **Check the status** of an existing application\n❓ Get **help** and information about DSA\n\nWhat would you like to do?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages,
          sessionData,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      if (data.sessionData !== undefined) {
        setSessionData(data.sessionData);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function renderMarkdown(text: string) {
    // Simple markdown: **bold**, [link](url), newlines
    const parts = text.split("\n").map((line, i) => {
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="govuk-link" style="color:#1d70b8">$1</a>');
      return <p key={i} style={{ margin: "2px 0" }} dangerouslySetInnerHTML={{ __html: formatted || "&nbsp;" }} />;
    });
    return <>{parts}</>;
  }

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open DSA Assistant chat"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "#1d70b8",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "28px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "400px",
      maxHeight: "600px",
      display: "flex",
      flexDirection: "column",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
      zIndex: 9999,
      overflow: "hidden",
      background: "#fff",
    }}>
      {/* Header */}
      <div style={{
        background: "#1d70b8",
        color: "#fff",
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <strong style={{ fontSize: "16px" }}>💬 DSA Assistant</strong>
          <span style={{ fontSize: "11px", marginLeft: "8px", opacity: 0.8, background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "3px" }}>AI-powered</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: "0 4px" }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px",
        maxHeight: "440px",
        background: "#f3f2f1",
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "10px",
            }}
          >
            <div style={{
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              background: msg.role === "user" ? "#1d70b8" : "#fff",
              color: msg.role === "user" ? "#fff" : "#0b0c0c",
              fontSize: "14px",
              lineHeight: "1.4",
              border: msg.role === "assistant" ? "1px solid #b1b4b6" : "none",
            }}>
              {renderMarkdown(msg.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "10px" }}>
            <div style={{
              padding: "10px 14px",
              borderRadius: "12px 12px 12px 2px",
              background: "#fff",
              border: "1px solid #b1b4b6",
              fontSize: "14px",
              color: "#505a5f",
            }}>
              Typing…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        display: "flex",
        borderTop: "1px solid #b1b4b6",
        background: "#fff",
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          disabled={loading}
          aria-label="Chat message"
          style={{
            flex: 1,
            padding: "12px 14px",
            border: "none",
            outline: "none",
            fontSize: "14px",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          style={{
            padding: "12px 16px",
            background: loading || !input.trim() ? "#b1b4b6" : "#1d70b8",
            color: "#fff",
            border: "none",
            cursor: loading || !input.trim() ? "default" : "pointer",
            fontSize: "16px",
          }}
        >
          ➤
        </button>
      </form>
    </div>
  );
}