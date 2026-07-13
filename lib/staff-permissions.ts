export type StaffRole =
  | 'primary_admin'
  | 'church_admin'
  | 'children_staff'
  | 'checkin_staff'
  | 'admin'; // legacy alias for primary_admin — present during migration window

export const ROLE_LABELS: Record<string, string> = {
  primary_admin:  'Primary Administrator',
  church_admin:   'Church Administrator',
  children_staff: "Children's Ministry Staff",
  checkin_staff:  'Check-In Staff',
  admin:          'Primary Administrator', // legacy
};

// Roles that can be assigned when inviting staff (primary_admin is transferred, never directly assigned)
export const INVITABLE_ROLES = [
  { value: 'church_admin',   label: 'Church Administrator' },
  { value: 'children_staff', label: "Children's Ministry Staff" },
  { value: 'checkin_staff',  label: 'Check-In Staff' },
] as const;

type Permission =
  | 'invite_staff'
  | 'remove_staff'
  | 'change_roles'
  | 'manage_staff'      // view + manage the Staff Access tab (admin roles only)
  | 'transfer_primary'
  | 'manage_settings'
  | 'manage_subscription'
  | 'manage_billing'
  | 'access_children_ministry'
  | 'access_checkin'
  | 'revoke_invitation';

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  primary_admin: [
    'invite_staff', 'remove_staff', 'change_roles', 'manage_staff',
    'transfer_primary', 'manage_settings', 'manage_subscription', 'manage_billing',
    'access_children_ministry', 'access_checkin', 'revoke_invitation',
  ],
  admin: [ // legacy alias
    'invite_staff', 'remove_staff', 'change_roles', 'manage_staff',
    'transfer_primary', 'manage_settings', 'manage_subscription', 'manage_billing',
    'access_children_ministry', 'access_checkin', 'revoke_invitation',
  ],
  church_admin: [
    'invite_staff', 'remove_staff', 'change_roles', 'manage_staff',
    'transfer_primary', 'manage_settings', 'manage_subscription', 'manage_billing',
    'access_children_ministry', 'access_checkin', 'revoke_invitation',
  ],
  children_staff: [
    'access_children_ministry', 'access_checkin',
  ],
  checkin_staff: [
    'access_checkin',
  ],
};

const PERMISSION_SETS = new Map<string, Set<Permission>>(
  Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => [role, new Set(perms)])
);

export function can(role: string, permission: Permission): boolean {
  return PERMISSION_SETS.get(role)?.has(permission) ?? false;
}

export function isAdminRole(role: string): boolean {
  return role === 'primary_admin' || role === 'church_admin' || role === 'admin';
}

export function isPrimaryAdmin(role: string): boolean {
  return role === 'primary_admin' || role === 'admin';
}
