export function serialize(payload) {
  if (Array.isArray(payload)) {
    return payload.map(serialize);
  }

  if (payload && typeof payload === "object") {
    if (payload?.constructor?.name === "Decimal") {
      return Number(payload);
    }

    return Object.fromEntries(
      Object.entries(payload).map(([key, value]) => [key, serialize(value)])
    );
  }

  return payload;
}
