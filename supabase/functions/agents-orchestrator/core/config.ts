// supabase/functions/agents-orchestrator/core/config.ts

export const config = {
  get tsmEnv(): string {
    return Deno.env.get('TSM_ENV') ?? 'production';
  },
  get multiagentEnabled(): boolean {
    return Deno.env.get('MULTIAGENT_ENABLED') !== 'false';
  },
  get llmCallsEnabled(): boolean {
    return Deno.env.get('LLM_CALLS_ENABLED') !== 'false';
  },
  get aiRouterEnabled(): boolean {
    return Deno.env.get('AI_ROUTER_ENABLED') !== 'false';
  },
  get openaiEnabled(): boolean {
    return Deno.env.get('OPENAI_ENABLED') !== 'false';
  },
  get mimoEnabled(): boolean {
    return Deno.env.get('MIMO_ENABLED') === 'true';
  },
  get agentTestMode(): boolean {
    return Deno.env.get('AGENT_TEST_MODE') === 'true';
  },
  VERSIONS: {
    AGENT_VERSION: '1.0',
    PROMPT_VERSION: 'CAP-001',
    SCHEMA_VERSION: 'CAP-SCHEMA-001',
    VALIDATOR_VERSION: 'VAL-001',
    ROUTE_VERSION: 'ROUTE-001'
  }
};
