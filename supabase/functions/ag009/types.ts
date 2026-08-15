// Types for AG-009 core workflow
export interface OT {
  id: string;
  machineId: string;
  type: "preventivo" | "predictivo" | "autonomo";
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  updatedAt?: string;
}

export interface Formulario {
  id: string;
  otId: string;
  data: Record<string, unknown>;
  submittedAt?: string;
}

export interface Calendario {
  date: string; // ISO date string
  events: Array<{ id: string; description: string }>;
}

export interface IncomingEvent {
  source: "AG-002" | "AG-003" | "AG-004";
  payload: unknown;
}
