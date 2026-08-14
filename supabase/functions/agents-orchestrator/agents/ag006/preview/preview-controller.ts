// supabase/functions/agents-orchestrator/agents/ag006/preview/preview-controller.ts
// Preview Mode Controller for AG-006.3 (ZERO PRODUCT PERSISTENCE)

import type { FormDefinitionContract } from '../form-definition/form-definition.types.ts';
import type { RenderedForm } from '../renderer/renderer.types.ts';
import { renderFormDefinition } from '../renderer/form-renderer.ts';

export interface PreviewSessionResult {
  preview_mode: true;
  banner_html: string;
  rendered_form: RenderedForm;
  mock_context_data: Record<string, any>;
  persisted_to_production: false;
  requires_human_review: boolean;
}

export const PREVIEW_BANNER_TEXT = '⚠️ MODO PREVIEW / BORRADOR — ESTE FORMULARIO NO PERSISTE EN PRODUCCIÓN Y NO CREA ÓRDENES DE TRABAJO REALES.';

export function generatePreviewSession(
  contract: FormDefinitionContract,
  customMockValues: Record<string, any> = {}
): PreviewSessionResult {
  const mockContextData = {
    'field_folio_ot': 'OT-PREVIEW-9999',
    'field_tecnico': 'TECH-PREVIEW-001',
    'field_maquina': 'M-TELAR-01',
    ...customMockValues
  };

  const renderedForm = renderFormDefinition(contract, mockContextData);

  const bannerHtml = `<div class="alert alert-warning preview-banner" role="alert" style="background:#fff3cd; color:#856404; padding:12px 16px; border-radius:6px; border:1px solid #ffeeba; font-weight:bold; text-align:center; margin-bottom:16px;">${PREVIEW_BANNER_TEXT}</div>`;

  return {
    preview_mode: true,
    banner_html: bannerHtml,
    rendered_form: renderedForm,
    mock_context_data: mockContextData,
    persisted_to_production: false,
    requires_human_review: renderedForm.requires_human_review
  };
}
