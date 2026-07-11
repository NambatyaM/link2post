"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { RepurposeResult } from "@/lib/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: RepurposeResult;
  streaming?: boolean;
  model?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

const MODELS = [
  { id: "", label: "Auto (best available)" },
  { id: "bbl/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "opc/nemotron-3-ultra-free", label: "Nemotron 3 Ultra" },
  { id: "bbl/gpt-5.5-mini", label: "GPT-5.5 Mini" },
  { id: "opc/deepseek-v4-flash-free", label: "DeepSeek V4" },
];

const CHATS_KEY = "contentrep_chats";
const DEVICE_ID_KEY = "contentrep_device_id";
const JWT_KEY = "contentrep_jwt";
const MODEL_KEY = "contentrep_model";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* */ }
}

function parseAIResponse(raw: string): RepurposeResult | null {
  let cleaned = raw.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(cleaned) as RepurposeResult;
  } catch { /* */ }

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as RepurposeResult;
    } catch { /* */ }
  }

  return null;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [chats, setChats] = useState<Chat[]>(() => loadFromStorage(CHATS_KEY, []));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focus, setFocus] = useState("");
  const [tone, setTone] = useState("professional");
  const [showOptions, setShowOptions] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => loadFromStorage(MODEL_KEY, ""));
  const [repurposeCount, setRepurposeCount] = useState(0);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const jwtRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => { setMounted(true); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  useEffect(() => { saveToStorage(CHATS_KEY, chats); }, [chats]);

  useEffect(() => { saveToStorage(MODEL_KEY, selectedModel); }, [selectedModel]);

  useEffect(() => {
    async function initAuth() {
      let deviceId = loadFromStorage<string | null>(DEVICE_ID_KEY, null);
      if (!deviceId) {
        deviceId = generateUUID();
        saveToStorage(DEVICE_ID_KEY, deviceId);
      }

      let jwt = loadFromStorage<string | null>(JWT_KEY, null);
      if (!jwt) {
        try {
          const res = await fetch("/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId }),
          });
          if (res.ok) {
            const data = await res.json();
            jwt = data.token;
            if (jwt) saveToStorage(JWT_KEY, jwt);
          }
        } catch { /* */ }
      }
      jwtRef.current = jwt;
    }
    initAuth();
  }, []);

  useEffect(() => {
    async function loadUsage() {
      const headers: Record<string, string> = {};
      if (jwtRef.current) headers["Authorization"] = `Bearer ${jwtRef.current}`;
      try {
        const res = await fetch("/api/repurpose", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ content: "x".repeat(50) }),
        });
        const remaining = res.headers.get("X-RateLimit-Remaining");
        if (remaining !== null) {
          const r = parseInt(remaining, 10);
          setRateLimitRemaining(r);
          setRepurposeCount(Math.max(0, 10 - r));
        }
      } catch { /* */ }
    }
    if (jwtRef.current) loadUsage();
  }, []);

  const uid = useCallback(() => {
    idCounter.current += 1;
    return `${Date.now()}-${idCounter.current}`;
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = useMemo(() => activeChat?.messages || [], [activeChat]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isGenerating, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const createNewChat = () => {
    const newChat: Chat = { id: uid(), title: "New chat", messages: [] };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInput("");
  };

  const updateChatTitle = (chatId: string, content: string) => {
    const title = content.slice(0, 40) + (content.length > 40 ? "..." : "");
    setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title } : c));
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    if (text.length < 50) {
      showToast("Content must be at least 50 characters.");
      return;
    }

    const remaining = rateLimitRemaining !== null ? rateLimitRemaining : 10;
    if (remaining <= 0) {
      showToast("You've used all free generations. Please try again later.");
      return;
    }

    let chatId = activeChatId;

    if (!chatId) {
      const newChat: Chat = { id: uid(), title: text.slice(0, 40) + "...", messages: [] };
      setChats((prev) => [newChat, ...prev]);
      chatId = newChat.id;
      setActiveChatId(chatId);
    } else {
      updateChatTitle(chatId, text);
    }

    const userMsg: Message = { id: uid(), role: "user", content: text };
    setChats((prev) => prev.map((c) =>
      c.id === chatId ? { ...c, messages: [...c.messages, userMsg] } : c
    ));
    setInput("");
    setIsGenerating(true);

    const streamingMsgId = uid();
    const streamingMsg: Message = {
      id: streamingMsgId, role: "assistant", content: "", streaming: true,
    };
    setChats((prev) => prev.map((c) =>
      c.id === chatId ? { ...c, messages: [...c.messages, streamingMsg] } : c
    ));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (jwtRef.current) headers["Authorization"] = `Bearer ${jwtRef.current}`;

      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers,
        body: JSON.stringify({ content: text, focus, tone, model: selectedModel || undefined }),
        signal: abortController.signal,
      });

      const remainingHeader = res.headers.get("X-RateLimit-Remaining");
      if (remainingHeader !== null) {
        const r = parseInt(remainingHeader, 10);
        setRateLimitRemaining(r);
        setRepurposeCount(Math.max(0, 10 - r));
      }

      if (res.status === 429) {
        const errData = await res.json();
        updateMsg(chatId, streamingMsgId, `\u26a0\ufe0f ${errData.error}`);
      } else if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed." }));
        updateMsg(chatId, streamingMsgId, `\u26a0\ufe0f ${errData.error || "Something went wrong."}`);
      } else {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let usedModel = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.model && !parsed.content) {
                  usedModel = parsed.model;
                }
                if (typeof parsed.content === "string" && parsed.content.length > 0) {
                  accumulated += parsed.content;
                  updateMsgContent(chatId, streamingMsgId, accumulated);
                }
              } catch { /* */ }
            }
          }
        }

        const parsedResult = parseAIResponse(accumulated);
        if (parsedResult) {
          setChats((prev) => prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === streamingMsgId
                      ? {
                          ...m,
                          content: "Here are your **8 platform-ready posts**. Click any tab to view and copy each format.",
                          result: parsedResult,
                          streaming: false,
                          model: usedModel,
                        }
                      : m
                  ),
                }
              : c
          ));
        } else {
          updateMsg(chatId, streamingMsgId, accumulated || "No response received. Please try again.");
        }
        setRepurposeCount((n) => n + 1);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        updateMsg(chatId, streamingMsgId, "\u26a0\ufe0f Generation cancelled.");
      } else {
        updateMsg(chatId, streamingMsgId, "\u26a0\ufe0f Network error. Please try again.");
      }
    }

    abortControllerRef.current = null;
    setIsGenerating(false);
  };

  const updateMsg = (chatId: string, msgId: string, content: string) => {
    setChats((prev) => prev.map((c) =>
      c.id === chatId
        ? {
            ...c,
            messages: c.messages.map((m) =>
              m.id === msgId ? { ...m, content, streaming: false } : m
            ),
          }
        : c
    ));
  };

  const updateMsgContent = (chatId: string, msgId: string, content: string) => {
    setChats((prev) => prev.map((c) =>
      c.id === chatId
        ? {
            ...c,
            messages: c.messages.map((m) =>
              m.id === msgId ? { ...m, content } : m
            ),
          }
        : c
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStop = () => { abortControllerRef.current?.abort(); };

  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  };

  const showWelcome = !activeChatId || messages.length === 0;

  const displayRemaining = rateLimitRemaining !== null
    ? rateLimitRemaining
    : Math.max(0, 10 - repurposeCount);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
          {toast}
        </div>
      )}

      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-200"
        style={{
          width: sidebarOpen ? 260 : 0,
          background: "var(--bg-secondary)",
          borderRight: sidebarOpen ? "1px solid var(--border-light)" : "none",
          overflow: "hidden",
        }}
      >
        <div className="flex flex-col h-full w-[260px]">
          <div className="p-3 flex items-center gap-2">
            <button
              onClick={createNewChat}
              className="flex-1 flex items-center justify-start gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New chat
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2.5 rounded-lg transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {chats.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No conversations yet</p>
            )}
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="sidebar-item group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm mb-0.5"
                style={{
                  background: chat.id === activeChatId ? "var(--bg-hover)" : "transparent",
                  color: chat.id === activeChatId ? "var(--text-primary)" : "var(--text-secondary)",
                }}
                onClick={() => { setActiveChatId(chat.id); setInput(""); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                <span className="flex-1 truncate">{chat.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 border-t" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm" style={{ color: "var(--text-secondary)" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "white" }}>U</div>
              <span className="flex-1 truncate">Free Plan</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                {displayRemaining > 0 ? `${displayRemaining}/10` : "0/10"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: "1px solid var(--border-light)" }}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            </button>
          )}
          <div className="flex items-center gap-2 flex-1">
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>ContentRep</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--text-muted)" }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--bg-tertiary)", color: displayRemaining > 0 ? "var(--accent)" : "var(--text-muted)" }}>
              {displayRemaining > 0 ? `${displayRemaining} free` : "Sign up"}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {showWelcome ? (
            <div className="flex flex-col items-center justify-center h-full px-4 animate-fade">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>ContentRep AI</h1>
              <p className="text-sm mb-8 text-center max-w-md" style={{ color: "var(--text-muted)" }}>
                Paste any blog post, article, or long-form content and get 8 platform-ready posts instantly.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-lg w-full">
                {[
                  { icon: "\ud835\udd4f", label: "Twitter threads", color: "#1da1f2" },
                  { icon: "in", label: "LinkedIn posts", color: "#0a66c2" },
                  { icon: "\ud83d\udcf7", label: "Instagram captions", color: "#e4405f" },
                  { icon: "\u266a", label: "TikTok scripts", color: "#ff0050" },
                  { icon: "r/", label: "Reddit posts", color: "#ff4500" },
                  { icon: "\u2709", label: "Email newsletters", color: "#10b981" },
                  { icon: "\u25b6", label: "YouTube community", color: "#ff0000" },
                  { icon: "\ud83d\udcc5", label: "7-day calendar", color: "#f59e0b" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setInput(`Turn this into a ${item.label}:\n\n`); textareaRef.current?.focus(); }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left transition-colors"
                    style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}
                  >
                    <span style={{ color: item.color, fontSize: 14 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-[768px] mx-auto px-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onCopy={showToast} />
              ))}
              {isGenerating && (
                <div className="flex gap-3 py-6 animate-fade">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--accent)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="max-w-[768px] mx-auto">
            <div className="flex items-center gap-2 mb-2 px-1">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors"
                style={{
                  color: showOptions ? "var(--accent)" : "var(--text-muted)",
                  background: showOptions ? "rgba(16,163,127,0.1)" : "transparent",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Options
              </button>
            </div>

            {showOptions && (
              <div className="flex gap-2 mb-2 animate-fade">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="funny">Funny</option>
                  <option value="inspirational">Inspirational</option>
                  <option value="educational">Educational</option>
                </select>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Focus angle (e.g. marketing tips)"
                  className="text-xs px-2 py-1.5 rounded-lg flex-1"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                />
              </div>
            )}

            <div
              className="flex items-end rounded-2xl px-4 py-3"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste your blog post, article, or any long-form content..."
                rows={1}
                className="flex-1 text-sm resize-none bg-transparent leading-relaxed"
                style={{ color: "var(--text-primary)" }}
                disabled={isGenerating}
              />
              {isGenerating ? (
                <button
                  onClick={handleStop}
                  className="ml-2 p-1.5 rounded-lg transition-all shrink-0"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                  title="Stop generating"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="ml-2 p-1.5 rounded-lg transition-all disabled:opacity-20 shrink-0"
                  style={{ background: input.trim() ? "var(--accent)" : "var(--bg-tertiary)", color: "white" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              )}
            </div>
            <p className="text-center mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
              ContentRep can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message, onCopy }: { message: Message; onCopy?: (msg: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end py-4 animate-fade">
        <div className="max-w-[80%] rounded-3xl px-4 py-2.5 text-sm" style={{ background: "var(--bg-user-msg)", color: "var(--text-primary)" }}>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 py-6 animate-fade">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--accent)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        {message.result ? (
          <ResultBlock result={message.result} intro={message.content} model={message.model} onCopy={onCopy} />
        ) : message.streaming ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
            {message.content}
            <span className="inline-block w-2 h-4 ml-0.5 align-middle rounded-sm" style={{ background: "var(--text-primary)", animation: "blink 1s infinite" }} />
          </div>
        ) : (
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text-primary)" }}
            dangerouslySetInnerHTML={{
              __html: message.content
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n/g, "<br/>"),
            }}
          />
        )}
      </div>
    </div>
  );
}

function ResultBlock({ result, intro, model, onCopy }: { result: RepurposeResult; intro: string; model?: string; onCopy?: (msg: string) => void }) {
  const [activeTab, setActiveTab] = useState("twitter");
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: "twitter", label: "\ud835\udd4f Twitter" },
    { id: "linkedin_story", label: "LinkedIn Story" },
    { id: "linkedin_listicle", label: "LinkedIn List" },
    { id: "instagram", label: "\ud83d\udcf7 Instagram" },
    { id: "tiktok", label: "\u266a TikTok" },
    { id: "reddit", label: "r/ Reddit" },
    { id: "email", label: "\u2709 Email" },
    { id: "youtube", label: "\u25b6 YouTube" },
    { id: "calendar", label: "\ud83d\udcc5 Calendar" },
  ];

  const getText = (tabId?: string): string => {
    const t = tabId || activeTab;
    switch (t) {
      case "twitter": return result.twitter_thread?.join("\n\n") || "";
      case "linkedin_story": return result.linkedin_story || "";
      case "linkedin_listicle": return result.linkedin_listicle || "";
      case "instagram": return result.instagram_caption || "";
      case "tiktok": return result.tiktok_script || "";
      case "reddit": return result.reddit ? `TITLE: ${result.reddit.title}\n\nSUBREDDITS: ${result.reddit.subreddits?.join(", ")}\n\n${result.reddit.body}` : "";
      case "email": return `--- DIGEST ---\n\n${result.email_digest || ""}\n\n\n--- DEEP DIVE ---\n\n${result.email_deep_dive || ""}`;
      case "youtube": return result.youtube_community || "";
      case "calendar": return result.content_calendar?.map((c) => `${c.day} \u2192 ${c.platform}\n${c.post}`).join("\n\n") || "";
      default: return "";
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = () => {
    const all = tabs.map((t) => `=== ${t.label} ===\n\n${getText(t.id)}`).join("\n\n---\n\n");
    navigator.clipboard.writeText(all);
    onCopy?.("All platforms copied!");
  };

  const text = getText();

  return (
    <div>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }}
        dangerouslySetInnerHTML={{
          __html: intro.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>"),
        }}
      />

      <div className="rounded-t-xl overflow-hidden" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center overflow-x-auto" style={{ borderBottom: "1px solid var(--border-light)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                background: activeTab === tab.id ? "var(--bg-primary)" : "transparent",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-2 text-xs transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Copy all platforms"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy All
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs transition-colors"
            style={{ color: copied ? "var(--accent)" : "var(--text-muted)" }}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy Tab
              </>
            )}
          </button>
        </div>

        <div className="p-4">
          {activeTab === "instagram" && result.instagram_carousel_titles && (
            <div className="mb-4 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Carousel Slide Titles:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.instagram_carousel_titles.map((t, i) => (
                  <span key={i} className="px-2 py-1 rounded-full text-xs" style={{ background: "rgba(228,64,95,0.12)", color: "#e4405f" }}>
                    {i + 1}. {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <pre className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-primary)", fontFamily: "inherit" }}>
            {text}
          </pre>

          {activeTab === "reddit" && result.reddit?.subreddits && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Suggested subreddits:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.reddit.subreddits.map((s, i) => (
                  <span key={i} className="px-2 py-1 rounded-full text-xs" style={{ background: "rgba(255,69,0,0.12)", color: "#ff4500" }}>r/{s}</span>
                ))}
              </div>
            </div>
          )}

          {activeTab === "instagram" && result.hashtags?.instagram && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Hashtags:</p>
              <div className="flex flex-wrap gap-1">
                {result.hashtags.instagram.map((h, i) => (
                  <span key={i} className="text-xs" style={{ color: "var(--accent)" }}>#{h}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {text.length} chars
            </span>
            {model && (
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                {model.split("/").pop()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-md transition-colors" style={{ color: "var(--text-muted)" }} title="Good response">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
            </button>
            <button className="p-1.5 rounded-md transition-colors" style={{ color: "var(--text-muted)" }} title="Bad response">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
