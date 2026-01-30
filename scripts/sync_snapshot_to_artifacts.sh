#!/usr/bin/env bash
# SVC-OPS-013: Sync snapshot from SoT (doc/snapshots) to runtime copy (artifacts/snapshots)
#
# Usage:
#   ./sync_snapshot_to_artifacts.sh [TAG]
#
# - If TAG is provided, use it directly
# - If TAG is omitted, derive from latest git tag
# - Creates artifacts/snapshots/<TAG>/ if not exists
# - Copies doc/snapshots/*.md to target
# - On failure: outputs WARN, exits 0 (does not block gate)

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOT_DIR="$ROOT_DIR/doc/snapshots"
ARTIFACTS_BASE="$ROOT_DIR/artifacts/snapshots"

# Derive TAG
if [[ $# -ge 1 && -n "$1" ]]; then
  TAG="$1"
else
  # Try to get latest git tag
  TAG=$(git -C "$ROOT_DIR" describe --tags --abbrev=0 2>/dev/null || echo "")
fi

if [[ -z "$TAG" ]]; then
  echo "[WARN] sync_snapshot: No TAG provided and no git tag found. Skipping sync."
  exit 0
fi

# Validate SoT directory exists
if [[ ! -d "$SOT_DIR" ]]; then
  echo "[WARN] sync_snapshot: SoT directory not found: $SOT_DIR. Skipping sync."
  exit 0
fi

# Find snapshot files to copy
SNAPSHOT_FILES=("$SOT_DIR"/*.md)
if [[ ! -f "${SNAPSHOT_FILES[0]:-}" ]]; then
  echo "[WARN] sync_snapshot: No .md files found in $SOT_DIR. Skipping sync."
  exit 0
fi

# Create target directory
TARGET_DIR="$ARTIFACTS_BASE/$TAG"
if ! mkdir -p "$TARGET_DIR" 2>/dev/null; then
  echo "[WARN] sync_snapshot: Failed to create target dir: $TARGET_DIR. Skipping sync."
  exit 0
fi

# Copy files
COPIED=0
for src_file in "${SNAPSHOT_FILES[@]}"; do
  if [[ -f "$src_file" ]]; then
    filename=$(basename "$src_file")
    if cp "$src_file" "$TARGET_DIR/$filename" 2>/dev/null; then
      ((COPIED++))
      echo "[INFO] sync_snapshot: Copied $filename → $TARGET_DIR/"
    else
      echo "[WARN] sync_snapshot: Failed to copy $filename"
    fi
  fi
done

if [[ $COPIED -eq 0 ]]; then
  echo "[WARN] sync_snapshot: No files were copied."
else
  echo "[OK] sync_snapshot: $COPIED file(s) synced to artifacts/snapshots/$TAG/"
fi

exit 0
