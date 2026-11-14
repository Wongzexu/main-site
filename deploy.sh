#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/public/"
DST="/srv/downloads"

[[ -d "$SRC" ]] || { echo "缺少目录: $SRC"; exit 1; }

# 只同步静态站；排除用户文件与备份
rsync -a --delete \
  --exclude 'files/' \
  --exclude '*.bak.*' \
  "$SRC" "$DST/"

# 统一站点文件权限（跳过 files/）
find "$DST" -mindepth 1 -path "$DST/files" -prune -o -type d -exec chmod 755 {} +
find "$DST" -mindepth 1 -path "$DST/files" -prune -o -type f -exec chmod 644 {} +

echo "已部署: $SRC -> $DST/"
