// Hope — app.js (minimal)

const LS = {
  guidanceTitle: "hope.guidanceTitle",
  guidanceBody: "hope.guidanceBody",
  prayerRequests: "hope.prayerRequests"
};

function $(id){ return document.getElementById(id); }

function formatDate(d){
  return d.toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

function setText(id, value){
  const el = $(id);
  if (el) el.textContent = value;
}

function setLink(id, href){
  const el = $(id);
  if (el) el.href = href;
}

async function loadReadings(){
  // Local preview note stays visible; on Netlify we’ll replace content.
  setText("readingTitle", "Loading today’s readings…");
  setText("readingSnippet", "Please wait.");
  setLink("readingLink", "https://bible.usccb.org/");

  const res = await fetch("/api/readings", { cache: "no-store" });
  if (!res.ok) throw new Error("Feed not available yet (deploy to Netlify).");

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("No readings found.");

  setText("readingTitle", item.title || "USCCB Daily Readings");
  setText("readingSnippet", (item.descriptionText || "").slice(0, 420) + "…");
  setLink("readingLink", item.link || "https://bible.usccb.org/");

  const note = $("readingNote");
  if (note) note.style.display = "none";
}

function loadGuidance(){
  $("guidanceTitle").value = localStorage.getItem(LS.guidanceTitle) || "";
  $("guidanceBody").value = localStorage.getItem(LS.guidanceBody) || "";
}
function saveGuidance(){
  localStorage.setItem(LS.guidanceTitle, $("guidanceTitle").value || "");
  localStorage.setItem(LS.guidanceBody, $("guidanceBody").value || "");
}

let t = null;
function autosave(){
  clearTimeout(t);
  t = setTimeout(saveGuidance, 350);
}

function loadPrayerRequests(){
  try{
    return JSON.parse(localStorage.getItem(LS.prayerRequests) || "[]");
  }catch{
    return [];
  }
}
function savePrayerRequests(arr){
  localStorage.setItem(LS.prayerRequests, JSON.stringify(arr));
}

function saveRequest(){
  const name = ($("name").value || "Anonymous").trim().slice(0, 60);
  const contact = ($("contact").value || "").trim().slice(0, 120);
  const request = ($("request").value || "").trim();

  if (!request){
    alert("Please write a prayer request first.");
    return;
  }

  const arr = loadPrayerRequests();
  arr.push({ name, contact, request, time: new Date().toISOString() });
  savePrayerRequests(arr);

  $("request").value = "";
  alert("Saved. When you’re ready, we can make this send to you automatically (Netlify Forms).");
}

(function init(){
  const now = new Date();
  setText("todayDate", formatDate(now));
  setText("yearNow", String(now.getFullYear()));

  loadGuidance();
  $("guidanceTitle").addEventListener("input", autosave);
  $("guidanceBody").addEventListener("input", autosave);

  $("saveRequestBtn").addEventListener("click", saveRequest);

  loadReadings().catch(err => {
    // Don’t scare the user; show a graceful local-preview message.
    setText("readingTitle", "Today’s readings will appear after you deploy to Netlify.");
    setText("readingSnippet", "Right now you’re previewing locally. The design is correct — the feed is server-only.");
    setLink("readingLink", "https://bible.usccb.org/");
  });
})();
