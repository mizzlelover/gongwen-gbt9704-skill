# Gongwen GB/T 9704-2012 Skill

一个面向中文正式材料的 Skill：生成参照 GB/T 9704-2012 的公文版式 DOCX，并提供可选的格式核验清单。

## 为什么需要它

许多 AI 只会把标题设为黑体、正文设为仿宋，便把输出称为“公文”。本项目把 A4、版心、正文、层次、首页和页码等版式参数做成可生成、可检查的 DOCX 输出，并接受用户提供的机构名称、文号、署名、日期和页码模式。

## 能力与边界

| 场景 | 本项目的处理方式 |
| --- | --- |
| 文档主体 | A4、版心、标题、正文、层次、署名和日期排版 |
| 机构名称与文号 | 使用 `--org`、`--doc-no` 按输入排版 |
| 页码 | 居中、单双页或不显示 |
| 印章、签名章 | 在生成的 DOCX 中按实际需要插入图片或完成实体盖章 |
| 特定格式 | 可在此版式基础上继续编辑，或使用对应模板 |

GB/T 9704-2012 当前为现行标准，2025-05-30 复审继续有效。标准适用于党政机关制发公文，其他机关和单位可以参照执行。[全国标准信息公共服务平台](https://std.samr.gov.cn/gb/search/gbDetailed?id=lOIe27f77QU%3D&mode=p)

## 快速开始

```bash
node scripts/generate_gongwen_docx.mjs --input tests/fixture.md --output /tmp/gongwen.docx --org "示例单位文件" --doc-no "示例发〔2026〕1号" --title "公文格式回归测试" --page-number standard
node scripts/verify_gongwen_docx.mjs --input /tmp/gongwen.docx --profile standard-pages
```

然后用 Word 或 WPS 打开，并转换 PDF 检查标题、正文、表格、分页和页码。生成器支持 `center`、`standard` 和 `none` 页码模式，机构名称和文号按输入写入文档。

## 跨平台安装

本项目使用开放的 `SKILL.md` 目录结构，可在 Codex、Claude Code、OpenCode、Trae Code、Trae CLI、Kimi Code CLI、Kimi Code、WorkBuddy 和 ZCode 使用。

macOS / Linux：

```bash
scripts/install.sh --all
```

Windows：

```powershell
.\scripts\install.ps1 -All
```

安装器将同一份源目录链接到各平台的用户级技能目录；Windows 默认复制以避免符号链接权限问题。TraeWork 使用可导入包 [`dist/traework-gongwen-skill.zip`](dist/traework-gongwen-skill.zip)。完整目录、验证方法和官方依据见[跨平台安装说明](docs/platform-support.md)。

## 项目内容

- [SKILL.md](SKILL.md)：使用指引与版式参数。
- [标准执行摘要](references/gbt9704-2012-summary.md)：国家标准的可执行要点。
- [正式公文核验表](references/formal-checklist.md)：模板完成后的全要素检查。
- [生成器](scripts/generate_gongwen_docx.mjs)：根据输入生成 DOCX 版式。
- [校验器](scripts/verify_gongwen_docx.mjs)：检查生成器可承诺的 DOCX 版式要素。
- [回归测试](tests/run_tests.sh)：运行居中与单双页页码生成、DOCX 包结构与 PDF 转换验证。
- [跨平台安装测试](tests/test-install.sh)：隔离环境中验证九个本地目录和 TraeWork 导入包。

## 验证

```bash
tests/run_tests.sh
```

这项测试证明生成器、校验器和可打印文件链路可运行。最终文件可按实际用途在目标 Word/WPS 与打印条件中检查。

## 许可

MIT。标准文本及机关模板应按各自权利和管理规则取得与使用。
