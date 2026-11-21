const fs = require("fs");
const path = require("path");

const reflectionsDir = path.join("content", "reflections");
const todayPath = path.join("content", "today.json");
const indexPath = path.join(reflectionsDir, "index.json");
const sitemapPath = "sitemap.xml";

const files = fs
  .readdirSync(reflectionsDir)
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .sort()
  .reverse();

if (!files.length) {
  console.log("No reflection files found.");
  process.exit(0);
}

const reflections = files.map((file) => {
  const fullPath = path.join(reflectionsDir, file);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));

  const slug = file.replace(/\.json$/, "");

  return {
    ...data,
    slug,
    url: `/reflections/${slug}`
  };
});

const newest = reflections[0];

fs.writeFileSync(
  todayPath,
  JSON.stringify(
   {
  title: newest.title || "",
  date: newest.date || "",
  scripture: newest.scripture || "",
  theme: newest.theme || "",
  opening: newest.opening || "",
  prayer: newest.prayer || "",
  body: newest.body || ""
},
    null,
    2
  ) + "\n"
);

fs.writeFileSync(
  indexPath,
  JSON.stringify(reflections, null, 2) + "\n"
);

const sitemapUrls = reflections
  .map((item) => {
    const lastmod = item.date
      ? `\n    <lastmod>${item.date}</lastmod>`
      : "";

    return `  <url>
    <loc>https://hopeandprayer.org${item.url}</loc>${lastmod}
  </url>`;
  })
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://hopeandprayer.org/</loc>
  </url>
${sitemapUrls}
</urlset>
`;

fs.writeFileSync(sitemapPath, sitemap);

console.log(`Updated site using ${files.length} reflection(s).`);

// Generate search-engine-friendly HTML for each reflection
const templatePath = "index.html";
const htmlTemplate = fs.readFileSync(templatePath, "utf8");

reflections.forEach((item) => {
  const title = item.title || "Catholic Reflection";
  const description = (
    item.theme ||
    item.opening ||
    "Daily Catholic reflection on Scripture, prayer, and faith."
  ).replace(/\s+/g, " ").slice(0, 155);

  const url = `https://hopeandprayer.org${item.url}`;
  const outputDir = path.join(".", "reflections", item.slug);

  fs.mkdirSync(outputDir, { recursive: true });

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  let html = htmlTemplate;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(title)} | Hope & Prayer</title>`
  );

  html = html.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(description)}">`
  );

  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${url}">`
  );
const reflectionContent = `
  <article id="searchable-reflection">
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(item.opening || "")}</p>
    ${String(item.body || "")
      .split(/\n\s*\n/)
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join("\n")}
    <p><strong>Prayer:</strong> ${escapeHtml(item.prayer || "")}</p>
  </article>
`;

html = html.replace(
  '<div id="reflectionContainer">Loading reflection...</div>',
  `<div id="reflectionContainer">${reflectionContent}</div>`
);
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
});

console.log("Generated reflection HTML pages.");
