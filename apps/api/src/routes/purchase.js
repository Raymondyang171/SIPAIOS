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
 * POST /purchase-orders
 * Body: { supplier_id, site_id, lines: [{ item_id, qty, uom_id, unit_price }] }
 * Response: { id, po_no, status, ... }
 */
router.post('/purchase-orders', requireAuth, async (req, res) => {
  const { supplier_id, site_id, lines, note } = req.body;
  const company_id = req.user.company_id;

  if (!supplier_id || !site_id || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'supplier_id, site_id, and at least one line are required',
    });
  }

  try {
    // Verify supplier belongs to company
    const supplierCheck = await query(
      'SELECT id FROM suppliers WHERE id = $1 AND company_id = $2',
      [supplier_id, company_id]
    );
    if (supplierCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Supplier not found or not accessible',
      });
    }

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

    // Generate PO number (simple: PO-{timestamp})
    const po_no = `PO-${Date.now()}`;

    // Insert PO header
    const poResult = await query(
      `INSERT INTO purchase_orders (company_id, site_id, supplier_id, po_no, status, note)
       VALUES ($1, $2, $3, $4, 'draft', $5)
       RETURNING id, po_no, status, order_date, created_at`,
      [company_id, site_id, supplier_id, po_no, note || null]
    );
    const po = poResult.rows[0];

    // Insert PO lines
    const insertedLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.item_id || !line.qty || !line.uom_id) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: `Line ${i + 1}: item_id, qty, and uom_id are required`,
        });
      }

      // Verify item belongs to company
      const itemCheck = await query(
        'SELECT id FROM items WHERE id = $1 AND company_id = $2',
        [line.item_id, company_id]
      );
      if (itemCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Line ${i + 1}: Item not found or not accessible`,
        });
      }

      const lineResult = await query(
        `INSERT INTO purchase_order_lines (purchase_order_id, line_no, item_id, qty, uom_id, unit_price, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, line_no, item_id, qty, uom_id, unit_price`,
        [po.id, i + 1, line.item_id, line.qty, line.uom_id, line.unit_price || 0, line.note || null]
      );
      insertedLines.push(lineResult.rows[0]);
    }

    return res.status(201).json({
      id: po.id,
      po_no: po.po_no,
      status: po.status,
      order_date: po.order_date,
      created_at: po.created_at,
      lines: insertedLines,
    });
  } catch (err) {
    console.error('Create PO error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * POST /goods-receipt-notes
 * Body: { supplier_id, site_id, purchase_order_id?, lines: [{ item_id, qty_received, uom_id, warehouse_id }] }
 * Response: { id, grn_no, status, ... }
 */
router.post('/goods-receipt-notes', requireAuth, async (req, res) => {
  const { supplier_id, site_id, purchase_order_id, lines, note } = req.body;
  const company_id = req.user.company_id;

  if (!supplier_id || !site_id || !lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'supplier_id, site_id, and at least one line are required',
    });
  }

  try {
    // Verify supplier belongs to company
    const supplierCheck = await query(
      'SELECT id FROM suppliers WHERE id = $1 AND company_id = $2',
      [supplier_id, company_id]
    );
    if (supplierCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Supplier not found or not accessible',
      });
    }

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

    // Verify PO if provided
    if (purchase_order_id) {
      const poCheck = await query(
        'SELECT id FROM purchase_orders WHERE id = $1 AND company_id = $2',
        [purchase_order_id, company_id]
      );
      if (poCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Purchase order not found or not accessible',
        });
      }
    }

    // Generate GRN number
    const grn_no = `GRN-${Date.now()}`;

    // Insert GRN header
    const grnResult = await query(
      `INSERT INTO goods_receipts (company_id, site_id, supplier_id, purchase_order_id, grn_no, status, note)
       VALUES ($1, $2, $3, $4, $5, 'received', $6)
       RETURNING id, grn_no, status, received_at, created_at`,
      [company_id, site_id, supplier_id, purchase_order_id || null, grn_no, note || null]
    );
    const grn = grnResult.rows[0];

    // Insert GRN lines and update inventory
    const insertedLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.item_id || !line.qty_received || !line.uom_id || !line.warehouse_id) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: `Line ${i + 1}: item_id, qty_received, uom_id, and warehouse_id are required`,
        });
      }

      // Verify item belongs to company
      const itemCheck = await query(
        'SELECT id FROM items WHERE id = $1 AND company_id = $2',
        [line.item_id, company_id]
      );
      if (itemCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Line ${i + 1}: Item not found or not accessible`,
        });
      }

      // Verify warehouse belongs to site
      const whCheck = await query(
        'SELECT id FROM warehouses WHERE id = $1 AND site_id = $2',
        [line.warehouse_id, site_id]
      );
      if (whCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: `Line ${i + 1}: Warehouse not found or not accessible`,
        });
      }

      // Insert GRN line
      const lineResult = await query(
        `INSERT INTO goods_receipt_lines (goods_receipt_id, line_no, item_id, qty_received, uom_id, warehouse_id, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, line_no, item_id, qty_received, uom_id, warehouse_id`,
        [grn.id, i + 1, line.item_id, line.qty_received, line.uom_id, line.warehouse_id, line.note || null]
      );
      insertedLines.push(lineResult.rows[0]);

      // Update inventory balance (upsert)
      await query(
        `INSERT INTO inventory_balances (company_id, site_id, warehouse_id, item_id, qty, uom_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (company_id, site_id, warehouse_id, item_id, lot_id)
         DO UPDATE SET qty = inventory_balances.qty + EXCLUDED.qty`,
        [company_id, site_id, line.warehouse_id, line.item_id, line.qty_received, line.uom_id]
      );
    }

    return res.status(201).json({
      id: grn.id,
      grn_no: grn.grn_no,
      status: grn.status,
      received_at: grn.received_at,
      created_at: grn.created_at,
      lines: insertedLines,
    });
  } catch (err) {
    console.error('Create GRN error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /inventory-balances
 * Query: ?item_id=xxx&warehouse_id=xxx&site_id=xxx
 * Response: [{ id, item_id, warehouse_id, qty_on_hand, ... }]
 */
router.get('/inventory-balances', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;
  const { item_id, warehouse_id, site_id } = req.query;

  try {
    let sql = `
      SELECT ib.id, ib.company_id, ib.site_id, ib.warehouse_id, ib.item_id, ib.lot_id, ib.qty, ib.uom_id,
             i.item_no as item_code, i.name as item_description,
             w.code as warehouse_code, w.name as warehouse_name
      FROM inventory_balances ib
      JOIN items i ON i.id = ib.item_id
      JOIN warehouses w ON w.id = ib.warehouse_id
      WHERE ib.company_id = $1
    `;
    const params = [company_id];
    let paramIdx = 2;

    if (item_id) {
      sql += ` AND ib.item_id = $${paramIdx}`;
      params.push(item_id);
      paramIdx++;
    }

    if (warehouse_id) {
      sql += ` AND ib.warehouse_id = $${paramIdx}`;
      params.push(warehouse_id);
      paramIdx++;
    }

    if (site_id) {
      sql += ` AND ib.site_id = $${paramIdx}`;
      params.push(site_id);
      paramIdx++;
    }

    sql += ' ORDER BY i.item_no, w.code';

    const result = await query(sql, params);

    return res.json({
      balances: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('Get inventory balances error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /purchase-orders
 * Query: ?status=xxx&supplier_id=xxx
 * Response: { purchase_orders: [...], count: number }
 */
router.get('/purchase-orders', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;
  const { status, supplier_id } = req.query;

  try {
    let sql = `
      SELECT po.id, po.po_no, po.status, po.order_date, po.note, po.created_at,
             po.supplier_id, s.name as supplier_name, s.code as supplier_code,
             po.site_id, si.code as site_code, si.name as site_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN sites si ON si.id = po.site_id
      WHERE po.company_id = $1
    `;
    const params = [company_id];
    let paramIdx = 2;

    if (status) {
      sql += ` AND po.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (supplier_id) {
      sql += ` AND po.supplier_id = $${paramIdx}`;
      params.push(supplier_id);
      paramIdx++;
    }

    sql += ' ORDER BY po.created_at DESC';

    const result = await query(sql, params);

    return res.json({
      purchase_orders: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List POs error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /purchase-orders/:id
 * Response: { id, po_no, status, lines: [...], ... }
 */
router.get('/purchase-orders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const company_id = req.user.company_id;

  try {
    // Get PO header with supplier and site info
    const poResult = await query(
      `SELECT po.id, po.po_no, po.status, po.order_date, po.note, po.created_at,
              po.supplier_id, s.name as supplier_name, s.code as supplier_code,
              po.site_id, si.code as site_code, si.name as site_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN sites si ON si.id = po.site_id
       WHERE po.id = $1 AND po.company_id = $2`,
      [id, company_id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Purchase order not found',
      });
    }

    const po = poResult.rows[0];

    // Get PO lines with item info
    const linesResult = await query(
      `SELECT pol.id, pol.line_no, pol.item_id, pol.qty, pol.uom_id, pol.unit_price, pol.note,
              i.item_no, i.name as item_name,
              u.code as uom_code, u.name as uom_name
       FROM purchase_order_lines pol
       LEFT JOIN items i ON i.id = pol.item_id
       LEFT JOIN uoms u ON u.id = pol.uom_id
       WHERE pol.purchase_order_id = $1
       ORDER BY pol.line_no`,
      [id]
    );

    // Get related GRNs
    const grnsResult = await query(
      `SELECT gr.id, gr.grn_no, gr.status, gr.received_at, gr.created_at
       FROM goods_receipts gr
       WHERE gr.purchase_order_id = $1
       ORDER BY gr.created_at DESC`,
      [id]
    );

    return res.json({
      ...po,
      lines: linesResult.rows,
      goods_receipts: grnsResult.rows,
    });
  } catch (err) {
    console.error('Get PO error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /suppliers
 * Response: { suppliers: [...], count: number }
 */
router.get('/suppliers', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;

  try {
    const result = await query(
      `SELECT id, code, name FROM suppliers WHERE company_id = $1 ORDER BY code`,
      [company_id]
    );

    return res.json({
      suppliers: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List suppliers error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /sites
 * Response: { sites: [...], count: number }
 */
router.get('/sites', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;

  try {
    const result = await query(
      `SELECT id, code, name FROM sites WHERE company_id = $1 ORDER BY code`,
      [company_id]
    );

    return res.json({
      sites: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List sites error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /items
 * Query: ?type=raw|fg
 * Response: { items: [...], count: number }
 */
router.get('/items', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;
  const { type } = req.query;

  try {
    let sql = `SELECT id, item_no, name, item_type FROM items WHERE company_id = $1`;
    const params = [company_id];

    if (type) {
      const rawType = Array.isArray(type) ? type.join(',') : String(type);
      const normalizedTypes = rawType
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .map((value) => (value === 'raw' ? 'rm' : value));
      if (normalizedTypes.length > 0) {
        sql += ` AND LOWER(item_type::text) = ANY($2)`;
        params.push(normalizedTypes);
      }
    }

    sql += ' ORDER BY item_no';

    const result = await query(sql, params);

    return res.json({
      items: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List items error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /uoms
 * Response: { uoms: [...], count: number }
 */
router.get('/uoms', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;

  try {
    const result = await query(
      `SELECT id, code, name FROM uoms WHERE company_id = $1 ORDER BY code`,
      [company_id]
    );

    return res.json({
      uoms: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List uoms error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * GET /warehouses
 * Query: ?site_id=xxx
 * Response: { warehouses: [...], count: number }
 */
router.get('/warehouses', requireAuth, async (req, res) => {
  const company_id = req.user.company_id;
  const { site_id } = req.query;

  try {
    let sql = `
      SELECT w.id, w.code, w.name, w.site_id, s.code as site_code
      FROM warehouses w
      LEFT JOIN sites s ON s.id = w.site_id
      WHERE s.company_id = $1
    `;
    const params = [company_id];

    if (site_id) {
      sql += ` AND w.site_id = $2`;
      params.push(site_id);
    }

    sql += ' ORDER BY w.code';

    const result = await query(sql, params);

    return res.json({
      warehouses: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('List warehouses error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

export default router;
