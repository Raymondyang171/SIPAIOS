#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Phase1 minimal E2E seed + verify SQL (12/13) based on live DB metadata.

Fix v2:
- Automatically expands the seed table set to include any FK parent tables required by NOT NULL FK columns
  (and their own required parents recursively). This prevents KeyError and FK violations like bom_versions.
"""

import os
import subprocess
import uuid

CONTAINER = os.environ.get("CONTAINER_NAME", "sipaios-postgres")
DB_USER = os.environ.get("DB_USER", "sipaios")
DB_NAME = os.environ.get("DB_NAME", "sipaios")
OUT_DIR = os.environ.get("OPS_DIR", "phase1_schema_v1.1_sql/supabase/ops")

SEED_FILE = os.path.join(OUT_DIR, "20260127_12_phase1_seed_min_e2e.sql")
VERIFY_FILE = os.path.join(OUT_DIR, "20260127_13_phase1_verify_min_e2e.sql")

BASE_TABLES = [
  "companies",
  "sites",
  "warehouses",
  "uoms",
  "items",
  "customers",
  "sales_orders",
  "sales_order_lines",
  "work_centers",
  "work_orders",
  "inventory_moves",
  "inventory_move_lines",
]

NAMESPACE = uuid.UUID("9f8b2b1a-9e44-4c1a-9d9a-1c7f3b6b3f10")  # stable

def run_psql(sql: str) -> str:
    cmd = [
        "docker", "exec", "-i", CONTAINER,
        "psql", "-U", DB_USER, "-d", DB_NAME,
        "-v", "ON_ERROR_STOP=1",
        "-A", "-t",
        "-c", sql
    ]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"psql failed: {p.stderr.strip()}")
    return p.stdout.strip()

def ensure_container():
    p = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError("docker ps failed; is docker running?")
    names = set([x.strip() for x in p.stdout.splitlines() if x.strip()])
    if CONTAINER not in names:
        raise RuntimeError(f"container not running: {CONTAINER}")

def q_ident(s: str) -> str:
    return '"' + s.replace('"', '""') + '"'

def sql_lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"

def stable_uuid(tag: str) -> str:
    return str(uuid.uuid5(NAMESPACE, tag))

def get_columns(table: str):
    sql = f"""
    select
      column_name,
      data_type,
      udt_name,
      is_nullable,
      coalesce(column_default,'') as column_default
    from information_schema.columns
    where table_schema='public' and table_name={sql_lit(table)}
    order by ordinal_position;
    """
    out = run_psql(sql)
    cols = []
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) != 5:
            continue
        cols.append({
            "column_name": parts[0],
            "data_type": parts[1],
            "udt_name": parts[2],
            "is_nullable": parts[3],
            "column_default": parts[4],
        })
    return cols

def get_pks(table: str):
    sql = f"""
    select kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
    where tc.table_schema='public' and tc.table_name={sql_lit(table)} and tc.constraint_type='PRIMARY KEY'
    order by kcu.ordinal_position;
    """
    out = run_psql(sql)
    return [x for x in out.splitlines() if x.strip()]

def get_fks(table: str):
    sql = f"""
    select
      kcu.column_name as child_column,
      ccu.table_name as parent_table,
      ccu.column_name as parent_column
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name=kcu.constraint_name and tc.table_schema=kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name=tc.constraint_name and ccu.table_schema=tc.table_schema
    where tc.table_schema='public' and tc.table_name={sql_lit(table)} and tc.constraint_type='FOREIGN KEY'
    order by kcu.column_name;
    """
    out = run_psql(sql)
    m = {}
    for line in out.splitlines():
        if not line.strip():
            continue
        c, pt, pc = line.split("|")
        m[c] = {"parent_table": pt, "parent_column": pc}
    return m

def first_enum_label(udt_name: str) -> str:
    sql = f"""
    select e.enumlabel
    from pg_type t
    join pg_enum e on e.enumtypid=t.oid
    where t.typname={sql_lit(udt_name)}
    order by e.enumsortorder
    limit 1;
    """
    out = run_psql(sql)
    return out.splitlines()[0].strip() if out else ""

def compute_required_tables(base_tables):
    required = set(base_tables)
    changed = True
    while changed:
        changed = False
        for t in list(required):
            cols = get_columns(t)
            fk = get_fks(t)
            for c in cols:
                cn = c["column_name"]
                if cn not in fk:
                    continue
                if c["is_nullable"].upper() == "NO" and not c["column_default"]:
                    pt = fk[cn]["parent_table"]
                    if pt not in required:
                        required.add(pt)
                        changed = True
    return sorted(required)

def topo_sort(tables):
    deps = {t:set() for t in tables}
    for t in tables:
        fk = get_fks(t)
        for _, ref in fk.items():
            pt = ref["parent_table"]
            if pt in deps and pt != t:
                deps[t].add(pt)
    ordered = []
    temp = set()
    perm = set()
    def visit(n):
        if n in perm: return
        if n in temp: return
        temp.add(n)
        for d in deps[n]:
            visit(d)
        temp.remove(n)
        perm.add(n)
        ordered.append(n)
    for t in tables:
        visit(t)
    return ordered

def value_for(col, table, pk_map, fk_map):
    name = col["column_name"]
    dt = col["data_type"]
    udt = col["udt_name"]
    nullable = (col["is_nullable"].upper() == "YES")

    if dt == "uuid":
        if name in fk_map:
            pt = fk_map[name]["parent_table"]
            if pt not in pk_map:
                pk_map[pt] = stable_uuid(f"pk:{pt}:DEMO-001")
            return f"{sql_lit(pk_map[pt])}::uuid"
        return f"{sql_lit(pk_map.get(table, stable_uuid(f'pk:{table}:DEMO-001')) if name=='id' else stable_uuid(f'{table}:{name}'))}::uuid"

    if dt in ("timestamp with time zone", "timestamp without time zone"):
        return "now()"
    if dt == "date":
        return "current_date"
    if dt in ("integer","smallint","bigint"):
        return "1"
    if dt in ("numeric","double precision","real","decimal"):
        # 這是你身為架構師定義的新規則：只要名字跟「數量」有關，就不能給 0
        if name == "qty" or name == "planned_qty" or name.endswith("_qty"):
            return "1.000"
        return "0"
    if dt == "boolean":
        return "false"
    if dt == "jsonb":
        return "'{}'::jsonb"
    if dt == "USER-DEFINED":
        label = first_enum_label(udt)
        if label:
            return f"{sql_lit(label)}::{q_ident(udt)}"
        return f"{sql_lit('')}::{q_ident(udt)}"
    if dt in ("text","character varying","character"):
        if name in ("code","no","number","ref_no","po_no","so_no","wo_no","item_no"):
            return sql_lit(f"DEMO-{table[:3].upper()}-001")
        if name in ("name","display_name","title","description","notes"):
            return sql_lit(f"DEMO {table}")
        if name.endswith("_status") or name == "status":
            return sql_lit("draft")
        return sql_lit(f"demo:{table}:{name}")

    return "null" if nullable else sql_lit("demo")

def build_insert_sql(table: str, pk_map: dict):
    cols = get_columns(table)
    pks = get_pks(table)
    fk_map = get_fks(table)

    must = set(pks)
    for c in cols:
        if c["is_nullable"].upper() == "NO" and not c["column_default"]:
            must.add(c["column_name"])

    insert_cols = []
    values = []
    for c in cols:
        cn = c["column_name"]
        if cn in must:
            insert_cols.append(cn)
            values.append(value_for(c, table, pk_map, fk_map))

    if not insert_cols:
        return f"-- {table}: no required columns detected\n"

    cols_sql = ", ".join(q_ident(c) for c in insert_cols)
    vals_sql = ", ".join(values)

    if pks:
        conflict = ", ".join(q_ident(c) for c in pks)
        sets = []
        for c in insert_cols:
            if c not in pks:
                sets.append(f"{q_ident(c)} = EXCLUDED.{q_ident(c)}")
        set_sql = ", ".join(sets) if sets else f"{q_ident(pks[0])} = EXCLUDED.{q_ident(pks[0])}"
        return (
            f"insert into public.{q_ident(table)} ({cols_sql})\n"
            f"values ({vals_sql})\n"
            f"on conflict ({conflict}) do update set {set_sql};\n"
        )
    return (
        f"insert into public.{q_ident(table)} ({cols_sql})\n"
        f"values ({vals_sql})\n"
        f"on conflict do nothing;\n"
    )

def main():
    ensure_container()
    os.makedirs(OUT_DIR, exist_ok=True)

    tables = compute_required_tables(BASE_TABLES)
    ordered = topo_sort(tables)

    pk_map = {t: stable_uuid(f"pk:{t}:DEMO-001") for t in tables}

    seed_lines = []
    seed_lines.append("-- AUTO-GENERATED. Do not edit by hand.\n")
    seed_lines.append("begin;\n")
    seed_lines.append("-- Minimal E2E seed (closure over required FK parents).\n")
    seed_lines.append("-- Idempotent via ON CONFLICT (PK).\n\n")
    seed_lines.append(f"-- tables_count={len(ordered)}\n\n")
    for t in ordered:
        seed_lines.append(f"-- table: {t}\n")
        seed_lines.append(build_insert_sql(t, pk_map))
        seed_lines.append("\n")
    seed_lines.append("commit;\n")

    with open(SEED_FILE, "w", encoding="utf-8") as f:
        f.writelines(seed_lines)

    verify_lines = []
    verify_lines.append("-- AUTO-GENERATED. Do not edit by hand.\n")
    verify_lines.append("\\echo '==[1/3] sanity: public tables count =='\n")
    verify_lines.append("select count(*) as public_tables from pg_tables where schemaname='public';\n\n")
    verify_lines.append("\\echo '==[2/3] seed rows exist? (by PK if has id) =='\n")
    for t in ordered:
        verify_lines.append(
            f"select '{t}' as table,\n"
            f"  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name={sql_lit(t)} and column_name='id')\n"
            f"        then (select count(*) from public.{q_ident(t)} where id={sql_lit(pk_map[t])}::uuid)\n"
            f"        else (select count(*) from public.{q_ident(t)}) end) as rows;\n"
        )
    verify_lines.append("\n\\echo '==[3/3] done =='\n")

    with open(VERIFY_FILE, "w", encoding="utf-8") as f:
        f.writelines(verify_lines)

    print("DONE")
    print(f" - {SEED_FILE}")
    print(f" - {VERIFY_FILE}")

if __name__ == "__main__":
    main()
