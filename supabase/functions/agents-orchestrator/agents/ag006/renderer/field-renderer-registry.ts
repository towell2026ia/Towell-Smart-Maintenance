// supabase/functions/agents-orchestrator/agents/ag006/renderer/field-renderer-registry.ts
// Closed Field Renderer Registry for AG-006.3 (18 Authorized Types) v1.1

import type { FieldType, FormFieldDefinition } from '../form-definition/form-definition.types.ts';
import type { RenderedField } from './renderer.types.ts';
import { sanitizeHtmlText } from './html-sanitizer.ts';

export const ALLOWED_FIELD_TYPES: FieldType[] = [
  'TEXT',
  'TEXTAREA',
  'INTEGER',
  'DECIMAL',
  'DATE',
  'DATETIME',
  'BOOLEAN',
  'YES_NO',
  'SELECT',
  'MULTISELECT',
  'CHECKBOX',
  'RADIO',
  'PHOTO',
  'FILE',
  'SIGNATURE',
  'MACHINE_SELECTOR',
  'TECHNICIAN_SELECTOR',
  'READ_ONLY'
];

export function renderFieldByRegistry(
  fieldDef: FormFieldDefinition,
  isCellVisible: boolean = true
): RenderedField {
  const safeLabel = sanitizeHtmlText(fieldDef.label);
  const safeCode = sanitizeHtmlText(fieldDef.code);
  const safeHelp = sanitizeHtmlText(fieldDef.help_text || '');
  const type = fieldDef.field_type;

  // Unknown Type Check: Must NOT default silently to TEXT
  if (!ALLOWED_FIELD_TYPES.includes(type)) {
    return {
      code: safeCode,
      label: safeLabel,
      field_type: type,
      html_element: `<div class="unsupported-field-error">ERROR: Tipo de campo no soportado '${sanitizeHtmlText(type)}'</div>`,
      required: fieldDef.required,
      order: fieldDef.order,
      source: fieldDef.source || 'INPUT',
      persist_response: false,
      storage_type: 'RESPONSE',
      is_visible: true,
      unsupported_type_error: true
    };
  }

  let htmlElement = '';
  const reqAttr = fieldDef.required ? 'required' : '';

  switch (type) {
    case 'TEXT':
      htmlElement = `<input type="text" name="${safeCode}" class="form-control" placeholder="${sanitizeHtmlText(fieldDef.placeholder || '')}" ${reqAttr} />`;
      break;

    case 'TEXTAREA':
      htmlElement = `<textarea name="${safeCode}" class="form-control" rows="3" placeholder="${sanitizeHtmlText(fieldDef.placeholder || '')}" ${reqAttr}></textarea>`;
      break;

    case 'INTEGER':
      htmlElement = `<input type="number" step="1" name="${safeCode}" class="form-control" min="${fieldDef.min !== undefined ? fieldDef.min : ''}" max="${fieldDef.max !== undefined ? fieldDef.max : ''}" ${reqAttr} />`;
      break;

    case 'DECIMAL':
      htmlElement = `<input type="number" step="any" name="${safeCode}" class="form-control" min="${fieldDef.min !== undefined ? fieldDef.min : ''}" max="${fieldDef.max !== undefined ? fieldDef.max : ''}" ${reqAttr} />`;
      break;

    case 'DATE':
      htmlElement = `<input type="date" name="${safeCode}" class="form-control" ${reqAttr} />`;
      break;

    case 'DATETIME':
      // Closes REQUIRES_RENDERER_EXTENSION identified in AG-006.2
      htmlElement = `<input type="datetime-local" name="${safeCode}" class="form-control" ${reqAttr} />`;
      break;

    case 'BOOLEAN':
      htmlElement = `<div class="form-check"><input type="checkbox" name="${safeCode}" class="form-check-input" id="check_${safeCode}" /><label class="form-check-label" for="check_${safeCode}">${safeLabel}</label></div>`;
      break;

    case 'YES_NO': {
      // N/A is included ONLY if fieldDef.options explicitly defines it
      const opts = fieldDef.options && fieldDef.options.length > 0 ? fieldDef.options : ['Sí', 'No'];
      htmlElement = `<div class="yes-no-group">${opts.map(opt => `<label class="radio-inline"><input type="radio" name="${safeCode}" value="${sanitizeHtmlText(opt)}" ${reqAttr} /> ${sanitizeHtmlText(opt)}</label>`).join(' ')}</div>`;
      break;
    }

    case 'SELECT': {
      const opts = fieldDef.options || [];
      htmlElement = `<select name="${safeCode}" class="form-select" ${reqAttr}><option value="">-- Seleccionar --</option>${opts.map(opt => `<option value="${sanitizeHtmlText(opt)}">${sanitizeHtmlText(opt)}</option>`).join('')}</select>`;
      break;
    }

    case 'MULTISELECT': {
      const opts = fieldDef.options || [];
      htmlElement = `<select name="${safeCode}[]" class="form-select" multiple ${reqAttr}>${opts.map(opt => `<option value="${sanitizeHtmlText(opt)}">${sanitizeHtmlText(opt)}</option>`).join('')}</select>`;
      break;
    }

    case 'CHECKBOX': {
      const opts = fieldDef.options || [];
      if (opts.length > 0) {
        // Group Checkbox
        htmlElement = `<div class="checkbox-group">${opts.map((opt, idx) => `<div class="form-check"><input type="checkbox" name="${safeCode}[]" value="${sanitizeHtmlText(opt)}" class="form-check-input" id="chk_${safeCode}_${idx}" /><label class="form-check-label" for="chk_${safeCode}_${idx}">${sanitizeHtmlText(opt)}</label></div>`).join('')}</div>`;
      } else {
        // Single Boolean Checkbox
        htmlElement = `<div class="form-check"><input type="checkbox" name="${safeCode}" class="form-check-input" id="chk_${safeCode}" /><label class="form-check-label" for="chk_${safeCode}">${safeLabel}</label></div>`;
      }
      break;
    }

    case 'RADIO': {
      const opts = fieldDef.options || [];
      htmlElement = `<div class="radio-group">${opts.map((opt, idx) => `<div class="form-check"><input type="radio" name="${safeCode}" value="${sanitizeHtmlText(opt)}" class="form-check-input" id="rad_${safeCode}_${idx}" ${reqAttr} /><label class="form-check-label" for="rad_${safeCode}_${idx}">${sanitizeHtmlText(opt)}</label></div>`).join('')}</div>`;
      break;
    }

    case 'PHOTO':
      htmlElement = `<div class="photo-preview-widget"><input type="file" accept="image/*" name="${safeCode}" class="form-control" ${reqAttr} /><span class="badge bg-secondary">Evidencia Fotográfica</span></div>`;
      break;

    case 'FILE':
      htmlElement = `<div class="file-preview-widget"><input type="file" name="${safeCode}" class="form-control" ${reqAttr} /><span class="badge bg-secondary">Archivo Adjunto</span></div>`;
      break;

    case 'SIGNATURE':
      htmlElement = `<div class="signature-preview-widget" style="border:1px dashed #cbd5e1; padding:10px; border-radius:6px; text-align:center;"><span class="text-muted">Canvas de Firma Digital (Preview)</span><input type="hidden" name="${safeCode}" value="MOCK_SIGNATURE_DATA" /></div>`;
      break;

    case 'MACHINE_SELECTOR':
      htmlElement = `<select name="${safeCode}" class="form-select machine-selector" ${reqAttr}><option value="">-- Seleccionar Máquina --</option><option value="M-TELAR-01">Telar 01 (Producción)</option><option value="M-TELAR-02">Telar 02 (Producción)</option></select>`;
      break;

    case 'TECHNICIAN_SELECTOR':
      htmlElement = `<select name="${safeCode}" class="form-select technician-selector" ${reqAttr}><option value="">-- Seleccionar Técnico --</option><option value="TECH-001">Carlos Mendoza</option><option value="TECH-002">Juan Pérez</option></select>`;
      break;

    case 'READ_ONLY':
      // Rendered as contextual read-only field without relying on disabled for security or persistence.
      // Source of truth for persistence remains persist_response = false.
      htmlElement = `<input type="text" name="${safeCode}" class="form-control readonly-context" value="[DATO DE CONTEXTO]" readonly />`;
      break;
  }

  return {
    code: safeCode,
    label: safeLabel,
    field_type: type,
    html_element: htmlElement,
    required: fieldDef.required,
    order: fieldDef.order,
    source: fieldDef.source || 'INPUT',
    persist_response: fieldDef.persist_response !== undefined ? fieldDef.persist_response : true,
    storage_type: fieldDef.storage_type || 'RESPONSE',
    placeholder: fieldDef.placeholder,
    help_text: safeHelp,
    min_value: fieldDef.min,
    max_value: fieldDef.max,
    min_length: fieldDef.min_length,
    max_length: fieldDef.max_length,
    options: fieldDef.options?.map(o => ({ label: sanitizeHtmlText(o), value: sanitizeHtmlText(o) })),
    visibility_rule: fieldDef.visibility_rule,
    is_visible: isCellVisible,
    requires_renderer_extension: type === 'DATETIME'
  };
}
