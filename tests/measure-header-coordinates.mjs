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
  return [...html.matchAll(/<word\s+[^>]*xMin="([0-9.]+)"[^>]*yMin="([0-9.]+)"[^>]*xMax="([0-9.]+)"[^>]*yMax="([0-9.]+)"[^>]*>([\s\S]*?)<\/word>/g)].map((match) => ({
    xMinPt: Number(match[1]),
    yMinPt: Number(match[2]),
    xMaxPt: Number(match[3]),
    yMaxPt: Number(match[4]),
    text: decodeHtml(match[5]),
  }));
}

function findText(pdfWords, expected) {
  // Poppler can split a Chinese phrase into adjacent <word> elements depending
  // on the installed font. Rebuild visual rows before matching so the
  // measurement is independent of that tokenization choice.
  const rows = [];
  for (const word of [...pdfWords].sort((left, right) => left.yMinPt - right.yMinPt || left.xMinPt - right.xMinPt)) {
    const row = rows.find(({ yMinPt, yMaxPt }) => word.yMinPt <= yMaxPt + 1.5 && word.yMaxPt >= yMinPt - 1.5);
    if (row) {
      row.words.push(word);
      row.yMinPt = Math.min(row.yMinPt, word.yMinPt);
      row.yMaxPt = Math.max(row.yMaxPt, word.yMaxPt);
    } else rows.push({ yMinPt: word.yMinPt, yMaxPt: word.yMaxPt, words: [word] });
  }
  for (const row of rows) {
    const ordered = row.words.sort((left, right) => left.xMinPt - right.xMinPt);
    const text = ordered.map(({ text }) => text).join("");
    const start = text.indexOf(expected);
    if (start < 0) continue;
    const matchingWords = [];
    let offset = 0;
    for (const word of ordered) {
      const end = offset + word.text.length;
      if (end > start && offset < start + expected.length) matchingWords.push(word);
      offset = end;
    }
    return {
      yMinPt: Math.min(...matchingWords.map(({ yMinPt }) => yMinPt)),
    };
  }
  throw new Error(`${expected} was not found on the first page`);
}

function mm(word) {
  return word.yMinPt * 25.4 / 72;
}

const withFields = words(withFieldsPdf);
const withoutFields = words(withoutFieldsPdf);
const copy = findText(withFields, copyNo);
const agencyWithFields = findText(withFields, agencyName);
const agencyWithoutFields = findText(withoutFields, agencyName);
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
