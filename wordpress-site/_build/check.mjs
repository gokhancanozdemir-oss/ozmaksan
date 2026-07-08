import fs from "node:fs";
const x = fs.readFileSync(new URL("../ozmaksan-wordpress.xml", import.meta.url), "utf8");
const c = (re) => (x.match(re) || []).length;
console.log("size", x.length);
console.log("items", c(/<item>/g));
console.log("canvasTpl", c(/tpl-ozmaksan/g));
console.log("assetRefs", c(/\/wp-content\/plugins\/ozmaksan-assets\//g));
console.log("urunlerLink", x.includes('href="/urunler/'));
console.log("productLink", x.includes('href="/urun-steamax/'));
console.log("homeLink", x.includes('href="/"'));
console.log("wpHtmlBlocks", c(/<!-- wp:html -->/g));
// naive XML well-formedness: balanced item tags
console.log("closeItems", c(/<\/item>/g));
