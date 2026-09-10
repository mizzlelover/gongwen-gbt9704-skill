#!/usr/bin/env bash
set -euo pipefail

skill_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
force=false
targets=()

usage() {
  cat <<'EOF'
Usage: scripts/install.sh [--all | --target NAME ...] [--force]

Targets: codex, claude, opencode, trae-code, trae-cli, kimi-cli, kimi-code,
         workbuddy, zcode, traework

Installs the canonical skill as a symbolic link. Existing non-linked gongwen
directories are preserved unless --force is supplied. The traework target
creates a ZIP for import in TraeWork instead of guessing an unsupported path.
EOF
}

while (($#)); do
  case "$1" in
    --all) targets=(codex claude opencode trae-code trae-cli kimi-cli kimi-code workbuddy zcode traework) ;;
    --target) shift; targets+=("${1:?missing target name}") ;;
    --force) force=true ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

if ((${#targets[@]} == 0)); then
  usage >&2
  exit 2
fi

target_root() {
  case "$1" in
    codex) printf '%s/.codex/skills' "$HOME" ;;
    claude) printf '%s/.claude/skills' "$HOME" ;;
    opencode) printf '%s/.config/opencode/skills' "$HOME" ;;
    trae-code) printf '%s/.trae-cn/skills' "$HOME" ;;
    trae-cli) printf '%s/.traecli/skills' "$HOME" ;;
    kimi-cli) printf '%s/.kimi/skills' "$HOME" ;;
    kimi-code) printf '%s/.kimi-code/skills' "$HOME" ;;
    workbuddy) printf '%s/.workbuddy/skills' "$HOME" ;;
    zcode) printf '%s/.zcode/skills' "$HOME" ;;
    *) return 1 ;;
  esac
}

install_link() {
  local name=$1 root destination
  root=$(target_root "$name") || { printf 'Unsupported target: %s\n' "$name" >&2; exit 2; }
  destination="$root/gongwen"
  mkdir -p "$root"
  if [[ -e "$destination" || -L "$destination" ]]; then
    if [[ -L "$destination" && $(readlink "$destination") == "$skill_dir" ]]; then
      printf 'Already installed: %s\n' "$name"
      return
    fi
    if [[ "$force" != true ]]; then
      printf 'Refusing to replace existing %s; rerun with --force after review.\n' "$destination" >&2
      exit 3
    fi
    rm -rf "$destination"
  fi
  ln -s "$skill_dir" "$destination"
  test -f "$destination/SKILL.md"
  printf 'Installed: %s -> %s\n' "$name" "$destination"
}

package_traework() {
  local stage output
  stage=$(mktemp -d "${TMPDIR:-/tmp}/gongwen-traework.XXXXXX")
  output="$skill_dir/dist/traework-gongwen-skill.zip"
  mkdir -p "$skill_dir/dist" "$stage/gongwen"
  cp -R "$skill_dir/SKILL.md" "$skill_dir/scripts" "$skill_dir/references" "$skill_dir/tests" "$stage/gongwen/"
  rm -f "$output"
  (cd "$stage" && zip -qr "$output" gongwen)
  unzip -t "$output" >/dev/null
  rm -rf "$stage"
  printf 'Packaged TraeWork import ZIP: %s\n' "$output"
}

for target in "${targets[@]}"; do
  if [[ "$target" == traework ]]; then
    package_traework
  else
    install_link "$target"
  fi
done
