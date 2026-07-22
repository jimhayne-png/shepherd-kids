import { adminClient } from '@/lib/api-auth';

// Enforces "exactly one household-level emergency contact": always writes the
// canonical cm_visitor_families fields, and ensures at most one
// cm_household_members row is flagged, replacing whoever held it before.
export async function setHouseholdEmergencyContact(opts: {
  churchId: string;
  familyId: string;
  name: string | null;
  phone: string | null;
  memberId: string | null;
}) {
  const admin = adminClient();

  await admin
    .from('cm_visitor_families')
    .update({ emergency_contact_name: opts.name, emergency_contact_phone: opts.phone })
    .eq('id', opts.familyId)
    .eq('church_id', opts.churchId);

  await admin
    .from('cm_household_members')
    .update({ emergency_contact: false })
    .eq('family_id', opts.familyId)
    .eq('church_id', opts.churchId);

  if (opts.memberId) {
    await admin
      .from('cm_household_members')
      .update({ emergency_contact: true })
      .eq('id', opts.memberId)
      .eq('family_id', opts.familyId)
      .eq('church_id', opts.churchId);
  }
}
