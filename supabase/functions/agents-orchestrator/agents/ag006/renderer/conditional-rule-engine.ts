// supabase/functions/agents-orchestrator/agents/ag006/renderer/conditional-rule-engine.ts
// Declarative Conditional Rule Evaluator for AG-006.3 (NO EVAL ALLOWED)

import type { ConditionalRule, ConditionalOperator } from '../form-definition/form-definition.types.ts';
import type { RuleEvaluationResult } from './renderer.types.ts';

const ALLOWED_OPERATORS: ConditionalOperator[] = [
  'EQUALS',
  'NOT_EQUALS',
  'GREATER_THAN',
  'LESS_THAN',
  'IN',
  'NOT_IN',
  'IS_EMPTY',
  'IS_NOT_EMPTY'
];

/**
 * Evaluates conditional visibility rules declaratively.
 * MUST NOT use eval(), new Function(), or execute arbitrary JS.
 */
export function evaluateConditionalRule(
  rule: ConditionalRule | undefined,
  currentFieldValues: Record<string, any>,
  allFieldCodes: Set<string>
): RuleEvaluationResult {
  // Default: visible if no rule defined
  if (!rule || !rule.when) {
    return { is_visible: true, is_valid_rule: true };
  }

  const { field, operator, value } = rule.when;

  // Rule Validation Check 1: Referenced field must exist in form definition
  if (!field || !allFieldCodes.has(field)) {
    return {
      is_visible: false,
      is_valid_rule: false,
      error_code: 'INVALID_CONDITIONAL_RULE',
      message: `La regla condicional hace referencia al campo inexistente '${field}'.`
    };
  }

  // Rule Validation Check 2: Operator must belong to closed allowlist
  if (!operator || !ALLOWED_OPERATORS.includes(operator)) {
    return {
      is_visible: false,
      is_valid_rule: false,
      error_code: 'INVALID_CONDITIONAL_RULE',
      message: `El operador condicional '${operator}' no es válido.`
    };
  }

  const actualValue = currentFieldValues[field];
  let conditionMet = false;

  switch (operator) {
    case 'EQUALS':
      conditionMet = String(actualValue ?? '').toLowerCase() === String(value ?? '').toLowerCase();
      break;

    case 'NOT_EQUALS':
      conditionMet = String(actualValue ?? '').toLowerCase() !== String(value ?? '').toLowerCase();
      break;

    case 'GREATER_THAN':
      conditionMet = Number(actualValue) > Number(value);
      break;

    case 'LESS_THAN':
      conditionMet = Number(actualValue) < Number(value);
      break;

    case 'IN':
      if (Array.isArray(value)) {
        conditionMet = value.some(v => String(v).toLowerCase() === String(actualValue ?? '').toLowerCase());
      } else if (typeof value === 'string') {
        conditionMet = value.split(',').map(v => v.trim().toLowerCase()).includes(String(actualValue ?? '').toLowerCase());
      }
      break;

    case 'NOT_IN':
      if (Array.isArray(value)) {
        conditionMet = !value.some(v => String(v).toLowerCase() === String(actualValue ?? '').toLowerCase());
      } else if (typeof value === 'string') {
        conditionMet = !value.split(',').map(v => v.trim().toLowerCase()).includes(String(actualValue ?? '').toLowerCase());
      }
      break;

    case 'IS_EMPTY':
      conditionMet = actualValue === undefined || actualValue === null || String(actualValue).trim() === '';
      break;

    case 'IS_NOT_EMPTY':
      conditionMet = actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== '';
      break;

    default:
      conditionMet = false;
  }

  // Action resolution
  const actionType = rule.action?.type || 'SHOW';
  const isVisible = actionType === 'SHOW' ? conditionMet : !conditionMet;

  return {
    is_visible: isVisible,
    is_valid_rule: true
  };
}
