import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { IndustryService } from './industry.service';

@ApiTags('industry')
@Controller('industry')
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  // @Post()
  // create(@Body() createIndustryDto: CreateIndustryDto) {
  //   return this.industryService.create(createIndustryDto);
  // }

  @Get()
  findAll() {
    return this.industryService.findAll();
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.industryService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateIndustryDto: UpdateIndustryDto) {
  //   return this.industryService.update(+id, updateIndustryDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.industryService.remove(+id);
  // }
}
