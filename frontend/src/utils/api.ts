const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getUserEmail(): Promise<string | null> {
  try {
    const res = await fetch('/api/session');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.session?.user?.email || null;
  } catch {
    return null;
  }
}

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  email?: string | null,
): Promise<Response> {
  let userEmail = email;
  if (userEmail === undefined) {
    userEmail = await getUserEmail();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // X-User-Email header is required for Flask backend authentication
  if (userEmail) {
    headers['X-User-Email'] = userEmail;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}
