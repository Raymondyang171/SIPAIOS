import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { config } from '../config.js';

const router = Router();

/**
 * POST /login
 * Body: { email, password }
 * Response: { token, user: { id, email, display_name }, companies: [...] }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Email and password are required',
    });
  }

  try {
    // Find user by email
    const userResult = await query(
      'SELECT id, email, display_name, password_hash FROM sys_users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'AUTH_FAILED',
        message: 'Invalid email or password',
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'AUTH_FAILED',
        message: 'Invalid email or password',
      });
    }

    // Get user's company memberships
    // Note: companies.id == sys_tenants.id (Company = Tenant model)
    const membershipsResult = await query(
      `SELECT
        m.tenant_id,
        m.is_tenant_admin,
        t.slug as tenant_slug,
        c.id as company_id,
        c.code as company_code,
        c.name as company_name
      FROM sys_memberships m
      JOIN sys_tenants t ON t.id = m.tenant_id
      JOIN companies c ON c.id = m.tenant_id
      WHERE m.user_id = $1`,
      [user.id]
    );

    const companies = membershipsResult.rows.map((row) => ({
      company_id: row.company_id,
      company_code: row.company_code,
      company_name: row.company_name,
      tenant_id: row.tenant_id,
      tenant_slug: row.tenant_slug,
      is_admin: row.is_tenant_admin,
    }));

    // Default to first company if available
    const defaultCompany = companies[0] || null;

    // Generate JWT
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      company_id: defaultCompany?.company_id || null,
      tenant_id: defaultCompany?.tenant_id || null,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: config.jwt.expiresIn,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      },
      companies,
      current_company: defaultCompany,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

/**
 * POST /switch-company
 * Headers: Authorization: Bearer <token>
 * Body: { company_id }
 * Response: { token, current_company }
 */
router.post('/switch-company', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authorization header required',
    });
  }

  const token = authHeader.substring(7);
  let decoded;

  try {
    decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }

  const { company_id } = req.body;
  if (!company_id) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'company_id is required',
    });
  }

  try {
    // Verify membership: user must be member of the tenant (company.id == tenant.id)
    const membershipResult = await query(
      `SELECT
        m.tenant_id,
        m.is_tenant_admin,
        t.slug as tenant_slug,
        c.id as company_id,
        c.code as company_code,
        c.name as company_name
      FROM sys_memberships m
      JOIN sys_tenants t ON t.id = m.tenant_id
      JOIN companies c ON c.id = m.tenant_id
      WHERE m.user_id = $1 AND c.id = $2`,
      [decoded.sub, company_id]
    );

    if (membershipResult.rows.length === 0) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You are not a member of this company',
      });
    }

    const company = membershipResult.rows[0];

    // Issue new JWT with updated company context
    const newTokenPayload = {
      sub: decoded.sub,
      email: decoded.email,
      company_id: company.company_id,
      tenant_id: company.tenant_id,
    };

    const newToken = jwt.sign(newTokenPayload, config.jwt.secret, {
      algorithm: 'HS256',
      expiresIn: config.jwt.expiresIn,
    });

    return res.json({
      token: newToken,
      current_company: {
        company_id: company.company_id,
        company_code: company.company_code,
        company_name: company.company_name,
        tenant_id: company.tenant_id,
        tenant_slug: company.tenant_slug,
        is_admin: company.is_tenant_admin,
      },
    });
  } catch (err) {
    console.error('Switch company error:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    });
  }
});

export default router;
