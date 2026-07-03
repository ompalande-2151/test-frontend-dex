import React from 'react';

export default function Journal() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Recent</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl tracking-tight">
              Updates
              <span className="font-landing italic">& Insights </span>
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {[
            { title: "MST Blockchain Mainnet is Live", subtitle: "India's first Layer-1 chain goes live with full PoSA consensus.", read: "4 min read", date: "Jan 15, 2026" },
            { title: "Introducing MSTSwap — The Native DEX", subtitle: "Swap MSTC tokens natively without leaving the MST ecosystem.", read: "5 min read", date: "Feb 3, 2026" },
            { title: "Understanding Proof of Staked Authority", subtitle: "How PoSA keeps MST Blockchain secure, fast, and decentralized.", read: "6 min read", date: "Mar 20, 2026" },
            { title: "Tokenomics Deep Dive: Fixed Supply & Halving", subtitle: "8.4B MSTC coins, burn events, and a 20-year validator reward cycle.", read: "7 min read", date: "Apr 10, 2026" }
          ].map((item, i) => (
            <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-4 sm:p-6 hover:bg-[#686666] border border-stroke rounded-[40px] sm:rounded-full transition-colors cursor-pointer group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-surface-elevated shrink-0 overflow-hidden group-hover:scale-105 transition-transform" />
                <div>
                  <h3 className="text-lg md:text-xl font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-muted">{item.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
