# Security Gate Policy (SoT)

> **Version**: 1.0
> **Date**: 2026-01-29
> **Related SVC**: SVC-W4-1, SVC-W4-2
> **Status**: Pilot (WARN/ALLOW)

---

## 1. Policy Overview

This document defines the **Source of Truth (SoT)** for dependency vulnerability gate policies in SIPAIOS.

### Current Stage: Pilot

| Severity | Action | CI Behavior | Rationale |
|----------|--------|-------------|-----------|
| Critical | **BLOCK** | Exit 1, fail pipeline | Immediate security risk |
| High | **WARN** | Log warning, continue | See Section 3 below |
| Moderate | **ALLOW** | Log only | Low exploitability in context |
| Low/Info | **ALLOW** | Silent | Informational only |

---

## 2. Gate Command

```bash
make audit-api
```

**Output Location**: `artifacts/scan/api-audit/latest/`

**Exit Codes**:
- `0` = No vulnerabilities
- `1+` = Vulnerabilities found (count varies)

---

## 3. Why High Vulnerabilities Are Currently WARN (Not BLOCK)

### 3.1 Current Vulnerability Profile (2026-01-29, post SVC-W4-3)

```
Total: 10 vulnerabilities (was 12, fixed 2 via bcrypt upgrade)
  - Critical: 0
  - High: 5 (was 7)
  - Moderate: 5
  - Low: 0
```

### 3.2 Root Cause Analysis

**All 10 remaining vulnerabilities trace to a single source**: `newman` (devDependency)

```
newman@6.2.1 (devDependency)
  └── postman-runtime
       ├── jose (moderate: GHSA-hhhv-q57g-882q)
       ├── lodash (moderate: GHSA-xxjr-mmjv-4gpg)
       ├── node-forge (high: 3 CVEs - ASN.1 issues)
       ├── qs (high: GHSA-6rw7-vpxm-498p)
       └── postman-request → qs

# FIXED in SVC-W4-3: tar vulnerabilities removed by bcrypt 5.1.1 → 6.0.0 upgrade
# (removed @mapbox/node-pre-gyp dependency chain)
```

### 3.3 Risk Assessment

| Factor | Assessment |
|--------|------------|
| **Scope** | `devDependencies` only - NOT in production bundle |
| **Attack Surface** | CI/local test environment only |
| **Exploitability** | Requires malicious Postman collection or crafted input |
| **Business Impact** | Low - test tooling, not customer-facing |

### 3.4 Decision Rationale

1. **No production exposure**: `newman` is used only for API testing via `make gate-app-02`
2. **Trusted input only**: We control the Postman collections (no external/untrusted input)
3. **Breaking change risk**: `npm audit fix --force` would downgrade newman to v2.1.2 (major breaking change)
4. **Upstream dependency**: Waiting for `postman-runtime` to update dependencies

**Conclusion**: Accept risk with monitoring; do NOT block deployment for devDependency vulnerabilities.

---

## 4. Gate Escalation Triggers

### 4.1 When to Upgrade from WARN to BLOCK

High vulnerabilities **MUST** become BLOCK when ANY of the following occur:

| Trigger | Action Required |
|---------|-----------------|
| **Critical vulnerability in ANY dependency** | Immediate BLOCK |
| **High vulnerability in production dependency** | BLOCK within 48h |
| **CVE actively exploited in the wild** | Immediate BLOCK |
| **Vulnerability affects customer data path** | BLOCK within 24h |
| **Go-Live stage reached** | Re-evaluate all WARN -> BLOCK |

### 4.2 Pilot -> Production Gate Transition

Before exiting Pilot stage:

1. [ ] All Critical/High in `dependencies` (not devDependencies) must be resolved
2. [ ] `npm audit fix` (non-breaking) must be applied
3. [ ] Remaining devDependency vulnerabilities must have documented accept-risk decision
4. [ ] CI must enforce gate policy (not just warn)

---

## 5. Remediation Playbook

### 5.1 For Production Dependencies (BLOCK)

```bash
cd apps/api
npm audit fix                    # Safe fix (non-breaking)
npm update <package>             # Update specific package
npm audit                        # Verify fix
```

### 5.2 For DevDependencies (WARN)

```bash
# Option A: Wait for upstream fix (preferred)
# Monitor: https://github.com/postmanlabs/newman/issues

# Option B: Force fix (may break tests)
npm audit fix --force
npm run test:newman              # Verify tests still pass

# Option C: Replace tooling
# Consider: switching from newman to alternative API testing tool
```

### 5.3 Accept Risk Documentation

If accepting risk, update this file with:

```markdown
### Accepted Risk: <CVE-ID>
- **Date**: YYYY-MM-DD
- **Severity**: High/Moderate
- **Package**: <package-name>
- **Reason**: <why accepting>
- **Review Date**: <when to re-evaluate>
- **Owner**: <name>
```

---

## 6. Accepted Risks Register

### Remediated: tar vulnerabilities (SVC-W4-3)

- **Date**: 2026-01-29
- **Action**: Upgraded `bcrypt` 5.1.1 → 6.0.0
- **Result**: Removed `@mapbox/node-pre-gyp` → `tar` dependency chain
- **Vulnerabilities Fixed**: 2 High (GHSA-8qq5-rm4j-mr97, GHSA-r6q2-hw4h-h46w, GHSA-34x7-hfp2-rc4v)
- **Verification**: `make gate-app-02` PASS (14 requests, 35 assertions, 0 failed)

### Waiver: newman transitive dependencies (5 High, 5 Moderate)

- **Date**: 2026-01-29 (updated from initial 7H/5M)
- **Severity**: High (5), Moderate (5) — Total: 10
- **Packages**: `node-forge`, `qs`, `jose`, `lodash` (via newman)
- **Dependency Path**:
  ```
  newman@6.2.1 (devDependency)
    └── postman-runtime
         ├── node-forge (high: 3 CVEs - ASN.1 issues)
         ├── qs (high: 2 CVEs - DoS via arrayLimit)
         ├── jose (moderate: resource exhaustion)
         └── lodash (moderate: prototype pollution)
  ```
- **Reason**:
  - DevDependency only (not in production bundle)
  - Trusted input (our own Postman collections)
  - Breaking change required to fix (newman v6 → v2)
  - No safe upgrade path available
- **Review Date**: 2026-02-15 (or when newman/postman-runtime releases fix)
- **Owner**: Engineering Team

---

## 7. CI Integration (Future)

When transitioning to Production stage, add to CI pipeline:

```yaml
# .github/workflows/security.yml
security-gate:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci --prefix apps/api
    - run: make audit-api
    - name: Check Critical/High (prod deps)
      run: |
        CRITICAL=$(jq '.metadata.vulnerabilities.critical' artifacts/scan/api-audit/latest/audit.json)
        if [ "$CRITICAL" -gt 0 ]; then
          echo "FAIL: Critical vulnerabilities found"
          exit 1
        fi
```

---

## 8. References

- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [GHSA Database](https://github.com/advisories)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- Project audit artifacts: `artifacts/scan/api-audit/`

---

## Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-01-29 | 1.0 | Initial policy (Pilot stage) | Claude |
