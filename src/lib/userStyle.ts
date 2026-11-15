export function isZeeshanUser(name?: string | null, email?: string | null): boolean {
  const cleanName = (name || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  return cleanName === 'zeeshan' || cleanEmail === 'zahmad836i@gmail.com';
}

export const RECHARGE_ALLOWED_UID = '10000006';

export function isRechargeAllowedUser(user?: { uid?: string | null } | null): boolean {
  return user?.uid === RECHARGE_ALLOWED_UID;
}

export function getUserNameClass(
  name?: string | null,
  email?: string | null,
  fallback = 'text-white'
): string {
  if (isZeeshanUser(name, email)) {
    return 'text-red-500 font-bold';
  }
  return fallback;
}
