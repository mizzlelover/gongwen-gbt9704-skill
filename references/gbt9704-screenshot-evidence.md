# GB/T 9704-2012 全条款截图证据矩阵

本文件是本次修订的逐条复核记录。它把国标条款、生成场景、实际渲染 PNG 和可证明边界逐一对应起来。截图只证明截图中可观察到的版式结果；纸张指标、油墨、套印、装订、机关语义和目标 Word/WPS 的专用模板行为，明确标为“截图不能证明”，不以 DOCX ZIP 属性替代。

标准依据：

- [全国标准信息公共服务平台现行状态页](https://std.samr.gov.cn/gb/search/gbDetailed?id=lOIe27f77QU%3D&mode=p)：GB/T 9704-2012，2025-05-30 复审结论为继续有效。
- [GB/T 9704-2012 条文全文转载页](https://dzb.cumtb.edu.cn/info/1040/1184.htm)：本次逐条对照的公开全文。

## 本次实际渲染批次

运行命令：

```bash
bash tests/visual-audit.sh /tmp/gongwen-visual-audit-all-rules
```

结果：18 份 DOCX、18 份 PDF、37 个 PDF 页面；每份 DOCX 先由校验器检查，再由 LibreOffice 转 PDF，最后用 `pdftoppm` 生成 PNG。`tests/measure-header-coordinates.mjs` 还用 `pdftotext -bbox-layout` 独立量测了电子红头首面：份号 39.88mm，机关标志 71.41mm，带字段和不带字段的位置差 0.00mm。

提交到仓库的证据目录为 [`references/assets/visual-audit/all-rules/`](assets/visual-audit/all-rules/)，其中：

- [`manifest.tsv`](assets/visual-audit/all-rules/manifest.tsv) 记录 18 个场景、页数和已提交截图。
- [`contact-sheet.png`](assets/visual-audit/all-rules/contact-sheet.png) 是场景总览；单页 PNG 保留原始截图尺寸。
- [`header-coordinates.log`](assets/visual-audit/all-rules/header-coordinates.log) 是独立坐标量测结果。

## 场景与截图索引

| 场景 | 用途 | 截图 |
| --- | --- | --- |
| `ordinary` | 普通材料，不因机构名称变红头 | [`ordinary-1.png`](assets/visual-audit/all-rules/ordinary-1.png) |
| `ordinary-calibration` | 22 行、28 字网格校准页 | [`ordinary-calibration-1.png`](assets/visual-audit/all-rules/ordinary-calibration-1.png) |
| `formal-digital-all` | 电子红头全要素、附件说明、附注、版记 | [`formal-digital-all-1.png`](assets/visual-audit/all-rules/formal-digital-all-1.png)、[`formal-digital-all-2.png`](assets/visual-audit/all-rules/formal-digital-all-2.png) |
| `formal-digital-upward` | 上行文文号、签发人、单双页页码 | [`formal-digital-upward-1.png`](assets/visual-audit/all-rules/formal-digital-upward-1.png)、[`formal-digital-upward-2.png`](assets/visual-audit/all-rules/formal-digital-upward-2.png) |
| `formal-preprinted` | 预印红头纸套打留白 | [`formal-preprinted-1.png`](assets/visual-audit/all-rules/formal-preprinted-1.png)、[`formal-preprinted-2.png`](assets/visual-audit/all-rules/formal-preprinted-2.png) |
| `formal-joint` | 联合行文机关标志 | [`formal-joint-1.png`](assets/visual-audit/all-rules/formal-joint-1.png)、[`formal-joint-2.png`](assets/visual-audit/all-rules/formal-joint-2.png) |
| `formal-unsigned` | 不加盖印章文字位置 | [`formal-unsigned-1.png`](assets/visual-audit/all-rules/formal-unsigned-1.png)、[`formal-unsigned-2.png`](assets/visual-audit/all-rules/formal-unsigned-2.png) |
| `formal-seal` / `formal-signed` | 印章、签名章文字占位 | [`formal-seal-2.png`](assets/visual-audit/all-rules/formal-seal-2.png)、[`formal-signed-2.png`](assets/visual-audit/all-rules/formal-signed-2.png) |
| `formal-attachments` / `formal-attachments-detached` | 附件另面、分离装订附件 | [`formal-attachments-3.png`](assets/visual-audit/all-rules/formal-attachments-3.png)、[`formal-attachments-4.png`](assets/visual-audit/all-rules/formal-attachments-4.png)、[`formal-attachments-detached-3.png`](assets/visual-audit/all-rules/formal-attachments-detached-3.png) |
| `formal-long` | 版记底部锚定、单双页页码 | [`formal-long-2.png`](assets/visual-audit/all-rules/formal-long-2.png)、[`formal-long-3.png`](assets/visual-audit/all-rules/formal-long-3.png) |
| `letter` / `letter-fields` | 信函双线和可选字段 | [`letter-1.png`](assets/visual-audit/all-rules/letter-1.png)、[`letter-fields-1.png`](assets/visual-audit/all-rules/letter-fields-1.png) |
| `command` | 命令（令）标志、令号、正文间距 | [`command-1.png`](assets/visual-audit/all-rules/command-1.png) |
| `minutes` | 纪要标志和出席、请假、列席人员 | [`minutes-1.png`](assets/visual-audit/all-rules/minutes-1.png)、[`minutes-2.png`](assets/visual-audit/all-rules/minutes-2.png) |
| `horizontal-table` / `table` | 横排表格和纵向表格对照 | [`horizontal-table-1.png`](assets/visual-audit/all-rules/horizontal-table-1.png)、[`table-1.png`](assets/visual-audit/all-rules/table-1.png) |

## 逐条核对

状态只使用以下三种含义：

- **截图通过**：本次 PNG 中已经看到条款要求的可视结果，并有结构或坐标检查辅助。
- **截图通过，字体/目标软件仍需核对**：位置或结构可见，但本机缺标准字体，或 Word/WPS 的专用行为还要在目标环境复核。
- **截图不能证明**：标准要求的是纸张、印刷、装订、语义或实体印章等外部条件；工具没有伪造通过结论。

| 条款 | 国标要求 | 本批截图与结果 | 状态及边界 |
| --- | --- | --- | --- |
| 1 | 规定党政机关公文的纸张、版面、印制装订、格式要素和式样；其他单位可参照。 | `ordinary-1.png`、`formal-digital-all-1.png`、`letter-1.png`、`command-1.png`、`minutes-1.png` 展示了不同格式分支。 | 截图通过；具体文种、行文关系和机关模板仍由使用者确认。 |
| 2 | 引用 GB/T 148、GB 3100/3101/3102、GB/T 15834、GB/T 15835。 | 本仓库摘要、矩阵和本证据文件均列出引用文件；截图不能验证引用标准的语义执行。 | 截图不能证明正文单位、标点和数字语义。 |
| 3.1 | 一字为一个汉字宽度。 | `ordinary-calibration-1.png` 显示固定字宽网格样例。 | 截图通过，实际字体字面宽度随目标字体核对。 |
| 3.2 | 一行为一个汉字高度加三号字高度 7/8。 | `ordinary-calibration-1.png` 显示 28 磅实现网格；XML 校验确认 `w:linePitch=560`。 | 截图通过，术语本身不能只靠截图定义。 |
| 4 | 纸张 60—80g/m²、白度80%—90%、横向耐折度≥15、不透明度≥85%、pH7.5—9.5。 | 生成器没有把这些物性写成 DOCX 属性；截图只显示页面。 | 截图不能证明；须以纸张规格和成品检测为准。 |
| 5.1 | A4 成品 210mm×297mm。 | 18 个 PDF 场景均由脚本检查 A4；`horizontal-table-1.png` 为 A4 横向页面。 | 截图通过；裁切误差仍属成品核验。 |
| 5.2.1 | 天头37±1mm、订口28±1mm、版心156×225mm。 | `formal-digital-all-1.png`、`formal-preprinted-1.png`、`ordinary-calibration-1.png`；校验器检查页边，标题和正文落在版心内。 | 截图通过；打印缩放关闭后需再量纸样。 |
| 5.2.2 | 默认三号仿宋，特殊情况可调整。 | 全部截图可见三号网格；本机实际使用 `STFangsong` 替代并输出警告，严格模式会失败。 | 截图通过，字体仍需目标机安装方正小标宋/仿宋后复核。 |
| 5.2.3 | 一般每面22行、每行28字并撑满版心。 | `ordinary-calibration-1.png` 是 22 行×28 字校准页；普通长文和特定格式按内容自然分页。 | 截图通过；长标题、表格和目标字体导致的特殊调整需逐文档看图。 |
| 5.2.4 | 未特别说明时文字为黑色。 | `ordinary-1.png`、`formal-digital-all-2.png` 的正文、标题、版记文字为黑色；红色仅用于规定的红头和线。 | 截图通过。 |
| 6.1 | 版面干净无底灰、字迹清楚无断划、尺寸标准、版心不斜，误差≤1mm。 | `contact-sheet.png` 中所有 PDF 页面均无生成的底灰或倾斜；屏幕截图不能证明实体制版误差。 | 截图部分通过；实体误差和印品质量不能由本工具证明。 |
| 6.2 | 双面印刷、套正≤2mm、黑墨BL100%、红墨Y80%/M80%，着墨均匀无缺陷。 | `formal-long-2.png`、`formal-long-3.png` 展示双页页码位置；无实体双面印刷样。 | 截图不能证明油墨、套正和印品质量。 |
| 6.3 | 左侧装订、页码误差≤4mm、成品±2mm、两钉距上下边缘70±4mm、平订距书脊3—5mm等。 | `formal-long-3.png` 只显示页面顺序和版记位置。 | 截图不能证明装订、裁切、钉位和封皮。 |
| 7.1 | 版头、主体、版记三区；页码位于版心外。 | `formal-digital-all-1.png` 展示版头与主体，`formal-long-3.png` 展示末页版记和页码。 | 截图通过。 |
| 7.2.1 | 份号六位三号阿拉伯数字，版心左上第一行。 | `formal-digital-all-1.png`、`formal-preprinted-1.png` 显示 `000007`；独立坐标日志显示 39.88mm 首行位置。 | 截图通过。 |
| 7.2.2 | 密级和保密期限第二行三号黑体，数字用阿拉伯数字。 | `formal-digital-all-1.png` 显示 `机密★3年` 位于第二行。 | 截图通过；密级文字及期限是否适用需机关确认。 |
| 7.2.3 | 紧急程度三号黑体；与份号、密级同时出现时按份号、密级、紧急程度自上而下。 | `formal-digital-all-1.png` 显示三项顺序；`letter-fields-1.png` 显示信函双线下同顺序。 | 截图通过。 |
| 7.2.4 | 机关全称/规范简称可加“文件”，居中红色；上边缘距版心上边缘35mm；联合行文主办机关在前，联署名称上下居中。 | `formal-digital-all-1.png`、`formal-joint-1.png`；坐标日志显示机关标志 71.41mm 页面坐标，字段差0.00mm；联合行文以主办机关在前、联署机关名称分行排列，输入含“文件”时将“文件”置右并按联署名称上下居中；名称过长时自适应标志字号。 | 截图通过，推荐小标宋字体需目标机复核；复杂机关专用标志仍需模板核对。 |
| 7.2.5 | 机关标志下空二行；年份全称、六角括号、顺序号不加“第”不补零、末尾“号”；上行文文号左空一字。 | `formal-digital-all-1.png`、`formal-digital-upward-1.png`；文号输入边界和显式空行均经校验。 | 截图通过。 |
| 7.2.6 | “签发人：”三号仿宋、姓名三号楷体，右空一字；多签发人按顺序、一般每行两名、回行对齐。 | `formal-digital-upward-1.png` 显示同一行双签发人，姓名字体和标签分 run。 | 截图通过；超过两名或联合行文复杂签发人仍须专用模板。 |
| 7.2.7 | 文号下4mm处、版心等宽红色分隔线。 | `formal-digital-all-1.png`、`formal-joint-1.png`；线宽156mm，红线下标题空两行。 | 截图通过；预印模式明确不重绘红线。 |
| 7.3.1 | 标题二号小标宋，红线下空二行，居中；多行应词意完整、对称、梯形或菱形。 | `formal-digital-all-1.png`、`formal-preprinted-1.png`；标题样式为 `GongwenTitle`，空行在 PNG 中可见。 | 截图通过；小标宋缺失时严格模式失败；长标题断行需逐稿人工调整。 |
| 7.3.2 | 标题下空一行，主送机关顶格，回行顶格，末尾全角冒号；过多可移版记。 | `formal-digital-all-1.png`、`formal-joint-1.png`。 | 截图通过；自动移版记的决定由发文机关确认。 |
| 7.3.3 | 首页有正文；正文三号仿宋、自然段左空二字回行顶格；层次序数依次“一、”“（一）”“1.”“（1）”，字体黑体/楷体/仿宋。 | `formal-digital-all-1.png`、`ordinary-1.png` 显示首页正文和四级层次；校验器确认 Heading1—Heading4、大纲级别。 | 截图通过，标准字体和复杂分页仍需目标软件复核。 |
| 7.3.4 | 正文下空一行左空二字写“附件：”；多附件编号；附件名称末不加标点，回行与首字对齐。 | `formal-digital-all-2.png` 显示附件说明；生成器校验说明与附件标题、顺序一致。 | 截图通过；极长名称需看最终换行。 |
| 7.3.5.1 | 加盖印章：日期右空四字，红色印章压署名和日期，印章顶端距正文/附件说明一行内，不得空白印章；联合章须排列整齐。 | `formal-seal-2.png` 展示署名和日期占位；生成器不写入虚假印章。 | 截图不能证明实体章和联合章几何关系；需 Word/WPS 或打印盖章。 |
| 7.3.5.2 | 不盖章：署名正文下空一行右空二字，日期下一行首字右移二字；联合署名自上而下。 | `formal-unsigned-2.png` 显示署名日期两行和右侧定位。 | 截图通过；多机关联合署名需目标模板复核。 |
| 7.3.5.3 | 签发人签名章：正文下空二行，职务左空二字，签名章右空四字；日期下空一行右空四字；联合逐行对齐。 | `formal-signed-2.png` 展示职务/签名章文字占位和日期行。 | 截图部分通过；实体签名章颜色、尺寸、联合对齐不能由本工具证明。 |
| 7.3.5.4 | 年月日使用阿拉伯数字，年份全称，月日不补零。 | `formal-digital-all-2.png`、`formal-unsigned-2.png` 显示 `2026年9月10日`；输入校验拒绝 `09月`。 | 截图通过。 |
| 7.3.5.5 | 空白不足时可调行距、字距容纳印章或签名章、日期。 | `formal-seal-2.png`、`formal-signed-2.png` 仅覆盖正常空间。 | 截图不能证明极端内容自动调节；需按稿件人工调节。 |
| 7.3.6 | 附注在日期下一行左空二字，用圆括号。 | `formal-digital-all-2.png` 显示 `（此件公开）`。 | 截图通过。 |
| 7.3.7 | 附件另面、版记前；第一行附件标签三号黑体顶格，标题第三行居中；与附件说明一致；不能一起装订时左上补发文字号和附件序号。 | `formal-attachments-3.png`、`formal-attachments-4.png`、`formal-attachments-detached-3.png`；分离装订截图显示文号+附件序号。 | 截图通过；复杂附件内容和实体装订仍需复核。 |
| 7.4.1 | 版记线与版心等宽，首末粗线约0.35mm，中间细线约0.25mm，末线与末页版心下边缘重合。 | `formal-long-3.png` 显示粗—细—粗顺序；版记表锚定末页版心底部。 | 截图通过；极端内容在 Word/WPS 需抽检。 |
| 7.4.2 | 抄送四号仿宋，印发机关日期上一行，左右各空一字，回行对齐，末尾句号；主送移版记时改“主送”。 | `formal-digital-all-2.png`、`formal-long-3.png` 显示抄送、回行和句号。 | 截图通过；主送自动移版记仍是人工决定。 |
| 7.4.3 | 印发机关日期四号仿宋，末条线之上，左一字右一字，日期后“印发”；其他要素用细线隔开。 | `formal-digital-all-2.png`、`formal-long-3.png`。 | 截图通过。 |
| 7.5 | 四号半角宋体页码，两侧一字线，线上距版心下边缘7mm；单页右、双页左；空白/版记例外；附件连续。 | `formal-long-2.png`、`formal-long-3.png`、`formal-attachments-4.png`；校验器和 PDF 坐标检查页脚。 | 截图通过；空白页例外和实体套印仍需人工。 |
| 8 | 横排 A4 表格页码位置不变，单页表头在订口边、双页表头在切口边。 | `horizontal-table-1.png` 已实际渲染 A4 横向页面、225mm 表格和标准页码；截图同时暴露当前表头仍在横向页面上边缘，尚未实现单双页订口/切口方向转换。 | 部分通过；表头朝向必须在 Word/WPS 横向模板中处理，不能宣称本生成器已完全覆盖8。 |
| 9 | 计量单位、标点、数字分别符合引用标准。 | `formal-digital-all-2.png` 有 `10 kg、5 m、3.14` 观察样例；工具只校验字段边界。 | 截图不能证明全文语义；需文本审校。 |
| 10.1 | 信函：标志距上页边30mm；上粗下细双线、下页边20mm处上细下粗，均170mm；可选字段顺序；标题空二行；首页无页码；版记无印发/分隔线。 | `letter-1.png`、`letter-fields-1.png`；校验器检查双线宽度、方向、底线页脚和无页码。 | 截图通过；联合行文信函和机关专用模板仍需复核。 |
| 10.2 | 命令（令）：机关全称加“命令/令”，标志上边缘距版心上边缘20mm；令号下空二行，正文下空二行；签章日期按7.3.5.3。 | `command-1.png`；独立截图中标志约57mm页面坐标，令号和正文间隔可见。 | 截图通过；签章和日期实体环节仍需人工。 |
| 10.3 | 纪要标志上边缘距版心上边缘35mm；出席、请假、列席标签三号黑体，人员三号仿宋，正文/附件说明下空一行左空二字，回行对齐。 | `minutes-1.png`、`minutes-2.png`；出席信息已移动到正文/附件说明之后，而不是错误地追加到版记之后。 | 截图通过；纪要可按机关实际制度调整。 |
| 11 | 给出 A4 页边、普通首页、联合行文、末页、附件、信函、命令等式样。 | `contact-sheet.png` 覆盖普通、联合、末页、附件、信函、命令和纪要实际渲染场景。 | 截图通过；正式发文仍应对照本机关现行式样图。 |

## 本次发现并修正的实现问题

1. 命令（令）分支曾把20mm误当成纸张上边距，导致机关标志距离纸顶约20mm；现在恢复标准37mm天头，并在版心上边缘下20mm处排标志，实际截图已复核。
2. 联合行文曾把联署机关名称错误压成同一横行；现在主办机关在前、联署机关名称分行排列，输入含“文件”时将“文件”置右并按联署名称上下居中；名称过长时自适应标志字号。
3. 纪要出席、请假、列席名单曾追加在附件和版记之后；现在紧跟正文或附件说明下一行生成，符合10.3的编排位置。
4. PDF 字形量测曾按 `yMin` 粗略分组，遇到高字形会把同一视觉行拆开；现在按字形垂直重叠合并后再量测，独立坐标结果稳定。
5. 视觉审计补入了横排表格、22×28校准页、联合行文、分离装订附件、不盖章公文和命令（令）等场景，不再只依赖电子红头样例。

## 不能由生成器或截图单独保证的边界

- 当前机器没有方正小标宋和标准仿宋字体；生成器会明确报警，严格模式会停止。要交付标准字体稿，应在目标机器安装标准字体后重新生成并截图。
- 纸张克重、白度、耐折度、不透明度、pH、黑红油墨、双面套正、裁切、装订、钉位和实体印章属于制作环节。
- 正文单位、标点、数字语义，以及文种、行文关系、主送范围、机关名称规范化和发文权限属于内容或机关审校。
- 横排表格的单双页表头朝向、复杂联合机关标志、超过两名签发人、复杂联合印章和目标机关专用模板仍需在 Word/WPS 或打印样张中完成。
