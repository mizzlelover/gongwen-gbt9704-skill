#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  console.log("Usage: node verify_gongwen_docx.mjs --input file.docx [--profile ordinary|formal|letter|command|minutes|horizontal-table] [--letterhead preprinted|digital] [--require-standard-fonts]");
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
  try { return execFileSync("unzip", ["-p", file, part], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); }
  catch (error) { if (optional) return ""; throw error; }
}

function paragraphs(xml) { return xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? []; }

const args = parseArgs(process.argv);
if (!args.input || !fs.existsSync(args.input)) { usage(); process.exit(2); }
const profile = args.profile ?? "ordinary";
if (!["ordinary", "formal", "letter", "command", "minutes", "horizontal-table"].includes(profile)) { console.error("Unsupported profile."); process.exit(2); }

const doc = readPart(args.input, "word/document.xml");
const styles = readPart(args.input, "word/styles.xml");
const footerOdd = readPart(args.input, "word/footerOdd.xml", true);
const footerEven = readPart(args.input, "word/footerEven.xml", true);
const footerCenter = readPart(args.input, "word/footerCenter.xml", true);
const footerLetter = readPart(args.input, "word/footerLetter.xml", true);
const requireStandardFonts = args["require-standard-fonts"] === true;
const installedFonts = (() => {
  try {
    return new Set(execFileSync("fc-list", ["-f", "%{family}\n"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split(/\r?\n/).flatMap((line) => line.split(",")).map((font) => font.trim()).filter(Boolean));
  } catch {
    const families = new Set();
    const aliases = { simfang: "FangSong", simfangb: "FangSong_GB2312", fangsong: "FangSong", fangsong_gb2312: "FangSong_GB2312", "fzxiaobiaosong-b05s": "FZXiaoBiaoSong-B05S", "fzxiaobiaosong-b13s": "FZXiaoBiaoSong-B13S" };
    const roots = [process.env.WINDIR ? path.join(process.env.WINDIR, "Fonts") : "", process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "Windows", "Fonts") : "", path.join(os.homedir(), "Library", "Fonts"), "/Library/Fonts", "/usr/share/fonts", "/usr/local/share/fonts"].filter(Boolean);
    const walk = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(?:ttf|ttc|otf)$/i.test(entry.name)) {
          const stem = path.basename(entry.name, path.extname(entry.name));
          families.add(stem);
          if (aliases[stem.toLowerCase()]) families.add(aliases[stem.toLowerCase()]);
        }
      }
    };
    roots.forEach(walk);
    return families;
  }
})();
const checks = [];
function check(name, ok, detail) { checks.push({ name, ok, detail }); }

const horizontal = profile === "horizontal-table";
check("A4 page size", horizontal ? /<w:pgSz[^>]*w:w="16838"[^>]*w:h="11906"[^>]*w:orient="landscape"/.test(doc) : /<w:pgSz[^>]*w:w="11906"[^>]*w:h="16838"/.test(doc), horizontal ? "297 mm x 210 mm landscape table page" : "210 mm x 297 mm");
const expectedTopMargin = profile === "letter" ? "1701" : "2098";
check("Page margins", new RegExp(`<w:pgMar[^>]*w:top="${expectedTopMargin}"[^>]*w:right="1474"[^>]*w:bottom="1984"[^>]*w:left="1588"`).test(doc), `top ${expectedTopMargin === "2098" ? 37 : 30} mm, bottom 35, left 28, right 26 mm`);
check("Document grid", /<w:docGrid[^>]*w:linePitch="560"/.test(doc), "28 pt implementation grid");
const bodyFontStandard = /w:eastAsia="(?:仿宋|仿宋_GB2312|FangSong|FangSong_GB2312)"/.test(styles);
const bodyFontAvailable = bodyFontStandard || (!requireStandardFonts && /w:eastAsia="STFangsong"/.test(styles));
check("Default body font", bodyFontAvailable && /<w:sz w:val="32"/.test(styles), requireStandardFonts ? "3rd-size FangSong is required" : "3rd-size FangSong requested; STFangsong fallback is allowed unless strict mode is enabled");
if (requireStandardFonts) {
  check("Installed small-standard-title font", ["方正小标宋简体", "方正小标宋_GBK", "FZXiaoBiaoSong-B05S", "FZXiaoBiaoSong-B13S"].some((font) => installedFonts.has(font)), "target machine must provide a small-standard-title font");
  check("Installed FangSong font", ["仿宋", "仿宋_GB2312", "FangSong", "FangSong_GB2312"].some((font) => installedFonts.has(font)), "target machine must provide a standard FangSong font");
}
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

const isExplicitBlankGridLine = (p) => /w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/.test(p) && /w:sz w:val="2"/.test(p) && /<w:t[^>]*> <\/w:t>/.test(p);
const firstTitleIndex = paragraphs(doc).findIndex((p) => /w:pStyle w:val="GongwenTitle"/.test(p));
const titlePrecedingParagraphs = firstTitleIndex < 0 ? [] : paragraphs(doc).slice(0, firstTitleIndex);
const titleGapParagraphs = titlePrecedingParagraphs.slice(-2);
const hasExplicitTwoLineTitleGap = titleGapParagraphs.length === 2 && titleGapParagraphs.every(isExplicitBlankGridLine);
check("Title has two explicit blank grid lines", !["formal", "letter"].includes(profile) || hasExplicitTwoLineTitleGap, "title is preceded by two exact 28-point blank paragraphs");
if (/附件：/.test(textOf(doc))) check("Attachment-note continuation indent", /w:firstLine="-960"[^>]*w:left="1600"/.test(doc), "附件说明回行与名称首字对齐");

if (profile === "ordinary") {
  check("No formal red-head drawing", !/w:color w:val="FF0000"/.test(doc), "ordinary output has no red head or red rule");
  check("Centered layout footer", /w:jc w:val="center"/.test(footerCenter) && /w:instr="PAGE"/.test(footerCenter), "ordinary output uses centered page number");
} else if (profile === "letter") {
  check("Letter first-page page number", !footerCenter && !footerOdd && !footerEven && !/w:instr="PAGE"/.test(footerLetter), "letter output suppresses page numbers");
  check("Letter upper red double rule", (footerLetter.match(/w:fill="FF0000"/g) ?? []).length >= 2 && /w:tblW[^>]*w:w="9638"/.test(doc), "letter output contains 170 mm red double rules");
  check("Letter upper rule distance", /w:after="227"/.test(paragraphs(doc)[0] ?? ""), "top red double rule is 4 mm below the agency mark");
  check("Letter bottom rule footer", /rIdLetterFooter/.test(doc) && /w:footer="1134"/.test(doc), "bottom red double rule is anchored 20 mm from the paper edge");
} else {
  check("Odd/even page fields", /w:instr="PAGE"/.test(footerOdd) && /w:instr="PAGE"/.test(footerEven), "odd and even page footers exist");
  check("Odd/even page positions", /w:jc w:val="right"/.test(footerOdd) && /w:jc w:val="left"/.test(footerEven), "odd right and even left");
  check("Formal page-number distance", /w:footer="1134"/.test(doc), "page-number footer is 7 mm below the 225 mm type area");
}
if (horizontal) {
  check("Horizontal table width", /<w:tblW w:w="12756" w:type="dxa"/.test(doc), "table uses the 225 mm landscape writing width");
}
if (profile === "formal") {
  if (args.letterhead === "digital") {
    check("Digital red head", /w:color w:val="FF0000"/.test(doc), "digital formal output contains requested red elements");
    check("Red rule thickness", /height:0\.5mm/.test(doc), "header separator uses the recommended 0.35-0.5 mm range");
    check("Red rule width", /style="width:156mm;height:0\.5mm"/.test(doc), "header separator spans the 156 mm type area");
    const docParagraphs = paragraphs(doc);
    const agencyIndex = docParagraphs.findIndex((p) => /w:sz w:val="(?:56|48|44)"/.test(p) && /w:color w:val="FF0000"/.test(p));
    const jointAgencyTable = doc.match(/<w:tbl>[\s\S]*?<w:tblpPr[^>]*w:vertAnchor="margin"[^>]*w:horzAnchor="margin"[^>]*w:tblpXSpec="center"[^>]*w:tblpY="1984"[\s\S]*?<\/w:tbl>/)?.[0] ?? "";
    // Keep this expected value independent from the generator's calibration
    // constants. It is 35 mm in twentieths of a point, as required by 7.2.4.
    const agencyOffsetFromTypeAreaTop = Math.round(35 * 56.692913);
    const agencyFrameOk = agencyIndex >= 0
      && new RegExp(`w:framePr[^>]*w:hAnchor="margin"[^>]*w:vAnchor="margin"[^>]*w:xAlign="center"[^>]*w:y="${agencyOffsetFromTypeAreaTop}"`).test(docParagraphs[agencyIndex])
      && /w:before="0"/.test(docParagraphs[agencyIndex]);
    const jointAgencyFrameOk = Boolean(jointAgencyTable) && new RegExp(`w:tblpY="${agencyOffsetFromTypeAreaTop}"`).test(jointAgencyTable);
    check("Digital red-head agency position", agencyFrameOk || jointAgencyFrameOk, "agency mark is independently fixed 35 mm below the type-area top");
    if (jointAgencyTable) {
      const jointRows = (jointAgencyTable.match(/<w:p>/g) ?? []).length;
      const hasFileCell = /<w:t[^>]*>文件<\/w:t>/.test(jointAgencyTable);
      const centeredCells = (jointAgencyTable.match(/w:vAlign w:val="center"/g) ?? []).length;
      check("Joint agency vertical layout", jointRows >= 2 && centeredCells >= (hasFileCell ? 2 : 1) && /w:color w:val="FF0000"/.test(jointAgencyTable), hasFileCell ? "joint names are stacked and 文件 is vertically centered in a right-side cell" : "joint names are stacked and vertically centered");
    }
    const fixedHeaderFrames = docParagraphs
      .filter((p) => /w:framePr[^>]*w:hAnchor="margin"[^>]*w:vAnchor="margin"/.test(p))
      .map((p) => Number((p.match(/w:y="(\d+)"/) ?? [])[1]))
      .filter((value) => Number.isFinite(value));
    check("Digital red-head field frames", fixedHeaderFrames.every((value, index) => value === index * 560 || value === agencyOffsetFromTypeAreaTop), "left-corner fields use first-line grid positions without changing the agency mark anchor");
    const docNoIndex = docParagraphs.findIndex((p) => /〔\d{4}〕[1-9]\d*号/.test(textOf(p)));
    const agencyBoundary = agencyIndex >= 0 ? agencyIndex + 1 : jointAgencyTable ? 0 : -1;
    const agencyToDocNo = agencyBoundary >= 0 && docNoIndex > agencyBoundary ? docParagraphs.slice(agencyBoundary, docNoIndex) : [];
    const agencyFlowSpacer = agencyToDocNo.filter((p) => /w:before="[1-9]\d*"/.test(p) && /w:snapToGrid w:val="false"/.test(p));
    const agencyGapLines = agencyToDocNo.slice(-2);
    check("Agency mark to document number two blank lines", docNoIndex < 0 || (agencyFlowSpacer.length === 1 && agencyGapLines.length === 2 && agencyGapLines.every(isExplicitBlankGridLine)), "document number follows the fixed agency mark with two exact 28-point grid lines");
    check("Two blank lines below red rule", hasExplicitTwoLineTitleGap, "title is preceded by two exact 28-point blank paragraphs below the red rule");
    if (docNoIndex >= 0) check("Document number syntax", /〔\d{4}〕[1-9]\d*号/.test(textOf(docParagraphs[docNoIndex])) && !/第/.test(textOf(docParagraphs[docNoIndex])), "year uses full digits, sequence has no 第 or leading zero, and ends with 号");
    if (args.upward === "true") {
      check("Upward document number and signer share one row", paragraphs(doc).some((p) => /签发人：/.test(textOf(p)) && /〔|\[|文号|发/.test(textOf(p))), "signer is in the same paragraph row as the document number");
    }
  } else {
    const preprintedParagraphs = paragraphs(doc);
    const reserveCandidate = (p) => /w:jc w:val="left"/.test(p)
      && /w:line="1"/.test(p)
      && /w:lineRule="exact"/.test(p)
      && /w:snapToGrid w:val="false"/.test(p)
      && /w:sz w:val="2"/.test(p)
      && /<w:t[^>]*> <\/w:t>/.test(p);
    const reserveIndex = preprintedParagraphs.findIndex(reserveCandidate);
    const reserveParagraph = reserveIndex >= 0 ? preprintedParagraphs[reserveIndex] : "";
    const reserveSpacing = reserveParagraph.match(/<w:spacing\b[^>]*>/)?.[0] ?? "";
    const reserveBefore = Number((reserveSpacing.match(/w:before="(\d+)"/) ?? [])[1]);
    const reserveBeforeInRange = Number.isFinite(reserveBefore) && reserveBefore >= 0 && reserveBefore <= Math.round((130 - 37) * 56.692913);
    const priorParagraphsAreFloating = reserveIndex >= 0 && preprintedParagraphs.slice(0, reserveIndex).every((p) => /w:framePr\b/.test(p));
    const preprintedReserveParagraph = reserveIndex >= 0
      && priorParagraphsAreFloating
      && reserveBeforeInRange;
    check("Preprinted letterhead reserve", preprintedReserveParagraph, "first non-floating body paragraph reserves 37-130 mm paper-top agency-mark space");
    const titleXmlStart = firstTitleIndex < 0 ? doc.length : doc.indexOf(preprintedParagraphs[firstTitleIndex]);
    const preprintedHeaderXml = titleXmlStart < 0 ? doc : doc.slice(0, titleXmlStart);
    check("No red drawing for preprinted letterhead", !/w:color w:val="FF0000"/.test(preprintedHeaderXml), "preprinted mode does not redraw red letterhead or rule");
    const preprintedDocNoIndex = preprintedParagraphs.findIndex((p) => /〔\d{4}〕[1-9]\d*号/.test(textOf(p)));
    const preprintedDocNoGap = preprintedDocNoIndex >= 0 ? preprintedParagraphs.slice(0, preprintedDocNoIndex).slice(-2) : [];
    check("Preprinted agency-to-document number two blank lines", preprintedDocNoIndex < 0 || (preprintedDocNoGap.length === 2 && preprintedDocNoGap.every(isExplicitBlankGridLine)), "document number starts below the reserved physical agency mark block");
    check("Title spacing below physical red rule", hasExplicitTwoLineTitleGap, "title is preceded by two exact 28-point blank paragraphs below the printed red rule");
  }
}
if (profile === "letter") {
  check("Letter title spacing", hasExplicitTwoLineTitleGap, "title is preceded by two exact 28-point blank paragraphs below the red rule");
  const letterDocNo = paragraphs(doc).find((p) => /〔\d{4}〕[1-9]\d*号/.test(textOf(p)));
  if (letterDocNo) check("Letter document number distance", /w:before="280"/.test(letterDocNo), "document number is 3号汉字高度7/8 below the first red double line");
}
if (profile === "command") {
  const commandParagraphs = paragraphs(doc);
  const commandAgencyIndex = commandParagraphs.findIndex((p) => /w:color w:val="FF0000"/.test(p));
  check("Command agency position", commandAgencyIndex >= 0 && /w:before="1134"/.test(commandParagraphs[commandAgencyIndex]), "command mark starts 20 mm below the 37 mm type-area top");
  const commandOrderIndex = commandParagraphs.findIndex((p, index) => index > commandAgencyIndex && /w:jc w:val="center"/.test(p) && /w:sz w:val="32"/.test(p) && !/w:color w:val="FF0000"/.test(p));
  const agencyToOrder = commandAgencyIndex >= 0 && commandOrderIndex > commandAgencyIndex ? commandParagraphs.slice(commandAgencyIndex + 1, commandOrderIndex) : [];
  check("Command agency-to-order spacing", commandOrderIndex < 0 || (agencyToOrder.length === 2 && agencyToOrder.every(isExplicitBlankGridLine)), "command agency mark is followed by two exact 28-point grid lines");
  const commandTitleIndex = firstTitleIndex;
  const orderToBody = commandOrderIndex >= 0 && commandTitleIndex > commandOrderIndex ? commandParagraphs.slice(commandOrderIndex + 1, commandTitleIndex) : [];
  check("Command order-to-body spacing", commandTitleIndex < 0 || (orderToBody.length === 2 && orderToBody.every(isExplicitBlankGridLine)), "command number is followed by two exact 28-point grid lines");
}
if (profile === "minutes") {
  const attendance = paragraphs(doc).filter((p) => /(?:出席|请假|列席)：/.test(textOf(p)));
  check("Minutes attendance label font", attendance.every((p) => /w:eastAsia="(?:黑体|SimHei|Heiti SC|STHeiti)"/.test(p)), attendance.length ? `${attendance.length} attendance paragraph(s)` : "not present in this document");
  check("Minutes attendee font", attendance.every((p) => /w:eastAsia="(?:仿宋|仿宋_GB2312|FangSong|FangSong_GB2312|STFangsong)"/.test(p)), attendance.length ? "people runs use FangSong" : "not present in this document");
  check("Minutes attendance indentation", attendance.every((p) => /w:firstLine="-1280"[^>]*w:left="1920"/.test(p)), attendance.length ? "labels start two characters in and wrapped names align after the label" : "not present in this document");
}
const redRules = doc.match(/height:(?:0\.35|0\.25|0\.5)mm/g) ?? [];
if (["formal", "command", "minutes"].includes(profile)) {
  const hasColophon = /抄送：|印发/.test(textOf(doc));
  check("Colophon line thickness model", !hasColophon || (redRules.includes("height:0.35mm") && redRules.includes("height:0.25mm")), "版记粗线0.35 mm、细线0.25 mm");
  if (hasColophon) check("Colophon bottom anchor", /w:vertAnchor="margin"[^>]*w:horzAnchor="margin"[^>]*w:tblpYSpec="bottom"/.test(doc), "版记浮动表锚定在最后一页版心底部且禁止重叠");
  if (/抄送：/.test(textOf(doc))) check("Colophon continuation indent", /w:firstLine="-960"[^>]*w:left="1280"/.test(doc), "抄送回行与冒号后的首字对齐");
  if (hasColophon) check("Colophon print-row right tab", /w:tab w:val="right"/.test(doc), "印发机关和日期使用右制表位");
}

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}: ${item.detail}`);
const failed = checks.filter((item) => !item.ok);
if (failed.length) { console.error(`Verification failed: ${failed.length} item(s).`); process.exit(1); }
console.log(`Verification passed (${profile} profile): ${checks.length} item(s).`);
