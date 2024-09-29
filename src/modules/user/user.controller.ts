import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { StatusType, User } from '@prisma/client';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResponseSuccess } from 'src/utils/response/response';
import { ResponseInterface } from 'src/utils/response/response.interface';
import { DisposableEmailDomain } from 'src/shared/helpers/disposableEmailDomain.helper';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from 'src/shared/constants/strings';
import { generatePassword } from 'src/shared/helpers/passwordGenerator.helpers';
import { UserRoles } from 'src/types';

import { ResponseDTO } from '../auth/auth.dto';
import { UserRoleService } from '../user-role/user-role.service';
import { Permissions } from '../../core/decorators/permission.decorator';

import { CreateUserDTO, FilterUsersDto } from './user.dto';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('/users')
export class UserController {
  constructor(
    private userService: UserService,
    private userRoleService: UserRoleService,
  ) {}

  @Get()
  @Permissions({ operation: 'read', spaceId: 20 })
  @ApiOperation({ description: 'get  user list' })
  async getAll(@Req() req): Promise<User[]> {
    let filterRoleCond;
    //filter by role priority
    const roleInfo = await this.userRoleService.getUserRoleById(
      req.user.roleId,
    );

    if (
      roleInfo.name == UserRoles.ACCOUNTMANAGER ||
      roleInfo.name == UserRoles.CONTRIBUTOR
    ) {
      filterRoleCond = {
        roleId: {
          notIn: [1, 2],
        },
      };
    }

    const whereCond = {
      organizationId: req.user.organizationId,
      NOT: {
        id: req.user.id,
      },
      ...filterRoleCond, // spread the filterRoleCond
    };

    return this.userService.users({
      where: whereCond,
    });
  }

  @Get('filtered-users')
  @Permissions({ operation: 'read', spaceId: 20 })
  async getFilteredUsers(
    @Query() filterUsersDto: FilterUsersDto,
    @Req() req,
  ): Promise<User[]> {
    const where: any = {
      OR: [],
      AND: [],
    };

    if (filterUsersDto.searchString) {
      const searchFields = filterUsersDto.fields.split(',') || [
        'firstName',
        'lastName',
      ];

      searchFields.forEach((field) => {
        where.OR.push({
          [field]: {
            contains: filterUsersDto.searchString,
            mode: 'insensitive',
          },
        });
      });
    }

    // If searchString is not provided or empty, remove the OR condition
    if (
      !filterUsersDto.searchString ||
      filterUsersDto.searchString.trim() === ''
    ) {
      delete where.OR;
    }

    if (filterUsersDto.roleId) {
      where.AND.push({
        roleId: Number(filterUsersDto.roleId),
      });
    }
    if (filterUsersDto.status) {
      if (filterUsersDto.status === StatusType.PENDING) {
        where.AND.push({
          OR: [
            {
              status: filterUsersDto.status,
            },
            {
              status: StatusType.CHANGE_PASSWORD,
            },
          ],
        });
      } else {
        where.AND.push({
          status: filterUsersDto.status,
        });
      }
    }
    where.AND.push({
      organizationId: req.user.organizationId,
      NOT: {
        id: {
          equals: req.user.id,
        },
      },
    });

    //filter by role priority
    const roleInfo = await this.userRoleService.getUserRoleById(
      req.user.roleId,
    );

    if (
      roleInfo.name == UserRoles.ACCOUNTMANAGER ||
      roleInfo.name == UserRoles.CONTRIBUTOR
    ) {
      where.AND.push({
        NOT: {
          roleId: {
            in: [1, 2],
          },
        },
      });
    }

    const user = await this.userService.users({
      where,
    });

    return user;
  }

  @Get('by/:organizationId/')
  @ApiOperation({ description: 'get  user list by organization id' })
  @ApiParam({ name: 'organizationId', required: true })
  async getUsersByOrganization(
    @Param() params: { organizationId: number },
  ): Promise<User[]> {
    const user = await this.userService.users({
      where: { organizationId: Number(params.organizationId) },
    });

    return user;
  }

  @Post()
  @Permissions({ operation: 'create', spaceId: 20 })
  @ApiOperation({ description: 'create a user' })
  @ApiBody({ type: CreateUserDTO })
  async createUser(
    @Body() userData: CreateUserDTO,
    @Req() req,
  ): Promise<ResponseInterface> {
    if (!(await DisposableEmailDomain.isDisposable(userData.email))) {
      throw new HttpException(
        { message: ERROR_MESSAGES.WORK_EMAIL_ALLOWED },
        HttpStatus.BAD_REQUEST,
      );
    }

    userData.organizationId = req.user.organizationId;
    userData.isInvitedBy = req.user.id;
    userData.isInvitationPending = true;

    userData.password = await generatePassword();
    userData.status = 'CHANGE_PASSWORD';
    const userInfo = await this.userService.signUpUser(userData);

    if (userInfo) {
      await this.userService.sentAccountCreationEmail(userData);

      return new ResponseSuccess(SUCCESS_MESSAGES.USER_INVITE, userInfo);
    }

    throw new Error(ERROR_MESSAGES.INTERNAL_ERR_MSG);
  }

  @Get(':id')
  @Permissions({ operation: 'read', spaceId: 20 })
  @ApiOperation({ description: 'get user by id' })
  @ApiParam({ name: 'id', required: true })
  async getUser(@Param() params: { id: number }): Promise<User> {
    const getUserInfo = await this.userService.findUser({
      id: Number(params.id),
    });

    if (getUserInfo) {
      getUserInfo.password = null;
      return getUserInfo;
    }

    throw new HttpException(
      { message: ERROR_MESSAGES.INVALID_USER },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Get(':id/resend-invitation')
  @ApiOperation({
    description: 'resend invitation to user which yet to accept',
  })
  @ApiParam({ name: 'id', required: true })
  async resendUserInvitation(
    @Param() params: { id: number },
  ): Promise<ResponseDTO | HttpException> {
    const getUserInfo = await this.userService.findUser({
      id: Number(params.id),
    });

    if (getUserInfo && getUserInfo.isInvitedBy) {
      if (getUserInfo.isInvitationPending) {
        await this.userService.sentAccountCreationEmail(getUserInfo);
        return new ResponseSuccess('User Registration Email Re-sent ');
      } else {
        throw new HttpException(
          { message: ERROR_MESSAGES.ALREADY_ACCEPT_INVITATION },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    throw new HttpException(
      { message: ERROR_MESSAGES.INVALID_REQ },
      HttpStatus.BAD_REQUEST,
    );
  }

  @Put(':id')
  @Permissions({ operation: 'create', spaceId: 20 })
  @ApiOperation({ description: 'update user' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: CreateUserDTO })
  async updateUser(
    @Param() params: { id: number },
    @Body() userData: CreateUserDTO,
  ): Promise<ResponseInterface> {
    if (!(await DisposableEmailDomain.isDisposable(userData.email))) {
      throw new HttpException(
        { message: ERROR_MESSAGES.WORK_EMAIL_ALLOWED },
        HttpStatus.BAD_REQUEST,
      );
    }

    const updatedUserInfo = await this.userService.updateUser({
      where: { id: Number(params.id) },
      data: userData,
    });

    if (updatedUserInfo) {
      return new ResponseSuccess('User updated Successfully ', updatedUserInfo);
    }

    throw new Error('USER.UPDATE ISSUE');
  }

  @Delete(':id')
  @Permissions({ operation: 'delete', spaceId: 20 })
  @ApiOperation({ description: 'delete user' })
  @ApiParam({ name: 'id', required: true })
  async deleteUser(
    @Param() params: { id: number },
  ): Promise<ResponseInterface> {
    const deleteUser = await this.userService.deleteUser({
      id: Number(params.id),
    });

    if (deleteUser) {
      return new ResponseSuccess(SUCCESS_MESSAGES.USER_DELETE);
    }

    throw new Error('USER.DELETE ISSUE');
  }
}
