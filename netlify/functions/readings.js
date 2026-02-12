exports.handler = async function () {
  try {
    // USCCB provides a JSON feed used by their site
    const url = "https://bible.usccb.org/api/daily-readings";

    const res = await fetch(url);
    if (!res.ok) {
      return json(502, { error: "USCCB API failed" });
    }

    const data = await res.json();

    const items = [];

    if (data.readings) {
      data.readings.forEach(r => {
        items.push({
          kind: r.type,          // Reading I, Responsorial Psalm, Gospel
          reference: r.citation, // Scripture reference
          excerpt: r.text.slice(0, 240) + "…"
        });
      });
    }

    return json(200, {
      dateLabel: data.date || "Today",
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
