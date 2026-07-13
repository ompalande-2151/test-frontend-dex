import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
import type { BugBountySeverity } from "../../types/api";
import { bugBountyService } from "../../services/bugBounty.service";
import { useToastStore } from "../../store/toastStore";
import { mstChain } from "../../config/chains";

interface BugBountyModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
}

type Step = "rules" | "form" | "success";

const SEVERITY_TIERS: {
  id: BugBountySeverity;
  label: string;
  reward: string;
  color: "rose" | "orange" | "amber" | "cyan";
  examples: string;
}[] = [
  {
    id: "critical",
    label: "Critical",
    reward: "Up to $2,000",
    color: "rose",
    examples: "Loss of user funds, unauthorized minting, chain halt, or full protocol compromise",
  },
  {
    id: "high",
    label: "High",
    reward: "Up to $750",
    color: "orange",
    examples: "Major functionality broken or bypassed with no direct fund loss (e.g. broken swap/liquidity logic)",
  },
  {
    id: "medium",
    label: "Medium",
    reward: "Up to $250",
    color: "amber",
    examples: "Edge-case exploits, incorrect state under specific conditions, moderate denial of service",
  },
  {
    id: "low",
    label: "Low",
    reward: "Up to $75",
    color: "cyan",
    examples: "Minor UI/UX issues with security implications, informational findings",
  },
];

const SEVERITY_COLOR_CLASSES: Record<string, { text: string; bg: string; border: string }> = {
  rose: { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  orange: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
};

const initialForm = {
  title: "",
  severity: "medium" as BugBountySeverity,
  description: "",
  stepsToReproduce: "",
  contactEmail: "",
  walletAddress: "",
  pocUrl: "",
};

export const BugBountyModal: React.FC<BugBountyModalProps> = ({ isOpen, onClose, theme }) => {
  const isDark = theme === "dark";
  const [step, setStep] = useState<Step>("rules");
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    if (isOpen) {
      setStep("rules");
      setForm(initialForm);
      setFormError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateField = (field: keyof typeof initialForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim() || !form.description.trim() || !form.stepsToReproduce.trim() || !form.contactEmail.trim()) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await bugBountyService.submitReport({
        title: form.title.trim(),
        severity: form.severity,
        description: form.description.trim(),
        stepsToReproduce: form.stepsToReproduce.trim(),
        contactEmail: form.contactEmail.trim(),
        walletAddress: form.walletAddress.trim() || undefined,
        pocUrl: form.pocUrl.trim() || undefined,
        chainId: mstChain.id,
      });
      addToast({
        type: "success",
        title: "Report submitted",
        description: "Thanks for helping secure the testnet. Our team will review your finding shortly.",
      });
      setStep("success");
    } catch {
      setFormError("Something went wrong submitting your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: 35, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 35, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 330 }}
            className={`relative z-10 w-full max-w-[560px] max-h-[85vh] flex flex-col rounded-[28px] border shadow-2xl overflow-hidden
              ${isDark ? "bg-zinc-950 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-950"}`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b shrink-0 ${isDark ? "border-white/10" : "border-zinc-200"}`}>
              <div className="flex items-center gap-2.5">
                {step === "form" && (
                  <button
                    onClick={() => setStep("rules")}
                    className={`p-1 -ml-1 rounded-lg transition-colors ${isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"}`}
                    aria-label="Back to rules"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <span className="font-display font-bold text-lg leading-none">
                  {step === "rules" && "Bug Bounty — Testnet"}
                  {step === "form" && "Submit a Finding"}
                  {step === "success" && "Report Received"}
                </span>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-xl transition-colors ${isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"}`}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5" data-lenis-prevent>
              {step === "rules" && (
                <div className="space-y-5">
                  <p className={`text-sm leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                    Help us harden the MST testnet before mainnet. Find and responsibly report a security
                    vulnerability to be eligible for a reward, based on its severity.
                  </p>

                  <div className={`rounded-2xl border p-4 ${isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"}`}>
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1">
                      Program duration
                    </div>
                    <div className="text-sm font-semibold">
                      Ongoing for the duration of the public testnet phase. Rewards are paid out after mainnet launch.
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">
                      Severity &amp; rewards
                    </div>
                    {SEVERITY_TIERS.map((tier) => {
                      const c = SEVERITY_COLOR_CLASSES[tier.color];
                      return (
                        <div key={tier.id} className={`rounded-2xl border p-3.5 ${c.bg} ${c.border}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${c.text}`}>{tier.label}</span>
                            <span className={`text-sm font-bold ${c.text}`}>{tier.reward}</span>
                          </div>
                          <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>{tier.examples}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">Rules</div>
                    <ul className={`text-xs space-y-1.5 list-disc pl-4 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                      <li>Only test against MST testnet contracts and infrastructure — never mainnet or third-party systems.</li>
                      <li>Do not exploit a bug beyond what's needed to demonstrate it (no fund extraction, no service disruption).</li>
                      <li>Submit each unique vulnerability once. Duplicate reports are rewarded to the first valid submission.</li>
                      <li>Public disclosure before an official fix is shipped disqualifies a report from a reward.</li>
                      <li>Reward amounts and eligibility are determined by the team based on severity and impact.</li>
                    </ul>
                  </div>
                </div>
              )}

              {step === "form" && (
                <form id="bug-bounty-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1.5 block">
                      Severity
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {SEVERITY_TIERS.map((tier) => {
                        const c = SEVERITY_COLOR_CLASSES[tier.color];
                        const selected = form.severity === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, severity: tier.id }))}
                            className={`rounded-xl border py-2 text-xs font-bold transition-all
                              ${selected ? `${c.bg} ${c.border} ${c.text}` : isDark ? "border-white/10 text-zinc-500 hover:bg-white/5" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                          >
                            {tier.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1.5 block">
                      Title
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={updateField("title")}
                      placeholder="Short summary of the vulnerability"
                      className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-medium border transition-all
                        ${isDark ? "bg-white/5 border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500/50"}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1.5 block">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={updateField("description")}
                      placeholder="What is the vulnerability and what is its impact?"
                      rows={3}
                      className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-medium border transition-all resize-none
                        ${isDark ? "bg-white/5 border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500/50"}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1.5 block">
                      Steps to reproduce
                    </label>
                    <textarea
                      value={form.stepsToReproduce}
                      onChange={updateField("stepsToReproduce")}
                      placeholder={"1. ...\n2. ...\n3. ..."}
                      rows={3}
                      className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-medium border transition-all resize-none
                        ${isDark ? "bg-white/5 border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500/50"}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1.5 block">
                      Proof of concept link <span className="normal-case font-medium text-zinc-600">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.pocUrl}
                      onChange={updateField("pocUrl")}
                      placeholder="Tx hash, gist, video, or screenshot link"
                      className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-medium border transition-all
                        ${isDark ? "bg-white/5 border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500/50"}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1.5 block">
                        Contact email
                      </label>
                      <input
                        type="email"
                        value={form.contactEmail}
                        onChange={updateField("contactEmail")}
                        placeholder="you@example.com"
                        className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-medium border transition-all
                          ${isDark ? "bg-white/5 border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500/50"}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono mb-1.5 block">
                        Wallet address <span className="normal-case font-medium text-zinc-600">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={form.walletAddress}
                        onChange={updateField("walletAddress")}
                        placeholder="0x... for reward payout"
                        className={`w-full px-4 py-2.5 rounded-xl outline-none text-sm font-medium border transition-all font-mono
                          ${isDark ? "bg-white/5 border-white/10 text-white placeholder-zinc-600 focus:border-cyan-500/50" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-cyan-500/50"}`}
                      />
                    </div>
                  </div>

                  {formError && (
                    <p className="text-xs font-semibold text-rose-400">{formError}</p>
                  )}
                </form>
              )}

              {step === "success" && (
                <div className="flex flex-col items-center text-center py-8 gap-3">
                  <CheckCircle2 className="text-emerald-400" size={40} />
                  <p className="text-sm font-semibold">Your finding has been submitted.</p>
                  <p className={`text-xs max-w-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                    Our team will review it and follow up at the email you provided. Thanks for helping secure the network.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t shrink-0 ${isDark ? "border-white/10" : "border-zinc-200"}`}>
              {step === "rules" && (
                <button
                  onClick={() => setStep("form")}
                  className="w-full flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3 text-sm font-display font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  I understand — report a finding
                </button>
              )}
              {step === "form" && (
                <button
                  type="submit"
                  form="bug-bounty-form"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3 text-sm font-display font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit finding"
                  )}
                </button>
              )}
              {step === "success" && (
                <button
                  onClick={onClose}
                  className={`w-full flex items-center justify-center rounded-2xl py-3 text-sm font-display font-bold transition-all active:scale-[0.98]
                    ${isDark ? "bg-white text-black hover:brightness-110" : "bg-zinc-950 text-white hover:brightness-110"}`}
                >
                  Done
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
