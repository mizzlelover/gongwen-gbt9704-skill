#!/usr/bin/env bash
set -euo pipefail

skill_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [output-directory]" >&2
  exit 2
fi
out_dir=${1:-$(mktemp -d "${TMPDIR:-/tmp}/gongwen-visual-audit.XXXXXX")}
mkdir -p "$out_dir/docx" "$out_dir/pdf" "$out_dir/png" "$out_dir/logs"
gen="$skill_dir/scripts/generate_gongwen_docx.mjs"
verify="$skill_dir/scripts/verify_gongwen_docx.mjs"
all="$skill_dir/tests/fixtures/visual-all.md"
long="$skill_dir/tests/fixtures/visual-long.md"
attach_a="$skill_dir/tests/fixtures/visual-attachment-a.md"
attach_b="$skill_dir/tests/fixtures/visual-attachment-b.md"
horizontal="$skill_dir/tests/fixtures/visual-horizontal.md"
calibration="$skill_dir/tests/fixtures/visual-calibration.md"

node "$gen" --input "$all" --output "$out_dir/docx/ordinary.docx" --format ordinary --title "普通材料全要素实测" --page-number center
node "$gen" --input "$all" --output "$out_dir/docx/formal-digital-all.docx" --format formal --letterhead digital --copy-no 7 --secret "机密★3年" --urgent "特急" --org "示例单位文件" --doc-no "示例发〔2026〕7号" --title "正式公文全要素实测" --to "各主送机关" --sender "示例单位" --date "2026年9月10日" --note "此件公开" --attachment-note "1. 数据清单；2. 实施计划。" --cc "办公室、财务部" --print-org "示例印发机关" --print-date "2026年9月10日" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-digital-upward.docx" --format formal --letterhead digital --org "示例单位文件" --doc-no "示例发〔2026〕8号" --title "上行文双签发人实测" --upward true --signer "张三、李四" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-preprinted.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --copy-no 7 --secret "机密★3年" --urgent "特急" --doc-no "示例发〔2026〕9号" --title "预印红头套打实测" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-seal.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --title "盖章公文实测" --sender "示例单位" --date "2026年9月10日" --seal-mode seal --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-signed.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --title "签名章公文实测" --sender "示例单位" --date "2026年9月10日" --seal-mode signed --signer-title "主要负责人" --signer "张三" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-unsigned.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --title "不盖章公文实测" --sender "示例单位" --date "2026年9月10日" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-attachments.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --doc-no "示例发〔2026〕10号" --title "多附件实测" --attachment-note "1. 数据清单；2. 实施计划。" --attachment-file "$attach_a" --attachment-file "$attach_b" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-attachments-detached.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --doc-no "示例发〔2026〕15号" --title "分离装订附件实测" --attachment-note "1. 数据清单；2. 实施计划。" --attachment-file "$attach_a" --attachment-file "$attach_b" --attachment-detached --page-number standard
node "$gen" --input "$long" --output "$out_dir/docx/formal-long.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --doc-no "示例发〔2026〕11号" --title "长文版记与单双页实测" --cc "办公室、财务部、审计部、采购部、法务部、信息中心" --print-org "示例印发机关" --print-date "2026年9月10日" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/formal-joint.docx" --format formal --letterhead digital --org "主办机关文件" --joint-org "协办机关一" --joint-org "协办机关二" --joint-org "协办机关三" --doc-no "示例发〔2026〕16号" --title "联合行文实测" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/letter.docx" --format letter --org "示例机关" --doc-no "示例〔2026〕12号" --title "信函格式实测" --page-number none
node "$gen" --input "$all" --output "$out_dir/docx/letter-fields.docx" --format letter --org "示例机关" --copy-no 7 --secret "机密★3年" --urgent "特急" --doc-no "示例〔2026〕14号" --title "信函版头字段实测" --page-number none
node "$gen" --input "$all" --output "$out_dir/docx/command.docx" --format command --org "示例机关命令" --doc-no "第1号" --title "命令格式实测" --page-number standard
node "$gen" --input "$all" --output "$out_dir/docx/minutes.docx" --format minutes --org "示例机关纪要" --title "纪要格式实测" --attendees "张三（办公室）、李四（财务部）" --absent "王五（审计部）" --observers "赵六（采购部）" --page-number standard
node "$gen" --input "$horizontal" --output "$out_dir/docx/table.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --doc-no "示例发〔2026〕13号" --title "表格版式实测" --page-number standard
node "$gen" --input "$horizontal" --output "$out_dir/docx/horizontal-table.docx" --format horizontal-table --title "横排表格实测" --page-number standard
node "$gen" --input "$calibration" --output "$out_dir/docx/ordinary-calibration.docx" --format ordinary --page-number center

for file in "$out_dir/docx"/*.docx; do
  base=$(basename "$file" .docx)
  case "$base" in
    ordinary|ordinary-calibration) profile=ordinary ;;
    letter|letter-fields) profile=letter ;;
    horizontal-table) profile=horizontal-table ;;
    command) profile=command ;;
    minutes) profile=minutes ;;
    *) profile=formal ;;
  esac
  case "$base" in
    formal-digital-*|formal-joint) letterhead=digital ;;
    *) letterhead=preprinted ;;
  esac
  node "$verify" --input "$file" --profile "$profile" --letterhead "$letterhead" >"$out_dir/logs/$base.verify.log"
done

if ! command -v soffice >/dev/null 2>&1 || ! command -v pdftoppm >/dev/null 2>&1; then
  echo "LibreOffice (soffice) and pdftoppm are required for screenshot audit." >&2
  exit 3
fi
soffice --headless --convert-to pdf --outdir "$out_dir/pdf" "$out_dir/docx"/*.docx >"$out_dir/logs/soffice.log" 2>&1
for file in "$out_dir/pdf"/*.pdf; do
  base=$(basename "$file" .pdf)
  pdftoppm -png -r 150 "$file" "$out_dir/png/$base" >"$out_dir/logs/$base.pdftoppm.log" 2>&1
done
node "$skill_dir/tests/measure-header-coordinates.mjs" \
  "$out_dir/pdf/formal-digital-all.pdf" \
  "$out_dir/pdf/formal-digital-upward.pdf" \
  "示例单位文件" "000007" | tee "$out_dir/logs/header-coordinates.log"

{
  echo -e "profile\tdocx\tpdf\tscreenshot_prefix"
  for file in "$out_dir/docx"/*.docx; do
    base=$(basename "$file" .docx)
    pages=$(pdfinfo "$out_dir/pdf/$base.pdf" | awk '/^Pages:/ {print $2}')
    echo -e "$base\t$file\t$out_dir/pdf/$base.pdf\t$out_dir/png/$base-1.png ... $out_dir/png/$base-$pages.png"
  done
} >"$out_dir/manifest.tsv"

echo "Visual audit complete: $out_dir"
cat "$out_dir/manifest.tsv"
