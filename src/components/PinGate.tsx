import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useApp } from "@/app/store";

// Protege pantallas sensibles cuando el PIN administrativo está activado.
export function PinGate({ children, title }: { children: ReactNode; title: string }) {
  const { settings } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  if (!settings?.pinEnabled || !settings.pinCode || unlocked) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <form
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (value === settings.pinCode) setUnlocked(true);
          else {
            setError(true);
            setValue("");
          }
        }}
      >
        <Lock className="mx-auto mb-3 h-8 w-8 text-primary" />
        <h2 className="text-lg font-bold">{title} protegido</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ingresá el PIN administrativo</p>
        <input
          autoFocus
          inputMode="numeric"
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          className="mt-4 w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-2xl tracking-[0.5em]"
        />
        {error && <p className="mt-2 text-sm text-destructive">PIN incorrecto</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground"
        >
          Desbloquear
        </button>
      </form>
    </div>
  );
}
