// /functions/api/customers.js
// Cloudflare Pages Function for managing customer records in Cloudflare D1
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

    // GET /api/customers - List or search customers for tenant
    if (request.method === 'GET') {
      const search = url.searchParams.get('q');
      let query = 'SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC';
      let params = [tenantId];

      if (search && search.trim()) {
        const sanitizedSearch = search.trim();
        query =
          'SELECT * FROM customers WHERE tenant_id = ? AND (name LIKE ? OR phone LIKE ? OR notes LIKE ?) ORDER BY created_at DESC';
        const searchPattern = `%${sanitizedSearch}%`;
        params = [tenantId, searchPattern, searchPattern, searchPattern];
      }

      const { results } = await db.prepare(query).bind(...params).all();

      logEvent({
        requestId,
        tenantId,
        operation: 'GET_CUSTOMERS_SUCCESS',
        durationMs: Date.now() - startTime,
        success: true,
      });

      return createJsonResponse({
        success: true,
        data: results || [],
        count: (results || []).length,
      });
    }

    // POST /api/customers - Create new customer record
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { name, phone, notes } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return createJsonResponse(
          {
            success: false,
            code: 'MISSING_NAME',
            message: 'Meno zákazníčky je povinný údaj.',
          },
          400
        );
      }

      const customerId = 'cust_' + crypto.randomUUID();
      const sanitizedName = name.trim();
      const sanitizedPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;
      const sanitizedNotes = notes && typeof notes === 'string' && notes.trim() ? notes.trim() : null;

      await db
        .prepare(
          'INSERT INTO customers (id, tenant_id, name, phone, notes) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(customerId, tenantId, sanitizedName, sanitizedPhone, sanitizedNotes)
        .run();

      const newCustomer = {
        id: customerId,
        tenant_id: tenantId,
        name: sanitizedName,
        phone: sanitizedPhone,
        notes: sanitizedNotes,
        created_at: new Date().toISOString(),
      };

      logEvent({
        requestId,
        tenantId,
        customerId,
        operation: 'CREATE_CUSTOMER_SUCCESS',
        durationMs: Date.now() - startTime,
        success: true,
      });

      return createJsonResponse(
        {
          success: true,
          message: 'Zákazníčka bola úspešne vytvorená.',
          data: newCustomer,
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
      operation: 'CUSTOMERS_API_ERROR',
      durationMs: Date.now() - startTime,
      success: false,
      error: err.message,
    });

    return createJsonResponse(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Chyba servera pri spracovaní požiadavky na zákazníčky.',
      },
      500
    );
  }
}
