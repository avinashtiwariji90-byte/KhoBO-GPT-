"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Lock, Mail, User as UserIcon, Building, ArrowRight, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "business">("user");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({
        email,
        password,
        full_name: fullName,
        role,
        company_name: role === "business" ? companyName : undefined,
      });
      router.push(role === "business" ? "/business" : "/chat");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shadow-xl shadow-cyan-500/20 mb-4">
            <div className="w-full h-full bg-[#090d16] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Create your KhoBO GPT Account
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Unlock AI chat, document understanding, and automated lead capture.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl shadow-2xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Account Role Selector */}
          <div className="mb-5 grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900/80 border border-white/10">
            <button
              type="button"
              onClick={() => setRole("user")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                role === "user"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Individual User
            </button>
            <button
              type="button"
              onClick={() => setRole("business")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                role === "business"
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Business / Agency
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500"
                />
              </div>
            </div>

            {role === "business" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Apex Digital Labs"
                      className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Industry / Sector
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. SaaS, Fintech, Consulting"
                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Creating Account..." : "Create Free Account"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold underline-offset-4 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

