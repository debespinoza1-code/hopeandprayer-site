exports.handler = async function () {
  try {
    const url = "https://bible.usccb.org/daily-bible-reading";

    const res = await fetch(url, {
      headers: {
        "User-Agent": "HopeSiteBot/1.0",
        "Accept": "text/html"
      }
    });

    if (!res.ok) return json(502, { error: "USCCB fetch failed" });

    const html = await res.text();

    const dateLabel =
      pick(html, /<h1[^>]*class="[^"]*daily-reading-date[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
      "Today";

    const kinds = ["Reading I", "Responsorial Psalm", "Gospel"];
    const items = [];

    for (const kind of kinds) {
      const block = extractSection(html, kind);
      if (!block) continue;

      // scripture reference = first /bible/ link inside block
      const reference = clean(
        pick(block, /<a[^>]*href="\/bible\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      );

      // scripture excerpt = first real paragraph after reference
      const paragraph = clean(
        strip(pick(block, /<p[^>]*>([\s\S]*?)<\/p>/i))
      );

      if (reference || paragraph) {
        items.push({
          kind,
          reference,
          excerpt: paragraph.slice(0, 260) + (paragraph.length > 260 ? "…" : "")
        });
      }
    }

    return json(200, {
      dateLabel: clean(dateLabel),
      summary: "Today’s Catholic liturgy readings (NABRE).",
      items
    });

  } catch (e) {
    return json(500, { error: "Unexpected error", detail: String(e) });
  }
};

function extractSection(html, kind) {
  const headingRe = new RegExp(
    `<h2[^>]*>[\\s\\S]*?${escapeRe(kind)}[\\s\\S]*?<\\/h2>|<h3[^>]*>[\\s\\S]*?${escapeRe(kind)}[\\s\\S]*?<\\/h3>`,
    "i"
  );

  const m = headingRe.exec(html);
  if (!m) return "";

  const start = m.index + m[0].length;
  const tail = html.slice(start);
  const next = tail.search(/<(h2|h3)\b/i);
  return next >= 0 ? tail.slice(0, next) : tail.slice(0, 12000);
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
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
