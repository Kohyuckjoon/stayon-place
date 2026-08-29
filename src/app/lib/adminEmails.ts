// 관리자 계정 목록 (AdminGuard.tsx와 동일한 기준)
const ADMIN_EMAILS = ["akhj123akhjk@gmail.com", "stayon.platform@gmail.com"];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((e) => e.toLowerCase().trim() === normalized);
}
