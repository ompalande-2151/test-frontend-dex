import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-bg pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden relative">
      <div className="absolute inset-0 bg-black/60 z-0 pointer-events-none" />

      <div className="relative z-10 w-full overflow-hidden mb-24">
        <div className="flex whitespace-nowrap opacity-10 text-6xl md:text-9xl font-bold tracking-tighter" style={{ animation: 'marquee 40s linear infinite' }}>
          {Array(10).fill("RAPIDEX • SWAP • EXPLORE • POOL • ").map((text, i) => (
            <span key={i} className="mx-4 text-text-primary">{text}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 mb-24 max-w-3xl mx-auto">
        <div className="text-xs text-muted uppercase tracking-[0.3em] mb-6">GET STARTED</div>
        <h2 className="text-5xl md:text-7xl tracking-tight mb-6">
          Ready to swap on <span className="font-landing italic">MST Chain?</span>
        </h2>
        <p className="text-base text-muted mb-10 max-w-lg mx-auto leading-relaxed">
          Connect your wallet and start trading MSTC and ecosystem tokens in seconds. No account. No KYC. Just your wallet.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
          <button className="group relative rounded-full text-sm font-medium px-8 py-4 border border-stroke bg-transparent text-text-primary hover:bg-surface transition-colors w-full sm:w-auto">
            Read the Whitepaper
          </button>
        </div>
        <div className="text-[10px] text-muted uppercase tracking-[0.2em] opacity-60">
          Powered by RAPIDEX · PoSA Consensus · Non-Custodial
        </div>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted">
        <div className="flex items-center gap-6">
          <a
            href="https://x.com/Rapidex_offical"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            Twitter
          </a>
          <a
            href="https://www.instagram.com/rapidexofficial/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            Instagram
          </a>
          <a
            href="#"
            className="hover:text-text-primary transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/Masterstroke-technosoft/dex-smart-contracts"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>RAPIDEX</span>
        </div>
      </div>
    </footer>
  );
}


