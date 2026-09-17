import type {
  AppSettings,
  CartLine,
  Order,
  OrderItem,
  PaymentMethod,
  Product,
  Session,
  SessionTotals,
} from "@/domain/types";

export interface BackupFile {
  format: "foga-eventos-backup";
  version: 1;
  createdAt: number;
  products: Product[];
  sessions: Session[];
  orders: Order[];
  orderItems: OrderItem[];
  settings: AppSettings;
}

export interface ConfirmSaleInput {
  customerName: string | null;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
}

export interface ConfirmedSale {
  order: Order;
  items: OrderItem[];
}

// Contrato único de persistencia. IndexedDB hoy, SQLite en Electron.
export interface Repository {
  // Productos
  listProducts(): Promise<Product[]>;
  saveProduct(product: Product): Promise<void>;
  // Jornadas
  getOpenSession(): Promise<Session | null>;
  listSessions(): Promise<Session[]>;
  openSession(label: string): Promise<Session>;
  closeSession(sessionId: string): Promise<Session>;
  // Ventas
  nextOrderNumber(sessionId: string): Promise<number>;
  confirmSale(input: ConfirmSaleInput): Promise<ConfirmedSale>;
  listOrders(sessionId: string): Promise<Order[]>;
  listOrderItems(orderId: string): Promise<OrderItem[]>;
  markPrinted(orderId: string, ok: boolean): Promise<Order>;
  voidOrder(orderId: string, reason: string | null): Promise<Order>;
  sessionTotals(sessionId: string): Promise<SessionTotals>;
  // Ajustes
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  // Respaldo
  exportBackup(): Promise<BackupFile>;
  importBackup(backup: BackupFile): Promise<void>;
}
