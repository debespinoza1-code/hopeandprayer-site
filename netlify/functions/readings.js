exports.handler = async function () {
  try {
    const url = "https://bible.usccb.org/daily-bible-reading";

    const res = await fetch(url, {
      headers: {
        "User-Agent": "HopeSiteBot/1.0",
        "Accept": "text/html"
      }
    });

    if (!res.ok) {
      return json(502, { error: "USCCB fetch failed" });
    }

    const html = await res.text();

    // Extract date
    const dateMatch = html.match(/<h1[^>]*class="daily-reading-date"[^>]*>(.*?)<\/h1>/i);
    const dateLabel = dateMatch ? clean(dateMatch[1]) : "Today";

    const items = [];

    // Match each reading block
    const sectionRegex =
      /<h3[^>]*>(Reading I|Responsorial Psalm|Gospel)<\/h3>[\s\S]*?<div class="bible-reading">([\s\S]*?)<\/div>/gi;

    let match;
    while ((match = sectionRegex.exec(html)) !== null) {
      const kind = clean(match[1]);

      const block = match[2];

      const refMatch = block.match(/<a[^>]*>(.*?)<\/a>/i);
      const reference = refMatch ? clean(refMatch[1]) : "";

      const textMatch = block.match(/<p[^>]*>(.*?)<\/p>/i);
      const excerptRaw = textMatch ? clean(strip(textMatch[1])) : "";
      const excerpt = excerptRaw
        ? excerptRaw.slice(0, 260) + (excerptRaw.length > 260 ? "…" : "")
        : "";

      items.push({ kind, reference, excerpt });
    }

    return json(200, {
      dateLabel,
      summary: "Today’s Catholic liturgy readings (NABRE).",
      items
    });

  } catch (e) {
    return json(500, { error: "Unexpected error", detail: String(e) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  };
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
