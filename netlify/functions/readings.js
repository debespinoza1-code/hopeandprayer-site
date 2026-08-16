exports.handler = async function () {
  try {
    const { mmddyy, dateLabel } = usccbToday();

    const normalUrl = `https://bible.usccb.org/bible/readings/${mmddyy}.cfm`;

    let finalUrl = normalUrl;
    let readingsHtml = "";

    // First try the normal USCCB daily readings page
    const normalRes = await fetch(normalUrl, {
      headers: {
        "User-Agent": "HopeSiteBot/1.0",
        "Accept": "text/html"
      }
    });

    if (normalRes.ok) {
      readingsHtml = await normalRes.text();
    }

    // Try to parse the normal page
    let items = parseReadings(readingsHtml);

    // Some solemnities/feasts use a separate "-Day" page.
    // Only try it if the normal page did not give us readings.
    if (items.length === 0) {
      const dayUrl = normalUrl.replace(/\.cfm$/i, "-Day");

      try {
        const dayRes = await fetch(dayUrl, {
          headers: {
            "User-Agent": "HopeSiteBot/1.0",
            "Accept": "text/html"
          }
        });

        if (dayRes.ok) {
          const dayHtml = await dayRes.text();
          const dayItems = parseReadings(dayHtml);

          if (dayItems.length > 0) {
            finalUrl = dayUrl;
            readingsHtml = dayHtml;
            items = dayItems;
          }
        }
      } catch (e) {
        // A missing or blocked -Day page is not fatal.
        console.log("No usable Mass-during-the-Day page:", String(e));
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        dateLabel,
        summary: "Today's Catholic liturgy readings (NABRE).",
        items,
        source: finalUrl
      })
    };

  } catch (e) {
    // Never crash the homepage just because USCCB cannot be reached.
    const { dateLabel } = usccbToday();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        dateLabel,
        summary: "Today's Catholic liturgy readings.",
        items: [],
        source: "https://bible.usccb.org/daily-bible-reading"
      })
    };
  }
};


// --------------------------------------------------
// Parse the USCCB readings page
// --------------------------------------------------

function parseReadings(html) {
  if (!html) return [];

  const sections = [
    {
      label: "Reading I",
      variants: ["Reading I", "Reading 1"]
    },
    {
      label: "Responsorial Psalm",
      variants: ["Responsorial Psalm"]
    },
    {
      label: "Reading II",
      variants: ["Reading II", "Reading 2"]
    },
    {
      label: "Gospel",
      variants: ["Gospel"]
    }
  ];

  const items = [];

  for (const sec of sections) {
    const block = extractSectionByAnyHeading(html, sec.variants);

    if (!block) continue;

    const reference = extractReference(block);
    const excerpt = extractExcerpt(block);

    if (reference || excerpt) {
      items.push({
        kind: sec.label,
        reference,
        excerpt
      });
    }
  }

  return items;
}


// --------------------------------------------------
// Find the section beneath a reading heading
// --------------------------------------------------

function extractSectionByAnyHeading(html, variants) {
  for (const v of variants) {
    const headingRe = new RegExp(
      `<h[1-6][^>]*>[\\s\\S]*?${escapeRe(v)}[\\s\\S]*?<\\/h[1-6]>`,
      "i"
    );

    const match = headingRe.exec(html);

    if (!match) continue;

    const start = match.index + match[0].length;
    const tail = html.slice(start);

    const nextHeading = tail.search(/<h[1-6]\b/i);

    if (nextHeading >= 0) {
      return tail.slice(0, nextHeading);
    }

    return tail.slice(0, 20000);
  }

  return "";
}


// --------------------------------------------------
// Extract scripture reference
// --------------------------------------------------

function extractReference(block) {
  // USCCB often places the scripture citation in a link.
  const linkedReference = pick(
    block,
    /<a[^>]*href="\/bible\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i
  );

  if (linkedReference) {
    const cleaned = clean(linkedReference);

    if (looksLikeCitation(cleaned)) {
      return cleaned;
    }
  }

  // Fallback: find citation-looking text anywhere in the block.
  const plain = clean(strip(block));
  return findCitation(plain);
}


// --------------------------------------------------
// Extract a short readable excerpt
// --------------------------------------------------

function extractExcerpt(block) {
  const paragraphs = [
    ...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)
  ];

  for (const match of paragraphs) {
    const text = clean(match[1]);

    if (!text) continue;
    if (looksLikeCitation(text)) continue;

    // Ignore obvious navigation / audio text
    if (/listen|audio|lectionary|read more/i.test(text)) continue;

    return text.length > 360
      ? text.slice(0, 360).trim() + "..."
      : text;
  }

  return "";
}


// --------------------------------------------------
// Date helpers
// --------------------------------------------------

function usccbToday() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);

  const mm = parts.find(p => p.type === "month").value;
  const dd = parts.find(p => p.type === "day").value;
  const yy = parts.find(p => p.type === "year").value;

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(now);

  return {
    mmddyy: `${mm}${dd}${yy}`,
    dateLabel
  };
}


// --------------------------------------------------
// Citation helpers
// --------------------------------------------------

function looksLikeCitation(text) {
  if (!text) return false;

  return /^[1-3]?\s*[A-Za-z]{2,15}\s+\d+/i.test(text.trim());
}


function findCitation(text) {
  const patterns = [
    /\b(?:1|2|3)?\s?(?:Gn|Ex|Lv|Nm|Dt|Jos|Jgs|Ru|1\s?Sm|2\s?Sm|1\s?Kgs|2\s?Kgs|1\s?Chr|2\s?Chr|Ezr|Neh|Tb|Jdt|Est|1\s?Mc|2\s?Mc|Jb|Ps|Prv|Eccl|Sg|Wis|Sir|Is|Jer|Lam|Bar|Ez|Dn|Hos|Jl|Am|Ob|Jon|Mi|Na|Hb|Zep|Hg|Zec|Mal)\s+\d+(?::\d+)?(?:-\d+)?/i,

    /\b(?:Mt|Mk|Lk|Jn|Acts|Rom|1\s?Cor|2\s?Cor|Gal|Eph|Phil|Col|1\s?Thes|2\s?Thes|1\s?Tm|2\s?Tm|Ti|Phlm|Heb|Jas|1\s?Pt|2\s?Pt|1\s?Jn|2\s?Jn|3\s?Jn|Jude|Rv)\s+\d+(?::\d+)?(?:-\d+)?/i
  ];

  for (const re of patterns) {
    const match = text.match(re);

    if (match) {
      return match[0].trim();
    }
  }

  return "";
}


// --------------------------------------------------
// General helpers
// --------------------------------------------------

function pick(text, re) {
  const match = re.exec(text);
  return match ? (match[1] || "") : "";
}


function strip(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}


function clean(value) {
  return strip(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&lsquo;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}


function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
