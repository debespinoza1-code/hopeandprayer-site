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
