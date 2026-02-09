// netlify/functions/readings.js
// USCCB Daily Readings (NABRE) RSS -> JSON

exports.handler = async function () {
  try {
    const rssUrl = "https://bible.usccb.org/readings.rss";
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "HopeSite/1.0" }
    });

    if (!res.ok) {
      return json({ error: `USCCB RSS fetch failed: ${res.status}` }, 502);
    }

    const xml = await res.text();

    const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map(m => m[0]);
    const parsed = items.slice(0, 5).map(itemXml => ({
      title: decodeHtml(getTag(itemXml, "title")),
      link: decodeHtml(getTag(itemXml, "link")),
      pubDate: decodeHtml(getTag(itemXml, "pubDate")),
      descriptionHtml: decodeHtml(getTag(itemXml, "description")),
    }));

    // Include a clean text version too
    const withText = parsed.map(x => ({
      ...x,
      descriptionText: stripHtml(x.descriptionHtml).replace(/\s+/g, " ").trim()
    }));

    return json({ source: "USCCB Daily Readings RSS (NABRE)", items: withText }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

function json(obj, statusCode) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=900"
    },
    body: JSON.stringify(obj)
  };
}

function getTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : "";
}

function stripHtml(html) {
  return html
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
