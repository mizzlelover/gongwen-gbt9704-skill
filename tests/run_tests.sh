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

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/layout.docx" --title "公文格式回归测试" --page-number center
"$NODE" "$VERIFY" --input "$TMP_DIR/layout.docx" --profile layout
unzip -t "$TMP_DIR/layout.docx" >/dev/null

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/standard.docx" --org "示例单位文件" --doc-no "示例发〔2026〕1号" --title "公文格式回归测试" --page-number standard
"$NODE" "$VERIFY" --input "$TMP_DIR/standard.docx" --profile standard-pages
unzip -p "$TMP_DIR/standard.docx" word/document.xml | grep -q '示例单位文件'
unzip -p "$TMP_DIR/standard.docx" word/document.xml | grep -q '示例发〔2026〕1号'

if command -v soffice >/dev/null 2>&1; then
  mkdir -p "$TMP_DIR/pdf"
  soffice --headless --convert-to pdf --outdir "$TMP_DIR/pdf" "$TMP_DIR/layout.docx" >/dev/null 2>&1
  test -s "$TMP_DIR/pdf/layout.pdf"
fi

printf '%s\n' "gongwen regression tests passed"
