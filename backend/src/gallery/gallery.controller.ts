import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/constants/roles';

@ApiTags('gallery')
@Controller('gallery')
export class GalleryController {
  constructor(private galleryService: GalleryService) {}

  @Public()
  @Get('albums')
  @ApiOperation({ summary: 'List published albums' })
  findAlbums(@Query('page') page = 1, @Query('limit') limit = 20, @Query('category') category?: string) {
    return this.galleryService.findAlbums(+page, +limit, category);
  }

  @Get('admin/albums')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all albums (admin)' })
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.galleryService.findAllAdmin(+page, +limit);
  }

  @Public()
  @Get('albums/:id')
  @ApiOperation({ summary: 'Get album with images' })
  findAlbum(@Param('id') id: string) {
    return this.galleryService.findPublishedAlbum(id);
  }

  @Post('albums')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create album' })
  createAlbum(@Body() body: { title: string; description?: string; category: string; coverUrl?: string; isPublished?: boolean; sortOrder?: number }) {
    return this.galleryService.createAlbum(body);
  }

  @Put('albums/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update album' })
  updateAlbum(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.galleryService.updateAlbum(id, body as never);
  }

  @Delete('albums/:id')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete album' })
  removeAlbum(@Param('id') id: string) {
    return this.galleryService.removeAlbum(id);
  }

  @Post('albums/:id/images')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add image to album' })
  addImage(@Param('id') id: string, @Body() body: { title?: string; imageUrl: string; thumbnailUrl?: string; sortOrder?: number }) {
    return this.galleryService.addImage(id, body);
  }

  @Delete('images/:imageId')
  @ApiBearerAuth()
  @Roles(RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove image' })
  removeImage(@Param('imageId') imageId: string) {
    return this.galleryService.removeImage(imageId);
  }
}
