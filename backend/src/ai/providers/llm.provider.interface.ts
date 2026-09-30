export interface LlmProvider {
  generateResponse(prompt: string, context?: string): Promise<string>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
