import express, { Request, Response, Router } from 'express';
import crypto from 'crypto';
import Paypack from 'paypack-js';
import { db } from './db.js';
import { optionalAuth, requireAdmin, AuthRequest } from './auth.js';

// -------------------------------------------------------------
// 1. SENSITIVE CREDENTIALS (Pulled strictly from process.env)
// -------------------------------------------------------------
const getCredentials = () => ({
  clientId: process.env.PAYPACK_CLIENT_ID || '',
  clientSecret: process.env.PAYPACK_CLIENT_SECRET || '',
  webhookSecret: process.env.PAYPACK_WEBHOOK_SECRET || '',
  environment: (process.env.PAYPACK_ENVIRONMENT || 'development') as 'development' | 'production',
  paymentEnv: (process.env.PAYMENT_ENV || process.env.NODE_ENV || 'test').toLowerCase(),
});

// -------------------------------------------------------------
// 2. DATABASE SCHEMA SETUP (DonationTransaction in SQLite)
// -------------------------------------------------------------
export function initDonationTransactionSchema() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS donation_transactions (
        id TEXT PRIMARY KEY,
        reference TEXT UNIQUE NOT NULL,
        gateway_reference TEXT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'RWF',
        donor_name TEXT,
        donor_phone TEXT NOT NULL,
        donor_email TEXT,
        payment_method TEXT NOT NULL DEFAULT 'mtn-momo',
        donation_purpose TEXT NOT NULL DEFAULT 'La Lumiere Choir Donations',
        status TEXT NOT NULL DEFAULT 'pending',
        failure_reason TEXT,
        is_anonymous INTEGER DEFAULT 0,
        user_id TEXT,
        gateway_metadata TEXT,
        idempotency_key TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_tx_ref ON donation_transactions(reference);
      CREATE INDEX IF NOT EXISTS idx_donation_tx_status ON donation_transactions(status);
      CREATE INDEX IF NOT EXISTS idx_donation_tx_idemp ON donation_transactions(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_donation_tx_created ON donation_transactions(created_at);
    `);
  } catch (err: any) {
    console.error('[DB] donation_transactions schema setup error:', err.message);
  }
}

// Initialize schema on load
initDonationTransactionSchema();

// -------------------------------------------------------------
// 3. PAYPACK SDK INITIALIZATION HELPER
// -------------------------------------------------------------
export function getPaypackClient(): Paypack | null {
  const { clientId, clientSecret } = getCredentials();
  if (!clientId || !clientSecret) {
    return null;
  }
  try {
    const paypack = new Paypack({
      client_id: clientId,
      client_secret: clientSecret,
    });
    return paypack;
  } catch (err: any) {
    console.error('[Paypack SDK Init Error]:', err.message);
    return null;
  }
}

// -------------------------------------------------------------
// 4. PHONE VALIDATION & FORMATTING HELPER
// -------------------------------------------------------------
export function validateRwandaPhone(input: string): {
  isValid: boolean;
  formatted10: string; // 078XXXXXXX
  formatted12: string; // 25078XXXXXXX
  carrier: 'MTN' | 'Airtel' | 'Unknown';
  errorMessage?: string;
} {
  if (!input) {
    return {
      isValid: false,
      formatted10: '',
      formatted12: '',
      carrier: 'Unknown',
      errorMessage: 'Nimero ya telefone irakenewe (Phone number is required)',
    };
  }

  const clean = input.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
  let digits9 = '';

  if (clean.startsWith('250') && clean.length === 12) {
    digits9 = clean.substring(3);
  } else if (clean.startsWith('0') && clean.length === 10) {
    digits9 = clean.substring(1);
  } else if (clean.length === 9) {
    digits9 = clean;
  } else {
    return {
      isValid: false,
      formatted10: clean,
      formatted12: clean,
      carrier: 'Unknown',
      errorMessage: 'Nimero ya telefone igomba kugira imibare 10 (urugero: 0788123456)',
    };
  }

  const prefix = digits9.substring(0, 2);
  let carrier: 'MTN' | 'Airtel' | 'Unknown' = 'Unknown';
  if (['78', '79'].includes(prefix)) {
    carrier = 'MTN';
  } else if (['72', '73'].includes(prefix)) {
    carrier = 'Airtel';
  } else {
    return {
      isValid: false,
      formatted10: `0${digits9}`,
      formatted12: `250${digits9}`,
      carrier: 'Unknown',
      errorMessage: 'Uru rusobe rwa telefone ntirwemewe. Hitamo MTN (078, 079) cyangwa Airtel (072, 073)',
    };
  }

  return {
    isValid: true,
    formatted10: `0${digits9}`,
    formatted12: `250${digits9}`,
    carrier,
  };
}

// -------------------------------------------------------------
// 5. WEBHOOK SIGNATURE VALIDATOR (HMAC SHA-256)
// -------------------------------------------------------------
export function verifyPaypackWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader?: string | string[]
): boolean {
  const { webhookSecret } = getCredentials();
  if (!webhookSecret) {
    // If webhook secret is not configured in environment, warn and return false
    console.warn('[Paypack Webhook] PAYPACK_WEBHOOK_SECRET is not configured in process.env');
    return false;
  }

  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!signature) {
    return false;
  }

  const rawString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expectedHash = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawString)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expBuffer = Buffer.from(expectedHash, 'utf8');

  if (sigBuffer.length !== expBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}

// -------------------------------------------------------------
// 6. EXPRESS ROUTER FOR PAYMENTS & WEBHOOKS
// -------------------------------------------------------------
export const paymentsRouter: Router = express.Router();

/**
 * GET /api/payments/config
 * Returns safe gateway status indicator without exposing secrets
 */
paymentsRouter.get('/config', (req: Request, res: Response) => {
  const { clientId, clientSecret, webhookSecret, environment, paymentEnv } = getCredentials();
  const isConfigured = Boolean(clientId && clientSecret);
  const isLive = paymentEnv === 'production' || paymentEnv === 'live';

  const missing: string[] = [];
  if (!clientId) missing.push('PAYPACK_CLIENT_ID');
  if (!clientSecret) missing.push('PAYPACK_CLIENT_SECRET');
  if (!webhookSecret) missing.push('PAYPACK_WEBHOOK_SECRET');

  res.json({
    status: isConfigured ? (isLive ? 'connected' : 'sandbox_ready') : 'configuration_required',
    environment: isLive ? 'live' : 'test',
    provider: 'paypack',
    provider_name: 'Paypack Rwanda Gateway (MTN & Airtel Money)',
    is_configured: isConfigured,
    missing_credentials: missing,
    supports_refunds: true,
  });
});

/**
 * POST /api/payments/initiate
 * Initializes a real payment request using the Paypack SDK
 */
paymentsRouter.post('/initiate', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      amount,
      phone,
      number,
      phone_number,
      donor_name,
      donorName,
      donor_email,
      donorEmail,
      payment_method,
      paymentMethod,
      donation_purpose,
      donationPurpose,
      is_anonymous,
      isAnonymous,
      idempotency_key,
    } = req.body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({
        error: 'Amafaranga ntashobora kuba munsi ya 100 RWF (Minimum donation is 100 RWF)',
      });
    }

    const rawPhone = phone || number || phone_number;
    const phoneCheck = validateRwandaPhone(rawPhone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.errorMessage || 'Invalid phone number' });
    }

    const name = donor_name || donorName || req.user?.name || 'Umugiraneza';
    const email = donor_email || donorEmail || req.user?.email || null;
    const method = payment_method || paymentMethod || (phoneCheck.carrier === 'Airtel' ? 'airtel-money' : 'mtn-momo');
    const purpose = donation_purpose || donationPurpose || 'La Lumiere Choir Donations';
    const anonymous = Boolean(is_anonymous !== undefined ? is_anonymous : isAnonymous);

    // Idempotency check: prevent duplicate requests if user presses button multiple times
    const idempKey = idempotency_key || `idemp_${phoneCheck.formatted10}_${parsedAmount}_${Math.floor(Date.now() / 60000)}`;

    const existingRecent = db.prepare(`
      SELECT * FROM donation_transactions
      WHERE donor_phone = ? AND amount = ? AND status IN ('pending', 'processing')
      AND datetime(created_at, '+60 seconds') > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `).get(phoneCheck.formatted10, parsedAmount) as any;

    if (existingRecent) {
      return res.json({
        success: true,
        transaction: existingRecent,
        reference: existingRecent.reference,
        instructions: `Ubusabe bwari bwakozwe. Reba kuri telefone yawe (${phoneCheck.formatted10}) wemeze PIN kwishyura ${parsedAmount.toLocaleString()} RWF.`,
        gateway_status: existingRecent.status,
      });
    }

    const transactionId = `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const reference = `DON-2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { environment, paymentEnv, clientId, clientSecret } = getCredentials();
    const isLive = paymentEnv === 'production' || paymentEnv === 'live';

    let gatewayReference: string | null = null;
    let gatewayMetadata: any = {
      provider: 'paypack',
      carrier: phoneCheck.carrier,
      environment: isLive ? 'production' : environment,
    };
    let status = 'pending';

    const paypack = getPaypackClient();

    if (paypack && (clientId && clientSecret)) {
      // Execute payment using official Paypack SDK cashin
      try {
        const cashinResult = await paypack.cashin({
          number: phoneCheck.formatted10,
          amount: parsedAmount,
        });

        const data = (cashinResult as any).data || cashinResult;
        gatewayReference = data.ref || null;
        gatewayMetadata = {
          ...gatewayMetadata,
          paypack_response: data,
        };
      } catch (err: any) {
        console.error('[Paypack SDK cashin error]:', err.message || err);
        return res.status(400).json({
          error: `Kwishyura binyuze muri Paypack ntibyakunze: ${err.message || 'Payment initiation failed'}`,
        });
      }
    } else {
      if (isLive) {
        return res.status(400).json({
          error: 'Gateway ya Paypack ntirashyirwamo ibyangombwa bya LIVE muri server (PAYPACK_CLIENT_ID & PAYPACK_CLIENT_SECRET).',
        });
      }
      // Sandbox mode without credentials
      gatewayReference = `SANDBOX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      gatewayMetadata.note = 'Initialized in Sandbox Test Mode (awaiting approval/webhook).';
    }

    // Insert into donation_transactions table
    db.prepare(`
      INSERT INTO donation_transactions (
        id, reference, gateway_reference, amount, currency,
        donor_name, donor_phone, donor_email, payment_method,
        donation_purpose, status, is_anonymous, user_id,
        gateway_metadata, idempotency_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'RWF', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      transactionId,
      reference,
      gatewayReference,
      parsedAmount,
      name,
      phoneCheck.formatted10,
      email,
      method,
      purpose,
      status,
      anonymous ? 1 : 0,
      req.user?.id || null,
      JSON.stringify(gatewayMetadata),
      idempKey
    );

    // Also mirror to legacy payment_transactions table for full backward compatibility
    try {
      db.prepare(`
        INSERT INTO payment_transactions (
          id, internal_reference, provider_reference, user_id,
          donor_name, donor_phone, donor_email, amount, currency,
          provider_slug, donation_purpose, status, is_anonymous,
          created_at, updated_at, gateway_metadata, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RWF', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
      `).run(
        transactionId,
        reference,
        gatewayReference,
        req.user?.id || null,
        name,
        phoneCheck.formatted10,
        email,
        parsedAmount,
        method,
        purpose,
        status,
        anonymous ? 1 : 0,
        JSON.stringify(gatewayMetadata),
        idempKey
      );
    } catch {
      // ignore mirror error
    }

    const carrierName = phoneCheck.carrier === 'Airtel' ? 'Airtel Money' : 'MTN Mobile Money';
    const instructions = `Reba kuri telefone yawe (${phoneCheck.formatted10}) maze wandike umubare w'ibanga (PIN) wa ${carrierName} wemeze kwishyura ${parsedAmount.toLocaleString()} RWF.`;

    const savedTx = db.prepare('SELECT * FROM donation_transactions WHERE id = ?').get(transactionId);

    res.json({
      success: true,
      transaction: savedTx,
      reference,
      gateway_reference: gatewayReference,
      instructions,
      gateway_status: status,
    });
  } catch (err: any) {
    console.error('[API /api/payments/initiate error]:', err.message);
    res.status(500).json({ error: err.message || 'Failed to initiate payment' });
  }
});

/**
 * POST /api/payments/webhook
 * Validates incoming webhook signature and updates transaction status
 */
paymentsRouter.post('/webhook', (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-paypack-signature'];
    const { webhookSecret } = getCredentials();

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const isValid = verifyPaypackWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[Paypack Webhook] Rejected: Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const payload = req.body || {};
    const eventData = payload.data || payload;
    const ref = eventData.ref || eventData.reference || payload.ref;
    const status = (eventData.status || payload.status || '').toLowerCase();
    const amount = eventData.amount || payload.amount;

    if (!ref) {
      return res.status(400).json({ error: 'Missing payment reference in payload' });
    }

    const tx = db.prepare(`
      SELECT * FROM donation_transactions
      WHERE gateway_reference = ? OR reference = ?
    `).get(ref, ref) as any;

    if (!tx) {
      // Check legacy payment_transactions as fallback
      const legacyTx = db.prepare(`
        SELECT * FROM payment_transactions
        WHERE provider_reference = ? OR internal_reference = ?
      `).get(ref, ref) as any;

      if (!legacyTx) {
        console.warn(`[Paypack Webhook] No matching transaction found for ref: ${ref}`);
        return res.status(200).json({ status: 'ok', message: 'Transaction not found in local system (acknowledged)' });
      }
    }

    const targetTx = tx || (db.prepare('SELECT * FROM payment_transactions WHERE provider_reference = ? OR internal_reference = ?').get(ref, ref) as any);

    // Validate amount matches recorded amount
    if (amount && Number(amount) !== Number(targetTx.amount)) {
      console.error(`[Paypack Webhook] Amount mismatch! Expected ${targetTx.amount}, got ${amount}`);
      return res.status(400).json({ error: 'Amount mismatch in webhook payload' });
    }

    if (status === 'successful' || status === 'completed') {
      // Update donation_transactions
      db.prepare(`
        UPDATE donation_transactions
        SET status = 'successful',
            gateway_reference = COALESCE(?, gateway_reference),
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE reference = ? OR gateway_reference = ?
      `).run(ref, targetTx.reference || targetTx.internal_reference, ref);

      // Update payment_transactions
      db.prepare(`
        UPDATE payment_transactions
        SET status = 'successful',
            provider_reference = COALESCE(?, provider_reference),
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE internal_reference = ? OR provider_reference = ?
      `).run(ref, targetTx.internal_reference || targetTx.reference, ref);

      // Create thank you notification if user account attached
      if (targetTx.user_id) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, body, type, link)
          VALUES (?, ?, ?, ?, 'donation_receipt', ?)
        `).run(
          `notif_${Date.now()}`,
          targetTx.user_id,
          'Umusanzu wakiriwe neza! (Donation Confirmed)',
          `Urakoze cyane gushyigikira La Lumiere Choir n'amafaranga ${targetTx.amount.toLocaleString()} RWF. Imana iguhe umugisha!`,
          '/support'
        );
      }
    } else if (status === 'failed' || status === 'rejected' || status === 'cancelled') {
      const reason = eventData.failure_reason || eventData.message || 'Payment cancelled or rejected by telecom';

      db.prepare(`
        UPDATE donation_transactions
        SET status = 'failed',
            failure_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE reference = ? OR gateway_reference = ?
      `).run(reason, targetTx.reference || targetTx.internal_reference, ref);

      db.prepare(`
        UPDATE payment_transactions
        SET status = 'failed',
            failure_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE internal_reference = ? OR provider_reference = ?
      `).run(reason, targetTx.internal_reference || targetTx.reference, ref);
    }

    res.status(200).json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('[Paypack Webhook Processing Error]:', err.message);
    res.status(500).json({ error: err.message || 'Webhook processing failed' });
  }
});

/**
 * GET /api/payments/status/:reference
 * Verifies transaction status locally and polls Paypack SDK if pending
 */
paymentsRouter.get('/status/:reference', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    let tx = db.prepare(`
      SELECT * FROM donation_transactions
      WHERE reference = ? OR gateway_reference = ? OR id = ?
    `).get(reference, reference, reference) as any;

    if (!tx) {
      tx = db.prepare(`
        SELECT * FROM payment_transactions
        WHERE internal_reference = ? OR provider_reference = ? OR id = ?
      `).get(reference, reference, reference) as any;
    }

    if (!tx) {
      return res.status(404).json({ error: 'Nta nyemezabwishyu yabonetse (Transaction not found)' });
    }

    // If transaction is pending, verify status with Paypack SDK
    if (tx.status === 'pending' || tx.status === 'processing') {
      const paypack = getPaypackClient();
      const gatewayRef = tx.gateway_reference || tx.provider_reference;

      if (paypack && gatewayRef) {
        try {
          const eventsRes = await paypack.events({ ref: gatewayRef });
          const eventsData = (eventsRes as any).data || eventsRes;
          const txList = eventsData.transactions || [];

          if (Array.isArray(txList) && txList.length > 0) {
            const latestEvent = txList[0];
            const eventPayload = latestEvent.data || latestEvent;
            const remoteStatus = (eventPayload.status || '').toLowerCase();

            if (remoteStatus === 'successful' || remoteStatus === 'completed') {
              db.prepare(`
                UPDATE donation_transactions
                SET status = 'successful', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(tx.id);

              db.prepare(`
                UPDATE payment_transactions
                SET status = 'successful', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(tx.id);

              tx = db.prepare('SELECT * FROM donation_transactions WHERE id = ?').get(tx.id);
            } else if (remoteStatus === 'failed' || remoteStatus === 'cancelled') {
              db.prepare(`
                UPDATE donation_transactions
                SET status = 'failed', failure_reason = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(eventPayload.message || 'Payment failed', tx.id);

              db.prepare(`
                UPDATE payment_transactions
                SET status = 'failed', failure_reason = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(eventPayload.message || 'Payment failed', tx.id);

              tx = db.prepare('SELECT * FROM donation_transactions WHERE id = ?').get(tx.id);
            }
          }
        } catch (err: any) {
          console.error('[Paypack SDK events polling error]:', err.message);
        }
      }
    }

    res.json(tx);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify transaction status' });
  }
});

/**
 * GET /api/payments/transactions
 * Admin transactions list from donation_transactions table
 */
paymentsRouter.get('/transactions', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const list = db.prepare('SELECT * FROM donation_transactions ORDER BY created_at DESC LIMIT 100').all();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});
