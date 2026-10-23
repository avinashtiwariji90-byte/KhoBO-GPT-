"use client";

import React, { useState, useEffect } from "react";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  Save,
  Key,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";

// ─── Settings Content ─────────────────────────────────────────────────────────
function SettingsPageContent() {
  const [model, setModel] = useState("ora-ultra-4");
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are KhoBO GPT, an advanced enterprise AI assistant built for high-performance conversations, deep document intelligence, code generation, and business lead qualification."
  );
  const [autoLeadDetection, setAutoLeadDetection] = useState(true);
  const [saved, setSaved] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  // AI Provider Keys
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [aiStatus, setAiStatus] = useState<{
    has_groq: boolean;
    has_gemini: boolean;
    has_openai: boolean;
    active_engine: string;
    groq_masked: string;
    gemini_masked: string;
    openai_masked: string;
  } | null>(null);

  useEffect(() => {
    // Load local preferences
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ora_settings");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.model) setModel(parsed.model);
          if (parsed.temperature !== undefined) setTemperature(parsed.temperature);
          if (parsed.systemPrompt) setSystemPrompt(parsed.systemPrompt);
          if (parsed.autoLeadDetection !== undefined)
            setAutoLeadDetection(parsed.autoLeadDetection);
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Load AI Provider Status
    api.getAIStatus()
      .then((res) => {
        setAiStatus(res);
      })
      .catch((err) => console.error("Error fetching AI status:", err));
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "ora_settings",
        JSON.stringify({ model, temperature, systemPrompt, autoLeadDetection })
      );
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    try {
      const res = await api.updateAIKeys({
        groq_api_key: groqKey ? groqKey.trim() : undefined,
        gemini_api_key: geminiKey ? geminiKey.trim() : undefined,
        openai_api_key: openaiKey ? openaiKey.trim() : undefined,
      });
      if (res && res.engine_status) {
        setAiStatus(res.engine_status);
      }
      setGroqKey("");
      setGeminiKey("");
      setOpenaiKey("");
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3500);
    } catch (err: any) {
      alert("Error saving API keys: " + (err.message || "Failed"));
    } finally {
      setSavingKeys(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-2">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          System & Model Configuration
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          AI Assistant Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure live AI cloud engines, API credentials, and autonomous reasoning parameters.
        </p>
      </div>

      {/* ── 1. Live AI Providers & Keys ─────────────────────────────────── */}
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Key className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">AI Cloud Providers & API Keys</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connect external cloud providers for full LLaMA 3.3 70B, Gemini, or GPT-4o intelligence.
            </p>
          </div>

          {/* Active Engine Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              Active:{" "}
              <strong className="text-cyan-400">
                {aiStatus?.active_engine || "Built-in ORA Intelligence"}
              </strong>
            </span>
          </div>
        </div>

        {keySaved && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>AI API keys saved and hot-reloaded! Future conversations will now use this live provider.</span>
          </div>
        )}

        <form onSubmit={handleSaveKeys} className="space-y-5">
          {/* Groq (Recommended & Free) */}
          <div className="p-4.5 rounded-xl bg-slate-900/60 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Groq API Key (LLaMA 3.3 70B)</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                  Recommended • 100% Free
                </span>
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Provides ultra-fast, live ChatGPT-quality conversational and coding intelligence. No credit card required.
            </p>
            <input
              type="password"
              placeholder={aiStatus?.has_groq ? `Configured (${aiStatus.groq_masked}) — Enter new key to replace` : "gsk_..."}
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
            />
          </div>

          {/* Google Gemini */}
          <div className="p-4.5 rounded-xl bg-slate-900/60 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-white">Google Gemini API Key (Gemini 1.5 Flash)</span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-semibold">
                  Free Tier Available
                </span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                Get Free Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder={aiStatus?.has_gemini ? `Configured (${aiStatus.gemini_masked}) — Enter new key to replace` : "AIzaSy..."}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
            />
          </div>

          {/* OpenAI Key */}
          <div className="p-4.5 rounded-xl bg-slate-900/60 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">OpenAI API Key (GPT-4o / GPT-4o-mini)</span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                OpenAI Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder={aiStatus?.has_openai ? `Configured (${aiStatus.openai_masked}) — Enter new key to replace` : "sk-..."}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Keys are saved strictly server-side in your <code>.env</code> and never exposed to clients.</span>
            </div>
            <button
              type="submit"
              disabled={savingKeys || (!groqKey && !geminiKey && !openaiKey)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              {savingKeys ? "Saving & Connecting..." : "Save & Connect Keys"}
            </button>
          </div>
        </form>
      </div>

      {/* ── 2. General Preferences ──────────────────────────────────────── */}
      <div className="glass-panel p-8 rounded-2xl shadow-2xl border border-white/10">
        <h2 className="text-lg font-bold text-white mb-2">Persona & Prompt Behavior</h2>
        <p className="text-xs text-slate-400 mb-6">
          Customize temperature creativity, system persona guidelines, and lead capture preferences.
        </p>

        {saved && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            AI configuration saved! Changes are applied to future chat sessions.
          </div>
        )}

        <form onSubmit={handleSavePreferences} className="space-y-6">
          {/* Temperature Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Temperature / Creativity ({temperature})
              </label>
              <span className="text-[11px] text-slate-400">
                {temperature < 0.4 ? "Precise & Analytical" : temperature > 0.8 ? "Highly Creative" : "Balanced"}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Base System Persona Instructions
            </label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono leading-relaxed"
            />
          </div>

          {/* Lead Capture Toggle */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white">Autonomous Lead Entity Extraction</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Automatically detect prospective client details (contact, budget, location) in chat and register into Business CRM.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoLeadDetection(!autoLeadDetection)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                autoLeadDetection ? "bg-cyan-500" : "bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoLeadDetection ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-white/10 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Persona Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page with Auth Guard ─────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsPageContent />
    </RequireAuth>
  );
}

