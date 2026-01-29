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

/**
 * POST /production-reports
 * Create a production report with backflush (FIFO material consumption)
 * Body: { work_order_id, qty_produced, note? }
 * Response: { id, work_order_id, qty_produced, fg_lot, consumed_materials, ... }
 */
router.post('/production-reports', requireAuth, async (req, res) => {
  const { work_order_id, qty_produced, note } = req.body;
  const company_id = req.user.company_id;

  // Validate required fields
  if (!work_order_id || !qty_produced) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'work_order_id and qty_produced are required',
    });
  }

  if (qty_produced <= 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'qty_produced must be greater than 0',
    });
  }

  try {
    // 1. Verify work order exists, belongs to company, and is released
    const woResult = await query(
      `SELECT wo.id, wo.wo_no, wo.item_id, wo.planned_qty, wo.uom_id, wo.bom_version_id,
              wo.site_id, wo.primary_warehouse_id, wo.status,
              i.item_no as fg_item_no, i.name as fg_item_name
       FROM work_orders wo
       JOIN items i ON i.id = wo.item_id
       WHERE wo.id = $1 AND wo.company_id = $2`,
      [work_order_id, company_id]
    );

    if (woResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Work order not found',
      });
    }

    const wo = woResult.rows[0];

    if (wo.status !== 'released') {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Work order status must be 'released', current status: '${wo.status}'`,
      });
    }

    // 2. Get BOM lines for this work order
    const bomResult = await query(
      `SELECT bl.id, bl.line_no, bl.component_item_id, bl.qty_per, bl.uom_id, bl.scrap_factor,
              i.item_no as component_item_no, i.name as component_item_name
       FROM bom_lines bl
       JOIN items i ON i.id = bl.component_item_id
       WHERE bl.bom_version_id = $1
       ORDER BY bl.line_no`,
      [wo.bom_version_id]
    );

    if (bomResult.rows.length === 0) {
      return res.status(400).json({
        error: 'BOM_EMPTY',
        message: 'BOM has no lines, cannot perform backflush',
      });
    }

    // 3. Calculate required materials and check availability
    const materialsNeeded = [];
    for (const bomLine of bomResult.rows) {
      const qtyNeeded = parseFloat(qty_produced) * parseFloat(bomLine.qty_per) * (1 + parseFloat(bomLine.scrap_factor));

      // Get available inventory with lots (FIFO by received_at)
      const invResult = await query(
        `SELECT ib.id, ib.lot_id, ib.qty, il.lot_code, il.received_at
         FROM inventory_balances ib
         JOIN inventory_lots il ON il.id = ib.lot_id
         WHERE ib.company_id = $1
           AND ib.site_id = $2
           AND ib.warehouse_id = $3
           AND ib.item_id = $4
           AND ib.qty > 0
         ORDER BY il.received_at ASC`,
        [company_id, wo.site_id, wo.primary_warehouse_id, bomLine.component_item_id]
      );

      const totalAvailable = invResult.rows.reduce((sum, row) => sum + parseFloat(row.qty), 0);

      if (totalAvailable < qtyNeeded) {
        return res.status(400).json({
          error: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for ${bomLine.component_item_no}: need ${qtyNeeded.toFixed(6)}, available ${totalAvailable.toFixed(6)}`,
          details: {
            item_id: bomLine.component_item_id,
            item_no: bomLine.component_item_no,
            qty_needed: qtyNeeded,
            qty_available: totalAvailable,
          },
        });
      }

      materialsNeeded.push({
        bomLine,
        qtyNeeded,
        availableLots: invResult.rows,
      });
    }

    // 4. Create FG lot for produced goods
    const fgLotCode = `FG-${wo.wo_no}-${Date.now()}`;
    const fgLotResult = await query(
      `INSERT INTO inventory_lots (company_id, item_id, lot_code, lot_type, received_at, note)
       VALUES ($1, $2, $3, 'production', now(), $4)
       RETURNING id, lot_code`,
      [company_id, wo.item_id, fgLotCode, `Produced from ${wo.wo_no}`]
    );
    const fgLot = fgLotResult.rows[0];

    // 5. Create production_lot record
    const prodLotResult = await query(
      `INSERT INTO production_lots (company_id, work_order_id, fg_lot_id, qty, uom_id, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, produced_at`,
      [company_id, work_order_id, fgLot.id, qty_produced, wo.uom_id, note || null]
    );
    const productionLot = prodLotResult.rows[0];

    // 6. Create backflush_run
    const backflushResult = await query(
      `INSERT INTO backflush_runs (work_order_id, production_lot_id, status, note)
       VALUES ($1, $2, 'posted', $3)
       RETURNING id`,
      [work_order_id, productionLot.id, `Backflush for ${qty_produced} units`]
    );
    const backflushRun = backflushResult.rows[0];

    // 7. Perform FIFO consumption and record allocations
    const consumedMaterials = [];
    for (const material of materialsNeeded) {
      let remaining = material.qtyNeeded;
      const allocations = [];

      for (const lot of material.availableLots) {
        if (remaining <= 0) break;

        const consumeQty = Math.min(remaining, parseFloat(lot.qty));
        remaining -= consumeQty;

        // Deduct from inventory_balances
        await query(
          `UPDATE inventory_balances SET qty = qty - $1, updated_at = now()
           WHERE id = $2`,
          [consumeQty, lot.id]
        );

        // Record backflush_allocation
        await query(
          `INSERT INTO backflush_allocations (backflush_run_id, component_item_id, component_lot_id, qty, uom_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [backflushRun.id, material.bomLine.component_item_id, lot.lot_id, consumeQty, material.bomLine.uom_id]
        );

        allocations.push({
          lot_id: lot.lot_id,
          lot_code: lot.lot_code,
          qty_consumed: consumeQty,
        });
      }

      consumedMaterials.push({
        item_id: material.bomLine.component_item_id,
        item_no: material.bomLine.component_item_no,
        qty_consumed: material.qtyNeeded,
        allocations,
      });
    }

    // 8. Add FG to inventory_balances
    await query(
      `INSERT INTO inventory_balances (company_id, site_id, warehouse_id, item_id, lot_id, qty, uom_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (company_id, site_id, warehouse_id, item_id, lot_id)
       DO UPDATE SET qty = inventory_balances.qty + EXCLUDED.qty, updated_at = now()`,
      [company_id, wo.site_id, wo.primary_warehouse_id, wo.item_id, fgLot.id, qty_produced, wo.uom_id]
    );

    // 9. Return production report
    return res.status(201).json({
      id: productionLot.id,
      work_order_id,
      wo_no: wo.wo_no,
      qty_produced: parseFloat(qty_produced),
      produced_at: productionLot.produced_at,
      fg_lot: {
        id: fgLot.id,
        lot_code: fgLot.lot_code,
        item_id: wo.item_id,
        item_no: wo.fg_item_no,
      },
      backflush_run_id: backflushRun.id,
      consumed_materials: consumedMaterials,
    });
  } catch (err) {
    console.error('Create Production Report error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /production-reports/:id
 * Get production report with traceability info
 * Response: { id, work_order_id, fg_lot, consumed_materials, ... }
 */
router.get('/production-reports/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const company_id = req.user.company_id;

  try {
    // Get production lot with work order info
    const prodLotResult = await query(
      `SELECT pl.id, pl.work_order_id, pl.fg_lot_id, pl.qty, pl.uom_id, pl.produced_at, pl.note,
              wo.wo_no, wo.item_id, wo.site_id, wo.primary_warehouse_id,
              i.item_no as fg_item_no, i.name as fg_item_name,
              il.lot_code as fg_lot_code
       FROM production_lots pl
       JOIN work_orders wo ON wo.id = pl.work_order_id
       JOIN items i ON i.id = wo.item_id
       JOIN inventory_lots il ON il.id = pl.fg_lot_id
       WHERE pl.id = $1 AND pl.company_id = $2`,
      [id, company_id]
    );

    if (prodLotResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Production report not found',
      });
    }

    const prodLot = prodLotResult.rows[0];

    // Get backflush allocations (consumed materials trace)
    const allocResult = await query(
      `SELECT ba.component_item_id, ba.component_lot_id, ba.qty, ba.uom_id,
              i.item_no as component_item_no, i.name as component_item_name,
              il.lot_code as component_lot_code
       FROM backflush_runs br
       JOIN backflush_allocations ba ON ba.backflush_run_id = br.id
       JOIN items i ON i.id = ba.component_item_id
       LEFT JOIN inventory_lots il ON il.id = ba.component_lot_id
       WHERE br.production_lot_id = $1
       ORDER BY i.item_no, il.lot_code`,
      [id]
    );

    // Group allocations by item
    const consumedMaterials = [];
    const itemMap = new Map();

    for (const alloc of allocResult.rows) {
      if (!itemMap.has(alloc.component_item_id)) {
        itemMap.set(alloc.component_item_id, {
          item_id: alloc.component_item_id,
          item_no: alloc.component_item_no,
          item_name: alloc.component_item_name,
          total_qty: 0,
          allocations: [],
        });
      }
      const item = itemMap.get(alloc.component_item_id);
      item.total_qty += parseFloat(alloc.qty);
      item.allocations.push({
        lot_id: alloc.component_lot_id,
        lot_code: alloc.component_lot_code,
        qty: parseFloat(alloc.qty),
      });
    }

    for (const item of itemMap.values()) {
      consumedMaterials.push(item);
    }

    return res.json({
      id: prodLot.id,
      work_order_id: prodLot.work_order_id,
      wo_no: prodLot.wo_no,
      qty_produced: parseFloat(prodLot.qty),
      produced_at: prodLot.produced_at,
      note: prodLot.note,
      fg_lot: {
        id: prodLot.fg_lot_id,
        lot_code: prodLot.fg_lot_code,
        item_id: prodLot.item_id,
        item_no: prodLot.fg_item_no,
        item_name: prodLot.fg_item_name,
      },
      consumed_materials: consumedMaterials,
    });
  } catch (err) {
    console.error('Get Production Report error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

export default router;
