// Core deterministic orchestrator for AG-009
import { IncomingEvent, OT, Formulario, Calendario } from "./types.ts";

// In‑memory store (placeholder – in production use Supabase tables)
const otStore: Record<string, OT> = {};

/**
 * Handles an incoming event from upstream agents (AG‑002/003/004).
 * Creates or updates an OT according to the event source.
 */
export function handleEvent(event: IncomingEvent): OT {
  const now = new Date().toISOString();
  const id = `ot_${Date.now()}`;
  let type: OT["type"];
  switch (event.source) {
    case "AG-002":
      type = "preventivo";
      break;
    case "AG-003":
      type = "predictivo";
      break;
    case "AG-004":
      type = "autonomo";
      break;
    default:
      throw new Error(`Unsupported source ${event.source}`);
  }
  const ot: OT = {
    id,
    machineId: "unknown", // to be filled later by downstream steps
    type,
    status: "pending",
    createdAt: now,
  };
  otStore[id] = ot;
  return ot;
}

/** Example helper – in a real system this would push the OT to a DB */
export function getOt(id: string): OT | undefined {
  return otStore[id];
}
