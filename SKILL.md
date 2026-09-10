---
name: gongwen
description: 将中文正式材料生成参照 GB/T 9704-2012 的公文版式 DOCX，支持机构名称、文号、正文、署名、日期和居中或单双页页码，并提供可选格式检查。
---

# 公文版式工具

## 标准依据与边界

GB/T 9704-2012《党政机关公文格式》现行，2025-05-30 复审继续有效。其适用于党政机关制发公文；其他机关、单位可以参照执行。

先读 `references/gbt9704-2012-summary.md`；需要逐项复核时再读 `references/formal-checklist.md`。标准规定纸张、版面、要素编排和印制装订要求。

## 工具定位

本工具只处理排版，不判断单位身份、授权状态或后续盖章方式。它会根据用户明确选择的版式模式应用对应的排版规则，不因“正式”“国企”“报告”或仅提供机构名称而擅自使用红头。

生成器可输出 A4、156mm×225mm 版心、三号仿宋正文、小标宋二号标题、四级标题层次、两字缩进，以及居中或单双页页码。四级标题均写入 Word/WPS 标题样式和大纲级别，便于后续插入、更新目录；文章总标题使用独立“公文标题”样式，不进入目录。

`references/formal-checklist.md` 是可选的版式复核清单。涉及印章或签名章时，使用者可在 Word/WPS 中插入已取得的图片或完成实体盖章；本生成器不内置印章图像。

## 生成打印稿

```bash
node scripts/generate_gongwen_docx.mjs --input source.md --output output.docx --format ordinary --title "文档标题"
```

普通材料使用 `--format ordinary`，默认居中页码，不绘制红头。正式发文须显式使用 `--format formal`；其默认 `--letterhead preprinted`，即首面预留红头纸区域、不在 DOCX 中重绘纸上已有的红色机关标志和红线。`--doc-no` 等本次需打印的黑色变量仍可保留。只有明确要求完整电子版时使用 `--letterhead digital`。

```bash
# 预印红头纸套打；72mm 是默认机关标志区域高度，可按实际纸样调为 37—130mm
node scripts/generate_gongwen_docx.mjs --input source.md --output output.docx --format formal --letterhead preprinted --letterhead-reserve-mm 72 --org "发文机关名称" --doc-no "单位发〔2026〕1号" --title "文档标题" --sender "落款单位" --date "2026年9月9日"

# 完整电子红头版，仅在明确要求时使用
node scripts/generate_gongwen_docx.mjs --input source.md --output output.docx --format formal --letterhead digital --org "发文机关名称" --doc-no "单位发〔2026〕1号" --title "文档标题"
```

`letter`、`command`、`minutes` 分别对应信函、命令（令）、纪要格式；需要时显式传入 `--format` 和相应字段。正式发文默认单双页页码；`standard` 为单页右、双页左，`center` 与 `none` 供普通材料选择。

Markdown 标题优先按序数识别：`一、`、`（一）`、`1.`、`（1）`；序数缺失时才按 Markdown 层级映射。正文、四级标题均左空二字，回行顶格。标题字体在运行机器缺失时，会保留请求的字体名；打开文件时仍须确认 Office 的实际替代字体，不把普通宋体视作小标宋的等价替代。

## 验证

```bash
unzip -t output.docx
soffice --headless --convert-to pdf --outdir /tmp output.docx
node scripts/verify_gongwen_docx.mjs --input output.docx --profile formal --letterhead preprinted
```

校验器核验生成器可检查的版式要素，并按 `ordinary`、`formal`、`letter`、`command`、`minutes` 选择校验档案。输出后仍须在目标 Word/WPS 与实际打印条件下检查首页正文、分页、附件、表格、页码、红头纸套打和装订。

## 输出说明

- 版式检查通过后，可写“已按 GB/T 9704-2012 的相关版式参数生成”。
- 使用者可按实际用途决定是否采用 `formal-checklist.md` 逐项复核。
