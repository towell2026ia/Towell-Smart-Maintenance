// supabase/functions/agents-orchestrator/agents/ag005/ag005-executor.ts
// AG-005 Auditor de Bases v1.0 — Specialist Agent Engine

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AG005AuditResult, AG005Finding, AG005Summary, NormalizationRecord } from './types/ag005.types.ts';
import { loadSchema, identifySchema } from './schema-registry.ts';
import { NORMALIZER_VERSION, normalizeMachineCode } from './normalizer/normalizer.ts';
import { validateStructure } from './validators/structure-validator.ts';
import { validateRowData } from './validators/data-validator.ts';
import { validateMachineCatalog, validateDepartmentCatalog } from './validators/catalog-validator.ts';
import { validateCalculatedFields } from './validators/calculation-validator.ts';
import { validateSecurityPayload } from './validators/security-validator.ts';
import { checkFileAlreadyProcessed, checkRowDuplicates, computeSha256Hex } from './dedup/duplicate-engine.ts';

export const AGENT_VERSION = '1.0';
export const VALIDATOR_VERSION = 'DATA-VAL-001';

export async function executeAG005Audit(
  supabase: SupabaseClient | null,
  payload: Record<string, any>,
  correlationId: string
): Promise<AG005AuditResult> {
  const allFindings: AG005Finding[] = [];
  const allTransformations: NormalizationRecord[] = [];

  // 1. Security & Payload Validation
  const secCheck = validateSecurityPayload(payload);
  if (!secCheck.isValid) {
    return {
      status: 'INVALID_PAYLOAD',
      agent_id: 'AG-005',
      correlation_id: correlationId,
      source_type: 'UNKNOWN',
      schema_id: 'UNKNOWN',
      schema_version: '1.0',
      summary: { rows_received: 0, correct: 0, warnings: 0, rejected: 0, duplicates: 0, pending: 0 },
      can_promote: false,
      requires_human_review: true,
      findings: secCheck.findings,
      agent_version: AGENT_VERSION,
      validator_version: VALIDATOR_VERSION,
      normalizer_version: NORMALIZER_VERSION
    };
  }

  const cleanedPayload = secCheck.cleanedPayload;
  const fileName = cleanedPayload.nombre_archivo || cleanedPayload.file_name || 'batch_file.xlsx';
  const declaredSchemaId = cleanedPayload.schema_id || cleanedPayload.source_type;
  const rows: Record<string, any>[] = Array.isArray(cleanedPayload.rows) ? cleanedPayload.rows : [];
  const rawHeaders: string[] = Array.isArray(cleanedPayload.headers)
    ? cleanedPayload.headers
    : (rows.length > 0 ? Object.keys(rows[0]) : []);

  // 2. Identify / Load Schema
  let schema = declaredSchemaId ? loadSchema(declaredSchemaId) : null;
  if (!schema && rawHeaders.length > 0) {
    schema = identifySchema(rawHeaders, declaredSchemaId);
  }

  if (!schema) {
    allFindings.push({
      row: 0,
      field: 'headers',
      severity: 'CRITICAL',
      code: 'UNKNOWN_SCHEMA',
      original_value: rawHeaders,
      message: `El archivo '${fileName}' no coincide con ninguna estructura de schema conocida del registro.`
    });

    return {
      status: 'UNKNOWN_SCHEMA',
      agent_id: 'AG-005',
      correlation_id: correlationId,
      source_type: 'UNKNOWN',
      schema_id: 'UNKNOWN',
      schema_version: '1.0',
      file: { name: fileName },
      summary: { rows_received: rows.length, correct: 0, warnings: 0, rejected: rows.length, duplicates: 0, pending: rows.length },
      can_promote: false,
      requires_human_review: true,
      findings: allFindings,
      agent_version: AGENT_VERSION,
      validator_version: VALIDATOR_VERSION,
      normalizer_version: NORMALIZER_VERSION
    };
  }

  // 3. File Idempotency / Hash Check
  const fileContentStr = cleanedPayload.file_content_hash || JSON.stringify(rows);
  const fileHash = await computeSha256Hex(fileContentStr);
  const fileIdemCheck = await checkFileAlreadyProcessed(fileHash, supabase);

  if (fileIdemCheck.isDuplicate) {
    allFindings.push({
      row: 0,
      field: 'file_hash',
      severity: 'WARNING',
      code: 'FILE_ALREADY_PROCESSED',
      original_value: fileHash,
      message: `El archivo '${fileName}' ya fue procesado anteriormente con éxito.`
    });
  }

  // 4. Validate Structure
  const structCheck = validateStructure(rawHeaders, schema);
  allFindings.push(...structCheck.findings);

  if (structCheck.status === 'STRUCTURE_INVALID') {
    return {
      status: 'VALIDATION_REJECTED',
      agent_id: 'AG-005',
      correlation_id: correlationId,
      source_type: schema.source,
      schema_id: schema.schema_id,
      schema_version: schema.version,
      file: { name: fileName, hash: fileHash },
      summary: { rows_received: rows.length, correct: 0, warnings: structCheck.findings.length, rejected: rows.length, duplicates: 0, pending: 0 },
      can_promote: false,
      requires_human_review: true,
      findings: allFindings,
      agent_version: AGENT_VERSION,
      validator_version: VALIDATOR_VERSION,
      normalizer_version: NORMALIZER_VERSION
    };
  }

  // 5. Deduplication Check (In-Memory Row Keys)
  const dedupCheck = checkRowDuplicates(rows, schema);
  allFindings.push(...dedupCheck.findings);

  // 6. Validate Data Rows & Catalogs
  let correctCount = 0;
  let warningCount = 0;
  let rejectedCount = 0;
  let duplicateCount = dedupCheck.duplicateIndices.size;
  let pendingCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const rawRow = rows[i];

    // Data Row Types Validation
    const dataVal = validateRowData(rawRow, rowNum, schema);
    allFindings.push(...dataVal.findings);

    // Catalog & Machine Check
    const machineCode = rawRow['maquina_id'] || rawRow['equipo_towell'] || rawRow['maquina'] || rawRow['localidad'];
    if (machineCode) {
      const normMach = normalizeMachineCode(machineCode);
      if (normMach.transformation) {
        allTransformations.push(normMach.transformation);
      }
      const catVal = await validateMachineCatalog(machineCode, rowNum, supabase);
      if (catVal.finding) {
        allFindings.push(catVal.finding);
      }
    }

    // Department Check
    const dept = rawRow['depto'] || rawRow['area'] || rawRow['departamento'];
    if (dept) {
      const deptVal = validateDepartmentCatalog(dept, rowNum);
      if (deptVal.finding) {
        allFindings.push(deptVal.finding);
      }
    }

    // Calculations Check
    const calcVal = validateCalculatedFields(rawRow, rowNum, schema);
    allFindings.push(...calcVal.findings);

    // Evaluate Row Status
    const rowFindings = allFindings.filter(f => f.row === rowNum);
    const hasError = rowFindings.some(f => f.severity === 'ERROR' || f.severity === 'CRITICAL');
    const hasWarning = rowFindings.some(f => f.severity === 'WARNING');

    if (hasError) {
      rejectedCount++;
    } else if (hasWarning) {
      warningCount++;
    } else {
      correctCount++;
    }
  }

  // 7. Calculate Deterministic Promotion & Status
  const criticalErrors = allFindings.filter(f => f.severity === 'CRITICAL' || f.severity === 'ERROR');
  const warningFindings = allFindings.filter(f => f.severity === 'WARNING');

  const canPromote = criticalErrors.length === 0 && !fileIdemCheck.isDuplicate;
  const requiresHumanReview = criticalErrors.length > 0 || warningFindings.length > 0 || fileIdemCheck.isDuplicate;

  let finalStatus: AG005AuditResult['status'] = 'VALIDATION_SUCCESS';
  if (criticalErrors.length > 0) {
    finalStatus = 'VALIDATION_REJECTED';
  } else if (warningFindings.length > 0 || fileIdemCheck.isDuplicate) {
    finalStatus = 'VALIDATION_WITH_WARNINGS';
  }

  const summary: AG005Summary = {
    rows_received: rows.length,
    correct: correctCount,
    warnings: warningCount,
    rejected: rejectedCount,
    duplicates: duplicateCount,
    pending: pendingCount
  };

  return {
    status: finalStatus,
    agent_id: 'AG-005',
    correlation_id: correlationId,
    source_type: schema.source,
    schema_id: schema.schema_id,
    schema_version: schema.version,
    file: { name: fileName, hash: fileHash },
    summary,
    can_promote: canPromote,
    requires_human_review: requiresHumanReview,
    findings: allFindings,
    transformations: allTransformations,
    agent_version: AGENT_VERSION,
    validator_version: VALIDATOR_VERSION,
    normalizer_version: NORMALIZER_VERSION
  };
}
