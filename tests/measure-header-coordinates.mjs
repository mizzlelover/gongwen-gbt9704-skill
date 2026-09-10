#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [withFieldsPdf, withoutFieldsPdf, agencyName = "示例单位文件", copyNo = "000007"] = process.argv.slice(2);
if (!withFieldsPdf || !withoutFieldsPdf || !fs.existsSync(withFieldsPdf) || !fs.existsSync(withoutFieldsPdf)) {
  console.error("Usage: measure-header-coordinates.mjs WITH_FIELDS.pdf WITHOUT_FIELDS.pdf [agency-name] [copy-number]");
  process.exit(2);
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)));
}

function words(pdf) {
  const html = execFileSync("pdftotext", ["-f", "1", "-l", "1", "-bbox-layout", pdf, "-"], { encoding: "utf8" });
  return [...html.matchAll(/<word\s+[^>]*yMin="([0-9.]+)"[^>]*>([\s\S]*?)<\/word>/g)].map((match) => ({
    yMinPt: Number(match[1]),
    text: decodeHtml(match[2]),
  }));
}

function findWord(pdfWords, expected) {
  const word = pdfWords.find(({ text }) => text.includes(expected));
  if (!word) throw new Error(`${expected} was not found on the first page`);
  return word;
}

function mm(word) {
  return word.yMinPt * 25.4 / 72;
}

const withFields = words(withFieldsPdf);
const withoutFields = words(withoutFieldsPdf);
const copy = findWord(withFields, copyNo);
const agencyWithFields = findWord(withFields, agencyName);
const agencyWithoutFields = findWord(withoutFields, agencyName);
const copyMm = mm(copy);
const agencyWithFieldsMm = mm(agencyWithFields);
const agencyWithoutFieldsMm = mm(agencyWithoutFields);
const agencyDeltaMm = Math.abs(agencyWithFieldsMm - agencyWithoutFieldsMm);

// PDF glyph tops sit slightly below or above the frame edge depending on the
// installed font. These ranges still independently verify the paper positions:
// first type-area line at 37 mm, agency mark 35 mm below it (72 mm page top).
if (copyMm < 37 || copyMm > 45) throw new Error(`copy number glyph is at ${copyMm.toFixed(2)} mm; expected first type-area line near 37 mm`);
if (agencyWithFieldsMm < 68 || agencyWithFieldsMm > 77) throw new Error(`agency mark glyph is at ${agencyWithFieldsMm.toFixed(2)} mm; expected 35 mm below the 37 mm type-area top`);
if (agencyDeltaMm > 0.8) throw new Error(`optional left-corner fields moved the agency mark by ${agencyDeltaMm.toFixed(2)} mm`);

console.log(`Header coordinate measurement passed: copy=${copyMm.toFixed(2)}mm, agency=${agencyWithFieldsMm.toFixed(2)}mm, no-fields-agency=${agencyWithoutFieldsMm.toFixed(2)}mm, delta=${agencyDeltaMm.toFixed(2)}mm`);
