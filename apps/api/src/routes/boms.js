import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, pool } from '../db.js';
import { config } from '../config.js';

const router = Router();

const IDEMPOTENCY_SCOPE = 'bom_save';

/**
 * Auth middleware: verify JWT and extract company context
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authorization header required',
    });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    if (!decoded.company_id) {
      return res.status(403).json({
        error: 'NO_COMPANY_CONTEXT',
        message: 'No company selected. Use /switch-company first.',
      });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

function hashPayload(payload) {
  const raw = stableStringify(payload);
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function resolveIdempotencyKey(req) {
  const headerValue = req.headers['idempotency-key'];
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }
  return headerValue ? String(headerValue) : null;
}

/**
 * GET /boms
 * Response: { boms: [...], count: number }
 */
router.get('/boms', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;

  try {
    const result = await query(
      `SELECT bh.id as bom_header_id,
              bh.fg_item_id,
              bh.code,
              bh.created_at,
              i.item_no as fg_item_no,
              i.name as fg_item_name,
              bv.id as latest_version_id,
              bv.version_no as latest_version_no,
              bv.status as latest_status,
              bv.created_at as latest_created_at
       FROM bom_headers bh
       JOIN items i ON i.id = bh.fg_item_id
       LEFT JOIN LATERAL (
         SELECT id, version_no, status, created_at
         FROM bom_versions
         WHERE bom_header_id = bh.id
         ORDER BY version_no DESC
         LIMIT 1
       ) bv ON true
       WHERE bh.company_id = $1
       ORDER BY i.item_no`,
      [company_id]
    );

    return res.json({
      boms: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List boms error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /boms/:id
 * Response: { header, versions, lines }
 */
router.get('/boms/:id', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;
  const { id } = req.params;

  try {
    const headerResult = await query(
      `SELECT bh.id,
              bh.fg_item_id,
              bh.code,
              bh.created_at,
              i.item_no as fg_item_no,
              i.name as fg_item_name
       FROM bom_headers bh
       JOIN items i ON i.id = bh.fg_item_id
       WHERE bh.id = $1 AND bh.company_id = $2`,
      [id, company_id]
    );

    if (headerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'BOM not found',
      });
    }

    const versionsResult = await query(
      `SELECT id, version_no, status, effective_from, note, created_at
       FROM bom_versions
       WHERE bom_header_id = $1
       ORDER BY version_no DESC`,
      [id]
    );

    const linesResult = await query(
      `SELECT bl.id,
              bl.bom_version_id,
              bl.line_no,
              bl.component_item_id,
              bl.qty_per,
              bl.uom_id,
              bl.scrap_factor,
              bl.note,
              i.item_no as component_item_no,
              i.name as component_item_name,
              u.code as uom_code
       FROM bom_lines bl
       JOIN bom_versions bv ON bv.id = bl.bom_version_id
       JOIN items i ON i.id = bl.component_item_id
       LEFT JOIN uoms u ON u.id = bl.uom_id
       WHERE bv.bom_header_id = $1
       ORDER BY bl.bom_version_id, bl.line_no`,
      [id]
    );

    return res.json({
      header: headerResult.rows[0],
      versions: versionsResult.rows,
      lines: linesResult.rows,
    });
  } catch (err) {
    console.error('Get bom detail error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * POST /boms
 * Body: { parent_item_id, code?, note?, lines: [{ child_item_id, qty, uom_id?, scrap_factor?, note? }] }
 * Response: { bom_header_id, bom_version_id, version_no, ... }
 */
router.post('/boms', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;
  const { parent_item_id, code, note, lines } = req.body || {};

  if (!parent_item_id || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'parent_item_id and at least one line are required',
    });
  }

  const idempotencyKey = resolveIdempotencyKey(req);
  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'IDEMPOTENCY_REQUIRED',
      message: 'Idempotency-Key header is required',
    });
  }

  const sanitizedLines = lines.map((line) => ({
    child_item_id: line?.child_item_id,
    qty: line?.qty,
    uom_id: line?.uom_id ?? null,
    scrap_factor: line?.scrap_factor ?? 0,
    note: line?.note ?? null,
  }));

  const requestFingerprint = hashPayload({
    parent_item_id,
    code: code ?? null,
    note: note ?? null,
    lines: sanitizedLines,
  });

  try {
    const existingResult = await query(
      `SELECT id, request_fingerprint, response_status, response_body
       FROM sys_idempotency_keys
       WHERE scope = $1 AND idempotency_key = $2 AND company_id = $3`,
      [IDEMPOTENCY_SCOPE, idempotencyKey, company_id]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      if (existing.request_fingerprint === requestFingerprint && existing.response_body) {
        await query(
          `UPDATE sys_idempotency_keys SET last_seen_at = now() WHERE id = $1`,
          [existing.id]
        );
        return res.status(existing.response_status || 200).json(existing.response_body);
      }
      return res.status(409).json({
        error: 'IDEMPOTENCY_CONFLICT',
        message: 'Idempotency-Key reused with different payload',
      });
    }

    const parentCheck = await query(
      `SELECT id FROM items WHERE id = $1 AND company_id = $2`,
      [parent_item_id, company_id]
    );
    if (parentCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Parent item not found or not accessible',
      });
    }

    const childIds = sanitizedLines.map((line) => line.child_item_id);
    if (childIds.some((value) => typeof value !== 'string' || value.length === 0)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Each line must include child_item_id',
      });
    }

    const uniqueChildIds = Array.from(new Set(childIds));

    const childItemsResult = await query(
      `SELECT id, base_uom_id
       FROM items
       WHERE company_id = $1 AND id = ANY($2)`,
      [company_id, uniqueChildIds]
    );
    const childItemsMap = new Map(
      childItemsResult.rows.map((row) => [row.id, row])
    );

    if (childItemsMap.size !== uniqueChildIds.length) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'One or more child items not accessible',
      });
    }

    for (const line of sanitizedLines) {
      if (!line.qty || Number(line.qty) <= 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Line qty must be greater than 0',
        });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let bomHeaderId = null;
      let bomHeaderCode = code || null;
      const headerResult = await client.query(
        `SELECT id, code FROM bom_headers WHERE company_id = $1 AND fg_item_id = $2`,
        [company_id, parent_item_id]
      );
      if (headerResult.rows.length > 0) {
        bomHeaderId = headerResult.rows[0].id;
        bomHeaderCode = headerResult.rows[0].code;
      } else {
        const insertHeader = await client.query(
          `INSERT INTO bom_headers (company_id, fg_item_id, code)
           VALUES ($1, $2, $3)
           RETURNING id, code, created_at`,
          [company_id, parent_item_id, bomHeaderCode]
        );
        bomHeaderId = insertHeader.rows[0].id;
        bomHeaderCode = insertHeader.rows[0].code;
      }

      const versionNoResult = await client.query(
        `SELECT COALESCE(MAX(version_no), 0) as max_version
         FROM bom_versions
         WHERE bom_header_id = $1`,
        [bomHeaderId]
      );
      const versionNo = Number(versionNoResult.rows[0].max_version) + 1;

      const versionResult = await client.query(
        `INSERT INTO bom_versions (bom_header_id, version_no, status, note)
         VALUES ($1, $2, 'draft', $3)
         RETURNING id, version_no, status, effective_from, created_at`,
        [bomHeaderId, versionNo, note || null]
      );
      const bomVersion = versionResult.rows[0];

      const insertedLines = [];
      for (let i = 0; i < sanitizedLines.length; i++) {
        const line = sanitizedLines[i];
        const child = childItemsMap.get(line.child_item_id);
        const resolvedUomId = line.uom_id || child?.base_uom_id;
        if (!resolvedUomId) {
          throw new Error('UOM_NOT_FOUND');
        }
        const lineResult = await client.query(
          `INSERT INTO bom_lines (
             bom_version_id, line_no, component_item_id, qty_per, uom_id, scrap_factor, note
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            bomVersion.id,
            i + 1,
            line.child_item_id,
            line.qty,
            resolvedUomId,
            line.scrap_factor ?? 0,
            line.note || null,
          ]
        );
        insertedLines.push({
          id: lineResult.rows[0].id,
          line_no: i + 1,
          child_item_id: line.child_item_id,
          qty: line.qty,
          uom_id: resolvedUomId,
          scrap_factor: line.scrap_factor ?? 0,
          note: line.note || null,
        });
      }

      await client.query('COMMIT');

      const responseBody = {
        bom_header_id: bomHeaderId,
        bom_header_code: bomHeaderCode,
        bom_version_id: bomVersion.id,
        version_no: bomVersion.version_no,
        status: bomVersion.status,
        effective_from: bomVersion.effective_from,
        created_at: bomVersion.created_at,
        parent_item_id,
        lines: insertedLines,
      };

      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
      try {
        await query(
          `INSERT INTO sys_idempotency_keys (
             scope, company_id, idempotency_key, request_fingerprint,
             request_body, response_status, response_body, status, expires_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)`,
          [
            IDEMPOTENCY_SCOPE,
            company_id,
            idempotencyKey,
            requestFingerprint,
            req.body,
            201,
            responseBody,
            expiresAt,
          ]
        );
      } catch (err) {
        if (err?.code !== '23505') {
          throw err;
        }
      }

      return res.status(201).json(responseBody);
    } catch (err) {
      await client.query('ROLLBACK');
      if (err?.message === 'UOM_NOT_FOUND') {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Line uom_id not found and item base_uom_id missing',
        });
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Save bom error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

export default router;
