# 平台安装与验证

本项目采用 Agent Skills 通用目录形态：一个以 `SKILL.md` 为入口的目录，附带 `scripts/` 和 `references/`。所有目标平台安装的是同一份源目录，不维护改写版提示词。

| 平台 | 用户级位置或导入方式 | 验证方式 |
| --- | --- | --- |
| Codex | `~/.codex/skills/gongwen` | 新会话中确认 `gongwen` 出现在技能列表 |
| Claude Code | `~/.claude/skills/gongwen` | 输入 `/gongwen` 或在任务中显式提及技能 |
| OpenCode | `~/.config/opencode/skills/gongwen` | 在支持技能的 Agent 中确认 `gongwen` 可加载 |
| Trae Code | `~/.trae-cn/skills/gongwen` | 设置中的“技能与命令”面板刷新后确认 |
| Trae CLI | `~/.traecli/skills/gongwen` | 重启后执行 `/skills` |
| Kimi Code CLI | `~/.kimi/skills/gongwen` | 新会话中执行 `/skill:gongwen` |
| Kimi Code | `~/.kimi-code/skills/gongwen` | 新会话中执行 `/skill:gongwen` |
| WorkBuddy | `~/.workbuddy/skills/gongwen` | 在技能管理界面刷新并启用 |
| ZCode | `~/.zcode/skills/gongwen` | 设置 → Skills 刷新并确认启用 |
| TraeWork | 导入 `dist/traework-gongwen-skill.zip` | 导入后在企业技能列表确认启用 |

腾讯 WorkBuddy 开放平台上传使用 `dist/workbuddy-gongwen-skill-v2.0.0.zip`。压缩包根目录直接包含 `SKILL.md`，并提供一级 `scripts/`、`references/` 和 `assets/` 目录，上传前无需解压；当前包约 1.2 MB，符合平台 3 MB 上传限制。

## macOS 与 Linux

```bash
git clone https://github.com/mizzlelover/gongwen-gbt9704-skill.git
cd gongwen-gbt9704-skill
scripts/install.sh --all
```

安装器默认创建符号链接，因此 GitHub 拉取更新后，所有已安装平台都会使用同一份最新技能。若目标已有非链接的 `gongwen`，脚本会拒绝覆盖；核对后才可传入 `--force`。

## Windows

```powershell
git clone https://github.com/mizzlelover/gongwen-gbt9704-skill.git
cd gongwen-gbt9704-skill
.\scripts\install.ps1 -All
```

PowerShell 默认复制目录，避免依赖管理员权限或开发者模式。需要实时同步时，使用 `-Link`；已有同名目录需明确传入 `-Force`。

## 官方目录依据

- [Claude Code Skills](https://docs.anthropic.com/en/docs/claude-code/skills)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills)
- [Trae Code 技能](https://docs.trae.cn/ide_skills) 与 [Trae CLI 技能](https://docs.trae.cn/cli_skills)
- [Kimi Code CLI Agent Skills](https://moonshotai.github.io/kimi-cli/en/customization/skills)
- [ZCode Skills](https://zcode.z.ai/en/docs/skill)
- [TraeWork 企业技能](https://docs.trae.cn/enterprise_skills)

WorkBuddy 公开文档将 `skills/<skill-name>/SKILL.md` 作为技能目录结构；本项目同时保留用户级目录安装，便于本地技能管理器发现。
