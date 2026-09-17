// HERRAMIENTA TEMPORAL DE DESARROLLO / TESTING.
// Genera y elimina datos MOCK marcados con `mock: true`.
// Debe retirarse por completo antes de entregar la aplicación al cliente.

import type { Order, OrderItem, Product, Session } from "@/domain/types";
import { getAll, getAllByIndex, put, tx, uuid } from "@/persistence/idb";
import { repository } from "@/persistence/indexeddb-repository";

export const MOCK_LABEL_PREFIX = "TEST";

function isMock(record: { mock?: boolean }): boolean {
  return record.mock === true;
}

const CLIENTES = ["MARTÍN", "LUCÍA", "PEDRO", "SOFÍA", "DIEGO", "VALERIA", null, null, null];

// Generador determinista simple para repetir pruebas.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface MockSummary {
  sessions: number;
  orders: number;
  anuladas: number;
  efectivo: number;
  debito: number;
}

export async function generateMockData(): Promise<MockSummary> {
  const products: Product[] = (await repository.listProducts()).filter((p) => p.active);
  if (products.length === 0) throw new Error("No hay productos activos para generar datos de prueba");

  const random = rng(20260917);
  const summary: MockSummary = { sessions: 0, orders: 0, anuladas: 0, efectivo: 0, debito: 0 };
  const day = 24 * 60 * 60 * 1000;

  const sessions: Session[] = [];
  const orders: Order[] = [];
  const items: OrderItem[] = [];

  for (let s = 0; s < 3; s++) {
    const openedAt = Date.now() - (10 - s * 3) * day;
    const session: Session & { mock: true } = {
      id: uuid(),
      openedAt,
      closedAt: openedAt + 8 * 60 * 60 * 1000,
      label: `${MOCK_LABEL_PREFIX} · Evento ${s + 1}`,
      mock: true,
    };
    sessions.push(session);
    summary.sessions++;

    for (let n = 1; n <= 16; n++) {
      const orderId = uuid();
      const lineCount = 1 + Math.floor(random() * 3);
      const orderItems: OrderItem[] = [];
      const used = new Set<string>();
      for (let l = 0; l < lineCount; l++) {
        const product = products[Math.floor(random() * products.length)]!;
        if (used.has(product.id)) continue;
        used.add(product.id);
        const quantity = 1 + Math.floor(random() * 4);
        orderItems.push({
          id: uuid(),
          orderId,
          productId: product.id,
          nameSnapshot: product.name,
          unitPriceSnapshot: product.price,
          quantity,
          lineTotal: product.price * quantity,
          mock: true,
        } as OrderItem & { mock: true });
      }
      const paymentMethod = random() < 0.6 ? "efectivo" : "debito";
      const total = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);
      // Dos anulados por jornada: uno con motivo y otro sin motivo.
      const anulada = n === 5 || n === 12;
      const printCount = random() < 0.25 ? 2 : 1;
      const order: Order & { mock: true } = {
        id: orderId,
        sessionId: session.id,
        number: n,
        customerName: CLIENTES[Math.floor(random() * CLIENTES.length)] ?? null,
        total,
        paymentMethod,
        status: anulada ? "anulada" : "confirmada",
        createdAt: openedAt + n * 12 * 60 * 1000,
        voidedAt: anulada ? openedAt + n * 12 * 60 * 1000 + 300000 : null,
        voidReason: anulada ? (n === 5 ? "Cliente canceló el pedido" : null) : null,
        printed: true,
        printCount,
        mock: true,
      };
      orders.push(order);
      items.push(...orderItems);
      summary.orders++;
      if (anulada) summary.anuladas++;
      else if (paymentMethod === "efectivo") summary.efectivo++;
      else summary.debito++;
    }
  }

  await tx(["sessions", "orders", "order_items"], "readwrite", async (t) => {
    for (const s of sessions) await put(t, "sessions", s);
    for (const o of orders) await put(t, "orders", o);
    for (const i of items) await put(t, "order_items", i);
  });

  return summary;
}

export interface MockDeletion {
  sessions: number;
  orders: number;
  items: number;
}

export async function deleteMockData(): Promise<MockDeletion> {
  return tx(["sessions", "orders", "order_items"], "readwrite", async (t) => {
    const [sessions, orders, items] = await Promise.all([
      getAll<Session & { mock?: boolean }>(t, "sessions"),
      getAll<Order & { mock?: boolean }>(t, "orders"),
      getAll<OrderItem & { mock?: boolean }>(t, "order_items"),
    ]);
    const mockSessions = sessions.filter(isMock);
    const mockOrders = orders.filter(isMock);
    const mockOrderIds = new Set(mockOrders.map((o) => o.id));
    // Sólo se borran ítems marcados como mock Y pertenecientes a pedidos mock.
    const mockItems = items.filter((i) => isMock(i) && mockOrderIds.has(i.orderId));

    for (const i of mockItems) t.objectStore("order_items").delete(i.id);
    for (const o of mockOrders) t.objectStore("orders").delete(o.id);
    for (const s of mockSessions) t.objectStore("sessions").delete(s.id);

    return { sessions: mockSessions.length, orders: mockOrders.length, items: mockItems.length };
  });
}

export async function countMockData(): Promise<MockDeletion> {
  const [sessions, orders] = await Promise.all([
    tx(["sessions"], "readonly", (t) => getAll<Session & { mock?: boolean }>(t, "sessions")),
    tx(["orders"], "readonly", (t) => getAll<Order & { mock?: boolean }>(t, "orders")),
  ]);
  const mockOrders = orders.filter(isMock);
  let items = 0;
  for (const o of mockOrders) {
    const list = await tx(["order_items"], "readonly", (t) =>
      getAllByIndex<OrderItem>(t, "order_items", "byOrder", o.id),
    );
    items += list.length;
  }
  return { sessions: sessions.filter(isMock).length, orders: mockOrders.length, items };
}
