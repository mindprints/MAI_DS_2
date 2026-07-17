// Home page interactions: reveal-on-scroll only, respecting reduced motion.
// The stylesheet keeps everything visible when JS is absent (html.no-js).
(function () {
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Clients & Partners marquee: duplicate the track once so the CSS
  // animation loops seamlessly. Skipped under reduced motion, where the
  // row stays statically scrollable instead.
  var track = document.querySelector('.logo-track');
  if (track && !prefersReducedMotion) {
    Array.prototype.slice.call(track.children).forEach(function (item) {
      var clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
    track.parentElement.classList.add('is-cloned');
  }

  var items = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
  );
  items.forEach(function (el) { observer.observe(el); });
})();
