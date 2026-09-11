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
"$NODE" --check "$SKILL_DIR/tests/measure-header-coordinates.mjs"

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
unzip -p "$TMP_DIR/standard.docx" word/document.xml | grep -q 'w:snapToGrid w:val="false"'
python3 - "$TMP_DIR/standard.docx" <<'PY'
import re
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    xml = archive.read("word/document.xml").decode()
paragraphs = re.findall(r'<w:p>[\s\S]*?</w:p>', xml)
doc_no_index = next(i for i, paragraph in enumerate(paragraphs) if '示例发〔2026〕1号' in paragraph)
gap = paragraphs[doc_no_index - 2:doc_no_index]
assert len(gap) == 2
assert all('w:line="560"' in paragraph and 'w:lineRule="exact"' in paragraph and 'w:snapToGrid w:val="false"' in paragraph for paragraph in gap)
PY

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/preprinted-minimum.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 37 --doc-no "示例发〔2026〕7号" --title "最小预印留白测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/preprinted-minimum.docx" --profile formal --letterhead preprinted
python3 - "$TMP_DIR/preprinted-minimum.docx" "$TMP_DIR/preprinted-malformed.docx" <<'PY'
import sys, zipfile
source, target = sys.argv[1:]
with zipfile.ZipFile(source) as src, zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as dst:
    for item in src.infolist():
        data = src.read(item.filename)
        if item.filename == 'word/document.xml':
            text = data.decode()
            old = '<w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/>'
            assert text.count(old) == 1
            text = text.replace(old, '<w:spacing w:before="0" w:after="0" w:line="560" w:lineRule="exact"/>', 1)
            data = text.encode()
        dst.writestr(item, data)
PY
if "$NODE" "$VERIFY" --input "$TMP_DIR/preprinted-malformed.docx" --profile formal >"$TMP_DIR/preprinted-malformed.out" 2>&1; then
  echo "malformed preprinted reserve unexpectedly passed" >&2
  exit 1
fi
grep -q 'Preprinted letterhead reserve' "$TMP_DIR/preprinted-malformed.out"

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/digital.docx" --format formal --letterhead digital --org "示例单位文件" --doc-no "示例发〔2026〕1号" --title "电子红头测试" --page-number standard
"$NODE" "$VERIFY" --input "$TMP_DIR/digital.docx" --profile formal --letterhead digital
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q '示例单位文件'
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q 'FF0000'
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q 'height:0.5mm'
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q 'w:framePr.*w:hAnchor="margin".*w:vAnchor="margin".*w:xAlign="center".*w:y="1984"'
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q 'w:before="0"'
unzip -p "$TMP_DIR/digital.docx" word/document.xml | grep -q 'w:snapToGrid w:val="false"'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/digital-fields.docx" --format formal --letterhead digital --copy-no 7 --secret "机密★3年" --urgent "特急" --org "示例单位文件" --doc-no "示例发〔2026〕3号" --title "版头字段定位测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/digital-fields.docx" --profile formal --letterhead digital
unzip -p "$TMP_DIR/digital-fields.docx" word/document.xml | grep -q 'w:framePr.*w:hAnchor="margin".*w:vAnchor="margin".*w:xAlign="left".*w:y="0"'
unzip -p "$TMP_DIR/digital-fields.docx" word/document.xml | grep -q 'w:framePr.*w:hAnchor="margin".*w:vAnchor="margin".*w:xAlign="left".*w:y="560"'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/secret-only.docx" --format formal --letterhead digital --secret "机密★3年" --org "示例单位文件" --doc-no "示例发〔2026〕5号" --title "密级首行留空测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/secret-only.docx" --profile formal --letterhead digital
unzip -p "$TMP_DIR/secret-only.docx" word/document.xml | grep -q 'w:framePr.*w:vAnchor="margin".*w:y="560"'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/preprinted-fields.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --copy-no 7 --secret "机密★3年" --urgent "特急" --doc-no "示例发〔2026〕4号" --title "预印字段定位测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/preprinted-fields.docx" --profile formal --letterhead preprinted
unzip -p "$TMP_DIR/preprinted-fields.docx" word/document.xml | grep -q 'w:before="1984"'

cat >"$TMP_DIR/attachment.md" <<'EOF'
# 附件一：测试附件

附件正文。
EOF
cat >"$TMP_DIR/main-send.md" <<'EOF'
各主送机关：

主送机关只应在输出中出现一次。
EOF
"$NODE" "$GEN" --input "$TMP_DIR/main-send.md" --output "$TMP_DIR/main-send.docx" --format formal --letterhead digital --org "示例单位文件" --doc-no "示例发〔2026〕2号" --title "主送机关匹配测试" --to "各主送机关"
test "$(unzip -p "$TMP_DIR/main-send.docx" word/document.xml | grep -o '各主送机关' | wc -l | tr -d ' ')" -eq 1

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/upward.docx" --format formal --letterhead digital --org "示例单位文件" --doc-no "示例发〔2026〕1号" --title "上行文测试" --upward true --signer "张三"
"$NODE" "$VERIFY" --input "$TMP_DIR/upward.docx" --profile formal --letterhead digital --upward true
unzip -p "$TMP_DIR/upward.docx" word/document.xml | grep -q '签发人：'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/letter.docx" --format letter --org "示例机关" --doc-no "示例〔2026〕1号" --title "信函测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/letter.docx" --profile letter
unzip -l "$TMP_DIR/letter.docx" | grep -q 'word/footerLetter.xml'
unzip -p "$TMP_DIR/letter.docx" word/footerLetter.xml | grep -q 'w:fill="FF0000"'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/with-attachment.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --doc-no "示例发〔2026〕1号" --title "附件测试" --attachment-note "1. 测试附件" --attachment-file "$TMP_DIR/attachment.md"
unzip -p "$TMP_DIR/with-attachment.docx" word/document.xml | grep -q '附件：1. 测试附件'
unzip -p "$TMP_DIR/with-attachment.docx" word/document.xml | grep -q 'w:pageBreakBefore'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/detached-attachment.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --doc-no "示例发〔2026〕1号" --title "分离附件测试" --attachment-note "1. 测试附件" --attachment-file "$TMP_DIR/attachment.md" --attachment-detached
unzip -p "$TMP_DIR/detached-attachment.docx" word/document.xml | grep -q '示例发〔2026〕1号 附件1'

if "$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/bad-attachment.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --doc-no "示例发〔2026〕6号" --title "附件一致性测试" --attachment-note "1. 另一份附件" --attachment-file "$TMP_DIR/attachment.md" >"$TMP_DIR/bad-attachment.out" 2>&1; then
  echo "mismatched attachment note unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'GENERATOR ERROR:' "$TMP_DIR/bad-attachment.out"

for bad_option in format letterhead page-number; do
  output="$TMP_DIR/invalid-$bad_option.out"
  if "$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/invalid-$bad_option.docx" --format ordinary --"$bad_option" "invalid-value" >"$output" 2>&1; then
    echo "invalid --$bad_option unexpectedly succeeded" >&2
    exit 1
  fi
  grep -q -- "--$bad_option" "$output"
done

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/command.docx" --format command --org "示例机关命令" --doc-no "第1号" --title "命令正文"
"$NODE" "$VERIFY" --input "$TMP_DIR/command.docx" --profile command

if "$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/bad-command.docx" --format command --org "示例机关" --doc-no "第1号" --title "命令正文" >"$TMP_DIR/bad-command.out" 2>&1; then
  echo "command without 命令/令 unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'GENERATOR ERROR:' "$TMP_DIR/bad-command.out"

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/minutes.docx" --format minutes --org "示例机关纪要" --title "纪要正文" --attendees "张三、李四" --absent "王五"
"$NODE" "$VERIFY" --input "$TMP_DIR/minutes.docx" --profile minutes
minutes_xml=$(unzip -p "$TMP_DIR/minutes.docx" word/document.xml)
test "${minutes_xml%%出席：*}" != "$minutes_xml"
test "${minutes_xml%%w:sectPr*}" != "$minutes_xml"
test "${minutes_xml%%出席：*}" != "${minutes_xml%%w:sectPr*}"

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/seal-layout.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --title "签章位置测试" --sender "示例机关" --date "2026年9月10日" --seal-mode seal
python3 - "$TMP_DIR/seal-layout.docx" <<'PY'
import sys, zipfile
from xml.etree import ElementTree as ET
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
    root=ET.fromstring(z.read('word/document.xml'))
for p in root.findall('.//w:p', ns):
    if ''.join(p.itertext()).strip() == '2026年9月10日':
        assert p.find('./w:pPr/w:ind', ns).attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}right'] == '1280'
        break
else:
    raise SystemExit('seal date paragraph with four-character right indent not found')
PY

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/signed-layout.docx" --format formal --letterhead preprinted --letterhead-reserve-mm 72 --title "签名章位置测试" --date "2026年9月10日" --seal-mode signed --signer-title "主要负责人" --signer "张三"
python3 - "$TMP_DIR/signed-layout.docx" <<'PY'
import sys, zipfile
from xml.etree import ElementTree as ET
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
    root=ET.fromstring(z.read('word/document.xml'))
for p in root.findall('.//w:p', ns):
    if ''.join(p.itertext()).strip() == '2026年9月10日':
        assert p.find('./w:pPr/w:ind', ns).attrib['{http://schemas.openxmlformats.org/wordprocessingml/2006/main}right'] == '1280'
        break
else:
    raise SystemExit('signed date paragraph with four-character right indent not found')
PY

if "$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/bad-doc-no.docx" --format formal --letterhead digital --org "示例单位文件" --doc-no "示例发〔2026〕01号" --title "非法文号" >"$TMP_DIR/bad-doc-no.out" 2>&1; then
  echo "invalid document number unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'GENERATOR ERROR:' "$TMP_DIR/bad-doc-no.out"

if "$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/bad-date.docx" --format formal --letterhead preprinted --date "2026年09月10日" --title "非法日期" >"$TMP_DIR/bad-date.out" 2>&1; then
  echo "invalid date unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'GENERATOR ERROR:' "$TMP_DIR/bad-date.out"

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/letter-fields.docx" --format letter --org "示例机关" --copy-no 7 --secret "机密★3年" --urgent "特急" --doc-no "示例〔2026〕2号" --title "信函字段边界"
"$NODE" "$VERIFY" --input "$TMP_DIR/letter-fields.docx" --profile letter
unzip -p "$TMP_DIR/letter-fields.docx" word/document.xml | grep -q '000007'
unzip -p "$TMP_DIR/letter-fields.docx" word/document.xml | grep -q '机密★3年'

"$NODE" "$GEN" --input "$SKILL_DIR/tests/fixtures/visual-horizontal.md" --output "$TMP_DIR/horizontal-table.docx" --format horizontal-table --title "横排表格测试" --page-number standard
"$NODE" "$VERIFY" --input "$TMP_DIR/horizontal-table.docx" --profile horizontal-table
unzip -p "$TMP_DIR/horizontal-table.docx" word/document.xml | grep -q 'w:orient="landscape"'
unzip -p "$TMP_DIR/horizontal-table.docx" word/document.xml | grep -q 'w:tblW w:w="12756"'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/joint.docx" --format formal --letterhead digital --org "主办机关文件" --joint-org "协办机关" --doc-no "示例发〔2026〕3号" --title "联合行文测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/joint.docx" --profile formal --letterhead digital
unzip -p "$TMP_DIR/joint.docx" word/document.xml | grep -q '主办机关'
unzip -p "$TMP_DIR/joint.docx" word/document.xml | grep -q '协办机关'
unzip -p "$TMP_DIR/joint.docx" word/document.xml | grep -q '文件'
unzip -p "$TMP_DIR/joint.docx" word/document.xml | grep -q 'w:sz w:val="48"'

"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/joint-four-agencies.docx" --format formal --letterhead digital --org "主办机关文件" --joint-org "协办机关一" --joint-org "协办机关二" --joint-org "协办机关三" --doc-no "示例发〔2026〕4号" --title "四机关联合行文测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/joint-four-agencies.docx" --profile formal --letterhead digital
"$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/joint-without-file-suffix.docx" --format formal --letterhead digital --org "主办机关" --joint-org "协办机关" --doc-no "示例发〔2026〕5号" --title "无文件后缀联合行文测试"
"$NODE" "$VERIFY" --input "$TMP_DIR/joint-without-file-suffix.docx" --profile formal --letterhead digital
python3 - "$TMP_DIR/joint.docx" "$TMP_DIR/joint-four-agencies.docx" <<'PY'
import re
import sys
import zipfile

for filename, expected_count in ((sys.argv[1], 2), (sys.argv[2], 4)):
    with zipfile.ZipFile(filename) as archive:
        xml = archive.read("word/document.xml").decode()
    tables = re.findall(r'<w:tbl>[\s\S]*?<w:tblpPr[^>]*w:tblpY="1984"[\s\S]*?</w:tbl>', xml)
    assert len(tables) == 1, filename
    table = tables[0]
    assert table.count('<w:vAlign w:val="center"/>') >= 2, filename
    assert table.count('<w:tc>') == 2, filename
    assert table.count('<w:p>') == expected_count + 1, filename
    assert '<w:t xml:space="preserve">文件</w:t>' in table, filename
PY
python3 - "$TMP_DIR/joint-without-file-suffix.docx" <<'PY'
import re
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    xml = archive.read("word/document.xml").decode()
tables = re.findall(r'<w:tbl>[\s\S]*?<w:tblpPr[^>]*w:tblpY="1984"[\s\S]*?</w:tbl>', xml)
assert len(tables) == 1
table = tables[0]
assert table.count('<w:vAlign w:val="center"/>') >= 1
assert '<w:t xml:space="preserve">文件</w:t>' not in table
PY

if "$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/missing-joint-name.docx" --format formal --letterhead digital --org "主办机关文件" --joint-org --doc-no "示例发〔2026〕4号" --title "缺少联署机关名称" >"$TMP_DIR/missing-joint-name.out" 2>&1; then
  echo "missing joint agency name unexpectedly succeeded" >&2
  exit 1
fi
grep -q 'GENERATOR ERROR: --joint-org requires a value' "$TMP_DIR/missing-joint-name.out"

if "$NODE" "$GEN" --input "$FIXTURE" --output "$TMP_DIR/strict.docx" --format formal --letterhead digital --org "示例单位文件" --title "严格字体测试" --require-standard-fonts >"$TMP_DIR/strict.out" 2>&1; then
  if ! fc-list -f '%{family}\n' | grep -Eq '方正小标宋简体|方正小标宋_GBK|FZXiaoBiaoSong'; then
    echo "strict font mode unexpectedly succeeded without a small-standard-title font" >&2
    exit 1
  fi
elif ! grep -q 'FONT ERROR:' "$TMP_DIR/strict.out"; then
  cat "$TMP_DIR/strict.out" >&2
  echo "strict font mode failed for an unexpected reason" >&2
  exit 1
fi

if command -v soffice >/dev/null 2>&1; then
  mkdir -p "$TMP_DIR/pdf"
  soffice --headless --convert-to pdf --outdir "$TMP_DIR/pdf" "$TMP_DIR/layout.docx" >/dev/null 2>&1
  test -s "$TMP_DIR/pdf/layout.pdf"
fi

printf '%s\n' "gongwen regression tests passed"
