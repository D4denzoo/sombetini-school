export enum RoleName {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  ACADEMIC_ADMIN = 'ACADEMIC_ADMIN',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  STUDENT = 'STUDENT',
  SYSTEM_AUDITOR = 'SYSTEM_AUDITOR',
}

export const ROLE_HIERARCHY: Record<RoleName, number> = {
  [RoleName.SUPER_ADMIN]: 100,
  [RoleName.SCHOOL_ADMIN]: 80,
  [RoleName.ACADEMIC_ADMIN]: 70,
  [RoleName.TEACHER]: 50,
  [RoleName.PARENT]: 30,
  [RoleName.STUDENT]: 20,
  [RoleName.SYSTEM_AUDITOR]: 60,
};

export const DEFAULT_PERMISSIONS = [
  // Users
  { name: 'users:read', module: 'users', action: 'read' },
  { name: 'users:create', module: 'users', action: 'create' },
  { name: 'users:update', module: 'users', action: 'update' },
  { name: 'users:delete', module: 'users', action: 'delete' },
  // Students
  { name: 'students:read', module: 'students', action: 'read' },
  { name: 'students:create', module: 'students', action: 'create' },
  { name: 'students:update', module: 'students', action: 'update' },
  { name: 'students:delete', module: 'students', action: 'delete' },
  // Results
  { name: 'results:read', module: 'results', action: 'read' },
  { name: 'results:enter', module: 'results', action: 'enter' },
  { name: 'results:approve', module: 'results', action: 'approve' },
  // Payments
  { name: 'payments:read', module: 'payments', action: 'read' },
  { name: 'payments:create', module: 'payments', action: 'create' },
  { name: 'payments:manage', module: 'payments', action: 'manage' },
  // Content
  { name: 'announcements:manage', module: 'announcements', action: 'manage' },
  { name: 'events:manage', module: 'events', action: 'manage' },
  { name: 'documents:manage', module: 'documents', action: 'manage' },
  { name: 'resources:manage', module: 'resources', action: 'manage' },
  { name: 'gallery:manage', module: 'gallery', action: 'manage' },
  // Settings
  { name: 'settings:manage', module: 'settings', action: 'manage' },
  { name: 'audit:read', module: 'audit', action: 'read' },
  { name: 'ai:manage', module: 'ai', action: 'manage' },
];

export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  [RoleName.SUPER_ADMIN]: DEFAULT_PERMISSIONS.map(p => p.name),
  [RoleName.SCHOOL_ADMIN]: [
    'users:read', 'users:create', 'users:update',
    'students:read', 'students:create', 'students:update', 'students:delete',
    'results:read', 'results:approve',
    'payments:read', 'payments:manage',
    'announcements:manage', 'events:manage', 'documents:manage',
    'resources:manage', 'gallery:manage', 'settings:manage', 'ai:manage',
  ],
  [RoleName.ACADEMIC_ADMIN]: [
    'students:read', 'students:update',
    'results:read', 'results:enter', 'results:approve',
    'announcements:manage', 'events:manage', 'resources:manage',
  ],
  [RoleName.TEACHER]: [
    'students:read',
    'results:read', 'results:enter',
    'resources:manage',
  ],
  [RoleName.PARENT]: [
    'students:read',
    'results:read',
    'payments:read', 'payments:create',
  ],
  [RoleName.STUDENT]: [
    'results:read',
  ],
  [RoleName.SYSTEM_AUDITOR]: [
    'users:read', 'students:read', 'results:read',
    'payments:read', 'audit:read',
  ],
};
