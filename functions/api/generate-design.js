// /functions/api/generate-design.js
// Production-ready Cloudflare Pages Function for generating next visit design concepts
// based on customer history using Gemini AI with retries, timeout, and safe JSON parsing.

import {
  logEvent,
  createJsonResponse,
  callGeminiApiWithRetry,
  parseAndValidateGeminiJson,
} from './_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const startTime = Date.now();
  const requestId = 'req_' + crypto.randomUUID().substring(0, 8);
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

  const tenantId = request.headers.get('x-tenant-id') || 'tenant_demo';
  const customerId = url.searchParams.get('customer_id');

  if (!customerId || !customerId.trim()) {
    return createJsonResponse(
      {
        success: false,
        code: 'MISSING_CUSTOMER_ID',
        message: 'Chýba identifikátor zákazníčky (customer_id).',
      },
      400
    );
  }

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

    // 1. Retrieve history of last 3 customer visits from D1
    const { results: visits } = await db
      .prepare(
        'SELECT visit_date, style_tags, notes FROM visits WHERE tenant_id = ? AND customer_id = ? ORDER BY visit_date DESC LIMIT 3'
      )
      .bind(tenantId, customerId.trim())
      .all();

    if (!visits || visits.length === 0) {
      return createJsonResponse(
        {
          success: false,
          code: 'NO_VISIT_HISTORY',
          message: 'Zákazníčka zatiaľ nemá žiadnu históriu návštev pre generovanie návrhov.',
        },
        404
      );
    }

    // 2. Format history for AI prompt
    const historyText = visits
      .map((v, index) => {
        let tags = 'žiadne tagy';
        try {
          if (v.style_tags) tags = JSON.parse(v.style_tags).join(', ');
        } catch (e) {
          tags = 'chyba parsovania tagov';
        }
        const formattedDate = new Date(v.visit_date).toLocaleDateString('sk-SK');
        return `Návšteva ${index + 1} (${formattedDate}): Štýl: [${tags}], Poznámka: ${v.notes || 'žiadna'}`;
      })
      .join('\n');

    // 3. Construct Gemini Prompt
    const geminiPrompt = `
Si elitný dizajnér a nechtový stylista v luxusnom salóne. Tvojou úlohou je navrhnúť 3 inovatívne a elegantné koncepty nechtového dizajnu pre klientku na jej ďalšiu návštevu, pričom vychádzaš z jej doterajšej histórie (aby si zachoval jej vkus, ale priniesol niečo svieže).

História posledných návštev klientky:
${historyText}

Tvoje úlohy:
1. Analyzuj jej preferencie (farby, tvary, zložitosť).
2. Navrhni 3 rôzne kreatívne koncepty na ďalšiu manikúru (od najbezpečnejšieho po trochu odvážnejší).
3. Vytvor 1 veľmi detailný prompt v angličtine pre AI generátor obrázkov (napr. Midjourney/DALL-E), ktorý by vizualizoval najlepší z týchto troch návrhov. Prompt musí opisovať ruku, štýl nechtov, farby, osvetlenie (luxusné štúdiové svetlo) a pozadie.

Vráť VÝHRADNE platný JSON objekt (bez formátovania Markdown) v nasledujúcej štruktúre:
{
  "concepts": [
    {
      "title": "Názov konceptu (napr. Jemná Elegancia)",
      "description": "Detailný popis dizajnu, odporúčané farby a techniky v slovenskom jazyku."
    }
  ],
  "image_generation_prompt": "Podrobný prompt v angličtine pre generovanie obrázku tohto dizajnu na rukách klientky."
}
`;

    // 4. Call Gemini API with Retry & Timeout
    const apiKey = env.GEMINI_API_KEY;
    const model = env.GEMINI_MODEL || 'gemini-3.6-flash';

    const aiResult = await callGeminiApiWithRetry({
      apiKey,
      model,
      prompt: geminiPrompt,
      timeoutMs: 20000,
      maxAttempts: 3,
      requestId,
      tenantId,
      operationName: 'GENERATE_DESIGN_AI',
    });

    if (!aiResult.success) {
      logEvent({
        requestId,
        tenantId,
        customerId,
        operation: 'GENERATE_DESIGN_AI_FAILED',
        durationMs: Date.now() - startTime,
        success: false,
        error: aiResult.message,
      });

      return createJsonResponse(
        {
          success: false,
          code: aiResult.code || 'AI_ERROR',
          message: aiResult.message || 'Nepodarilo sa vygenerovať návrhy pomocou AI.',
        },
        500
      );
    }

    // 5. Safe JSON Parsing and Validation
    const parsedAi = parseAndValidateGeminiJson(aiResult.text, 'GENERATE_DESIGN');

    logEvent({
      requestId,
      tenantId,
      customerId,
      operation: 'GENERATE_DESIGN_SUCCESS',
      durationMs: Date.now() - startTime,
      retries: aiResult.attempts ? aiResult.attempts - 1 : 0,
      success: true,
    });

    return createJsonResponse({
      success: true,
      message: 'Návrhy pre ďalšiu návštevu boli úspešne vygenerované.',
      data: {
        history_used: visits.length,
        concepts: parsedAi.data.concepts,
        image_generation_prompt: parsedAi.data.image_generation_prompt,
      },
    });
  } catch (error) {
    logEvent({
      requestId,
      tenantId,
      operation: 'GENERATE_DESIGN_ERROR',
      durationMs: Date.now() - startTime,
      success: false,
      error: error.message,
    });

    return createJsonResponse(
      {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Nastala chyba pri generovaní návrhov dizajnu.',
      },
      500
    );
  }
}
