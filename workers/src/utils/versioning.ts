import { Env } from '../index';
import { execute, generateId, now, queryOne } from './db';

async function nextVersion(
  env: Env,
  table: string,
  column: string,
  id: string
): Promise<number> {
  const row = await queryOne<{ version: number }>(
    env.DB,
    `SELECT COALESCE(MAX(version), 0) as version FROM ${table} WHERE ${column} = ?`,
    [id]
  );

  return (row?.version || 0) + 1;
}

interface VersionPayload {
  snapshot: any;
  changeType: 'create' | 'update' | 'deactivate' | 'reactivate' | 'archive';
  changeNotes?: string;
  updatedBy?: string;
}

export async function recordVendorVersion(
  env: Env,
  vendorId: string,
  payload: VersionPayload
) {
  const version = await nextVersion(env, 'vendor_versions', 'vendor_id', vendorId);
  await execute(
    env.DB,
    `INSERT INTO vendor_versions (id, vendor_id, version, snapshot, change_type, change_notes, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('ver'),
      vendorId,
      version,
      JSON.stringify(payload.snapshot),
      payload.changeType,
      payload.changeNotes || null,
      payload.updatedBy || null,
      now(),
    ]
  );
}

export async function recordVendorRateVersion(
  env: Env,
  rateId: string,
  vendorId: string,
  payload: VersionPayload
) {
  const version = await nextVersion(env, 'vendor_rates_versions', 'rate_id', rateId);
  await execute(
    env.DB,
    `INSERT INTO vendor_rates_versions (id, rate_id, vendor_id, version, snapshot, change_type, change_notes, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('vrr'),
      rateId,
      vendorId,
      version,
      JSON.stringify(payload.snapshot),
      payload.changeType,
      payload.changeNotes || null,
      payload.updatedBy || null,
      now(),
    ]
  );
}

export async function recordVendorPortVersion(
  env: Env,
  portId: string,
  vendorId: string,
  payload: VersionPayload
) {
  const version = await nextVersion(env, 'vendor_ports_versions', 'port_id', portId);
  await execute(
    env.DB,
    `INSERT INTO vendor_ports_versions (id, port_id, vendor_id, version, snapshot, change_type, change_notes, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('vrp'),
      portId,
      vendorId,
      version,
      JSON.stringify(payload.snapshot),
      payload.changeType,
      payload.changeNotes || null,
      payload.updatedBy || null,
      now(),
    ]
  );
}

export async function recordVendorModifierVersion(
  env: Env,
  modifierId: string,
  vendorId: string,
  payload: VersionPayload
) {
  const version = await nextVersion(env, 'vendor_modifiers_versions', 'modifier_id', modifierId);
  await execute(
    env.DB,
    `INSERT INTO vendor_modifiers_versions (id, modifier_id, vendor_id, version, snapshot, change_type, change_notes, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('vrm'),
      modifierId,
      vendorId,
      version,
      JSON.stringify(payload.snapshot),
      payload.changeType,
      payload.changeNotes || null,
      payload.updatedBy || null,
      now(),
    ]
  );
}

export async function recordUserVersion(
  env: Env,
  userId: string,
  payload: VersionPayload
) {
  const version = await nextVersion(env, 'user_versions', 'user_id', userId);
  await execute(
    env.DB,
    `INSERT INTO user_versions (id, user_id, version, snapshot, change_type, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('uvr'),
      userId,
      version,
      JSON.stringify(payload.snapshot),
      payload.changeType,
      payload.updatedBy || null,
      now(),
    ]
  );
}

export async function recordCalculationVersion(
  env: Env,
  calcId: string,
  vendorId: string,
  payload: VersionPayload
) {
  const version = await nextVersion(env, 'calculation_versions', 'calculation_id', calcId);
  await execute(
    env.DB,
    `INSERT INTO calculation_versions (id, calculation_id, vendor_id, version, snapshot, change_type, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('cver'),
      calcId,
      vendorId,
      version,
      JSON.stringify(payload.snapshot),
      payload.changeType,
      payload.updatedBy || null,
      now(),
    ]
  );
}


