const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'ff_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body, signal, download = false } = {}) {
  const token = tokenStore.get();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    signal,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  if (res.ok && download) return res.blob();
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Token expirado/inválido em uma rota protegida: encerra a sessão.
    if (res.status === 401 && token && token === tokenStore.get()) onUnauthorized();
    const error = new Error(data?.error || 'Erro inesperado. Tente novamente.');
    error.details = data?.details;
    throw error;
  }
  return data;
}

export const api = {
  get: (path, signal) => request(path, { signal }),
  download: (path, signal) => request(path, { signal, download: true }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
