import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/app/store";
import { CATEGORIES, type CartLine, type PaymentMethod } from "@/domain/types";
import { formatMoney } from "@/domain/money";
import { TicketPreview } from "@/components/TicketPreview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Venta — FOGA Eventos" },
      { name: "description", content: "Caja rápida: cobrar pedidos e imprimir comandas en segundos." },
      { property: "og:title", content: "Venta — FOGA Eventos" },
      { property: "og:description", content: "Caja rápida para eventos gastronómicos." },
    ],
  }),
  component: VentaPage,
});

function VentaPage() {
  const {
    ready,
    session,
    products,
    nextNumber,
    lastTicket,
    setLastTicket,
    openSession,
    confirmSale,
    reprint,
  } = useApp();
  const [category, setCategory] = useState<string>("todos");
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ id: string; number: number } | null>(null);

  const visible = useMemo(
    () =>
      products.filter((p) => p.active && (category === "todos" || p.categoryId === category)),
    [products, category],
  );
  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  function addProduct(id: string, name: string, unitPrice: number) {
    setLines((prev) => {
      const found = prev.find((l) => l.productId === id);
      if (found)
        return prev.map((l) => (l.productId === id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { productId: id, name, unitPrice, quantity: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.productId === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  async function cobrar(method: PaymentMethod) {
    if (busy || lines.length === 0) return;
    setBusy(true); // bloquea ambos botones: evita doble clic
    try {
      const { order, printed } = await confirmSale(lines, customer || null, method);
      if (printed) {
        toast.success(`Pedido #${String(order.number).padStart(3, "0")} cobrado e impreso`);
        setPending(null);
      } else {
        toast.warning(`Pedido #${String(order.number).padStart(3, "0")} guardado · pendiente de imprimir`);
        setPending({ id: order.id, number: order.number });
      }
      setLines([]);
      setCustomer("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la venta");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="p-8 text-muted-foreground">Cargando…</div>;

  if (!session)
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-black">No hay una jornada abierta</h1>
        <p className="text-muted-foreground">Abrí una jornada para empezar a vender. La numeración comienza en #001.</p>
        <button
          onClick={() => void openSession()}
          className="rounded-xl bg-primary px-8 py-4 text-xl font-black text-primary-foreground hover:bg-primary/90"
        >
          ABRIR JORNADA
        </button>
      </div>
    );

  return (
    <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-primary/10 px-4 py-2">
            <span className="text-xs font-bold text-muted-foreground">PRÓXIMO PEDIDO</span>
            <div className="text-3xl font-black leading-none text-primary">
              #{String(nextNumber).padStart(3, "0")}
            </div>
          </div>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Nombre del cliente (opcional)"
            className="h-14 min-w-[220px] flex-1 rounded-xl border border-input bg-card px-4 text-lg"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[{ id: "todos", name: "TODOS" }, ...CATEGORIES].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-bold transition-colors",
                category === c.id
                  ? "bg-foreground text-background"
                  : "bg-card border border-border hover:bg-accent",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => addProduct(p.id, p.name, p.price)}
              className="flex min-h-[96px] flex-col justify-between rounded-xl border-2 border-border bg-card p-3 text-left transition-colors hover:border-primary active:scale-[0.98]"
            >
              <span className="text-lg font-bold leading-tight">{p.name}</span>
              <span className="text-xl font-black text-primary">{formatMoney(p.price)}</span>
            </button>
          ))}
          {visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-muted-foreground">
              No hay productos activos en esta categoría.
            </p>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-3">
        <div className="flex min-h-[220px] flex-1 flex-col rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-black tracking-wide text-muted-foreground">PEDIDO ACTUAL</h2>
            {lines.length > 0 && (
              <button
                onClick={() => setLines([])}
                className="flex items-center gap-1 text-xs font-bold text-destructive"
              >
                <X className="h-3 w-3" /> VACIAR
              </button>
            )}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {lines.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Tocá un producto para agregarlo.</p>
            )}
            {lines.map((l) => (
            <div key={l.productId} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 break-words text-sm font-bold leading-snug">
                  {l.name}
                </div>
                <div className="text-xs text-muted-foreground">{formatMoney(l.unitPrice)} c/u</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => changeQty(l.productId, -1)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background"
                  aria-label={`Quitar uno de ${l.name}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-lg font-black">{l.quantity}</span>
                <button
                  onClick={() => changeQty(l.productId, 1)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background"
                  aria-label={`Agregar uno de ${l.name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="w-24 shrink-0 text-right font-bold tabular-nums">
                {formatMoney(l.unitPrice * l.quantity)}
              </span>
              <button
                onClick={() => setLines((prev) => prev.filter((x) => x.productId !== l.productId))}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-destructive"
                aria-label={`Eliminar ${l.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            ))}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm font-black text-muted-foreground">TOTAL</span>
            <span className="text-4xl font-black">{formatMoney(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={busy || lines.length === 0}
            onClick={() => void cobrar("efectivo")}
            className="h-20 rounded-xl bg-primary text-2xl font-black text-primary-foreground disabled:opacity-40"
          >
            EFECTIVO
          </button>
          <button
            disabled={busy || lines.length === 0}
            onClick={() => void cobrar("debito")}
            className="h-20 rounded-xl bg-foreground text-2xl font-black text-background disabled:opacity-40"
          >
            DÉBITO
          </button>
        </div>

        {pending && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <span className="text-sm font-bold text-amber-700">
              Pedido #{String(pending.number).padStart(3, "0")} pendiente de imprimir
            </span>
            <button
              onClick={async () => {
                const ok = await reprint(pending.id);
                if (ok) {
                  setPending(null);
                  toast.success("Comanda impresa");
                } else toast.error("Sigue sin poder imprimirse");
              }}
              className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white"
            >
              <Printer className="h-4 w-4" /> REINTENTAR
            </button>
          </div>
        )}

        {lastTicket && (
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black text-muted-foreground">ÚLTIMA COMANDA (SIMULADA)</span>
              <button onClick={() => setLastTicket(null)} className="text-xs font-bold text-muted-foreground">
                CERRAR
              </button>
            </div>
            <TicketPreview ticket={lastTicket} />
          </div>
        )}
      </aside>
    </div>
  );
}
