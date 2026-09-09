# Gongwen GB/T 9704-2012 Skill

一个面向中文正式材料的 Skill：生成参照 GB/T 9704-2012 的公文版式 DOCX，并提供可选的格式核验清单。

## 为什么需要它

许多 AI 只会把标题设为黑体、正文设为仿宋，便把输出称为“公文”。本项目把 A4、版心、正文、层次、首页和页码等版式参数做成可生成、可检查的 DOCX 输出，并接受用户提供的机构名称、文号、署名、日期和页码模式。

## 项目缘起

![公文排版 Skill 项目头图](punk-assets/punk-cover/gongwen-skill-x/cover.png)

### 我把自己常用的公文排版 Skill 开源了

我最早注意到 Skill，是 Claude Code 推出这个概念的时候。那时官方有一套 Office 相关的能力，用起来的第一感觉很好。以前让 AI 写完一份材料，常常还要把内容转成 Python，再自己补一段脚本去生成 Word。现在至少有了一个入口，生成的样式会比裸写一段提示词规整得多。

![从 AI 到 Word 的整理流程](punk-assets/punk-cover/gongwen-skill-x/inline-ai-to-word.png)

后来真正拿来干活，事情没有这么简单。

它能把 Word 读进去，也能再转回 Word，可原文件里那些我在意的格式经常留不住。标题层级、段前段后、缩进和页脚，拿到新文件里还得重新排。对不少国内企业来说，这已经够麻烦了。

还是得自己调。

事业单位和国企的正式材料更严，差几毫米、少一个页码规则，文件就很难往下走。

我开始自己调版式，才发现这些细节比想象中散。WPS 和 Office Word 看着能互相打开，字体命名却不总在同一套规则里。有的环境认中文字体名，有的认英文名。一个文件在电脑上排得好好的，换个环境，字号、行距和换行都有可能变样。

![字体兼容带来的版式差异](punk-assets/punk-cover/gongwen-skill-x/inline-font-compatibility.png)

总有一处露馅。

后来 Kimi 推出客户端，我有一次把材料交给它，没特地交代公文格式。它自己去检索相关国标，顺手拼出了一份接近标准的版式。字体处理得不错，效果也比我预期好。我猜它读到了我原先 Kimi 环境里灵魂文件中的要求，但这只是我对当时行为的判断。

![从标准参数到文档版式](punk-assets/punk-cover/gongwen-skill-x/inline-standard-to-layout.png)

那次结果让我意识到，公文格式这件事确实适合做成 Skill。很多重复动作可以交给工具，用户也不必每次从页边距和字体名称重新讲起。

不过接着用下来，问题还是陆续冒出来。缩进、边距、段间距和页码，往往各自看着差不多，合到一份文件里就不够准。市场上可能早就有人做过公文 Skill，我自己做项目时顺手让 AI 生成了这一套，也一直没有专门去装别人的。

用得越多，我越不想靠“看起来像”过关。前些天我把 GB/T 9704-2012 逐项拿出来核了一遍，也把发现的问题逐个补进了 Skill。现在它会把常用的页面、字体、标题、正文、层级、机构名称、文号、署名、日期和页码排进可编辑的 DOCX，方便在 Word 或 WPS 里继续处理表格、附件和盖章位置。

我把这套 Skill 开源，是想让它从我自己的电脑里走出来。它现在可以安装到 Codex、Claude Code、OpenCode、Trae Code、Kimi、TraeWork、WorkBuddy 和 ZCode。各个平台读的是同一份规则，后续修改也不用在七八个目录里反复补。

![同一套规则服务多个 AI 工具](punk-assets/punk-cover/gongwen-skill-x/inline-one-source-many-tools.png)

它很小，却是我的刚需。很多时候，一份材料能不能顺利交出去，卡的就是这些平时没人愿意盯的细节。

如果你也在做中文正式材料，欢迎试试看。遇到问题可以直接反馈给我，我会继续把它改得更稳。

项目地址

https://github.com/mizzlelover/gongwen-gbt9704-skill

标准依据

https://std.samr.gov.cn/gb/search/gbDetailed?id=lOIe27f77QU%3D&mode=p

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
