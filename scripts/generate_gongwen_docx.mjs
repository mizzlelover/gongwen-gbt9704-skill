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
    const families = new Set();
    const aliases = {
      simfang: "FangSong",
      simfangb: "FangSong_GB2312",
      "方正小标宋简体": "方正小标宋简体",
      "方正小标宋_GBK": "方正小标宋_GBK",
      "fzxiaobiaosong-b05s": "FZXiaoBiaoSong-B05S",
      "fzxiaobiaosong-b13s": "FZXiaoBiaoSong-B13S",
      fangsong: "FangSong",
      fangsong_gb2312: "FangSong_GB2312",
    };
    const roots = [
      process.env.WINDIR ? path.join(process.env.WINDIR, "Fonts") : "",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "Windows", "Fonts") : "",
      path.join(os.homedir(), "Library", "Fonts"),
      "/Library/Fonts",
      "/usr/share/fonts",
      "/usr/local/share/fonts",
    ].filter(Boolean);
    const walk = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(?:ttf|ttc|otf)$/i.test(entry.name)) {
          const stem = path.basename(entry.name, path.extname(entry.name));
          families.add(stem);
          const alias = aliases[stem.toLowerCase()];
          if (alias) families.add(alias);
        }
      }
    };
    roots.forEach(walk);
    return families;
  }
}

const INSTALLED_FONTS = installedFontFamilies();
function preferredFont(candidates, fallback) {
  return candidates.find((font) => INSTALLED_FONTS.has(font)) ?? fallback ?? candidates[0];
}

const FONT = {
  title: { eastAsia: preferredFont(["方正小标宋简体", "方正小标宋_GBK", "FZXiaoBiaoSong-B05S", "FZXiaoBiaoSong-B13S"], "Songti SC"), ascii: "Times New Roman", cs: "Times New Roman" },
  subtitle: { eastAsia: preferredFont(["仿宋", "仿宋_GB2312", "STFangsong"], "STFangsong"), ascii: "Times New Roman", cs: "Times New Roman" },
  body: { eastAsia: preferredFont(["仿宋", "仿宋_GB2312", "FangSong", "FangSong_GB2312", "STFangsong"], "STFangsong"), ascii: "Times New Roman", cs: "Times New Roman" },
  h1: { eastAsia: preferredFont(["黑体", "SimHei", "Heiti SC", "STHeiti"], "Heiti SC"), ascii: "Times New Roman", cs: "Times New Roman" },
  h2: { eastAsia: preferredFont(["楷体", "楷体_GB2312", "KaiTi", "Kaiti SC", "STKaiti"], "Kaiti SC"), ascii: "Times New Roman", cs: "Times New Roman" },
  song: { eastAsia: preferredFont(["宋体", "SimSun"], "Songti SC"), ascii: "宋体", cs: "宋体" },
};

const STANDARD_FONT_CANDIDATES = {
  title: ["方正小标宋简体", "方正小标宋_GBK", "FZXiaoBiaoSong-B05S", "FZXiaoBiaoSong-B13S"],
  body: ["仿宋", "仿宋_GB2312", "FangSong", "FangSong_GB2312"],
};

function missingFonts() {
  return Object.entries(STANDARD_FONT_CANDIDATES)
    .filter(([, candidates]) => !candidates.some((font) => INSTALLED_FONTS.has(font)))
    .map(([role]) => role);
}

function reportFontStatus(args) {
  const missing = missingFonts();
  if (!missing.length) return;
  const details = [];
  if (missing.includes("title")) details.push(`标题和发文机关标志使用“${FONT.title.eastAsia}”替代`);
  if (missing.includes("body")) details.push(`正文使用“${FONT.body.eastAsia}”替代`);
  const message = `当前环境缺少国标常用字体：${details.join("；")}。请安装方正小标宋简体、方正小标宋_GBK 或 FZXiaoBiaoSong，以及可用的仿宋字体后重新生成。`;
  if (args["require-standard-fonts"]) throw new Error(`FONT ERROR: ${message}`);
  console.error(`FONT WARNING: ${message}`);
}

function usage() {
  console.log(`Usage:
  node generate_gongwen_docx.mjs --input source.md --output out.docx [--format ordinary|formal|letter|command|minutes] [--letterhead preprinted|digital] [--org 发文机关] [--doc-no 发文字号] [--title 标题] [--subtitle 副标题] [--to 主送机关] [--sender 落款] [--date 日期] [--attachment-note 附件说明] [--attachment-file attachment.md ...] [--page-number center|standard|none] [--require-standard-fonts]

Notes:
  - Converts Markdown to a GB/T 9704-2012 page-layout DOCX.
  - ordinary is the default for reports, plans and other editable materials. It never creates a red header from --org alone.
  - formal is used only when a formal issuing-document layout is explicitly requested. It defaults to preprinted letterhead: red elements are reserved, not redrawn. Use --letterhead digital only for a complete electronic red-head layout.
  - letter, command and minutes use their dedicated national-standard layout branches. Their required fields must be supplied explicitly.
  - --org and --doc-no are printed exactly as supplied. The tool formats document content; it does not infer missing information or decide the document's use.
  - The generator reports when the required small-standard-title or FangSong font is unavailable and uses a visible fallback. Add --require-standard-fonts to refuse generation until the required font is installed.
  - Supports headings, paragraphs, ordered/unordered lines, pipe tables, and repeatable Markdown attachment pages via --attachment-file.
  - No npm dependencies; requires zip in PATH.`);
}

function parseArgs(argv) {
  const args = {};
  const flags = new Set(["help", "no-page-number", "no-page-numbers", "require-standard-fonts"]);
  const repeatable = new Set(["attachment-file"]);
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    if (flags.has(name)) {
      args[name] = true;
      continue;
    }
    if (repeatable.has(name)) {
      args[name] = [...(args[name] ?? []), argv[i + 1]];
    } else {
      args[name] = argv[i + 1];
    }
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
  const line = opts.line ?? "560";
  const lineRule = opts.lineRule ?? "exact";
  const style = opts.style ? `<w:pStyle w:val="${attr(opts.style)}"/>` : "";
  const outline = opts.outlineLevel === undefined ? "" : `<w:outlineLvl w:val="${opts.outlineLevel}"/>`;
  const pageBreak = opts.pageBreakBefore ? "<w:pageBreakBefore/>" : "";
  const snapToGrid = opts.snapToGrid === false ? "<w:snapToGrid w:val=\"false\"/>" : "<w:snapToGrid w:val=\"true\"/>";
  const pPr = `<w:pPr>${style}${keepNext}${pageBreak}${align}${indent}${outline}<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="${lineRule}"/><w:adjustRightInd w:val="true"/>${snapToGrid}<w:kinsoku w:val="true"/></w:pPr>`;
  return `<w:p>${pPr}${run(text, opts)}</w:p>`;
}

function titleParagraph(text, before = "0") {
  return paragraph(text, {
    align: "center",
    indent: false,
    fontPreset: "title",
    size: "44",
    before,
    after: "560",
    style: "GongwenTitle",
  });
}

function agencyMarkParagraph(text, before = "0") {
  return paragraph(text, {
    align: "center",
    indent: false,
    fontPreset: "title",
    size: "56",
    color: "FF0000",
    after: "560",
    before,
  });
}

function letterheadReserveParagraph(reserveMm) {
  const before = Math.round((reserveMm - 37) * 56.692913);
  return paragraph("\u00a0", {
    align: "left",
    indent: false,
    fontPreset: "body",
    size: "2",
    line: "1",
    snapToGrid: false,
    before: String(before),
    after: "0",
  });
}

function documentNumberParagraph(text, upward = false) {
  return paragraph(text, {
    align: upward ? "left" : "center",
    indent: false,
    fontPreset: "body",
    size: "32",
    after: "227",
    left: upward ? FIRST_LINE_INDENT : undefined,
  });
}

function upwardHeaderParagraph(docNo, signer) {
  const tabPosition = CONTENT_W - FIRST_LINE_INDENT;
  return `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:left="${FIRST_LINE_INDENT}" w:right="${FIRST_LINE_INDENT}"/><w:tabs><w:tab w:val="right" w:pos="${tabPosition}"/></w:tabs><w:spacing w:before="0" w:after="227" w:line="560" w:lineRule="exact"/><w:adjustRightInd w:val="true"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr>${run(docNo, { fontPreset: "body", size: "32" })}<w:r><w:tab/></w:r>${run("签发人：", { fontPreset: "body", size: "32" })}${run(signer, { fontPreset: "h2", size: "32" })}</w:p>`;
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

function normalizeMainSend(text) {
  const value = String(text ?? "").trim();
  return value && /[:：]$/.test(value) ? value : `${value}：`;
}

function h1(text) {
  return paragraph(text, {
    align: "left",
    fontPreset: "h1",
    size: "32",
    keepNext: true,
    before: "160",
    after: "0",
    style: "Heading1",
    outlineLevel: 0,
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
    style: "Heading2",
    outlineLevel: 1,
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
    style: "Heading3",
    outlineLevel: 2,
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
    style: "Heading4",
    outlineLevel: 3,
  });
}

function right(text) {
  return paragraph(text, { align: "right", indent: false, right: FIRST_LINE_INDENT });
}

function redRule(thickness = "5") {
  const height = thickness === "thick" ? "0.35mm" : thickness === "thin" ? "0.25mm" : "0.5mm";
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="80" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:pict><v:rect xmlns:v="urn:schemas-microsoft-com:vml" style="width:156mm;height:${height}" fillcolor="#FF0000" stroked="f"/></w:pict></w:r></w:p>`;
}

function mmToDxa(mm) {
  return Math.round(Number(mm) * 1440 / 25.4);
}

function redDoubleRule({ upperMm = "0.35", lowerMm = "0.25", widthMm = "170" } = {}) {
  const width = mmToDxa(widthMm);
  const row = (heightMm) => `<w:tr><w:trPr><w:trHeight w:val="${mmToDxa(heightMm)}" w:hRule="exact"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:val="clear" w:color="FF0000" w:fill="FF0000"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/></w:pPr><w:r><w:rPr><w:sz w:val="2"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r></w:p></w:tc></w:tr>`;
  const spacer = `<w:tr><w:trPr><w:trHeight w:val="${mmToDxa("3")}" w:hRule="exact"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/></w:pPr></w:p></w:tc></w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${width}"/></w:tblGrid>${row(upperMm)}${spacer}${row(lowerMm)}</w:tbl>`;
}

function minutesPersonParagraph(label, people, before = "0") {
  return `<w:p><w:pPr><w:jc w:val="left"/><w:ind w:firstLine="0"/><w:spacing w:before="${before}" w:after="0" w:line="560" w:lineRule="exact"/><w:adjustRightInd w:val="true"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr>${run(`${label}：`, { fontPreset: "h1", size: "32" })}${run(people, { fontPreset: "body", size: "32" })}</w:p>`;
}

function headerFieldParagraph(text, fontPreset = "h1", opts = {}) {
  return paragraph(text, { align: opts.align ?? "left", indent: false, fontPreset, size: "32", after: opts.after ?? "0", left: opts.left, right: opts.right });
}

function attachmentNote(text) {
  return paragraph(`附件：${text}`, { align: "left", fontPreset: "body", size: "32", before: "560", firstLine: FIRST_LINE_INDENT, left: "0" });
}

function colophon(args) {
  if (!args["cc"] && !args["print-org"] && !args["print-date"]) return [];
  const body = [redRule("thick")];
  if (args.cc) body.push(paragraph(`抄送：${args.cc.replace(/[。.]?$/, "")}。`, { align: "left", indent: false, left: "320", right: "320", fontPreset: "body", size: "28" }));
  if (args.cc) body.push(redRule("thin"));
  if (args["print-org"] || args["print-date"]) {
    const left = args["print-org"] ?? "";
    const rightValue = args["print-date"] ? `${args["print-date"].replace(/印发$/, "")}印发` : "";
    body.push(`<w:p><w:pPr><w:jc w:val="both"/><w:ind w:left="320" w:right="320"/><w:tabs><w:tab w:val="right" w:pos="${CONTENT_W - 320}"/></w:tabs><w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/></w:pPr>${run(left, { fontPreset: "body", size: "28" })}<w:r><w:tab/></w:r>${run(rightValue, { fontPreset: "body", size: "28" })}</w:p>`);
  }
  body.push(redRule("thick"));
  return body;
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
  if (isThirdLayerHeadingText(block.text)) return h3(block.text);
  if (isFourthLayerHeadingText(block.text)) return h4(block.text);
  return paragraph(block.text);
}

function attachmentPage(blocks, index, filePath) {
  const attachmentBlocks = [...blocks];
  let attachmentTitle = path.basename(filePath, path.extname(filePath));
  if (attachmentBlocks[0]?.type === "heading") {
    attachmentTitle = attachmentBlocks.shift().text;
  }
  const body = [
    paragraph(`附件${index}`, { align: "left", indent: false, fontPreset: "h1", size: "32", pageBreakBefore: true, keepNext: true }),
    emptyLine(),
    titleParagraph(attachmentTitle),
  ];
  for (const block of attachmentBlocks) {
    if (block.type === "heading") body.push(renderHeading(block));
    else if (block.type === "table") body.push(tableXml(block.headers, block.rows), emptyLine());
    else body.push(renderParagraph(block));
  }
  return body.join("");
}

function resolvePageNumberMode(args, format) {
  if (args["no-page-number"] || args["no-page-numbers"]) return "none";
  if (["center", "standard", "none"].includes(args["page-number"])) return args["page-number"];
  if (format === "letter") return "none";
  if (format === "formal" || format === "command" || format === "minutes") return "standard";
  return "center";
}

function buildDocument(blocks, args) {
  let title = args.title;
  const format = ["ordinary", "formal", "letter", "command", "minutes"].includes(args.format) ? args.format : "ordinary";
  const letterhead = args.letterhead === "digital" ? "digital" : "preprinted";
  const pageNumberMode = resolvePageNumberMode(args, format);
  const body = [];
  const pageMarginTop = format === "letter" ? 1701 : format === "command" ? 1134 : 2098;
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
  if (mainSend) mainSend = normalizeMainSend(mainSend);
  const upward = args["upward"] === "true" || args["upward"] === true;
  const formal = format === "formal";
  if (formal) {
    if (letterhead === "digital" && !args.org) throw new Error("formal digital letterhead requires --org");
    const headerFieldCount = [args["copy-no"], args.secret, args.urgent].filter(Boolean).length;
    if (args["copy-no"] && !/^\d{1,6}$/.test(String(args["copy-no"]))) throw new Error("--copy-no must contain one to six Arabic digits");
    if (args["copy-no"]) body.push(headerFieldParagraph(String(args["copy-no"]).padStart(6, "0"), "body"));
    if (args.secret) body.push(headerFieldParagraph(args.secret));
    if (args.urgent) body.push(headerFieldParagraph(args.urgent));
    if (letterhead === "digital" && args.org) body.push(agencyMarkParagraph(args.org, String(Math.max(0, 1984 - headerFieldCount * 560))));
    if (letterhead === "preprinted") {
      const reserve = Number(args["letterhead-reserve-mm"] ?? 72);
      if (!Number.isFinite(reserve) || reserve < 37 || reserve > 130) throw new Error("--letterhead-reserve-mm must be between 37 and 130");
      body.push(letterheadReserveParagraph(Math.max(37, reserve - headerFieldCount * 9.877)));
    }
    if (upward && args["doc-no"] && args.signer) body.push(upwardHeaderParagraph(args["doc-no"], args.signer));
    else if (args["doc-no"]) body.push(documentNumberParagraph(args["doc-no"], upward));
    if (letterhead === "digital" || args["preprinted-rule"] === "true") body.push(redRule());
  } else if (format === "letter") {
    if (!args.org) throw new Error("letter format requires --org");
    body.push(paragraph(args.org, { align: "center", indent: false, fontPreset: "title", size: "44", color: "FF0000", before: "0", after: "227" }));
    body.push(redDoubleRule({ upperMm: "0.35", lowerMm: "0.25" }));
    if (args["doc-no"]) body.push(headerFieldParagraph(args["doc-no"], "body", { align: "right" }));
  } else if (format === "command") {
    if (!args.org) throw new Error("command format requires --org");
    body.push(paragraph(args.org, { align: "center", indent: false, fontPreset: "title", size: "44", color: "FF0000", before: "0", after: "1120" }));
    if (args["doc-no"]) body.push(paragraph(args["doc-no"], { align: "center", indent: false, fontPreset: "body", size: "32", after: "1120" }));
  } else if (format === "minutes") {
    if (!args.org) throw new Error("minutes format requires --org (for XXXXX纪要)");
    body.push(paragraph(args.org, { align: "center", indent: false, fontPreset: "title", size: "44", color: "FF0000", before: "1984", after: "560" }));
  }
  const hasRedRule = (formal && (letterhead === "digital" || letterhead === "preprinted" || args["preprinted-rule"] === "true")) || format === "letter";
  if (title) body.push(titleParagraph(title, hasRedRule ? "1120" : "0"));
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
  if (args["attachment-note"]) body.push(attachmentNote(args["attachment-note"]));
  if (args.sender || args.date) {
    body.push(emptyLine());
    if (args["seal-mode"] === "signed") {
      if (!args.signer || !args["signer-title"]) throw new Error("signed seal mode requires --signer and --signer-title");
      body.push(right(`${args["signer-title"]}  ${args.signer}`));
      if (args.date) body.push(right(args.date));
    } else if (args["seal-mode"] === "seal") {
      if (args.sender) body.push(right(args.sender));
      if (args.date) body.push(right(args.date));
    } else {
      if (args.sender) body.push(right(args.sender));
      if (args.date) body.push(right(args.date));
    }
  }
  if (args.note) body.push(paragraph(`（${args.note.replace(/^（|）$/g, "")}）`, { align: "left", fontPreset: "body", size: "32" }));
  const attachmentFiles = Array.isArray(args["attachment-file"]) ? args["attachment-file"] : args["attachment-file"] ? [args["attachment-file"]] : [];
  attachmentFiles.forEach((filePath, index) => {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`attachment file not found: ${filePath}`);
    const attachmentBlocks = parseMarkdown(fs.readFileSync(absolutePath, "utf8"));
    body.push(attachmentPage(attachmentBlocks, index + 1, absolutePath));
  });
  if (format === "minutes" && args.attendees) body.push(minutesPersonParagraph("出席", args.attendees, "560"));
  if (format === "minutes" && args.absent) body.push(minutesPersonParagraph("请假", args.absent));
  if (format === "minutes" && args.observers) body.push(minutesPersonParagraph("列席", args.observers));
  if (format !== "letter") body.push(...colophon(args));
  const letterFooter = format === "letter" ? '<w:footerReference w:type="default" r:id="rIdLetterFooter"/>' : "";
  const footerRefs = letterFooter || (pageNumberMode === "standard"
    ? '<w:footerReference w:type="default" r:id="rIdFooterOdd"/><w:footerReference w:type="even" r:id="rIdFooterEven"/>'
    : pageNumberMode === "center"
      ? '<w:footerReference w:type="default" r:id="rIdFooterCenter"/>'
      : "");
  const footerDistance = format === "letter" ? "1134" : "1588";
  body.push(`<w:sectPr>${footerRefs}<w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/><w:pgMar w:top="${pageMarginTop}" w:right="${MARGIN.right}" w:bottom="${MARGIN.bottom}" w:left="${MARGIN.left}" w:header="720" w:footer="${footerDistance}" w:gutter="0"/><w:docGrid w:type="lines" w:linePitch="560"/></w:sectPr>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml"><w:body>${body.join("")}</w:body></w:document>`;
}

function stylesXml() {
  const style = (id, name, preset, size, outline, before = "0") => `<w:style w:type="paragraph" w:customStyle="1" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:ind w:firstLine="640"/><w:outlineLvl w:val="${outline}"/><w:spacing w:before="${before}" w:after="0" w:line="560" w:lineRule="exact"/></w:pPr><w:rPr><w:rFonts ${fontAttrs({ fontPreset: preset })}/><w:color w:val="000000"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:style>`;
  const title = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="GongwenTitle"><w:name w:val="公文标题"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="560" w:line="560" w:lineRule="exact"/></w:pPr><w:rPr><w:rFonts ${fontAttrs({ fontPreset: "title" })}/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts ${fontAttrs({ fontPreset: "body" })}/><w:color w:val="000000"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/><w:adjustRightInd w:val="true"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts ${fontAttrs({ fontPreset: "body" })}/><w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:style>${title}${style("Heading1", "标题 1", "h1", "32", 0, "160")}${style("Heading2", "标题 2", "h2", "32", 1, "80")}${style("Heading3", "标题 3", "body", "32", 2, "40")}${style("Heading4", "标题 4", "body", "32", 3)}</w:styles>`;
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

function letterFooterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${redDoubleRule({ upperMm: "0.25", lowerMm: "0.35" })}</w:ftr>`;
}

function settingsXml(pageNumberMode) {
  const evenOdd = pageNumberMode === "standard" ? "<w:evenAndOddHeaders/>" : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${evenOdd}<w:updateFields w:val="true"/></w:settings>`;
}

function documentRelsXml(pageNumberMode, format) {
  const footerRels = format === "letter"
    ? '<Relationship Id="rIdLetterFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerLetter.xml"/>'
    : pageNumberMode === "standard"
    ? '<Relationship Id="rIdFooterOdd" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerOdd.xml"/><Relationship Id="rIdFooterEven" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerEven.xml"/>'
      : pageNumberMode === "center"
        ? '<Relationship Id="rIdFooterCenter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footerCenter.xml"/>'
      : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${footerRels}</Relationships>`;
}

function writeDocx(output, documentXml, pageNumberMode, format) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gongwen-docx-"));
  fs.mkdirSync(path.join(dir, "_rels"), { recursive: true });
  fs.mkdirSync(path.join(dir, "word"), { recursive: true });
  fs.mkdirSync(path.join(dir, "word/_rels"), { recursive: true });
  const footerTypes = format === "letter"
    ? '<Override PartName="/word/footerLetter.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    : pageNumberMode === "standard"
    ? '<Override PartName="/word/footerOdd.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/footerEven.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
      : pageNumberMode === "center"
        ? '<Override PartName="/word/footerCenter.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
      : "";
  fs.writeFileSync(path.join(dir, "[Content_Types].xml"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${footerTypes}</Types>`);
  fs.writeFileSync(path.join(dir, "_rels/.rels"), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  fs.writeFileSync(path.join(dir, "word/_rels/document.xml.rels"), documentRelsXml(pageNumberMode, format));
  fs.writeFileSync(path.join(dir, "word/document.xml"), documentXml);
  fs.writeFileSync(path.join(dir, "word/styles.xml"), stylesXml());
  fs.writeFileSync(path.join(dir, "word/fontTable.xml"), fontTableXml());
  fs.writeFileSync(path.join(dir, "word/settings.xml"), settingsXml(pageNumberMode));
  if (format === "letter") {
    fs.writeFileSync(path.join(dir, "word/footerLetter.xml"), letterFooterXml());
  } else if (pageNumberMode === "standard") {
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
try {
  reportFontStatus(args);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
const md = fs.readFileSync(args.input, "utf8");
try {
  const blocks = parseMarkdown(md);
  const documentXml = buildDocument(blocks, args);
  const format = ["ordinary", "formal", "letter", "command", "minutes"].includes(args.format) ? args.format : "ordinary";
  const pageNumberMode = resolvePageNumberMode(args, format);
  writeDocx(path.resolve(args.output), documentXml, pageNumberMode, format);
  console.log(`Generated: ${path.resolve(args.output)}`);
} catch (error) {
  console.error(`GENERATOR ERROR: ${error.message}`);
  process.exit(2);
}
