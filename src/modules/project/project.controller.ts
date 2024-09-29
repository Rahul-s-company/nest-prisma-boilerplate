import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ERROR_MESSAGES } from 'src/shared/constants/strings';
import { ExportService } from 'src/shared/services';

import { Permissions } from '../../core/decorators/permission.decorator';

import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  FilterProjectDto,
  UpdateProjectDto,
} from './project.dto';

@ApiTags('project')
@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @Permissions({ operation: 'create', spaceId: 11 })
  async create(@Req() req, @Body() createProjectDto: CreateProjectDto) {
    createProjectDto.createdBy = req.user.id;
    const project = await this.projectService.createProject(createProjectDto);

    return new ResponseSuccess('Project created successfully !', project);
  }

  @Get(':partnerId')
  @Permissions({ operation: 'read', spaceId: 11 })
  async findAll(
    @Query() filterProjectDto: FilterProjectDto,
    @Req() req,
    @Param('partnerId') partnerId: string,
  ) {
    const orderByObject = {};

    if (filterProjectDto.orderBy) {
      orderByObject[filterProjectDto.orderBy] = filterProjectDto.order;
    }

    const skip = (filterProjectDto.page - 1) * filterProjectDto.pageSize;
    const take = filterProjectDto.pageSize;
    const filterWhere: any = {
      AND: [],
    };

    if (filterProjectDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: filterProjectDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (filterProjectDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterProjectDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [
        {
          OR: [
            {
              partner: {
                partnerOrganizationId: req.user.organizationId,
              },
            },
            {
              AND: [
                {
                  partnerId: +partnerId,
                  partner: {
                    organizationId: req.user.organizationId,
                  },
                },
              ],
            },
          ],
        },
        filterWhere,
      ],
    };

    const [projectList, totalCount] = await Promise.all([
      this.projectService.findAll(
        {
          where: whereCond,
          orderBy:
            Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
          skip,
          take,
        },
        req.user.id,
      ),
      this.projectService.count({
        where: whereCond,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / filterProjectDto.pageSize);

    return new ResponseSuccess('Project List ', projectList, {
      currentPage: filterProjectDto.page,
      pageSize: filterProjectDto.pageSize,
      totalCount,
      totalPages,
      orderBy: filterProjectDto.orderBy,
      order: filterProjectDto.order,
    });
  }

  @Get('detail/:id')
  @Permissions({ operation: 'read', spaceId: 11 })
  async findOne(@Param('id') id: string) {
    const projectInfo = await this.projectService.findOne(+id);

    if (!projectInfo) {
      throw new HttpException(
        { message: ERROR_MESSAGES.INTERNAL_ERR_MSG },
        HttpStatus.BAD_REQUEST,
      );
    }

    return new ResponseSuccess('Project Detail', projectInfo);
  }

  @Patch(':id')
  @Permissions({ operation: 'create', spaceId: 11 })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    updateProjectDto.updatedBy = req.user.id;

    const projectInfo = await this.projectService.update(+id, updateProjectDto);

    return new ResponseSuccess('Project Updated', projectInfo);
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 11 })
  async remove(@Req() req, @Param('id') id: string) {
    const delProject = await this.projectService.remove(+id, req.user.id);

    return new ResponseSuccess('Project has been removed', delProject);
  }

  @Get(':partnerId/export')
  @Permissions({ operation: 'read', spaceId: 11 })
  async exportProject(
    @Query() filterProjectDto: FilterProjectDto,
    @Req() req,
    @Param('partnerId') partnerId: string,
    @Res() res,
  ) {
    const orderByObject = {};

    if (filterProjectDto.orderBy) {
      orderByObject[filterProjectDto.orderBy] = filterProjectDto.order;
    }

    const filterWhere: any = {
      AND: [],
    };

    if (filterProjectDto.searchString) {
      filterWhere.AND.push({
        OR: [
          {
            name: {
              contains: filterProjectDto.searchString,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (filterProjectDto.date) {
      const currentDate = new Date();
      const dateThreshold = new Date(
        currentDate.setDate(currentDate.getDate() - filterProjectDto.date),
      );
      filterWhere.AND.push({ createdAt: { gte: dateThreshold } });
    }

    const whereCond = {
      AND: [
        {
          OR: [
            {
              partner: {
                partnerOrganizationId: req.user.organizationId,
              },
            },
            {
              AND: [
                {
                  partnerId: +partnerId,
                  partner: {
                    organizationId: req.user.organizationId,
                  },
                },
              ],
            },
          ],
        },
        filterWhere,
      ],
    };

    const projectList = await this.projectService.findAll(
      {
        where: whereCond,
        orderBy:
          Object.keys(orderByObject).length > 0 ? orderByObject : undefined,
      },
      req.user.id,
    );

    return this.exportService.exportProjectToExcel(projectList, res);
  }
}
