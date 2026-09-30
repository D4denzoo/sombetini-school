import { Injectable } from '@nestjs/common';
import { LlmProvider } from './llm.provider.interface';

@Injectable()
export class MockLlmProvider implements LlmProvider {
  async generateResponse(prompt: string, context?: string): Promise<string> {
    const responses = [
      'Asante kwa swali lako. Nimeelewa unahitaji msaada kuhusu shule yetu. Tafadhali wasiliana na ofisi ya shule kwa maelezo zaidi.',
      'Karibu Sombetini Primary School! Naweza kukusaidia kuhusu matokeo, malipo, na matukio ya shule.',
      'Samahani, sina taarifa kamili kuhusu hilo kwa sasa. Tafadhali jaribu kuuliza kwa njia nyingine au wasiliana na msimamizi.',
    ];

    if (context) {
      return `Kulingana na taarifa zetu: ${context}\n\nJe, kuna swali lingine unalotaka kuuliza kuhusu Shule ya Msingi Sombetini?`;
    }

    const lower = prompt.toLowerCase();
    if (lower.includes('habari') || lower.includes('mambo')) {
      return 'Habari! Mimi ni Msaidizi wa Sombetini. Naweza kukusaidia kuhusu matokeo, malipo, matukio, na taarifa za shule. Una swali gani?';
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
