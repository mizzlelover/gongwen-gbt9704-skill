#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";

function usage() {
  console.log("Usage: node verify_gongwen_docx.mjs --input file.docx [--profile layout|standard-pages]");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function readPart(file, part, optional = false) {
  try {
    return execFileSync("unzip", ["-p", file, part], { encoding: "utf8" });
  } catch (error) {
    if (optional) return "";
    throw error;
  }
}

function paragraphsForText(xml, pattern) {
  const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
  return paragraphs.filter((paragraph) => pattern.test(paragraph.replace(/<[^>]+>/g, "")));
}

const args = parseArgs(process.argv);
if (!args.input || !fs.existsSync(args.input)) {
  usage();
  process.exit(2);
}

const profile = args.profile ?? "layout";
if (!["layout", "standard-pages"].includes(profile)) {
  console.error("Unsupported profile. Use layout or standard-pages.");
  process.exit(2);
}
const doc = readPart(args.input, "word/document.xml");
const styles = readPart(args.input, "word/styles.xml");
const h1 = paragraphsForText(doc, /^[一二三四五六七八九十]+、/);
const h2 = paragraphsForText(doc, /^（[一二三四五六七八九十]+）/);
const h3 = paragraphsForText(doc, /(?:^|\s)\d+[.．]/);
const h4 = paragraphsForText(doc, /（\d+）/);
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

check("A4 page size", /<w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/.test(doc), "210 mm x 297 mm");
check("Page margins", /<w:pgMar[^>]*w:top="2098"[^>]*w:right="1474"[^>]*w:bottom="1984"[^>]*w:left="1588"/.test(doc), "top 37, bottom 35, left 28, right 26 mm");
check("Document grid", /<w:docGrid[^>]*w:linePitch="560"/.test(doc), "28 pt grid");
const fangSong = /w:eastAsia="(?:仿宋|仿宋_GB2312|FangSong|FangSong_GB2312|STFangsong)"/;
const xiaoBiaoSong = /w:eastAsia="(?:方正小标宋简体|方正小标宋_GBK|FZXiaoBiaoSong-B05S)"/;
const heiTi = /w:eastAsia="(?:黑体|SimHei|Heiti SC|STHeiti)"/;
const kaiTi = /w:eastAsia="(?:楷体|楷体_GB2312|KaiTi|KaiTi_GB2312|Kaiti SC|STKaiti)"/;
check("Default body font", fangSong.test(styles) && /<w:sz w:val="32"/.test(styles), "FangSong-compatible 16 pt");
const allMatch = (paragraphs, matcher) => paragraphs.length > 0 && paragraphs.every(matcher);
check("Title font", xiaoBiaoSong.test(doc) && /<w:sz w:val="44"/.test(doc), "Xiaobiaosong 22 pt requested");
check("Level-1 headings", allMatch(h1, (paragraph) => /w:firstLine="640"/.test(paragraph) && heiTi.test(paragraph) && /w:sz w:val="32"/.test(paragraph)), "every 一、 heading is Heiti-compatible 16 pt with two-character indent");
check("Level-2 headings", allMatch(h2, (paragraph) => /w:firstLine="640"/.test(paragraph) && kaiTi.test(paragraph) && /w:sz w:val="32"/.test(paragraph)), "every （一） heading is Kaiti-compatible 16 pt with two-character indent");
check("Level-3 headings", allMatch(h3, (paragraph) => /w:firstLine="640"/.test(paragraph) && fangSong.test(paragraph) && /w:sz w:val="32"/.test(paragraph)), "every 1. heading is FangSong-compatible 16 pt with two-character indent");
check("Level-4 headings", allMatch(h4, (paragraph) => /w:firstLine="640"/.test(paragraph) && fangSong.test(paragraph) && /w:sz w:val="32"/.test(paragraph)), "every （1） heading is FangSong-compatible 16 pt with two-character indent");
if (profile === "standard-pages") {
  const oddFooter = readPart(args.input, "word/footerOdd.xml", true);
  const evenFooter = readPart(args.input, "word/footerEven.xml", true);
  check("Odd-page footer", /w:jc w:val="right"/.test(oddFooter) && /w:instr="PAGE"/.test(oddFooter) && /w:ascii="(?:宋体|SimSun)"/.test(oddFooter), "right-aligned page number in Songti-compatible font");
  check("Even-page footer", /w:jc w:val="left"/.test(evenFooter) && /w:instr="PAGE"/.test(evenFooter) && /w:ascii="(?:宋体|SimSun)"/.test(evenFooter), "left-aligned page number in Songti-compatible font");
} else {
  const footer = readPart(args.input, "word/footerCenter.xml", true);
  check("Layout page footer", /w:jc w:val="center"/.test(footer) && /w:instr="PAGE"/.test(footer) && /w:ascii="(?:宋体|SimSun)"/.test(footer), "centered page number in Songti-compatible font");
}

for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}: ${item.detail}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length) {
  console.error(`Verification failed: ${failed.length} item(s).`);
  process.exit(1);
}

console.log(`Verification passed (${profile} profile): ${checks.length} item(s).`);
