// /functions/api/inventory.js
// Cloudflare Pages Function for managing gel inventory in Cloudflare D1
// Implements strict validation, structured logging, CORS, and standardized machine-readable errors.

import { createJsonResponse, logEvent } from './_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const startTime = Date.now();
  const requestId = 'req_' + crypto.randomUUID().substring(0, 8);
  const url = new URL(request.url);

  // Handle CORS OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return createJsonResponse({ ok: true });
  }

  // Extract tenant_id from header (fallback to demo tenant)
  const tenantId = request.headers.get('x-tenant-id') || 'tenant_demo';

  try {
    const db = env.DB;
    if (!db) {
      return createJsonResponse(
        {
          success: false,
          code: 'DATABASE_ERROR',
          message: 'D1 Databáza nie je pripojená.',
        },
        500
      );
    }

    // GET /api/inventory - List or search gel inventory for salon tenant
    if (request.method === 'GET') {
      const search = url.searchParams.get('q');
      const category = url.searchParams.get('category');

      let query = 'SELECT * FROM inventory_gels WHERE tenant_id = ?';
      let params = [tenantId];

      if (category && category.trim()) {
        query += ' AND category = ?';
        params.push(category.trim());
      }

      if (search && search.trim()) {
        query += ' AND (brand LIKE ? OR code_or_name LIKE ?)';
        const searchPattern = `%${search.trim()}%`;
        params.push(searchPattern, searchPattern);
      }

      query += ' ORDER BY brand ASC, code_or_name ASC';

      const { results } = await db.prepare(query).bind(...params).all();

      logEvent({
        requestId,
        tenantId,
        operation: 'GET_INVENTORY_SUCCESS',
        durationMs: Date.now() - startTime,
        success: true,
      });

      return createJsonResponse({
        success: true,
        data: results || [],
        count: (results || []).length,
      });
    }

    // POST /api/inventory - Add new gel item to salon inventory
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { brand, code_or_name, color_hex, category, photo_key } = body;

      if (!brand || typeof brand !== 'string' || !brand.trim()) {
        return createJsonResponse(
          {
            success: false,
            code: 'MISSING_BRAND',
            message: 'Značka gélu (brand) je povinný údaj.',
          },
          400
        );
      }

      if (!code_or_name || typeof code_or_name !== 'string' || !code_or_name.trim()) {
        return createJsonResponse(
          {
            success: false,
            code: 'MISSING_CODE_OR_NAME',
            message: 'Kód alebo názov gélu (code_or_name) je povinný údaj.',
          },
          400
        );
      }

      const gelId = 'gel_' + crypto.randomUUID();
      const sanitizedBrand = brand.trim();
      const sanitizedCode = code_or_name.trim();
      const sanitizedHex = color_hex && typeof color_hex === 'string' && color_hex.trim() ? color_hex.trim() : '#e6c594';
      const sanitizedCategory = category && typeof category === 'string' && category.trim() ? category.trim() : 'color';
      const sanitizedPhotoKey = photo_key && typeof photo_key === 'string' && photo_key.trim() ? photo_key.trim() : null;

      await db
        .prepare(
          `INSERT INTO inventory_gels (id, tenant_id, brand, code_or_name, color_hex, category, photo_key) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          gelId,
          tenantId,
          sanitizedBrand,
          sanitizedCode,
          sanitizedHex,
          sanitizedCategory,
          sanitizedPhotoKey
        )
        .run();

      const newGel = {
        id: gelId,
        tenant_id: tenantId,
        brand: sanitizedBrand,
        code_or_name: sanitizedCode,
        color_hex: sanitizedHex,
        category: sanitizedCategory,
        photo_key: sanitizedPhotoKey,
        created_at: new Date().toISOString(),
      };

      logEvent({
        requestId,
        tenantId,
        operation: 'CREATE_GEL_SUCCESS',
        durationMs: Date.now() - startTime,
        success: true,
      });

      return createJsonResponse(
        {
          success: true,
          message: 'Gél bol úspešne pridaný do katalógu.',
          data: newGel,
        },
        201
      );
    }

    return createJsonResponse(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metóda nie je podporovaná.',
      },
      405
    );
  } catch (err) {
    logEvent({
      requestId,
      tenantId,
      operation: 'INVENTORY_API_ERROR',
      durationMs: Date.now() - startTime,
      success: false,
      error: err.message,
    });

    return createJsonResponse(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Chyba servera pri spracovaní požiadavky na inventár gélov.',
      },
      500
    );
  }
}
