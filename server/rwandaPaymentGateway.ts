import crypto from 'crypto';
import { db } from './db.js';

export interface PhoneValidation {
  isValid: boolean;
  formatted12: string; // e.g. 250788123456
  formatted10: string; // e.g. 0788123456
  carrier: 'MTN' | 'Airtel' | 'Unknown';
  errorMessage?: string;
}

export function validateAndNormalizeRwandaPhone(input: string): PhoneValidation {
  if (!input) {
    return {
      isValid: false,
      formatted12: '',
      formatted10: '',
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
      formatted12: clean,
      formatted10: clean,
      carrier: 'Unknown',
      errorMessage: 'Nimero ya telefone igomba kugira imibare 10 (urugero: 0788123456 cyangwa 073123456)',
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
      formatted12: `250${digits9}`,
      formatted10: `0${digits9}`,
      carrier: 'Unknown',
      errorMessage: 'Uru rusobe rwa telefone ntirwemewe. Hitamo MTN (078, 079) cyangwa Airtel (072, 073)',
    };
  }

  return {
    isValid: true,
    formatted12: `250${digits9}`,
    formatted10: `0${digits9}`,
    carrier,
  };
}

export interface GatewayStatusSummary {
  is_configured: boolean;
  status: 'connected' | 'sandbox_ready' | 'configuration_required';
  environment: 'live' | 'test';
  active_provider: 'paypack' | 'mtn-momo' | 'direct-rwandapay' | 'none';
  provider_name: string;
  webhook_url: string;
  missing_credentials: string[];
  supports_refunds: boolean;
  min_amount: number;
  max_amount: number;
}

export class RwandaPaymentGatewayService {
  private static paypackToken: { token: string; expiresAt: number } | null = null;
  private static mtnToken: { token: string; expiresAt: number } | null = null;

  public static getBaseUrl(): string {
    const rawUrl =
      process.env.APP_BASE_URL ||
      process.env.APP_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'http://localhost:3000';
    return rawUrl.replace(/\/+$/, '');
  }

  public static getEnvironment(): 'live' | 'test' {
    const env = (process.env.PAYMENT_ENV || process.env.NODE_ENV || 'test').toLowerCase();
    return env === 'production' || env === 'live' ? 'live' : 'test';
  }

  /**
   * Determines active provider based on environment variables
   */
  public static getActiveProvider(): {
    provider: 'paypack' | 'mtn-momo' | 'direct-rwandapay' | 'none';
    isConfigured: boolean;
    missingKeys: string[];
  } {
    const paypackConfigured = Boolean(
      process.env.PAYPACK_CLIENT_ID && process.env.PAYPACK_CLIENT_SECRET
    );
    const mtnConfigured = Boolean(
      process.env.MTN_MOMO_SUBSCRIPTION_KEY && process.env.MTN_MOMO_API_KEY
    );
    const genericConfigured = Boolean(
      process.env.PAYMENT_API_BASE_URL && process.env.PAYMENT_SECRET_KEY
    );

    if (paypackConfigured) {
      return { provider: 'paypack', isConfigured: true, missingKeys: [] };
    }
    if (mtnConfigured) {
      return { provider: 'mtn-momo', isConfigured: true, missingKeys: [] };
    }
    if (genericConfigured) {
      return { provider: 'direct-rwandapay', isConfigured: true, missingKeys: [] };
    }

    // None configured - identify what is needed
    const explicitProvider = process.env.PAYMENT_GATEWAY_PROVIDER?.toLowerCase();
    if (explicitProvider === 'mtn-momo') {
      const missing: string[] = [];
      if (!process.env.MTN_MOMO_SUBSCRIPTION_KEY) missing.push('MTN_MOMO_SUBSCRIPTION_KEY');
      if (!process.env.MTN_MOMO_API_USER_ID) missing.push('MTN_MOMO_API_USER_ID');
      if (!process.env.MTN_MOMO_API_KEY) missing.push('MTN_MOMO_API_KEY');
      return { provider: 'mtn-momo', isConfigured: false, missingKeys: missing };
    }

    // Default recommendation is Paypack Rwanda
    const missing: string[] = [];
    if (!process.env.PAYPACK_CLIENT_ID) missing.push('PAYPACK_CLIENT_ID');
    if (!process.env.PAYPACK_CLIENT_SECRET) missing.push('PAYPACK_CLIENT_SECRET');
    return { provider: 'none', isConfigured: false, missingKeys: missing };
  }

  /**
   * Get safe gateway status summary for Admin & UI
   */
  public static getGatewayStatus(): GatewayStatusSummary {
    const env = this.getEnvironment();
    const active = this.getActiveProvider();
    const baseUrl = this.getBaseUrl();
    const webhookUrl = `${baseUrl}/api/payments/webhook`;

    let status: 'connected' | 'sandbox_ready' | 'configuration_required' = 'configuration_required';
    if (active.isConfigured) {
      status = env === 'live' ? 'connected' : 'sandbox_ready';
    } else {
      status = env === 'live' ? 'configuration_required' : 'sandbox_ready';
    }

    const providerNames: Record<string, string> = {
      paypack: 'Paypack Rwanda Gateway (MTN & Airtel)',
      'mtn-momo': 'MTN MoMo Open API Rwanda',
      'direct-rwandapay': 'Direct RwandaPay Gateway',
      none: 'Direct Rwanda Mobile Money Gateway',
    };

    return {
      is_configured: active.isConfigured,
      status,
      environment: env,
      active_provider: active.provider,
      provider_name: providerNames[active.provider] || 'Rwanda Payment Gateway',
      webhook_url: webhookUrl,
      missing_credentials: active.missingKeys,
      supports_refunds: active.provider === 'paypack',
      min_amount: 100,
      max_amount: 5000000,
    };
  }

  /**
   * Generate cryptographically safe unique reference: DON-2026-XXXXXX
   */
  public static generateDonationReference(): string {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `DON-2026-${randomHex}`;
  }

  /**
   * Authenticate with Paypack Rwanda API
   */
  private static async getPaypackToken(): Promise<string> {
    const now = Date.now();
    if (this.paypackToken && this.paypackToken.expiresAt > now + 60000) {
      return this.paypackToken.token;
    }

    const clientId = process.env.PAYPACK_CLIENT_ID;
    const clientSecret = process.env.PAYPACK_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Paypack credentials (PAYPACK_CLIENT_ID, PAYPACK_CLIENT_SECRET) are missing');
    }

    const res = await fetch('https://payments.paypack.rw/api/auth/agents/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Paypack authorization failed (${res.status}): ${errBody}`);
    }

    const data = (await res.json()) as { access: string; refresh?: string; expires?: number };
    if (!data.access) {
      throw new Error('Invalid response from Paypack auth endpoint: missing access token');
    }

    // Default token lifetime: 1 hour
    const lifetimeMs = (data.expires || 3600) * 1000;
    this.paypackToken = {
      token: data.access,
      expiresAt: now + lifetimeMs,
    };

    return data.access;
  }

  /**
   * Authenticate with MTN MoMo OpenAPI
   */
  private static async getMtnToken(): Promise<string> {
    const now = Date.now();
    if (this.mtnToken && this.mtnToken.expiresAt > now + 60000) {
      return this.mtnToken.token;
    }

    const userId = process.env.MTN_MOMO_API_USER_ID;
    const apiKey = process.env.MTN_MOMO_API_KEY;
    const subKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    const isSandbox = (process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox') === 'sandbox';

    if (!userId || !apiKey || !subKey) {
      throw new Error('MTN MoMo credentials missing');
    }

    const baseUrl = isSandbox
      ? 'https://sandbox.momodeveloper.mtn.com'
      : (process.env.MTN_MOMO_BASE_URL || 'https://proxy.momoapi.mtn.com');

    const authStr = Buffer.from(`${userId}:${apiKey}`).toString('base64');
    const res = await fetch(`${baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authStr}`,
        'Ocp-Apim-Subscription-Key': subKey,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MTN MoMo token failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const lifetimeMs = (data.expires_in || 3600) * 1000;
    this.mtnToken = {
      token: data.access_token,
      expiresAt: now + lifetimeMs,
    };

    return data.access_token;
  }

  /**
   * Initiate Real Payment Request
   */
  public static async initiatePayment(params: {
    amount: number;
    phone: string;
    donorName?: string;
    donorEmail?: string;
    paymentMethod: 'mtn-momo' | 'airtel-money';
    donationPurpose?: string;
    isAnonymous?: boolean;
    userId?: string;
    idempotencyKey?: string;
  }): Promise<{
    success: boolean;
    transaction: any;
    instructions: string;
    reference: string;
    gatewayStatus: string;
  }> {
    const phoneValidation = validateAndNormalizeRwandaPhone(params.phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.errorMessage || 'Nimero ya telefone yanditse nabi');
    }

    if (!params.amount || params.amount < 100) {
      throw new Error('Amafaranga ntashobora kuba munsi ya 100 RWF (Minimum donation is 100 RWF)');
    }

    if (params.amount > 5000000) {
      throw new Error('Amafaranga arenze urugero rwemewe (Maximum donation is 5,000,000 RWF)');
    }

    // Idempotency check: prevent duplicate requests if pressed repeatedly within 60 seconds
    const idempotencyKey = params.idempotencyKey || `idemp_${phoneValidation.formatted12}_${params.amount}_${Math.floor(Date.now() / 60000)}`;

    const existingRecent = db.prepare(`
      SELECT * FROM payment_transactions
      WHERE donor_phone = ? AND amount = ? AND status IN ('pending', 'processing')
      AND datetime(created_at, '+60 seconds') > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `).get(phoneValidation.formatted10, params.amount) as any;

    if (existingRecent) {
      return {
        success: true,
        transaction: existingRecent,
        reference: existingRecent.internal_reference,
        instructions: `Ubusabe bwari bwakozwe. Reba kuri telefone yawe (${phoneValidation.formatted10}) wemeze PIN kwishyura ${params.amount.toLocaleString()} RWF.`,
        gatewayStatus: existingRecent.status,
      };
    }

    const transactionId = `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const internalReference = this.generateDonationReference();
    const env = this.getEnvironment();
    const active = this.getActiveProvider();

    // Check if live payments are attempted without real credentials
    if (env === 'live' && !active.isConfigured) {
      throw new Error(
        `Ntabwo gateway ya Mobile Money irashyirwamo ibyangombwa bya LIVE (Missing: ${active.missingKeys.join(', ')}). Bimenyeshe umuyobozi w'urubuga.`
      );
    }

    let providerReference: string | null = null;
    let gatewayMetadata: any = {
      environment: env,
      provider: active.provider,
      client_phone: phoneValidation.formatted12,
    };
    let initialStatus: 'pending' | 'processing' = 'pending';

    // Dispatch to real gateway if configured
    if (active.provider === 'paypack') {
      try {
        const token = await this.getPaypackToken();
        const paypackMode = env === 'live' ? 'production' : (process.env.PAYPACK_ENVIRONMENT || 'development');

        const paypackRes = await fetch(
          `https://payments.paypack.rw/api/transactions/cashin?Idempotency-Key=${encodeURIComponent(idempotencyKey)}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Webhook-Mode': paypackMode,
            },
            body: JSON.stringify({
              amount: params.amount,
              number: phoneValidation.formatted10,
            }),
          }
        );

        const responseData = await paypackRes.json() as any;
        if (!paypackRes.ok) {
          throw new Error(
            responseData.message || responseData.error || `Paypack cashin error (${paypackRes.status})`
          );
        }

        providerReference = responseData.ref || responseData.id || null;
        gatewayMetadata = {
          ...gatewayMetadata,
          paypack_response: responseData,
        };
        initialStatus = 'pending';
      } catch (err: any) {
        console.error('[RwandaGateway Paypack Error]:', err.message);
        throw new Error(`Kwishyura binyuze muri Paypack ntibyakunze: ${err.message}`);
      }
    } else if (active.provider === 'mtn-momo') {
      try {
        const token = await this.getMtnToken();
        const mtnReferenceId = crypto.randomUUID();
        const isSandbox = (process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox') === 'sandbox';
        const baseUrl = isSandbox
          ? 'https://sandbox.momodeveloper.mtn.com'
          : (process.env.MTN_MOMO_BASE_URL || 'https://proxy.momoapi.mtn.com');

        const subKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY!;
        const callbackUrl = `${this.getBaseUrl()}/api/payments/webhook`;

        const mtnRes = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Reference-Id': mtnReferenceId,
            'X-Target-Environment': isSandbox ? 'sandbox' : 'live',
            'Ocp-Apim-Subscription-Key': subKey,
            'Content-Type': 'application/json',
            'X-Callback-Url': callbackUrl,
          },
          body: JSON.stringify({
            amount: String(params.amount),
            currency: 'RWF',
            externalId: internalReference,
            payer: {
              partyIdType: 'MSISDN',
              partyId: phoneValidation.formatted12,
            },
            payerMessage: `La Lumiere Choir Donation ${internalReference}`,
            payeeNote: 'Choir Donation',
          }),
        });

        if (mtnRes.status !== 202 && !mtnRes.ok) {
          const errText = await mtnRes.text();
          throw new Error(`MTN MoMo requesttopay error (${mtnRes.status}): ${errText}`);
        }

        providerReference = mtnReferenceId;
        gatewayMetadata = {
          ...gatewayMetadata,
          mtn_reference_id: mtnReferenceId,
        };
        initialStatus = 'pending';
      } catch (err: any) {
        console.error('[RwandaGateway MTN Error]:', err.message);
        throw new Error(`Kwishyura binyuze muri MTN MoMo ntibyakunze: ${err.message}`);
      }
    } else {
      // In sandbox mode without credentials:
      // Create a real pending transaction waiting for webhook or admin confirmation.
      // We NEVER fake success.
      providerReference = `SANDBOX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      gatewayMetadata = {
        ...gatewayMetadata,
        note: 'Initialized in test sandbox mode (awaiting approval/webhook).',
      };
    }

    // Insert transaction into database
    db.prepare(`
      INSERT INTO payment_transactions (
        id, internal_reference, provider_reference, user_id,
        donor_name, donor_phone, donor_email, amount, currency,
        provider_slug, donation_purpose, status, is_anonymous,
        created_at, updated_at, gateway_metadata, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'RWF', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)
    `).run(
      transactionId,
      internalReference,
      providerReference,
      params.userId || null,
      params.donorName || (params.isAnonymous ? 'Umugiraneza (Anonymous)' : 'Worshipper'),
      phoneValidation.formatted10,
      params.donorEmail || null,
      params.amount,
      params.paymentMethod,
      params.donationPurpose || 'La Lumiere Choir Donations',
      initialStatus,
      params.isAnonymous ? 1 : 0,
      JSON.stringify(gatewayMetadata),
      idempotencyKey
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource, details)
      VALUES (?, ?, 'PAYMENT_INITIATED', 'payment_transactions', ?)
    `).run(
      `log_${Date.now()}`,
      params.userId || null,
      JSON.stringify({
        internalReference,
        providerReference,
        amount: params.amount,
        phone: phoneValidation.formatted10,
        provider: params.paymentMethod,
      })
    );

    const carrierName = phoneValidation.carrier === 'MTN' ? 'MTN Mobile Money' : 'Airtel Money';
    const instructions = `Reba kuri telefone yawe (${phoneValidation.formatted10}) maze wandike umubare w'ibanga (PIN) wa ${carrierName} wemeze kwishyura ${params.amount.toLocaleString()} RWF.`;

    const savedTx = db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(transactionId);

    return {
      success: true,
      transaction: savedTx,
      reference: internalReference,
      instructions,
      gatewayStatus: initialStatus,
    };
  }

  /**
   * Verify Payment Status via Gateway status endpoint
   */
  public static async verifyPaymentStatus(identifier: string): Promise<any> {
    const tx = db.prepare(`
      SELECT * FROM payment_transactions
      WHERE id = ? OR internal_reference = ? OR provider_reference = ?
    `).get(identifier, identifier, identifier) as any;

    if (!tx) {
      throw new Error('Nta nyemezabwishyu yabonetse (Transaction not found)');
    }

    // Terminal states do not require remote polling
    if (['successful', 'failed', 'cancelled', 'expired'].includes(tx.status)) {
      return tx;
    }

    const active = this.getActiveProvider();

    // Query active gateway if credentials exist
    if (active.provider === 'paypack' && tx.provider_reference) {
      try {
        const token = await this.getPaypackToken();
        const res = await fetch(`https://payments.paypack.rw/api/events/transactions?ref=${encodeURIComponent(tx.provider_reference)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          const eventData = await res.json() as any;
          const status = eventData.data?.status || eventData.status;

          if (status === 'successful' || status === 'completed') {
            this.markTransactionSuccessful(tx.id, tx.provider_reference);
            return db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(tx.id);
          } else if (status === 'failed' || status === 'cancelled') {
            this.markTransactionFailed(tx.id, eventData.data?.message || 'Transaction rejected by telecom provider');
            return db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(tx.id);
          }
        }
      } catch (err) {
        console.error('[RwandaGateway verify Paypack error]:', err);
      }
    } else if (active.provider === 'mtn-momo' && tx.provider_reference) {
      try {
        const token = await this.getMtnToken();
        const isSandbox = (process.env.MTN_MOMO_TARGET_ENVIRONMENT || 'sandbox') === 'sandbox';
        const baseUrl = isSandbox
          ? 'https://sandbox.momodeveloper.mtn.com'
          : (process.env.MTN_MOMO_BASE_URL || 'https://proxy.momoapi.mtn.com');

        const subKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY!;
        const res = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${tx.provider_reference}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': subKey,
            'X-Target-Environment': isSandbox ? 'sandbox' : 'live',
          },
        });

        if (res.ok) {
          const data = await res.json() as any;
          const mtnStatus = (data.status || '').toUpperCase();
          if (mtnStatus === 'SUCCESSFUL') {
            this.markTransactionSuccessful(tx.id, data.financialTransactionId || tx.provider_reference);
            return db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(tx.id);
          } else if (mtnStatus === 'FAILED') {
            this.markTransactionFailed(tx.id, data.reason || 'MTN transaction failed');
            return db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(tx.id);
          }
        }
      } catch (err) {
        console.error('[RwandaGateway verify MTN error]:', err);
      }
    }

    return tx;
  }

  /**
   * Handle Webhook from Provider
   */
  public static handleWebhook(headers: Record<string, any>, rawBody: Buffer | string, body: any): {
    success: boolean;
    message: string;
    transaction?: any;
  } {
    const rawString = typeof rawBody === 'string' ? rawBody : (rawBody ? rawBody.toString('utf8') : JSON.stringify(body));

    // Verify Paypack signature if secret is configured
    const paypackSignature = headers['x-paypack-signature'];
    const paypackSecret = process.env.PAYPACK_WEBHOOK_SECRET;

    if (paypackSignature && paypackSecret) {
      const computed = crypto.createHmac('sha256', paypackSecret).update(rawString).digest('hex');
      const sigBuffer = Buffer.from(paypackSignature, 'utf8');
      const compBuffer = Buffer.from(computed, 'utf8');

      if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
        throw new Error('Invalid webhook signature');
      }
    }

    // Extract reference and status from payload
    const eventData = body.data || body;
    const ref = eventData.ref || eventData.reference || body.ref || body.referenceId;
    const status = (eventData.status || body.status || '').toLowerCase();
    const amount = eventData.amount || body.amount;

    if (!ref) {
      throw new Error('Webhook missing reference identifier');
    }

    const tx = db.prepare(`
      SELECT * FROM payment_transactions
      WHERE provider_reference = ? OR internal_reference = ?
    `).get(ref, ref) as any;

    if (!tx) {
      console.warn(`[RwandaGateway Webhook] No matching transaction for reference: ${ref}`);
      return { success: true, message: 'Transaction not found in local system (acknowledged)' };
    }

    // Validate amount if present
    if (amount && Number(amount) !== Number(tx.amount)) {
      console.error(`[RwandaGateway Webhook] Amount mismatch! Expected ${tx.amount}, got ${amount}`);
      throw new Error('Amount mismatch in webhook payload');
    }

    if (status === 'successful' || status === 'completed') {
      this.markTransactionSuccessful(tx.id, ref);
    } else if (status === 'failed' || status === 'rejected' || status === 'cancelled') {
      this.markTransactionFailed(tx.id, eventData.failure_reason || eventData.message || 'Payment cancelled or rejected');
    }

    const updated = db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(tx.id);
    return { success: true, message: 'Webhook processed successfully', transaction: updated };
  }

  /**
   * Helper: Transition to successful and trigger notifications
   */
  public static markTransactionSuccessful(transactionId: string, providerRef?: string) {
    const tx = db.prepare('SELECT * FROM payment_transactions WHERE id = ?').get(transactionId) as any;
    if (!tx || tx.status === 'successful') return;

    db.prepare(`
      UPDATE payment_transactions
      SET status = 'successful',
          provider_reference = COALESCE(?, provider_reference),
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(providerRef || null, transactionId);

    // Create in-app notification if user is authenticated
    if (tx.user_id) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, body, type, link)
        VALUES (?, ?, ?, ?, 'donation_receipt', ?)
      `).run(
        `notif_${Date.now()}`,
        tx.user_id,
        'Umusanzu wakiriwe neza! (Donation Confirmed)',
        `Urakoze cyane gushyigikira La Lumiere Choir n'amafaranga ${tx.amount.toLocaleString()} RWF. Imana iguhe umugisha mwinshi!`,
        `/support`
      );
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource, details)
      VALUES (?, ?, 'PAYMENT_SUCCESSFUL', 'payment_transactions', ?)
    `).run(
      `log_${Date.now()}`,
      tx.user_id || null,
      JSON.stringify({
        transactionId,
        reference: tx.internal_reference,
        amount: tx.amount,
        phone: tx.donor_phone,
      })
    );
  }

  /**
   * Helper: Transition to failed
   */
  public static markTransactionFailed(transactionId: string, reason?: string) {
    db.prepare(`
      UPDATE payment_transactions
      SET status = 'failed',
          failure_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason || 'Payment failed', transactionId);
  }
}
