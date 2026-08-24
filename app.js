// ----------------------------
// Utility: Escape HTML
// ----------------------------
function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ----------------------------
// Utility: Convert body text to paragraphs
// - Blank line => new paragraph
// - Single line break => <br>
// ----------------------------
function textToParagraphs(text) {
  const safe = escapeHtml(text || "");

  const blocks = safe
    .split(/\n\s*\n/g)      // split on blank lines
    .map(b => b.trim())
    .filter(Boolean);

  return blocks
    .map(b => `<p>${b.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// ----------------------------
// Load Daily Readings
// ----------------------------
async function loadReadings() {
  const dateEl = document.getElementById("readingsDate");
  const container = document.getElementById("readingsContainer");
  const actions = document.getElementById("readingsActions");

  try {
    const res = await fetch("/.netlify/functions/readings", { cache: "no-store" });
    if (!res.ok) throw new Error("Readings request failed: " + res.status);

    const data = await res.json();
const seoTitleParts = [];

if (data.scripture) seoTitleParts.push(data.scripture);
if (data.theme) seoTitleParts.push(data.theme);

const seoTitle = seoTitleParts.length
  ? `${seoTitleParts.join(" — ")} | Hope & Prayer`
  : `${data.title || "Catholic Reflection"} | Hope & Prayer`;

const seoDescription = data.theme
  ? `A Catholic reflection for anyone struggling with faith, seeking God, returning to the Church, or wrestling with ${data.theme}.`
  : `A Catholic reflection for anyone seeking God, struggling with faith, or finding their way back to the Church.`;
    if (dateEl) dateEl.innerText = data.dateLabel || "Today";
    if (container) container.innerHTML = "";
    if (actions) actions.innerHTML = "";

    (data.items || []).forEach(item => {
      const div = document.createElement("div");
      div.className = "reading";
      div.innerHTML = `
        <div class="kind">${escapeHtml(item.kind || "")}</div>
        <div class="ref">${escapeHtml(item.reference || "")}</div>
        <div class="excerpt">${escapeHtml(item.excerpt || "")}</div>
      `;
      container.appendChild(div);
    });

    const usccb = data.source || "https://bible.usccb.org/daily-bible-reading";
    actions.innerHTML = `<a class="button" href="${usccb}" target="_blank" rel="noreferrer">Open full readings on USCCB</a>`;

  } catch (err) {
    console.error(err);
    if (dateEl) dateEl.innerText = "Today";
    if (container) container.innerHTML = `<p>Readings are temporarily unavailable.</p>`;
    if (actions) actions.innerHTML =
      `<a class="button" href="https://bible.usccb.org/daily-bible-reading" target="_blank" rel="noreferrer">Open full readings on USCCB</a>`;
  }
}

// ----------------------------
// Load Reflection (with paragraphs + spacing)
// ----------------------------
async function loadReflection() {
  const box = document.getElementById("reflectionContainer");
  if (!box) return;

  try {
    const path = window.location.pathname;
let reflectionFile = "/content/today.json";

if (path.startsWith("/reflections/")) {
  const slug = path.split("/reflections/")[1].replace(/\/$/, "");
  if (slug) {
    reflectionFile = `/content/reflections/${slug}.json`;
  }
}
const res = await fetch(reflectionFile, { cache: "no-store" });
    if (!res.ok) throw new Error("Reflection request failed: " + res.status);

    const data = await res.json();
const reflectionUrl = window.location.href.split("#")[0];

let metaDescription = document.querySelector('meta[name="description"]');
if (!metaDescription) {
  metaDescription = document.createElement("meta");
  metaDescription.setAttribute("name", "description");
  document.head.appendChild(metaDescription);
}

const seoDescription = data.theme
  ? `A Catholic reflection on ${data.theme} for anyone struggling with faith, seeking God, or finding their way back to the Catholic Church.`
  : "Catholic reflections for anyone struggling with faith, seeking God, or finding their way back to the Catholic Church.";

metaDescription.setAttribute("content", seoDescription);
let canonical = document.querySelector('link[rel="canonical"]');
if (!canonical) {
  canonical = document.createElement("link");
  canonical.setAttribute("rel", "canonical");
  document.head.appendChild(canonical);
}

canonical.setAttribute("href", reflectionUrl);
if (data.title && data.date) {
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": data.title,
    "datePublished": data.date,
    "mainEntityOfPage": reflectionUrl,
    "publisher": {
      "@type": "Organization",
      "name": "Hope & Prayer"
    }
  };

  const schemaScript = document.createElement("script");
  schemaScript.type = "application/ld+json";
  schemaScript.textContent = JSON.stringify(articleSchema);
  document.head.appendChild(schemaScript);
}

if (data.title) {
  document.title = `${data.title} | Hope & Prayer`;
}
    
    const opening = data.opening ? `<p><em>${escapeHtml(data.opening)}</em></p>` : "";
    const body = textToParagraphs(data.body || "");
    const prayer = data.prayer ? `<p><strong>Prayer:</strong> ${escapeHtml(data.prayer)}</p>` : "";

    box.innerHTML = opening + body + prayer;

 } catch (err) {
  console.error(err);
  box.innerHTML = `<p>No reflection yet.</p><p style="font-size:.8rem;">${escapeHtml(String(err))}</p>`;
}
}
async function loadReflectionLibrary() {
  const section = document.getElementById("reflectionLibrary");
  if (!section) return;

  try {
    const res = await fetch("/content/reflections/index.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Library request failed: " + res.status);

    const reflections = await res.json();

    section.innerHTML = `<h2>Catholic Reflection Library</h2>`;

    reflections.forEach(item => {
      const p = document.createElement("p");
      const link = document.createElement("a");

      link.href = item.url;
      link.textContent = `${item.date} — ${item.title}`;

      p.appendChild(link);
      section.appendChild(p);
    });

  } catch (err) {
    console.error(err);
  }
}
// ----------------------------
// Run on page load
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadReadings();
  loadReflection();
  loadReflectionLibrary();
});
