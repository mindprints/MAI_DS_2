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

// Serve the built site from public/
app.use(express.static(PUBLIC_DIR));

// Email sending endpoint (contact forms, workshop requests, membership)
app.post("/api/send-email", handleSendEmail);
app.options("/api/send-email", handleSendEmail);

// Fallback: serve index.html for unknown non-API paths
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Page not found");
  }
});

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
