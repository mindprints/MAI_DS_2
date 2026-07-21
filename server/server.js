require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { handleSendEmail } = require("../api/send-email-express");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const app = express();
app.use(express.json({ limit: "1mb" }));

// Set Content Security Policy to allow external resources
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; " +
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "frame-src 'none';",
  );
  next();
});

// Resolve a request path to a file inside PUBLIC_DIR, or null if it escapes.
function resolvePublic(urlPath, suffix = "") {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const rel = decoded.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!rel) return null;
  const file = path.join(PUBLIC_DIR, rel + suffix);
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return null;
  return file;
}

// Emulate Vercel's `cleanUrls` (see vercel.json): extensionless URLs map to
// the matching .html file. Runs before express.static so that where both
// pages/daily.html and pages/daily/ exist, the page wins over the directory.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api/") || path.extname(req.path)) return next();
  const file = resolvePublic(req.path, ".html");
  if (file && fs.existsSync(file)) {
    // /pages/daily/ must not serve daily.html as-is: the page's relative
    // paths (../assets, daily/…) would resolve one level too deep, leaving it
    // unstyled with dead edition links. Send the browser to the canonical
    // slash-less URL first so the base is right.
    if (req.path.length > 1 && req.path.endsWith("/")) {
      const query = req.originalUrl.slice(req.path.length);
      return res.redirect(301, req.path.replace(/\/+$/, "") + query);
    }
    return res.sendFile(file);
  }
  next();
});

// Serve the built site from public/. `redirect: false` stops bare directory
// URLs (/pages) from 301-ing to /pages/, where relative asset paths in the
// fallback page would resolve one level too deep.
app.use(express.static(PUBLIC_DIR, { redirect: false }));

// Email sending endpoint (contact forms, workshop requests, membership)
app.post("/api/send-email", handleSendEmail);
app.options("/api/send-email", handleSendEmail);

// Substack RSS proxy for the journal page (avoids CORS). Mirrors the
// Vercel Edge function api/substack.js.
app.get("/api/substack", async (req, res) => {
  try {
    const feed = req.query.feed || "https://mindprints.substack.com/feed";
    const r = await fetch(feed, {
      headers: { "user-agent": "MAI-Website/1.0 (+https://mindprints.substack.com)" },
    });
    if (!r.ok) return res.status(502).send(`Upstream failed: ${r.status}`);
    const xml = await r.text();
    res
      .set({
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, s-maxage=600, max-age=60",
        "access-control-allow-origin": "*",
      })
      .send(xml);
  } catch (err) {
    res.status(500).send("Error: " + (err?.message || "unknown"));
  }
});

// OG-image lookup for journal covers. Mirrors the Vercel Edge function
// api/og-image.js: fetches a page and returns { image } from its meta tags.
function extractOgImage(html) {
  const tags = [...html.matchAll(/<meta[^>]*>/gi)].map((m) => m[0]);
  for (const tag of tags) {
    const hasOg =
      /property\s*=\s*["']og:image(?::secure_url)?["']/i.test(tag) ||
      /name\s*=\s*["']twitter:image(?::src)?["']/i.test(tag);
    if (!hasOg) continue;
    const m = tag.match(/content\s*=\s*["']([^"']+)["']/i);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

app.get("/api/og-image", async (req, res) => {
  res.set({
    "cache-control": "public, s-maxage=86400, max-age=600",
    "access-control-allow-origin": "*",
  });
  try {
    const url = req.query.url;
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ image: null, error: "Missing or invalid url" });
    }
    const r = await fetch(url, {
      headers: { "user-agent": "MAI-Website/1.0" },
      redirect: "follow",
    });
    if (!r.ok) return res.status(502).json({ image: null, error: `Upstream ${r.status}` });
    const html = await r.text();
    res.json({ image: extractOgImage(html) });
  } catch (err) {
    res.status(500).json({ image: null, error: err?.message || "unknown" });
  }
});

// Fallback for paths nothing above matched.
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }

  // A missing asset must 404. Answering a .css/.js request with index.html
  // (200, text/html) is what made pages render unstyled.
  if (path.extname(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }

  // Directory that has its own index.html (/sv) — add the trailing slash so
  // relative links inside it resolve correctly.
  const dirIndex = resolvePublic(req.path, "/index.html");
  if (dirIndex && fs.existsSync(dirIndex)) {
    return res.redirect(301, req.path.replace(/\/+$/, "") + "/");
  }

  // Mistyped or listing-style URL (/pages): the 404 page, in the language of
  // the branch that was missed. Its asset paths are absolute, so it renders
  // correctly at whatever depth the visitor landed on.
  const notFound = /^\/sv(\/|$)/.test(req.path) ? "sv/404.html" : "404.html";
  const notFoundPath = path.join(PUBLIC_DIR, notFound);
  if (fs.existsSync(notFoundPath)) {
    return res.status(404).sendFile(notFoundPath);
  }
  res.status(404).type("text/plain").send("Page not found");
});

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
