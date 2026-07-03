import React, { useRef, useMemo, useEffect } from "react";
import Prism from "./Prism";
import { Canvas, useFrame } from "@react-three/fiber";
import { useLocation } from "react-router-dom";
import * as THREE from "three";
import { useThemeStore } from "../../store/themeStore";

// Color mappings for active page routes
const PAGE_COLORS: Record<string, { color1: string; color2: string }> = {
  "/": { color1: "#00E5FF", color2: "#8A2BE2" }, // Swap (Cyan & Violet)
  "/swap": { color1: "#00E5FF", color2: "#8A2BE2" },
  "/liquidity": { color1: "#10B981", color2: "#06B6D4" }, // Pools (Emerald & Cyan)
  "/explore": { color1: "#3B82F6", color2: "#6366F1" }, // Analytics/Explore (Blue & Indigo)
  "/wallet": { color1: "#3B82F6", color2: "#8A2BE2" }, // Wallet
  "/portfolio": { color1: "#3B82F6", color2: "#6366F1" } // Portfolio
};

// Custom Shader Definition for Volumetric Aurora Gradient
const AuroraShader = {
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uColor1: { value: new THREE.Color("#00E5FF") },
    uColor2: { value: new THREE.Color("#8A2BE2") },
    uBaseBg: { value: new THREE.Color("#050716") },
    uIsDark: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uBaseBg;
    uniform float uIsDark;
    varying vec2 vUv;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx) ;
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 a0 = x - floor(x + 0.5);
      vec3 g0 = a0*x0.x  + h*x0.y;
      vec3 g12 = a0*x12.xz + h*x12.yw;
      vec3 norm = 1.79284291400159 - 0.85373472095314 *
        ( g0*g0 + g12*g12 );
      g0 *= norm.x;
      g12 *= norm.yzw;
      vec3 v_noise = vec3(g0, g12.x, g12.y);
      return 130.0 * dot(m, v_noise);
    }

    float fbm(vec2 uv) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 4; i++) {
        value += amplitude * snoise(uv * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = vUv;
      vec2 noiseUv = uv * 2.0 - vec2(1.0);
      noiseUv.x += uMouse.x * 0.12;
      noiseUv.y += uMouse.y * 0.12;
      
      // Faster, more dynamic fluid motion
      float n1 = fbm(noiseUv * 0.6 - vec2(uTime * 0.025, uTime * 0.018));
      float n2 = fbm(noiseUv * 1.2 + vec2(uTime * 0.028, -uTime * 0.022) + vec2(n1 * 0.45));
      
      float mixVal = smoothstep(-0.6, 0.7, n2);
      vec3 color = mix(uColor1, uColor2, mixVal);
      
      float dist = distance(uv, vec2(0.5));
      // Expanded vignette boundary so colors reach further towards the screen edges
      float vignette = smoothstep(1.15, 0.15, dist);
      
      vec3 finalColor;
      if (uIsDark > 0.5) {
        // Dark Mode: Bolder background color overlays (more than 2x brightness boost)
        finalColor = mix(uBaseBg, color * 0.65, vignette * 0.90);
      } else {
        // Light Mode: Vivid, less white-washed pastel overlays with higher strength mix
        vec3 pastelColor = mix(color, vec3(0.94, 0.96, 0.99), 0.25);
        finalColor = mix(uBaseBg, pastelColor, vignette * 0.80);
      }
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Custom Shader for Glowing dash pulses along curve tubes
const FlowLineShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#00E5FF") },
    uSpeed: { value: 1.0 },
    uDashFrequency: { value: 15.0 },
    uDashLength: { value: 0.92 },
    uIsDark: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSpeed;
    uniform float uDashFrequency;
    uniform float uDashLength;
    uniform float uIsDark;
    varying vec2 vUv;

    void main() {
      // Flowing dash calculation based on UV.x (representing curve path progression)
      float dash = sin(vUv.x * uDashFrequency - uTime * uSpeed);
      dash = smoothstep(uDashLength, 1.0, dash);
      
      // Tube edge gradient glow - softened edge decay (pow 2.0 instead of 3.5) for thicker volumetric appearance
      float edgeGlow = 1.0 - abs(vUv.y - 0.5) * 2.0;
      edgeGlow = pow(edgeGlow, 2.0);
      
      vec3 glowColor;
      float alpha;
      
      if (uIsDark > 0.5) {
        // Dark Mode: Bold, vibrant glowing additive flow lines
        glowColor = uColor * (dash * 0.88 + 0.12) * edgeGlow * 2.5;
        alpha = (dash * 0.8 + 0.2) * edgeGlow * 0.80;
      } else {
        // Light Mode: Vibrant flow lines with higher density and alpha
        glowColor = mix(uColor, vec3(0.02, 0.15, 0.55), 0.20) * (dash * 0.75 + 0.25) * 1.6;
        alpha = (dash * 0.75 + 0.25) * edgeGlow * 0.85;
      }
      
      gl_FragColor = vec4(glowColor, alpha);
    }
  `
};

function AuroraBackground() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const location = useLocation();
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  // Determine active colors based on route
  const activeColors = useMemo(() => {
    return PAGE_COLORS[location.pathname] || PAGE_COLORS["/"];
  }, [location.pathname]);

  // Determine the base background color based on theme
  const baseBgColor = useMemo(() => {
    return isDark ? "#050716" : "#EBF3FF";
  }, [isDark]);

  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uMouse: { value: mouseRef.current },
      uColor1: { value: new THREE.Color(activeColors.color1) },
      uColor2: { value: new THREE.Color(activeColors.color2) },
      uBaseBg: { value: new THREE.Color(baseBgColor) },
      uIsDark: { value: isDark ? 1.0 : 0.0 }
    };
  }, []);

  // Track mouse coordinates for subtle parallax
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (!materialRef.current) return;

    // Update time uniform
    materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

    // Smooth damp mouse uniforms with easing
    materialRef.current.uniforms.uMouse.value.x = THREE.MathUtils.damp(
      materialRef.current.uniforms.uMouse.value.x,
      mouseRef.current.x,
      2.0,
      delta
    );
    materialRef.current.uniforms.uMouse.value.y = THREE.MathUtils.damp(
      materialRef.current.uniforms.uMouse.value.y,
      mouseRef.current.y,
      2.0,
      delta
    );

    // Smooth damp color shifts between page paths
    const targetC1 = new THREE.Color(activeColors.color1);
    const targetC2 = new THREE.Color(activeColors.color2);
    materialRef.current.uniforms.uColor1.value.lerp(targetC1, 0.02);
    materialRef.current.uniforms.uColor2.value.lerp(targetC2, 0.02);

    // Smooth damp base bg and uIsDark uniform shifts
    const targetBaseBg = new THREE.Color(baseBgColor);
    materialRef.current.uniforms.uBaseBg.value.lerp(targetBaseBg, 0.05);
    materialRef.current.uniforms.uIsDark.value = THREE.MathUtils.damp(
      materialRef.current.uniforms.uIsDark.value,
      isDark ? 1.0 : 0.0,
      4.0,
      delta
    );
  });

  return (
    <mesh position={[0, 0, -2]} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={AuroraShader.vertexShader}
        fragmentShader={AuroraShader.fragmentShader}
        depthWrite={false}
      />
    </mesh>
  );
}

interface FlowConfig {
  curve: THREE.CatmullRomCurve3;
  speed: number;
  dashFreq: number;
  dashLength: number;
  thickness: number;
}

function LiquidityFlows() {
  const groupRef = useRef<THREE.Group>(null);
  const location = useLocation();
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const activeColors = useMemo(() => {
    return PAGE_COLORS[location.pathname] || PAGE_COLORS["/"];
  }, [location.pathname]);

  // Generate curved bezier line flows inside 3D space
  const flows = useMemo(() => {
    const list: FlowConfig[] = [];
    // Increase flow line count to 14 for a richer visual background
    for (let i = 0; i < 14; i++) {
      const points: THREE.Vector3[] = [];
      const startY = (Math.random() - 0.5) * 5;
      const startZ = -4 - Math.random() * 4;
      
      points.push(new THREE.Vector3(-10, startY, startZ));
      points.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 3,
          startZ + (Math.random() - 0.5) * 2
        )
      );
      points.push(new THREE.Vector3(10, (Math.random() - 0.5) * 5, startZ));
      
      const curve = new THREE.CatmullRomCurve3(points);
      list.push({
        curve,
        // Slightly faster flowing movement
        speed: Math.random() * 1.0 + 0.4,
        dashFreq: Math.random() * 10 + 8,
        dashLength: 0.9 + Math.random() * 0.05,
        // Make the curves 3-4x thicker so they are bold and distinct in space
        thickness: Math.random() * 0.025 + 0.015
      });
    }
    return list;
  }, []);

  // Track mouse coordinates for group parallax
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Frame animation handler
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Apply smooth mouse easing to the group container position for parallax
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x,
        mouseRef.current.x * 0.35,
        1.5,
        delta
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        mouseRef.current.y * 0.35,
        1.5,
        delta
      );
    }

    // Update uniforms
    const targetColor = new THREE.Color(activeColors.color1);
    materialsRef.current.forEach((mat) => {
      if (mat) {
        mat.uniforms.uTime.value = time;
        mat.uniforms.uColor.value.lerp(targetColor, 0.02);
        mat.uniforms.uIsDark.value = THREE.MathUtils.damp(
          mat.uniforms.uIsDark.value,
          isDark ? 1.0 : 0.0,
          4.0,
          delta
        );
      }
    });
  });

  return (
    <group ref={groupRef}>
      {flows.map((flow, index) => {
        const uniforms = {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(activeColors.color1) },
          uSpeed: { value: flow.speed },
          uDashFrequency: { value: flow.dashFreq },
          uDashLength: { value: flow.dashLength },
          uIsDark: { value: isDark ? 1.0 : 0.0 }
        };

        return (
          <mesh key={index} frustumCulled={false}>
            <tubeGeometry args={[flow.curve, 64, flow.thickness, 8, false]} />
            <shaderMaterial
              ref={(el) => {
                if (el) materialsRef.current[index] = el as THREE.ShaderMaterial;
              }}
              uniforms={uniforms}
              vertexShader={FlowLineShader.vertexShader}
              fragmentShader={FlowLineShader.fragmentShader}
              transparent
              depthWrite={false}
              blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
}



export function BackgroundCanvas() {
  return (
    <div className="absolute inset-0 w-full h-full bg-transparent overflow-hidden pointer-events-none select-none z-0">
      <Prism
        animationType="rotate"
        timeScale={0.5}
        height={3.5}
        baseWidth={5.5}
        scale={3.6}
        hueShift={0}
        colorFrequency={1}
        noise={0.5}
        glow={1}
      />
    </div>
  );
}
