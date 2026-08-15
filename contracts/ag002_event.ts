// Contract for events emitted by AG-002 (Preventivo Anual)
export interface AG002Event {
  otId: string;
  machineId: string;
  scheduledDate: string; // ISO date
  details: Record<string, unknown>;
}
