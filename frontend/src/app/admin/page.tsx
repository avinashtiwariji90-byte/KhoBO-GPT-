"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import RequireAuth from "@/components/RequireAuth";
import { 
  api, 
  AdminStats, 
  User, 
  LeadItem, 
  LeadStats 
} from "@/lib/api";
import { 
  Shield, 
  Users, 
  Briefcase, 
  MessageSquare, 
  FileText, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Ban, 
  Unlock, 
  Lock,
  Search, 
  Clock,
  Download,
  Settings,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Save,
  X,
  Sparkles
} from "lucide-react";

function AdminDashboardInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as any) || "business";

  const [activeTab, setActiveTab] = useState<"business" | "users" | "businesses" | "metadata" | "logs">(
    ["business", "users", "businesses", "metadata", "logs"].includes(initialTab) ? initialTab : "business"
  );

  // Global Admin stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [convosMeta, setConvosMeta] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  // Business Hub & CRM state
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [activeLead, setActiveLead] = useState<LeadItem | null>(null);
  const [bizSubTab, setBizSubTab] = useState<"leads" | "settings">("leads");

  // Business Profile states
  const [bizProfile, setBizProfile] = useState<any>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Create lead modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadContact, setNewLeadContact] = useState("");
  const [newLeadRequirement, setNewLeadRequirement] = useState("");
  const [newLeadBudget, setNewLeadBudget] = useState("");
  const [newLeadLocation, setNewLeadLocation] = useState("");
  const [creatingLead, setCreatingLead] = useState(false);

  // Status message notice
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadLeadsData();
  }, [statusFilter]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [s, u, b, c, l] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getAdminUsers().catch(() => []),
        api.getAdminBusinesses().catch(() => []),
        api.getAdminConversationsMeta().catch(() => []),
        api.getAdminAuditLogs().catch(() => []),
      ]);
      setStats(s);
      setUsers(u);
      setBusinesses(b);
      setConvosMeta(c);
      setAuditLogs(l);

      // Also load Business Hub items
      await loadLeadsData();
      await loadBusinessProfile();
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const loadLeadsData = async () => {
    try {
      const [leadsData, statsData] = await Promise.all([
        api.getLeads(statusFilter, leadSearchQuery).catch(() => []),
        api.getLeadStats().catch(() => null),
      ]);
      setLeads(leadsData);
      setLeadStats(statsData);
    } catch {
      //
    }
  };

  const loadBusinessProfile = async () => {
    try {
      const prof = await api.getBusinessProfile();
      setBizProfile(prof);
      setCompanyName(prof.company_name || "");
      setIndustry(prof.industry || "");
      setWebsite(prof.website || "");
      setPhone(prof.phone || "");
      setWebhookUrl(prof.lead_webhook_url || "");
    } catch {
      //
    }
  };

  const handleToggleSuspend = async (targetUser: User) => {
    try {
      await api.updateAdminUserStatus(targetUser.id, {
        is_suspended: !targetUser.is_suspended,
      });
      setNoticeMessage(`Account ${targetUser.email} status updated.`);
      setTimeout(() => setNoticeMessage(null), 3500);
      loadAllData();
    } catch (err: any) {
      setNoticeMessage(err.message || "Failed to update user");
      setTimeout(() => setNoticeMessage(null), 3500);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.updateAdminUserStatus(userId, { role: newRole });
      loadAllData();
    } catch (err: any) {
      setNoticeMessage(err.message || "Failed to update role");
      setTimeout(() => setNoticeMessage(null), 3500);
    }
  };

  const handleChangePlan = async (userId: string, newPlan: string) => {
    try {
      await api.updateAdminUserStatus(userId, { plan: newPlan });
      loadAllData();
    } catch (err: any) {
      setNoticeMessage(err.message || "Failed to update plan");
      setTimeout(() => setNoticeMessage(null), 3500);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await api.updateLead(leadId, { status: newStatus });
      loadLeadsData();
    } catch {
      //
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await api.deleteLead(id);
      loadLeadsData();
      if (activeLead?.id === id) setActiveLead(null);
    } catch {
      //
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadContact.trim()) return;
    setCreatingLead(true);
    try {
      await api.createLead({
        name: newLeadName.trim(),
        contact: newLeadContact.trim(),
        requirement: newLeadRequirement.trim(),
        budget: newLeadBudget.trim(),
        location: newLeadLocation.trim(),
        source: "Admin Portal",
      });
      setIsCreateModalOpen(false);
      setNewLeadName("");
      setNewLeadContact("");
      setNewLeadRequirement("");
      setNewLeadBudget("");
      setNewLeadLocation("");
      loadLeadsData();
    } catch {
      //
    } finally {
      setCreatingLead(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.updateBusinessProfile({
        company_name: companyName,
        industry,
        website,
        phone,
        lead_webhook_url: webhookUrl,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      //
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = api.getExportCsvUrl();
  };

  if (user?.role !== "admin") {
    return (
      <div className="max-w-md mx-auto my-20 p-8 glass-panel text-center rounded-2xl border-white/10 shadow-2xl">
        <Lock className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Admin Access Only</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Administrator privileges are required to access this control suite and Business Hub. Please sign in with an admin account.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Notice Banner */}
      {noticeMessage && (
        <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-between shadow-lg">
          <span>{noticeMessage}</span>
          <button onClick={() => setNoticeMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            Admin Command Suite &amp; Business Hub
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Enterprise Admin Portal
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Centralized management for AI Lead Generation, CRM Hub, Users, Businesses, and Security Audits.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            {stats?.system_status || "System Healthy"}
          </div>
        </div>
      </div>

      {/* Global Admin KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <div className="glass-panel p-4 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Total Users</span>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_users || users.length || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border-cyan-500/30">
          <span className="text-[11px] text-cyan-400 font-medium">Total Leads</span>
          <p className="text-2xl font-bold text-cyan-300 mt-1">{leadStats?.total_leads ?? stats?.total_leads ?? 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border-indigo-500/30">
          <span className="text-[11px] text-indigo-400 font-medium">Conversations</span>
          <p className="text-2xl font-bold text-indigo-300 mt-1">{stats?.total_conversations || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border-sky-500/30">
          <span className="text-[11px] text-sky-400 font-medium">Messages</span>
          <p className="text-2xl font-bold text-sky-300 mt-1">{stats?.total_messages || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border-purple-500/30">
          <span className="text-[11px] text-purple-400 font-medium">Documents</span>
          <p className="text-2xl font-bold text-purple-300 mt-1">{stats?.total_files || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border-amber-500/30">
          <span className="text-[11px] text-amber-400 font-medium">Businesses</span>
          <p className="text-2xl font-bold text-amber-300 mt-1">{stats?.total_businesses || businesses.length || 0}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border-emerald-500/30">
          <span className="text-[11px] text-emerald-400 font-medium">Est. Revenue</span>
          <p className="text-2xl font-bold text-emerald-300 mt-1">${stats?.estimated_revenue || 0}</p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-white/10 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("business")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "business"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Business Hub &amp; CRM ({leads.length})
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "users"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          User Accounts ({users.length})
        </button>

        <button
          onClick={() => setActiveTab("businesses")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "businesses"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Business Registry ({businesses.length})
        </button>

        <button
          onClick={() => setActiveTab("metadata")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "metadata"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Privacy Metadata
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "logs"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          Audit Logs
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB: BUSINESS HUB & CRM (Integrated directly into Admin)                  */}
      {/* ========================================================================= */}
      {activeTab === "business" && (
        <div className="space-y-6">
          {/* Business Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                {bizProfile?.company_name || "Enterprise AI Lead Pipeline"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time lead capture, CRM pipeline management, automated entity extraction &amp; CSV export.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setBizSubTab(bizSubTab === "leads" ? "settings" : "leads")}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                {bizSubTab === "leads" ? "Business Settings" : "Leads Pipeline"}
              </button>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Lead
              </button>

              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Leads Pipeline */}
          {bizSubTab === "leads" ? (
            <>
              {/* Lead Funnel Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="glass-panel p-4 rounded-xl">
                  <span className="text-[11px] text-slate-400 font-medium">Total Leads</span>
                  <p className="text-2xl font-bold text-white mt-1">{leadStats?.total_leads || leads.length || 0}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-sky-500/30">
                  <span className="text-[11px] text-sky-400 font-medium">New</span>
                  <p className="text-2xl font-bold text-sky-300 mt-1">{leadStats?.new_leads || 0}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-amber-500/30">
                  <span className="text-[11px] text-amber-400 font-medium">Contacted</span>
                  <p className="text-2xl font-bold text-amber-300 mt-1">{leadStats?.contacted_leads || 0}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-indigo-500/30">
                  <span className="text-[11px] text-indigo-400 font-medium">Qualified</span>
                  <p className="text-2xl font-bold text-indigo-300 mt-1">{leadStats?.qualified_leads || 0}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-emerald-500/30">
                  <span className="text-[11px] text-emerald-400 font-medium">Converted</span>
                  <p className="text-2xl font-bold text-emerald-300 mt-1">{leadStats?.converted_leads || 0}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-purple-500/30">
                  <span className="text-[11px] text-purple-400 font-medium">Conversion Rate</span>
                  <p className="text-2xl font-bold text-purple-300 mt-1">{leadStats?.conversion_rate || 0}%</p>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="glass-panel p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  {["All", "New", "Contacted", "Qualified", "Converted", "Closed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === s
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={leadSearchQuery}
                    onChange={(e) => {
                      setLeadSearchQuery(e.target.value);
                      loadLeadsData();
                    }}
                    placeholder="Search leads by name, contact..."
                    className="w-full glass-input pl-9 pr-3 py-1.5 rounded-lg text-xs placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Leads CRM Table */}
              <div className="glass-panel rounded-2xl overflow-hidden border-white/10 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold tracking-wider text-[10px] border-b border-white/10">
                      <tr>
                        <th className="px-5 py-3.5">Lead / Contact</th>
                        <th className="px-5 py-3.5">Requirement</th>
                        <th className="px-5 py-3.5">Budget &amp; Location</th>
                        <th className="px-5 py-3.5">Source</th>
                        <th className="px-5 py-3.5">Pipeline Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            Loading lead records...
                          </td>
                        </tr>
                      ) : leads.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-500">
                            No leads found. AI assistant automatically captures client leads here during conversations.
                          </td>
                        </tr>
                      ) : (
                        leads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-4">
                              <p className="font-semibold text-white text-sm">{lead.name}</p>
                              <p className="text-slate-400 mt-0.5 text-xs font-mono">{lead.contact}</p>
                            </td>
                            <td className="px-5 py-4 max-w-xs">
                              <p className="line-clamp-2 text-slate-300">{lead.requirement}</p>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1 text-cyan-400 font-medium">
                                <DollarSign className="w-3 h-3" />
                                {lead.budget || "Discussion"}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{lead.location || "Global"}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-slate-300">
                                {lead.source || "Chatbot AI"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <select
                                value={lead.status}
                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                className={`text-[11px] font-semibold rounded-lg px-2.5 py-1 border transition-all cursor-pointer bg-slate-900 ${
                                  lead.status === "New"
                                    ? "text-sky-400 border-sky-500/30"
                                    : lead.status === "Contacted"
                                    ? "text-amber-400 border-amber-500/30"
                                    : lead.status === "Qualified"
                                    ? "text-indigo-400 border-indigo-500/30"
                                    : lead.status === "Converted"
                                    ? "text-emerald-400 border-emerald-500/30"
                                    : "text-slate-400 border-slate-700"
                                }`}
                              >
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Qualified">Qualified</option>
                                <option value="Converted">Converted</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setActiveLead(lead)}
                                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 text-xs font-medium transition-all"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                                  title="Delete Lead"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* Sub-tab 2: Business Profile & Automation Settings */
            <div className="glass-panel p-6 rounded-2xl max-w-2xl border-white/10 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                Business Profile &amp; Webhook Automation
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Configure your business identity and webhook endpoint for instant lead routing to your CRM.
              </p>

              {saveSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Business profile saved successfully!
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Brand Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme AI Innovations"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. SaaS, Fintech, Healthcare"
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Support / Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lead Dispatch Webhook URL</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    When an AI conversation captures a qualified lead, we send a JSON POST payload to this endpoint.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {profileSaving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: USERS MANAGEMENT                                                     */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div>
          <div className="glass-panel p-3.5 rounded-xl mb-4 flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full glass-input pl-9 pr-3 py-1.5 rounded-lg text-xs placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border-white/10 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Plan</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Joined Date</th>
                    <th className="px-5 py-3.5 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-white">{u.full_name || "Anonymous User"}</p>
                        <p className="text-slate-400 font-mono text-[11px]">{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="user">User</option>
                          <option value="business">Business</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={u.plan}
                          onChange={(e) => handleChangePlan(u.id, e.target.value)}
                          className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200 uppercase"
                        >
                          <option value="free">FREE</option>
                          <option value="business">BUSINESS</option>
                          <option value="pro">PRO</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.is_suspended ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleToggleSuspend(u)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            u.is_suspended
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                          }`}
                        >
                          {u.is_suspended ? "Unsuspend" : "Suspend User"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: BUSINESS REGISTRY                                                    */}
      {/* ========================================================================= */}
      {activeTab === "businesses" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-500 glass-panel rounded-2xl">
              No registered business tenants.
            </div>
          ) : (
            businesses.map((biz) => (
              <div key={biz.id} className="glass-panel p-5 rounded-2xl border-white/10 shadow-xl">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{biz.company_name}</h3>
                    <p className="text-xs text-cyan-400">{biz.industry || "General Industry"}</p>
                  </div>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                    {biz.leads_count} Leads
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <p>Website: <span className="text-white">{biz.website || "Not configured"}</span></p>
                  <p>Phone: <span className="text-white">{biz.phone || "N/A"}</span></p>
                  <p>Created: <span className="font-mono">{new Date(biz.created_at).toLocaleDateString()}</span></p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PRIVACY METADATA                                                     */}
      {/* ========================================================================= */}
      {activeTab === "metadata" && (
        <div className="glass-panel rounded-2xl overflow-hidden border-white/10 shadow-2xl">
          <div className="p-4 border-b border-white/10 bg-slate-900/60">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Privacy Compliance: Showing metadata only. Private chat contents are hidden.
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Conversation ID</th>
                  <th className="px-5 py-3.5">User ID</th>
                  <th className="px-5 py-3.5">Session Title</th>
                  <th className="px-5 py-3.5">Messages</th>
                  <th className="px-5 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {convosMeta.map((c) => (
                  <tr key={c.conversation_id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-mono text-cyan-400">{c.conversation_id.slice(0, 8)}...</td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{c.user_id.slice(0, 8)}...</td>
                    <td className="px-5 py-3.5 text-white font-medium">{c.title}</td>
                    <td className="px-5 py-3.5">{c.message_count} messages</td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: AUDIT LOGS                                                           */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="glass-panel rounded-2xl overflow-hidden border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Details</th>
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 font-semibold text-cyan-300 font-mono text-[11px]">{log.action}</td>
                    <td className="px-5 py-3 text-slate-300">{log.details || "-"}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LEAD DETAIL VIEW                                                   */}
      {/* ========================================================================= */}
      {activeLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg glass-panel p-6 rounded-2xl border-white/10 shadow-2xl relative">
            <button
              onClick={() => setActiveLead(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {activeLead.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date(activeLead.created_at).toLocaleString()}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white">{activeLead.name}</h3>
            <p className="text-sm text-cyan-400 font-mono mt-0.5">{activeLead.contact}</p>

            <div className="mt-5 space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-400 font-semibold block mb-1">Requirement:</span>
                <p className="text-slate-200 leading-relaxed">{activeLead.requirement}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 font-semibold block mb-1">Budget</span>
                  <p className="text-cyan-300 font-medium">{activeLead.budget || "Discussion"}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 font-semibold block mb-1">Location</span>
                  <p className="text-slate-200 font-medium">{activeLead.location || "Global"}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <select
                value={activeLead.status}
                onChange={(e) => {
                  handleStatusChange(activeLead.id, e.target.value);
                  setActiveLead({ ...activeLead, status: e.target.value });
                }}
                className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="New">Mark as New</option>
                <option value="Contacted">Mark as Contacted</option>
                <option value="Qualified">Mark as Qualified</option>
                <option value="Converted">Mark as Converted</option>
                <option value="Closed">Mark as Closed</option>
              </select>

              <button
                onClick={() => handleDeleteLead(activeLead.id)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE LEAD DIRECTLY                                               */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border-white/10 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Add Client Lead
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter customer requirement details to store inside the Admin CRM.
            </p>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Client / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Rahul Sharma / Nexus Corp"
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contact Email / Phone *</label>
                <input
                  type="text"
                  required
                  value={newLeadContact}
                  onChange={(e) => setNewLeadContact(e.target.value)}
                  placeholder="rahul@example.com or +91 98765 43210"
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Requirement &amp; Project Scope</label>
                <textarea
                  rows={3}
                  value={newLeadRequirement}
                  onChange={(e) => setNewLeadRequirement(e.target.value)}
                  placeholder="Needs AI customer support chatbot and automated document analysis..."
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Budget ($)</label>
                  <input
                    type="text"
                    value={newLeadBudget}
                    onChange={(e) => setNewLeadBudget(e.target.value)}
                    placeholder="e.g. $1,500/mo"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={newLeadLocation}
                    onChange={(e) => setNewLeadLocation(e.target.value)}
                    placeholder="e.g. Mumbai, India"
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLead}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all"
                >
                  {creatingLead ? "Adding..." : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RequireAuth>
      <Suspense fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-xs">
          Loading Admin Command Suite...
        </div>
      }>
        <AdminDashboardInner />
      </Suspense>
    </RequireAuth>
  );
}
