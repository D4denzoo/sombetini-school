import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published documents' })
  findPublic(@Query('page') page = 1, @Query('limit') limit = 20, @Query('category') category?: string) {
    return this.documentsService.findPublic(+page, +limit, category);
  }

  @Get('admin/all')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all documents (admin)' })
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 20, @Query('category') category?: string) {
    return this.documentsService.findAllAdmin(+page, +limit, category);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findPublished(id);
  }

  @Public()
  @Get(':id/download')
  @ApiOperation({ summary: 'Download document (tracks count)' })
  download(@Param('id') id: string) {
    return this.documentsService.download(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload document' })
  create(@Body() body: {
    title: string; description?: string; category: string;
    fileName: string; fileUrl: string; fileSize: number; mimeType: string; isPublished?: boolean;
  }) {
    return this.documentsService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update document' })
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.documentsService.update(id, body as never);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete document' })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
