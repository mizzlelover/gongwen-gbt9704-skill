#!/bin/sh
set -eu

SKILL_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE=${NODE:-node}
TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/gongwen-test.XXXXXX")
trap 'rm -rf "$TMP_DIR"' EXIT

GEN="$SKILL_DIR/scripts/generate_gongwen_docx.mjs"
VERIFY="$SKILL_DIR/scripts/verify_gongwen_docx.mjs"
FIXTURE="$SKILL_DIR/tests/fixture.md"

"$NODE" --check "$GEN"
"$NODE" --check "$VERIFY"

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/layout.docx" --format ordinary --org "不应变红头的单位" --title "公文格式回归测试" --page-number center
"$NODE" "$VERIFY" --input "$TMP_DIR/layout.docx" --profile ordinary
unzip -t "$TMP_DIR/layout.docx" >/dev/null
! unzip -p "$TMP_DIR/layout.docx" word/document.xml | grep -q 'FF0000'
unzip -p "$TMP_DIR/layout.docx" word/styles.xml | grep -q 'styleId="Heading4"'
unzip -p "$TMP_DIR/layout.docx" word/document.xml | grep -q 'w:pStyle w:val="Heading4"'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/standard.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --org "示例单位文件" --doc-no "示例发〔2026〕1号" --title "公文格式回归测试" --page-number standard
"$NODE" "$VERIFY" --input "$TMP_DIR/standard.docx" --profile formal --letterhead preprinted
! unzip -p "$TMP_DIR/standard.docx" word/document.xml | grep -q '示例单位文件'
unzip -p "$TMP_DIR/standard.docx" word/document.xml | grep -q '示例发〔2026〕1号'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/digital.docx" --format formal --letterhead digital --org "示例单位文件" --doc-no "示例发〔2026〕1号" --title "电子红头测试" --page-number standard
"$NODE" "$VERIFY" --input "$TMP_DIR/digital.docx" --profile formal --letterhead digital
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q '示例单位文件'
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q 'FF0000'

if command -v soffice >/dev/null 2>&1; then
  mkdir -p "$TMP_DIR/pdf"
  soffice --headless --convert-to pdf --outdir "$TMP_DIR/pdf" "$TMP_DIR/layout.docx" >/dev/null 2>&1
  test -s "$TMP_DIR/pdf/layout.pdf"
fi

printf '%s\n' "gongwen regression tests passed"
