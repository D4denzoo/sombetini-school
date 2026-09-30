import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../common/decorators/auth.decorators';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Global search across announcements, events, documents, resources, and FAQs' })
  search(
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit = 20,
  ) {
    const typeList = types ? types.split(',').map(t => t.trim()) : undefined;
    return this.searchService.search(query, typeList, +limit);
  }
}
