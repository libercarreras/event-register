import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppSettings,
  CartLine,
  Order,
  PaymentMethod,
  Product,
  Session,
  SessionTotals,
} from "@/domain/types";
import { buildKitchenTicket, type Ticket } from "@/domain/ticket";
import { previewPrinter } from "@/printing/printer";
import { repository } from "@/persistence/indexeddb-repository";

interface AppState {
  ready: boolean;
  session: Session | null;
  products: Product[];
  settings: AppSettings | null;
  orders: Order[];
  totals: SessionTotals;
  nextNumber: number;
  lastTicket: Ticket | null;
  refresh: () => Promise<void>;
  openSession: () => Promise<void>;
  closeSession: () => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  confirmSale: (
    lines: CartLine[],
    customerName: string | null,
    paymentMethod: PaymentMethod,
  ) => Promise<{ order: Order; printed: boolean }>;
  reprint: (orderId: string) => Promise<boolean>;
  voidOrder: (orderId: string) => Promise<void>;
  setLastTicket: (ticket: Ticket | null) => void;
}

const EMPTY_TOTALS: SessionTotals = { efectivo: 0, debito: 0, total: 0, orders: 0, anuladas: 0 };

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totals, setTotals] = useState<SessionTotals>(EMPTY_TOTALS);
  const [nextNumber, setNextNumber] = useState(1);
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);

  useEffect(() => previewPrinter.onTicket((ticket) => setLastTicket(ticket)), []);

  const refresh = useCallback(async () => {
    const [openSession, productList, currentSettings] = await Promise.all([
      repository.getOpenSession(),
      repository.listProducts(),
      repository.getSettings(),
    ]);
    setSession(openSession);
    setProducts(productList);
    setSettings(currentSettings);
    if (openSession) {
      const [orderList, sessionTotals] = await Promise.all([
        repository.listOrders(openSession.id),
        repository.sessionTotals(openSession.id),
      ]);
      setOrders(orderList);
      setTotals(sessionTotals);
      setNextNumber(orderList.reduce((max, o) => Math.max(max, o.number), 0) + 1);
    } else {
      setOrders([]);
      setTotals(EMPTY_TOTALS);
      setNextNumber(1);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openSession = useCallback(async () => {
    await repository.openSession("");
    await refresh();
  }, [refresh]);

  const closeSession = useCallback(async () => {
    if (!session) return;
    await repository.closeSession(session.id);
    await refresh();
  }, [session, refresh]);

  const saveProduct = useCallback(
    async (product: Product) => {
      await repository.saveProduct(product);
      await refresh();
    },
    [refresh],
  );

  const saveSettings = useCallback(
    async (next: AppSettings) => {
      await repository.saveSettings(next);
      setSettings(next);
    },
    [],
  );

  const printOrder = useCallback(
    async (orderId: string, reprintFlag: boolean) => {
      const width = settings?.ticketWidthMm ?? 58;
      const sessions = await repository.listSessions();
      let order: Order | undefined;
      for (const candidate of sessions) {
        const candidateOrders = await repository.listOrders(candidate.id);
        order = candidateOrders.find((item) => item.id === orderId);
        if (order) break;
      }
      if (!order) return false;
      const items = await repository.listOrderItems(orderId);
      const ticket = buildKitchenTicket(order, items, width, reprintFlag);
      const result = await previewPrinter.print(ticket);
      await repository.markPrinted(orderId, result.ok);
      return result.ok;
    },
    [settings],
  );

  const confirmSale = useCallback(
    async (lines: CartLine[], customerName: string | null, paymentMethod: PaymentMethod) => {
      // 1) Persistencia primero: la base de datos es la fuente de verdad.
      const { order, items } = await repository.confirmSale({ lines, customerName, paymentMethod });
      // 2) Recién con la venta confirmada se intenta imprimir.
      const ticket = buildKitchenTicket(order, items, settings?.ticketWidthMm ?? 58, false);
      const result = await previewPrinter.print(ticket);
      await repository.markPrinted(order.id, result.ok);
      await refresh();
      return { order, printed: result.ok };
    },
    [settings, refresh],
  );

  const reprint = useCallback(
    async (orderId: string) => {
      const ok = await printOrder(orderId, true);
      await refresh();
      return ok;
    },
    [printOrder, refresh],
  );

  const voidOrder = useCallback(
    async (orderId: string) => {
      await repository.voidOrder(orderId, null);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<AppState>(
    () => ({
      ready,
      session,
      products,
      settings,
      orders,
      totals,
      nextNumber,
      lastTicket,
      refresh,
      openSession,
      closeSession,
      saveProduct,
      saveSettings,
      confirmSale,
      reprint,
      voidOrder,
      setLastTicket,
    }),
    [
      ready,
      session,
      products,
      settings,
      orders,
      totals,
      nextNumber,
      lastTicket,
      refresh,
      openSession,
      closeSession,
      saveProduct,
      saveSettings,
      confirmSale,
      reprint,
      voidOrder,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
