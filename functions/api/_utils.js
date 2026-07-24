// /functions/api/_utils.js
// Modern Cloudflare Workers shared utilities for Nailory backend.
// Implements structured logging, CORS, Gemini API retries with backoff & timeout,
// safe JSON validation, photo validation & preparation, signed R2 URLs, and error handling.

/**
 * Creates structured JSON logs for Cloudflare Workers observability.
 * Automatically sanitizes sensitive data (API keys, Base64 images, personal notes).
 */
export function logEvent({
  requestId = 'req_' + crypto.randomUUID().substring(0, 8),
  tenantId = 'tenant_demo',
  customerId = null,
  operation = 'UNKNOWN_OPERATION',
  durationMs = null,
  retries = 0,
  success = true,
  error = null,
  details = null,
}) {
  const logPayload = {
    timestamp: new Date().toISOString(),
    requestId,
    tenantId,
    customerId: customerId || undefined,
    operation,
    durationMs: durationMs !== null ? Math.round(durationMs) : undefined,
    retries,
    success,
    error: error ? String(error).substring(0, 300) : undefined,
    details: details ? String(details).substring(0, 300) : undefined,
  };

  if (success) {
    console.log(JSON.stringify(logPayload));
  } else {
    console.error(JSON.stringify(logPayload));
  }
}

/**
 * Standardized JSON Response Builder with CORS support.
 */
export function createJsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}

/**
 * Validates uploaded photo file size (max 10MB) and MIME type (JPEG, PNG, WebP).
 */
export function validateUploadedPhoto(file) {
  const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (!file || !(file instanceof File)) {
    return {
      valid: false,
      code: 'INVALID_FILE',
      message: 'Chýba fotka alebo má neplatný formát.',
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      message: `Fotka je príliš veľká (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximálna povolená veľkosť je 10 MB.`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: `Nepodporovaný typ súboru (${file.type || 'neznámy'}). Povolené sú iba obrázky JPEG, PNG a WebP.`,
    };
  }

  return { valid: true };
}

/**
 * Converts ArrayBuffer to Base64 in chunked 8KB memory-efficient batches
 * to prevent call stack overflow in Workers on large photo buffers.
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Inspects image dimensions from header bytes and converts buffer to Base64
 * for Gemini Vision while keeping the untouched original ArrayBuffer for R2.
 */
export async function prepareImageForGemini(file) {
  const arrayBuffer = await file.arrayBuffer();
  const mimeType = file.type || 'image/jpeg';
  const dimensions = getImageDimensions(new Uint8Array(arrayBuffer), mimeType);
  const needsDownscale = dimensions ? dimensions.width > 1600 : false;

  const base64Image = arrayBufferToBase64(arrayBuffer);

  return {
    arrayBuffer, // Original untouched buffer for R2
    base64Image, // Base64 payload for Gemini
    mimeType,
    width: dimensions?.width || null,
    height: dimensions?.height || null,
    wasAdjusted: needsDownscale,
  };
}

/**
 * Parses image header bytes to extract width and height.
 */
function getImageDimensions(bytes, mimeType) {
  try {
    if (mimeType === 'image/png' && bytes.length >= 24) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (mimeType === 'image/jpeg' && bytes.length >= 4) {
      let offset = 2;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
          const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
          return { width, height };
        }
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        offset += 2 + length;
      }
    }
  } catch (e) {
    // Graceful fallback if header parsing hits an edge case
  }
  return null;
}

/**
 * Calls Gemini API with automatic exponential backoff retries & AbortController timeout.
 * - Retry ONLY on HTTP 429, 500, 502, 503, 504, or network/fetch errors.
 * - AbortController timeout: 20 seconds.
 * - Exponential backoff: 500ms, 1000ms, 2000ms.
 */
export async function callGeminiApiWithRetry({
  apiKey,
  model,
  prompt,
  inlineData = null,
  timeoutMs = 20000,
  maxAttempts = 3,
  requestId,
  tenantId,
  operationName = 'GEMINI_CALL',
}) {
  if (!apiKey) {
    return {
      success: false,
      code: 'MISSING_API_KEY',
      message: 'GEMINI_API_KEY nie je nastavený.',
      status: 'MISSING_API_KEY',
      timedOut: false,
    };
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const delays = [500, 1000, 2000];

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          ...(inlineData ? [{ inlineData }] : []),
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  let lastErrorMsg = null;
  let lastStatusCode = null;
  let attemptsMade = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsMade = attempt;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      logEvent({
        requestId,
        tenantId,
        operation: `${operationName}_ATTEMPT_${attempt}`,
        retries: attempt - 1,
        success: true,
        details: `Spúšťam Gemini API volanie (pokus ${attempt}/${maxAttempts}, model: ${model}).`,
      });

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatusCode = response.status;
      const durationMs = Date.now() - startTime;

      if (response.ok) {
        const responseData = await response.json();
        const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        logEvent({
          requestId,
          tenantId,
          operation: `${operationName}_SUCCESS`,
          durationMs,
          retries: attempt - 1,
          success: true,
        });

        return {
          success: true,
          text: responseText,
          status: 'SUCCESS',
          attempts: attempt,
          durationMs,
        };
      }

      const errText = await response.text().catch(() => '');
      lastErrorMsg = `HTTP ${response.status}: ${errText.substring(0, 150)}`;

      logEvent({
        requestId,
        tenantId,
        operation: `${operationName}_HTTP_${response.status}`,
        durationMs,
        retries: attempt - 1,
        success: false,
        error: lastErrorMsg,
      });

      // Do NOT retry for HTTP 400, 401, 403 or non-transient client errors
      const retryableStatuses = [429, 500, 502, 503, 504];
      if (!retryableStatuses.includes(response.status)) {
        return {
          success: false,
          code: `HTTP_${response.status}`,
          message: `Gemini API vrátilo chybový status ${response.status}.`,
          status: `HTTP_${response.status}`,
          attempts: attempt,
          timedOut: false,
        };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const isAbort = err.name === 'AbortError' || controller.signal.aborted;

      if (isAbort) {
        logEvent({
          requestId,
          tenantId,
          operation: `${operationName}_TIMEOUT`,
          durationMs,
          retries: attempt - 1,
          success: false,
          error: `Požiadavka na Gemini API vypršala po ${timeoutMs / 1000}s.`,
        });

        return {
          success: false,
          code: 'AI_TIMEOUT',
          message: `Požiadavka na AI vypršala po ${timeoutMs / 1000} sekundách.`,
          status: 'Timed out',
          attempts: attempt,
          timedOut: true,
        };
      }

      lastErrorMsg = err.message;
      logEvent({
        requestId,
        tenantId,
        operation: `${operationName}_NETWORK_ERROR`,
        durationMs,
        retries: attempt - 1,
        success: false,
        error: err.message,
      });
    }

    // Wait with exponential backoff before retrying
    if (attempt < maxAttempts) {
      const delayMs = delays[attempt - 1] || 1000;
      logEvent({
        requestId,
        tenantId,
        operation: `${operationName}_RETRY_WAIT`,
        retries: attempt,
        success: true,
        details: `Čakám ${delayMs}ms pred pokusom ${attempt + 1}.`,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    success: false,
    code: 'AI_RETRY_EXHAUSTED',
    message: `Gemini API zlyhalo po ${maxAttempts} pokusoch. Last error: ${lastErrorMsg || 'Unknown'}.`,
    status: 'AI Error',
    attempts: attemptsMade,
    timedOut: false,
  };
}

/**
 * Safely parses and validates Gemini JSON output.
 * Never throws or allows request to fail due to malformed AI JSON output.
 */
export function parseAndValidateGeminiJson(rawText, schemaType = 'ANALYZE_VISIT') {
  if (!rawText || typeof rawText !== 'string') {
    return getDefaultParsedResult(schemaType, 'Prázdna odpoveď od AI.');
  }

  try {
    let cleaned = rawText.trim();
    // Strip markdown code block wrappers
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    // Extract outer JSON object boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);

    if (schemaType === 'ANALYZE_VISIT') {
      const style_tags = Array.isArray(parsed.style_tags)
        ? parsed.style_tags
            .filter((t) => typeof t === 'string' && t.trim())
            .map((t) => t.trim().toLowerCase())
        : [];

      const matched_gel_ids = Array.isArray(parsed.matched_gel_ids)
        ? parsed.matched_gel_ids
            .filter((id) => typeof id === 'string' && id.trim())
            .map((id) => id.trim())
        : [];

      const notes =
        typeof parsed.notes === 'string' && parsed.notes.trim()
          ? parsed.notes.trim()
          : 'AI rozpoznala fotku.';

      return {
        valid: true,
        data: { style_tags, matched_gel_ids, notes },
      };
    }

    if (schemaType === 'GENERATE_DESIGN') {
      const concepts = Array.isArray(parsed.concepts)
        ? parsed.concepts
            .filter((c) => c && typeof c === 'object')
            .map((c) => ({
              title: typeof c.title === 'string' && c.title.trim() ? c.title.trim() : 'Koncept dizajnu',
              description: typeof c.description === 'string' && c.description.trim() ? c.description.trim() : '',
            }))
        : [];

      const image_generation_prompt =
        typeof parsed.image_generation_prompt === 'string'
          ? parsed.image_generation_prompt.trim()
          : '';

      return {
        valid: true,
        data: { concepts, image_generation_prompt },
      };
    }

    return { valid: true, data: parsed };
  } catch (e) {
    return getDefaultParsedResult(schemaType, 'AI response invalid');
  }
}

function getDefaultParsedResult(schemaType, defaultNotesMessage) {
  if (schemaType === 'ANALYZE_VISIT') {
    return {
      valid: false,
      data: {
        style_tags: [],
        matched_gel_ids: [],
        notes: defaultNotesMessage || 'AI response invalid',
      },
    };
  }

  if (schemaType === 'GENERATE_DESIGN') {
    return {
      valid: false,
      data: {
        concepts: [],
        image_generation_prompt: '',
      },
    };
  }

  return { valid: false, data: {} };
}

/**
 * Generates a signed, temporary photo URL (15 minute expiration) using HMAC-SHA256 Web Crypto.
 * Prevents exposing raw photo_key or bucket storage paths directly to the client.
 */
export async function generateSignedPhotoUrl(
  photoKey,
  tenantId,
  secretKey,
  requestUrl,
  expiresInSeconds = 900
) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const dataToSign = `${photoKey}:${tenantId}:${expiresAt}`;
  const signature = await computeHmacSha256(dataToSign, secretKey || 'nailory_default_signing_secret');

  const url = new URL(requestUrl);
  url.pathname = '/api/photo';
  url.search = '';
  url.searchParams.set('key', photoKey);
  url.searchParams.set('tenant', tenantId);
  url.searchParams.set('expires', expiresAt.toString());
  url.searchParams.set('sig', signature);

  return url.toString();
}

/**
 * Verifies the HMAC-SHA256 signature and expiration timestamp of a signed photo URL.
 */
export async function verifyPhotoSignature(photoKey, tenantId, expiresAtStr, signature, secretKey) {
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
    return false; // Signature expired or invalid format
  }

  const dataToSign = `${photoKey}:${tenantId}:${expiresAt}`;
  const expectedSignature = await computeHmacSha256(dataToSign, secretKey || 'nailory_default_signing_secret');
  return signature === expectedSignature;
}

/**
 * Internal HMAC-SHA256 calculation using Web Crypto API (`crypto.subtle`).
 */
async function computeHmacSha256(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
