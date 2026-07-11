import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

function EthereumModel({ mouse, ...props }: any) {
  const { scene } = useGLTF('/ethereum-crypto-coin-2026-02-22-03-12-19-utc (1)/Ethereum.glb');
  const group = React.useRef<THREE.Group>(null);

  React.useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.metalness = 0.9;
        child.material.roughness = 0.1;
        child.material.envMapIntensity = 2;
      }
    });
  }, [scene]);

  useFrame((state) => {
    if (group.current && mouse?.current) {
      // Calculate target rotation based on mouse coordinates (-1 to 1)
      const targetX = mouse.current.y * 0.5;
      // Use Math.sin for oscillatory continuous rotation to prevent exposing the backside
      const targetY = (mouse.current.x * 0.5) + Math.sin(state.clock.elapsedTime * 1.5) * 0.4;
      // Smoothly interpolate to target rotation
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.05);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, 0.05);
    }
  });

  return (
    <group ref={group} {...props}>
      <Float speed={2} rotationIntensity={0} floatIntensity={2}>
        <primitive object={scene} />
      </Float>
    </group>
  );
}

export default function SelectedWorks() {
  const mouse = React.useRef({ x: 0, y: 0 });
  const [scale, setScale] = React.useState(1.4);
  const [position, setPosition] = React.useState<[number, number, number]>([0, 0, -2]);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setScale(0.9);
        setPosition([0, 0, -1]);
      } else {
        setScale(1.4);
        setPosition([0, 0, -2]);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { innerWidth, innerHeight } = window;
    mouse.current.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.current.y = -(e.clientY / innerHeight) * 2 + 1;
  };

  return (
    <section
      className="relative bg-bg py-12 md:py-16 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouse.current = { x: 0, y: 0 } }}
    >
      {/* 3D Ethereum Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }} gl={{ alpha: true }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[5, 10, 5]} intensity={2} />
          <directionalLight position={[-5, -10, -5]} intensity={1} color="#4E85BF" />
          <Environment preset="city" />
          <Suspense fallback={null}>
            <EthereumModel mouse={mouse} position={position} scale={scale} rotation={[0, Math.PI / 6, 0]} />
          </Suspense>
        </Canvas>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">PLATFORM HIGHLIGHTS</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl tracking-tight">
              Built for the <span className="font-landing italic">MST Ecosystem</span>
            </h2>
          </div>
          <button className="hidden md:inline-flex group relative rounded-full px-6 py-3 bg-surface items-center gap-2">
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 -z-10 transition-opacity" />
            <span className="relative z-10 bg-surface rounded-full px-6 py-3 -m-3 flex items-center gap-2 w-[calc(100%+24px)] justify-center">
              Explore All Features <span className="text-lg leading-none">→</span>
            </span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-5 md:gap-6">
          {[
            {
              title: "Native Token Swap",
              description: "Swap MSTC and ecosystem tokens instantly with low fees and no intermediaries — directly on the MST chain.",
              span: "sm:col-span-2 md:col-span-7",
              bgImage: "/logos-mst-ecosystem/swap_13111433.png"
            },
            {
              title: "Liquidity Pools",
              description: "Provide liquidity and earn trading fees. Permissionless pools backed by MST Blockchain's PoSA consensus.",
              span: "sm:col-span-1 md:col-span-5",
              bgImage: "/logos-mst-ecosystem/drop_6642223.png"
            },
            {
              title: "Portfolio Tracker",
              description: "Monitor all your holdings, positions, and PnL in one place — your personal on-chain dashboard.",
              span: "sm:col-span-1 md:col-span-5",
              bgImage: "/logos-mst-ecosystem/graph-bar_8655831.png"
            },
            {
              title: "MST Explorer",
              description: "Track live transactions, token pairs, and on-chain analytics powered by MSTScan.",
              span: "sm:col-span-2 md:col-span-7",
              bgImage: "/logos-mst-ecosystem/compass_13984624.png"
            }
          ].map((item, i) => (
            <div key={i} className={`group relative bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden flex flex-col justify-end p-6 md:p-8 cursor-pointer ${item.span} min-h-[250px] sm:min-h-[300px] md:min-h-[380px]`}>
              {/* Card watermark background image */}
              {item.bgImage && (
                <div
                  className="absolute pointer-events-none opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-110 transition-all duration-700 filter invert right-[-10px] top-[-10px] w-40 h-40 sm:w-48 sm:h-48 md:w-60 md:h-60"
                  style={{
                    backgroundImage: `url(${item.bgImage})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center"
                  }}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent group-hover:scale-105 transition-transform duration-700 pointer-events-none" />
              <div className="absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '4px 4px' }} />

              <div className="relative z-20 pointer-events-none">
                <h3 className="text-2xl md:text-3xl font-medium mb-3">{item.title}</h3>
                <p className="text-sm md:text-base text-muted max-w-sm line-clamp-3">{item.description}</p>
                <div className="flex md:hidden items-center gap-1 text-xs font-bold uppercase tracking-wider text-text-primary mt-4">
                  Explore <span className="text-sm leading-none">→</span>
                </div>
              </div>

              <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/60 backdrop-blur-none md:group-hover:backdrop-blur-md transition-all duration-500 hidden md:flex items-center justify-center opacity-0 md:group-hover:opacity-100 z-30">
                <div className="relative rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-text-primary px-6 py-3 font-medium overflow-hidden shadow-2xl transition-transform hover:scale-105">
                  <div className="absolute inset-[-2px] rounded-full animate-gradient-shift accent-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <span className="relative z-10 flex items-center">
                    Explore — <span className="font-landing italic ml-1">{item.title}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Explore All Features Mobile CTA Button */}
        <div className="mt-8 flex md:hidden justify-center">
          <button className="group relative rounded-full px-6 py-3 bg-surface flex items-center gap-2">
            <span className="absolute inset-[-2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 -z-10 transition-opacity" />
            <span className="relative z-10 bg-surface rounded-full px-6 py-3 -m-3 flex items-center gap-2 w-[calc(100%+24px)] justify-center">
              Explore All Features <span className="text-lg leading-none">→</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
