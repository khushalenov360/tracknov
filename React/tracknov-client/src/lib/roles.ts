export type TracknovRole =
  | "L0"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "l0"
  | "l1"
  | "l2"
  | "l3"
  | "l4"
  | "l5"
  | "consultant"
  | "architect"
  | "mep"
  | "contractor"
  | "owner"
  | "client"
  | "project_admin"
  | "super_admin"
  | "super_user"
  | "l4_reserved";

const ROLE_LEVELS: Record<string, 0 | 1 | 2 | 3 | 4 | 5> = {
  l0: 0,
  consultant: 0,
  architect: 0,
  mep: 0,
  contractor: 0,
  l1: 1,
  owner: 1,
  l2: 2,
  client: 2,
  l3: 3,
  project_admin: 3,
  super_admin: 3,
  l4: 4,
  l4_reserved: 4,
  l5: 5,
  super_user: 5,
};

export function normalizeRole(role?: string | null): string {
  return String(role || "consultant").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function getRoleLevel(role?: string | null): 0 | 1 | 2 | 3 | 4 | 5 {
  return ROLE_LEVELS[normalizeRole(role)] ?? 0;
}

export function isContributorRole(role?: string | null) {
  return getRoleLevel(role) === 0;
}

export function isProjectManagerRole(role?: string | null) {
  return getRoleLevel(role) === 1;
}

export function isClientRole(role?: string | null) {
  return getRoleLevel(role) === 2;
}

export function isProjectAdminRole(role?: string | null) {
  return getRoleLevel(role) === 3;
}

export function isSuperUserRole(role?: string | null) {
  return getRoleLevel(role) === 5;
}

export function canReview(role?: string | null) {
  return getRoleLevel(role) >= 3;
}

export function canSeeGovernanceTabs(role?: string | null) {
  return getRoleLevel(role) >= 3;
}

export function canSeeOperationalExports(role?: string | null) {
  return getRoleLevel(role) >= 1 && !isProjectAdminRole(role);
}
