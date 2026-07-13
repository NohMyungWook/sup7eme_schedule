type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  errorMessage: string;
};

export const AUTH_EXPIRED_EVENT = 'sup7eme:auth-expired';

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/login') {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    throw new Error(getErrorMessage(payload) ?? options.errorMessage);
  }

  return payload as T;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getErrorMessage(payload: unknown) {
  return payload && typeof payload === 'object' && 'message' in payload
    ? String(payload.message)
    : null;
}
