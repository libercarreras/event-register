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

import { getElectronDatabase } from "./electron-api";

function database() {
  const db = getElectronDatabase();

  if (!db) {
    throw new Error(
      "La API SQLite de FOGA no está disponible en este entorno."
    );
  }

  return db;
}

export class ElectronRepository implements Repository {
  async listProducts(): Promise<Product[]> {
    return database().listProducts();
  }

  async saveProduct(product: Product): Promise<void> {
    return database().saveProduct(product);
  }

  async getOpenSession(): Promise<Session | null> {
    return database().getOpenSession();
  }

  async listSessions(): Promise<Session[]> {
    return database().listSessions();
  }

  async openSession(label: string): Promise<Session> {
    return database().openSession(label);
  }

  async closeSession(sessionId: string): Promise<Session> {
    return database().closeSession(sessionId);
  }

  async nextOrderNumber(sessionId: string): Promise<number> {
    return database().nextOrderNumber(sessionId);
  }

  async confirmSale(
    input: ConfirmSaleInput
  ): Promise<ConfirmedSale> {
    return database().confirmSale(input);
  }

  async listOrders(sessionId: string): Promise<Order[]> {
    return database().listOrders(sessionId);
  }

  async listOrderItems(
    orderId: string
  ): Promise<OrderItem[]> {
    return database().listOrderItems(orderId);
  }

  async markPrinted(
    orderId: string,
    ok: boolean
  ): Promise<Order> {
    return database().markPrinted(orderId, ok);
  }

  async voidOrder(
    orderId: string,
    reason: string | null
  ): Promise<Order> {
    return database().voidOrder(orderId, reason);
  }

  async sessionTotals(
    sessionId: string
  ): Promise<SessionTotals> {
    return database().sessionTotals(sessionId);
  }

  async getSettings(): Promise<AppSettings> {
    return database().getSettings();
  }

  async saveSettings(
    settings: AppSettings
  ): Promise<void> {
    return database().saveSettings(settings);
  }

  async exportBackup(): Promise<BackupFile> {
    return database().exportBackup();
  }

  async importBackup(
    backup: BackupFile
  ): Promise<void> {
    return database().importBackup(backup);
  }
}