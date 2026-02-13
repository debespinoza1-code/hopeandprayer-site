exports.handler = async function () {
  try {
    // Build today's USCCB readings URL using USCCB timezone (America/New_York)
    const { mmddyy, dateLabel } = usccbToday();

    // Example: https://bible.usccb.org/bible/readings/021226.cfm
    const readingsUrl = `https://bible.usccb.org/bible/readings/${mmddyy}.cfm`;

    const readingsRes = await fetch(readingsUrl, {
      headers: { "User-Agent": "HopeSiteBot/1.0", "Accept": "text/html" },
    });

    // If for some reason today's computed URL fails, fallback to the landing page discovery
    let finalUrl = readingsUrl;
    let readingsHtml = "";
    if (readingsRes.ok) {
      readingsHtml = await readingsRes.text();
    } else {
      const fallback = await fallbackFromLanding();
      finalUrl = fallback.finalUrl;
      readingsHtml = fallback.readingsHtml;
    }

    const sections = [
      { label: "Reading I", variants: ["Reading I", "Reading 1"] },
      { label: "Reading II", variants: ["Reading II", "Reading 2"] },
      { label: "Responsorial Psalm", variants: ["Responsorial Psalm"] },
      { label: "Gospel", variants: ["Gospel"] },
    ];

    const items = [];

    for (const sec of sections) {
      const block = extractSectionByAnyHeading(readingsHtml, sec.variants);
      if (!block) continue;

      const paraHtml = pick(block, /<p[^>]*>([\s\S]*?)<\/p>/i);
      const paraText = clean(strip(paraHtml));
      const excerpt = paraText
        ? paraText.slice(0, 320) + (paraText.length > 320 ? "…" : "")
        : "";

      const reference =
        clean(pick(block, /<a[^>]*href="\/bible\/(?!readings\/)[^"]*"[^>]*>([\s\S]*?)<\/a>/i)) ||
        findCitation(clean(strip(block))) ||
        "";

      if (reference || excerpt) {
        items.push({ kind: sec.label, reference, excerpt });
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store", // critical: prevents Netlify/edge caching yesterday
      },
      body: JSON.stringify({
        dateLabel,
        summary: "Today’s Catholic liturgy readings (NABRE).",
        items,
        source: finalUrl,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: "Unexpected error", detail: String(e) }),
    };
  }
};

async function fallbackFromLanding() {
  const landingUrl = "https://bible.usccb.org/daily-bible-reading";
  const landingRes = await fetch(landingUrl, {
    headers: { "User-Agent": "HopeSiteBot/1.0", "Accept": "text/html" },
  });
  if (!landingRes.ok) throw new Error("USCCB landing fetch failed");

  const landingHtml = await landingRes.text();
  const cfmPath = pick(landingHtml, /href="(\/bible\/readings\/\d+\.cfm)"/i);
  if (!cfmPath) throw new Error("Could not locate readings .cfm link");

  const finalUrl = "https://bible.usccb.org" + cfmPath;
  const readingsRes = await fetch(finalUrl, {
    headers: { "User-Agent": "HopeSiteBot/1.0", "Accept": "text/html" },
  });
  if (!readingsRes.ok) throw new Error("USCCB readings page fetch failed");
  const readingsHtml = await readingsRes.text();

  return { finalUrl, readingsHtml };
}

function usccbToday() {
  // USCCB is on Eastern time. Build MMDDYY in America/New_York.
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const mm = parts.find(p => p.type === "month").value;
  const dd = parts.find(p => p.type === "day").value;
  const yy = parts.find(p => p.type === "year").value;

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  return { mmddyy: `${mm}${dd}${yy}`, dateLabel };
}

// ---- parsing helpers ----

function extractSectionByAnyHeading(html, variants) {
  for (const v of variants) {
    const headingRe = new RegExp(`<h3[^>]*>[\\s\\S]*?${escapeRe(v)}[\\s\\S]*?<\\/h3>`, "i");
    const m = headingRe.exec(html);
    if (!m) continue;

    const start = m.index + m[0].length;
    const tail = html.slice(start);
    const next = tail.search(/<h3\b/i);
    return next >= 0 ? tail.slice(0, next) : tail.slice(0, 15000);
  }
  return "";
}

function findCitation(text) {
  const patterns = [
    /\b(?:[1-3]\s)?(?:Gn|Ex|Lv|Nm|Dt|Jos|Jgs|Ru|1\s?Sm|2\s?Sm|1\s?Kgs|2\s?Kgs|1\s?Chr|2\s?Chr|Ezr|Neh|Tb|Jdt|Est|1\s?Mc|2\s?Mc|Jb|Ps|Prv|Eccl|Sg|Wis|Sir|Is|Jer|Lam|Bar|Ez|Dn|Hos|Jl|Am|Ob|Jon|Mi|Na|Hb|Zep|Hg|Zec|Mal|Mt|Mk|Lk|Jn|Acts|Rom|1\s?Cor|2\s?Cor|Gal|Eph|Phil|Col|1\s?Thes|2\s?Thes|1\s?Tm|2\s?Tm|Ti|Phlm|Heb|Jas|1\s?Pt|2\s?Pt|1\s?Jn|2\s?Jn|3\s?Jn|Jude|Rv)\s+\d+:\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*\b/i,
    /\b(?:[1-3]\s)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\sSamuel|2\sSamuel|1\sKings|2\sKings|1\sChronicles|2\sChronicles|Ezra|Nehemiah|Tobit|Judith|Esther|1\sMaccabees|2\sMaccabees|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song of Songs|Wisdom|Sirach|Isaiah|Jeremiah|Lamentations|Baruch|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\sCorinthians|2\sCorinthians|Galatians|Ephesians|Philippians|Colossians|1\sThessalonians|2\sThessalonians|1\sTimothy|2\sTimothy|Titus|Philemon|Hebrews|James|1\sPeter|2\sPeter|1\sJohn|2\sJohn|3\sJohn|Jude|Revelation)\s+\d+:\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[0].trim();
  }
  return "";
}

function pick(text, re) {
  const m = re.exec(text);
  return m ? (m[1] || "") : "";
}
function strip(s) { return String(s || "").replace(/<[^>]+>/g, ""); }
function clean(s) {
  return strip(s)
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
