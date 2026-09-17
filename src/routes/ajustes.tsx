import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/app/store";
import { PinGate } from "@/components/PinGate";
import { repository, validateBackup } from "@/persistence/indexeddb-repository";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — FOGA Eventos" },
      { name: "description", content: "PIN administrativo, ancho de comanda y respaldos locales." },
      { property: "og:title", content: "Ajustes — FOGA Eventos" },
      { property: "og:description", content: "Configuración local de la caja FOGA Eventos." },
    ],
  }),
  component: () => (
    <PinGate title="Ajustes">
      <AjustesPage />
    </PinGate>
  ),
});

function AjustesPage() {
  const { settings, saveSettings, refresh } = useApp();
  const [pin, setPin] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!settings) return <div className="p-8 text-muted-foreground">Cargando…</div>;

  async function exportar() {
    const backup = await repository.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foga-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Respaldo creado");
  }

  async function importar(file: File) {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!validateBackup(data)) {
        toast.error("El archivo no es un respaldo válido de FOGA Eventos");
        return;
      }
      if (!confirm("Restaurar reemplaza TODOS los datos actuales (menú, jornadas y ventas). ¿Continuar?")) return;
      await repository.importBackup(data);
      await refresh();
      toast.success("Respaldo restaurado");
    } catch {
      toast.error("No se pudo leer el archivo");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-black">AJUSTES</h1>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-black">PIN administrativo</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.pinEnabled}
            onChange={(e) =>
              void saveSettings({
                ...settings,
                pinEnabled: e.target.checked && !!settings.pinCode,
                ...(e.target.checked && !settings.pinCode ? {} : {}),
              }).then(() => {
                if (e.target.checked && !settings.pinCode) toast.error("Definí primero un PIN");
              })
            }
            className="h-5 w-5"
          />
          <span className="font-bold">Proteger Menú, Caja, anulaciones y Ajustes</span>
        </label>
        <div className="flex gap-2">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Nuevo PIN (4-6 dígitos)"
            className="h-12 flex-1 rounded-lg border border-input bg-background px-3"
          />
          <button
            onClick={() => {
              if (pin.length < 4) {
                toast.error("El PIN debe tener al menos 4 dígitos");
                return;
              }
              void saveSettings({ ...settings, pinCode: pin });
              setPin("");
              toast.success("PIN actualizado");
            }}
            className="rounded-lg bg-primary px-5 font-black text-primary-foreground"
          >
            GUARDAR PIN
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          La pantalla VENTA nunca pide PIN. {settings.pinCode ? "Hay un PIN definido." : "Todavía no hay PIN definido."}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-black">Impresión</h2>
        <div className="flex items-center gap-2">
          <span className="font-bold">Ancho de comanda</span>
          <select
            value={settings.ticketWidthMm}
            onChange={(e) =>
              void saveSettings({ ...settings, ticketWidthMm: Number(e.target.value) as 58 | 80 })
            }
            className="h-11 rounded-lg border border-input bg-background px-3"
          >
            <option value={58}>58 mm</option>
            <option value={80}>80 mm</option>
          </select>
        </div>
        <button
          disabled
          className="w-full cursor-not-allowed rounded-lg border border-dashed border-border px-4 py-3 text-sm font-bold text-muted-foreground"
        >
          Seleccionar impresora de Windows — Disponible en versión de escritorio
        </button>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-black">Respaldo</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void exportar()}
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-3 font-bold text-background"
          >
            <Download className="h-4 w-4" /> CREAR RESPALDO
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-destructive px-4 py-3 font-bold text-destructive"
          >
            <Upload className="h-4 w-4" /> RESTAURAR RESPALDO
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importar(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Respaldo temporal en JSON para la fase web. En la versión de escritorio se reemplaza por el respaldo de SQLite.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <h2 className="font-black text-foreground">Información</h2>
        <p>FOGA Eventos · Etapa 1 (web offline)</p>
        <p>Datos locales en este equipo · Impresión simulada</p>
      </section>
    </div>
  );
}
