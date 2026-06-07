/* ═══════════════════════════════════════════════════
   NeuralHub — Shared Animations
   Include via <script src="animations.js"></script>
   at the bottom of every page's <body>
═══════════════════════════════════════════════════ */

(function () {

  /* ── 1. Inject shared animation CSS ─────────────────── */
  const style = document.createElement('style');
  style.textContent = `

    /* Scroll reveal */
    .reveal {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 0.55s cubic-bezier(.22,1,.36,1),
                  transform 0.55s cubic-bezier(.22,1,.36,1);
    }
    .reveal.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .reveal-delay-1 { transition-delay: 0.08s; }
    .reveal-delay-2 { transition-delay: 0.16s; }
    .reveal-delay-3 { transition-delay: 0.24s; }
    .reveal-delay-4 { transition-delay: 0.32s; }

    /* Skeleton shimmer */
    .skeleton {
      background: linear-gradient(90deg,
        rgba(255,255,255,0.04) 25%,
        rgba(255,255,255,0.09) 50%,
        rgba(255,255,255,0.04) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
      border-radius: 8px;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Skeleton card layout */
    .skeleton-card {
      background: var(--surface, #0e1318);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .skeleton-icon  { width: 48px; height: 48px; border-radius: 12px; margin-bottom: 1rem; }
    .skeleton-line  { height: 14px; margin-bottom: 10px; }
    .skeleton-line.short { width: 55%; }
    .skeleton-line.med   { width: 80%; }
    .skeleton-line.full  { width: 100%; }
    .skeleton-line.thin  { height: 10px; }

    /* Button ripple */
    .ripple-host { position: relative; overflow: hidden; }
    .ripple-wave {
      position: absolute;
      border-radius: 50%;
      transform: scale(0);
      background: rgba(255,255,255,0.18);
      animation: ripple-anim 0.55s linear;
      pointer-events: none;
    }
    @keyframes ripple-anim {
      to { transform: scale(4); opacity: 0; }
    }

    /* Card hover glow */
    .tool-card, .test-card, .pricing-card, .step {
      transition: transform 0.22s cubic-bezier(.22,1,.36,1),
                  border-color 0.22s ease,
                  box-shadow 0.22s ease !important;
    }
    .tool-card:hover {
      transform: translateY(-5px) !important;
      border-color: rgba(0,229,176,0.2) !important;
      box-shadow: 0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,176,0.06) !important;
    }
    .pricing-card:hover {
      transform: translateY(-4px) !important;
      box-shadow: 0 16px 40px rgba(0,0,0,0.4) !important;
    }

    /* Page fade-in */
    .page-enter {
      animation: pageIn 0.4s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes pageIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Nav scroll shadow */
    nav.scrolled {
      background: rgba(8,12,16,0.97) !important;
      box-shadow: 0 1px 0 rgba(255,255,255,0.06);
    }

    /* Smooth button press */
    button:active, a.btn-primary:active, a.btn-outline:active {
      transform: scale(0.97);
    }

    /* Success tick animation */
    @keyframes popIn {
      0%   { transform: scale(0.5); opacity: 0; }
      70%  { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    .pop-in { animation: popIn 0.35s cubic-bezier(.22,1,.36,1) both; }

    /* Stagger children inside a grid when it appears */
    .stagger-children > * {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .stagger-children.visible > *:nth-child(1) { transition-delay: 0.04s; }
    .stagger-children.visible > *:nth-child(2) { transition-delay: 0.10s; }
    .stagger-children.visible > *:nth-child(3) { transition-delay: 0.16s; }
    .stagger-children.visible > *:nth-child(4) { transition-delay: 0.22s; }
    .stagger-children.visible > *:nth-child(5) { transition-delay: 0.28s; }
    .stagger-children.visible > *:nth-child(6) { transition-delay: 0.34s; }
    .stagger-children.visible > *:nth-child(n+7) { transition-delay: 0.38s; }
    .stagger-children.visible > * {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);


  /* ── 2. Page enter animation ─────────────────────────── */
  document.body.classList.add('page-enter');


  /* ── 3. Scroll reveal (IntersectionObserver) ─────────── */
  // Auto-tag sections, headings, cards for reveal
  const revealSelectors = [
    'section > *',
    '.tool-card',
    '.test-card',
    '.step',
    '.pricing-card',
    '.stat',
    '.hero-stats',
    'footer > *'
  ];

  const toReveal = document.querySelectorAll(revealSelectors.join(', '));
  toReveal.forEach((el, i) => {
    // Don't double-add or override hero elements that already animate
    if (el.closest('.hero')) return;
    el.classList.add('reveal');
    // Stagger siblings in grids
    const parent = el.parentElement;
    if (parent && (parent.classList.contains('tools-grid') ||
                   parent.classList.contains('grid') ||
                   parent.classList.contains('steps') ||
                   parent.classList.contains('test-grid') ||
                   parent.classList.contains('pricing-grid'))) {
      const siblings = Array.from(parent.children);
      const idx = siblings.indexOf(el);
      if (idx < 4) el.classList.add(`reveal-delay-${idx + 1}`);
    }
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


  /* ── 4. Stagger grids ────────────────────────────────── */
  const staggerSelectors = '.tools-grid, .grid, .steps, .test-grid, .pricing-grid';
  document.querySelectorAll(staggerSelectors).forEach(grid => {
    grid.classList.add('stagger-children');
    const gridObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          gridObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    gridObserver.observe(grid);
  });


  /* ── 5. Button ripple effect ─────────────────────────── */
  function addRipple(e) {
    const btn = e.currentTarget;
    btn.classList.add('ripple-host');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove());
  }

  function attachRipples() {
    document.querySelectorAll(
      '.btn-primary, .btn-accent, .btn-ghost, .plan-btn, .btn-outline, .open-btn, .btn-try'
    ).forEach(btn => {
      if (!btn.dataset.ripple) {
        btn.addEventListener('click', addRipple);
        btn.dataset.ripple = '1';
      }
    });
  }
  attachRipples();

  // Re-attach on dynamic content (tools grid rendered via JS)
  const rippleObserver = new MutationObserver(attachRipples);
  rippleObserver.observe(document.body, { childList: true, subtree: true });


  /* ── 6. Nav scroll shadow ────────────────────────────── */
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }


  /* ── 7. Skeleton helpers (exported globally) ─────────── */

  // Generate N skeleton cards for a grid
  window.showSkeletons = function (containerId, count = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-icon"></div>
        <div class="skeleton skeleton-line med"></div>
        <div class="skeleton skeleton-line full thin" style="margin-bottom:6px"></div>
        <div class="skeleton skeleton-line full thin"></div>
        <div class="skeleton skeleton-line short thin" style="margin-top:16px"></div>
      </div>
    `).join('');
  };

  // Animate newly rendered cards in a grid
  window.animateCards = function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const cards = container.querySelectorAll('.tool-card, .pricing-card, .test-card');
    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(18px)';
      card.style.transition = `opacity 0.35s ease ${i * 0.06}s, transform 0.35s ease ${i * 0.06}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }));
    });
    attachRipples();
  };

})();