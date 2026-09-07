/* ==========================================================================
   Yuval Fitness - main script

   Loaded with `defer`, after gsap.min.js and ScrollTrigger.min.js, which
   are also deferred. `defer` preserves execution order, so GSAP is always
   parsed by the time this file runs.

   Contents:
     1. Motion preference
     2. Graceful degradation
     3. Header state
     4. Mobile navigation
     5. Scroll reveals (GSAP)
     6. Footer year
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. MOTION PREFERENCE
     A single shared gate, kept as a live MediaQueryList rather than a
     one-time boolean so a visitor who changes the OS setting mid-visit is
     respected on the next interaction.
     ---------------------------------------------------------------------- */

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function prefersReducedMotion() {
    return motionQuery.matches;
  }


  /* ------------------------------------------------------------------------
     2. GRACEFUL DEGRADATION
     The stylesheet hides reveal targets only while <html> carries the `js`
     class. If GSAP did not load - CDN blocked, offline, script error - we
     drop the class so every element returns to its visible resting state.
     Content must never depend on an animation that may never run.
     ---------------------------------------------------------------------- */

  var hasGSAP = typeof window.gsap !== 'undefined' &&
                typeof window.ScrollTrigger !== 'undefined';

  if (!hasGSAP) {
    document.documentElement.classList.remove('js');
  }


  /* ------------------------------------------------------------------------
     3. HEADER STATE
     The sticky header only gains a background once it actually overlaps
     content. Detected with an IntersectionObserver on a zero-cost sentinel
     rather than a scroll listener, so nothing runs on every scroll frame.
     ---------------------------------------------------------------------- */

  function initHeader() {
    var header = document.getElementById('site-header');
    if (!header) { return; }

    /* Keeps anchor jumps from landing underneath the sticky header,
       measured rather than hard-coded so it stays correct when the header
       reflows at a breakpoint or under text zoom. */
    function syncScrollPadding() {
      var h = header.offsetHeight;
      document.documentElement.style.scrollPaddingBlockStart = (h + 24) + 'px';
    }

    syncScrollPadding();

    if ('ResizeObserver' in window) {
      new ResizeObserver(syncScrollPadding).observe(header);
    }

    if (!('IntersectionObserver' in window)) { return; }

    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText =
      'position:absolute;inset-block-start:0;inline-size:1px;block-size:1px;pointer-events:none;';
    document.body.prepend(sentinel);

    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }


  /* ------------------------------------------------------------------------
     4. MOBILE NAVIGATION
     A disclosure pattern: the button owns aria-expanded, the panel is
     hidden with visibility so its links leave the tab order when closed.
     While the panel is open it covers the page, so focus is kept inside it
     and Escape returns focus to the button that opened it.
     ---------------------------------------------------------------------- */

  function initNav() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) { return; }

    /* Above this width the panel is laid out as an inline bar and the
       toggle is hidden, so the open/close behaviour must not apply. */
    var mobileQuery = window.matchMedia('(max-width: 63.99em)');

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function focusableLinks() {
      return nav.querySelectorAll('a[href]');
    }

    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');

      var first = focusableLinks()[0];
      if (first) { first.focus(); }
    }

    function close(returnFocus) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');

      if (returnFocus) { toggle.focus(); }
    }

    toggle.addEventListener('click', function () {
      if (isOpen()) { close(false); } else { open(); }
    });

    /* Escape closes and hands focus back to the toggle. */
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        close(true);
      }
    });

    /* Simple focus trap: the open panel is the only thing on screen. */
    nav.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab' || !isOpen()) { return; }

      var links = focusableLinks();
      if (!links.length) { return; }

      var first = links[0];
      var last = links[links.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    /* Following an in-page link should dismiss the panel it was tapped in. */
    nav.addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (link && isOpen()) { close(false); }
    });

    /* Growing past the breakpoint turns the panel back into a bar; make
       sure the page is not left with scrolling locked. */
    mobileQuery.addEventListener('change', function (event) {
      if (!event.matches && isOpen()) { close(false); }
    });
  }


  /* ------------------------------------------------------------------------
     5. SCROLL REVEALS
     Everything here is wrapped in gsap.matchMedia() keyed to
     prefers-reduced-motion: no-preference. Under a reduced-motion
     preference none of it is created, and matchMedia reverts any inline
     styles it applied, leaving the page in its plain visible state.
     ---------------------------------------------------------------------- */

  function initReveals() {
    if (!hasGSAP) { return; }

    gsap.registerPlugin(ScrollTrigger);

    var mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', function () {

      var hero = document.querySelector('.hero');
      var EASE = 'power2.out';

      /* ---- Hero: plays on load, since it is already in view ---- */
      if (hero) {
        gsap.fromTo(
          hero.querySelectorAll('[data-reveal]'),
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: .8, stagger: .09, ease: EASE, delay: .1 }
        );

        gsap.fromTo(
          hero.querySelectorAll('[data-reveal-media]'),
          { opacity: 0, scale: 1.04 },
          { opacity: 1, scale: 1, duration: 1.1, ease: EASE, delay: .2 }
        );
      }

      /* ---- Everything below the fold ----
         ScrollTrigger.batch groups elements that enter together into one
         staggered tween, so a grid of cards costs one animation rather
         than one per card. */

      function batch(selector, vars) {
        var targets = gsap.utils.toArray(selector).filter(function (el) {
          return !hero || !hero.contains(el);
        });

        if (!targets.length) { return; }

        ScrollTrigger.batch(targets, {
          start: 'top 88%',
          once: true,
          onEnter: function (elements) {
            gsap.fromTo(elements, vars.from, vars.to);
          }
        });
      }

      batch('[data-reveal]', {
        from: { opacity: 0, y: 20 },
        to:   { opacity: 1, y: 0, duration: .7, stagger: .08, ease: EASE }
      });

      batch('[data-reveal-card]', {
        from: { opacity: 0, y: 28 },
        to:   { opacity: 1, y: 0, duration: .75, stagger: .1, ease: EASE }
      });

      batch('[data-reveal-media]', {
        from: { opacity: 0, scale: 1.03 },
        to:   { opacity: 1, scale: 1, duration: .9, ease: EASE }
      });

      /* ---- One restrained parallax ----
         Applied to the About portrait only: mid-page, not the LCP image,
         and small enough to read as depth rather than movement. The image
         is scaled slightly so the frame never exposes an edge. */
      var portrait = document.querySelector('.media--portrait img');

      if (portrait) {
        gsap.fromTo(portrait,
          { yPercent: -3, scale: 1.06 },
          {
            yPercent: 3,
            ease: 'none',
            scrollTrigger: {
              trigger: '.media--portrait',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      }

      /* Returned to matchMedia so the whole context is torn down and any
         inline styles are reverted if the preference changes. */
      return function cleanup() {
        gsap.killTweensOf('[data-reveal], [data-reveal-card], [data-reveal-media]');
      };
    });
  }


  /* ------------------------------------------------------------------------
     6. FOOTER YEAR
     Written from script so the copyright line never goes stale.
     ---------------------------------------------------------------------- */

  function setCurrentYear() {
    var el = document.querySelector('[data-current-year]');
    if (el) { el.textContent = String(new Date().getFullYear()); }
  }


  /* ------------------------------------------------------------------------
     Init
     ---------------------------------------------------------------------- */

  initHeader();
  initNav();
  initReveals();
  setCurrentYear();

  /* Exposed for any section module added later. */
  window.YF = { prefersReducedMotion: prefersReducedMotion };
})();
