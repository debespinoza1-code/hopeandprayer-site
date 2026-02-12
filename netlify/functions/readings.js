exports.handler = async function () {
  try {
    // 1) Get the landing page just to find today's .cfm readings page
    const landingUrl = "https://bible.usccb.org/daily-bible-reading";

    const landingRes = await fetch(landingUrl, {
      headers: {
        "User-Agent": "HopeSiteBot/1.0",
        "Accept": "text/html",
      },
    });
    if (!landingRes.ok) return json(502, { error: "USCCB landing fetch failed" });
    const landingHtml = await landingRes.text();

    const dateLabel =
      clean(pick(landingHtml, /<h1[^>]*class="[^"]*daily-reading-date[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)) ||
      "Today";

    // Find the readings .cfm link (example: /bible/readings/021226.cfm)
    const cfmPath = pick(landingHtml, /href="(\/bible\/readings\/\d+\.cfm)"/i);
    if (!cfmPath) {
      // If USCCB changes markup again, we fail gracefully
      return json(200, {
        dateLabel,
        summary: "Today’s Catholic liturgy readings (NABRE).",
        items: [],
        note: "Could not locate today's readings page link.",
      });
    }

    // 2) Fetch the actual readings page (this has real citations + text)
    const readingsUrl = "https://bible.usccb.org" + cfmPath;
    const readingsRes = await fetch(readingsUrl, {
      headers: {
        "User-Agent": "HopeSiteBot/1.0",
        "Accept": "text/html",
      },
    });
    if (!readingsRes.ok) return json(502, { error: "USCCB readings page fetch failed" });
    const readingsHtml = await readingsRes.text();

    const kinds = ["Reading I", "Responsorial Psalm", "Gospel"];
    const items = [];

    for (const kind of kinds) {
      const block = extractSection(readingsHtml, kind);
      if (!block) continue;

      // Citation link: /bible/<book>/... (NOT /bible/readings/...)
      const reference = clean(
        pick(block, /<a[^>]*href="\/bible\/(?!readings\/)[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      );

      // Excerpt: first meaningful paragraph in the block (strip tags)
      const paraHtml = pick(block, /<p[^>]*>([\s\S]*?)<\/p>/i);
      const paraText = clean(strip(paraHtml));

      const excerpt = paraText
        ? paraText.slice(0, 280) + (paraText.length > 280 ? "…" : "")
        : "";

      if (reference || excerpt) {
        items.push({ kind, reference, excerpt });
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

function extractSection(html, kind) {
  // USCCB readings page typically uses h3 headings for sections
  // Match the heading containing the kind, then capture until next h3 (or end).
  const headingRe = new RegExp(
    `<h3[^>]*>[\\s\\S]*?${escapeRe(kind)}[\\s\\S]*?<\\/h3>`,
    "i"
  );
  const m = headingRe.exec(html);
  if (!m) return "";

  const start = m.index + m[0].length;
  const tail = html.slice(start);
  const next = tail.search(/<h3\b/i);
  return next >= 0 ? tail.slice(0, next) : tail.slice(0, 15000);
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
