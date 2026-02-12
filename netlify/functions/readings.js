exports.handler = async function () {
  try {
    const url = "https://bible.usccb.org/daily-bible-reading";
    const htmlRes = await fetch(url, {
      headers: {
        "User-Agent": "HopeAndPrayer/1.0 (Netlify Function)",
        "Accept": "text/html",
      },
    });

    if (!htmlRes.ok) {
      return json(502, { error: "USCCB fetch failed", status: htmlRes.status });
    }

    const html = await htmlRes.text();

    const dateLabel =
      pickOne(html, /<h1[^>]*class="[^"]*daily-reading-date[^"]*"[^>]*>(.*?)<\/h1>/i) ||
      pickOne(html, /<h1[^>]*>(.*?)<\/h1>/i) ||
      "Today";

    const items = [];
    const blockRegex =
      /<(h2|h3)[^>]*>(Reading I|Reading II|Responsorial Psalm|Gospel|Alleluia|Sequence|Optional Memorial|Memorial|Saint[^<]*)<\/\1>[\s\S]*?(?=<(h2|h3)[^>]*>|<\/main>)/gi;

    let m;
    while ((m = blockRegex.exec(html)) !== null) {
      const kind = cleanText(stripTags(m[2]));
      const block = m[0];

      const reference =
        pickOne(block, /<a[^>]*href="\/bible\/[^"]*"[^>]*>(.*?)<\/a>/i) ||
        pickOne(block, /<strong[^>]*>([1-3]?\s?[A-Za-z][^<]{0,60}\d+[^<]{0,60})<\/strong>/i) ||
        "";

      const para = pickOne(block, /<p[^>]*>([\s\S]*?)<\/p>/i) || "";
      const excerptRaw = cleanText(stripTags(para));
      const excerpt = excerptRaw ? excerptRaw.slice(0, 220) + (excerptRaw.length > 220 ? "…" : "") : "";

      items.push({
        kind,
        reference: cleanText(stripTags(reference)),
        excerpt,
      });
    }

    return json(200, {
      dateLabel: cleanText(stripTags(dateLabel)),
      summary: "Today’s Catholic liturgy readings (NABRE).",
      items,
    });
  } catch (e) {
    return json(500, { error: "Unexpected error", detail: String(e) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

function pickOne(text, regex) {
  const m = regex.exec(text);
  return m ? (m[1] || "") : "";
}

function stripTags(s) {
  return String(s || "").replace(/<[^>]+>/g, "");
}

function cleanText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}
