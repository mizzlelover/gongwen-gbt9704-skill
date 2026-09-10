---
name: gongwen
description: 将中文正式材料生成参照 GB/T 9704-2012 的公文版式 DOCX，支持机构名称、文号、正文、署名、日期和居中或单双页页码，并提供可选格式检查。
---

# 公文版式工具

## 标准依据与边界

GB/T 9704-2012《党政机关公文格式》现行，2025-05-30 复审继续有效。其适用于党政机关制发公文；其他机关、单位可以参照执行。

先读 `references/gbt9704-2012-summary.md`；需要逐项复核时再读 `references/gbt9704-audit-matrix.md` 和 `references/formal-checklist.md`。标准规定纸张、版面、要素编排和印制装订要求。

## 工具定位

本工具只处理排版，不判断单位身份、授权状态或后续盖章方式。它会根据用户明确选择的版式模式应用对应的排版规则，不因“正式”“国企”“报告”或仅提供机构名称而擅自使用红头。

生成器可输出 A4、156mm×225mm 版心、三号仿宋正文、小标宋二号标题、四级标题层次、两字缩进，以及居中或单双页页码。四级标题均写入 Word/WPS 标题样式和大纲级别，便于后续插入、更新目录；文章总标题使用独立“公文标题”样式，不进入目录。上行文的文号和签发人在同一行编排；信函、命令（令）、纪要使用各自专用版式；重复传入 `--attachment-file` 时，附件会另页生成并保持页码连续。版记会锚定最后一页版心底部，正式页码按版心下边缘下7mm的位置生成。

`references/formal-checklist.md` 是可选的版式复核清单。涉及印章或签名章时，使用者可在 Word/WPS 中插入已取得的图片或完成实体盖章；本生成器不内置印章图像。

## 生成打印稿

```bash
node scripts/generate_gongwen_docx.mjs --input source.md --output output.docx --format ordinary --title "文档标题"
```

普通材料使用 `--format ordinary`，默认居中页码，不绘制红头。正式发文须显式使用 `--format formal`；其默认 `--letterhead preprinted`，即首面预留红头纸区域、不在 DOCX 中重绘纸上已有的红色机关标志和红线。`--doc-no` 等本次需打印的黑色变量仍可保留。只有明确要求完整电子版时使用 `--letterhead digital`。完整电子红头要求目标环境存在可核对的小标宋体；生成器会在缺失时明确警告并记录实际替代字体，需要硬性阻止替代输出时加 `--require-standard-fonts`。红线下标题按28磅版心网格空二行。

```bash
# 预印红头纸套打；72mm 是默认机关标志区域高度，可按实际纸样调为 37—130mm
node scripts/generate_gongwen_docx.mjs --input source.md --output output.docx --format formal --letterhead preprinted --letterhead-reserve-mm 72 --org "发文机关名称" --doc-no "单位发〔2026〕1号" --title "文档标题" --sender "落款单位" --date "2026年9月9日"

# 完整电子红头版，仅在明确要求时使用
node scripts/generate_gongwen_docx.mjs --input source.md --output output.docx --format formal --letterhead digital --org "发文机关名称" --doc-no "单位发〔2026〕1号" --title "文档标题"
```

`letter`、`command`、`minutes` 分别对应信函、命令（令）、纪要格式；需要时显式传入 `--format` 和相应字段。正式发文默认单双页页码；`standard` 为单页右、双页左，`center` 与 `none` 供普通材料选择。

附件可重复传入 `--attachment-file attachment.md`。附件 Markdown 的首个一级标题会作为附件标题，第一页第一行写“附件1”（后续文件递增），第三行写标题，随后排正文；附件说明仍通过 `--attachment-note` 提供，工具会统一为“附件：”并去除末尾标点。复杂横排附件、不能与正文一起装订的附件和机关专用模板仍需在目标 Word/WPS 中核对。

正式版式的 `--doc-no` 采用“单位发〔2026〕1号”这类标准写法；`--date`、`--print-date` 采用“2026年9月9日”，月份和日期不补零。明显不符合这两类规则的输入会被拒绝，避免把错误字段排成看似规范的文件。

Markdown 标题优先按序数识别：`一、`、`（一）`、`1.`、`（1）`；序数缺失时才按 Markdown 层级映射。正文、四级标题均左空二字，回行顶格。标题字体在运行机器缺失时会明确报告并使用可见替代字体；打开文件时仍须确认目标 Office/WPS 的实际字体，不把普通宋体视作小标宋的等价替代。

## 验证

```bash
unzip -t output.docx
soffice --headless --convert-to pdf --outdir /tmp output.docx
node scripts/verify_gongwen_docx.mjs --input output.docx --profile formal --letterhead preprinted
# 目标电脑必须装有标准小标宋体和仿宋体时，再加严格字体校验
node scripts/verify_gongwen_docx.mjs --input output.docx --profile formal --letterhead digital --require-standard-fonts
```

校验器核验生成器可检查的版式要素，并按 `ordinary`、`formal`、`letter`、`command`、`minutes` 选择校验档案。输出后仍须在目标 Word/WPS 与实际打印条件下检查首页正文、分页、附件、表格、页码、红头纸套打和装订。

## 输出说明

- 版式检查通过后，可写“已按 GB/T 9704-2012 的相关版式参数生成”。
- 使用者可按实际用途决定是否采用 `formal-checklist.md` 逐项复核。
