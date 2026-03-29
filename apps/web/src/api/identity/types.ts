export interface ListResultDto<T> {
  items: T[]
}

export interface PagedResultDto<T> {
  totalCount: number
  items: T[]
}

export interface PagedAndSortedResultRequestDto {
  skipCount?: number
  maxResultCount?: number
  sorting?: string
}

export interface IdentityUserDto {
  id: string
  userName: string
  name?: string
  surname?: string
  email?: string
  phoneNumber?: string
  isActive?: boolean
  lockoutEnabled?: boolean
  creationTime?: string
  roleNames?: string[]
}

export interface GetIdentityUsersParams extends PagedAndSortedResultRequestDto {
  filter?: string
  organizationUnitId?: string
}

export interface IdentityUserCreateDto {
  userName: string
  name?: string
  surname?: string
  email?: string
  phoneNumber?: string
  password: string
  isActive?: boolean
  lockoutEnabled?: boolean
  roleNames?: string[]
}

export interface IdentityUserUpdateDto {
  userName: string
  name?: string
  surname?: string
  email?: string
  phoneNumber?: string
  isActive?: boolean
  lockoutEnabled?: boolean
  roleNames?: string[]
}

export interface IdentityRoleDto {
  id: string
  name: string
  isDefault?: boolean
  isPublic?: boolean
  isStatic?: boolean
  creationTime?: string
}

export interface GetIdentityRolesParams extends PagedAndSortedResultRequestDto {
  filter?: string
}

export interface IdentityRoleCreateDto {
  name: string
  isDefault?: boolean
  isPublic?: boolean
}

export interface IdentityRoleUpdateDto {
  name: string
  isDefault?: boolean
  isPublic?: boolean
}

export interface OrganizationUnitDto {
  id: string
  parentId?: string | null
  code?: string
  displayName: string
  children?: OrganizationUnitDto[]
}

export interface OrganizationUnitCreateDto {
  parentId?: string | null
  displayName: string
}

export interface OrganizationUnitUpdateDto {
  displayName: string
}

export interface OrganizationUnitUserDto {
  id: string
  userName: string
  email?: string
  name?: string
}

export interface GetOrganizationUnitMembersParams extends PagedAndSortedResultRequestDto {
  filter?: string
}

export interface PermissionGrantInfoDto {
  name: string
  displayName?: string
  parentName?: string
  isGranted: boolean
  allowedProviders?: string[]
}

export interface PermissionGroupDto {
  name: string
  displayName?: string
  permissions: PermissionGrantInfoDto[]
}

export interface GetPermissionListResultDto {
  entityDisplayName?: string
  groups: PermissionGroupDto[]
}

export interface UpdatePermissionDto {
  name: string
  isGranted: boolean
}

export interface UpdatePermissionsDto {
  permissions: UpdatePermissionDto[]
}
