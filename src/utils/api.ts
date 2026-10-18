/**
 * Safe API response parser and fetch wrapper to prevent:
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * and syntax/object rendering errors on empty, HTML, or malformed responses.
 */

export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  statusText?: string;
  data: T | null;
  errorMessage: string | null;
  error?: string | null;
}

/**
 * Extracts a guaranteed human-readable string error message from arbitrary
 * response data or HTTP status codes, preventing [object Object] or boolean errors.
 */
export function extractStringErrorMessage(
  data: any,
  res?: Response | { status?: number; statusText?: string; ok?: boolean }
): string {
  // 1. Direct string error or message property
  if (typeof data?.message === 'string' && data.message.trim().length > 0) {
    return data.message.trim();
  }
  if (typeof data?.error === 'string' && data.error.trim().length > 0) {
    return data.error.trim();
  }

  // 2. Nested error object (e.g. { error: { message: "...", details: "..." } })
  if (data?.error && typeof data.error === 'object') {
    if (typeof data.error.message === 'string' && data.error.message.trim()) {
      return data.error.message.trim();
    }
    if (typeof data.error.details === 'string' && data.error.details.trim()) {
      return data.error.details.trim();
    }
    if (typeof data.error.error === 'string' && data.error.error.trim()) {
      return data.error.error.trim();
    }
  }

  // 3. Nested message object (e.g. { message: { text: "..." } })
  if (data?.message && typeof data.message === 'object') {
    if (typeof data.message.text === 'string' && data.message.text.trim()) {
      return data.message.text.trim();
    }
    if (typeof data.message.message === 'string' && data.message.message.trim()) {
      return data.message.message.trim();
    }
  }

  // 4. Array of errors (e.g. { errors: ["...", "..."] } or [{ msg: "..." }])
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const list = data.errors
      .map((item: any) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item?.msg === 'string') return item.msg.trim();
        if (typeof item?.message === 'string') return item.message.trim();
        return '';
      })
      .filter(Boolean);
    if (list.length > 0) {
      return list.join(', ');
    }
  }

  // 5. Object map of field errors (e.g. { errors: { email: ["Invalid email"] } })
  if (data?.errors && typeof data.errors === 'object') {
    try {
      const fieldErrors = Object.values(data.errors)
        .flat()
        .map((e: any) => (typeof e === 'string' ? e.trim() : e?.message || e?.msg || ''))
        .filter(Boolean);
      if (fieldErrors.length > 0) {
        return fieldErrors.join(', ');
      }
    } catch {
      // ignore
    }
  }

  // 6. Direct string body (if server returned plain text error, not HTML)
  if (typeof data === 'string' && data.trim().length > 0 && !data.trim().startsWith('<')) {
    return data.trim();
  }

  // 7. HTTP status fallback
  const status = res?.status;
  switch (status) {
    case 400:
      return "Ibyo mwohereje ntabwo byemewe (Bad request)";
    case 401:
      return "Imeli cyangwa ijambo ry'ibanga si byo (Invalid credentials)";
    case 403:
      return "Ntabwo wemerewe kwinjira muri iki gice (Access denied)";
    case 404:
      return "Seriveri ntishoboye kubona uyu murongo (API endpoint not found)";
    case 408:
    case 504:
      return "Igihe cyo gutegereza cyarangiye (Request timeout)";
    case 409:
      return "Amakuru ahuye n'asanzwe muri sisitemu (Conflict)";
    case 413:
      return "Idosiye yoherejwe irakabije kuba nini (File too large)";
    case 429:
      return "Mwakoresheje uburyo bwinshi mu gihe gito. Tegereza gato (Too many requests)";
    default:
      if (status && status >= 500) {
        return "Habaye ikosa rya seriveri (Internal server error)";
      }
      if (res?.ok && data?.success === false) {
        return "Igikorwa ntabwo cyakunze (Operation failed)";
      }
      if (res?.statusText && res.statusText.toUpperCase() !== 'OK') {
        return res.statusText;
      }
      return "Habaye ikosa ry'itumanaho (Network or request error)";
  }
}

export async function parseResponseSafely<T = any>(res: Response): Promise<{
  data: T | null;
  rawText: string;
  errorMessage: string | null;
}> {
  if (!res) {
    return {
      data: null,
      rawText: '',
      errorMessage: "Habaye ikosa ry'itumanaho (No response received)",
    };
  }

  let rawText = '';
  try {
    rawText = await res.text();
  } catch (err: any) {
    return {
      data: null,
      rawText: '',
      errorMessage: err?.message || 'Ntibyashobotse gusoma igisubizo cya seriveri',
    };
  }

  let data: any = null;
  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  let errorMessage: string | null = null;
  const isFailed = !res.ok || (data && typeof data === 'object' && data.success === false);
  if (isFailed) {
    errorMessage = extractStringErrorMessage(data, res);
  }

  return { data: data as T, rawText, errorMessage };
}

/**
 * Retrieves the stored JWT authentication token from localStorage.
 * Checks primary key 'lalumiere_token' used across the application, with fallback to 'token'.
 */
export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('lalumiere_token') || localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined' || token.trim().length === 0) {
    return null;
  }
  return token.trim();
}

/**
 * Generates an Authorization header record with the current stored token if present.
 */
export function getAuthHeaders(extraHeaders?: HeadersInit): Record<string, string> {
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (extraHeaders) {
    if (Array.isArray(extraHeaders)) {
      extraHeaders.forEach(([k, v]) => { headers[k] = v; });
    } else if (typeof (extraHeaders as any).forEach === 'function') {
      (extraHeaders as any).forEach((v: string, k: string) => { headers[k] = v; });
    } else {
      Object.assign(headers, extraHeaders);
    }
  }
  return headers;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeApiResponse<T>> {
  try {
    const token = getStoredAuthToken();
    let effectiveHeaders: HeadersInit = init?.headers || {};

    // If a valid stored token exists and Authorization header wasn't explicitly set, automatically attach it
    if (token) {
      if (effectiveHeaders instanceof Headers) {
        if (!effectiveHeaders.has('Authorization')) {
          effectiveHeaders.set('Authorization', `Bearer ${token}`);
        }
      } else if (Array.isArray(effectiveHeaders)) {
        const hasAuth = effectiveHeaders.some(([k]) => k.toLowerCase() === 'authorization');
        if (!hasAuth) {
          effectiveHeaders = [...effectiveHeaders, ['Authorization', `Bearer ${token}`]];
        }
      } else {
        const headerObj = effectiveHeaders as Record<string, string>;
        const hasAuth = Object.keys(headerObj).some(k => k.toLowerCase() === 'authorization');
        if (!hasAuth) {
          effectiveHeaders = { ...headerObj, Authorization: `Bearer ${token}` };
        }
      }
    }

    const res = await fetch(input, {
      ...init,
      headers: effectiveHeaders,
    });
    const { data, errorMessage } = await parseResponseSafely<T>(res);
    const isSuccess = res.ok && (!data || (typeof data === 'object' && (data as any).success !== false));
    const errText = isSuccess ? null : (errorMessage || "Habaye ikosa ry'itumanaho");
    return {
      ok: isSuccess,
      status: res.status,
      statusText: res.statusText,
      data,
      errorMessage: errText,
      error: errText,
    };
  } catch (err: any) {
    const errText =
      err?.message ||
      'Ntabwo bishobotse kwihuza na seriveri. Suzuma interineti yawe (Network connection error)';
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      data: null,
      errorMessage: errText,
      error: errText,
    };
  }
}
