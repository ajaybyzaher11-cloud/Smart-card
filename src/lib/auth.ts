const ADMIN_COOKIE_NAME = 'dynamic_qr_admin_session';
const ADMIN_PASSWORD_KEY = 'dynamic_qr_admin_password';
const DEFAULT_PASSWORD = 'admin123';

export function getAdminPassword(): string {
  try {
    return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

export function setAdminPassword(newPass: string): void {
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, newPass);
  } catch (e) {
    console.error('Failed to set password:', e);
  }
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export function setCookie(name: string, value: string, days = 7): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function isAdminAuthenticated(): boolean {
  const token = getCookie(ADMIN_COOKIE_NAME) || localStorage.getItem(ADMIN_COOKIE_NAME);
  return token === 'authenticated_admin_token';
}

export function loginAdmin(passwordAttempt: string): boolean {
  const validPass = getAdminPassword();
  if (passwordAttempt === validPass) {
    setCookie(ADMIN_COOKIE_NAME, 'authenticated_admin_token', 7);
    try {
      localStorage.setItem(ADMIN_COOKIE_NAME, 'authenticated_admin_token');
    } catch {}
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  deleteCookie(ADMIN_COOKIE_NAME);
  try {
    localStorage.removeItem(ADMIN_COOKIE_NAME);
  } catch {}
}
