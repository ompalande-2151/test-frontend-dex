import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
const VideoBackground = ({ overlayClass }: { overlayClass?: string }) => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <video
        src="/R_Black_Hole.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
      />
      <div className={`absolute inset-0 ${overlayClass}`} />
    </div>
  );
};

export default function Hero() {
  const [roleIndex, setRoleIndex] = useState(0);
  const roles = ["Swap", "Stake", "Earn",];

  const heroRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex(prev => (prev + 1) % roles.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [roles.length]);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(eyebrowRef.current,
      { opacity: 0, y: 20, filter: "blur(10px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 1, delay: 0.3 }
    );
    tl.fromTo(nameRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.2 },
      "-=0.9"
    );
  }, []);

  return (
    <section ref={heroRef} className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden pt-32 pb-16 md:py-0">
      <VideoBackground overlayClass="bg-black/20" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent z-0" />

      <div className="relative z-10 flex flex-col items-center text-center px-4 w-full">

        <h1 ref={nameRef} className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-landing italic leading-[0.9] tracking-tight text-text-primary mb-4 md:mb-6">
          Swap Crypto
        </h1>

        <div className="text-lg sm:text-2xl md:text-3xl lg:text-4xl mb-6 md:mb-8 text-center max-w-2xl mx-auto leading-relaxed px-4">
          <span key={roleIndex} className="font-landing italic text-text-primary animate-role-fade-in inline-block mr-2">{roles[roleIndex]}</span>
          in a Truly Decentralized Ecosystem
        </div>

        <p className="text-xs sm:text-sm md:text-base text-white/80 text-muted max-w-md mb-8 md:mb-12">
          Securely swap, stake, and manage digital assets with a fully decentralized, non-custodial exchange built for the Web3 era.
        </p>

        <div className="inline-flex gap-4">
          <Link to="/swap">
            <button className="group relative rounded-full text-sm px-7 py-3.5 bg-text-primary text-bg hover:bg-bg hover:text-text-primary transition-colors hover:scale-105 border-2 border-transparent">
              <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 -z-10" />
              Launch App
            </button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center z-10">
        <span className="text-[10px] text-muted uppercase tracking-[0.2em] mb-4">SCROLL</span>
        <div className="w-px h-10 bg-stroke overflow-hidden relative">
          <div className="w-full h-full bg-text-primary animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
