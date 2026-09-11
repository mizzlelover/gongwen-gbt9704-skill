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
const ONE_CHAR_INDENT = FIRST_LINE_INDENT / 2;
// First-page red-head frames use the type-area top as their vertical anchor.
// GB/T 9704-2012 7.2.1-7.2.4 then become direct coordinates: the first
// header line is y=0 and the agency mark begins 35 mm below it. Keeping the
// paragraph spacing at zero prevents optional left-corner fields from moving
// the centred mark or changing the preprinted-paper reserve.
const MM_TO_DXA = 56.692913;
const HEADER_FIELD_BEFORE = 0;
const AGENCY_FRAME_BEFORE = 0;
const AGENCY_FLOW_BEFORE = 1880;
const HEADER_FIELD_Y = 0;
const AGENCY_FRAME_Y = Math.round(35 * MM_TO_DXA);

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
  node generate_gongwen_docx.mjs --input source.md --output out.docx [--format ordinary|formal|letter|command|minutes|horizontal-table] [--letterhead preprinted|digital] [--org 发文机关] [--joint-org 联署机关 ...] [--doc-no 发文字号] [--title 标题] [--subtitle 副标题] [--to 主送机关] [--sender 落款] [--date 日期] [--attachment-note 附件说明] [--attachment-file attachment.md ...] [--attachment-detached] [--page-number center|standard|none] [--require-standard-fonts]

Notes:
  - Converts Markdown to a GB/T 9704-2012 page-layout DOCX.
  - ordinary is the default for reports, plans and other editable materials. It never creates a red header from --org alone.
  - formal is used only when a formal issuing-document layout is explicitly requested. It defaults to preprinted letterhead: red elements are reserved, not redrawn. Use --letterhead digital only for a complete electronic red-head layout.
  - letter, command and minutes use their dedicated national-standard layout branches. Their required fields must be supplied explicitly.
  - formal and letter document numbers are checked for full-year〔〕sequence号 syntax; dates are checked for YYYY年M月D日 without zero padding.
  - --org and --doc-no are printed as supplied after boundary validation. The tool formats document content; it does not infer missing information or decide the document's use.
  - The generator reports when the required small-standard-title or FangSong font is unavailable and uses a visible fallback. Add --require-standard-fonts to refuse generation until the required font is installed.
  - Supports headings, paragraphs, ordered/unordered lines, pipe tables, and repeatable Markdown attachment pages via --attachment-file. The colophon is anchored to the bottom of the final page's type area.
  - No npm dependencies; requires zip in PATH.`);
}

function parseArgs(argv) {
  const args = {};
  const flags = new Set(["help", "no-page-number", "no-page-numbers", "require-standard-fonts", "attachment-detached"]);
  const repeatable = new Set(["attachment-file", "joint-org"]);
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    if (flags.has(name)) {
      args[name] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`--${name} requires a value`);
    }
    if (repeatable.has(name)) {
      args[name] = [...(args[name] ?? []), value];
    } else {
      args[name] = value;
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
  const textXml = String(text ?? "").split("\n").map((line, index) => `${index ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(line)}</w:t>`).join("");
  return `<w:r><w:rPr><w:rFonts ${fontAttrs(opts)}/>${bold}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr>${textXml}</w:r>`;
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
  const frame = opts.frame ? `<w:framePr w:wrap="none" w:hAnchor="${attr(opts.frame.hAnchor ?? "page")}" w:vAnchor="${attr(opts.frame.vAnchor ?? "page")}"${opts.frame.xAlign ? ` w:xAlign="${attr(opts.frame.xAlign)}"` : ` w:x="${attr(opts.frame.x ?? 0)}"`} w:y="${attr(opts.frame.y ?? 0)}" w:w="${attr(opts.frame.w ?? CONTENT_W)}" w:h="${attr(opts.frame.h ?? 560)}"/>` : "";
  const pageBreak = opts.pageBreakBefore ? "<w:pageBreakBefore/>" : "";
  const snapToGrid = opts.snapToGrid === false ? "<w:snapToGrid w:val=\"false\"/>" : "<w:snapToGrid w:val=\"true\"/>";
  const pPr = `<w:pPr>${style}${keepNext}${pageBreak}${frame}${align}${indent}${outline}<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="${lineRule}"/><w:adjustRightInd w:val="true"/>${snapToGrid}<w:kinsoku w:val="true"/></w:pPr>`;
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

function floatingHeaderFieldParagraph(text, fontPreset, index) {
  return paragraph(text, {
    align: "left",
    indent: false,
    fontPreset,
    size: "32",
    before: HEADER_FIELD_BEFORE,
    frame: { hAnchor: "margin", vAnchor: "margin", xAlign: "left", y: HEADER_FIELD_Y + index * 560, w: CONTENT_W, h: 560 },
  });
}

function floatingAgencyMarkParagraph(text, lineCount = 1, size = "56") {
  return paragraph(text, {
    align: "center",
    indent: false,
    fontPreset: "title",
    size,
    color: "FF0000",
    before: AGENCY_FRAME_BEFORE,
    frame: { hAnchor: "margin", vAnchor: "margin", xAlign: "center", y: AGENCY_FRAME_Y, w: CONTENT_W, h: 800 * Math.max(1, lineCount) },
  });
}

function floatingJointAgencyTable(names, size = "48", includeFile = true) {
  const maxNameLength = Math.max(...names.map((name) => [...name].length), 1);
  const rightWidth = includeFile ? 1600 : 0;
  const leftWidth = Math.min(CONTENT_W - rightWidth, Math.max(3600, maxNameLength * 520 + 400));
  const tableWidth = leftWidth + rightWidth;
  const cellMargins = '<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar>';
  const lineParagraph = (text) => `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr>${run(text, { fontPreset: "title", size, color: "FF0000" })}</w:p>`;
  const leftCell = `<w:tc><w:tcPr><w:tcW w:w="${leftWidth}" w:type="dxa"/><w:vAlign w:val="center"/>${cellMargins}</w:tcPr>${names.map(lineParagraph).join("")}</w:tc>`;
  const rightCell = includeFile
    ? `<w:tc><w:tcPr><w:tcW w:w="${rightWidth}" w:type="dxa"/><w:vAlign w:val="center"/>${cellMargins}</w:tcPr>${lineParagraph("文件")}</w:tc>`
    : "";
  const tablePr = `<w:tblPr><w:tblpPr w:leftFromText="0" w:rightFromText="0" w:topFromText="0" w:bottomFromText="0" w:vertAnchor="margin" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpY="${AGENCY_FRAME_Y}"/><w:tblOverlap w:val="never"/><w:tblW w:w="${tableWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const grid = `<w:gridCol w:w="${leftWidth}"/>${includeFile ? `<w:gridCol w:w="${rightWidth}"/>` : ""}`;
  return `<w:tbl>${tablePr}<w:tblGrid>${grid}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${leftCell}${rightCell}</w:tr></w:tbl>`;
}

function agencyMarkFlowSpacer(extraDxa = 0) {
  return paragraph("\u00a0", {
    align: "left",
    indent: false,
    fontPreset: "body",
    size: "2",
    line: "560",
    snapToGrid: false,
    before: AGENCY_FLOW_BEFORE + extraDxa,
    after: "0",
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
  const tabPosition = CONTENT_W - ONE_CHAR_INDENT;
  const signers = String(signer).split(/[、,，;；\s]+/).map((name) => name.trim()).filter(Boolean);
  if (signers.length > 2) throw new Error("upward --signer supports up to two names; use the authority's joint-signature template for more signers");
  const signerRuns = signers.map((name, index) => `${index ? run("　　", { fontPreset: "h2", size: "32" }) : ""}${run(name, { fontPreset: "h2", size: "32" })}`).join("");
  return `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:left="${ONE_CHAR_INDENT}" w:right="${ONE_CHAR_INDENT}"/><w:tabs><w:tab w:val="right" w:pos="${tabPosition}"/></w:tabs><w:spacing w:before="0" w:after="227" w:line="560" w:lineRule="exact"/><w:adjustRightInd w:val="true"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr>${run(docNo, { fontPreset: "body", size: "32" })}<w:r><w:tab/></w:r>${run("签发人：", { fontPreset: "body", size: "32" })}${signerRuns}</w:p>`;
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

function normalizeDocumentNumber(text, label = "--doc-no") {
  const value = String(text ?? "").trim();
  if (!value) return value;
  if (!/^[^〔〕\[\]【】]+〔\d{4}〕[1-9]\d*号$/.test(value) || /第/.test(value)) {
    throw new Error(`${label} must use 年份全称、六角括号、非虚位顺序号且以“号”结尾，例如“示例发〔2026〕1号”`);
  }
  return value;
}

function normalizeChineseDate(text, label = "--date", allowPrintSuffix = false) {
  const raw = String(text ?? "").trim();
  const value = allowPrintSuffix ? raw.replace(/印发$/, "") : raw;
  const match = value.match(/^(\d{4})年((?:[1-9]|1[0-2]))月((?:[1-9]|[12]\d|3[01]))日$/);
  if (!match) throw new Error(`${label} must use YYYY年M月D日 and must not zero-pad month/day`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} is not a valid calendar date`);
  }
  return value;
}

function normalizeAttachmentNote(text) {
  const value = String(text ?? "").trim().replace(/[。；;]+$/, "");
  if (!value) throw new Error("--attachment-note cannot be empty");
  const names = value.replace(/^附件[：:]\s*/, "").trim();
  if (!names) throw new Error("--attachment-note must contain an attachment name after 附件：");
  return `附件：${names}`;
}

function normalizedAttachmentName(text) {
  return String(text ?? "")
    .trim()
    .replace(/^附件[：:]\s*/, "")
    .replace(/^附件\s*[一二三四五六七八九十百\d]+\s*[：:]\s*/, "")
    .replace(/^\d+\s*[.．、]\s*/, "")
    .replace(/[。；;]+$/, "")
    .trim();
}

function attachmentNamesFromNote(text) {
  return normalizeAttachmentNote(text)
    .replace(/^附件：/, "")
    .split(/[；;]/)
    .map(normalizedAttachmentName)
    .filter(Boolean);
}

function attachmentTitleFromFile(filePath) {
  const blocks = parseMarkdown(fs.readFileSync(filePath, "utf8"));
  const heading = blocks.find((block) => block.type === "heading");
  return normalizedAttachmentName(heading?.text ?? path.basename(filePath, path.extname(filePath)));
}

function validateAttachmentConsistency(note, files) {
  if (!files.length) return;
  if (!note) throw new Error("--attachment-file requires --attachment-note so attachment order and titles can be checked");
  const noted = attachmentNamesFromNote(note);
  const actual = files.map(attachmentTitleFromFile);
  if (noted.length !== actual.length || noted.some((name, index) => name !== actual[index])) {
    throw new Error(`--attachment-note must match attachment titles and order: note=[${noted.join("、")}] files=[${actual.join("、")}]`);
  }
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

function rightWithIndent(text, rightIndent) {
  return paragraph(text, { align: "right", indent: false, right: String(rightIndent) });
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
  // The label starts two characters into the type area; wrapped names align
  // after the four-character label “出席：/请假：/列席：”.
  return `<w:p><w:pPr><w:jc w:val="left"/><w:ind w:firstLine="-1280" w:left="1920"/><w:spacing w:before="${before}" w:after="0" w:line="560" w:lineRule="exact"/><w:adjustRightInd w:val="true"/><w:snapToGrid w:val="true"/><w:kinsoku w:val="true"/></w:pPr>${run(`${label}：`, { fontPreset: "h1", size: "32" })}${run(people, { fontPreset: "body", size: "32" })}</w:p>`;
}

function headerFieldParagraph(text, fontPreset = "h1", opts = {}) {
  return paragraph(text, { align: opts.align ?? "left", indent: false, fontPreset, size: "32", before: opts.before ?? "0", after: opts.after ?? "0", left: opts.left, right: opts.right });
}

function letterHeaderRow(leftText, docNo) {
  const cell = (text, align, fontPreset) => `<w:tc><w:tcPr><w:tcW w:w="4422" w:type="dxa"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr>${paragraph(text, { align, indent: false, fontPreset, size: "32", before: "280", after: "0" })}</w:tc>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${CONTENT_W}" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="4422"/><w:gridCol w:w="4422"/></w:tblGrid><w:tr>${cell(leftText, "left", "body")}${cell(docNo, "right", "body")}</w:tr></w:tbl>`;
}

function attachmentNote(text) {
  return paragraph(normalizeAttachmentNote(text), { align: "left", fontPreset: "body", size: "32", before: "560", firstLine: "-960", left: "1600" });
}

function estimatedTextWidthDxa(text) {
  return [...String(text ?? "")].reduce((sum, char) => sum + (/^[\x00-\x7f]$/.test(char) ? 160 : 320), 0);
}

function signatureParagraphs(args) {
  if (args["seal-mode"] === "signed") {
    if (!args.signer || !args["signer-title"]) throw new Error("signed seal mode requires --signer and --signer-title");
    const lines = [rightWithIndent(`${args["signer-title"]}  ${args.signer}`, FIRST_LINE_INDENT * 2)];
    if (args.date) lines.push(...blankGridLines(1), rightWithIndent(args.date, FIRST_LINE_INDENT * 2));
    return lines;
  }
  if (args["seal-mode"] === "seal") {
    if (!args.sender && !args.date) return [];
    const lines = [];
    if (args.sender) lines.push(rightWithIndent(args.sender, FIRST_LINE_INDENT * 2));
    if (args.date) lines.push(rightWithIndent(args.date, FIRST_LINE_INDENT * 2));
    return lines;
  }
  if (!args.sender && !args.date) return [];
  if (!args.sender || !args.date) return [right(args.sender || args.date)];
  const senderWidth = estimatedTextWidthDxa(args.sender);
  const dateWidth = estimatedTextWidthDxa(args.date);
  let senderRight = FIRST_LINE_INDENT;
  let dateRight = Math.max(0, senderWidth - dateWidth);
  if (dateWidth > senderWidth) {
    dateRight = FIRST_LINE_INDENT;
    senderRight = dateWidth - senderWidth + FIRST_LINE_INDENT;
  }
  return [
    paragraph(args.sender, { align: "right", indent: false, right: String(senderRight) }),
    paragraph(args.date, { align: "right", indent: false, right: String(dateRight) }),
  ];
}

function colophonTextRow(text, align = "left") {
  return `<w:tr><w:tc><w:tcPr><w:tcW w:w="${CONTENT_W}" w:type="dxa"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr>${paragraph(text, { align, firstLine: "-960", left: "1280", right: "320", fontPreset: "body", size: "28" })}</w:tc></w:tr>`;
}

function colophonRuleRow(thickness) {
  const heightMm = thickness === "thick" ? "0.35" : "0.25";
  return `<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="${mmToDxa(heightMm)}" w:hRule="exact"/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${CONTENT_W}" w:type="dxa"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr>${redRule(thickness)}</w:tc></w:tr>`;
}

function colophon(args) {
  if (!args["cc"] && !args["print-org"] && !args["print-date"]) return [];
  const body = [colophonRuleRow("thick")];
  if (args.cc) body.push(colophonTextRow(`抄送：${args.cc.replace(/[。．.]+$/, "")}。`));
  if (args.cc) body.push(colophonRuleRow("thin"));
  if (args["print-org"] || args["print-date"]) {
    const left = args["print-org"] ?? "";
    const rightValue = args["print-date"] ? `${args["print-date"].replace(/印发$/, "")}印发` : "";
    const printRow = `<w:p><w:pPr><w:jc w:val="both"/><w:ind w:left="320" w:right="320"/><w:tabs><w:tab w:val="right" w:pos="${CONTENT_W - 320}"/></w:tabs><w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/></w:pPr>${run(left, { fontPreset: "body", size: "28" })}<w:r><w:tab/></w:r>${run(rightValue, { fontPreset: "body", size: "28" })}</w:p>`;
    body.push(`<w:tr><w:tc><w:tcPr><w:tcW w:w="${CONTENT_W}" w:type="dxa"/><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar></w:tcPr>${printRow}</w:tc></w:tr>`);
  }
  body.push(colophonRuleRow("thick"));
  const tablePr = `<w:tblPr><w:tblpPr w:leftFromText="0" w:rightFromText="0" w:topFromText="0" w:bottomFromText="0" w:vertAnchor="margin" w:horzAnchor="margin" w:tblpXSpec="center" w:tblpYSpec="bottom"/><w:tblOverlap w:val="never"/><w:tblW w:w="${CONTENT_W}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  return [`<w:tbl>${tablePr}<w:tblGrid><w:gridCol w:w="${CONTENT_W}"/></w:tblGrid>${body.join("")}</w:tbl>`];
}

function emptyLine() {
  return `<w:p><w:pPr><w:spacing w:line="560" w:lineRule="exact"/></w:pPr></w:p>`;
}

function blankGridLine() {
  return paragraph("\u00a0", {
    align: "left",
    indent: false,
    fontPreset: "body",
    size: "2",
    line: "560",
    lineRule: "exact",
    snapToGrid: false,
    before: "0",
    after: "0",
  });
}

function blankGridLines(count = 2) {
  return Array.from({ length: count }, () => blankGridLine());
}

function tableXml(headers, rows, width = CONTENT_W) {
  const colCount = headers.length;
  const colWidth = Math.floor(width / colCount);
  const grid = Array.from({ length: colCount }, () => `<w:gridCol w:w="${colWidth}"/>`).join("");
  const tr = (cells, header = false) => {
    const trPr = header ? "<w:trPr><w:tblHeader/></w:trPr>" : "";
    return `<w:tr>${trPr}${cells.map((cell) => tableCell(cell, colWidth, header)).join("")}</w:tr>`;
  };
  return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders><w:tblLook w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${tr(headers, true)}${rows.map((row) => tr(row)).join("")}</w:tbl>`;
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
  return String(text ?? "").replace(/\s+/g, "").replace(/[：:]$/, "");
}

function isMatchingParagraph(block, text) {
  return (
    block?.type === "paragraph" &&
    normalizeSignatureText(block.text) === normalizeSignatureText(text)
  );
}

function isChineseDateParagraph(block) {
  if (block?.type !== "paragraph") return false;
  try {
    normalizeChineseDate(normalizeSignatureText(block.text), "source date");
    return true;
  } catch {
    return false;
  }
}

function validateDateParagraphs(blocks) {
  for (const block of blocks) {
    if (block?.type === "paragraph" && /^\d{4}年\d{1,2}月\d{1,2}日$/.test(normalizeSignatureText(block.text))) {
      normalizeChineseDate(normalizeSignatureText(block.text), "source date");
    }
  }
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

function attachmentPage(blocks, index, filePath, detachedDocNo = "") {
  const attachmentBlocks = [...blocks];
  let attachmentTitle = path.basename(filePath, path.extname(filePath));
  if (attachmentBlocks[0]?.type === "heading") {
    attachmentTitle = attachmentBlocks.shift().text;
  }
  const body = [
    paragraph(detachedDocNo ? `${detachedDocNo} 附件${index}` : `附件${index}`, { align: "left", indent: false, fontPreset: "h1", size: "32", pageBreakBefore: true, keepNext: true }),
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
  if (format === "formal" || format === "command" || format === "minutes" || format === "horizontal-table") return "standard";
  return "center";
}

function buildDocument(blocks, args) {
  let title = args.title;
  const format = ["ordinary", "formal", "letter", "command", "minutes", "horizontal-table"].includes(args.format) ? args.format : "ordinary";
  const letterhead = args.letterhead === "digital" ? "digital" : "preprinted";
  const pageNumberMode = resolvePageNumberMode(args, format);
  const horizontalTable = format === "horizontal-table" || args["horizontal-table"] === true || args["horizontal-table"] === "true";
  const horizontalContentWidth = mmToDxa(225);
  const body = [];
  let titleGapLines = 0;
  // All formats keep the standard 37 mm top white margin. Special formats
  // offset their marks inside the type area, measured from that boundary.
  const pageMarginTop = format === "letter" ? 1701 : 2098;
  const sourceBlocks = [...blocks];
  if (!title && sourceBlocks[0]?.type === "heading") {
    title = sourceBlocks.shift().text;
  }
  if (title && sourceBlocks[0]?.type === "heading" && sourceBlocks[0].text.trim() === title.trim()) {
    sourceBlocks.shift();
  }
  validateDateParagraphs(sourceBlocks);
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
    if (args["copy-no"] && !/^\d{1,6}$/.test(String(args["copy-no"]))) throw new Error("--copy-no must contain one to six Arabic digits");
    let headerFieldIndex = 0;
    if (args["copy-no"]) body.push(floatingHeaderFieldParagraph(String(args["copy-no"]).padStart(6, "0"), "body", headerFieldIndex++));
    else if (args.secret) body.push(floatingHeaderFieldParagraph("", "body", headerFieldIndex++));
    if (args.secret) body.push(floatingHeaderFieldParagraph(args.secret, "h1", headerFieldIndex++));
    if (args.urgent) body.push(floatingHeaderFieldParagraph(args.urgent, "h1", headerFieldIndex++));
    if (letterhead === "digital" && args.org) {
      // GB/T 9704-2012 7.2.4 fixes the agency mark at 35 mm below the
      // type-area top. Left-corner fields occupy their own column and must
      // not move the centered mark upward.
      const jointOrganizations = Array.isArray(args["joint-org"]) ? args["joint-org"].map((name) => String(name).trim()).filter(Boolean) : [];
      const agencyNames = [String(args.org).trim(), ...jointOrganizations];
      // GB/T 9704-2012 7.2.4 keeps joint agency names in order with the
      // host first. When “文件” is present it sits to the right of the
      // stacked names and is vertically centred against that name block.
      const host = String(args.org).trim();
      const jointNames = jointOrganizations.length && host.endsWith("文件")
        ? [host.slice(0, -2), ...jointOrganizations]
        : agencyNames;
      const agencyMarkSize = agencyNames.length > 1 ? (Math.max(...jointNames.map((name) => [...name].length)) > 10 ? "44" : "48") : "56";
      if (jointOrganizations.length) body.push(floatingJointAgencyTable(jointNames, agencyMarkSize, host.endsWith("文件")));
      else body.push(floatingAgencyMarkParagraph(agencyNames.join("　"), 1, agencyMarkSize));
      body.push(agencyMarkFlowSpacer(jointOrganizations.length ? Math.max(0, jointNames.length - 1) * 560 : 0));
      if (args["doc-no"]) body.push(...blankGridLines(2));
    }
    if (letterhead === "preprinted") {
      const reserve = Number(args["letterhead-reserve-mm"] ?? 72);
      if (!Number.isFinite(reserve) || reserve < 37 || reserve > 130) throw new Error("--letterhead-reserve-mm must be between 37 and 130");
      // The physical red-head paper already contains the agency mark and
      // separator. Its reserve is a paper-coordinate boundary, so optional
      // copy/secret/urgency fields must not shorten it.
      body.push(letterheadReserveParagraph(reserve));
    }
    if (args["doc-no"]) args["doc-no"] = normalizeDocumentNumber(args["doc-no"]);
    if (upward && args["doc-no"] && args.signer) body.push(upwardHeaderParagraph(args["doc-no"], args.signer));
    else if (args["doc-no"]) body.push(documentNumberParagraph(args["doc-no"], upward));
    if (letterhead === "digital" || args["preprinted-rule"] === "true") body.push(redRule());
    titleGapLines = 2;
  } else if (format === "letter") {
    if (!args.org) throw new Error("letter format requires --org");
    if (args["copy-no"] && !/^\d{1,6}$/.test(String(args["copy-no"]))) throw new Error("--copy-no must contain one to six Arabic digits");
    body.push(paragraph(args.org, { align: "center", indent: false, fontPreset: "title", size: "44", color: "FF0000", before: "0", after: "227" }));
    body.push(redDoubleRule({ upperMm: "0.35", lowerMm: "0.25" }));
    if (args["doc-no"]) args["doc-no"] = normalizeDocumentNumber(args["doc-no"]);
    const letterFields = [];
    if (args["copy-no"]) letterFields.push({ text: String(args["copy-no"]).padStart(6, "0"), fontPreset: "body" });
    else if (args.secret) letterFields.push({ text: "", fontPreset: "body" });
    if (args.secret) letterFields.push({ text: args.secret, fontPreset: "h1" });
    if (args.urgent) letterFields.push({ text: args.urgent, fontPreset: "h1" });
    if (letterFields.length || args["doc-no"]) {
      const first = letterFields[0] ?? { text: "", fontPreset: "body" };
      body.push(letterHeaderRow(first.text, args["doc-no"] ?? ""));
      for (const field of letterFields.slice(1)) {
        body.push(headerFieldParagraph(field.text, field.fontPreset));
      }
    }
    titleGapLines = 2;
  } else if (format === "command") {
    if (!args.org) throw new Error("command format requires --org");
    if (!/(?:命令|令)$/.test(String(args.org).trim())) throw new Error("command --org must end with“命令”or“令”");
    if (!args["doc-no"]) throw new Error("command format requires --doc-no for the 令号");
    // GB/T 9704-2012 10.2 measures the command mark from the top edge of
    // the type area, not from the paper edge: 37 mm + 20 mm from the page.
    body.push(paragraph(args.org, { align: "center", indent: false, fontPreset: "title", size: "44", color: "FF0000", before: String(mmToDxa(20)), after: "0" }));
    if (args["doc-no"]) {
      body.push(...blankGridLines(2));
      body.push(paragraph(args["doc-no"], { align: "center", indent: false, fontPreset: "body", size: "32", after: "0" }));
      body.push(...blankGridLines(2));
    }
  } else if (format === "minutes") {
    if (!args.org) throw new Error("minutes format requires --org (for XXXXX纪要)");
    if (!/纪要$/.test(String(args.org).trim())) throw new Error("minutes --org must end with“纪要”");
    body.push(paragraph(args.org, { align: "center", indent: false, fontPreset: "title", size: "44", color: "FF0000", before: "1984", after: "560" }));
  }
  if (args.date) args.date = normalizeChineseDate(args.date);
  if (args["print-date"]) args["print-date"] = normalizeChineseDate(args["print-date"], "--print-date", true);
  if (title) {
    if (titleGapLines) body.push(...blankGridLines(titleGapLines));
    body.push(titleParagraph(title));
  }
  if (args.subtitle) body.push(subtitleParagraph(args.subtitle));
  if (mainSend) body.push(mainSendParagraph(mainSend));

  for (const block of sourceBlocks) {
    if (block.type === "heading") {
      body.push(renderHeading(block));
      continue;
    }
    if (block.type === "table") {
      body.push(tableXml(block.headers, block.rows, horizontalTable ? horizontalContentWidth : CONTENT_W));
      body.push(emptyLine());
      continue;
    }
    body.push(renderParagraph(block));
  }
  if (args["attachment-note"]) {
    if (body.at(-1) === emptyLine()) body.pop();
    body.push(attachmentNote(args["attachment-note"]));
  }
  // GB/T 9704-2012 10.3 places attendance information one line below the
  // minutes body (or its attachment note), before any trailing signature or
  // note material. Keeping it here also makes the screenshot evidence match
  // the standard's “正文或附件说明下空一行” rule.
  if (format === "minutes" && args.attendees) body.push(minutesPersonParagraph("出席", args.attendees, "560"));
  if (format === "minutes" && args.absent) body.push(minutesPersonParagraph("请假", args.absent));
  if (format === "minutes" && args.observers) body.push(minutesPersonParagraph("列席", args.observers));
  if (args.sender || args.date) {
    body.push(...(args["seal-mode"] === "signed" ? blankGridLines(2) : [emptyLine()]));
    body.push(...signatureParagraphs(args));
  }
  if (args.note) body.push(paragraph(`（${args.note.replace(/^（|）$/g, "")}）`, { align: "left", fontPreset: "body", size: "32" }));
  const attachmentFiles = Array.isArray(args["attachment-file"]) ? args["attachment-file"] : args["attachment-file"] ? [args["attachment-file"]] : [];
  const absoluteAttachmentFiles = attachmentFiles.map((filePath) => {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) throw new Error(`attachment file not found: ${filePath}`);
    return absolutePath;
  });
  validateAttachmentConsistency(args["attachment-note"], absoluteAttachmentFiles);
  if (args["attachment-detached"] && !args["doc-no"]) throw new Error("--attachment-detached requires --doc-no so the detached attachment can carry the document number");
  absoluteAttachmentFiles.forEach((absolutePath, index) => {
    const attachmentBlocks = parseMarkdown(fs.readFileSync(absolutePath, "utf8"));
    body.push(attachmentPage(attachmentBlocks, index + 1, absolutePath, args["attachment-detached"] ? args["doc-no"] : ""));
  });
  if (format !== "letter") body.push(...colophon(args));
  const letterFooter = format === "letter" ? '<w:footerReference w:type="default" r:id="rIdLetterFooter"/>' : "";
  const footerRefs = letterFooter || (pageNumberMode === "standard"
    ? '<w:footerReference w:type="default" r:id="rIdFooterOdd"/><w:footerReference w:type="even" r:id="rIdFooterEven"/>'
    : pageNumberMode === "center"
      ? '<w:footerReference w:type="default" r:id="rIdFooterCenter"/>'
      : "");
  const footerDistance = format === "letter" || pageNumberMode === "standard" ? "1134" : "1588";
  const pageSize = horizontalTable
    ? `<w:pgSz w:w="${PAGE_H}" w:h="${PAGE_W}" w:orient="landscape"/>`
    : `<w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}"/>`;
  body.push(`<w:sectPr>${footerRefs}${pageSize}<w:pgMar w:top="${pageMarginTop}" w:right="${MARGIN.right}" w:bottom="${MARGIN.bottom}" w:left="${MARGIN.left}" w:header="720" w:footer="${footerDistance}" w:gutter="0"/><w:docGrid w:type="lines" w:linePitch="560"/></w:sectPr>`);
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

let args;
try {
  args = parseArgs(process.argv);
} catch (error) {
  console.error(`GENERATOR ERROR: ${error.message}`);
  process.exit(2);
}
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
  const format = ["ordinary", "formal", "letter", "command", "minutes", "horizontal-table"].includes(args.format) ? args.format : "ordinary";
  const pageNumberMode = resolvePageNumberMode(args, format);
  writeDocx(path.resolve(args.output), documentXml, pageNumberMode, format);
  console.log(`Generated: ${path.resolve(args.output)}`);
} catch (error) {
  console.error(`GENERATOR ERROR: ${error.message}`);
  process.exit(2);
}
