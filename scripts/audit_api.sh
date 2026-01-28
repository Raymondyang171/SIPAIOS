#!/usr/bin/env bash
# SVC-W4-1: API Dependency Audit Artifact
# Generates npm audit JSON report to artifacts/scan/api-audit/
#
# Exit Code Policy (Pilot Stage):
#   - exit 0: No critical vulnerabilities (PASS/WARN)
#   - exit 1: Critical vulnerabilities found (FAIL)
#
# For Go-Live, tighten conditions (e.g., high in prod deps = exit 1)

set -uo pipefail
# Note: removed -e to allow npm audit to "fail" (non-zero = vulns found)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="$REPO_ROOT/artifacts/scan/api-audit/$TIMESTAMP"

echo "=== SVC-W4-1: API Dependency Audit ==="
echo "Timestamp: $TIMESTAMP"
echo "API Dir:   $API_DIR"
echo "Output:    $OUTPUT_DIR"
echo ""

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Change to API directory
cd "$API_DIR"

# Run npm audit and capture JSON output
# npm audit returns non-zero exit code if vulnerabilities found, so we capture it
echo "[1/4] Running npm audit..."
AUDIT_EXIT_CODE=0
npm audit --json > "$OUTPUT_DIR/audit.json" 2>&1 || AUDIT_EXIT_CODE=$?

# Generate human-readable summary
echo "[2/4] Generating summary..."
npm audit 2>&1 | tee "$OUTPUT_DIR/audit-summary.txt" || true

# Parse vulnerability counts from JSON
echo "[3/4] Analyzing vulnerabilities..."
if command -v jq &> /dev/null; then
  CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  HIGH=$(jq '.metadata.vulnerabilities.high // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  LOW=$(jq '.metadata.vulnerabilities.low // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  TOTAL=$(jq '.metadata.vulnerabilities.total // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
else
  echo "[WARN] jq not found, cannot parse vulnerability counts"
  CRITICAL=0
  HIGH=0
  MODERATE=0
  LOW=0
  TOTAL=0
fi

# Determine status based on Pilot stage policy
# - FAIL: Critical > 0 (blocks pipeline)
# - WARN: High/Moderate > 0 (logged but continues)
# - PASS: No vulnerabilities
STATUS="PASS"
if [ "${TOTAL:-0}" -gt 0 ]; then
  STATUS="WARN"
fi
if [ "${CRITICAL:-0}" -gt 0 ]; then
  STATUS="FAIL"
fi

# Create metadata file with full context
echo "[4/4] Writing metadata..."
cat > "$OUTPUT_DIR/metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "source": "apps/api",
  "generated_by": "scripts/audit_api.sh",
  "stage": "pilot",
  "status": "$STATUS",
  "npm_audit_exit_code": $AUDIT_EXIT_CODE,
  "vulnerabilities": {
    "critical": ${CRITICAL:-0},
    "high": ${HIGH:-0},
    "moderate": ${MODERATE:-0},
    "low": ${LOW:-0},
    "total": ${TOTAL:-0}
  },
  "policy": {
    "critical": "BLOCK",
    "high": "WARN",
    "moderate": "ALLOW",
    "low": "ALLOW"
  },
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "files": [
    "audit.json",
    "audit-summary.txt",
    "metadata.json"
  ]
}
EOF

echo ""
echo "=== Audit Complete ==="
echo "Output directory: $OUTPUT_DIR"
echo "Files generated:"
ls -la "$OUTPUT_DIR"
echo ""

# Display summary
echo "=== Vulnerability Summary ==="
echo "  Critical: ${CRITICAL:-0}"
echo "  High:     ${HIGH:-0}"
echo "  Moderate: ${MODERATE:-0}"
echo "  Low:      ${LOW:-0}"
echo "  Total:    ${TOTAL:-0}"
echo ""
echo "Status: $STATUS"
echo ""

# Create symlink to latest
LATEST_LINK="$REPO_ROOT/artifacts/scan/api-audit/latest"
rm -f "$LATEST_LINK"
ln -s "$OUTPUT_DIR" "$LATEST_LINK"
echo "Latest symlink: $LATEST_LINK"

# Exit code policy (Pilot Stage):
# - Only FAIL (critical > 0) returns exit 1
# - WARN and PASS return exit 0
if [ "$STATUS" = "FAIL" ]; then
  echo ""
  echo "[GATE FAIL] Critical vulnerabilities found - blocking pipeline"
  exit 1
fi

echo ""
echo "[GATE $STATUS] Audit artifacts saved (exit 0)"
exit 0
