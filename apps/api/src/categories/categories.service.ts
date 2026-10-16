import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slug';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /** Active categories as a flat list ordered for display; children carry parentId. */
  list(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    if (await this.prisma.category.findUnique({ where: { slug } })) throw new ConflictException('Category already exists');
    return this.prisma.category.create({ data: { name: dto.name, slug, parentId: dto.parentId, sortOrder: dto.sortOrder ?? 0 } });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    if (dto.parentId === id) throw new ConflictException('A category cannot be its own parent');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const used = await this.prisma.product.count({ where: { categoryId: id } });
    if (used > 0) {
      // Preserve referential history: deactivate instead of deleting categories that are in use.
      return this.prisma.category.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.category.delete({ where: { id } });
  }
}
