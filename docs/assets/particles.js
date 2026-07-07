// Shared particle background used across all docs pages.
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    create();
  }

  function create() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 16000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.4 + 0.4,
        opacity: Math.random() * 0.35 + 0.1
      });
    }
  }

  function particleRGB() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--particle-rgb').trim();
    return v || '255, 255, 255';
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rgb = particleRGB();
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${p.opacity})`;
      ctx.fill();
    }
    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener('resize', resize);
  animate();
});
