export function buildFolio(prefix, count) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${String(count + 1).padStart(4, "0")}`;
}
