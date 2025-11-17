const path = require("path");
const fs = require("fs");

function load(file) {
  return fs.readFileSync(path.join(__dirname, file), "utf8");
}

module.exports = {
  template: "standard",
  locales: {
    en: {
      output: "pages/demo.html",
      lang: "en",
      title: "Mailpox Demo • Museum of AI",
      assetsPrefix: "..",
      indexHref: "../index.html",
      backLinkText: "&larr; Back to Home",
      tailwindHref: "../assets/css/tailwind.css",
      stylesHref: "../assets/css/styles.css",
      scriptSrc: "../assets/js/script.js",
      postScripts: "",
      headExtras: `
  <style>
    /* Demo Page Styles */
    .demo-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .demo-section {
      background: #1e293b;
      border-radius: 8px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      border-left: 4px solid #059669;
      color: #e2e8f0;
    }

    .demo-section h2 {
      color: #059669;
      margin-top: 0;
      border-bottom: 2px solid #475569;
      padding-bottom: 0.5rem;
    }

    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin: 2rem 0;
    }

    .demo-card {
      background: #334155;
      border: 1px solid #475569;
      border-radius: 6px;
      padding: 1.5rem;
      color: #e2e8f0;
    }

    .demo-card h3 {
      color: #60a5fa;
      margin-top: 0;
    }

    .tag-example {
      background: #334155;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 1rem;
      margin: 1rem 0;
      font-family: 'Courier New', monospace;
      color: #e2e8f0;
    }

    .interactive-demo {
      background: #1e3a8a;
      border: 2px dashed #60a5fa;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      color: #e2e8f0;
    }

    .form-demo {
      background: #064e3b;
      border: 1px solid #10b981;
      border-radius: 6px;
      padding: 1.5rem;
      color: #e2e8f0;
    }

    .table-demo {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    .table-demo th,
    .table-demo td {
      border: 1px solid #475569;
      padding: 0.75rem;
      text-align: left;
      color: #e2e8f0;
    }

    .table-demo th {
      background: #334155;
      font-weight: 600;
      color: #e2e8f0;
    }

    .media-demo {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin: 1rem 0;
    }

    .media-item {
      flex: 1;
      min-width: 200px;
      text-align: center;
    }

    .code-block {
      background: #0f172a;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid #334155;
    }

    .highlight {
      background: #f59e0b;
      color: #1e293b;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .test-button {
      background: #059669;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      margin: 0.5rem;
    }

    .test-button:hover {
      background: #047857;
    }

    .test-button.secondary {
      background: #3b82f6;
      color: white;
    }

    .test-button.secondary:hover {
      background: #2563eb;
      color: white;
    }

    .alert {
      padding: 1rem;
      border-radius: 6px;
      margin: 1rem 0;
    }

    .alert-success {
      background: #064e3b;
      border: 1px solid #10b981;
      color: #a7f3d0;
    }

    .alert-warning {
      background: #78350f;
      border: 1px solid #f59e0b;
      color: #fef3c7;
    }

    .alert-error {
      background: #7f1d1d;
      border: 1px solid #fca5a5;
      color: #fee2e2;
    }
  </style>
`,
      mainContent: `
<div class="demo-container">
  <header style="text-align: center; margin-bottom: 3rem;">
    <h1 style="color: #059669; font-size: 2.5rem; margin-bottom: 1rem;">Mailpox Demo Page</h1>
    <p style="font-size: 1.25rem; color: #94a3b8;">Comprehensive HTML tag testing for email-based content editing</p>
  </header>

  <!-- Text Formatting Section -->
  <section class="demo-section">
    <h2>Text Formatting & Typography</h2>

    <div class="demo-grid">
      <div class="demo-card">
        <h3>Headings</h3>
        <h1 data-key="demo.headings.h1">Heading 1 - Main Title</h1>
        <h2 data-key="demo.headings.h2">Heading 2 - Section Title</h2>
        <h3 data-key="demo.headings.h3">Heading 3 - Subsection</h3>
        <h4 data-key="demo.headings.h4">Heading 4 - Minor Heading</h4>
        <h5 data-key="demo.headings.h5">Heading 5 - Small Heading</h5>
        <h6 data-key="demo.headings.h6">Heading 6 - Tiny Heading</h6>
      </div>

      <div class="demo-card">
        <h3>Paragraphs & Text Styles</h3>
        <p data-key="demo.paragraph.normal">This is a normal paragraph with <strong data-key="demo.text.strong">strong text</strong>, <em data-key="demo.text.em">emphasized text</em>, and <u data-key="demo.text.underline">underlined text</u>.</p>

        <p data-key="demo.paragraph.small"><small>This is small text for disclaimers or fine print.</small></p>

        <p data-key="demo.paragraph.marked">This text has <mark data-key="demo.text.marked">highlighted sections</mark> for emphasis.</p>

        <p data-key="demo.paragraph.code">Inline code: <code data-key="demo.text.code">const message = "Hello World";</code></p>

        <blockquote data-key="demo.blockquote" style="border-left: 4px solid #059669; padding-left: 1rem; margin: 1rem 0; color: #94a3b8;">
          This is a blockquote for important quotes or citations.
        </blockquote>
      </div>
    </div>
  </section>

  <!-- Lists Section -->
  <section class="demo-section">
    <h2>Lists & Navigation</h2>

    <div class="demo-grid">
      <div class="demo-card">
        <h3>Unordered List</h3>
        <ul data-key="demo.list.unordered">
          <li data-key="demo.list.item1">First list item with <a href="#" data-key="demo.link.internal">internal link</a></li>
          <li data-key="demo.list.item2">Second list item</li>
          <li data-key="demo.list.item3">Third list item with nested:
            <ul>
              <li data-key="demo.list.nested1">Nested item one</li>
              <li data-key="demo.list.nested2">Nested item two</li>
            </ul>
          </li>
        </ul>
      </div>

      <div class="demo-card">
        <h3>Ordered List</h3>
        <ol data-key="demo.list.ordered">
          <li data-key="demo.ordered.item1">First step in sequence</li>
          <li data-key="demo.ordered.item2">Second step</li>
          <li data-key="demo.ordered.item3">Third step with sub-steps:
            <ol>
              <li data-key="demo.ordered.sub1">Sub-step A</li>
              <li data-key="demo.ordered.sub2">Sub-step B</li>
            </ol>
          </li>
        </ol>
      </div>

      <div class="demo-card">
        <h3>Definition List</h3>
        <dl data-key="demo.list.definition">
          <dt data-key="demo.definition.term1">HTML</dt>
          <dd data-key="demo.definition.desc1">HyperText Markup Language</dd>

          <dt data-key="demo.definition.term2">CSS</dt>
          <dd data-key="demo.definition.desc2">Cascading Style Sheets</dd>

          <dt data-key="demo.definition.term3">AI</dt>
          <dd data-key="demo.definition.desc3">Artificial Intelligence</dd>
        </dl>
      </div>
    </div>
  </section>

  <!-- Interactive Elements -->
  <section class="demo-section">
    <h2>Interactive Elements</h2>

    <div class="interactive-demo">
      <h3>Buttons & Links</h3>

      <div style="margin: 1rem 0;">
        <button class="test-button" data-key="demo.button.primary" onclick="alert('Primary button clicked!')">
          Primary Button
        </button>

        <button class="test-button secondary" data-key="demo.button.secondary" onclick="alert('Secondary button clicked!')">
          Secondary Button
        </button>

        <a href="https://aimuseum.se" class="test-button" data-key="demo.link.external" style="text-decoration: none;">
          External Link Button
        </a>
      </div>

      <div style="margin: 1rem 0;">
        <label for="demo-input" data-key="demo.label.input">Text Input:</label>
        <input type="text" id="demo-input" data-key="demo.input.text" placeholder="Enter some text..." style="margin: 0.5rem; padding: 0.5rem; border: 1px solid #475569; border-radius: 4px; background: #1e293b; color: #e2e8f0;">
      </div>

      <div style="margin: 1rem 0;">
        <label for="demo-select" data-key="demo.label.select">Select Menu:</label>
        <select id="demo-select" data-key="demo.select.menu" style="margin: 0.5rem; padding: 0.5rem; border: 1px solid #475569; border-radius: 4px; background: #1e293b; color: #e2e8f0;">
          <option value="option1" data-key="demo.option.1">Option 1</option>
          <option value="option2" data-key="demo.option.2">Option 2</option>
          <option value="option3" data-key="demo.option.3">Option 3</option>
        </select>
      </div>
    </div>
  </section>

  <!-- Forms Section -->
  <section class="demo-section">
    <h2>Form Elements</h2>

    <div class="form-demo">
      <form id="demo-form" data-key="demo.form.contact">
        <div style="margin-bottom: 1rem;">
          <label for="name" data-key="demo.form.label.name">Full Name:</label>
          <input type="text" id="name" name="name" data-key="demo.form.input.name" required style="width: 100%; padding: 0.5rem; border: 1px solid #475569; border-radius: 4px; background: #1e293b; color: #e2e8f0;">
        </div>

        <div style="margin-bottom: 1rem;">
          <label for="email" data-key="demo.form.label.email">Email Address:</label>
          <input type="email" id="email" name="email" data-key="demo.form.input.email" required style="width: 100%; padding: 0.5rem; border: 1px solid #475569; border-radius: 4px; background: #1e293b; color: #e2e8f0;">
        </div>

        <div style="margin-bottom: 1rem;">
          <label for="message" data-key="demo.form.label.message">Message:</label>
          <textarea id="message" name="message" data-key="demo.form.textarea.message" rows="4" style="width: 100%; padding: 0.5rem; border: 1px solid #475569; border-radius: 4px; background: #1e293b; color: #e2e8f0;"></textarea>
        </div>

        <div style="margin-bottom: 1rem;">
          <label data-key="demo.form.label.newsletter">
            <input type="checkbox" name="newsletter" data-key="demo.form.checkbox.newsletter">
            Subscribe to newsletter
          </label>
        </div>

        <div style="margin-bottom: 1rem;">
          <fieldset>
            <legend data-key="demo.form.legend.preference">Preferred Contact Method:</legend>
            <label>
              <input type="radio" name="contact" value="email" data-key="demo.form.radio.email" checked>
              Email
            </label>
            <label>
              <input type="radio" name="contact" value="phone" data-key="demo.form.radio.phone">
              Phone
            </label>
          </fieldset>
        </div>

        <button type="submit" class="test-button" data-key="demo.form.button.submit">
          Submit Form
        </button>
      </form>
    </div>
  </section>

  <!-- Tables Section -->
  <section class="demo-section">
    <h2>Tables & Data Display</h2>

    <table class="table-demo" data-key="demo.table.pricing">
      <thead>
        <tr>
          <th data-key="demo.table.header.plan">Plan</th>
          <th data-key="demo.table.header.features">Features</th>
          <th data-key="demo.table.header.price">Price</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-key="demo.table.row1.plan">Basic</td>
          <td data-key="demo.table.row1.features">Essential features only</td>
          <td data-key="demo.table.row1.price">$9.99/month</td>
        </tr>
        <tr>
          <td data-key="demo.table.row2.plan">Pro</td>
          <td data-key="demo.table.row2.features">All features + support</td>
          <td data-key="demo.table.row2.price">$19.99/month</td>
        </tr>
        <tr>
          <td data-key="demo.table.row3.plan">Enterprise</td>
          <td data-key="demo.table.row3.features">Custom solutions</td>
          <td data-key="demo.table.row3.price">Contact us</td>
        </tr>
      </tbody>
    </table>
  </section>

  <!-- Media & Images -->
  <section class="demo-section">
    <h2>Media & Images</h2>

    <div class="media-demo">
      <div class="media-item">
        <img src="../images/MAI_logoTransp_mc2.png" alt="Museum of AI Logo" data-key="demo.image.logo" style="max-width: 200px; height: auto;">
        <p data-key="demo.caption.logo">Museum of AI Logo</p>
      </div>

      <div class="media-item">
        <figure>
          <img src="https://via.placeholder.com/300x200/059669/ffffff?text=Demo+Image" alt="Placeholder Image" data-key="demo.image.placeholder" style="max-width: 300px; height: auto;">
          <figcaption data-key="demo.caption.placeholder">Sample placeholder image with green background</figcaption>
        </figure>
      </div>
    </div>

    <div style="margin-top: 2rem;">
      <h3 data-key="demo.media.audio">Audio Example</h3>
      <audio controls data-key="demo.audio.player" style="width: 100%;">
        <source src="#" type="audio/mpeg" data-key="demo.audio.source">
        Your browser does not support the audio element.
      </audio>
      <p data-key="demo.audio.caption"><small>Audio player placeholder - would contain museum audio content</small></p>
    </div>
  </section>

  <!-- Alerts & Notifications -->
  <section class="demo-section">
    <h2>Alerts & Status Messages</h2>

    <div class="alert alert-success" data-key="demo.alert.success">
      <strong data-key="demo.alert.success.title">Success!</strong> This operation completed successfully.
    </div>

    <div class="alert alert-warning" data-key="demo.alert.warning">
      <strong data-key="demo.alert.warning.title">Warning:</strong> This action requires confirmation.
    </div>

    <div class="alert alert-error" data-key="demo.alert.error">
      <strong data-key="demo.alert.error.title">Error:</strong> Something went wrong. Please try again.
    </div>

    <div style="background: #334155; padding: 1rem; border-radius: 6px; margin: 1rem 0;">
      <p data-key="demo.status.message"><span class="highlight" data-key="demo.status.highlight">Status:</span> System is operational and ready for testing.</p>
    </div>
  </section>

  <!-- Code Examples -->
  <section class="demo-section">
    <h2>Code & Technical Content</h2>

    <div class="code-block" data-key="demo.code.html">
      &lt;!-- HTML Example --&gt;<br>
      &lt;div class="container"&gt;<br>
      &nbsp;&nbsp;&lt;h1 data-key="page.title"&gt;Welcome&lt;/h1&gt;<br>
      &nbsp;&nbsp;&lt;p data-key="page.description"&gt;This content can be edited via email.&lt;/p&gt;<br>
      &lt;/div&gt;
    </div>

    <div class="code-block" data-key="demo.code.javascript">
      // JavaScript Example<br>
      function updateContent(key, newValue) {<br>
      &nbsp;&nbsp;const element = document.querySelector(\`[data-key="\${key}"]\`);<br>
      &nbsp;&nbsp;if (element) {<br>
      &nbsp;&nbsp;&nbsp;&nbsp;element.textContent = newValue;<br>
      &nbsp;&nbsp;}<br>
      }
    </div>
  </section>

  <!-- Mailpox Testing Instructions -->
  <section class="demo-section" style="background: #1e3a8a; border-left-color: #60a5fa;">
    <h2 style="color: #60a5fa;">Mailpox Testing Instructions</h2>

    <div class="demo-grid">
      <div class="demo-card">
        <h3>How to Test</h3>
        <ol>
          <li>Send an email to: <strong>edit@aimuseum.se</strong></li>
          <li>Include your secret token in the subject or body</li>
          <li>Use the format: <code>[demo.key.name]New content here[/demo.key.name]</code></li>
          <li>Or write natural language: "Update the demo page hero title to say 'Welcome to AI Museum Demo'"</li>
        </ol>
      </div>

      <div class="demo-card">
        <h3>Test Keys Available</h3>
        <ul>
          <li><code>demo.headings.h1</code> - Main title</li>
          <li><code>demo.paragraph.normal</code> - First paragraph</li>
          <li><code>demo.button.primary</code> - Primary button text</li>
          <li><code>demo.alert.success</code> - Success message</li>
          <li>...and many more throughout the page!</li>
        </ul>
      </div>
    </div>

    <div class="alert alert-success" style="margin-top: 1rem;">
      <strong>Ready for Testing!</strong> This demo page contains <span class="highlight">50+ testable content keys</span> with various HTML tags and styling.
    </div>
  </section>
</div>

<script>
  // Demo form handler
  document.getElementById('demo-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Form submitted! (This is a demo - no data is actually sent)');
  });
</script>
`,
    },
  },
};
