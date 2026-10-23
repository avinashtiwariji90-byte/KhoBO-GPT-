"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import RequireAuth from "@/components/RequireAuth";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  api,
  ConversationItem,
  ChatMessage,
  FileItem,
} from "@/lib/api";
import {
  Sparkles,
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Copy,
  Check,
  RefreshCw,
  Send,
  Paperclip,
  X,
  Bot,
  User as UserIcon,
  FileText,
  Target,
  Menu,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  MessageSquare,
  Zap,
  MoreHorizontal,
} from "lucide-react";

// ─── Suggestion Cards ────────────────────────────────────────────────────────
const SUGGESTIONS = [
  {
    icon: "✍️",
    title: "Content Writing",
    prompt: "Write a compelling product launch email for a SaaS startup",
  },
  {
    icon: "💻",
    title: "Code Generation",
    prompt: "Write a complete FastAPI async streaming endpoint using SSE",
  },
  {
    icon: "🧠",
    title: "Explain Concepts",
    prompt: "Explain how vector embeddings work in AI in simple terms",
  },
  {
    icon: "📊",
    title: "Data Analysis",
    prompt: "Summarize the key requirements from my uploaded documents",
  },
  {
    icon: "🎯",
    title: "Lead Assistant",
    prompt: "I need an enterprise AI solution built with a $12,000 budget in Dubai",
  },
  {
    icon: "🔍",
    title: "Research",
    prompt: "What are the main differences between RAG and fine-tuning LLMs?",
  },
];

// ─── Message Action Bar ───────────────────────────────────────────────────────
function MessageActions({
  msg,
  onCopy,
  onEdit,
  onRegenerate,
  copiedId,
}: {
  msg: ChatMessage;
  onCopy: (text: string, id: string) => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  copiedId: string | null;
}) {
  const [liked, setLiked] = useState<boolean | null>(null);

  const isUser = msg.role === "user";

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={() => onCopy(msg.content, msg.id)}
        title="Copy"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 text-xs transition-all"
      >
        {copiedId === msg.id ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        {copiedId === msg.id ? "Copied" : "Copy"}
      </button>

      {isUser && onEdit && (
        <button
          onClick={onEdit}
          title="Edit message"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 text-xs transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit
        </button>
      )}

      {!isUser && (
        <>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              title="Regenerate response"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 text-xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
          )}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={() => setLiked(true)}
              title="Good response"
              className={`p-1.5 rounded-lg transition-all ${
                liked === true
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-slate-500 hover:text-white hover:bg-white/8"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLiked(false)}
              title="Bad response"
              className={`p-1.5 rounded-lg transition-all ${
                liked === false
                  ? "text-rose-400 bg-rose-400/10"
                  : "text-slate-500 hover:text-white hover:bg-white/8"
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────
function ChatDashboardContent() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("New Chat");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const [leadMode, setLeadMode] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<"success" | "error">("success");

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [aiEngineStatus, setAiEngineStatus] = useState<string>("ORA Intelligence");
  const [hasCloudKey, setHasCloudKey] = useState<boolean>(true);

  useEffect(() => {
    api.getAIStatus()
      .then((res) => {
        if (res && res.active_engine) {
          setAiEngineStatus(res.active_engine);
          setHasCloudKey(res.has_groq || res.has_gemini || res.has_openai);
        }
      })
      .catch(() => {});
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    const container = messagesContainerRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, streamedText, scrollToBottom]);

  // Show scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [inputMessage]);

  // Keyboard shortcut: Ctrl+K → new chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification(msg);
    setNotificationType(type);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadConversations = async (search?: string) => {
    try {
      const data = await api.getConversations(search);
      setConversations(data);
      if (data.length > 0 && !activeConvoId && !search) {
        selectConversation(data[0].id);
      }
    } catch {
      // First time or unauthenticated
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConvoId(id);
    setSidebarOpen(false);
    setStreamedText("");
    setIsStreaming(false);
    try {
      const detail = await api.getConversation(id);
      setActiveTitle(detail.title);
      setMessages(detail.messages.filter((m) => m.content?.trim()));
    } catch {
      //
    }
  };

  const handleNewChat = () => {
    setActiveConvoId(null);
    setActiveTitle("New Chat");
    setMessages([]);
    setInputMessage("");
    setAttachedFiles([]);
    setSidebarOpen(false);
    setStreamedText("");
    setIsStreaming(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const text = overrideText || inputMessage;
    if (!text.trim() || isStreaming) return;

    const userText = text.trim();
    setInputMessage("");
    setIsStreaming(true);
    setStreamedText("");

    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversation_id: activeConvoId || "pending",
      role: "user",
      content: userText,
      tokens: userText.split(" ").length,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      let currentConvoId = activeConvoId;

      await api.streamChat(
        {
          conversation_id: currentConvoId || undefined,
          content: userText,
          lead_assistant_mode: leadMode,
          file_ids: attachedFiles.map((f) => f.id),
        },
        (chunk) => {
          setStreamedText((prev) => prev + chunk);
        },
        async (doneData) => {
          if (doneData.lead_detected) {
            showNotification("🎯 Lead captured! Saved to Business CRM.");
          }
          if (doneData.conversation_id) {
            setActiveConvoId(doneData.conversation_id);
            try {
              const updated = await api.getConversation(doneData.conversation_id);
              setMessages(updated.messages.filter((m) => m.content?.trim()));
              setActiveTitle(updated.title);
              loadConversations();
            } catch {
              //
            } finally {
              setIsStreaming(false);
              setStreamedText("");
            }
          } else {
            setIsStreaming(false);
            setStreamedText("");
          }
        },
        (initData) => {
          if (!currentConvoId) {
            currentConvoId = initData.conversation_id;
            setActiveConvoId(initData.conversation_id);
            setActiveTitle(initData.title);
          }
        }
      );
    } catch (err: any) {
      setIsStreaming(false);
      setStreamedText("");
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          conversation_id: activeConvoId || "",
          role: "assistant",
          content: `⚠️ **Error:** ${err.message || "Failed to generate reply. Please try again."}`,
          tokens: 0,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInputMessage(prompt);
    textareaRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const uploaded = await api.uploadFile(file, activeConvoId || undefined);
      setAttachedFiles((prev) => [...prev, uploaded]);
      showNotification(`📎 Attached: ${uploaded.original_filename}`);
    } catch (err: any) {
      showNotification(err.message || "File upload failed", "error");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRename = async (id: string) => {
    if (!newTitle.trim()) return;
    try {
      await api.renameConversation(id, newTitle.trim());
      setRenamingId(null);
      if (activeConvoId === id) setActiveTitle(newTitle.trim());
      loadConversations();
    } catch {
      //
    }
  };

  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.togglePinConversation(id);
      loadConversations();
    } catch {
      //
    }
  };

  const handleDeleteConvo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      if (activeConvoId === id) handleNewChat();
      loadConversations();
    } catch {
      //
    }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editContent.trim()) return;
    try {
      await api.editMessage(msgId, editContent.trim());
      setEditingMessageId(null);
      if (activeConvoId) {
        const detail = await api.getConversation(activeConvoId);
        setMessages(detail.messages.filter((m) => m.content?.trim()));
      }
    } catch {
      //
    }
  };

  // Group conversations by date
  const pinnedConvos = conversations.filter((c) => c.is_pinned);
  const recentConvos = conversations.filter((c) => !c.is_pinned);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative bg-[#0b101b]">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl font-medium text-sm shadow-2xl backdrop-blur-md flex items-center gap-2 border transition-all animate-in slide-in-from-top-2 duration-300 ${
            notificationType === "error"
              ? "bg-rose-500/90 text-white border-rose-400"
              : "bg-[#0d1322] text-white border-cyan-500/40"
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          {notification}
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-72 bg-[#090d16] border-r border-white/8 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* New Chat Button */}
        <div className="p-3 border-b border-white/8">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-sm font-medium transition-all group"
          >
            <Plus className="w-4 h-4" />
            <span className="flex-1 text-left">New chat</span>
            <kbd className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              ⌘K
            </kbd>
          </button>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadConversations(e.target.value);
              }}
              placeholder="Search chats..."
              className="w-full bg-white/4 border border-white/8 hover:border-white/15 pl-9 pr-3 py-2 rounded-lg text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {pinnedConvos.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 px-2 py-1.5 font-semibold">
                📌 Pinned
              </p>
              {pinnedConvos.map((convo) => (
                <ConvoItem
                  key={convo.id}
                  convo={convo}
                  isActive={activeConvoId === convo.id}
                  onClick={() => selectConversation(convo.id)}
                  onPin={(e) => handleTogglePin(convo.id, e)}
                  onRename={() => { setRenamingId(convo.id); setNewTitle(convo.title); }}
                  onDelete={(e) => handleDeleteConvo(convo.id, e)}
                />
              ))}
              <div className="border-t border-white/8 my-1.5" />
            </>
          )}

          {recentConvos.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 px-2 py-1.5 font-semibold">
                Recent
              </p>
              {recentConvos.map((convo) => (
                <ConvoItem
                  key={convo.id}
                  convo={convo}
                  isActive={activeConvoId === convo.id}
                  onClick={() => selectConversation(convo.id)}
                  onPin={(e) => handleTogglePin(convo.id, e)}
                  onRename={() => { setRenamingId(convo.id); setNewTitle(convo.title); }}
                  onDelete={(e) => handleDeleteConvo(convo.id, e)}
                />
              ))}
            </>
          )}

          {conversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-xs text-slate-600">No conversations yet</p>
              <p className="text-[11px] text-slate-700 mt-1">Start chatting to see history</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/8">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">
                {user?.full_name || user?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-cyan-400 uppercase font-semibold tracking-wider">
                {user?.plan} Plan
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── Main Area ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <div className="h-13 border-b border-white/8 px-4 flex items-center justify-between bg-[#0b101b] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-white leading-tight">{activeTitle}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400">
                  {leadMode ? "🎯 Lead Mode • Capturing visitor info" : `⚡ KhoBO GPT • ${aiEngineStatus}`}
                </p>
                {!hasCloudKey && (
                  <a
                    href="/settings"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-all inline-flex items-center gap-1"
                  >
                    + Connect Free Groq Key
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Lead Mode Toggle */}
          <button
            onClick={() => setLeadMode(!leadMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              leadMode
                ? "bg-purple-500/15 text-purple-300 border-purple-500/40"
                : "bg-white/4 text-slate-500 hover:text-slate-300 border-white/8 hover:border-white/15"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            {leadMode ? "Lead Mode ON" : "Lead Mode"}
          </button>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
          style={{ scrollBehavior: "smooth" }}
        >
          {messages.length === 0 && !isStreaming ? (
            /* Welcome Screen */
            <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-400/60 shadow-2xl shadow-yellow-400/10 mb-5">
                <img src="/khobo-logo.jpg" alt="KhoBO GPT" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-300 via-white to-cyan-300 bg-clip-text text-transparent mb-2">
                Hello, {user?.full_name?.split(" ")[0] || "there"}! 👋
              </h3>
              <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-10">
                I'm KhoBO GPT — your Knowledge Horizon AI. Ask me anything — code, analysis, writing, or documents.
              </p>

              {/* Suggestion Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl text-left">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.prompt)}
                    className="p-4 rounded-xl bg-white/4 border border-white/8 hover:bg-white/7 hover:border-cyan-500/30 transition-all text-left group"
                  >
                    <div className="text-xl mb-2">{s.icon}</div>
                    <p className="text-xs font-semibold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{s.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message List */
            <div className="max-w-3xl mx-auto w-full">
              {messages
                .filter((m) => m.content?.trim())
                .map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`group px-4 py-6 border-b border-white/4 hover:bg-white/1.5 transition-colors ${
                        isUser ? "" : ""
                      }`}
                    >
                      <div className="flex gap-4 max-w-3xl mx-auto">
                        {/* Avatar */}
                        <div className="shrink-0 mt-0.5">
                          {isUser ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-600 to-slate-500 border border-white/10 flex items-center justify-center text-xs font-bold text-white uppercase">
                              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                              <Bot className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-400 mb-2">
                            {isUser ? (user?.full_name || "You") : "KhoBO GPT"}
                          </p>

                          {editingMessageId === msg.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={4}
                                className="w-full bg-white/5 border border-white/15 focus:border-cyan-500/50 rounded-xl p-3 text-sm text-white resize-none focus:outline-none transition-colors"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingMessageId(null)}
                                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-white/10 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(msg.id)}
                                  className="px-4 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors"
                                >
                                  Save & Send
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`text-sm ${isUser ? "text-slate-200" : "text-slate-100"}`}>
                              {isUser ? (
                                <p className="whitespace-pre-wrap leading-7">{msg.content}</p>
                              ) : (
                                <MarkdownRenderer content={msg.content} />
                              )}
                            </div>
                          )}

                          {/* Action Bar */}
                          {editingMessageId !== msg.id && (
                            <MessageActions
                              msg={msg}
                              onCopy={handleCopy}
                              onEdit={isUser ? () => handleStartEdit(msg) : undefined}
                              onRegenerate={
                                !isUser
                                  ? async () => {
                                      // Find last user message and re-send
                                      const userMsgs = messages.filter((m) => m.role === "user");
                                      const lastUser = userMsgs[userMsgs.length - 1];
                                      if (lastUser) await handleSendMessage(undefined, lastUser.content);
                                    }
                                  : undefined
                              }
                              copiedId={copiedId}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {/* Streaming bubble */}
              {isStreaming && (
                <div className="group px-4 py-6 border-b border-white/4 bg-white/1">
                  <div className="flex gap-4 max-w-3xl mx-auto">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-cyan-500/20">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-400 mb-2">KhoBO GPT</p>
                      <div className="text-sm text-slate-100">
                        {streamedText ? (
                          <MarkdownRenderer content={streamedText} isStreaming />
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a2235] border border-white/15 text-xs text-slate-300 hover:text-white shadow-xl hover:border-cyan-500/40 transition-all"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Scroll to bottom
          </button>
        )}

        {/* ── Input Area ──────────────────────────────────────────────── */}
        <div className="border-t border-white/8 bg-[#0b101b] px-4 pt-3 pb-4 shrink-0">
          {/* Attached file pills */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((f) => (
                <div
                  key={f.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[140px]">{f.original_filename}</span>
                  <button
                    onClick={() =>
                      setAttachedFiles((prev) => prev.filter((item) => item.id !== f.id))
                    }
                    className="hover:text-white ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input box */}
          <div className="relative flex items-end gap-2 max-w-3xl mx-auto">
            <div className="flex-1 relative bg-white/5 border border-white/12 hover:border-white/20 focus-within:border-cyan-500/50 rounded-2xl transition-colors shadow-lg">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  leadMode
                    ? "Describe your project, budget, or requirements..."
                    : "Message KhoBO GPT..."
                }
                rows={1}
                disabled={isStreaming}
                className="w-full bg-transparent px-4 py-3.5 pr-24 text-sm text-white placeholder:text-slate-600 resize-none focus:outline-none max-h-40 leading-relaxed"
              />

              {/* Input actions */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg,.jpeg"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Attach file"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all disabled:opacity-40"
                >
                  {uploadingFile ? (
                    <Zap className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isStreaming}
                  className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-2 max-w-3xl mx-auto">
            KhoBO GPT can make mistakes. Consider checking important information. &nbsp;·&nbsp;{" "}
            <span className="text-slate-700">Press Shift+Enter for new line</span>
          </p>
        </div>
      </main>

      {/* ── Rename Modal ──────────────────────────────────────────────── */}
      {renamingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1322] border border-white/15 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4">Rename Conversation</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename(renamingId)}
              className="w-full bg-white/5 border border-white/15 focus:border-cyan-500/50 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none mb-4 transition-colors"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenamingId(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRename(renamingId)}
                className="px-4 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Conversation Sidebar Item ────────────────────────────────────────────────
function ConvoItem({
  convo,
  isActive,
  onClick,
  onPin,
  onRename,
  onDelete,
}: {
  convo: ConversationItem;
  isActive: boolean;
  onClick: () => void;
  onPin: (e: React.MouseEvent) => void;
  onRename: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all ${
        isActive
          ? "bg-white/8 text-white border border-white/12"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-cyan-400" : ""}`} />
      <span className="truncate flex-1">{convo.title}</span>

      {/* Hover actions */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onPin}
          title={convo.is_pinned ? "Unpin" : "Pin"}
          className="p-1 rounded hover:text-cyan-400 hover:bg-white/8 transition-colors"
        >
          {convo.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          title="Rename"
          className="p-1 rounded hover:text-white hover:bg-white/8 transition-colors"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1 rounded hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────
export default function ChatDashboardPage() {
  return (
    <RequireAuth>
      <ChatDashboardContent />
    </RequireAuth>
  );
}
