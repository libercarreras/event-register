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
} from "./repository";

export interface ElectronDatabaseApi {
  ping(): Promise<{
    ok: boolean;
    schemaVersion: string | null;
  }>;

  inspect(): Promise<{
    ok: boolean;
    tables: string[];
  }>;

  listProducts(): Promise<Product[]>;

  saveProduct(product: Product): Promise<void>;

  getOpenSession(): Promise<Session | null>;

  listSessions(): Promise<Session[]>;

  openSession(label?: string): Promise<Session>;

  closeSession(sessionId: string): Promise<Session>;

  nextOrderNumber(sessionId: string): Promise<number>;

  confirmSale(
    input: ConfirmSaleInput
  ): Promise<ConfirmedSale>;

  listOrders(sessionId: string): Promise<Order[]>;

  listOrderItems(orderId: string): Promise<OrderItem[]>;

  markPrinted(
    orderId: string,
    ok: boolean
  ): Promise<Order>;

  voidOrder(
    orderId: string,
    reason: string | null
  ): Promise<Order>;

  sessionTotals(
    sessionId: string
  ): Promise<SessionTotals>;

  getSettings(): Promise<AppSettings>;

  saveSettings(
    settings: AppSettings
  ): Promise<void>;

  exportBackup(): Promise<BackupFile>;

  importBackup(
    backup: BackupFile
  ): Promise<void>;
}

export interface FogaElectronApi {
  database: ElectronDatabaseApi;
}

declare global {
  interface Window {
    foga?: FogaElectronApi;
  }
}

export function getElectronDatabase():
  | ElectronDatabaseApi
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.foga?.database ?? null;
}

export function isElectronDatabaseAvailable(): boolean {
  return getElectronDatabase() !== null;
}