"use client";

import React from "react";
import Link from "next/link";
import { 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Briefcase, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Bot, 
  UploadCloud, 
  TrendingUp,
  Cpu,
  Lock,
  ChevronRight
} from "lucide-react";

export default function LandingPage() {

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-28 md:pt-28 md:pb-36 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow backdrop blur */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/20 via-indigo-600/20 to-purple-600/10 blur-[120px] pointer-events-none -z-10" />

        {/* Dynamic Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-8 backdrop-blur-md shadow-lg shadow-cyan-500/10 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Announcing KhoBO GPT 2.0 • Autonomous Lead Capture & Vector RAG</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-[1.15]">
          Your AI Assistant for{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            Conversations, Documents
          </span>{" "}
          & Leads
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl font-normal leading-relaxed">
          Chat with AI, understand your documents, and automatically capture qualified client leads with original enterprise intelligence and real-time streaming.
        </p>

        {/* Call to action buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/chat"
            className="flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-base shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all"
          >
            <Bot className="w-5 h-5" />
            Start Chatting Free
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          <Link
            href="/business"
            className="flex items-center gap-2 px-7 py-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-cyan-500/40 text-slate-200 font-medium text-base backdrop-blur-md transition-all"
          >
            <Briefcase className="w-5 h-5 text-cyan-400" />
            Explore Business Hub
          </Link>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 border-t border-white/10 bg-slate-950/40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineered for Precision, Speed & Conversion
          </h2>
          <p className="mt-4 text-base text-slate-400">
            A comprehensive unified AI suite combining state-of-the-art conversation with actionable business workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1: Contextual Chat */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Modern AI Chat Interface</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Real-time token streaming, multi-turn conversational memory, message regeneration, edit capability, and syntax-highlighted code blocks.
            </p>
          </div>

          {/* Card 2: Document RAG */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Deep Document Understanding</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload PDF, DOCX, CSV, TXT, or code repositories. Our automated parsing pipeline indexes documents for instant semantic citation and answers.
            </p>
          </div>

          {/* Card 3: AI Lead Assistant */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Autonomous Lead Capture</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Converts anonymous visitors into qualified leads. Captures client contacts, requirements, budgets, and location directly into your CRM.
            </p>
          </div>

          {/* Card 4: Business Dashboard */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Business & Lead CRM</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Filter leads by lifecycle status (New, Contacted, Qualified, Converted), track conversion rates, and export customer data via CSV.
            </p>
          </div>

          {/* Card 5: Security */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Zero-Leak Privacy & Roles</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              JWT authentication, bcrypt password hashing, and role isolation (User, Business, Admin). Private conversation content is never exposed.
            </p>
          </div>

          {/* Card 6: Enterprise API Architecture */}
          <div className="glass-panel p-8 rounded-2xl glass-panel-hover transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">FastAPI Backend Performance</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Built on asynchronous Python FastAPI with SQLAlchemy models, server-side environment security, and zero client-exposed API keys.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Transparent, Scalable Plans
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Start free, upgrade as your team and document intelligence requirements scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Free Explorer</h3>
              <p className="text-xs text-slate-400 mt-1">For casual queries and quick experimentation.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-slate-400 text-sm">/ month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 30 AI queries / month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 3 Document uploads</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Multi-turn chat memory</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Markdown & code highlighting</li>
              </ul>
            </div>
            <Link
              href="/register"
              className="mt-8 block text-center py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all"
            >
              Get Started Free
            </Link>
          </div>

          {/* Business Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border-cyan-500/50 shadow-2xl shadow-cyan-500/10 relative">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs">
              MOST POPULAR
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Business Lead Pro</h3>
              <p className="text-xs text-slate-400 mt-1">Automated client capture for agencies & startups.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$39</span>
                <span className="text-slate-400 text-sm">/ month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 500 AI queries / month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 50 Document vector uploads</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Autonomous Lead Assistant</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Business CRM & CSV export</li>
              </ul>
            </div>
            <Link
              href="/pricing"
              className="mt-8 block text-center py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:opacity-95 transition-all"
            >
              Upgrade to Business
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Enterprise Pro</h3>
              <p className="text-xs text-slate-400 mt-1">For maximum throughput, large teams & audits.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$89</span>
                <span className="text-slate-400 text-sm">/ month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 5,000 AI queries / month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> 200 Large documents (up to 25MB)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Priority SLA & Audit logs</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> Advanced neural reasoning</li>
              </ul>
            </div>
            <Link
              href="/pricing"
              className="mt-8 block text-center py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all"
            >
              Get Enterprise Pro
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#070a10] py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-white">KhoBO GPT</span>
            <span className="text-xs text-slate-500 ml-2">© 2026 KhoBO GPT Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/chat" className="hover:text-cyan-400 transition-colors">Chat</Link>
            <Link href="/files" className="hover:text-cyan-400 transition-colors">Documents</Link>
            <Link href="/business" className="hover:text-cyan-400 transition-colors">Business</Link>
            <Link href="/leads" className="hover:text-cyan-400 transition-colors">Leads</Link>
            <Link href="/pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

