// Modelos de dominio de FOGA Eventos.
// Importes SIEMPRE en enteros (centésimos). Nunca floats.

export type CategoryId = "comidas" | "bebidas" | "otros";

export interface Category {
  id: CategoryId;
  name: string;
}

export const CATEGORIES: Category[] = [
  { id: "comidas", name: "COMIDAS" },
  { id: "bebidas", name: "BEBIDAS" },
  { id: "otros", name: "OTROS" },
];

export interface Product {
  id: string; // uuid interno
  name: string;
  price: number; // centésimos
  categoryId: CategoryId;
  active: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  id: string; // uuid interno
  openedAt: number;
  closedAt: number | null;
  label: string;
  mock?: boolean; // TEMPORAL: marca datos de testing
}

export type PaymentMethod = "efectivo" | "debito";
export type OrderStatus = "confirmada" | "anulada";

export interface Order {
  id: string; // uuid interno, único global
  sessionId: string;
  number: number; // correlativo visible, reinicia por jornada
  customerName: string | null;
  total: number; // centésimos
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: number;
  voidedAt: number | null;
  voidReason: string | null;
  printed: boolean;
  printCount: number;
  mock?: boolean; // TEMPORAL: marca datos de testing
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  nameSnapshot: string;
  unitPriceSnapshot: number; // centésimos
  quantity: number;
  lineTotal: number; // centésimos
  mock?: boolean; // TEMPORAL: marca datos de testing
}

export interface AppSettings {
  id: "settings";
  pinEnabled: boolean;
  pinCode: string | null;
  ticketWidthMm: 58 | 80;
  businessName: string;
}

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface SessionTotals {
  efectivo: number;
  debito: number;
  total: number;
  orders: number;
  anuladas: number;
}
