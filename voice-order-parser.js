/*
 * Fase 1: transcripcion a borrador. No crea ni envia ordenes automaticamente.
 * Archivo compartido entre el cliente Expo y la interfaz Windows/web.
 */
(function (root) {
  "use strict";
  const LABELS = /\b(cliente|nombre|tel[eé]fono|celular|whatsapp|marca|modelo|equipo|dispositivo|falla|problema|reparaci[oó]n|costo|total|precio|presupuesto|anticipo|adelanto|imei)\s*[:\-]?\s*/gi;
  const BRANDS = ["Samsung", "Motorola", "Xiaomi", "Redmi", "Poco", "Apple", "iPhone", "Huawei", "Honor", "Oppo", "Vivo", "Realme", "Tecno", "Infinix", "Nokia", "ZTE", "LG", "Alcatel", "Google"];
  const keyFor = (raw) => {
    const s = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (["cliente", "nombre"].includes(s)) return "customer";
    if (["telefono", "celular"].includes(s)) return "phone";
    if (s === "whatsapp") return "whatsapp";
    if (s === "marca") return "brand";
    if (s === "modelo") return "model";
    if (["equipo", "dispositivo"].includes(s)) return "device";
    if (["falla", "problema", "reparacion"].includes(s)) return "issue";
    if (["costo", "total", "precio", "presupuesto"].includes(s)) return "estimatedTotal";
    if (["anticipo", "adelanto"].includes(s)) return "deposit";
    return s;
  };
  const amount = (value) => {
    const match = String(value || "").match(/\d[\d.,\s]*/);
    if (!match) return undefined;
    let normalized = match[0].trim().replace(/\s/g, "");
    if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(normalized)) normalized = normalized.replace(/,/g, "");
    else if (/^\d+,\d{1,2}$/.test(normalized)) normalized = normalized.replace(",", ".");
    else normalized = normalized.replace(/,/g, "");
    const n = Number(normalized);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  function parseVoiceOrder(input) {
    const transcript = String(input || "").trim().slice(0, 2000);
    const data = {};
    const matches = Array.from(transcript.matchAll(LABELS));
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const value = transcript.slice(match.index + match[0].length, i + 1 < matches.length ? matches[i + 1].index : transcript.length)
        .replace(/^[\s,;:.]+|[\s,;:.]+$/g, "").trim();
      if (value) data[keyFor(match[1])] = value;
    }
    if (data.device) {
      const device = data.device.trim();
      const brandName = BRANDS.find((brand) => new RegExp("^" + brand + "(?:\\s|$)", "i").test(device));
      if (brandName) {
        if (!data.brand) data.brand = brandName === "iPhone" ? "Apple" : brandName;
        if (!data.model) data.model = brandName === "iPhone" ? device : device.slice(brandName.length).trim();
      } else if (!data.model) {
        data.model = device;
      }
    }
    if (data.brand && /^iphone$/i.test(data.brand)) data.brand = "Apple";
    const phone = String(data.phone || "").replace(/[^\d+]/g, "");
    const whatsapp = String(data.whatsapp || "").replace(/[^\d+]/g, "");
    const total = amount(data.estimatedTotal);
    const deposit = amount(data.deposit);
    const order = {
      customer: String(data.customer || "").trim(),
      phone: phone.replace(/(?!^)\+/g, ""),
      whatsapp: whatsapp.replace(/(?!^)\+/g, "") || phone.replace(/(?!^)\+/g, ""),
      brand: String(data.brand || "").trim(),
      model: String(data.model || "").trim(),
      imei: String(data.imei || "").replace(/\D/g, ""),
      issue: String(data.issue || "").trim(),
      estimatedTotal: total === undefined ? 0 : total,
      deposit: deposit === undefined ? 0 : deposit
    };
    const missing = [];
    if (!order.customer) missing.push("cliente");
    if (!order.brand) missing.push("marca");
    if (!order.model) missing.push("modelo");
    if (!order.issue) missing.push("falla");
    if (data.estimatedTotal && total === undefined) missing.push("costo");
    if (data.deposit && deposit === undefined) missing.push("anticipo");
    if (order.phone && order.phone.replace(/\D/g, "").length < 10) missing.push("telefono valido");
    if (order.deposit > order.estimatedTotal && order.estimatedTotal > 0) missing.push("revisar anticipo");
    return { transcript, order, missing };
  }
  const api = { parseVoiceOrder };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.FixFlowVoiceParser = api;
})(typeof window !== "undefined" ? window : undefined);
