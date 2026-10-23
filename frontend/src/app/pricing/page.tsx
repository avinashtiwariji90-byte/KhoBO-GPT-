"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, PlanItem } from "@/lib/api";
import { 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Lock,
  X 
} from "lucide-react";

export default function PricingPage() {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);

  // Checkout modal
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await api.getPlans();
      setPlans(data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = (plan: PlanItem) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setSelectedPlan(plan);
  };

  const handleCompletePayment = async () => {
    if (!selectedPlan) return;
    setCheckingOut(true);
    try {
      await api.subscribe(selectedPlan.id, billingCycle);
      await refreshUser();
      setSuccessMessage(`🎉 Successfully upgraded to ${selectedPlan.name}! Your account has been credited with new quotas.`);
      setSelectedPlan(null);
      setTimeout(() => setSuccessMessage(null), 7000);
    } catch (err: any) {
      alert(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-semibold mb-3">
          <CreditCard className="w-3.5 h-3.5" />
          Subscription Plans & Quotas
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Flexible Pricing for Every Scale
        </h1>
        <p className="text-base text-slate-400 mt-3">
          Choose the right plan for your personal workflows, growing agency, or enterprise team.
        </p>

        {/* Billing Cycle Switcher */}
        <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-white/10">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              billingCycle === "monthly"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Yearly Billing</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="max-w-2xl mx-auto mb-10 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2 shadow-xl">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.id;
          const price = billingCycle === "monthly" ? plan.price_monthly : Math.round(plan.price_yearly / 12);

          return (
            <div
              key={plan.id}
              className={`glass-panel p-8 rounded-2xl flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? "border-cyan-500/50 shadow-2xl shadow-cyan-500/10 scale-[1.02]"
                  : "border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs">
                  MOST POPULAR
                </div>
              )}

              <div>
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white">${price}</span>
                  <span className="text-slate-400 text-sm">/ month</span>
                </div>
                {billingCycle === "yearly" && plan.price_yearly > 0 && (
                  <p className="text-[11px] text-cyan-400 mt-1">Billed annually (${plan.price_yearly}/yr)</p>
                )}

                <div className="my-6 border-t border-white/10" />

                <ul className="space-y-3.5 text-xs text-slate-300">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-xs border border-white/20 cursor-default"
                  >
                    Current Active Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCheckout(plan)}
                    className={`w-full py-3 rounded-xl font-semibold text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25"
                        : "border border-white/20 bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    <span>{plan.id === "free" ? "Select Free Plan" : `Upgrade to ${plan.name}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mock Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border-cyan-500/40 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Confirm Subscription</h3>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 mb-5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-white">{selectedPlan.name}</span>
                <span className="text-base font-bold text-cyan-400">
                  ${billingCycle === "monthly" ? selectedPlan.price_monthly : selectedPlan.price_yearly}
                </span>
              </div>
              <p className="text-xs text-slate-400 capitalize">Billing cycle: {billingCycle}</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Sandbox Integration:</strong> Mock payment gateway is enabled for instant testing. Your account permissions and quotas will upgrade immediately upon confirmation.
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCompletePayment}
                disabled={checkingOut}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all"
              >
                {checkingOut ? "Processing Payment..." : "Complete & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
