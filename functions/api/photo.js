// /functions/api/photo.js
// Cloudflare Pages Function for serving signed, temporary R2 photo URLs.
// Verifies HMAC-SHA256 signature and 15-minute expiration before serving image binary.

import { verifyPhotoSignature, createJsonResponse, logEvent } from './_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Handle CORS OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return createJsonResponse({ ok: true });
  }

  if (request.method !== 'GET') {
    return createJsonResponse(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metóda nie je podporovaná. Použite GET.',
      },
      405
    );
  }

  const key = url.searchParams.get('key');
  const tenant = url.searchParams.get('tenant') || 'tenant_demo';
  const expires = url.searchParams.get('expires');
  const sig = url.searchParams.get('sig');

  if (!key || !expires || !sig) {
    return createJsonResponse(
      {
        success: false,
        code: 'MISSING_PARAMETER',
        message: 'Chýbajú parametre pre overenie podpísanej adresy URL.',
      },
      400
    );
  }

  // Secret key for HMAC signing
  const secretKey = env.GEMINI_API_KEY || 'nailory_r2_secret_key';

  // 1. Verify HMAC-SHA256 signature and 15-minute expiration
  const isValid = await verifyPhotoSignature(key, tenant, expires, sig, secretKey);
  if (!isValid) {
    return createJsonResponse(
      {
        success: false,
        code: 'UNAUTHORIZED_URL',
        message: 'Platnosť podpísanej adresy URL vypršala alebo je podpis neplatný.',
      },
      403
    );
  }

  // 2. Fetch object from R2 bucket
  if (!env.PHOTOS) {
    return createJsonResponse(
      {
        success: false,
        code: 'STORAGE_ERROR',
        message: 'R2 Úložisko nie je pripojené.',
      },
      500
    );
  }

  try {
    const object = await env.PHOTOS.get(key);
    if (!object) {
      return createJsonResponse(
        {
          success: false,
          code: 'NOT_FOUND',
          message: 'Fotka nebola nájdená v úložisku.',
        },
        404
      );
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'private, max-age=900');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(object.body, {
      headers,
    });
  } catch (err) {
    logEvent({
      tenantId: tenant,
      operation: 'SERVE_PHOTO_ERROR',
      success: false,
      error: err.message,
    });

    return createJsonResponse(
      {
        success: false,
        code: 'STORAGE_ERROR',
        message: 'Chyba pri načítavaní fotky z R2 úložiska.',
      },
      500
    );
  }
}
