export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: "user" | "business" | "admin";
  plan: "free" | "business" | "pro";
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  company_name?: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string;
  message_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tokens: number;
  meta_info?: string;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface FileItem {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  indexed: boolean;
  created_at: string;
  extracted_text_preview?: string;
}

export interface LeadItem {
  id: string;
  business_id?: string;
  user_id?: string;
  name: string;
  contact: string;
  requirement: string;
  budget?: string;
  location?: string;
  source: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface LeadStats {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  qualified_leads: number;
  converted_leads: number;
  closed_leads: number;
  conversion_rate: number;
}

export interface PlanItem {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
  message_limit: number;
  file_limit: number;
  features: string[];
  popular: boolean;
}

export interface UsageData {
  messages_count: number;
  messages_limit: number;
  files_count: number;
  files_limit: number;
  plan: string;
  percent_messages: number;
  percent_files: number;
}

export interface AdminStats {
  total_users: number;
  total_businesses: number;
  total_conversations: number;
  total_messages: number;
  total_files: number;
  total_leads: number;
  active_subscriptions: number;
  estimated_revenue: number;
  system_status: string;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ora_token");
}

export function setStoredToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("ora_token", token);
  }
}

export function removeStoredToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("ora_token");
    localStorage.removeItem("ora_user");
  }
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Network error occurred" }));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.access_token);
    return data;
  },

  async register(userData: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
    company_name?: string;
    industry?: string;
  }) {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    setStoredToken(data.access_token);
    return data;
  },

  async getMe(): Promise<User> {
    return apiFetch("/auth/me");
  },

  async updateProfile(profile: {
    full_name?: string;
    company_name?: string;
    industry?: string;
    website?: string;
    phone?: string;
  }): Promise<User> {
    return apiFetch("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  },

  // Chat
  async getConversations(search?: string): Promise<ConversationItem[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch(`/chat/conversations${q}`);
  },

  async createConversation(title?: string): Promise<ConversationDetail> {
    return apiFetch("/chat/conversations", {
      method: "POST",
      body: JSON.stringify({ title: title || "New Chat" }),
    });
  },

  async getConversation(id: string): Promise<ConversationDetail> {
    return apiFetch(`/chat/conversations/${id}`);
  },

  async renameConversation(id: string, title: string): Promise<ConversationItem> {
    return apiFetch(`/chat/conversations/${id}/rename`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  async togglePinConversation(id: string): Promise<ConversationItem> {
    return apiFetch(`/chat/conversations/${id}/pin`, {
      method: "PATCH",
    });
  },

  async deleteConversation(id: string) {
    return apiFetch(`/chat/conversations/${id}`, {
      method: "DELETE",
    });
  },

  async streamChat(
    message: {
      conversation_id?: string;
      content: string;
      lead_assistant_mode?: boolean;
      file_ids?: string[];
    },
    onChunk: (chunk: string) => void,
    onDone: (data: { conversation_id: string; lead_detected: boolean }) => void,
    onInit?: (data: { conversation_id: string; title: string }) => void
  ) {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Chat error" }));
      throw new Error(err.detail || "Error streaming message");
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) return;

    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "init" && onInit) {
              onInit(parsed);
            } else if (parsed.type === "chunk") {
              onChunk(parsed.content);
            } else if (parsed.type === "done") {
              onDone(parsed);
            }
          } catch {
            // Ignore parse errors on incomplete frames
          }
        }
      }
    }
  },

  async editMessage(messageId: string, content: string) {
    return apiFetch(`/chat/messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  },

  // Files
  async uploadFile(file: File, conversation_id?: string): Promise<FileItem> {
    const formData = new FormData();
    formData.append("file", file);
    if (conversation_id) {
      formData.append("conversation_id", conversation_id);
    }
    return apiFetch("/files/upload", {
      method: "POST",
      body: formData,
    });
  },

  async listFiles(conversation_id?: string): Promise<FileItem[]> {
    const q = conversation_id ? `?conversation_id=${encodeURIComponent(conversation_id)}` : "";
    return apiFetch(`/files/list${q}`);
  },

  async deleteFile(fileId: string) {
    return apiFetch(`/files/${fileId}`, {
      method: "DELETE",
    });
  },

  // Leads
  async getLeads(status?: string, search?: string): Promise<LeadItem[]> {
    const params = new URLSearchParams();
    if (status && status !== "All") params.append("status", status);
    if (search) params.append("search", search);
    const q = params.toString() ? `?${params.toString()}` : "";
    return apiFetch(`/leads${q}`);
  },

  async getLeadStats(): Promise<LeadStats> {
    return apiFetch("/leads/stats");
  },

  async createLead(lead: Partial<LeadItem>): Promise<LeadItem> {
    return apiFetch("/leads", {
      method: "POST",
      body: JSON.stringify(lead),
    });
  },

  async updateLead(id: string, updates: Partial<LeadItem>): Promise<LeadItem> {
    return apiFetch(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async deleteLead(id: string) {
    return apiFetch(`/leads/${id}`, {
      method: "DELETE",
    });
  },

  getExportCsvUrl(): string {
    const token = getStoredToken();
    return `${API_BASE}/leads/export/csv?token=${token || ""}`;
  },

  // Subscriptions & Usage
  async getPlans(): Promise<PlanItem[]> {
    return apiFetch("/subscriptions/plans");
  },

  async getUsage(): Promise<UsageData> {
    return apiFetch("/subscriptions/usage");
  },

  async subscribe(plan: string, billingCycle: "monthly" | "yearly" = "monthly") {
    return apiFetch("/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify({ plan, billing_cycle: billingCycle }),
    });
  },

  // Business
  async getBusinessProfile() {
    return apiFetch("/business/profile");
  },

  async updateBusinessProfile(data: any) {
    return apiFetch("/business/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getBusinessAnalytics() {
    return apiFetch("/business/analytics");
  },

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    return apiFetch("/admin/stats");
  },

  async getAdminUsers(): Promise<User[]> {
    return apiFetch("/admin/users");
  },

  async updateAdminUserStatus(userId: string, data: { is_suspended?: boolean; role?: string; plan?: string }) {
    return apiFetch(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async getAdminBusinesses() {
    return apiFetch("/admin/businesses");
  },

  async getAdminConversationsMeta() {
    return apiFetch("/admin/conversations-metadata");
  },

  async getAdminAuditLogs() {
    return apiFetch("/admin/audit-logs");
  },

  // AI Configuration
  async getAIStatus(): Promise<{
    has_groq: boolean;
    has_gemini: boolean;
    has_openai: boolean;
    active_engine: string;
    groq_masked: string;
    gemini_masked: string;
    openai_masked: string;
  }> {
    return apiFetch("/config/ai-status");
  },

  async updateAIKeys(data: {
    groq_api_key?: string;
    gemini_api_key?: string;
    openai_api_key?: string;
  }) {
    return apiFetch("/config/ai-keys", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
