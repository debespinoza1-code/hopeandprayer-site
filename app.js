(function () {
  const $ = (id) => document.getElementById(id);

  function esc(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadReflection() {
    const box = $("reflectionContainer");
    if (!box) return;

    try {
      const res = await fetch("/content/today.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Reflection fetch failed: " + res.status);
      const data = await res.json();

      const opening = data.opening ? `<p class="lead">${esc(data.opening)}</p>` : "";
      const body = data.body
        ? `<p>${esc(data.body).replace(/\n\n+/g, "</p><p>")}</p>`
        : `<p class="lead">No reflection posted yet.</p>`;
      const prayer = data.prayer
        ? `<div class="softline"></div><p class="lead"><strong>Prayer:</strong> ${esc(data.prayer)}</p>`
        : "";

      box.innerHTML = opening + body + prayer;
    } catch (e) {
      console.error(e);
      box.innerHTML = `<p class="lead">Could not load today’s reflection.</p>`;
    }
  }

  async function loadReadings() {
    const dateEl = $("readingsDate");
    const introEl = $("readingsIntro");
    const container = $("readingsContainer");

    if (!container) return;

    try {
      const res = await fetch("/.netlify/functions/readings", { cache: "no-store" });
      if (!res.ok) throw new Error("Readings fetch failed: " + res.status);
      const data = await res.json();

      if (dateEl) dateEl.textContent = data.dateLabel || "Today";
      if (introEl) introEl.textContent = ""; // remove the extra line entirely

      container.innerHTML = "";

      const usccbUrl = data.source || "https://bible.usccb.org/daily-bible-reading";

      (data.items || []).forEach((item) => {
        const div = document.createElement("div");
        div.className = "reading";
        div.innerHTML = `
          <div class="reading__source">${esc(item.kind || "")}</div>
          <div class="reading__title">${esc(item.reference || "")}</div>
          ${item.excerpt ? `<p class="reading__snippet">${esc(item.excerpt)}</p>` : ""}
        `;
        container.appendChild(div);
      });

      // Single button, once, after all readings
      const actions = document.createElement("div");
      actions.className = "reading__actions";
      actions.innerHTML = `
        <a class="btn" href="${usccbUrl}" target="_blank" rel="noreferrer">Open full readings on USCCB</a>
      `;
      container.appendChild(actions);

    } catch (e) {
      console.error(e);
      if (dateEl) dateEl.textContent = "—";
      if (introEl) introEl.textContent = "";
      container.innerHTML = `
        <p class="lead">Readings are temporarily unavailable.</p>
        <div class="reading__actions">
          <a class="btn" href="https://bible.usccb.org/daily-bible-reading" target="_blank" rel="noreferrer">Open full readings on USCCB</a>
        </div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadReflection();
    loadReadings();
  });
})();
