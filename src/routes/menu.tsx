import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/app/store";
import { CATEGORIES, type CategoryId, type Product } from "@/domain/types";
import { formatMoney, moneyToInput, parseMoneyInput } from "@/domain/money";
import { PinGate } from "@/components/PinGate";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menú — FOGA Eventos" },
      { name: "description", content: "Editá productos, precios, categorías y disponibilidad del menú." },
      { property: "og:title", content: "Menú — FOGA Eventos" },
      { property: "og:description", content: "Gestión del menú de venta para eventos." },
    ],
  }),
  component: () => (
    <PinGate title="Menú">
      <MenuPage />
    </PinGate>
  ),
});

function MenuPage() {
  const { products, saveProduct } = useApp();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<CategoryId>("comidas");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<CategoryId>("comidas");

  async function addProduct() {
    const cents = parseMoneyInput(price);
    if (!name.trim() || cents === null) {
      toast.error("Completá nombre y precio válidos");
      return;
    }
    const now = Date.now();
    await saveProduct({
      id: crypto.randomUUID(),
      name: name.trim(),
      price: cents,
      categoryId,
      active: true,
      sortOrder: products.length,
      createdAt: now,
      updatedAt: now,
    });
    setName("");
    setPrice("");
    toast.success("Producto agregado");
  }

  async function update(p: Product, patch: Partial<Product>) {
    await saveProduct({ ...p, ...patch, updatedAt: Date.now() });
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(moneyToInput(p.price));
    setEditCategoryId(p.categoryId);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(p: Product) {
    const cents = parseMoneyInput(editPrice);
    if (!editName.trim() || cents === null) {
      toast.error("Completá nombre y precio válidos");
      return;
    }
    await update(p, { name: editName.trim(), price: cents, categoryId: editCategoryId });
    setEditingId(null);
    toast.success("Producto actualizado");
  }

  async function move(p: Product, dir: -1 | 1) {
    const sorted = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
    const i = sorted.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const other = sorted[j]!;
    await saveProduct({ ...p, sortOrder: other.sortOrder, updatedAt: Date.now() });
    await saveProduct({ ...other, sortOrder: p.sortOrder, updatedAt: Date.now() });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-2xl font-black">MENÚ</h1>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del producto"
          className="h-12 min-w-[180px] flex-1 rounded-lg border border-input bg-background px-3"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Precio (ej: 250)"
          className="h-12 w-36 rounded-lg border border-input bg-background px-3"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value as CategoryId)}
          className="h-12 rounded-lg border border-input bg-background px-3"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => void addProduct()}
          className="flex h-12 items-center gap-2 rounded-lg bg-primary px-5 font-black text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> AGREGAR
        </button>
      </div>

      <div className="space-y-2">
        {[...products]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((p) =>
            editingId === p.id ? (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-primary bg-card p-3"
              >
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-11 min-w-[160px] flex-1 rounded-lg border border-input bg-background px-3 font-bold"
                  aria-label="Nombre del producto"
                />
                <input
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="h-11 w-36 rounded-lg border border-input bg-background px-3 text-right"
                  aria-label="Precio del producto"
                />
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value as CategoryId)}
                  className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
                  aria-label="Categoría"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => void saveEdit(p)}
                  className="h-11 rounded-lg bg-primary px-4 font-black text-primary-foreground"
                >
                  GUARDAR
                </button>
                <button
                  onClick={cancelEdit}
                  className="h-11 rounded-lg border border-border px-4 font-bold text-muted-foreground"
                >
                  CANCELAR
                </button>
              </div>
            ) : (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <span className="min-w-[160px] flex-1 truncate font-bold">{p.name}</span>
                <span className="w-28 text-right font-black text-primary">{formatMoney(p.price)}</span>
                <span className="w-24 text-sm font-bold text-muted-foreground">
                  {CATEGORIES.find((c) => c.id === p.categoryId)?.name}
                </span>
                <button
                  onClick={() => void update(p, { active: !p.active })}
                  aria-label={p.active ? "Desactivar producto" : "Activar producto"}
                  className="flex items-center gap-2 rounded-lg px-2 py-1"
                >
                  <span
                    className={
                      "relative inline-block h-6 w-11 rounded-full transition-colors " +
                      (p.active ? "bg-emerald-500" : "bg-muted-foreground/40")
                    }
                  >
                    <span
                      className={
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
                        (p.active ? "left-[22px]" : "left-0.5")
                      }
                    />
                  </span>
                  <span
                    className={
                      "text-sm font-black " + (p.active ? "text-emerald-700" : "text-muted-foreground")
                    }
                  >
                    {p.active ? "ACTIVO" : "INACTIVO"}
                  </span>
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="flex h-11 items-center gap-2 rounded-lg border border-primary/40 px-4 text-sm font-bold text-primary"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </button>
                <button
                  onClick={() => void move(p, -1)}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-border"
                  aria-label="Subir"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void move(p, 1)}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-border"
                  aria-label="Bajar"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            ),
          )}
      </div>
      <p className="text-sm text-muted-foreground">
        Los cambios de nombre o precio no modifican ventas ya registradas: cada pedido guarda su propia copia.
      </p>
    </div>
  );
}
