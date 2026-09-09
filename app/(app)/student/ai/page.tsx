"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeading } from "@/components/shared";
import { useToast, Spinner } from "@/components/ui";
import { AI_SUGGESTED_QUESTIONS } from "@/lib/ai";

interface Msg { role: "user" | "assistant"; content: string }

function renderMsg(text: string) {
  // lightweight markdown-ish rendering: bold, code blocks, numbered lines
  return text.split("\n").map((line, i) => {
    const bolded = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={j} className="font-bold text-ink-900">{part.slice(2, -2)}</strong> : part
    );
    const mono = line.startsWith("```");
    if (mono) return null;
    return (
      <p key={i} className={`${line.match(/^\d+\./) ? "pl-4" : ""} ${line.startsWith("_") && line.endsWith("_") ? "text-xs text-ink-400 italic" : ""} min-h-[4px]`}>
        {bolded}
      </p>
    );
  }).filter((_, i, arr) => !(text.split("\n")[i]?.startsWith("```")));
}

export default function AiAssistantPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [provider, setProvider] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/assistant")
      .then((r) => r.json())
      .then((j) => { setMessages(j.messages ?? []); setProvider(j.provider ?? ""); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "AI request failed");
      setMessages((m) => [...m, { role: "assistant", content: j.reply }]);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "AI request failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I could not process that. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    await fetch("/api/ai/assistant", { method: "DELETE" });
    setMessages([]);
    toast("info", "Chat cleared");
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <PageHeading
        title="AI Academic Assistant"
        subtitle={`Conversational study help${provider ? ` · engine: ${provider}` : ""}`}
        action={<button className="btn-secondary" onClick={clearChat} disabled={messages.length === 0}>🗑 Clear chat</button>}
      />

      <div className="card flex-1 overflow-y-auto p-4 sm:p-5 chat-scroll">
        {loaded && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="text-5xl mb-4" aria-hidden>🤖</div>
            <h3 className="text-xl font-black text-ink-900">Ask me anything academic</h3>
            <p className="text-sm text-ink-500 mt-2 max-w-md">
              I explain concepts simply, give technical depth, worked examples and step-by-step reasoning.
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5 mt-6 w-full max-w-lg">
              {AI_SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} className="card card-hover !rounded-xl p-3 text-sm font-medium text-left text-ink-700 hover:!border-brand-300"
                  onClick={() => send(q)}>
                  “{q}”
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-600 text-white rounded-br-md"
                  : "bg-ink-50 border border-ink-100 text-ink-800 rounded-bl-md"
              }`}>
                {m.role === "assistant" ? <div className="space-y-0.5">{renderMsg(m.content)}</div> : m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-ink-50 border border-ink-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Spinner className="w-4 h-4 text-brand-500" />
                <span className="text-sm text-ink-500">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form className="mt-3 flex gap-2.5" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input className="input flex-1" placeholder="Ask an academic question… e.g., What is polymorphism in Java?"
          value={input} onChange={(e) => setInput(e.target.value)} aria-label="Ask the AI assistant" />
        <button className="btn-primary" disabled={sending || input.trim().length < 2} aria-label="Send message">Send ➤</button>
      </form>
      <p className="text-[11px] text-ink-400 mt-2 text-center">
        AI answers are study aids — always verify with your syllabus and prescribed textbooks.
      </p>
    </div>
  );
}
