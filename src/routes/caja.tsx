import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ban, ChevronDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/app/store";
import { formatMoney } from "@/domain/money";
import type { Order, OrderItem } from "@/domain/types";
import { repository } from "@/persistence/indexeddb-repository";
import { PinGate } from "@/components/PinGate";
import { TicketPreview } from "@/components/TicketPreview";

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
  return new Date(ts).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
}

function OrderRow({ order }: { order: Order }) {
  const { reprint, voidOrder, lastTicket } = useApp();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (open) void repository.listOrderItems(order.id).then(setItems);
  }, [open, order.id]);

  const anulada = order.status === "anulada";

  return (
    <div className={`rounded-xl border bg-card ${anulada ? "border-destructive/40 opacity-70" : "border-border"}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
        <span className="text-2xl font-black">#{String(order.number).padStart(3, "0")}</span>
        <span className="min-w-0 flex-1 truncate font-bold">{order.customerName ?? "—"}</span>
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
  const { session, orders, totals, closeSession, openSession, ready } = useApp();

  if (!ready) return <div className="p-8 text-muted-foreground">Cargando…</div>;

  if (!session)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-bold">No hay una jornada abierta.</p>
        <button
          onClick={() => void openSession()}
          className="rounded-xl bg-primary px-6 py-3 font-black text-primary-foreground"
        >
          ABRIR JORNADA
        </button>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">CAJA · JORNADA {session.label}</h1>
        <button
          onClick={async () => {
            if (!confirm("¿Cerrar la jornada? Se conservan todas las ventas y la próxima empieza en #001.")) return;
            await closeSession();
            toast.success("Jornada cerrada");
          }}
          className="rounded-lg border border-destructive px-4 py-2 font-bold text-destructive"
        >
          CERRAR JORNADA
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["EFECTIVO", formatMoney(totals.efectivo)],
          ["DÉBITO", formatMoney(totals.debito)],
          ["TOTAL", formatMoney(totals.total)],
          ["PEDIDOS", String(totals.orders)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs font-black text-muted-foreground">{label}</div>
            <div className="text-2xl font-black">{value}</div>
          </div>
        ))}
      </div>
      {totals.anuladas > 0 && (
        <p className="text-sm text-muted-foreground">
          {totals.anuladas} pedido(s) anulado(s) — excluidos de los totales, conservados en el historial.
        </p>
      )}

      <div className="space-y-2">
        {orders.length === 0 && <p className="py-8 text-center text-muted-foreground">Aún no hay ventas.</p>}
        {orders.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}
