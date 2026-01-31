#!/usr/bin/env node
/**
 * Seed script - applies migration and seeds test users
 * Usage: node scripts/seed.js
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const { Pool } = pg;

const config = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '55432', 10),
  database: process.env.POSTGRES_DB || 'sipaios',
  user: process.env.POSTGRES_USER || 'sipaios',
  password: process.env.POSTGRES_PASSWORD || 'H123150869h!',
};

const TEST_PASSWORD = 'Test@123';
const BCRYPT_ROUNDS = 10;

async function main() {
  const pool = new Pool(config);
  const client = await pool.connect();

  try {
    console.log('Connecting to database...');
    await client.query('SELECT 1');
    console.log('Connected.');

    // Generate password hash
    console.log('Generating password hash for test users...');
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
    console.log(`Password hash: ${passwordHash}`);

    // Apply migration first
    console.log('\n--- Running migration ---');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationSql = readFileSync(join(__dirname, '../migrations/001_add_password_hash.sql'), 'utf8');
    await client.query(migrationSql);
    console.log('Migration applied.');

    // Seed test data using transaction
    console.log('\n--- Seeding test users ---');

    await client.query('BEGIN');

    // Ensure DEMO company exists with matching tenant
    await client.query(`
      INSERT INTO public.sys_tenants (id, slug, name)
      VALUES ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'demo-com-001', 'DEMO companies')
      ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name
    `);

    await client.query(`
      INSERT INTO public.companies (id, code, name)
      VALUES ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'DEMO-COM-001', 'DEMO companies')
      ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name
    `);

    await client.query(`
      INSERT INTO public.uoms (company_id, code, name)
      VALUES
        ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'BOX', 'Box'),
        ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'EA', 'Each'),
        ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'KG', 'Kilogram'),
        ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'PCS', 'Pieces')
      ON CONFLICT (company_id, code) DO UPDATE SET name = EXCLUDED.name
    `);

    // Create a second company for multi-company testing
    await client.query(`
      INSERT INTO public.sys_tenants (id, slug, name)
      VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', 'test-com-002', 'Test Company 2')
      ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name
    `);

    await client.query(`
      INSERT INTO public.companies (id, code, name)
      VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', 'TEST-COM-002', 'Test Company 2')
      ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name
    `);

    // Insert test users with password hash
    await client.query(`
      INSERT INTO public.sys_users (id, email, display_name, password_hash)
      VALUES
        ('11111111-1111-1111-1111-111111111111', 'admin@demo.local', 'Demo Admin', $1),
        ('22222222-2222-2222-2222-222222222222', 'user@demo.local', 'Demo User', $1),
        ('33333333-3333-3333-3333-333333333333', 'multi@demo.local', 'Multi-Company User', $1)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        password_hash = EXCLUDED.password_hash
    `, [passwordHash]);

    // Create memberships
    // admin@demo.local -> DEMO company (tenant admin)
    await client.query(`
      INSERT INTO public.sys_memberships (id, tenant_id, user_id, is_tenant_admin)
      VALUES ('aaaa1111-1111-1111-1111-111111111111', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '11111111-1111-1111-1111-111111111111', true)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_tenant_admin = EXCLUDED.is_tenant_admin
    `);

    // user@demo.local -> DEMO company (regular user)
    await client.query(`
      INSERT INTO public.sys_memberships (id, tenant_id, user_id, is_tenant_admin)
      VALUES ('aaaa2222-2222-2222-2222-222222222222', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '22222222-2222-2222-2222-222222222222', false)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_tenant_admin = EXCLUDED.is_tenant_admin
    `);

    // multi@demo.local -> DEMO company
    await client.query(`
      INSERT INTO public.sys_memberships (id, tenant_id, user_id, is_tenant_admin)
      VALUES ('aaaa3333-3333-3333-3333-333333333331', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '33333333-3333-3333-3333-333333333333', false)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_tenant_admin = EXCLUDED.is_tenant_admin
    `);

    // multi@demo.local -> Test Company 2
    await client.query(`
      INSERT INTO public.sys_memberships (id, tenant_id, user_id, is_tenant_admin)
      VALUES ('aaaa3333-3333-3333-3333-333333333332', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', '33333333-3333-3333-3333-333333333333', true)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_tenant_admin = EXCLUDED.is_tenant_admin
    `);

    await client.query('COMMIT');
    console.log('Test users seeded.');

    // Verify
    console.log('\n--- Verification ---');
    const users = await client.query("SELECT id, email, display_name FROM sys_users WHERE email LIKE '%@demo.local'");
    console.log('Test users:', users.rows);

    const memberships = await client.query(`
      SELECT u.email, c.code as company_code, m.is_tenant_admin
      FROM sys_memberships m
      JOIN sys_users u ON u.id = m.user_id
      JOIN companies c ON c.id = m.tenant_id
      WHERE u.email LIKE '%@demo.local'
    `);
    console.log('Memberships:', memberships.rows);

    console.log('\n✅ Seed complete!');
    console.log('\nTest credentials:');
    console.log('  Email: admin@demo.local, user@demo.local, multi@demo.local');
    console.log(`  Password: ${TEST_PASSWORD}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
