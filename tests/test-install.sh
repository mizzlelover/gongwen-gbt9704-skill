#!/usr/bin/env bash
set -euo pipefail

skill_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
test_home=$(mktemp -d "${TMPDIR:-/tmp}/gongwen-install-test.XXXXXX")
trap 'rm -rf "$test_home"' EXIT

HOME="$test_home" "$skill_dir/scripts/install.sh" --all

for path in \
  .codex/skills/gongwen \
  .claude/skills/gongwen \
  .config/opencode/skills/gongwen \
  .trae-cn/skills/gongwen \
  .traecli/skills/gongwen \
  .kimi/skills/gongwen \
  .kimi-code/skills/gongwen \
  .workbuddy/skills/gongwen \
  .zcode/skills/gongwen; do
  test -L "$test_home/$path"
  test -f "$test_home/$path/SKILL.md"
done

unzip -t "$skill_dir/dist/traework-gongwen-skill.zip" >/dev/null
unzip -l "$skill_dir/dist/traework-gongwen-skill.zip" | grep -q 'gongwen/SKILL.md'
printf '%s\n' 'cross-platform installation tests passed'
