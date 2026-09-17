import type { Order, OrderItem } from "./types";

// Objeto Ticket neutral: independiente de ESC/POS, del navegador y de Electron.
export interface TicketLine {
  text: string;
  style?: "normal" | "bold" | "huge" | "big" | "center" | "separator";
}

export interface Ticket {
  widthMm: 58 | 80;
  orderNumber: number;
  reprint: boolean;
  lines: TicketLine[];
}

export function charsForWidth(widthMm: 58 | 80): number {
  return widthMm === 58 ? 32 : 48;
}

function pad(text: string, chars: number): string {
  return text.length > chars ? text.slice(0, chars) : text;
}

export function buildKitchenTicket(
  order: Order,
  items: OrderItem[],
  widthMm: 58 | 80,
  reprint: boolean,
): Ticket {
  const chars = charsForWidth(widthMm);
  const lines: TicketLine[] = [];
  if (reprint) lines.push({ text: "REIMPRESION", style: "center" });
  lines.push({ text: `PEDIDO #${String(order.number).padStart(3, "0")}`, style: "huge" });
  lines.push({ text: "-".repeat(chars), style: "separator" });
  if (order.customerName) lines.push({ text: pad(order.customerName.toUpperCase(), chars), style: "big" });
  lines.push({ text: "", style: "normal" });
  for (const it of items) {
    lines.push({ text: pad(`${it.quantity} ${it.nameSnapshot.toUpperCase()}`, chars), style: "bold" });
  }
  lines.push({ text: "", style: "normal" });
  lines.push({ text: "-".repeat(chars), style: "separator" });
  const d = new Date(order.createdAt);
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  lines.push({ text: hora, style: "center" });
  // La comanda de preparación NO lleva precios.
  return { widthMm, orderNumber: order.number, reprint, lines };
}
