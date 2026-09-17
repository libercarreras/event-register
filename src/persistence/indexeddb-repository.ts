import type {
  AppSettings,
  Order,
  OrderItem,
  Product,
  Session,
  SessionTotals,
} from "@/domain/types";
import type {
  BackupFile,
  ConfirmSaleInput,
  ConfirmedSale,
  Repository,
} from "./repository";
import { clear, get, getAll, getAllByIndex, put, tx, uuid } from "./idb";

const DEFAULT_SETTINGS: AppSettings = {
  id: "settings",
  pinEnabled: false,
  pinCode: null,
  ticketWidthMm: 58,
  businessName: "FOGA Eventos",
};

const SEED_PRODUCTS: Array<[string, number, Product["categoryId"]]> = [
  ["Chorizo", 25000, "comidas"],
  ["Hamburguesa", 32000, "comidas"],
  ["Papas fritas", 18000, "comidas"],
  ["Coca-Cola", 12000, "bebidas"],
  ["Agua", 8000, "bebidas"],
  ["Cerveza", 20000, "bebidas"],
];

function sessionLabel(date: Date): string {
  return date.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export class IndexedDbRepository implements Repository {
  async listProducts(): Promise<Product[]> {
    const products = await tx(["products"], "readonly", (t) => getAll<Product>(t, "products"));
    if (products.length === 0) return this.seedProducts();
    return products.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private async seedProducts(): Promise<Product[]> {
    const now = Date.now();
    const seeded: Product[] = SEED_PRODUCTS.map(([name, price, categoryId], i) => ({
      id: uuid(),
      name,
      price,
      categoryId,
      active: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    }));
    await tx(["products"], "readwrite", async (t) => {
      for (const p of seeded) await put(t, "products", p);
    });
    return seeded;
  }

  async saveProduct(product: Product): Promise<void> {
    await tx(["products"], "readwrite", (t) => put(t, "products", product));
  }

  async getOpenSession(): Promise<Session | null> {
    const sessions = await tx(["sessions"], "readonly", (t) => getAll<Session>(t, "sessions"));
    return sessions.find((s) => s.closedAt === null) ?? null;
  }

  async listSessions(): Promise<Session[]> {
    const sessions = await tx(["sessions"], "readonly", (t) => getAll<Session>(t, "sessions"));
    return sessions.sort((a, b) => b.openedAt - a.openedAt);
  }

  async openSession(label?: string): Promise<Session> {
    return tx(["sessions"], "readwrite", async (t) => {
      const existing = await getAll<Session>(t, "sessions");
      const open = existing.find((s) => s.closedAt === null);
      if (open) return open; // nunca dos jornadas abiertas
      const now = Date.now();
      const session: Session = {
        id: uuid(),
        openedAt: now,
        closedAt: null,
        label: label && label.trim() !== "" ? label : sessionLabel(new Date(now)),
      };
      await put(t, "sessions", session);
      return session;
    });
  }

  async closeSession(sessionId: string): Promise<Session> {
    return tx(["sessions"], "readwrite", async (t) => {
      const session = await get<Session>(t, "sessions", sessionId);
      if (!session) throw new Error("Jornada inexistente");
      if (session.closedAt !== null) return session;
      const closed: Session = { ...session, closedAt: Date.now() };
      await put(t, "sessions", closed);
      return closed;
    });
  }

  async nextOrderNumber(sessionId: string): Promise<number> {
    const orders = await tx(["orders"], "readonly", (t) =>
      getAllByIndex<Order>(t, "orders", "bySession", sessionId),
    );
    return orders.reduce((max, o) => Math.max(max, o.number), 0) + 1;
  }

  // El correlativo definitivo se determina aquí, dentro de la transacción.
  async confirmSale(input: ConfirmSaleInput): Promise<ConfirmedSale> {
    if (input.lines.length === 0) throw new Error("El pedido está vacío");
    return tx(["sessions", "orders", "order_items"], "readwrite", async (t) => {
      const sessions = await getAll<Session>(t, "sessions");
      const session = sessions.find((s) => s.closedAt === null);
      if (!session) throw new Error("No hay una jornada abierta");

      const existing = await getAllByIndex<Order>(t, "orders", "bySession", session.id);
      const number = existing.reduce((max, o) => Math.max(max, o.number), 0) + 1;

      const orderId = uuid();
      const items: OrderItem[] = input.lines.map((line) => ({
        id: uuid(),
        orderId,
        productId: line.productId,
        nameSnapshot: line.name,
        unitPriceSnapshot: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.unitPrice * line.quantity,
      }));
      const order: Order = {
        id: orderId,
        sessionId: session.id,
        number,
        customerName: input.customerName?.trim() ? input.customerName.trim() : null,
        total: items.reduce((sum, i) => sum + i.lineTotal, 0),
        paymentMethod: input.paymentMethod,
        status: "confirmada",
        createdAt: Date.now(),
        voidedAt: null,
        voidReason: null,
        printed: false,
        printCount: 0,
      };
      await put(t, "orders", order);
      for (const item of items) await put(t, "order_items", item);
      return { order, items };
    });
  }

  async listOrders(sessionId: string): Promise<Order[]> {
    const orders = await tx(["orders"], "readonly", (t) =>
      getAllByIndex<Order>(t, "orders", "bySession", sessionId),
    );
    return orders.sort((a, b) => b.number - a.number);
  }

  async listOrderItems(orderId: string): Promise<OrderItem[]> {
    return tx(["order_items"], "readonly", (t) =>
      getAllByIndex<OrderItem>(t, "order_items", "byOrder", orderId),
    );
  }

  async markPrinted(orderId: string, ok: boolean): Promise<Order> {
    return tx(["orders"], "readwrite", async (t) => {
      const order = await get<Order>(t, "orders", orderId);
      if (!order) throw new Error("Pedido inexistente");
      const updated: Order = {
        ...order,
        printed: ok ? true : order.printed,
        printCount: ok ? order.printCount + 1 : order.printCount,
      };
      await put(t, "orders", updated);
      return updated;
    });
  }

  async voidOrder(orderId: string, reason: string | null): Promise<Order> {
    return tx(["orders"], "readwrite", async (t) => {
      const order = await get<Order>(t, "orders", orderId);
      if (!order) throw new Error("Pedido inexistente");
      const updated: Order = {
        ...order,
        status: "anulada",
        voidedAt: Date.now(),
        voidReason: reason,
      };
      await put(t, "orders", updated);
      return updated;
    });
  }

  async sessionTotals(sessionId: string): Promise<SessionTotals> {
    const orders = await this.listOrders(sessionId);
    const validas = orders.filter((o) => o.status === "confirmada");
    return {
      efectivo: validas.filter((o) => o.paymentMethod === "efectivo").reduce((s, o) => s + o.total, 0),
      debito: validas.filter((o) => o.paymentMethod === "debito").reduce((s, o) => s + o.total, 0),
      total: validas.reduce((s, o) => s + o.total, 0),
      orders: validas.length,
      anuladas: orders.length - validas.length,
    };
  }

  async getSettings(): Promise<AppSettings> {
    const found = await tx(["settings"], "readonly", (t) =>
      get<AppSettings>(t, "settings", "settings"),
    );
    if (found) return { ...DEFAULT_SETTINGS, ...found };
    await this.saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await tx(["settings"], "readwrite", (t) => put(t, "settings", settings));
  }

  async exportBackup(): Promise<BackupFile> {
    const [products, sessions, orders, orderItems, settings] = await Promise.all([
      tx(["products"], "readonly", (t) => getAll<Product>(t, "products")),
      tx(["sessions"], "readonly", (t) => getAll<Session>(t, "sessions")),
      tx(["orders"], "readonly", (t) => getAll<Order>(t, "orders")),
      tx(["order_items"], "readonly", (t) => getAll<OrderItem>(t, "order_items")),
      this.getSettings(),
    ]);
    return {
      format: "foga-eventos-backup",
      version: 1,
      createdAt: Date.now(),
      products,
      sessions,
      orders,
      orderItems,
      settings,
    };
  }

  async importBackup(backup: BackupFile): Promise<void> {
    await tx(["products", "sessions", "orders", "order_items", "settings"], "readwrite", async (t) => {
      await clear(t, "products");
      await clear(t, "sessions");
      await clear(t, "orders");
      await clear(t, "order_items");
      await clear(t, "settings");
      for (const p of backup.products) await put(t, "products", p);
      for (const s of backup.sessions) await put(t, "sessions", s);
      for (const o of backup.orders) await put(t, "orders", o);
      for (const i of backup.orderItems) await put(t, "order_items", i);
      await put(t, "settings", { ...backup.settings, id: "settings" });
    });
  }
}

export function validateBackup(data: unknown): data is BackupFile {
  if (typeof data !== "object" || data === null) return false;
  const b = data as Partial<BackupFile>;
  return (
    b.format === "foga-eventos-backup" &&
    b.version === 1 &&
    Array.isArray(b.products) &&
    Array.isArray(b.sessions) &&
    Array.isArray(b.orders) &&
    Array.isArray(b.orderItems) &&
    typeof b.settings === "object" &&
    b.settings !== null
  );
}

export const repository: Repository = new IndexedDbRepository();
