import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RbacService } from './rbac.service';

@ApiTags('rbac')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @Permissions('rbac.manage')
  @Get('roles')
  listRoles() {
    return this.rbacService.listRoles();
  }

  @Permissions('rbac.manage')
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Permissions('rbac.manage')
  @Patch('roles/:roleId')
  updateRole(@Param('roleId') roleId: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(roleId, dto);
  }

  @Permissions('rbac.manage')
  @Delete('roles/:roleId')
  deleteRole(@Param('roleId') roleId: string) {
    return this.rbacService.deleteRole(roleId);
  }

  @Permissions('rbac.manage')
  @Get('permissions')
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Permissions('rbac.manage')
  @Post('permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  @Permissions('rbac.manage')
  @Patch('permissions/:permissionId')
  updatePermission(@Param('permissionId') permissionId: string, @Body() dto: UpdatePermissionDto) {
    return this.rbacService.updatePermission(permissionId, dto);
  }

  @Permissions('rbac.manage')
  @Delete('permissions/:permissionId')
  deletePermission(@Param('permissionId') permissionId: string) {
    return this.rbacService.deletePermission(permissionId);
  }

  @Permissions('users.manage')
  @Get('users')
  listUsers() {
    return this.rbacService.listUsers();
  }

  @Permissions('users.manage')
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.rbacService.createUser(dto);
  }

  @Permissions('users.manage')
  @Put('users/:userId')
  updateUser(@Param('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.rbacService.updateUser(userId, dto);
  }

  @Permissions('users.manage')
  @Delete('users/:userId')
  deleteUser(@Param('userId') userId: string) {
    return this.rbacService.deleteUser(userId);
  }

  @Permissions('rbac.manage')
  @Post('roles/:roleId/permissions')
  assignPermissions(@Param('roleId') roleId: string, @Body() dto: AssignPermissionsDto) {
    return this.rbacService.assignPermissions(roleId, dto);
  }

  @Permissions('rbac.manage')
  @Put('roles/:roleId/permissions')
  replacePermissions(@Param('roleId') roleId: string, @Body() dto: AssignPermissionsDto) {
    return this.rbacService.replacePermissions(roleId, dto);
  }

  @Permissions('rbac.manage')
  @Post('users/:userId/roles')
  assignRoles(@Param('userId') userId: string, @Body() dto: AssignRolesDto) {
    return this.rbacService.assignRolesToUser(userId, dto);
  }

  @Permissions('rbac.manage')
  @Put('users/:userId/roles')
  replaceRoles(@Param('userId') userId: string, @Body() dto: AssignRolesDto) {
    return this.rbacService.replaceRolesForUser(userId, dto);
  }

  @Permissions('rbac.manage')
  @Post('users/by-dni/:dni/roles')
  assignRolesByDni(@Param('dni') dni: string, @Body() dto: AssignRolesDto) {
    return this.rbacService.assignRolesToUserByDni(dni, dto);
  }

  @Permissions('rbac.manage')
  @Put('users/by-dni/:dni/roles')
  replaceRolesByDni(@Param('dni') dni: string, @Body() dto: AssignRolesDto) {
    return this.rbacService.replaceRolesForUserByDni(dni, dto);
  }
}
