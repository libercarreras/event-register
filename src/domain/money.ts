// Importes en centésimos (enteros). Formato uruguayo: $ 1.450

export function formatMoney(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const units = Math.floor(abs / 100);
  const rest = abs % 100;
  const intPart = units.toLocaleString("es-UY");
  const body = rest === 0 ? intPart : `${intPart},${String(rest).padStart(2, "0")}`;
  return `${negative ? "-" : ""}$ ${body}`;
}

// "250" -> 25000 ; "250,50" -> 25050 ; "1.450" -> 145000
export function parseMoneyInput(input: string): number | null {
  const clean = input.trim().replace(/\s/g, "").replace(/\$/g, "").replace(/\./g, "");
  if (clean === "") return null;
  const normalized = clean.replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

export function moneyToInput(cents: number): string {
  const units = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(units) : `${units},${String(rest).padStart(2, "0")}`;
}
