const ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACADEMIC_ADMIN', 'SYSTEM_AUDITOR'] as const;

export function portalHomeForRoles(roleNames: string[]): string {
  if (roleNames.some((r) => ADMIN_ROLES.includes(r as (typeof ADMIN_ROLES)[number]))) return '/portal/admin';
  if (roleNames.includes('TEACHER')) return '/portal/teacher';
  return '/portal/parent';
}

export function roleAllowsPortalPath(pathname: string, roleNames: string[]): boolean {
  const isAdmin = roleNames.some((r) => ADMIN_ROLES.includes(r as (typeof ADMIN_ROLES)[number]));
  if (pathname.startsWith('/portal/admin')) return isAdmin;
  if (pathname.startsWith('/portal/teacher')) return isAdmin || roleNames.includes('TEACHER');
  if (pathname.startsWith('/portal/parent')) return isAdmin || roleNames.includes('PARENT');
  return true;
}
