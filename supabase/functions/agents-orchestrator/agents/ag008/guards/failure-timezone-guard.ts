// supabase/functions/agents-orchestrator/agents/ag008/guards/failure-timezone-guard.ts
// Timezone and Canonical Date Guard for AG-008 (v1.0)
// Target: America/Mexico_City (-06:00)

export function normalizeToPlantISOTimestamp(dateInput: string | Date | number | null | undefined): string | null {
  if (!dateInput) return null;

  try {
    let d: Date;
    if (typeof dateInput === 'number') {
      // Excel serial date number
      d = new Date(Math.round((dateInput - 25569) * 86400 * 1000));
    } else if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (!trimmed) return null;
      d = new Date(trimmed);
    } else if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      return null;
    }

    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}
