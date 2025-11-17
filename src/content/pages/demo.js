module.exports = {
  template: "standard",
  locales: {
    en: {
      output: "pages/demo.html",
      lang: "en",
      title: "Mailpox Demo - Museum of AI",
      assetsPrefix: "..",
      indexHref: "../index.html",
      backLinkText: "&larr; Back to Home",
      tailwindHref: "../assets/css/tailwind.css",
      stylesHref: "../assets/css/styles.css",
      scriptSrc: "../assets/js/script.js",
      headExtras: `
  <link rel="alternate" hreflang="en" href="../pages/demo">
  <link rel="alternate" hreflang="sv" href="../sv/pages/demo">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons/css/flag-icons.min.css">
`,
      mainContent: `
    <div class="container mx-auto px-4 space-y-8">
      <div class="flex items-center justify-end">
        <span class="uppercase tracking-widest text-xs text-slate-400" data-key="demo.tagline.badge">Mailpox Preview Environment</span>
      </div>
    </div>
    <div class="container mx-auto px-4 space-y-16 mt-6">
      <section class="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/60 p-10 shadow-2xl">
        <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div class="absolute -top-32 -right-16 w-80 h-80 bg-cyan-500/20 blur-3xl"></div>
          <div class="absolute bottom-0 left-1/4 w-64 h-64 bg-yellow-500/10 blur-[120px]"></div>
        </div>
        <div class="relative grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <p class="tracking-[0.3em] uppercase text-xs text-amber-300" data-key="demo.hero.kicker">Live exhibit editing</p>
            <h1 class="text-5xl font-bold leading-tight mb-6" data-key="demo.hero.title">Curate the Museum of AI from your inbox</h1>
            <p class="text-lg text-slate-200 mb-8 max-w-xl" data-key="demo.hero.subtitle">Mailpox mirrors the tone and pacing of our gallery pages so editors can safely test complex layouts, hero messaging, and multimedia descriptions without touching the database-backed admin area.</p>
            <div class="flex flex-wrap gap-4">
              <a href="#mailpox-playbook" class="glass-card px-6 py-3 rounded-full font-semibold border border-cyan-300/60 hover:border-cyan-200 transition" data-key="demo.hero.primary">See how Mailpox works</a>
              <a href="#gallery-spotlights" class="px-6 py-3 rounded-full font-semibold border border-white/20 hover:border-white/50 transition" data-key="demo.hero.secondary">Preview editable sections</a>
            </div>
            <ul class="mt-8 space-y-3 text-slate-300">
              <li class="flex items-start gap-3" data-key="demo.hero.point1">
                <i class="fa-solid fa-circle-check text-emerald-400 mt-1" aria-hidden="true"></i>
                <span>50+ realistic content keys mapped to actual layouts</span>
              </li>
              <li class="flex items-start gap-3" data-key="demo.hero.point2">
                <i class="fa-solid fa-circle-check text-emerald-400 mt-1" aria-hidden="true"></i>
                <span>Hero, exhibit, testimonial, and CTA blocks that mirror production pages</span>
              </li>
              <li class="flex items-start gap-3" data-key="demo.hero.point3">
                <i class="fa-solid fa-circle-check text-emerald-400 mt-1" aria-hidden="true"></i>
                <span>Mail instructions available in both key-based and natural language formats</span>
              </li>
            </ul>
          </div>
          <figure class="glass-card rounded-3xl border border-white/5 overflow-hidden">
            <img src="../images/museum_night.webp" alt="Evening photo of the Museum of AI" class="w-full h-full object-cover" data-key="demo.hero.image">
            <figcaption class="px-6 py-4 text-sm text-slate-200 bg-slate-900/70" data-key="demo.hero.caption">A curated view from the Night at the Museum program.</figcaption>
          </figure>
        </div>
      </section>

      <section id="gallery-spotlights">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <p class="text-sm uppercase tracking-[0.4em] text-slate-400" data-key="demo.section1.kicker">Featured galleries</p>
            <h2 class="text-4xl font-bold" data-key="demo.section1.title">Spotlights ready for Mailpox updates</h2>
          </div>
          <p class="text-slate-300 max-w-2xl" data-key="demo.section1.description">Each card reflects a museum narrative block with editable headings, body copy, captions, and CTAs. Update them via Mailpox to preview how your story flows before publishing.</p>
        </div>
        <div class="grid gap-6 lg:grid-cols-3">
          <article class="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
            <div class="rounded-xl overflow-hidden">
              <img src="../images/Human-AI-Interaction.avif" alt="Human and AI interaction exhibit" class="w-full h-48 object-cover" data-key="demo.exhibit.one.image">
            </div>
            <h3 class="text-2xl font-semibold" data-key="demo.exhibit.one.title">Human + AI Interaction Lab</h3>
            <p class="text-slate-300" data-key="demo.exhibit.one.body">A tactile exploration of co-creation, collaborative robotics, and sensory computing that adapts nightly.</p>
            <a href="#" class="inline-flex items-center text-cyan-300 hover:text-cyan-100 font-semibold gap-2" data-key="demo.exhibit.one.link">
              Reserve a session
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </article>
          <article class="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
            <div class="rounded-xl overflow-hidden">
              <img src="../images/evolution-AI.avif" alt="Evolution of AI exhibition" class="w-full h-48 object-cover" data-key="demo.exhibit.two.image">
            </div>
            <h3 class="text-2xl font-semibold" data-key="demo.exhibit.two.title">Evolution of Synthetic Minds</h3>
            <p class="text-slate-300" data-key="demo.exhibit.two.body">From earliest automata to contemporary frontier models, this gallery blends archival footage with speculative prototypes.</p>
            <a href="#" class="inline-flex items-center text-cyan-300 hover:text-cyan-100 font-semibold gap-2" data-key="demo.exhibit.two.link">
              Dive into the timeline
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </article>
          <article class="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
            <div class="rounded-xl overflow-hidden">
              <img src="../images/hands-on-workshops.avif" alt="Workshop participants" class="w-full h-48 object-cover" data-key="demo.exhibit.three.image">
            </div>
            <h3 class="text-2xl font-semibold" data-key="demo.exhibit.three.title">Hands-on Futures Studio</h3>
            <p class="text-slate-300" data-key="demo.exhibit.three.body">Small-group workshops where families, artists, and developers imagine civic-scale AI interventions.</p>
            <a href="#" class="inline-flex items-center text-cyan-300 hover:text-cyan-100 font-semibold gap-2" data-key="demo.exhibit.three.link">
              Book a workshop
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </article>
        </div>
      </section>

      <section class="grid gap-10 lg:grid-cols-[3fr_2fr] items-start">
        <article class="glass-card p-8 rounded-3xl border border-white/5 space-y-6">
          <div>
            <p class="text-sm uppercase tracking-[0.4em] text-slate-400" data-key="demo.section2.kicker">Living layout</p>
            <h2 class="text-3xl font-bold" data-key="demo.section2.title">Scene-setting paragraphs that match real museum tone</h2>
          </div>
          <p class="text-lg text-slate-200 leading-relaxed" data-key="demo.section2.body1">This demo page reuses the same typography scale, spacing rhythm, and background treatments as our public site. Editors can rewrite essays, update curator quotes, or test bilingual passages to ensure Mailpox respects nuance.</p>
          <p class="text-lg text-slate-200 leading-relaxed" data-key="demo.section2.body2">Use this section for long-form storytelling: describe a new residency cohort, reframe a research highlight, or refine the ethics manifesto before launch.</p>
          <blockquote class="border-l-4 border-emerald-400 pl-5 text-xl italic text-slate-100" data-key="demo.section2.quote">&ldquo;Mailpox frees our curators to experiment with bold narratives without waiting for engineering support.&rdquo;</blockquote>
          <p class="text-sm uppercase tracking-widest text-slate-400" data-key="demo.section2.quote.attribution">Greg FitzPatrick, Museum Director</p>
        </article>
        <aside class="space-y-6">
          <div class="glass-card rounded-3xl border border-white/5 p-6 space-y-4">
            <p class="text-sm uppercase tracking-[0.4em] text-slate-400" data-key="demo.stats.kicker">Tonight at a glance</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-4xl font-bold text-white" data-key="demo.stats.visitors">1,248</p>
                <p class="text-slate-400 text-sm" data-key="demo.stats.visitors.label">Visitors on site</p>
              </div>
              <div>
                <p class="text-4xl font-bold text-white" data-key="demo.stats.sessions">32</p>
                <p class="text-slate-400 text-sm" data-key="demo.stats.sessions.label">Workshops running</p>
              </div>
            </div>
            <p class="text-slate-300" data-key="demo.stats.description">These stats update as part of the Mailpox payload - perfect for verifying number formatting, locales, or bilingual content.</p>
          </div>
          <div class="glass-card rounded-3xl border border-white/5 p-6 space-y-4">
            <h3 class="text-2xl font-semibold" data-key="demo.sidepanel.title">Curator checklist</h3>
            <ul class="space-y-3 text-slate-300">
              <li data-key="demo.sidepanel.item1">Refresh exhibit descriptions for this week&rsquo;s school tours.</li>
              <li data-key="demo.sidepanel.item2">Highlight the Night Shift residency in the hero CTA.</li>
              <li data-key="demo.sidepanel.item3">Confirm accessibility copy and Swedish translations.</li>
            </ul>
            <button class="w-full glass-card border border-cyan-300/60 rounded-2xl py-3 font-semibold hover:border-cyan-100 transition" data-key="demo.sidepanel.button">Send edit via Mailpox</button>
          </div>
        </aside>
      </section>

      <section class="grid gap-12 lg:grid-cols-2">
        <div class="glass-card p-8 rounded-3xl border border-white/5 space-y-6">
          <div>
            <p class="text-sm uppercase tracking-[0.4em] text-slate-400" data-key="demo.timeline.kicker">Evening flow</p>
            <h2 class="text-3xl font-bold" data-key="demo.timeline.title">Program timeline</h2>
          </div>
          <ul class="space-y-5 text-slate-200">
            <li class="flex gap-4">
              <div class="w-16 text-sm font-semibold" data-key="demo.timeline.item1.time">17:00</div>
              <p class="flex-1" data-key="demo.timeline.item1.description">Doors open with ambient generative visuals across the atrium.</p>
            </li>
            <li class="flex gap-4">
              <div class="w-16 text-sm font-semibold" data-key="demo.timeline.item2.time">18:30</div>
              <p class="flex-1" data-key="demo.timeline.item2.description">Guided walkthrough of &ldquo;Evolution of Synthetic Minds.&rdquo;</p>
            </li>
            <li class="flex gap-4">
              <div class="w-16 text-sm font-semibold" data-key="demo.timeline.item3.time">20:00</div>
              <p class="flex-1" data-key="demo.timeline.item3.description">Hands-on Futures Studio with resident choreographers.</p>
            </li>
            <li class="flex gap-4">
              <div class="w-16 text-sm font-semibold" data-key="demo.timeline.item4.time">22:00</div>
              <p class="flex-1" data-key="demo.timeline.item4.description">Late-night DJ set featuring AI-augmented instruments.</p>
            </li>
          </ul>
        </div>
        <div class="glass-card p-8 rounded-3xl border border-white/5 space-y-6">
          <div>
            <p class="text-sm uppercase tracking-[0.4em] text-slate-400" data-key="demo.form.kicker">Plan an intervention</p>
            <h2 class="text-3xl font-bold" data-key="demo.form.title">Request a pop-up installation</h2>
            <p class="text-slate-300" data-key="demo.form.description">Use this form to simulate text inputs, labels, and button microcopy that Mailpox can update.</p>
          </div>
          <form id="demo-form" class="space-y-4">
            <label class="block text-sm text-slate-300" for="demo-name" data-key="demo.form.name.label">Your name</label>
            <input id="demo-name" type="text" class="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3" placeholder="Ada Lovelace">

            <label class="block text-sm text-slate-300" for="demo-email" data-key="demo.form.email.label">How should we contact you?</label>
            <input id="demo-email" type="email" class="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3" placeholder="editor@aimuseum.se">

            <label class="block text-sm text-slate-300" for="demo-idea" data-key="demo.form.idea.label">Installation idea</label>
            <textarea id="demo-idea" rows="3" class="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3" placeholder="Describe the piece you want to test with Mailpox."></textarea>

            <button type="submit" class="w-full glass-card border border-emerald-300/50 rounded-2xl font-semibold py-3 hover:border-emerald-100 transition" data-key="demo.form.submit">Send proposal</button>
            <p class="text-xs text-slate-500" data-key="demo.form.disclaimer">This form is for demo purposes only - no data is stored.</p>
          </form>
        </div>
      </section>

      <section id="mailpox-playbook" class="glass-card rounded-3xl border border-white/5 p-10 space-y-8">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p class="text-sm uppercase tracking-[0.4em] text-slate-400" data-key="demo.mailpox.kicker">Mailpox playbook</p>
            <h2 class="text-3xl font-bold" data-key="demo.mailpox.title">Send edits exactly how you would in production</h2>
          </div>
          <p class="text-slate-300 max-w-2xl" data-key="demo.mailpox.description">Pick any key from this page or write in natural language. Mailpox will parse the intent, validate who sent it, and apply your change to the staging dataset.</p>
        </div>
        <div class="grid gap-8 lg:grid-cols-3">
          <div class="rounded-2xl border border-white/10 p-6 space-y-4 bg-slate-900/40">
            <h3 class="text-xl font-semibold text-white" data-key="demo.mailpox.card1.title">Structured format</h3>
            <div class="bg-black/40 rounded-xl p-4 font-mono text-sm" data-key="demo.mailpox.card1.code">
[demo.hero.title]
Welcome to the Museum of AI Demo Night
[/demo.hero.title]
            </div>
            <p class="text-slate-300" data-key="demo.mailpox.card1.body">Ideal for precise updates and translation review.</p>
          </div>
          <div class="rounded-2xl border border-white/10 p-6 space-y-4 bg-slate-900/40">
            <h3 class="text-xl font-semibold text-white" data-key="demo.mailpox.card2.title">Natural language</h3>
            <p class="text-slate-300" data-key="demo.mailpox.card2.body">&ldquo;Update the timeline so the 20:00 activity describes the robotics performance instead of the workshop.&rdquo;</p>
            <ul class="list-disc list-inside text-sm text-slate-400" data-key="demo.mailpox.card2.notes">
              <li>Include the secret token in the subject.</li>
              <li>Mail from an approved curator address.</li>
              <li>We reply when the change lands.</li>
            </ul>
          </div>
          <div class="rounded-2xl border border-white/10 p-6 space-y-4 bg-slate-900/40">
            <h3 class="text-xl font-semibold text-white" data-key="demo.mailpox.card3.title">Keys to explore</h3>
            <ul class="space-y-2 text-slate-300 text-sm">
              <li><code class="text-cyan-300" data-key="demo.mailpox.card3.key1">demo.hero.primary</code> &mdash; CTA button</li>
              <li><code class="text-cyan-300" data-key="demo.mailpox.card3.key2">demo.exhibit.two.body</code> &mdash; Exhibit teaser</li>
              <li><code class="text-cyan-300" data-key="demo.mailpox.card3.key3">demo.timeline.item4.description</code> &mdash; Schedule row</li>
              <li><code class="text-cyan-300" data-key="demo.mailpox.card3.key4">demo.form.submit</code> &mdash; Form button</li>
            </ul>
            <p class="text-slate-400 text-sm" data-key="demo.mailpox.card3.footer">Try editing any highlighted blocks to confirm the pipeline.</p>
          </div>
        </div>
        <div class="rounded-2xl border border-cyan-300/30 p-6 bg-slate-900/60">
          <p class="text-slate-200" data-key="demo.mailpox.footer">Ready? Email <strong>edit@aimuseum.se</strong> with your desired updates. Mailpox will sync this page automatically so you can verify the typography, spacing, and responsive behavior before touching a real museum story.</p>
        </div>
      </section>
    </div>
`,
      postScripts: `
<script>
  const demoForm = document.getElementById('demo-form');
  if (demoForm) {
    demoForm.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Form submitted! (This is a demo - no data is actually sent)');
    });
  }
</script>
`,
    },
  },
};
