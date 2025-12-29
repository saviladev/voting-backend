import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Permission } from '@prisma/client';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import { DEFAULT_PERMISSIONS } from '../src/common/constants/permissions';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedPermissions() {
  const permissions: Permission[] = [];
  for (const key of DEFAULT_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { deletedAt: null },
      create: { key },
    });
    permissions.push(permission);
  }
  return permissions;
}

async function seedRoles(allPermissions: { id: string; key: string }[]) {
  const roles = ['SystemAdmin', 'Member', 'PadronManager'];
  const createdRoles: { id: string; name: string }[] = [];

  for (const name of roles) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { deletedAt: null },
      create: { name },
    });
    createdRoles.push(role);
  }

  const adminRole = createdRoles.find((r) => r.name === 'SystemAdmin');
  if (adminRole) {
    await prisma.rolePermission.createMany({
      data: allPermissions.map((permission) => ({ roleId: adminRole.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  const padronRole = createdRoles.find((r) => r.name === 'PadronManager');
  const padronPermission = allPermissions.find((permission) => permission.key === 'padron.manage');
  if (padronRole && padronPermission) {
    await prisma.rolePermission.createMany({
      data: [{ roleId: padronRole.id, permissionId: padronPermission.id }],
      skipDuplicates: true,
    });
  }

  return createdRoles;
}

async function seedOrganizationStructure() {
  const associationName = process.env.ASSOCIATION_NAME ?? 'Colegio de Ingenieros del Perú';
  const branchName = process.env.BRANCH_NAME ?? 'Lima';
  const specialtyName = process.env.SPECIALTY_NAME ?? 'Ingeniería de Sistemas';
  const chapterName = process.env.CHAPTER_NAME ?? 'Sistemas';

  const association = await prisma.association.upsert({
    where: { name: associationName },
    update: { deletedAt: null },
    create: { name: associationName },
  });

  const branch = await prisma.branch.upsert({
    where: { associationId_name: { associationId: association.id, name: branchName } },
    update: { deletedAt: null },
    create: {
      associationId: association.id,
      name: branchName,
    },
  });

  const chapter = await prisma.chapter.upsert({
    where: { branchId_name: { branchId: branch.id, name: chapterName } },
    update: { deletedAt: null },
    create: {
      branchId: branch.id,
      name: chapterName,
    },
  });

  const specialty = await prisma.specialty.upsert({
    where: { associationId_name: { associationId: association.id, name: specialtyName } },
    update: { deletedAt: null },
    create: { name: specialtyName, associationId: association.id },
  });

  await prisma.chapterSpecialty.upsert({
    where: { chapterId_specialtyId: { chapterId: chapter.id, specialtyId: specialty.id } },
    update: { branchId: branch.id },
    create: { chapterId: chapter.id, specialtyId: specialty.id, branchId: branch.id },
  });

  return { association, branch, specialty, chapter };
}

async function seedAdmin(roles: { id: string; name: string }[], chapterId: string) {
  const adminDni = process.env.ADMIN_DNI ?? '00000001';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPhone = process.env.ADMIN_PHONE ?? '999999999';
  const adminFirstName = process.env.ADMIN_FIRST_NAME ?? 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME ?? 'User';
  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { dni: adminDni },
    update: { deletedAt: null, isActive: true },
    create: {
      dni: adminDni,
      passwordHash,
      email: adminEmail,
      phone: adminPhone,
      firstName: adminFirstName,
      lastName: adminLastName,
      chapterId,
    },
  });

  const adminRole = roles.find((r) => r.name === 'SystemAdmin');
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: admin.id, roleId: adminRole.id },
    });
  }
}

async function main() {
  const permissions = await seedPermissions();
  const roles = await seedRoles(permissions);
  const orgStructure = await seedOrganizationStructure();
  await seedAdmin(roles, orgStructure.chapter.id);
  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
