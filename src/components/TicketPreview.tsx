import { charsForWidth, type Ticket } from "@/domain/ticket";
import { cn } from "@/lib/utils";

export function TicketPreview({ ticket, className }: { ticket: Ticket; className?: string }) {
  const chars = charsForWidth(ticket.widthMm);
  return (
    <div
      className={cn(
        "mx-auto bg-white text-black font-mono shadow-lg border border-border px-3 py-4",
        className,
      )}
      style={{ width: ticket.widthMm === 58 ? "224px" : "300px" }}
      aria-label={`Vista previa de comanda ${ticket.widthMm} mm`}
    >
      {ticket.lines.map((line, i) => {
        const base = "whitespace-pre leading-tight";
        if (line.style === "huge")
          return (
            <div key={i} className={cn(base, "text-center text-3xl font-black tracking-tight py-1")}>
              {line.text}
            </div>
          );
        if (line.style === "big")
          return (
            <div key={i} className={cn(base, "text-center text-xl font-bold")}>
              {line.text}
            </div>
          );
        if (line.style === "center")
          return (
            <div key={i} className={cn(base, "text-center text-sm font-bold")}>
              {line.text}
            </div>
          );
        if (line.style === "bold")
          return (
            <div key={i} className={cn(base, "text-base font-bold")}>
              {line.text}
            </div>
          );
        if (line.style === "separator")
          return (
            <div key={i} className={cn(base, "text-[10px] text-neutral-500 overflow-hidden")}>
              {line.text}
            </div>
          );
        return (
          <div key={i} className={cn(base, "text-sm")}>
            {line.text || "\u00a0"}
          </div>
        );
      })}
      <div className="mt-3 text-center text-[10px] text-neutral-400">
        {ticket.widthMm} mm · {chars} caracteres · simulación
      </div>
    </div>
  );
}
