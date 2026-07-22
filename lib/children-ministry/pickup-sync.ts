import { adminClient } from '@/lib/api-auth';

// cm_visitor_children.authorized_pickups is a plain comma-separated text field,
// edited as free text by the Annual Family Safety Review and fuzzy-matched at
// classroom checkout (app/classroom/[token]/page.tsx: split(',') + includes()).
// These helpers are the only safe way to add/remove a single name from it —
// never do naive substring replacement, which could clip an unrelated entry.

export function parsePickupList(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function normalizePickupName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function serializePickupList(list: string[]): string | null {
  return list.length > 0 ? list.join(', ') : null;
}

export function addPickupName(raw: string | null, fullName: string): string | null {
  const list = parsePickupList(raw);
  const target = normalizePickupName(fullName);
  if (list.some(n => normalizePickupName(n) === target)) return serializePickupList(list);
  return serializePickupList([...list, fullName.trim().replace(/\s+/g, ' ')]);
}

export function removePickupName(raw: string | null, fullName: string): string | null {
  const list = parsePickupList(raw);
  const target = normalizePickupName(fullName);
  return serializePickupList(list.filter(n => normalizePickupName(n) !== target));
}

export async function syncPickupForMember(opts: {
  churchId: string;
  familyId: string;
  oldFullName: string | null;
  newFullName: string | null;
  authorizedPickup: boolean;
  pickupScope: 'all_children' | 'specific_children' | null;
  childIds: string[];
}) {
  const admin = adminClient();
  const { data: allChildren } = await admin
    .from('cm_visitor_children')
    .select('id, authorized_pickups')
    .eq('family_id', opts.familyId)
    .eq('church_id', opts.churchId);

  const children = (allChildren ?? []) as { id: string; authorized_pickups: string | null }[];
  if (children.length === 0) return;

  const targetIds = new Set<string>();
  if (opts.authorizedPickup && opts.newFullName) {
    if (opts.pickupScope === 'all_children') {
      for (const c of children) targetIds.add(c.id);
    } else if (opts.pickupScope === 'specific_children') {
      for (const id of opts.childIds) targetIds.add(id);
    }
  }

  for (const child of children) {
    let value = child.authorized_pickups;
    if (opts.oldFullName) value = removePickupName(value, opts.oldFullName);
    if (opts.newFullName && targetIds.has(child.id)) value = addPickupName(value, opts.newFullName);
    if (value !== child.authorized_pickups) {
      await admin.from('cm_visitor_children').update({ authorized_pickups: value }).eq('id', child.id);
    }
  }
}
