export function getApiBase() {
  const envBase = String(import.meta.env.VITE_API_BASE || '').trim();
  if (envBase) return envBase.replace(/\/+$/, '');
  return '/api';
}

export function getSocketUrl() {
  const envBase = String(import.meta.env.VITE_API_BASE || '').trim();

  if (envBase.startsWith('http')) {
    return envBase.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

export function getAuthHeaders(extra = {}) {
  const token = sessionStorage.getItem('token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function handleUnauthorized(response, navigate) {
  if (response?.status === 401) {
    sessionStorage.removeItem('auth');
    sessionStorage.removeItem('token');
    if (navigate) {
      navigate('/login', { replace: true });
    }
    return true;
  }
  return false;
}
