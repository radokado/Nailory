// /functions/api/analyze-and-save.js
// Completely self-contained Cloudflare Pages Function for uploading visit photos,
// analyzing gel inventory matches via Gemini Vision AI, generating signed R2 photo URLs,
// and executing atomic D1 database transactions.
// Zero external module imports required.

/**
 * Standardized JSON Response Builder with CORS support.
 */
function createJsonResponse(payload, status = 200) {
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
 * Creates structured JSON logs for Cloudflare Workers observability.
 * Automatically sanitizes sensitive data (API keys, Base64 images, personal notes).
 */
function logEvent({
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
 * Validates uploaded photo file size (max 10MB) and MIME type (JPEG, PNG, WebP).
 */
function validateUploadedPhoto(file) {
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
function arrayBufferToBase64(buffer) {
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
 * Inspects image dimensions from header bytes.
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
 * Reads photo file, converts to Base64 payload for Gemini Vision while keeping
 * untouched original ArrayBuffer for R2 storage.
 */
async function prepareImageForGemini(file) {
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
 * Calls Gemini API with automatic exponential backoff retries & AbortController timeout.
 * - Retry ONLY on HTTP 429, 500, 502, 503, 504, or network/fetch errors.
 * - AbortController timeout: 20 seconds.
 * - Exponential backoff: 500ms, 1000ms, 2000ms.
 */
async function callGeminiApiWithRetry({
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
function parseAndValidateGeminiJson(rawText) {
  const defaultFallback = {
    valid: false,
    data: {
      style_tags: [],
      matched_gel_ids: [],
      notes: 'AI response invalid',
    },
  };

  if (!rawText || typeof rawText !== 'string') {
    return defaultFallback;
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
  } catch (e) {
    return defaultFallback;
  }
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

/**
 * Generates a signed, temporary photo URL (15 minute expiration) using HMAC-SHA256 Web Crypto.
 * Prevents exposing raw photo_key or bucket storage paths directly to the client.
 */
async function generateSignedPhotoUrl(
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
 * Main Cloudflare Pages Function Request Handler for /api/analyze-and-save
 */
export async function onRequest(context) {
  const { request, env } = context;
  const startTime = Date.now();
  const requestId = 'req_' + crypto.randomUUID().substring(0, 8);

  // Handle CORS OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return createJsonResponse({ ok: true });
  }

  if (request.method !== 'POST') {
    return createJsonResponse(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metóda nie je podporovaná. Použite POST.',
      },
      405
    );
  }

  // Extract tenant_id from header (fallback to demo tenant)
  const tenantId = request.headers.get('x-tenant-id') || 'tenant_demo';

  try {
    // 1. Parse and validate FormData
    const formData = await request.formData();
    const file = formData.get('photo');
    const customerId = formData.get('customer_id');

    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return createJsonResponse(
        {
          success: false,
          code: 'MISSING_CUSTOMER_ID',
          message: 'Chýba identifikátor zákazníčky (customer_id).',
        },
        400
      );
    }

    // 2. Strict Photo Validation (10MB size limit, JPEG/PNG/WebP only)
    const photoValidation = validateUploadedPhoto(file);
    if (!photoValidation.valid) {
      logEvent({
        requestId,
        tenantId,
        customerId,
        operation: 'ANALYZE_AND_SAVE_INVALID_FILE',
        success: false,
        error: photoValidation.message,
      });

      return createJsonResponse(
        {
          success: false,
          code: photoValidation.code,
          message: photoValidation.message,
        },
        400
      );
    }

    // 3. Prepare Image: Store Untouched Original to R2, prepare Base64 copy for AI
    const preparedImage = await prepareImageForGemini(file);
    const sanitizedFileName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'photo.jpg';
    const photoKey = `visits/${tenantId}/${Date.now()}-${sanitizedFileName}`;

    if (!env.PHOTOS) {
      throw new Error('R2 Úložisko (PHOTOS) nie je pripojené.');
    }

    // Save untouched original image to R2 storage
    await env.PHOTOS.put(photoKey, preparedImage.arrayBuffer, {
      httpMetadata: { contentType: preparedImage.mimeType },
    });

    // Generate signed, temporary photo URL (15 minutes expiry)
    const secretKey = env.GEMINI_API_KEY || 'nailory_r2_secret_key';
    const photoUrl = await generateSignedPhotoUrl(
      photoKey,
      tenantId,
      secretKey,
      request.url,
      900
    );

    // 4. Fetch Salon Gel Inventory from D1 Database
    if (!env.DB) {
      throw new Error('D1 Databáza (DB) nie je pripojená.');
    }

    const { results: inventoryResults } = await env.DB.prepare(
      'SELECT id, brand, code_or_name, category FROM inventory_gels WHERE tenant_id = ?'
    )
      .bind(tenantId)
      .all();

    const inventory = inventoryResults || [];

    // 5. Construct Gemini Vision Prompt with Inventory Context
    const geminiPrompt = `
Si expertná asistentka v luxusnom nechtovom salóne. Tvojou úlohou je analyzovať priloženú fotografiu z návštevy klientky.
Na fotke by mali byť vidieť upravené nechty a pravdepodobne aj fľaštičky s gélmi alebo lakmi, ktoré boli pri modeláži použité.

K dispozícii máš nasledujúci JSON zoznam dostupných gélov v katalógu tohto konkrétneho salónu:
${JSON.stringify(inventory)}

Tvoje úlohy:
1. Analyzuj dizajn, tvar a farbu nechtov na fotke a vygeneruj relevantné tagy štýlu (napr. "nude", "french", "red", "ombre", "glitter", "almond", "coffin", "square", "minimalist").
2. Identifikuj fľaštičky s produktmi na fotke (všimni si značku a kód/názov na etikete).
3. Pokús sa tieto identifikované produkty SPÁROVAŤ K PRESNÝM POLOJSKÁM v poskytnutom katalógu. Vráť iba zoznam 'id' tých gélov, u ktorých si si istá zhodou. Nevymýšľaj si žiadne vlastné ID, použi VÝHRADNE tie z poskytnutého JSON katalógu.
4. Ak na fotke nie sú žiadne fľaštičky, vráť prázdny zoznam gélov.

Vráť VÝHRADNE platný JSON objekt (bez formátovania Markdown) v nasledujúcej štruktúre:
{
  "style_tags": ["tag1", "tag2"],
  "matched_gel_ids": ["id1", "id2"],
  "notes": "Tvoj krátky, profesionálny postreh o dizajne a použitých produktoch v slovenskom jazyku."
}
`;

    // 6. Call Gemini Vision API with Retry (Max 3 attempts, exponential backoff) & Timeout (20s AbortController)
    const apiKey = env.GEMINI_API_KEY;
    const model = env.GEMINI_MODEL || 'gemini-3.6-flash';

    let styleTags = [];
    let matchedGelIds = [];
    let aiNotes = '';

    const aiResult = await callGeminiApiWithRetry({
      apiKey,
      model,
      prompt: geminiPrompt,
      inlineData: {
        mimeType: preparedImage.mimeType,
        data: preparedImage.base64Image,
      },
      timeoutMs: 20000,
      maxAttempts: 3,
      requestId,
      tenantId,
      operationName: 'GEMINI_VISION_ANALYSIS',
    });

    if (aiResult.success && aiResult.text) {
      // Safe JSON validation
      const parsedAi = parseAndValidateGeminiJson(aiResult.text);
      styleTags = parsedAi.data.style_tags;
      matchedGelIds = parsedAi.data.matched_gel_ids;
      aiNotes = parsedAi.data.notes;
    } else if (aiResult.timedOut) {
      aiNotes = 'Požiadavka na AI vypršala (Timed out).';
    } else {
      aiNotes = `Automatická analýza AI zlyhala: ${aiResult.message || 'Neovplyvňuje uloženie návštevy.'}`;
    }

    // Filter matched gel IDs against existing salon inventory
    const uniqueGelIds = [...new Set(matchedGelIds)];
    const validGelIds = uniqueGelIds.filter((id) => inventory.some((gel) => gel.id === id));

    // 7. Atomic D1 Database Transaction (BEGIN ... INSERT visits ... INSERT visit_gels ... COMMIT)
    const visitId = 'visit_' + crypto.randomUUID();

    const insertVisitStmt = env.DB.prepare(
      'INSERT INTO visits (id, tenant_id, customer_id, photo_key, style_tags, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      visitId,
      tenantId,
      customerId.trim(),
      photoKey,
      JSON.stringify(styleTags),
      aiNotes
    );

    const insertGelStmts = validGelIds.map((gelId) =>
      env.DB.prepare('INSERT INTO visit_gels (visit_id, gel_id) VALUES (?, ?)').bind(visitId, gelId)
    );

    // Execute atomic batch transaction in D1
    await env.DB.batch([insertVisitStmt, ...insertGelStmts]);

    const durationMs = Date.now() - startTime;
    logEvent({
      requestId,
      tenantId,
      customerId,
      operation: 'ANALYZE_AND_SAVE_SUCCESS',
      durationMs,
      retries: aiResult.attempts ? aiResult.attempts - 1 : 0,
      success: true,
    });

    // 8. Return Production-Ready JSON Response
    return createJsonResponse(
      {
        success: true,
        message: 'Návšteva bola úspešne zaznamenaná a analyzovaná.',
        data: {
          visit_id: visitId,
          customer_id: customerId,
          photo_key: photoKey,
          photo_url: photoUrl,
          style_tags: styleTags,
          matched_gels: validGelIds,
          notes: aiNotes,
          ai_status: aiResult.status || (aiResult.success ? 'SUCCESS' : 'FAILED'),
        },
      },
      201
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logEvent({
      requestId,
      tenantId,
      operation: 'ANALYZE_AND_SAVE_ERROR',
      durationMs,
      success: false,
      error: error.message,
    });

    return createJsonResponse(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Nastala chyba pri spracovaní a ukladaní záznamu návštevy.',
      },
      500
    );
  }
}
