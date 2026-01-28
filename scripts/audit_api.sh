#!/usr/bin/env bash
# SVC-W4-1 (+W4-4): API Dependency Audit Artifact
# Generates npm audit JSON report to artifacts/scan/api-audit/
#
# Exit Code Policy (Pilot Stage):
#   - exit 0: No critical vulnerabilities (PASS/WARN)
#   - exit 1: Critical vulnerabilities found (FAIL)
#
# W4-4 enhancement:
#   - Adds prod_scope detection via `npm audit --omit=dev`
#   - Writes prod vulnerability counts into metadata.json
#   - Adds a human note when vulns are dev-only (typical: newman transitive deps)

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

mkdir -p "$OUTPUT_DIR"
cd "$API_DIR"

echo "[1/5] Running npm audit (full)..."
AUDIT_EXIT_CODE=0
npm audit --json > "$OUTPUT_DIR/audit.json" 2>&1 || AUDIT_EXIT_CODE=$?

echo "[2/5] Running npm audit (prod only: --omit=dev) ..."
AUDIT_PROD_EXIT_CODE=0
npm audit --omit=dev --json > "$OUTPUT_DIR/audit-prod.json" 2>&1 || AUDIT_PROD_EXIT_CODE=$?

echo "[3/5] Generating human summary..."
npm audit 2>&1 | tee "$OUTPUT_DIR/audit-summary.txt" || true

echo "[4/5] Analyzing vulnerabilities..."
CRITICAL=0; HIGH=0; MODERATE=0; LOW=0; TOTAL=0
PROD_CRITICAL=0; PROD_HIGH=0; PROD_MODERATE=0; PROD_LOW=0; PROD_TOTAL=0
PROD_SCOPE="unknown"
NOTE=""

if command -v jq &> /dev/null; then
  # Full audit counts
  CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  HIGH=$(jq '.metadata.vulnerabilities.high // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  LOW=$(jq '.metadata.vulnerabilities.low // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)
  TOTAL=$(jq '.metadata.vulnerabilities.total // 0' "$OUTPUT_DIR/audit.json" 2>/dev/null || echo 0)

  # Prod-only audit counts
  PROD_CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' "$OUTPUT_DIR/audit-prod.json" 2>/dev/null || echo 0)
  PROD_HIGH=$(jq '.metadata.vulnerabilities.high // 0' "$OUTPUT_DIR/audit-prod.json" 2>/dev/null || echo 0)
  PROD_MODERATE=$(jq '.metadata.vulnerabilities.moderate // 0' "$OUTPUT_DIR/audit-prod.json" 2>/dev/null || echo 0)
  PROD_LOW=$(jq '.metadata.vulnerabilities.low // 0' "$OUTPUT_DIR/audit-prod.json" 2>/dev/null || echo 0)
  PROD_TOTAL=$(jq '.metadata.vulnerabilities.total // 0' "$OUTPUT_DIR/audit-prod.json" 2>/dev/null || echo 0)

  if [ "${PROD_TOTAL:-0}" -eq 0 ]; then
    PROD_SCOPE="dev_only"
    NOTE="All vulnerabilities are devDependency-only (prod_scope clean). Commonly caused by test tooling (e.g., newman transitive deps)."
  else
    PROD_SCOPE="includes_prod"
    NOTE="Production dependency scope has vulnerabilities (prod_scope not clean). Consider tightening gate for Go-Live."
  fi
else
  NOTE="jq not found; prod_scope unknown. Install jq for structured parsing."
fi

# Determine status based on Pilot stage policy
STATUS="PASS"
if [ "${TOTAL:-0}" -gt 0 ]; then
  STATUS="WARN"
fi
if [ "${CRITICAL:-0}" -gt 0 ]; then
  STATUS="FAIL"
fi

echo "[5/5] Writing metadata..."
cat > "$OUTPUT_DIR/metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "source": "apps/api",
  "generated_by": "scripts/audit_api.sh",
  "stage": "pilot",
  "status": "$STATUS",
  "npm_audit_exit_code": $AUDIT_EXIT_CODE,
  "npm_audit_prod_exit_code": $AUDIT_PROD_EXIT_CODE,
  "vulnerabilities": {
    "critical": ${CRITICAL:-0},
    "high": ${HIGH:-0},
    "moderate": ${MODERATE:-0},
    "low": ${LOW:-0},
    "total": ${TOTAL:-0}
  },
  "prod_scope": {
    "mode": "$PROD_SCOPE",
    "vulnerabilities": {
      "critical": ${PROD_CRITICAL:-0},
      "high": ${PROD_HIGH:-0},
      "moderate": ${PROD_MODERATE:-0},
      "low": ${PROD_LOW:-0},
      "total": ${PROD_TOTAL:-0}
    }
  },
  "policy": {
    "critical": "BLOCK",
    "high": "WARN",
    "moderate": "ALLOW",
    "low": "ALLOW"
  },
  "notes": [
    "$NOTE"
  ],
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)",
  "files": [
    "audit.json",
    "audit-prod.json",
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

echo "=== Vulnerability Summary (full) ==="
echo "  Critical: ${CRITICAL:-0}"
echo "  High:     ${HIGH:-0}"
echo "  Moderate: ${MODERATE:-0}"
echo "  Low:      ${LOW:-0}"
echo "  Total:    ${TOTAL:-0}"
echo ""

echo "=== Vulnerability Summary (prod_scope: $PROD_SCOPE) ==="
echo "  Critical: ${PROD_CRITICAL:-0}"
echo "  High:     ${PROD_HIGH:-0}"
echo "  Moderate: ${PROD_MODERATE:-0}"
echo "  Low:      ${PROD_LOW:-0}"
echo "  Total:    ${PROD_TOTAL:-0}"
echo ""

echo "Status: $STATUS"
echo ""

LATEST_LINK="$REPO_ROOT/artifacts/scan/api-audit/latest"
rm -f "$LATEST_LINK"
ln -s "$OUTPUT_DIR" "$LATEST_LINK"
echo "Latest symlink: $LATEST_LINK"

if [ "$STATUS" = "FAIL" ]; then
  echo ""
  echo "[GATE FAIL] Critical vulnerabilities found - blocking pipeline"
  exit 1
fi

echo ""
echo "[GATE $STATUS] Audit artifacts saved (exit 0)"
exit 0
