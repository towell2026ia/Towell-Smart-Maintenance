// supabase/functions/agents-orchestrator/agents/ag006/renderer/html-sanitizer.ts
// HTML & Content Sanitizer for AG-006.3 (XSS & Injection Protection)

/**
 * Escapes HTML entity characters in raw strings to prevent XSS and HTML injection.
 * Treats all untrusted cell text, labels, help text, and options as inert plain text.
 */
export function sanitizeHtmlText(input: any): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes object values recursively (labels, help text, option text)
 */
export function sanitizeObjectContent<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeHtmlText(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectContent(item)) as unknown as T;
  }
  if (typeof obj === 'object' && obj !== null) {
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      res[key] = sanitizeObjectContent(val);
    }
    return res as T;
  }
  return obj;
}
