/**
 * Admin Login Diagnostic Utility
 * 
 * Logs the exact request payload and headers being sent to the backend,
 * and validates that the backend returns the expected status code and body format,
 * identifying why current credentials are rejected.
 */

export interface DiagnosticRequestInfo {
  url: string;
  method: string;
  headers: Record<string, string>;
  payload: {
    email: string;
    passwordLength: number;
    passwordTrimmedLength: number;
    hasLeadingOrTrailingWhitespace: boolean;
    maskedPassword: string;
  };
}

export interface DiagnosticResponseInfo {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  contentType: string | null;
  isJson: boolean;
  rawBody: string;
  parsedBody: any;
}

export interface DiagnosticValidationInfo {
  isStatusCodeExpected: boolean; // status === 200
  isContentTypeExpected: boolean; // includes 'application/json'
  isBodyFormatExpected: boolean; // has success: true, non-empty token, user object with role
  hasSuccessTrue: boolean;
  hasToken: boolean;
  hasUser: boolean;
  isValid: boolean; // all checks passed
}

export interface DiagnosticRejectionAnalysis {
  isRejected: boolean;
  statusCode: number;
  code: string;
  title: string;
  detailedExplanation: string;
  suggestedFix: string;
  backendMessage?: string;
  backendDiagnostic?: any;
}

export interface AdminLoginDiagnosticReport {
  timestamp: string;
  durationMs: number;
  request: DiagnosticRequestInfo;
  response: DiagnosticResponseInfo;
  validation: DiagnosticValidationInfo;
  rejectionAnalysis: DiagnosticRejectionAnalysis;
  token?: string;
  user?: any;
  errorMessage?: string;
}

/**
 * Creates a masked representation of password preserving length for audit
 */
function maskPassword(pw: string): string {
  if (!pw) return '(empty)';
  if (pw.length <= 4) return '•'.repeat(pw.length);
  return pw[0] + '•'.repeat(pw.length - 2) + pw[pw.length - 1];
}

/**
 * Dispatches an Admin Login request with deep diagnostic telemetry,
 * console logging of headers and payload, and full format validation.
 */
export async function performAdminLoginWithDiagnostics(
  emailInput: string,
  passwordInput: string
): Promise<AdminLoginDiagnosticReport> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  const url = '/api/admin/login';
  const method = 'POST';

  const cleanEmail = (emailInput || '').trim();
  const cleanPassword = passwordInput || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Client-Timestamp': timestamp,
  };

  const requestPayload = {
    email: cleanEmail,
    password: cleanPassword,
  };

  const requestInfo: DiagnosticRequestInfo = {
    url,
    method,
    headers,
    payload: {
      email: cleanEmail,
      passwordLength: cleanPassword.length,
      passwordTrimmedLength: cleanPassword.trim().length,
      hasLeadingOrTrailingWhitespace: cleanPassword.length !== cleanPassword.trim().length,
      maskedPassword: maskPassword(cleanPassword),
    },
  };

  // Structured console logging of request payload & headers
  console.group(`%c[Admin Login Diagnostic] Request %c${url}`, 'color: #3b82f6; font-weight: bold', 'color: #94a3b8');
  console.log('%cTimestamp:%c ' + timestamp, 'font-weight: bold', 'color: inherit');
  console.log('%cMethod:%c ' + method, 'font-weight: bold', 'color: inherit');
  console.log('%cHeaders sent:%c', 'font-weight: bold', 'color: inherit', headers);
  console.log('%cPayload details:%c', 'font-weight: bold', 'color: inherit', {
    email: cleanEmail,
    passwordLength: cleanPassword.length,
    passwordMasked: maskPassword(cleanPassword),
    hasLeadingOrTrailingWhitespace: requestInfo.payload.hasLeadingOrTrailingWhitespace,
  });
  console.groupEnd();

  let rawResponse: Response | null = null;
  let rawBody = '';
  let parsedBody: any = null;
  let isJson = false;

  try {
    rawResponse = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(requestPayload),
    });

    rawBody = await rawResponse.text();
    try {
      parsedBody = JSON.parse(rawBody);
      isJson = true;
    } catch {
      isJson = false;
      parsedBody = null;
    }
  } catch (networkError: any) {
    const durationMs = Math.round(performance.now() - startTime);
    console.error('[Admin Login Diagnostic] Network Exception:', networkError);

    const networkReport: AdminLoginDiagnosticReport = {
      timestamp,
      durationMs,
      request: requestInfo,
      response: {
        status: 0,
        statusText: 'Network / Connection Error',
        headers: {},
        contentType: null,
        isJson: false,
        rawBody: '',
        parsedBody: null,
      },
      validation: {
        isStatusCodeExpected: false,
        isContentTypeExpected: false,
        isBodyFormatExpected: false,
        hasSuccessTrue: false,
        hasToken: false,
        hasUser: false,
        isValid: false,
      },
      rejectionAnalysis: {
        isRejected: true,
        statusCode: 0,
        code: 'NETWORK_ERROR',
        title: 'Ntabwo bishobotse kugera kuri seriveri (Network Error)',
        detailedExplanation: `Umuyoboro ntiwashoboye guhura na seriveri: ${networkError?.message || 'Connection refused or offline'}.`,
        suggestedFix: 'Suzuma niba seriveri ikora neza kuri port 3000 n\'aho interineti yawe ikora neza.',
      },
      errorMessage: networkError?.message || 'Network connection failed',
    };
    return networkReport;
  }

  const durationMs = Math.round(performance.now() - startTime);

  // Extract response headers
  const responseHeaders: Record<string, string> = {};
  rawResponse.headers.forEach((val, key) => {
    responseHeaders[key.toLowerCase()] = val;
  });
  const contentType = responseHeaders['content-type'] || null;

  // Validation checks
  const isStatusCodeExpected = rawResponse.status === 200;
  const isContentTypeExpected = Boolean(contentType && contentType.includes('application/json'));
  const hasSuccessTrue = Boolean(parsedBody && typeof parsedBody === 'object' && parsedBody.success === true);
  const hasToken = Boolean(parsedBody && typeof parsedBody.token === 'string' && parsedBody.token.length > 10);
  const hasUser = Boolean(parsedBody && typeof parsedBody.user === 'object' && parsedBody.user?.id && parsedBody.user?.role);
  const isBodyFormatExpected = hasSuccessTrue && hasToken && hasUser;
  const isValid = isStatusCodeExpected && isContentTypeExpected && isBodyFormatExpected;

  // Deep rejection root cause analysis
  const rejectionAnalysis: DiagnosticRejectionAnalysis = {
    isRejected: !isValid,
    statusCode: rawResponse.status,
    code: 'UNKNOWN',
    title: '',
    detailedExplanation: '',
    suggestedFix: '',
    backendMessage: parsedBody?.message || parsedBody?.error || undefined,
    backendDiagnostic: parsedBody?.diagnostic || undefined,
  };

  if (!isValid) {
    const diagCode = parsedBody?.diagnostic?.code;

    if (rawResponse.status === 400) {
      rejectionAnalysis.code = 'BAD_REQUEST';
      rejectionAnalysis.title = 'Ubusabe ntabwo bwakiriwe neza (Bad Request 400)';
      rejectionAnalysis.detailedExplanation = 'Imeli cyangwa ijambo ry\'ibanga ryoherejwe ryarimo ubusa cyangwa riri mu buryo butemewe.';
      rejectionAnalysis.suggestedFix = 'Suzuma niba wanditse imeli n\'ijambo ry\'ibanga mbere yo gukanda injira.';
    } else if (rawResponse.status === 401) {
      if (diagCode === 'USER_NOT_FOUND') {
        rejectionAnalysis.code = 'USER_NOT_FOUND';
        rejectionAnalysis.title = 'Imeli ntabwo ibarizwa muri sisitemu (Account Not Found 401)';
        rejectionAnalysis.detailedExplanation = `Imeli "${cleanEmail}" ntabwo yanditswe muri database y'abanyamuryango n'abayobozi ba Korali.`;
        rejectionAnalysis.suggestedFix = 'Koresha imeli yemewe y\'ubuyobozi: "lalumierechoir@gmail.com" cyangwa "nd.bonheur1@gmail.com".';
      } else if (diagCode === 'PASSWORD_MISMATCH') {
        rejectionAnalysis.code = 'PASSWORD_MISMATCH';
        rejectionAnalysis.title = 'Ijambo ry\'ibanga si ryo (Password Mismatch 401)';
        rejectionAnalysis.detailedExplanation = `Imeli "${cleanEmail}" irazwi muri sisitemu, ariko ijambo ry'ibanga ryatanzwe ntabwo rihuye n'iryabitswe.`;
        if (requestInfo.payload.hasLeadingOrTrailingWhitespace) {
          rejectionAnalysis.detailedExplanation += ' Icyitonderwa: Ijambo ry\'ibanga ryatanzwe ririmo umwanya (space) mu mpera cyangwa mu ntangiriro.';
        }
        rejectionAnalysis.suggestedFix = 'Koresha ijambo ry\'ibanga ryemewe: "Amasezerano1". Witonde ku nyuguti nkuru na nto.';
      } else {
        rejectionAnalysis.code = 'INVALID_CREDENTIALS';
        rejectionAnalysis.title = 'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid Credentials 401)';
        rejectionAnalysis.detailedExplanation = parsedBody?.message || 'Imeli cyangwa ijambo ry\'ibanga byanzwe na seriveri.';
        rejectionAnalysis.suggestedFix = 'Koresha: Email: lalumierechoir@gmail.com | Password: Amasezerano1';
      }
    } else if (rawResponse.status === 403) {
      if (diagCode === 'ACCOUNT_DISABLED') {
        rejectionAnalysis.code = 'ACCOUNT_DISABLED';
        rejectionAnalysis.title = 'Konti yahagaritswe (Account Disabled 403)';
        rejectionAnalysis.detailedExplanation = 'Iyi konti ifite status ya is_disabled = 1 mu bubiko bwa database.';
        rejectionAnalysis.suggestedFix = 'Gana Super Administrator akureho ifungwa ry\'iyi konti.';
      } else if (diagCode === 'INSUFFICIENT_PERMISSIONS' || parsedBody?.message?.includes('Admin privileges required')) {
        const userRole = parsedBody?.diagnostic?.currentRole || 'non-admin';
        rejectionAnalysis.code = 'INSUFFICIENT_PERMISSIONS';
        rejectionAnalysis.title = 'Uburenganzira budahagije bwa Admin (Role Unauthorized 403)';
        rejectionAnalysis.detailedExplanation = `Konti winjiyemo ifite uruhare rwa "${userRole}". Kwinjira hano bisaba uruhare rwa: super_admin, admin, content_admin, cyangwa moderator.`;
        rejectionAnalysis.suggestedFix = 'Injirana na konti ya Super Admin: lalumierechoir@gmail.com cyangwa nd.bonheur1@gmail.com.';
      } else {
        rejectionAnalysis.code = 'FORBIDDEN';
        rejectionAnalysis.title = 'Uruhushya rwanze (Forbidden 403)';
        rejectionAnalysis.detailedExplanation = parsedBody?.message || 'Konti yawe ntabwo yemerewe kwinjira mu Buyobozi.';
        rejectionAnalysis.suggestedFix = 'Injirana na konti y\'ubuyobozi yemejwe.';
      }
    } else if (rawResponse.status === 404) {
      rejectionAnalysis.code = 'ROUTE_NOT_FOUND';
      rejectionAnalysis.title = 'Umurongo wa API ntiwabonetse (Route Not Found 404)';
      rejectionAnalysis.detailedExplanation = 'Urubuga rwatanze 404 ku murongo /api/admin/login. Seriveri ishobora kuba itari kwakira ubu busabe.';
      rejectionAnalysis.suggestedFix = 'Suzuma niba Express backend irimo gukora neza.';
    } else if (rawResponse.status >= 500) {
      rejectionAnalysis.code = 'SERVER_ERROR';
      rejectionAnalysis.title = `Ikosa rya seriveri (Server Error ${rawResponse.status})`;
      rejectionAnalysis.detailedExplanation = parsedBody?.error || parsedBody?.message || 'Habaye ikosa muri seriveri cyangwa database igihe yakiraga ubusabe.';
      rejectionAnalysis.suggestedFix = 'Reba amakuru y\'ikosa muri server logs.';
    } else if (!isContentTypeExpected) {
      rejectionAnalysis.code = 'NON_JSON_RESPONSE';
      rejectionAnalysis.title = 'Igisubizo si JSON (Unexpected Content-Type)';
      rejectionAnalysis.detailedExplanation = `Seriveri yatanze Content-Type "${contentType}" aho gutanga application/json. Igisubizo gishobora kuba HTML.`;
      rejectionAnalysis.suggestedFix = 'Suzuma niba Vite dev server itahagaritse backend Express API.';
    } else if (!isBodyFormatExpected) {
      rejectionAnalysis.code = 'MALFORMED_BODY';
      rejectionAnalysis.title = 'Imiterere y\'igisubizo ntiyuzuye (Malformed Response Body)';
      rejectionAnalysis.detailedExplanation = `Igisubizo ntabwo kirimo ibiranga uburenganzira bwuzuye (success: ${hasSuccessTrue}, token: ${hasToken}, user: ${hasUser}).`;
      rejectionAnalysis.suggestedFix = 'Suzuma niba backend irimo gutanga token na user profile neza.';
    }
  }

  // Structured console logging of validation and rejection analysis
  const logStyle = isValid ? 'color: #10b981; font-weight: bold' : 'color: #ef4444; font-weight: bold';
  console.group(`%c[Admin Login Diagnostic] Response %cHTTP ${rawResponse.status} ${rawResponse.statusText}`, logStyle, 'color: #94a3b8');
  console.log('%cDuration:%c ' + durationMs + 'ms', 'font-weight: bold', 'color: inherit');
  console.log('%cResponse Headers:%c', 'font-weight: bold', 'color: inherit', responseHeaders);
  console.log('%cParsed Body:%c', 'font-weight: bold', 'color: inherit', parsedBody);
  console.log('%cFormat Validation:%c', 'font-weight: bold', 'color: inherit', {
    isStatusCodeExpected,
    isContentTypeExpected,
    isBodyFormatExpected,
    hasToken,
    hasUser,
    role: parsedBody?.user?.role,
  });

  if (!isValid) {
    console.warn('%c[REJECTION ROOT CAUSE]%c ' + rejectionAnalysis.title, 'background: #fef2f2; color: #991b1b; padding: 2px 6px; font-weight: bold; border-radius: 4px;', 'font-weight: bold');
    console.warn('Reason:', rejectionAnalysis.detailedExplanation);
    console.warn('Suggested Fix:', rejectionAnalysis.suggestedFix);
    if (rejectionAnalysis.backendDiagnostic) {
      console.warn('Backend Diagnostic Hint:', rejectionAnalysis.backendDiagnostic);
    }
  } else {
    console.log('%c[VALIDATION PASSED]%c Admin token & session received successfully for ' + parsedBody?.user?.email + ' (' + parsedBody?.user?.role + ')', 'background: #f0fdf4; color: #166534; padding: 2px 6px; font-weight: bold; border-radius: 4px;', 'font-weight: bold');
  }
  console.groupEnd();

  const report: AdminLoginDiagnosticReport = {
    timestamp,
    durationMs,
    request: requestInfo,
    response: {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
      headers: responseHeaders,
      contentType,
      isJson,
      rawBody: rawBody.slice(0, 1000),
      parsedBody,
    },
    validation: {
      isStatusCodeExpected,
      isContentTypeExpected,
      isBodyFormatExpected,
      hasSuccessTrue,
      hasToken,
      hasUser,
      isValid,
    },
    rejectionAnalysis,
    token: isBodyFormatExpected ? parsedBody.token : undefined,
    user: isBodyFormatExpected ? parsedBody.user : undefined,
    errorMessage: isValid ? undefined : (rejectionAnalysis.detailedExplanation || rejectionAnalysis.title),
  };

  return report;
}

/**
 * Runs a non-destructive self-test of the Admin Login endpoint
 * and checks known admin credentials.
 */
export async function runAdminSelfDiagnostic(targetEmail = 'lalumierechoir@gmail.com', testPassword = 'Amasezerano1'): Promise<AdminLoginDiagnosticReport> {
  console.log('[Admin Diagnostic] Running automated self-check for:', targetEmail);
  return performAdminLoginWithDiagnostics(targetEmail, testPassword);
}
