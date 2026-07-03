import { useRef, useEffect } from "react";
import gsap from "gsap";

interface MagneticOptions {
  strength?: number; // 0 to 1 scaling factor
  duration?: number; // duration of spring-pull in seconds
  ease?: string;     // GSAP ease function
}

export function useMagnetic({
  strength = 0.35,
  duration = 0.6,
  ease = "power2.out",
}: MagneticOptions = {}) {
  const ref = useRef<HTMLButtonElement | HTMLDivElement | any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = el.getBoundingClientRect();

      // Relative coordinates of cursor inside target
      const x = clientX - (left + width / 2);
      const y = clientY - (top + height / 2);

      // Animate the button position towards the mouse pointer
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration,
        ease,
      });
    };

    const handleMouseLeave = () => {
      // Elastic spring-back to original centered coordinates
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)",
      });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [strength, duration, ease]);

  return ref;
}
