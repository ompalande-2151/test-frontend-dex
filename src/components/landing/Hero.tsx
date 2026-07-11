import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
type QualityTier = '4k' | '1080p' | '720p' | '480p';

const VideoBackground = ({ overlayClass }: { overlayClass?: string }) => {
  const [quality, setQuality] = useState<QualityTier>('1080p');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const selectQuality = (): QualityTier => {
      let tier: QualityTier = '1080p';
      
      if (typeof window === 'undefined') return tier;

      const width = window.innerWidth;
      
      // Access experimental Network Information API safely
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      const isSlowConnection = connection && (
        connection.saveData || 
        ['slow-2g', '2g', '3g'].includes(connection.effectiveType)
      );

      // Access performance APIs safely
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const deviceMemory = nav.deviceMemory || 4;
      const isLowEndDevice = hardwareConcurrency <= 4 || deviceMemory <= 4;

      if (isSlowConnection) {
        tier = '480p';
      } else if (isLowEndDevice) {
        // Caps quality at 720p on low-end devices to save CPU/GPU rendering resources
        tier = width < 768 ? '480p' : '720p';
      } else {
        // Fast connection and standard/high-end device
        if (width < 768) {
          tier = '720p';
        } else if (width < 1440) {
          tier = '1080p';
        } else {
          tier = '4k';
        }
      }

      return tier;
    };

    // Initialize optimal quality tier on mount
    setQuality(selectQuality());

    // Listen to network changes dynamically (if supported by the browser)
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      const handleConnectionChange = () => {
        setQuality(selectQuality());
      };
      connection.addEventListener('change', handleConnectionChange);
      return () => {
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
  }, []);

  // Reload the video sources if quality tier changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [quality]);

  const webmSrc = `/R_Black_Hole_${quality}.webm`;
  const mp4Src = `/R_Black_Hole_${quality}.mp4`;

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster="/R_Black_Hole_poster.jpg"
        className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2"
      >
        <source src={webmSrc} type="video/webm" />
        <source src={mp4Src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
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
