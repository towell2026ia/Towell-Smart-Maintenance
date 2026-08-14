// supabase/functions/agents-orchestrator/agents/ag006/fixtures/generate_ag006_2_fixtures.js
// Generator for PRD-AG-006.2 Fixtures (12 Workbook Fixtures + 6 Contract Isolation JSON Fixtures) v1.2

const fs = require('fs');
const path = require('path');

const targetDir = __dirname;
const formDefDir = path.join(targetDir, 'form-definition');

if (!fs.existsSync(formDefDir)) {
  fs.mkdirSync(formDefDir, { recursive: true });
}

// 1. Workbook Fixtures (12 input files)
const workbookFixtures = {
  "ot_checklist_valid.xlsx.json": {
    form_name: "ot_checklist_valid.xlsx",
    form_family: "OT_CHECKLIST",
    sheets: [
      {
        name: "Checklist Preventivo",
        rows: [
          { "Campo": "Máquina", "Tipo": "SELECT" },
          { "Campo": "Revisar presión neumática", "Tipo": "YES_NO" },
          { "Campo": "Evidencia Fotográfica", "Tipo": "PHOTO" }
        ]
      }
    ]
  },
  "predictivo_valid.xlsx.json": {
    form_name: "predictivo_valid.xlsx",
    form_family: "LEVANTAMIENTO_PREDICTIVO",
    sheets: [
      {
        name: "Predictivo Telares",
        rows: [
          { "Bloque": "Electrónico", "Campo": "Sensores Alarma" },
          { "Bloque": "Mecánico", "Campo": "Holgura Rodamientos" },
          { "Bloque": "Limpieza", "Campo": "Zonas Críticas" },
          { "Bloque": "Lubricación", "Campo": "Nivel de Aceite" }
        ]
      }
    ]
  },
  "autonomo_valid.xlsx.json": {
    form_name: "autonomo_valid.xlsx",
    form_family: "LEVANTAMIENTO_AUTONOMO",
    sheets: [
      {
        name: "Autónomo Semanal",
        rows: [
          { "Bloque": "Vibración", "Campo": "Medición mm/s", "Valor": 2.4 },
          { "Bloque": "Limpieza", "Campo": "Estado Limpieza", "Tipo": "YES_NO" },
          { "Bloque": "Lubricación", "Campo": "Puntos de Grasa" },
          { "Bloque": "Temperatura", "Campo": "Temperatura °C", "Valor": 45.2 },
          { "Bloque": "Cableado", "Campo": "Conexiones Flojas" }
        ]
      }
    ]
  },
  "bitacora_levantamiento_valid.xlsx.json": {
    form_name: "bitacora_levantamiento_valid.xlsx",
    form_family: "BITACORA_LEVANTAMIENTO",
    sheets: [
      {
        name: "Bitácora Turno",
        rows: [
          { "Campo": "Fecha y Hora de Cierre", "Tipo": "DATETIME" },
          { "Campo": "Firma Digital de Conformidad", "Tipo": "SIGNATURE" }
        ]
      }
    ]
  },
  "requisicion_ot_valid.xlsx.json": {
    form_name: "requisicion_ot_valid.xlsx",
    form_family: "REQUISICION_OT",
    sheets: [
      {
        name: "Solicitud Intervención",
        rows: [
          { "Campo": "Máquina Afectada", "Tipo": "SELECT" },
          { "Campo": "Descripción de Falla", "Tipo": "TEXTAREA" }
        ]
      }
    ]
  },
  "generic_valid.xlsx.json": {
    form_name: "generic_valid.xlsx",
    form_family: "FORMULARIO_GENERICO",
    sheets: [
      {
        name: "Formato Abierto",
        rows: [
          { "Campo": "Título Registro", "Tipo": "TEXT" }
        ]
      }
    ]
  },
  "workbook_with_macros.xlsm.json": {
    form_name: "workbook_with_macros.xlsm",
    form_family: "OT_CHECKLIST",
    has_macros: true,
    macro_name: "vbaProject.bin",
    sheets: [
      {
        name: "Checklist Macro",
        rows: [{ "Campo": "Inspeccionar banda", "Tipo": "YES_NO" }]
      }
    ]
  },
  "workbook_corrupted.xlsx.json": {
    form_name: "workbook_corrupted.xlsx",
    form_family: "FORMULARIO_GENERICO",
    corrupted: true,
    sheets: []
  },
  "workbook_ambiguous.xlsx.json": {
    form_name: "workbook_ambiguous.xlsx",
    form_family: "FORMULARIO_GENERICO",
    sheets: [
      {
        name: "Sin Contexto",
        rows: [{ "Campo": "Estado", "Valor": "X" }]
      }
    ]
  },
  "workbook_with_formulas.xlsx.json": {
    form_name: "workbook_with_formulas.xlsx",
    form_family: "FORMULARIO_GENERICO",
    sheets: [
      {
        name: "Cálculos",
        rows: [{ "Campo": "Total Horas", "Valor": "=SUM(C1:C10)", "Valor_cached": 40 }]
      }
    ]
  },
  "workbook_with_lists.xlsx.json": {
    form_name: "workbook_with_lists.xlsx",
    form_family: "OT_CHECKLIST",
    sheets: [
      {
        name: "Listas Validacion",
        data_validations: [{ range: "B2:B10", type: "list", values: ["Sí", "No", "N/A"] }],
        rows: [{ "Campo": "Cumplimiento Inspección", "Tipo": "YES_NO" }]
      }
    ]
  },
  "text_mentioning_vba.xlsx.json": {
    form_name: "text_mentioning_vba.xlsx",
    form_family: "FORMULARIO_GENERICO",
    has_macros: false, // Cell text ONLY! Structural container has NO macros.
    sheets: [
      {
        name: "Capacitación",
        rows: [
          { "Tema": "Curso de programación VBA para operadores" },
          { "Instrucción": "No ejecutar Sub AutoOpen en producción" }
        ]
      }
    ]
  }
};

for (const [filename, content] of Object.entries(workbookFixtures)) {
  fs.writeFileSync(path.join(targetDir, filename), JSON.stringify(content, null, 2), 'utf8');
}

// 2. Contract Isolation JSON Fixtures for Validator (6 JSON files)
const contractFixtures = {
  "duplicate_field_code.json": {
    schema_version: "FORM-DEFINITION-001",
    status: "DRAFT",
    form: {
      code: "FORM_DUP",
      name: "Form Duplicado",
      form_type: "OT_CHECKLIST",
      target_response_table: "respuestas_checklist_orden",
      version: "1.0",
      sections: [{
        code: "SEC_1",
        title: "Sección",
        order: 1,
        fields: [
          { code: "Q1", label: "Pregunta 1", field_type: "TEXT", required: true, order: 1 },
          { code: "Q1", label: "Pregunta 1 Duplicada", field_type: "TEXT", required: false, order: 2 }
        ]
      }]
    },
    warnings: [],
    unsupported_components: [],
    requires_human_review: false,
    expected_error: "DUPLICATE_FIELD_CODE"
  },
  "invalid_field_type.json": {
    schema_version: "FORM-DEFINITION-001",
    status: "DRAFT",
    form: {
      code: "FORM_INV_TYPE",
      name: "Tipo Inválido",
      form_type: "FORMULARIO_GENERICO",
      target_response_table: "respuestas_checklist_orden",
      version: "1.0",
      sections: [{
        code: "SEC_1",
        title: "Sección",
        order: 1,
        fields: [
          { code: "Q1", label: "Pregunta", field_type: "INVALID_CUSTOM_TYPE", required: true, order: 1 }
        ]
      }]
    },
    warnings: [],
    unsupported_components: [],
    requires_human_review: false,
    expected_error: "UNSUPPORTED_FIELD_TYPE"
  },
  "invalid_reference.json": {
    schema_version: "FORM-DEFINITION-001",
    status: "DRAFT",
    form: {
      code: "FORM_INV_REF",
      name: "Referencia Inexistente",
      form_type: "OT_CHECKLIST",
      target_response_table: "respuestas_checklist_orden",
      version: "1.0",
      sections: [{
        code: "SEC_1",
        title: "Sección",
        order: 1,
        fields: [
          { 
            code: "Q1", 
            label: "Pregunta", 
            field_type: "TEXT", 
            required: true, 
            order: 1,
            visibility_rule: {
              when: { field: "NON_EXISTENT_FIELD_999", operator: "EQUALS", value: "NO" },
              action: { type: "SHOW", target: "Q1" }
            }
          }
        ]
      }]
    },
    warnings: [],
    unsupported_components: [],
    requires_human_review: false,
    expected_error: "INVALID_FIELD_REFERENCE"
  },
  "select_without_options.json": {
    schema_version: "FORM-DEFINITION-001",
    status: "DRAFT",
    form: {
      code: "FORM_NO_OPT",
      name: "Select Sin Opciones",
      form_type: "OT_CHECKLIST",
      target_response_table: "respuestas_checklist_orden",
      version: "1.0",
      sections: [{
        code: "SEC_1",
        title: "Sección",
        order: 1,
        fields: [
          { code: "Q1", label: "Seleccionar Opción", field_type: "SELECT", required: true, order: 1, options: [] }
        ]
      }]
    },
    warnings: [],
    unsupported_components: [],
    requires_human_review: false,
    expected_error: "INVALID_FIELD_DEFINITION"
  },
  "invalid_operator.json": {
    schema_version: "FORM-DEFINITION-001",
    status: "DRAFT",
    form: {
      code: "FORM_INV_OP",
      name: "Operador Inválido",
      form_type: "OT_CHECKLIST",
      target_response_table: "respuestas_checklist_orden",
      version: "1.0",
      sections: [{
        code: "SEC_1",
        title: "Sección",
        order: 1,
        fields: [
          { code: "Q1", label: "Pregunta 1", field_type: "TEXT", required: true, order: 1 },
          { 
            code: "Q2", 
            label: "Pregunta 2", 
            field_type: "TEXT", 
            required: false, 
            order: 2,
            visibility_rule: {
              when: { field: "Q1", operator: "INVALID_JS_EVAL_OPERATOR", value: "x" },
              action: { type: "SHOW", target: "Q2" }
            }
          }
        ]
      }]
    },
    warnings: [],
    unsupported_components: [],
    requires_human_review: false,
    expected_error: "INVALID_CONDITIONAL_OPERATOR"
  },
  "datetime_renderer_extension.json": {
    schema_version: "FORM-DEFINITION-001",
    status: "DRAFT",
    form: {
      code: "FORM_DT_EXT",
      name: "Fecha y Hora Extensión",
      form_family: "BITACORA_LEVANTAMIENTO",
      target_response_table: "respuestas_checklist_orden",
      version: "1.0",
      sections: [{
        code: "SEC_1",
        title: "Sección",
        order: 1,
        fields: [
          { code: "Q1", label: "Fecha y Hora Cierre", field_type: "DATETIME", required: true, order: 1 }
        ]
      }]
    },
    warnings: [],
    unsupported_components: [],
    requires_human_review: false,
    expected_warning: "REQUIRES_RENDERER_EXTENSION"
  }
};

for (const [filename, content] of Object.entries(contractFixtures)) {
  fs.writeFileSync(path.join(formDefDir, filename), JSON.stringify(content, null, 2), 'utf8');
}

console.log(`✅ Created 12 Workbook Fixtures and 6 Contract Isolation JSON Fixtures for PRD-AG-006.2`);
