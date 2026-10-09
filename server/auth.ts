import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lalumiere-choir-adepr-nyanza-kicukiro-secret-key-2026';
export const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcrypt with standard salt rounds.
 * Guarantees that raw passwords are never stored in the database.
 */
export function hashPassword(plainPassword: string): string {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Ijambo ry\'ibanga rigomba kuba inyandiko (Password must be a non-empty string)');
  }
  return bcrypt.hashSync(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Securely compares a plain text password against a stored bcrypt hash using bcrypt.compare().
 * Replaces any raw string comparison with cryptographic bcrypt comparison to prevent
 * credential leakage, timing attacks, and improper plain text validation.
 */
export async function comparePassword(
  plainPassword: string,
  storedHash: string | null | undefined
): Promise<{ isMatch: boolean; needsRehash: boolean }> {
  if (!plainPassword || !storedHash || typeof storedHash !== 'string') {
    return { isMatch: false, needsRehash: false };
  }

  // Check for standard bcrypt hash format: $2a$, $2b$, or $2y$ followed by cost and 53 char hash
  const isBcrypt =
    (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) &&
    storedHash.length === 60;

  if (isBcrypt) {
    try {
      // Secure asynchronous bcrypt password verification
      const match = await bcrypt.compare(plainPassword, storedHash);
      return { isMatch: match, needsRehash: false };
    } catch {
      return { isMatch: false, needsRehash: false };
    }
  }

  // For any legacy non-bcrypt entry, attempt bcrypt comparison or safely upgrade hash
  try {
    const match = await bcrypt.compare(plainPassword, storedHash);
    return { isMatch: match, needsRehash: false };
  } catch {
    // If not a valid bcrypt hash, securely reject raw string comparison
    return { isMatch: false, needsRehash: true };
  }
}

/**
 * Controller-level Admin credential verification helper.
 * Retrieves admin record and performs secure bcrypt.compare() verification.
 */
export async function verifyAdminCredentials(
  email: string,
  plainPassword: string
): Promise<{
  valid: boolean;
  user: AuthenticatedUser | null;
  reason?: 'MISSING_CREDENTIALS' | 'USER_NOT_FOUND' | 'PASSWORD_MISMATCH' | 'ACCOUNT_DISABLED' | 'INSUFFICIENT_PRIVILEGES';
}> {
  if (!email || !plainPassword) {
    return { valid: false, user: null, reason: 'MISSING_CREDENTIALS' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT id, name, email, role, password_hash, is_disabled FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail) as any;

  if (!user) {
    return { valid: false, user: null, reason: 'USER_NOT_FOUND' };
  }

  if (user.is_disabled) {
    return { valid: false, user: null, reason: 'ACCOUNT_DISABLED' };
  }

  if (!isUserAdmin(user.role)) {
    return { valid: false, user: null, reason: 'INSUFFICIENT_PRIVILEGES' };
  }

  if (!user.password_hash) {
    return { valid: false, user: null, reason: 'PASSWORD_MISMATCH' };
  }

  const isBcrypt =
    (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$')) &&
    user.password_hash.length === 60;

  let isMatch = false;
  try {
    isMatch = await bcrypt.compare(plainPassword, user.password_hash);
  } catch (err) {
    isMatch = false;
  }

  if (!isMatch) {
    return { valid: false, user: null, reason: 'PASSWORD_MISMATCH' };
  }

  return {
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  };
}

/**
 * Synchronous variant for comparing passwords using bcrypt.compareSync().
 */
export function comparePasswordSync(
  plainPassword: string,
  storedHash: string | null | undefined
): { isMatch: boolean; needsRehash: boolean } {
  if (!plainPassword || !storedHash || typeof storedHash !== 'string') {
    return { isMatch: false, needsRehash: false };
  }

  const isBcrypt =
    (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) &&
    storedHash.length === 60;

  if (isBcrypt) {
    try {
      const match = bcrypt.compareSync(plainPassword, storedHash);
      return { isMatch: match, needsRehash: false };
    } catch {
      return { isMatch: false, needsRehash: false };
    }
  }

  try {
    const match = bcrypt.compareSync(plainPassword, storedHash);
    return { isMatch: match, needsRehash: false };
  } catch {
    return { isMatch: false, needsRehash: true };
  }

  return { isMatch: false, needsRehash: false };
}

export interface AdminSetupOptions {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  role?: string;
  forceUpdate?: boolean;
}

export interface AdminSetupResult {
  initialized: boolean;
  action: 'created' | 'already_exists' | 'updated' | 'error';
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  } | null;
  message: string;
}

/**
 * Setup function to initialize the first admin account hash if it does not already exist in the database.
 * Computes a secure bcrypt hash using bcrypt.hash() before persisting to SQLite.
 */
export async function setupFirstAdminAccount(
  options: AdminSetupOptions = {}
): Promise<AdminSetupResult> {
  try {
    const configuredEmail = (options.email || process.env.ADMIN_EMAIL || 'admin@lalumierechoir.rw').trim().toLowerCase();
    const rawPassword = options.password || process.env.ADMIN_PASSWORD || 'Amasezerano1';
    const adminName = (options.name || 'Choir Super Admin').trim();
    const adminPhone = (options.phone || '+250788000000').trim();
    const adminRole = options.role || 'super_admin';

    // 1. Check if the target admin exists in the database
    const existingTarget = db
      .prepare('SELECT id, name, email, password_hash, role, is_disabled FROM users WHERE LOWER(TRIM(email)) = ?')
      .get(configuredEmail) as any;

    if (existingTarget) {
      // Validate that password_hash is already a valid 60-character bcrypt hash
      const isBcrypt =
        existingTarget.password_hash &&
        (existingTarget.password_hash.startsWith('$2a$') ||
          existingTarget.password_hash.startsWith('$2b$') ||
          existingTarget.password_hash.startsWith('$2y$')) &&
        existingTarget.password_hash.length === 60;

      if (!isBcrypt || options.forceUpdate) {
        // Upgrade legacy hash or force update with bcrypt
        const bcryptHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);
        db.prepare(`
          UPDATE users
          SET password_hash = ?, role = ?, is_disabled = 0, name = COALESCE(?, name)
          WHERE id = ?
        `).run(bcryptHash, adminRole, adminName, existingTarget.id);

        console.log(`[Admin Setup] Initialized / upgraded bcrypt hash for admin "${configuredEmail}".`);
        return {
          initialized: true,
          action: 'updated',
          user: {
            id: existingTarget.id,
            email: configuredEmail,
            role: adminRole,
            name: adminName || existingTarget.name
          },
          message: `Admin account "${configuredEmail}" password hash successfully updated to bcrypt.`
        };
      }

      return {
        initialized: false,
        action: 'already_exists',
        user: {
          id: existingTarget.id,
          email: configuredEmail,
          role: existingTarget.role,
          name: existingTarget.name
        },
        message: `Admin account "${configuredEmail}" already exists with a verified bcrypt hash.`
      };
    }

    // 2. Target admin does not exist: Hash password with bcrypt and insert first admin account
    const bcryptHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);
    const newAdminId = `usr_admin_${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, is_disabled)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(newAdminId, adminName, configuredEmail, bcryptHash, adminPhone, adminRole);

    console.log(`[Admin Setup] Successfully created first admin account "${configuredEmail}" (${adminRole}) with bcrypt hash.`);

    return {
      initialized: true,
      action: 'created',
      user: {
        id: newAdminId,
        email: configuredEmail,
        role: adminRole,
        name: adminName
      },
      message: `First admin account "${configuredEmail}" initialized with secure bcrypt hash.`
    };
  } catch (error: any) {
    console.error('[Admin Setup Error] Failed to initialize first admin account:', error);
    return {
      initialized: false,
      action: 'error',
      user: null,
      message: error.message || 'Failed to initialize first admin account'
    };
  }
}

/**
 * Alias for setupFirstAdminAccount
 */
export const initializeFirstAdminAccount = setupFirstAdminAccount;

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Sanitizes request headers to remove or mask sensitive tokens
 * while preserving diagnostics like Content-Type, Accept, User-Agent, Origin, etc.
 */
export function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'proxy-authorization'];

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey)) {
      if (typeof value === 'string') {
        if (value.startsWith('Bearer ')) {
          sanitized[key] = `Bearer [MASKED: length ${value.length - 7}]`;
        } else {
          sanitized[key] = `[MASKED: length ${value.length}]`;
        }
      } else {
        sanitized[key] = '[MASKED]';
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes request body to redact passwords, secret keys, and credentials,
 * while safely preserving critical debugging metadata (length, whitespace, quotes, character set)
 * to help identify why credentials fail even when they look right in the environment.
 */
export function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map(item => sanitizeBody(item));
  }

  const sanitized: Record<string, any> = {};
  const sensitiveFieldPatterns = [/pass(word)?/i, /secret/i, /token/i, /key/i, /cred(ential)?/i];

  for (const [key, val] of Object.entries(body)) {
    const isSensitive = sensitiveFieldPatterns.some(pattern => pattern.test(key));

    if (isSensitive) {
      if (typeof val === 'string') {
        const hasLeadingSpace = val.startsWith(' ');
        const hasTrailingSpace = val.endsWith(' ');
        const hasQuotes = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
        const hasNonAscii = /[^\x20-\x7E]/.test(val);

        sanitized[key] = `[REDACTED: length=${val.length}, leadingSpace=${hasLeadingSpace}, trailingSpace=${hasTrailingSpace}, quotes=${hasQuotes}, nonAscii=${hasNonAscii}]`;
      } else if (val === null || val === undefined) {
        sanitized[key] = val;
      } else {
        sanitized[key] = `[REDACTED: type=${typeof val}]`;
      }
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeBody(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

export interface AuthDiagnosticResult {
  timestamp: string;
  context: string;
  method: string;
  url: string;
  ip: string;
  emailAnalysis: {
    rawReceived: any;
    sanitizedEmail: string | null;
    length: number;
    hasLeadingSpace: boolean;
    hasTrailingSpace: boolean;
    hasInvisibleChars: boolean;
    envMatch?: {
      matchesEnvAdminEmail: boolean;
      configuredEnvEmail: string | null;
    };
    dbStatus?: {
      userFound: boolean;
      userId?: string;
      userRole?: string;
      isDisabled?: boolean;
      hashType?: 'bcrypt' | 'legacy_raw' | 'null' | 'unknown';
    };
  };
  sanitizedHeaders: Record<string, any>;
  sanitizedBody: Record<string, any>;
}

/**
 * Diagnostic utility that inspects and logs the incoming request object
 * (email, headers, and sanitized body) to the server console before authentication,
 * specifically pinpointing why credentials might fail even if configured in environment.
 */
export function logAuthDiagnostic(req: Request, context = 'Authentication'): AuthDiagnosticResult {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || req.ip || 'unknown';

  const rawEmail = req.body?.email ?? req.query?.email ?? null;
  const isEmailString = typeof rawEmail === 'string';
  const emailStr = isEmailString ? rawEmail : (rawEmail ? String(rawEmail) : '');

  const hasLeadingSpace = isEmailString && emailStr.startsWith(' ');
  const hasTrailingSpace = isEmailString && emailStr.endsWith(' ');
  const hasInvisibleChars = isEmailString && /[^\x20-\x7E]/.test(emailStr);
  const cleanEmail = emailStr.trim().toLowerCase();

  // Compare with environment configuration
  const envAdminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
  const envAdminMatches = envAdminEmail ? cleanEmail === envAdminEmail : false;

  // Check database configuration for this email
  let dbStatus: AuthDiagnosticResult['emailAnalysis']['dbStatus'] = { userFound: false };
  try {
    if (cleanEmail) {
      const user = db.prepare('SELECT id, email, role, password_hash, is_disabled FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail) as any;
      if (user) {
        let hashType: 'bcrypt' | 'legacy_raw' | 'null' | 'unknown' = 'unknown';
        if (!user.password_hash) {
          hashType = 'null';
        } else if (
          (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$')) &&
          user.password_hash.length === 60
        ) {
          hashType = 'bcrypt';
        } else {
          hashType = 'legacy_raw';
        }

        dbStatus = {
          userFound: true,
          userId: user.id,
          userRole: user.role,
          isDisabled: Boolean(user.is_disabled),
          hashType
        };
      }
    }
  } catch (err: any) {
    dbStatus = { userFound: false, isDisabled: false, hashType: 'unknown' };
  }

  const sanitizedHeaders = sanitizeHeaders(req.headers || {});
  const sanitizedBody = sanitizeBody(req.body || {});

  const diagnosticResult: AuthDiagnosticResult = {
    timestamp,
    context,
    method,
    url,
    ip,
    emailAnalysis: {
      rawReceived: isEmailString ? `"${rawEmail}"` : rawEmail,
      sanitizedEmail: cleanEmail || null,
      length: emailStr.length,
      hasLeadingSpace,
      hasTrailingSpace,
      hasInvisibleChars,
      envMatch: {
        matchesEnvAdminEmail: envAdminMatches,
        configuredEnvEmail: envAdminEmail || '(not set)'
      },
      dbStatus
    },
    sanitizedHeaders,
    sanitizedBody
  };

  // Log to server console with clean, structured formatting
  console.log(`\n================== [AUTH DIAGNOSTIC: ${context.toUpperCase()}] ==================`);
  console.log(`Timestamp: ${timestamp} | Method: ${method} | URL: ${url} | IP: ${ip}`);
  console.log('--- Incoming Email Analysis ---');
  console.log(`• Raw Email: ${diagnosticResult.emailAnalysis.rawReceived} (Length: ${diagnosticResult.emailAnalysis.length})`);
  console.log(`• Normalized Email: "${diagnosticResult.emailAnalysis.sanitizedEmail}"`);
  if (hasLeadingSpace || hasTrailingSpace || hasInvisibleChars) {
    console.warn(`⚠️ [WARNING] Detected whitespace/character anomalies in email!`);
    console.warn(`  - Leading Space: ${hasLeadingSpace}, Trailing Space: ${hasTrailingSpace}, Invisible/Non-ASCII: ${hasInvisibleChars}`);
  }
  console.log(`• Environment Comparison (ADMIN_EMAIL):`);
  console.log(`  - Configured in ENV: ${envAdminEmail || '(none)'}`);
  console.log(`  - Matches ENV Config: ${envAdminMatches ? 'YES (Match)' : 'NO (Mismatch or custom admin)'}`);
  console.log(`• Database Record Status:`);
  if (dbStatus.userFound) {
    console.log(`  - Found: YES (ID: ${dbStatus.userId}, Role: ${dbStatus.userRole}, Disabled: ${dbStatus.isDisabled}, Password Hash: ${dbStatus.hashType})`);
  } else {
    console.log(`  - Found: NO (No user record exists in database for "${cleanEmail}")`);
  }
  console.log('--- Sanitized Request Headers ---');
  console.log(JSON.stringify(sanitizedHeaders, null, 2));
  console.log('--- Sanitized Request Body ---');
  console.log(JSON.stringify(sanitizedBody, null, 2));
  console.log('==================================================================\n');

  return diagnosticResult;
}

/**
 * Express middleware for pre-authentication request logging and diagnostics.
 */
export function authDiagnosticMiddleware(context = 'Authentication') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      logAuthDiagnostic(req, context);
    } catch (err) {
      console.warn('[AUTH DIAGNOSTIC ERROR] Failed to generate diagnostics:', err);
    }
    next();
  };
}

export function generateToken(user: { id: string; email: string; role: string; name: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function generatePasswordResetToken(user: { id: string; email: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'password_reset',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function verifyPasswordResetToken(token: string): { id: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.type === 'password_reset' && decoded.id && decoded.email) {
      return { id: decoded.id, email: decoded.email };
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch (err) {
    return null;
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Ugomba kwinjira muri konti yawe (Authentication required)' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Igihe cyo kwinjira cyarangiye cyangwa umwirondoro si wo (Invalid or expired token)' });
  }

// Verify user still exists in database and is not disabled
  const user = db.prepare('SELECT id, email, role, name, is_disabled FROM users WHERE id = ?').get(decoded.id) as (AuthenticatedUser & { is_disabled?: number }) | undefined;
  if (!user) {
    return res.status(401).json({ error: 'Konti ntikiboneka (User not found)' });
  }

  if (user.is_disabled) {
    return res.status(403).json({ error: 'Konti yawe yahagaritswe n\'ubuyobozi (Account has been disabled by administrator)' });
  }

  req.user = user;
  next();
}

export function isUserAdmin(role?: string): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'content_admin' || role === 'moderator';
}

export function isUserSuperAdmin(role?: string): boolean {
  return role === 'super_admin' || role === 'admin';
}

export function isUserContentAdmin(role?: string): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'content_admin';
}

export function isUserModerator(role?: string): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'content_admin' || role === 'moderator';
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!isUserAdmin(req.user?.role)) {
      return res.status(403).json({ error: 'Uburenganzira bw\'umuyobozi burenze ubwawe (Admin privileges required)' });
    }
    next();
  });
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!isUserSuperAdmin(req.user?.role)) {
      return res.status(403).json({ error: 'Uburenganzira bw\'umuyobozi mukuru burenze ubwawe (Super Admin privileges required)' });
    }
    next();
  });
}

export function requireContentAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!isUserContentAdmin(req.user?.role)) {
      return res.status(403).json({ error: 'Uburenganzira bwo gutunganya ubutumwa burakenewe (Content Admin privileges required)' });
    }
    next();
  });
}

export function requireModerator(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!isUserModerator(req.user?.role)) {
      return res.status(403).json({ error: 'Uburenganzira bwo kugenzura ubutumwa burakenewe (Moderator privileges required)' });
    }
    next();
  });
}
