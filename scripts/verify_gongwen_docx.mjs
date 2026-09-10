#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";

function usage() {
  console.log("Usage: node verify_gongwen_docx.mjs --input file.docx [--profile ordinary|formal|letter|command|minutes] [--letterhead preprinted|digital] [--require-standard-fonts]");
}

function parseArgs(argv) {
  const args = {};
  const flags = new Set(["require-standard-fonts"]);
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const name = argv[i].slice(2);
    if (flags.has(name)) {
      args[name] = true;
      continue;
    }
    args[name] = argv[i + 1];
    i += 1;
  }
  return args;
}

function readPart(file, part, optional = false) {
  try { return execFileSync("unzip", ["-p", file, part], { encoding: "utf8" }); }
  catch (error) { if (optional) return ""; throw error; }
}

function paragraphs(xml) { return xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? []; }

const args = parseArgs(process.argv);
if (!args.input || !fs.existsSync(args.input)) { usage(); process.exit(2); }
const profile = args.profile ?? "ordinary";
if (!["ordinary", "formal", "letter", "command", "minutes"].includes(profile)) { console.error("Unsupported profile."); process.exit(2); }

const doc = readPart(args.input, "word/document.xml");
const styles = readPart(args.input, "word/styles.xml");
const footerOdd = readPart(args.input, "word/footerOdd.xml", true);
const footerEven = readPart(args.input, "word/footerEven.xml", true);
const footerCenter = readPart(args.input, "word/footerCenter.xml", true);
const requireStandardFonts = args["require-standard-fonts"] === true;
const checks = [];
function check(name, ok, detail) { checks.push({ name, ok, detail }); }

check("A4 page size", /<w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/.test(doc), "210 mm x 297 mm");
const expectedTopMargin = profile === "letter" ? "1701" : profile === "command" ? "1134" : "2098";
check("Page margins", new RegExp(`<w:pgMar[^>]*w:top="${expectedTopMargin}"[^>]*w:right="1474"[^>]*w:bottom="1984"[^>]*w:left="1588"`).test(doc), `top ${expectedTopMargin === "2098" ? 37 : expectedTopMargin === "1701" ? 30 : 20} mm, bottom 35, left 28, right 26 mm`);
check("Document grid", /<w:docGrid[^>]*w:linePitch="560"/.test(doc), "28 pt implementation grid");
const bodyFontStandard = /w:eastAsia="(?:仿宋|仿宋_GB2312|FangSong|FangSong_GB2312)"/.test(styles);
const bodyFontAvailable = bodyFontStandard || (!requireStandardFonts && /w:eastAsia="STFangsong"/.test(styles));
check("Default body font", bodyFontAvailable && /<w:sz w:val="32"/.test(styles), requireStandardFonts ? "3rd-size FangSong is required" : "3rd-size FangSong requested; STFangsong fallback is allowed unless strict mode is enabled");
check("Heading styles", [1, 2, 3, 4].every((level) => new RegExp(`w:styleId="Heading${level}"`).test(styles)), "Heading 1 through Heading 4 are defined");

const textOf = (xml) => xml.replace(/<[^>]+>/g, "");
const headingRules = [
  [/^[一二三四五六七八九十百]+、/, "Heading1", /(?:黑体|SimHei|Heiti SC|STHeiti)/],
  [/^（[一二三四五六七八九十百]+）/, "Heading2", /(?:楷体|楷体_GB2312|KaiTi|KaiTi_GB2312|Kaiti SC|STKaiti)/],
  [/^\d+[.．]/, "Heading3", /(?:仿宋|仿宋_GB2312|FangSong|FangSong_GB2312|STFangsong)/],
  [/^（\d+）/, "Heading4", /(?:仿宋|仿宋_GB2312|FangSong|FangSong_GB2312|STFangsong)/],
];
for (const [pattern, style, font] of headingRules) {
  const matches = paragraphs(doc).filter((p) => pattern.test(textOf(p).trim()));
  check(`${style} applied when present`, matches.every((p) => new RegExp(`w:pStyle w:val="${style}"`).test(p) && /w:firstLine="640"/.test(p) && font.test(p)), matches.length ? `${matches.length} matching paragraph(s)` : "not present in this document");
}

const titleParagraphs = paragraphs(doc).filter((p) => /w:pStyle w:val="GongwenTitle"/.test(p));
const titleFontStandard = titleParagraphs.every((p) => /w:eastAsia="(?:方正小标宋简体|方正小标宋_GBK|FZXiaoBiaoSong-B05S|FZXiaoBiaoSong-B13S)"/.test(p));
const titleFontAvailable = titleFontStandard || (!requireStandardFonts && titleParagraphs.every((p) => /w:eastAsia="Songti SC"/.test(p)));
check("Title style and font", titleFontAvailable, requireStandardFonts ? "small-standard-title font is required" : titleParagraphs.length ? `${titleParagraphs.length} title paragraph(s); Songti SC fallback is allowed unless strict mode is enabled` : "not present in this document");

if (profile === "ordinary") {
  check("No formal red-head drawing", !/w:color w:val="FF0000"/.test(doc), "ordinary output has no red head or red rule");
  check("Centered layout footer", /w:jc w:val="center"/.test(footerCenter) && /w:instr="PAGE"/.test(footerCenter), "ordinary output uses centered page number");
} else if (profile === "letter") {
  check("Letter first-page page number", !footerCenter && !footerOdd && !footerEven, "letter test output suppresses first-page page number");
} else {
  check("Odd/even page fields", /w:instr="PAGE"/.test(footerOdd) && /w:instr="PAGE"/.test(footerEven), "odd and even page footers exist");
  check("Odd/even page positions", /w:jc w:val="right"/.test(footerOdd) && /w:jc w:val="left"/.test(footerEven), "odd right and even left");
}
if (profile === "formal") {
  if (args.letterhead === "digital") {
    check("Digital red head", /w:color w:val="FF0000"/.test(doc), "digital formal output contains requested red elements");
    check("Red rule thickness", /height:0\.5mm/.test(doc), "header separator uses the recommended 0.35-0.5 mm range");
    check("Digital red-head agency position", /w:before="1984"/.test(doc), "agency mark starts 35 mm below the type-area top");
    check("Two blank lines below red rule", titleParagraphs.some((p) => /w:before="1120"/.test(p)), "title paragraph reserves two 28-point grid lines below the red rule");
  } else {
    check("Preprinted letterhead reserve", /w:before="\d{4,}"/.test(doc), "first-page top reserve is present");
    check("No red drawing for preprinted letterhead", !/w:color w:val="FF0000"/.test(doc), "preprinted mode does not redraw red letterhead or rule");
    check("Title spacing below physical red rule", titleParagraphs.some((p) => /w:before="1120"/.test(p)), "title paragraph reserves two 28-point grid lines below the printed red rule");
  }
}
if (profile === "letter") {
  check("Letter title spacing", titleParagraphs.some((p) => /w:before="1120"/.test(p)), "title paragraph reserves two 28-point grid lines below the red rule");
}

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}: ${item.detail}`);
const failed = checks.filter((item) => !item.ok);
if (failed.length) { console.error(`Verification failed: ${failed.length} item(s).`); process.exit(1); }
console.log(`Verification passed (${profile} profile): ${checks.length} item(s).`);
