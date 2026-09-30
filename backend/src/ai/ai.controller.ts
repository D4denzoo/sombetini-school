import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Post('chat')
  @ApiOperation({ summary: 'Chat with Msaidizi wa Sombetini' })
  chat(
    @Body() body: { message: string; sessionId?: string; language?: string },
    @CurrentUser() user?: AuthUser,
  ) {
    return this.aiService.chat(body.message, body.sessionId, user?.id, body.language || 'sw');
  }

  @Get('faqs')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List FAQs (admin)' })
  findAllFaqs(@Query('page') page = 1, @Query('limit') limit = 20, @Query('category') category?: string) {
    return this.aiService.findAllFaqs(+page, +limit, category);
  }

  @Get('faqs/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get FAQ by ID' })
  findFaq(@Param('id') id: string) {
    return this.aiService.findFaq(id);
  }

  @Post('faqs')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create FAQ' })
  createFaq(@Body() body: { question: string; questionSw?: string; answer: string; answerSw?: string; category?: string; keywords?: string; sortOrder?: number }) {
    return this.aiService.createFaq(body);
  }

  @Put('faqs/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update FAQ' })
  updateFaq(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.aiService.updateFaq(id, body as never);
  }

  @Delete('faqs/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete FAQ' })
  removeFaq(@Param('id') id: string) {
    return this.aiService.removeFaq(id);
  }
}
