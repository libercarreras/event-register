import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Ban, ChevronDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/app/store";
import { formatMoney } from "@/domain/money";
import type { Order, OrderItem, Session, SessionTotals } from "@/domain/types";
import { repository } from "@/persistence/indexeddb-repository";
import { PinGate } from "@/components/PinGate";
import { TicketPreview } from "@/components/TicketPreview";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/caja")({
  head: () => ({
    meta: [
      { title: "Caja e historial — FOGA Eventos" },
      { name: "description", content: "Totales de la jornada, historial de pedidos, reimpresión y anulaciones." },
      { property: "og:title", content: "Caja e historial — FOGA Eventos" },
      { property: "og:description", content: "Control de caja por jornada en eventos gastronómicos." },
    ],
  }),
  component: () => (
    <PinGate title="Caja">
      <CajaPage />
    </PinGate>
  ),
});

function hora(ts: number) {
  return new Date(ts).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

const EMPTY_TOTALS: SessionTotals = { efectivo: 0, debito: 0, total: 0, orders: 0, anuladas: 0 };

function OrderRow({ order }: { order: Order }) {
  const { reprint, voidOrder, lastTicket } = useApp();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (open) void repository.listOrderItems(order.id).then(setItems);
  }, [open, order.id]);

  const anulada = order.status === "anulada";

  return (
    <div className={`rounded-xl border ${anulada ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
        <span className="min-w-0 flex-1 truncate text-2xl font-black">
          #{String(order.number).padStart(3, "0")}
          {order.customerName ? <span className="font-bold"> — {order.customerName}</span> : null}
        </span>
        <span className="text-sm text-muted-foreground">{hora(order.createdAt)}</span>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold uppercase">{order.paymentMethod}</span>
        <span
          className={
            order.printed
              ? "rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-700"
              : "rounded-md bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-700"
          }
        >
          {order.printed ? `IMPRESA ×${order.printCount}` : "PENDIENTE"}
        </span>
        {anulada && (
          <span className="rounded-md bg-destructive/15 px-2 py-1 text-xs font-bold text-destructive">ANULADA</span>
        )}
        <span className="w-24 text-right text-xl font-black">{formatMoney(order.total)}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-3">
          {anulada && order.voidReason && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              Motivo de anulación: {order.voidReason}
            </p>
          )}
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between text-sm">
                <span>
                  {i.quantity} × {i.nameSnapshot}
                </span>
                <span>{formatMoney(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={async () => {
                const ok = await reprint(order.id);
                toast[ok ? "success" : "error"](ok ? "Comanda reimpresa" : "No se pudo imprimir");
              }}
              className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background"
            >
              <Printer className="h-4 w-4" /> REIMPRIMIR
            </button>
            {!anulada && (
              <button
                onClick={async () => {
                  if (!confirm(`¿Anular el pedido #${order.number}? El registro se conserva.`)) return;
                  await voidOrder(order.id);
                  toast.success("Pedido anulado");
                }}
                className="flex items-center gap-2 rounded-lg border border-destructive px-4 py-2 text-sm font-bold text-destructive"
              >
                <Ban className="h-4 w-4" /> ANULAR
              </button>
            )}
          </div>
          {lastTicket && lastTicket.orderNumber === order.number && (
            <TicketPreview ticket={lastTicket} className="mt-3" />
          )}
        </div>
      )}
    </div>
  );
}

function CajaPage() {
  const { session, orders: currentOrders, totals: currentTotals, closeSession, openSession, ready } = useApp();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [historicalOrders, setHistoricalOrders] = useState<Order[]>([]);
  const [historicalTotals, setHistoricalTotals] = useState<SessionTotals>(EMPTY_TOTALS);

  useEffect(() => {
    let active = true;
    void repository.listSessions().then((allSessions) => {
      if (!active) return;
      setSessions(allSessions);
      setSelectedSessionId((selected) => {
        if (selected && allSessions.some((item) => item.id === selected)) return selected;
        return session?.id ?? allSessions[0]?.id ?? "";
      });
    });
    return () => {
      active = false;
    };
  }, [session, currentOrders, currentTotals]);

  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );
  const viewingCurrent = Boolean(session && selectedSessionId === session.id);

  useEffect(() => {
    if (!selectedSessionId || viewingCurrent) return;
    let active = true;
    void Promise.all([
      repository.listOrders(selectedSessionId),
      repository.sessionTotals(selectedSessionId),
    ]).then(([orderList, sessionTotals]) => {
      if (!active) return;
      setHistoricalOrders(orderList);
      setHistoricalTotals(sessionTotals);
    });
    return () => {
      active = false;
    };
  }, [selectedSessionId, viewingCurrent, currentOrders, currentTotals]);

  const displayedOrders = viewingCurrent ? currentOrders : historicalOrders;
  const displayedTotals = viewingCurrent ? currentTotals : historicalTotals;

  if (!ready) return <div className="p-8 text-muted-foreground">Cargando…</div>;

  if (!session && sessions.length === 0)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-bold">No hay una jornada abierta.</p>
        <Button onClick={() => void openSession()} size="lg" className="font-black">
          ABRIR JORNADA
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">CAJA · JORNADA {selectedSession?.label}</h1>
          {selectedSession && selectedSession.closedAt !== null && (
            <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-1 text-xs font-black text-muted-foreground">
              JORNADA CERRADA
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="w-56 bg-card font-semibold" aria-label="Seleccionar jornada">
              <SelectValue placeholder="Seleccionar jornada" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.closedAt === null ? `Jornada actual · ${item.label}` : item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!session && (
            <Button onClick={() => void openSession()} className="font-black">
              ABRIR JORNADA
            </Button>
          )}
          {viewingCurrent && selectedSession && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive font-bold text-destructive hover:text-destructive">
                  CERRAR JORNADA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>JORNADA {selectedSession.label}</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 pt-2 text-foreground">
                      <div className="flex justify-between"><span>Efectivo:</span><strong>{formatMoney(displayedTotals.efectivo)}</strong></div>
                      <div className="flex justify-between"><span>Débito:</span><strong>{formatMoney(displayedTotals.debito)}</strong></div>
                      <div className="flex justify-between border-t border-border pt-2"><span>Total:</span><strong>{formatMoney(displayedTotals.total)}</strong></div>
                      <div className="flex justify-between"><span>Pedidos válidos:</span><strong>{displayedTotals.orders}</strong></div>
                      <div className="flex justify-between"><span>Anulados:</span><strong>{displayedTotals.anuladas}</strong></div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await closeSession();
                      toast.success("Jornada cerrada");
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirmar cierre
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ["EFECTIVO", formatMoney(displayedTotals.efectivo)],
          ["DÉBITO", formatMoney(displayedTotals.debito)],
          ["TOTAL", formatMoney(displayedTotals.total)],
          ["PEDIDOS", String(displayedTotals.orders)],
          ["ANULADOS", String(displayedTotals.anuladas)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs font-black text-muted-foreground">{label}</div>
            <div className="text-2xl font-black">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {displayedOrders.length === 0 && <p className="py-8 text-center text-muted-foreground">Aún no hay ventas.</p>}
        {displayedOrders.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}
