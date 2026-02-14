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
    const res = await fetch("/content/today.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Reflection request failed: " + res.status);

    const data = await res.json();

    const opening = data.opening ? `<p><em>${escapeHtml(data.opening)}</em></p>` : "";
    const body = textToParagraphs(data.body || "");
    const prayer = data.prayer ? `<p><strong>Prayer:</strong> ${escapeHtml(data.prayer)}</p>` : "";

    box.innerHTML = opening + body + prayer;

  } catch (err) {
    console.error(err);
    box.innerHTML = `<p>No reflection yet.</p>`;
  }
}

// ----------------------------
// Run on page load
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadReadings();
  loadReflection();
});
