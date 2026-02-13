exports.handler = async function () {
  try {
    const landingUrl = "https://bible.usccb.org/daily-bible-reading";

    const landingRes = await fetch(landingUrl, {
      headers: { "User-Agent": "HopeSiteBot/1.0", "Accept": "text/html" },
    });
    if (!landingRes.ok) return json(502, { error: "USCCB landing fetch failed" });
    const landingHtml = await landingRes.text();

    const dateLabel =
      clean(pick(landingHtml, /<h1[^>]*class="[^"]*daily-reading-date[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)) ||
      "Today";

    // Locate today's .cfm link
    const cfmPath = pick(landingHtml, /href="(\/bible\/readings\/\d+\.cfm)"/i);
    if (!cfmPath) {
      return json(200, {
        dateLabel,
        summary: "Today’s Catholic liturgy readings (NABRE).",
        items: [],
        note: "Could not locate today's readings page link.",
      });
    }

    const readingsUrl = "https://bible.usccb.org" + cfmPath;

    const readingsRes = await fetch(readingsUrl, {
      headers: { "User-Agent": "HopeSiteBot/1.0", "Accept": "text/html" },
    });
    if (!readingsRes.ok) return json(502, { error: "USCCB readings page fetch failed" });
    const readingsHtml = await readingsRes.text();

    // Support both roman numerals and digits (USCCB varies)
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

      // Excerpt = first paragraph text in the block
      const paraHtml = pick(block, /<p[^>]*>([\s\S]*?)<\/p>/i);
      const paraText = clean(strip(paraHtml));
      const excerpt = paraText
        ? paraText.slice(0, 280) + (paraText.length > 280 ? "…" : "")
        : "";

      // Reference: try several methods in order
      const reference =
        // 1) Real bible book link (NOT /bible/readings/)
        clean(
          pick(block, /<a[^>]*href="\/bible\/(?!readings\/)[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
        ) ||
        // 2) Text pattern inside the section (works even if citation isn't a link)
        findCitation(clean(strip(block))) ||
        "";

      // Only include if something meaningful exists
      if (reference || excerpt) {
        items.push({
          kind: sec.label,
          reference,
          excerpt,
        });
      }
    }

    return json(200, {
      dateLabel,
      summary: "Today’s Catholic liturgy readings (NABRE).",
      items,
      source: readingsUrl,
    });
  } catch (e) {
    return json(500, { error: "Unexpected error", detail: String(e) });
  }
};

// -------- helpers --------

function extractSectionByAnyHeading(html, variants) {
  // Find the first matching <h3> heading for any variant, then capture until next <h3>
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
  // Common USCCB patterns: "Mk 7:14-23", "Mark 7:14-23", "Ps 37:30-31, 3-4", "Psalm 37:30-31"
  // We'll return the first match we find.

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

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

function pick(text, re) {
  const m = re.exec(text);
  return m ? (m[1] || "") : "";
}

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, "");
}

function clean(s) {
  return strip(s)
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
