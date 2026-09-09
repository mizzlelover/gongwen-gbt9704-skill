#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = { top: 2098, bottom: 1984, left: 1588, right: 1474 };
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right;
const FIRST_LINE_INDENT = 640;

function installedFontFamilies() {
  try {
    return new Set(
      execFileSync("fc-list", ["-f", "%{family}\n"], { encoding: "utf8" })
        .split(/\r?\n/)
        .flatMap((line) => line.split(","))
        .map((name) => name.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

const INSTALLED_FONTS = installedFontFamilies();
function preferredFont(candidates) {
  return candidates.find((font) => INSTALLED_FONTS.has(font)) ?? candidates[0];
}

const FONT = {
  title: { eastAsia: preferredFont(["方正小标宋简体", "方正小标宋_GBK", "FZXiaoBiaoSong-B05S"]), ascii: "Times New Roman", cs: "Times New Roman" },
  subtitle: { eastAsia: preferredFont(["仿宋", "仿宋_GB2312", "STFangsong"]), ascii: "Times New Roman", cs: "Times New Roman" },
  body: { eastAsia: preferredFont(["仿宋", "仿宋_GB2312", "STFangsong"]), ascii: "Times New Roman", cs: "Times New Roman" },
  h1: { eastAsia: preferredFont(["黑体", "SimHei", "Heiti SC", "STHeiti"]), ascii: "Times New Roman", cs: "Times New Roman" },
  h2: { eastAsia: preferredFont(["楷体", "楷体_GB2312", "KaiTi", "Kaiti SC", "STKaiti"]), ascii: "Times New Roman", cs: "Times New Roman" },
  song: { eastAsia: preferredFont(["宋体", "SimSun"]), ascii: "宋体", cs: "宋体" },
};

function usage() {
  console.log(`Usage:
  node generate_gongwen_docx.mjs --input source.md --output out.docx [--org 发文机关] [--doc-no 发文字号] [--title 标题] [--subtitle 副标题] [--to 主送机关] [--sender 落款] [--date 日期] [--page-number center|standard|none]

Notes:
  - Converts Markdown to a GB/T 9704-2012 page-layout DOCX.
  - Generates a DOCX from the supplied content and formatting fields. Its default page number is centered; use standard for odd/even page-number placement or none to suppress it.
  - --org and --doc-no are printed exactly as supplied. The tool formats document content; it does not infer missing information or decide the document's use.
  - Supports headings, paragraphs, ordered/unordered lines, and pipe tables.
  - No npm dependencies; requires zip in PATH.`);
}

function parseArgs(argv) {
  const args = {};
  const flags = new Set(["help", "no-page-number", "no-page-numbers"]);
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    if (flags.has(name)) {
      args[name] = true;
      continue;
    }
    args[name] = argv[i + 1];
    i += 1;
  }
  return args;
}

function esc(value) {
  return String(value ?? "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fontAttrs(opts = {}) {
  const preset = opts.fontPreset ? FONT[opts.fontPreset] : null;
  const eastAsia = opts.eastAsia ?? opts.font ?? preset?.eastAsia ?? FONT.body.eastAsia;
  const ascii = opts.ascii ?? preset?.ascii ?? FONT.body.ascii;
  const hAnsi = opts.hAnsi ?? ascii;
  const cs = opts.cs ?? preset?.cs ?? ascii;
  return `w:ascii="${attr(ascii)}" w:hAnsi="${attr(hAnsi)}" w:eastAsia="${attr(eastAsia)}" w:cs="${attr(cs)}" w:hint="eastAsia"`;
}

function run(text, opts = {}) {
  const size = opts.size ?? "32";
  const bold = opts.bold ? "<w:b/>" : "";
  const color = opts.color ?? "000000";
  return `<w:r><w:rPr><w:rFonts ${fontAttrs(opts)}/>${bold}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function paragraph(text, opts = {}) {
  const alignValue = opts.align === undefined ? "both" : opts.align;
  const align = alignValue ? `<w:jc w:val="${alignValue}"/>` : "";
  const indAttrs = [];
  if (opts.indent !== false) indAttrs.push(`w:firstLine="${opts.firstLine ?? FIRST_LINE_INDENT}"`);
  if (opts.left) indAttrs.push(`w:left="${opts.left}"`);
  if (opts.right) indAttrs.push(`w:right="${opts.right}"`);
  const indent = indAttrs.length ? `<w:ind ${indAttrs.join(" ")}/>` : "";
  const keepNext = opts.keepNext ? "<w:keepNext/>" : "";
  const before = opts.before ?? "0";
  const after = opts.after ?? "0";
  const pPr = `<w:pPr>${keepNext}${align}${indent}<w:spacing w:before="${before}" w:after="${after}" w:line="560" w:lineRule="exact"/><w:adjustRightInd w:val="true"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr>`;
  return `<w:p>${pPr}${run(text, opts)}</w:p>`;
}

function titleParagraph(text) {
  return paragraph(text, {
    align: "center",
    indent: false,
    fontPreset: "title",
    size: "44",
    before: "0",
    after: "560",
  });
}

function agencyMarkParagraph(text) {
  return paragraph(text, {
    align: "center",
    indent: false,
    fontPreset: "title",
    size: "56",
    color: "FF0000",
    after: "280",
  });
}

function documentNumberParagraph(text) {
  return paragraph(text, {
    align: "left",
    indent: false,
    fontPreset: "body",
    size: "32",
    after: "160",
  });
}

function subtitleParagraph(text) {
  return paragraph(text, {
    align: "center",
    indent: false,
    fontPreset: "subtitle",
    size: "32",
    after: "280",
  });
}

function mainSendParagraph(text) {
  return paragraph(text, {
    align: "left",
    indent: false,
    fontPreset: "body",
    size: "32",
  });
}

function h1(text) {
  return paragraph(text, {
    align: "left",
    fontPreset: "h1",
    size: "32",
    keepNext: true,
    before: "160",
    after: "0",
  });
}

function h2(text) {
  return paragraph(text, {
    align: "left",
    fontPreset: "h2",
    size: "32",
    keepNext: true,
    before: "80",
    after: "0",
  });
}

function h3(text) {
  return paragraph(text, {
    align: "left",
    fontPreset: "body",
    size: "32",
    keepNext: true,
    before: "40",
    after: "0",
  });
}

function h4(text) {
  return paragraph(text, {
    align: "left",
    fontPreset: "body",
    size: "32",
    keepNext: true,
    before: "0",
    after: "0",
  });
}

function right(text) {
  return paragraph(text, { align: "right", indent: false, right: FIRST_LINE_INDENT });
}

function emptyLine() {
  return `<w:p><w:pPr><w:spacing w:line="560" w:lineRule="exact"/></w:pPr></w:p>`;
}

function tableXml(headers, rows) {
  const colCount = headers.length;
  const colWidth = Math.floor(CONTENT_W / colCount);
  const grid = Array.from({ length: colCount }, () => `<w:gridCol w:w="${colWidth}"/>`).join("");
  const tr = (cells, header = false) => {
    const trPr = header ? "<w:trPr><w:tblHeader/></w:trPr>" : "";
    return `<w:tr>${trPr}${cells.map((cell) => tableCell(cell, colWidth, header)).join("")}</w:tr>`;
  };
  return `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${tr(headers, true)}${rows.map((row) => tr(row)).join("")}</w:tbl>`;
}

function tableCell(text, width, header) {
  const shade = header ? '<w:shd w:val="clear" w:color="auto" w:fill="EDEDED"/>' : "";
  const props = `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shade}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>`;
  const pPr = '<w:pPr><w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/><w:jc w:val="left"/></w:pPr>';
  const r = run(
    text,
    header
      ? { fontPreset: "h1", size: "32" }
      : { size: "32" },
  );
  return `<w:tc>${props}<w:p>${pPr}${r}</w:p></w:tc>`;
}

function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function parseMarkdown(md) {
  const lines = stripFrontmatter(md).split(/\r?\n/);
  const blocks = [];
  let para = [];
  let i = 0;
  const flush = () => {
    const text = para.join("").trim();
    if (text) blocks.push({ type: "paragraph", text });
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      i += 1;
      continue;
    }
    if (/^\|.+\|$/.test(trimmed)) {
      flush();
      const tableLines = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      const rows = tableLines
        .filter((l) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(l))
        .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      if (rows.length > 0) blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      continue;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flush();
      blocks.push({ type: "paragraph", text: bullet[1].trim() });
      i += 1;
      continue;
    }
    const ordered = trimmed.match(/^(\d+[.．、])\s*(.+)$/);
    if (ordered) {
      flush();
      blocks.push({ type: "paragraph", text: `${ordered[1]} ${ordered[2].trim()}` });
      i += 1;
      continue;
    }
    para.push(trimmed);
    i += 1;
  }
  flush();
  return blocks;
}

function normalizeSignatureText(text) {
  return String(text ?? "").replace(/\s+/g, "");
}

function isMatchingParagraph(block, text) {
  return (
    block?.type === "paragraph" &&
    normalizeSignatureText(block.text) === normalizeSignatureText(text)
  );
}

function isChineseDateParagraph(block) {
  return (
    block?.type === "paragraph" &&
    /^\d{4}年\d{1,2}月\d{1,2}日$/.test(normalizeSignatureText(block.text))
  );
}

function stripTrailingMatchingSignature(blocks, args) {
  if (args.date && (isMatchingParagraph(blocks.at(-1), args.date) || isChineseDateParagraph(blocks.at(-1)))) {
    blocks.pop();
  }
  if (args.sender && isMatchingParagraph(blocks.at(-1), args.sender)) {
    blocks.pop();
  }
}

function isFirstLayerHeadingText(text) {
  return /^[一二三四五六七八九十百]+、/.test(String(text ?? "").trim());
}

function isSecondLayerHeadingText(text) {
  return /^（[一二三四五六七八九十百]+）/.test(String(text ?? "").trim());
}

function isThirdLayerHeadingText(text) {
  return /^\d+[.．]/.test(String(text ?? "").trim());
}

function isFourthLayerHeadingText(text) {
  return /^（\d+）/.test(String(text ?? "").trim());
}

function looksLikeMainSend(text) {
  const compact = String(text ?? "").replace(/\s+/g, "");
  if (!/[:：]$/.test(compact) || compact.length > 60) return false;
  if (/[。！？；;]/.test(compact)) return false;
  return /(各|贵|省|市|县|区|镇|乡|机关|单位|公司|部门|委员会|办公室|厅|局|处|中心|领导|集团|党委|党总支|党支部)/.test(compact.slice(0, -1));
}

function renderHeading(block) {
  if (isFirstLayerHeadingText(block.text)) return h1(block.text);
  if (isSecondLayerHeadingText(block.text)) return h2(block.text);
  if (isThirdLayerHeadingText(block.text)) return h3(block.text);
  if (isFourthLayerHeadingText(block.text)) return h4(block.text);
  if (block.level <= 2) return h1(block.text);
  if (block.level === 3) return h2(block.text);
  if (block.level === 4) return h3(block.text);
  return h4(block.text);
}

function renderParagraph(block) {
  if (isFirstLayerHeadingText(block.text)) return h1(block.text);
  if (isSecondLayerHeadingText(block.text)) return h2(block.text);
  return paragraph(block.text);
}

function buildDocument(blocks, args) {
  let title = args.title;
  const pageNumberMode = args["no-page-number"] || args["no-page-numbers"]
    ? "none"
    : ["center", "standard", "none"].includes(args["page-number"])
      ? args["page-number"]
      : "center";
  const body = [];
  const sourceBlocks = [...blocks];
  if (!title && sourceBlocks[0]?.type === "heading") {
    title = sourceBlocks.shift().text;
  }
  if (title && sourceBlocks[0]?.type === "heading" && sourceBlocks[0].text.trim() === title.trim()) {
    sourceBlocks.shift();
  }
  stripTrailingMatchingSignature(sourceBlocks, args);
  let mainSend = args.to;
  if (mainSend && isMatchingParagraph(sourceBlocks[0], mainSend)) sourceBlocks.shift();
  if (!mainSend && sourceBlocks[0]?.type === "paragraph" && looksLikeMainSend(sourceBlocks[0].text)) {
    mainSend = sourceBlocks.shift().text;
  }
  if (args.org) body.push(agencyMarkParagraph(args.org));
  if (args["doc-no"]) body.push(documentNumberParagraph(args["doc-no"]));
  if (title) body.push(titleParagraph(title));
  if (args.subtitle) body.push(subtitleParagraph(args.subtitle));
  if (mainSend) body.push(mainSendParagraph(mainSend));

  for (const block of sourceBlocks) {
    if (block.type === "heading") {
      body.push(renderHeading(block));
      continue;
    }
    if (block.type === "table") {
      body.push(tableXml(block.headers, block.rows));
      body.push(emptyLine());
      continue;
    }
    body.push(renderParagraph(block));
  }
  if (args.sender || args.date) {
    body.push(emptyLine());
    if (args.sender) body.push(right(args.sender));
    if (args.date) body.push(right(args.date));
  }
  const footerRefs = pageNumberMode === "standard"
    ? '<w:footerReference w:type="default" r:id="rIdFooterOdd"/><w:footerReference w:type="even" r:id="rIdFooterEven"/>'
    : pageNumberMode === "center"
      ? '<w:footerReference w:type="default" r:id="rIdFooterCenter"/>'
      : "";
  body.push(`<w:sectPr>${footerRefs}<w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/><w:pgMar w:top="${MARGIN.top}" w:right="${MARGIN.right}" w:bottom="${MARGIN.bottom}" w:left="${MARGIN.left}" w:header="720" w:footer="1588" w:gutter="0"/><w:docGrid w:type="lines" w:linePitch="560"/></w:sectPr>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join("")}</w:body></w:document>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts ${fontAttrs({ fontPreset: "body" })}/><w:color w:val="000000"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/><w:adjustRightInd w:val="true"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts ${fontAttrs({ fontPreset: "body" })}/><w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:style></w:styles>`;
}

function fontDef(name, altName, family = "roman", charset = "86") {
  const alt = altName ? `<w:altName w:val="${attr(altName)}"/>` : "";
  return `<w:font w:name="${attr(name)}">${alt}<w:charset w:val="${charset}"/><w:family w:val="${family}"/><w:pitch w:val="variable"/></w:font>`;
}

function fontTableXml() {
  const fonts = [
    fontDef("方正小标宋简体", "Songti SC"),
    fontDef("方正小标宋_GBK", "Songti SC"),
    fontDef("FZXiaoBiaoSong-B05S", "方正小标宋简体"),
    fontDef("FZXiaoBiaoSong-B13S", "方正小标宋_GBK"),
    fontDef("华文中宋", "STZhongsong"),
    fontDef("STZhongsong", "华文中宋"),
    fontDef("仿宋", "STFangsong"),
    fontDef("仿宋_GB2312", "STFangsong"),
    fontDef("FangSong", "仿宋"),
    fontDef("FangSong_GB2312", "仿宋_GB2312"),
    fontDef("STFangsong", "仿宋"),
    fontDef("黑体", "Heiti SC", "swiss"),
    fontDef("SimHei", "黑体", "swiss"),
    fontDef("Heiti SC", "黑体", "swiss"),
    fontDef("楷体", "Kaiti SC"),
    fontDef("楷体_GB2312", "Kaiti SC"),
    fontDef("KaiTi", "楷体"),
    fontDef("KaiTi_GB2312", "楷体_GB2312"),
    fontDef("Kaiti SC", "楷体"),
    fontDef("宋体", "Songti SC"),
    fontDef("SimSun", "宋体"),
    fontDef("Songti SC", "宋体"),
    fontDef("Times New Roman", "", "roman", "00"),
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${fonts}</w:fonts>`;
}

function footerXml(align = "center") {
  const pageRunProps = `<w:rPr><w:rFonts ${fontAttrs({ fontPreset: "song" })}/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr>`;
  const sideIndent = align === "right"
    ? '<w:ind w:right="280"/>'
    : align === "left"
      ? '<w:ind w:left="280"/>'
      : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="${align}"/>${sideIndent}<w:spacing w:before="0" w:after="0"/></w:pPr><w:r>${pageRunProps}<w:t xml:space="preserve">— </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r>${pageRunProps}<w:t>1</w:t></w:r></w:fldSimple><w:r>${pageRunProps}<w:t xml:space="preserve"> —</w:t></w:r></w:p></w:ftr>`;
}

function settingsXml(pageNumberMode) {
  const evenOdd = pageNumberMode === "standard" ? "<w:evenAndOddHeaders/>" : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${evenOdd}<w:updateFields w:val="true"/></w:settings>`;
}

function documentRelsXml(pageNumberMode) {
  const footerRels = pageNumberMode === "standard"
    ? '<Relationship Id="rIdFooterOdd" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerOdd.xml"/><Relationship Id="rIdFooterEven" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerEven.xml"/>'
    : pageNumberMode === "center"
      ? '<Relationship Id="rIdFooterCenter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerCenter.xml"/>'
      : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${footerRels}</Relationships>`;
}

function writeDocx(output, documentXml, pageNumberMode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gongwen-docx-"));
  fs.mkdirSync(path.join(dir, "_rels"), { recursive: true });
  fs.mkdirSync(path.join(dir, "word"), { recursive: true });
  fs.mkdirSync(path.join(dir, "word/_rels"), { recursive: true });
  const footerTypes = pageNumberMode === "standard"
    ? '<Override PartName="/word/footerOdd.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/footerEven.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    : pageNumberMode === "center"
      ? '<Override PartName="/word/footerCenter.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
      : "";
  fs.writeFileSync(path.join(dir, "[Content_Types].xml"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${footerTypes}</Types>`);
  fs.writeFileSync(path.join(dir, "_rels/.rels"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  fs.writeFileSync(path.join(dir, "word/_rels/document.xml.rels"), documentRelsXml(pageNumberMode));
  fs.writeFileSync(path.join(dir, "word/document.xml"), documentXml);
  fs.writeFileSync(path.join(dir, "word/styles.xml"), stylesXml());
  fs.writeFileSync(path.join(dir, "word/fontTable.xml"), fontTableXml());
  fs.writeFileSync(path.join(dir, "word/settings.xml"), settingsXml(pageNumberMode));
  if (pageNumberMode === "standard") {
    fs.writeFileSync(path.join(dir, "word/footerOdd.xml"), footerXml("right"));
    fs.writeFileSync(path.join(dir, "word/footerEven.xml"), footerXml("left"));
  } else if (pageNumberMode === "center") {
    fs.writeFileSync(path.join(dir, "word/footerCenter.xml"), footerXml("center"));
  }
  fs.rmSync(output, { force: true });
  execFileSync("zip", ["-qr", output, "."], { cwd: dir });
  fs.rmSync(dir, { recursive: true, force: true });
}

const args = parseArgs(process.argv);
if (args.help || !args.input || !args.output) {
  usage();
  process.exit(args.help ? 0 : 1);
}
const md = fs.readFileSync(args.input, "utf8");
const blocks = parseMarkdown(md);
const documentXml = buildDocument(blocks, args);
const pageNumberMode = args["no-page-number"] || args["no-page-numbers"]
  ? "none"
  : ["center", "standard", "none"].includes(args["page-number"])
    ? args["page-number"]
    : "center";
writeDocx(path.resolve(args.output), documentXml, pageNumberMode);
console.log(`Generated: ${path.resolve(args.output)}`);
