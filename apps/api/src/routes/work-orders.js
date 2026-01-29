import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { config } from '../config.js';

const router = Router();

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

/**
 * Generate unique WO number with retry on conflict
 */
async function generateWoNo(company_id, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    const wo_no = `WO-${Date.now()}`;
    const existing = await query(
      'SELECT id FROM work_orders WHERE company_id = $1 AND wo_no = $2',
      [company_id, wo_no]
    );
    if (existing.rows.length === 0) {
      return wo_no;
    }
    // Small delay before retry
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  return null; // Conflict after retries
}

/**
 * POST /work-orders
 * Body: { site_id, item_id, planned_qty, uom_id, bom_version_id, primary_warehouse_id, scheduled_start?, scheduled_end?, note? }
 * Response: { id, wo_no, status, ... }
 */
router.post('/work-orders', requireAuth, async (req, res) => {
  const {
    site_id,
    item_id,
    planned_qty,
    uom_id,
    bom_version_id,
    primary_warehouse_id,
    scheduled_start,
    scheduled_end,
    source_system,
    external_ref_id,
    note,
  } = req.body;
  const company_id = req.user.company_id;

  // Validate required fields
  if (!site_id || !item_id || !planned_qty || !uom_id || !bom_version_id || !primary_warehouse_id) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'site_id, item_id, planned_qty, uom_id, bom_version_id, and primary_warehouse_id are required',
    });
  }

  if (planned_qty <= 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'planned_qty must be greater than 0',
    });
  }

  try {
    // Verify site belongs to company
    const siteCheck = await query(
      'SELECT id FROM sites WHERE id = $1 AND company_id = $2',
      [site_id, company_id]
    );
    if (siteCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Site not found or not accessible',
      });
    }

    // Verify item belongs to company
    const itemCheck = await query(
      'SELECT id FROM items WHERE id = $1 AND company_id = $2',
      [item_id, company_id]
    );
    if (itemCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Item not found or not accessible',
      });
    }

    // Verify uom exists
    const uomCheck = await query(
      'SELECT id FROM uoms WHERE id = $1',
      [uom_id]
    );
    if (uomCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'UOM not found',
      });
    }

    // Verify bom_version_id exists AND belongs to same company (via bom_headers)
    const bomVersionCheck = await query(
      `SELECT bv.id
       FROM bom_versions bv
       JOIN bom_headers bh ON bh.id = bv.bom_header_id
       WHERE bv.id = $1 AND bh.company_id = $2`,
      [bom_version_id, company_id]
    );
    if (bomVersionCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'BOM version not found or not accessible',
      });
    }

    // Verify primary_warehouse belongs to the site
    const warehouseCheck = await query(
      'SELECT id FROM warehouses WHERE id = $1 AND site_id = $2',
      [primary_warehouse_id, site_id]
    );
    if (warehouseCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Warehouse not found or does not belong to the specified site',
      });
    }

    // Generate WO number
    const wo_no = await generateWoNo(company_id);
    if (!wo_no) {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Failed to generate unique WO number. Please retry.',
      });
    }

    // Insert work order
    const woResult = await query(
      `INSERT INTO work_orders (
        company_id, site_id, wo_no, item_id, planned_qty, uom_id,
        bom_version_id, primary_warehouse_id, scheduled_start, scheduled_end,
        source_system, external_ref_id, note
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, wo_no, status, scheduled_start, scheduled_end, created_at`,
      [
        company_id,
        site_id,
        wo_no,
        item_id,
        planned_qty,
        uom_id,
        bom_version_id,
        primary_warehouse_id,
        scheduled_start || null,
        scheduled_end || null,
        source_system || null,
        external_ref_id || null,
        note || null,
      ]
    );
    const wo = woResult.rows[0];

    return res.status(201).json({
      id: wo.id,
      wo_no: wo.wo_no,
      status: wo.status,
      item_id,
      planned_qty,
      uom_id,
      bom_version_id,
      primary_warehouse_id,
      site_id,
      scheduled_start: wo.scheduled_start,
      scheduled_end: wo.scheduled_end,
      created_at: wo.created_at,
    });
  } catch (err) {
    console.error('Create Work Order error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /work-orders/:id
 * Response: { id, wo_no, status, item_id, planned_qty, ... }
 */
router.get('/work-orders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const company_id = req.user.company_id;

  try {
    const result = await query(
      `SELECT wo.id, wo.wo_no, wo.status, wo.item_id, wo.planned_qty, wo.uom_id,
              wo.bom_version_id, wo.primary_warehouse_id, wo.site_id,
              wo.scheduled_start, wo.scheduled_end, wo.released_at, wo.completed_at,
              wo.source_system, wo.external_ref_id, wo.note, wo.created_at,
              i.item_no, i.name as item_name,
              s.code as site_code, s.name as site_name,
              w.code as warehouse_code, w.name as warehouse_name
       FROM work_orders wo
       JOIN items i ON i.id = wo.item_id
       JOIN sites s ON s.id = wo.site_id
       JOIN warehouses w ON w.id = wo.primary_warehouse_id
       WHERE wo.id = $1 AND wo.company_id = $2`,
      [id, company_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Work order not found',
      });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Get Work Order error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /work-orders
 * Query: ?status=xxx&site_id=xxx&item_id=xxx&limit=100
 * Response: { work_orders: [...], count: N }
 */
router.get('/work-orders', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;
  const { status, site_id, item_id } = req.query;
  let limit = parseInt(req.query.limit, 10) || 100;
  if (limit > 1000) limit = 1000;
  if (limit < 1) limit = 1;

  try {
    let sql = `
      SELECT wo.id, wo.wo_no, wo.status, wo.item_id, wo.planned_qty, wo.uom_id,
             wo.bom_version_id, wo.primary_warehouse_id, wo.site_id,
             wo.scheduled_start, wo.scheduled_end, wo.released_at, wo.completed_at,
             wo.created_at,
             i.item_no, i.name as item_name,
             s.code as site_code, s.name as site_name
      FROM work_orders wo
      JOIN items i ON i.id = wo.item_id
      JOIN sites s ON s.id = wo.site_id
      WHERE wo.company_id = $1
    `;
    const params = [company_id];
    let paramIdx = 2;

    if (status) {
      sql += ` AND wo.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (site_id) {
      sql += ` AND wo.site_id = $${paramIdx}`;
      params.push(site_id);
      paramIdx++;
    }

    if (item_id) {
      sql += ` AND wo.item_id = $${paramIdx}`;
      params.push(item_id);
      paramIdx++;
    }

    sql += ` ORDER BY wo.created_at DESC LIMIT $${paramIdx}`;
    params.push(limit);

    const result = await query(sql, params);

    return res.json({
      work_orders: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List Work Orders error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

export default router;
