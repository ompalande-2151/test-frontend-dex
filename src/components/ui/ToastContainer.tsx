import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, ExternalLink, X } from "lucide-react";
import { useToastStore } from "../../store/toastStore";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-3 w-full max-w-[360px] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 200 }}
            className={`p-4 rounded-2xl shadow-2xl border w-full text-white backdrop-blur-md pointer-events-auto
              ${toast.type === "success"
                ? "bg-[#0c0c16]/95 border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.1)]"
                : toast.type === "error"
                  ? "bg-[#180a0a]/95 border-rose-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(244,63,94,0.1)]"
                  : "bg-[#0c0d1a]/95 border-blue-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.1)]"
              }`}
          >
            <div className="flex gap-3 relative">
              <div className={`p-2 rounded-xl self-start
                ${toast.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : toast.type === "error"
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-blue-500/10 text-blue-400"
                }`}
              >
                {toast.type === "success" && <CheckCircle2 size={20} />}
                {toast.type === "error" && <XCircle size={20} />}
                {toast.type === "info" && <Info size={20} />}
              </div>

              <div className="flex-1 pr-4">
                <h4 className="font-display font-bold text-sm tracking-wide">
                  {toast.title}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed whitespace-pre-wrap">
                  {toast.description}
                </p>
                {toast.txHash && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <a
                      href={`https://testnet.mstscan.com/tx/${toast.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1"
                    >
                      <span>View on Explorer</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-0 right-0 p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
