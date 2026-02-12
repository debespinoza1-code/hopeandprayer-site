exports.handler = async function () {
  try {
    const url = "https://bible.usccb.org/daily-bible-reading";

    const res = await fetch(url, {
      headers: {
        "User-Agent": "HopeSiteBot/1.0",
        "Accept": "text/html"
      }
    });

    if (!res.ok) return json(502, { error: "USCCB fetch failed", status: res.status });

    const html = await res.text();

    // Date label (best-effort)
    const dateLabel =
      pick(html, /<h1[^>]*class="[^"]*daily-reading-date[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
      pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
      "Today";

    const items = [];
    const kinds = ["Reading I", "Responsorial Psalm", "Gospel"];

    for (const kind of kinds) {
      const block = extractSection(html, kind);
      if (!block) continue;

      // Citation: first "readings/####.cfm" or "/bible/" link text in the block
      const reference =
        clean(pick(block, /<a[^>]*href="[^"]*readings\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i)) ||
        clean(pick(block, /<a[^>]*href="\/bible\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i)) ||
        "";

      // Excerpt: first paragraph text in the block
      const p = pick(block, /<p[^>]*>([\s\S]*?)<\/p>/i);
      const excerptRaw = clean(strip(p));
      const excerpt = excerptRaw
        ? excerptRaw.slice(0, 280) + (excerptRaw.length > 280 ? "…" : "")
        : "";

      // Only push if something meaningful exists
      if (reference || excerpt) items.push({ kind, reference, excerpt });
    }

    return json(200, {
      dateLabel: clean(dateLabel) || "Today",
      summary: "Today’s Catholic liturgy readings (NABRE).",
      items
    });
  } catch (e) {
    return json(500, { error: "Unexpected error", detail: String(e) });
  }
};

function extractSection(html, kind) {
  // Find the heading for the section
  // USCCB sometimes uses h2/h3 with nested spans, so match loosely.
  const headingRe = new RegExp(
    `<h2[^>]*>[\\s\\S]*?${escapeRe(kind)}[\\s\\S]*?<\\/h2>|<h3[^>]*>[\\s\\S]*?${escapeRe(kind)}[\\s\\S]*?<\\/h3>`,
    "i"
  );

  const m = headingRe.exec(html);
  if (!m) return "";

  const start = m.index + m[0].length;

  // Take a chunk after heading, stopping at the next h2/h3 (next section)
  const tail = html.slice(start);
  const nextHeading = tail.search(/<(h2|h3)\b/i);
  const chunk = nextHeading >= 0 ? tail.slice(0, nextHeading) : tail.slice(0, 12000);

  return chunk;
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj)
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
