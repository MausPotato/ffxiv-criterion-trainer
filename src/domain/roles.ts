export const ROLES = ['MT', 'H', 'D1', 'D2'] as const;

export type Role = (typeof ROLES)[number];
export type RoleMap<T> = Record<Role, T>;
export type PartialRoleMap<T> = Partial<RoleMap<T>>;
