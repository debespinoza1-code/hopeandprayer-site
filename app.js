(() => {
  const $ = (id) => document.getElementById(id);

  const esc = (s) => String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  async function loadReadings(){
    const dateEl = $("readingsDate");
    const metaEl = $("readingsMeta");
    const cont = $("readingsContainer");
    const actions = $("readingsActions");

    try{
      const res = await fetch("/.netlify/functions/readings", { cache: "no-store" });
      if(!res.ok) throw new Error("readings http " + res.status);
      const data = await res.json();

      if(dateEl) dateEl.textContent = data.dateLabel || "Today";
      if(metaEl) metaEl.textContent = ""; // remove NABRE summary line
      if(cont) cont.innerHTML = "";
      if(actions) actions.innerHTML = "";

      (data.items || []).forEach(item => {
        const div = document.createElement("div");
        div.className = "reading";
        div.innerHTML = `
          <div class="reading__kind">${esc(item.kind)}</div>
          <div class="reading__ref">${esc(item.reference)}</div>
          <div class="reading__text">${esc(item.excerpt || "")}</div>
        `;
        cont.appendChild(div);
      });

      const usccb = data.source || "https://bible.usccb.org/daily-bible-reading";
      actions.innerHTML = `<a class="btnLink" href="${usccb}" target="_blank" rel="noreferrer">Open full readings on USCCB</a>`;

    }catch(e){
      console.error(e);
      if(dateEl) dateEl.textContent = "Today";
      if(metaEl) metaEl.textContent = "";
      if(cont) cont.innerHTML = `<div class="reading"><div class="reading__text">Readings are temporarily unavailable.</div></div>`;
      if(actions) actions.innerHTML = `<a class="btnLink" href="https://bible.usccb.org/daily-bible-reading" target="_blank" rel="noreferrer">Open full readings on USCCB</a>`;
    }
  }

  async function loadReflection(){
    const box = $("reflectionContainer");
    if(!box) return;

    try{
      const res = await fetch("/content/today.json", { cache: "no-store" });
      if(!res.ok) throw new Error("reflection http " + res.status);
      const data = await res.json();

      const parts = [];
      if(data.opening) parts.push(`<p>${esc(data.opening)}</p>`);
      if(data.body) parts.push(`<p>${esc(data.body).replace(/\n\n+/g, "</p><p>")}</p>`);
      if(data.prayer) parts.push(`<p><strong>Prayer:</strong> ${esc(data.prayer)}</p>`);

      box.innerHTML = parts.length ? parts.join("") : `<p>No reflection posted yet.</p>`;
    }catch(e){
      console.error(e);
      box.innerHTML = `<p>Could not load today’s reflection.</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadReadings();
    loadReflection();
  });
})();
