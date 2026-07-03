// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { ArrowLeftRight, Globe2, QrCode, Send, type LucideIcon } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";

// type ActionModal = "send" | "receive" | "bridge" | null;

// export function PortfolioQuickActions() {
//   const navigate = useNavigate();
//   const [modal, setModal] = useState<ActionModal>(null);

//   return (
//     <>
//       <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
//         <ActionButton label="Swap" icon={ArrowLeftRight} onClick={() => navigate("/swap")} />
//         <ActionButton label="Send" icon={Send} onClick={() => setModal("send")} />
//         <ActionButton label="Receive" icon={QrCode} onClick={() => setModal("receive")} />
//         <ActionButton label="Bridge" icon={Globe2} onClick={() => setModal("bridge")} />
//       </div>

//       <Dialog open={modal !== null} onOpenChange={(open) => !open && setModal(null)}>
//         <DialogContent className="glass rounded-4xl border-white/60 sm:max-w-lg">
//           <DialogHeader>
//             <DialogTitle>
//               {modal === "send" ? "Send tokens" : modal === "receive" ? "Receive tokens" : "Bridge assets"}
//             </DialogTitle>
//             <DialogDescription>
//               {modal === "send"
//                 ? "This action will connect to the send flow in a future release."
//                 : modal === "receive"
//                   ? "Show your address, QR code, and chain-aware receive options here."
//                   : "Bridge routing and chain selection can be wired here later."}
//             </DialogDescription>
//           </DialogHeader>

//           {modal === "receive" ? (
//             <div className="space-y-3 rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
//               <div className="rounded-2xl border border-dashed border-border/70 bg-surface/80 p-10 text-center text-sm text-muted-foreground">
//                 QR code placeholder
//               </div>
//               <div className="rounded-2xl bg-surface/80 p-3 font-mono text-xs text-muted-foreground">
//                 0xA7B4c1d2E3f4567890AbCDef1234567890abF31
//               </div>
//             </div>
//           ) : (
//             <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 p-6 text-sm text-muted-foreground">
//               Placeholder content for the {modal ?? "action"} flow.
//             </div>
//           )}

//           <DialogFooter>
//             <Button variant="outline" onClick={() => setModal(null)} className="rounded-full">
//               Close
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }

// function ActionButton({
//   label,
//   icon: Icon,
//   onClick,
// }: {
//   label: string;
//   icon: LucideIcon;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       aria-label={label}
//       className="group flex items-center gap-4 rounded-[1.5rem] border border-white/60 bg-surface/80 p-4 text-left shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
//     >
//       <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform group-hover:scale-105">
//         <Icon className="h-5 w-5" />
//       </span>
//       <div>
//         <div className="text-sm font-semibold">{label}</div>
//         <div className="text-xs text-muted-foreground">Professional dashboard action</div>
//       </div>
//     </button>
//   );
// }
