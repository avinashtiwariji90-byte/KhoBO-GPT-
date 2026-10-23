"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import RequireAuth from "@/components/RequireAuth";
import { api, UsageData } from "@/lib/api";
import { 
  User as UserIcon, 
  CreditCard, 
  Building, 
  Mail, 
  Save, 
  CheckCircle2, 
  MessageSquare, 
  FileText, 
  Zap, 
  Shield 
} from "lucide-react";

function ProfilePageContent() {
  const { user, refreshUser } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setCompanyName(user.company_name || "");
    }
    loadUsage();
  }, [user]);

  const loadUsage = async () => {
    try {
      const data = await api.getUsage();
      setUsage(data);
    } catch {
      //
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        full_name: fullName,
        company_name: companyName,
        industry,
        website,
        phone,
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      //
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Account Profile & Quotas
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal credentials, subscription usage, and company details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Plan Summary Card */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1 flex flex-col justify-between border-cyan-500/30">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Current Plan
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {user?.plan || "Free"}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white uppercase">{user?.plan} Tier</h3>
            <p className="text-xs text-slate-400 mt-1">
              Role: <span className="text-slate-200 capitalize font-medium">{user?.role}</span>
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/pricing"
              className="w-full block text-center py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all"
            >
              Upgrade / Change Plan
            </Link>
          </div>
        </div>

        {/* Usage Quotas Card */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-2 flex flex-col justify-between">
          <h3 className="text-base font-semibold text-white mb-4">Monthly Allocation & Usage</h3>

          <div className="space-y-5">
            {/* Messages Meter */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  AI Chat Queries
                </span>
                <span className="font-mono text-cyan-300">
                  {usage?.messages_count || 0} / {usage?.messages_limit || 30} ({usage?.percent_messages || 0}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, usage?.percent_messages || 0)}%` }}
                />
              </div>
            </div>

            {/* Files Meter */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Document Uploads
                </span>
                <span className="font-mono text-indigo-300">
                  {usage?.files_count || 0} / {usage?.files_limit || 3} ({usage?.percent_files || 0}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, usage?.percent_files || 0)}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4">
            Quotas reset at the start of each billing month. Unused tokens do not expire within the active period.
          </p>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="glass-panel p-8 rounded-2xl shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Personal & Company Information</h2>
        <p className="text-xs text-slate-400 mb-6">Update your display profile across chats and invoices.</p>

        {saved && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          {(user?.role === "business" || user?.role === "admin") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Industry Sector</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Technology, AI Services"
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfilePageContent />
    </RequireAuth>
  );
}
