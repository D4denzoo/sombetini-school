import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { LLM_PROVIDER } from './providers/llm.provider.interface';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    MockLlmProvider,
    { provide: LLM_PROVIDER, useClass: MockLlmProvider },
  ],
  exports: [AiService],
})
export class AiModule {}
