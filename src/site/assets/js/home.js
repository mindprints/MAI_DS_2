// Home page interactions: entry screen (language + appearance), the
// clients marquee, and reveal-on-scroll — all respecting reduced motion.
// The stylesheet keeps everything visible when JS is absent (html.no-js).
(function () {
  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Entry screen -------------------------------------------------
  // Shown by the pre-paint head snippet (html[data-entry="show"]) until
  // both the language and the appearance have been chosen; the choices
  // persist in localStorage and the veil fades away.
  var LANG_KEY = 'mai-lang';
  var THEME_KEY = 'mai-theme';
  function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var veil = document.getElementById('entry-veil');
  if (veil && document.documentElement.getAttribute('data-entry') === 'show') {
    var pageLang = document.documentElement.lang === 'sv' ? 'sv' : 'en';
    var chosen = { lang: storeGet(LANG_KEY), theme: storeGet(THEME_KEY) };

    function markGroup(groupId, matchAttr, value) {
      var group = document.getElementById(groupId);
      if (!group) return;
      group.classList.add('is-set');
      group.querySelectorAll('.entry-opt').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute(matchAttr) === value ? 'true' : 'false');
      });
    }

    function dismiss() {
      veil.classList.add('entry-leave');
      setTimeout(function () {
        veil.remove();
        document.documentElement.removeAttribute('data-entry');
      }, 550);
    }

    function maybeDone(delay) {
      if (chosen.lang && chosen.theme) setTimeout(dismiss, delay || 0);
    }

    // Prefill whichever half was already chosen on an earlier page
    if (chosen.lang) markGroup('entry-lang', 'data-lang', chosen.lang);
    if (chosen.theme) markGroup('entry-theme', 'data-theme-choice', chosen.theme);

    veil.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-lang');
        chosen.lang = lang;
        storeSet(LANG_KEY, lang);
        markGroup('entry-lang', 'data-lang', lang);
        if (lang !== pageLang) {
          // Take them to the chosen language right away; the entry screen
          // continues there if the appearance is still unchosen.
          window.location.href = lang === 'sv' ? 'sv/index.html' : '../index.html';
          return;
        }
        maybeDone(350);
      });
    });

    veil.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var theme = btn.getAttribute('data-theme-choice');
        chosen.theme = theme;
        storeSet(THEME_KEY, theme);
        document.documentElement.setAttribute('data-theme', theme);
        markGroup('entry-theme', 'data-theme-choice', theme);
        maybeDone(350);
      });
    });

    var skip = document.getElementById('entry-skip');
    if (skip) {
      skip.addEventListener('click', function () {
        if (!chosen.lang) { chosen.lang = pageLang; storeSet(LANG_KEY, pageLang); }
        if (!chosen.theme) { chosen.theme = 'dark'; storeSet(THEME_KEY, 'dark'); }
        dismiss();
      });
    }

    var firstOpen = veil.querySelector('.entry-group:not(.is-set) .entry-opt');
    if (firstOpen) firstOpen.focus({ preventScroll: true });
  }

  // The header EN/SV links also remember the language choice
  document.querySelectorAll('.lang-toggle a[lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      storeSet(LANG_KEY, a.getAttribute('lang'));
    });
  });

  // ---- Clients & Partners marquee -----------------------------------
  // Duplicate the track once so the CSS animation loops seamlessly.
  // Skipped under reduced motion, where the row stays statically
  // scrollable instead.
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
