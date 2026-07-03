import React from 'react';

export default function Stats() {
  return (
    <section className="bg-bg py-16 md:py-24 border-t border-stroke">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
        <div>
          <div className="text-5xl md:text-7xl font-landing italic text-text-primary mb-2">20+</div>
          <div className="text-sm text-muted uppercase tracking-widest">Years Experience</div>
        </div>
        <div>
          <div className="text-5xl md:text-7xl font-landing italic text-text-primary mb-2">95+</div>
          <div className="text-sm text-muted uppercase tracking-widest">Projects Done</div>
        </div>
        <div>
          <div className="text-5xl md:text-7xl font-landing italic text-text-primary mb-2">200%</div>
          <div className="text-sm text-muted uppercase tracking-widest">Satisfied Clients</div>
        </div>
      </div>
    </section>
  );
}
