import { Link } from "@tanstack/react-router";
import { ClipboardList, Settings, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { useApp } from "@/app/store";

const links = [
  { to: "/", label: "VENTA", icon: ShoppingCart },
  { to: "/menu", label: "MENÚ", icon: UtensilsCrossed },
  { to: "/caja", label: "CAJA", icon: ClipboardList },
  { to: "/ajustes", label: "AJUSTES", icon: Settings },
] as const;

export function AppNav() {
  const { session } = useApp();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="flex items-center gap-4 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary px-2 py-1 text-lg font-black leading-none text-primary-foreground">
            FOGA
          </span>
          <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">Eventos</span>
        </div>
        <nav className="flex flex-1 gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <span
          className={
            session
              ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600"
              : "rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive"
          }
        >
          {session ? `JORNADA ${session.label}` : "SIN JORNADA"}
        </span>
      </div>
    </header>
  );
}
