"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Briefcase, 
  Users, 
  Shield, 
  CreditCard, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  ChevronDown
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // If in active full-screen chat dashboard, navbar is streamlined
  const isChat = pathname === "/chat";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090d16]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-yellow-400/60 shadow-lg shadow-yellow-400/20 group-hover:scale-105 group-hover:border-yellow-400 transition-all duration-300">
            <Image
              src="/khobo-logo.jpg"
              alt="KhoBO GPT Logo"
              width={44}
              height={44}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-300 via-white to-cyan-300 bg-clip-text text-transparent">
              KhoBO GPT
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-yellow-400/80 -mt-1">
              Knowledge Horizon Beyond Opportunities
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/chat"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname === "/chat"
                ? "text-cyan-400 bg-white/5 border border-cyan-500/20"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </Link>

          <Link
            href="/files"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname === "/files"
                ? "text-cyan-400 bg-white/5 border border-cyan-500/20"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents
          </Link>

          <Link
            href="/pricing"
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname === "/pricing"
                ? "text-cyan-400 bg-white/5 border border-cyan-500/20"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Pricing
          </Link>

          {user?.role === "admin" && (
            <Link
              href="/admin"
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                pathname === "/admin" || pathname.startsWith("/admin")
                  ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 shadow-sm shadow-cyan-500/20"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              Admin Hub
            </Link>
          )}
        </nav>

        {/* User / Auth Action Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/10 bg-slate-900/60 hover:border-cyan-500/40 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {user.full_name ? user.full_name.charAt(0) : user.email.charAt(0)}
                </div>
                <div className="hidden sm:block text-xs">
                  <div className="font-medium text-slate-200 truncate max-w-[120px]">
                    {user.full_name || user.email.split("@")[0]}
                  </div>
                  <div className="text-[10px] text-cyan-400 uppercase font-semibold tracking-wider">
                    {user.plan} Plan
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d1322] shadow-2xl py-2 z-50 backdrop-blur-xl"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {user.role} • {user.plan}
                    </div>
                  </div>

                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-cyan-300 hover:text-white hover:bg-cyan-500/10 font-medium"
                    >
                      <Shield className="w-4 h-4 text-cyan-400" />
                      Admin Hub & CRM
                    </Link>
                  )}

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <UserIcon className="w-4 h-4 text-cyan-400" />
                    Profile & Quotas
                  </Link>

                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    AI Assistant Settings
                  </Link>

                  <Link
                    href="/pricing"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5"
                  >
                    <CreditCard className="w-4 h-4 text-green-400" />
                    Upgrade Plan
                  </Link>

                  <div className="border-t border-white/10 my-1" />

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 hover:opacity-95 hover:scale-[1.02] transition-all"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#090d16] px-4 pt-2 pb-4 space-y-1">
          <Link
            href="/chat"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5"
          >
            💬 Chat
          </Link>
          <Link
            href="/files"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5"
          >
            📄 Documents
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5"
          >
            💳 Pricing
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-cyan-400 hover:bg-cyan-500/10"
            >
              🛡️ Admin Hub & CRM
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
