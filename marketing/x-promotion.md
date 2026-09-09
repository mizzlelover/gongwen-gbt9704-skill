# 我把自己常用的公文排版 Skill 开源了

![公文排版 Skill 项目头图](../punk-assets/punk-cover/gongwen-skill-x/cover.png)

我最早注意到 Skill，是 Claude Code 推出这个概念的时候。那时官方有一套 Office 相关的能力，用起来的第一感觉很好。以前让 AI 写完一份材料，常常还要把内容转成 Python，再自己补一段脚本去生成 Word。现在至少有了一个入口，生成的样式会比裸写一段提示词规整得多。

![从 AI 到 Word 的整理流程](../punk-assets/punk-cover/gongwen-skill-x/inline-ai-to-word.png)

后来真正拿来干活，事情没有这么简单。

它能把 Word 读进去，也能再转回 Word，可原文件里那些我在意的格式经常留不住。标题层级、段前段后、缩进和页脚，拿到新文件里还得重新排。对不少国内企业来说，这已经够麻烦了。

还是得自己调。

事业单位和国企的正式材料更严，差几毫米、少一个页码规则，文件就很难往下走。

我开始自己调版式，才发现这些细节比想象中散。WPS 和 Office Word 看着能互相打开，字体命名却不总在同一套规则里。有的环境认中文字体名，有的认英文名。一个文件在电脑上排得好好的，换个环境，字号、行距和换行都有可能变样。

![字体兼容带来的版式差异](../punk-assets/punk-cover/gongwen-skill-x/inline-font-compatibility.png)

总有一处露馅。

后来 Kimi 推出客户端，我有一次把材料交给它，没特地交代公文格式。它自己去检索相关国标，顺手拼出了一份接近标准的版式。字体处理得不错，效果也比我预期好。我猜它读到了我原先 Kimi 环境里灵魂文件中的要求，但这只是我对当时行为的判断。

![从标准参数到文档版式](../punk-assets/punk-cover/gongwen-skill-x/inline-standard-to-layout.png)

那次结果让我意识到，公文格式这件事确实适合做成 Skill。很多重复动作可以交给工具，用户也不必每次从页边距和字体名称重新讲起。

不过接着用下来，问题还是陆续冒出来。缩进、边距、段间距和页码，往往各自看着差不多，合到一份文件里就不够准。市场上可能早就有人做过公文 Skill，我自己做项目时顺手让 AI 生成了这一套，也一直没有专门去装别人的。

用得越多，我越不想靠“看起来像”过关。前些天我把 GB/T 9704-2012 逐项拿出来核了一遍，也把发现的问题逐个补进了 Skill。现在它会把常用的页面、字体、标题、正文、层级、机构名称、文号、署名、日期和页码排进可编辑的 DOCX，方便在 Word 或 WPS 里继续处理表格、附件和盖章位置。

我把这套 Skill 开源，是想让它从我自己的电脑里走出来。它现在可以安装到 Codex、Claude Code、OpenCode、Trae Code、Kimi、TraeWork、WorkBuddy 和 ZCode。各个平台读的是同一份规则，后续修改也不用在七八个目录里反复补。

![同一套规则服务多个 AI 工具](../punk-assets/punk-cover/gongwen-skill-x/inline-one-source-many-tools.png)

它很小，却是我的刚需。很多时候，一份材料能不能顺利交出去，卡的就是这些平时没人愿意盯的细节。

如果你也在做中文正式材料，欢迎试试看。遇到问题可以直接反馈给我，我会继续把它改得更稳。

项目地址

https://github.com/mizzlelover/gongwen-gbt9704-skill

标准依据

https://std.samr.gov.cn/gb/search/gbDetailed?id=lOIe27f77QU%3D&mode=p
