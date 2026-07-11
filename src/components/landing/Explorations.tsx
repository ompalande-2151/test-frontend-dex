import React, { useEffect, useRef, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, Float, PresentationControls } from '@react-three/drei';

gsap.registerPlugin(ScrollTrigger);

const COIN_PATHS = [
  '/3D OBJ Coin/Coin/ethereum-crypto-coin-2026-02-22-03-12-19-utc/Ethereum.glb',
  '/3D OBJ Coin/Coin/bnb-crypto-coin-2026-02-22-03-12-19-utc/Bnb.glb',
  '/3D OBJ Coin/Coin/solana-crypto-coin-2026-02-22-03-12-16-utc/Solana.glb',
  '/3D OBJ Coin/Coin/polygon-crypto-coin-2026-02-22-03-12-17-utc/Polygon.glb',
  '/3D OBJ Coin/Coin/tether-crypto-coin-2026-02-22-03-12-18-utc/Tether.glb',
  '/3D OBJ Coin/Coin/cardano-crypto-coin-2026-02-22-03-12-17-utc/Cardano.glb'
];

function CoinModel({ url, objectRef }: { url: string, objectRef: React.Ref<THREE.Group> }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    // Rotate to face front initially for coins
    if (url.includes('Cardano') || url.includes('cardano')) {
      // Adjust Cardano specifically (try 0 if it's standing up by default, or Math.PI / 2 on another axis)
      scene.rotation.set(0, 0, 0);
    } else {
      scene.rotation.set(Math.PI / 2, 0, 0);
    }
  }, [scene, url]);

  return (
    <group ref={objectRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <primitive object={scene} scale={1.5} />
      </Float>
    </group>
  );
}

export default function Explorations() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const blurOverlayRef = useRef<HTMLDivElement>(null);

  // Array of refs for each individual coin
  const coinRefs = useRef<(THREE.Group | null)[]>([]);

  useEffect(() => {
    let ctx = gsap.context(() => { });

    const initAnimation = () => {
      ctx.add(() => {
        const mm = gsap.matchMedia();
        mm.add({
          isMobile: "(max-width: 767px)",
          isTablet: "(min-width: 768px) and (max-width: 1023px)",
          isDesktop: "(min-width: 1024px)"
        }, (context) => {
          const { isMobile, isTablet, isDesktop } = context.conditions as any;

          ScrollTrigger.create({
            trigger: containerRef.current,
            start: "top top",
            end: "bottom bottom",
            pin: contentRef.current,
            pinSpacing: false,
          });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 1.5,
            }
          });

          // Adjust starting ring radius, final tight ring radius, and coin scale based on device size
          const startRadiusX = isMobile ? 3.0 : isTablet ? 5.5 : 7;
          const startRadiusY = isMobile ? 2.0 : isTablet ? 4.0 : 5;
          const finalRadius = isMobile ? 1.6 : isTablet ? 2.6 : 4.0;
          const coinScale = isMobile ? 0.6 : isTablet ? 1.1 : 1.8;

          // Animate each coin individually
          coinRefs.current.forEach((coin, index) => {
            if (!coin) return;

            const angle = (index / COIN_PATHS.length) * Math.PI * 2;

            // Start them in a wide ring without randomness so it's perfectly consistent on reload
            gsap.set(coin.position, {
              x: Math.cos(angle) * startRadiusX,
              y: Math.sin(angle) * startRadiusY,
              z: -2 // Slightly pushed back
            });

            // Start rotated in deterministic different directions based on index
            gsap.set(coin.rotation, {
              x: index * Math.PI,
              y: (index + 1) * Math.PI / 2,
              z: index * Math.PI / 3
            });

            // Initial small size
            gsap.set(coin.scale, {
              x: 0.1,
              y: 0.1,
              z: 0.1
            });

            // Animate them flying forward into a beautiful tight ring around the text
            tl.to(coin.position, {
              x: Math.cos(angle) * finalRadius,
              y: Math.sin(angle) * finalRadius,
              z: 0,
              duration: 1,
              ease: "power2.inOut"
            }, 0);

            // Spin smoothly to face perfectly front
            tl.to(coin.rotation, {
              x: 0,
              y: 0,
              z: 0,
              duration: 1,
              ease: "power2.inOut"
            }, 0);

            // Scale up to big size
            tl.to(coin.scale, {
              x: coinScale,
              y: coinScale,
              z: coinScale,
              duration: 0.8, // Finish scaling earlier
              ease: "power2.inOut"
            }, 0);
          });

          // Blur the coins by fading in a backdrop-blur overlay
          if (blurOverlayRef.current) {
            gsap.set(blurOverlayRef.current, { opacity: 0 });
            tl.to(blurOverlayRef.current, {
              opacity: 1,
              duration: 0.4,
              ease: "power2.in"
            }, 0.2); // Start fading in at 60% scroll
          }
        });
      });
    };

    // Wait for GLTF models to load through Suspense before animating
    const checkRefs = setInterval(() => {
      const validCoins = coinRefs.current.filter(c => c !== null);
      if (validCoins.length === COIN_PATHS.length) {
        clearInterval(checkRefs);
        initAnimation();
      }
    }, 100);

    return () => {
      clearInterval(checkRefs);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={containerRef} className="relative bg-bg min-h-[400vh]">
      <div ref={contentRef} className="h-screen w-full flex items-center justify-center z-10 sticky top-0 overflow-hidden px-4 sm:px-6">

        {/* The UI Text */}
        <div className="text-center bg-bg/80 backdrop-blur-md p-6 sm:p-8 rounded-3xl pointer-events-auto border border-stroke shadow-2xl relative z-30 max-w-sm sm:max-w-md mx-4">
          <div className="text-xs text-muted uppercase tracking-[0.3em] mb-4">ON-CHAIN ANALYTICS</div>
          <h2 className="text-4xl md:text-6xl font-light text-text-primary mb-6">
            Live blockchain <span className="font-landing italic">data</span>
          </h2>
          <p className="text-muted mb-8 max-w-sm mx-auto text-sm md:text-base">Real-time transactions, token pairs, and market depth — all verifiable on MSTScan.</p>
          <a href="https://mstscan.com/" target="_blank" rel="noopener noreferrer">
            <button className="rounded-full px-6 py-3 bg-text-primary text-bg font-medium hover:scale-105 transition-transform">
              Open Explorer
            </button>
          </a>
        </div>

        {/* The 3D Model layer */}
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="w-full h-full pointer-events-auto">
            <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
              <ambientLight intensity={1.5} />
              <directionalLight position={[10, 20, 10]} intensity={2} />
              <Suspense fallback={null}>
                <PresentationControls global config={{ mass: 2, tension: 500 }} snap={{ mass: 4, tension: 1500 }} rotation={[0, 0, 0]} polar={[-Math.PI / 4, Math.PI / 4]} azimuth={[-Math.PI / 4, Math.PI / 4]}>
                  {COIN_PATHS.map((url, i) => (
                    <CoinModel
                      key={url}
                      url={url}
                      objectRef={(el) => {
                        if (el) coinRefs.current[i] = el;
                      }}
                    />
                  ))}
                </PresentationControls>
                <Environment preset="city" />
              </Suspense>
            </Canvas>
          </div>

          {/* Safe Overlay Blur Effect */}
          <div ref={blurOverlayRef} className="absolute inset-0 z-30 pointer-events-none backdrop-blur-xl opacity-0 bg-bg/20"></div>
        </div>

      </div>
    </section>
  );
}

COIN_PATHS.forEach(url => useGLTF.preload(url));
