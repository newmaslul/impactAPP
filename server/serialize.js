export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    username: row.username,
    department: row.department,
    role: row.role,
    status: row.status,
    classId: row.class_id ?? null,
    biometricEnabled: !!row.biometric_enabled,
    points: row.points,
    weeklyActivity: row.weekly_activity,
  };
}
