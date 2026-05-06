// هذا هو المحتوى الجديد الكامل للملف. استبدل كل شيء به.

// ... (جميع الـ imports والوظائف المساعدة الأخرى مثل createClient, corsHeaders, getPath, setPath, resolveTemplate, etc. تبقى كما هي دون تغيير) ...

async function sendRequest(config: JsonRecord, order: JsonRecord, context: JsonRecord, label = "Create package") {
  if (!config?.url) throw new Error(`${label} URL is missing`);
  const method = String(config.method || "POST").toUpperCase();
  const headers = renderObject(config.headers ?? {}, context);

  // ✅ ** LOGIQUE MODIFIÉE ICI **
  let payload: any = null;

  // 1. Priorité au payload_json s'il est présent et non vide
  if (config.payload_json && typeof config.payload_json === "string" && config.payload_json.trim() !== "") {
    try {
      // Analyser le JSON saisi par l'utilisateur
      const parsedJson = JSON.parse(config.payload_json);
      // Remplacer les variables comme {{create_response.trackingID}} dans le JSON
      payload = renderObject(parsedJson, { ...context, create_response: context.create_response });
    } catch (e) {
      throw new Error(`Invalid payload_json for ${label}: ${e.message}`);
    }
  }
  // 2. Sinon, si un payload statique est défini dans la config
  else if (config.payload) {
    payload = renderObject(config.payload, context);
  }
  // 3. Sinon, construire le payload à partir du mapping key/value
  else {
    payload = buildMappedPayload(order, config.payload_mapping ?? {}, context);
  }

  // Construire l'objet d'échange pour les logs (inchangé)
  const exchange = {
    sending: {
      direction: "outgoing",
      label,
      method,
      url: config.url,
      headers: maskSensitiveHeaders({ "Content-Type": "application/json", ...headers }),
      payload: method === "GET" ? null : payload,
    },
    reception: null as any,
  };

  // ... (le reste de la fonction sendRequest, y compris l'appel fetch, la gestion des erreurs, et la construction de l'objet exchange.reception, reste identique à l'original) ...
}

// ... (le reste du fichier (Deno.serve, etc.) reste complètement inchangé) ...
