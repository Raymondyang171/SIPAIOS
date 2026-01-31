import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// ============================================================
// Department Routes (/depts)
// ============================================================

/**
 * GET /depts
 * Query params: tenant_id (optional)
 * Response: { depts: [...] }
 */
router.get('/depts', async (req, res) => {
  try {
    const { tenant_id } = req.query;

    let sql = `
      SELECT id, tenant_id, code, name, created_at, updated_at
      FROM sys_depts
    `;
    const params = [];

    if (tenant_id) {
      sql += ' WHERE tenant_id = $1';
      params.push(tenant_id);
    }

    sql += ' ORDER BY code ASC';

    const result = await query(sql, params);
    return res.json({ depts: result.rows });
  } catch (err) {
    console.error('GET /depts error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch departments',
    });
  }
});

/**
 * POST /depts
 * Body: { tenant_id, code, name }
 * Response: { dept: {...} }
 */
router.post('/depts', async (req, res) => {
  const { tenant_id, code, name } = req.body;

  if (!tenant_id || !code || !name) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'tenant_id, code, and name are required',
    });
  }

  try {
    const result = await query(
      `INSERT INTO sys_depts (tenant_id, code, name)
       VALUES ($1, $2, $3)
       RETURNING id, tenant_id, code, name, created_at, updated_at`,
      [tenant_id, code, name]
    );

    return res.status(201).json({ dept: result.rows[0] });
  } catch (err) {
    console.error('POST /depts error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Department code already exists for this tenant',
      });
    }

    if (err.code === '23503') {
      return res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'Invalid tenant_id',
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create department',
    });
  }
});

/**
 * PUT /depts/:id
 * Body: { code?, name? }
 * Response: { dept: {...} }
 */
router.put('/depts/:id', async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  if (!code && !name) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'At least one of code or name must be provided',
    });
  }

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (code) {
      updates.push(`code = $${paramIndex++}`);
      params.push(code);
    }
    if (name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    updates.push(`updated_at = now()`);
    params.push(id);

    const sql = `
      UPDATE sys_depts
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, tenant_id, code, name, created_at, updated_at
    `;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Department not found',
      });
    }

    return res.json({ dept: result.rows[0] });
  } catch (err) {
    console.error('PUT /depts/:id error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Department code already exists for this tenant',
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update department',
    });
  }
});

// ============================================================
// User Routes (/users)
// ============================================================

/**
 * GET /users
 * Query params: tenant_id (optional), is_active (optional)
 * Response: { users: [...] }
 */
router.get('/users', async (req, res) => {
  try {
    const { tenant_id, is_active } = req.query;

    let sql = `
      SELECT
        u.id,
        u.email,
        u.display_name,
        u.dept_id,
        u.is_active,
        u.created_at,
        u.updated_at,
        d.code as dept_code,
        d.name as dept_name
      FROM sys_users u
      LEFT JOIN sys_depts d ON d.id = u.dept_id
    `;

    const conditions = [];
    const params = [];

    if (tenant_id) {
      params.push(tenant_id);
      conditions.push(`EXISTS (
        SELECT 1 FROM sys_memberships m
        WHERE m.user_id = u.id AND m.tenant_id = $${params.length}
      )`);
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`u.is_active = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY u.email ASC';

    const result = await query(sql, params);
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('GET /users error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch users',
    });
  }
});

/**
 * POST /users
 * Body: { id?, email, display_name?, dept_id?, is_active? }
 * Response: { user: {...} }
 */
router.post('/users', async (req, res) => {
  const { id, email, display_name, dept_id, is_active = true } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'email is required',
    });
  }

  try {
    const result = await query(
      `INSERT INTO sys_users (id, email, display_name, dept_id, is_active)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5)
       RETURNING id, email, display_name, dept_id, is_active, created_at, updated_at`,
      [id || null, email, display_name || null, dept_id || null, is_active]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('POST /users error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Email already exists',
      });
    }

    if (err.code === '23503') {
      return res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'Invalid dept_id',
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create user',
    });
  }
});

/**
 * PUT /users/:id
 * Body: { email?, display_name?, dept_id?, is_active? }
 * Response: { user: {...} }
 */
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, display_name, dept_id, is_active } = req.body;

  if (email === undefined && display_name === undefined && dept_id === undefined && is_active === undefined) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'At least one field must be provided',
    });
  }

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      params.push(email);
    }
    if (display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      params.push(display_name);
    }
    if (dept_id !== undefined) {
      updates.push(`dept_id = $${paramIndex++}`);
      params.push(dept_id);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(is_active);
    }
    updates.push(`updated_at = now()`);
    params.push(id);

    const sql = `
      UPDATE sys_users
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, display_name, dept_id, is_active, created_at, updated_at
    `;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('PUT /users/:id error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'Email already exists',
      });
    }

    if (err.code === '23503') {
      return res.status(400).json({
        error: 'INVALID_REFERENCE',
        message: 'Invalid dept_id',
      });
    }

    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update user',
    });
  }
});

export default router;
