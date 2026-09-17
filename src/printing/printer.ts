import type { Ticket } from "@/domain/ticket";

export interface PrintResult {
  ok: boolean;
  error?: string;
}

// Contrato de impresión. En Electron se sustituye por un driver ESC/POS
// sin tocar la lógica de ventas.
export interface Printer {
  readonly name: string;
  print(ticket: Ticket): Promise<PrintResult>;
}

type Listener = (ticket: Ticket) => void;

// Impresora simulada de la fase Lovable: entrega el ticket a la vista previa.
export class PreviewPrinter implements Printer {
  readonly name = "Vista previa (simulada)";
  private listeners = new Set<Listener>();

  onTicket(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async print(ticket: Ticket): Promise<PrintResult> {
    if (this.listeners.size === 0) {
      return { ok: false, error: "No hay dispositivo de impresión disponible" };
    }
    for (const l of this.listeners) l(ticket);
    return { ok: true };
  }
}

export const previewPrinter = new PreviewPrinter();
