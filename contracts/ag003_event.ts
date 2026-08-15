// Contract for events emitted by AG-003 (Predictivo Mensual)
export interface AG003Event {
  otId: string;
  machineId: string;
  predictedIssues: string[];
  details: Record<string, unknown>;
}
