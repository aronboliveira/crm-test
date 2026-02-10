import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  Logger,
} from '@nestjs/common';
import TemplatesService from './templates.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  TemplateQuerySchema,
  TemplateKeySchema,
  TemplateIdSchema,
  type CreateTemplateDto,
  type UpdateTemplateDto,
  type TemplateQueryDto,
} from '../../common/validation';
import { ZodValidationPipe, SanitizerService } from '../../common/validation';

/**
 * @controller TemplatesController
 * @description REST API controller for project templates
 * @version 1.4.0
 * @since 2025-02-09
 *
 * Security features:
 * - Zod schema validation on all inputs
 * - DOMPurify sanitization for HTML content
 * - SQL injection detection and blocking
 * - JWT authentication required
 * - RBAC permissions enforcement
 */
@Controller('/project-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);
  private readonly sanitizer = new SanitizerService();

  constructor(private readonly svc: TemplatesService) {}

  /**
   * List all templates with optional filtering
   * @param query - Query parameters for filtering
   * @returns Paginated list of templates
   */
  @Get()
  @Permissions('projects.read')
  @UsePipes(new ZodValidationPipe(TemplateQuerySchema, { sanitize: true }))
  async list(@Query() query: TemplateQueryDto) {
    const rows = await this.svc.list(query);
    return {
      items: rows.map((t) => ({
        id: String(t._id),
        key: t.key,
        name: t.name,
        description: t.description,
        category: t.category,
        tasks: t.tasks,
        defaultTags: t.defaultTags,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Find a template by its unique key
   * @param key - Template key
   * @returns Template data
   */
  @Get('/:key')
  @Permissions('projects.read')
  async findByKey(
    @Param('key', new ZodValidationPipe(TemplateKeySchema.shape.key))
    key: string,
  ) {
    const t = await this.svc.findByKey(key);
    return {
      id: String(t._id),
      key: t.key,
      name: t.name,
      description: t.description,
      category: t.category,
      tasks: t.tasks,
      defaultTags: t.defaultTags,
      content: t.content,
      subject: t.subject,
      isActive: t.isActive,
      metadata: t.metadata,
    };
  }

  /**
   * Create a new template with full validation and sanitization
   * @param dto - Template creation data (validated by Zod)
   * @returns Created template ID and key
   */
  @Post()
  @Permissions('projects.manage')
  async create(
    @Body(
      new ZodValidationPipe(CreateTemplateSchema, {
        sanitize: true,
        allowHtml: true, // Allow safe HTML in content field
        blockSqlInjection: true,
        logErrors: true,
      }),
    )
    dto: CreateTemplateDto,
  ) {
    this.logger.log(`Creating template with key: ${dto.key}`);

    // Additional sanitization for content field (HTML allowed)
    const sanitizedDto = {
      ...dto,
      content: dto.content
        ? this.sanitizer.sanitizeHtml(dto.content)
        : undefined,
      name: this.sanitizer.sanitizeText(dto.name),
      description: dto.description
        ? this.sanitizer.sanitizeText(dto.description)
        : undefined,
      subject: dto.subject
        ? this.sanitizer.sanitizeText(dto.subject)
        : undefined,
    };

    const t = await this.svc.create(sanitizedDto);
    return { id: String(t._id), key: t.key };
  }

  /**
   * Update an existing template
   * @param id - Template ID
   * @param dto - Update data (validated by Zod)
   * @returns Updated template
   */
  @Put('/:id')
  @Permissions('projects.manage')
  async update(
    @Param('id', new ZodValidationPipe(TemplateIdSchema.shape.id)) id: string,
    @Body(
      new ZodValidationPipe(UpdateTemplateSchema, {
        sanitize: true,
        allowHtml: true,
        blockSqlInjection: true,
      }),
    )
    dto: UpdateTemplateDto,
  ) {
    this.logger.log(`Updating template: ${id}`);

    // Sanitize fields that exist in the update
    const sanitizedDto: UpdateTemplateDto = { ...dto };
    if (dto.content) {
      sanitizedDto.content = this.sanitizer.sanitizeHtml(dto.content);
    }
    if (dto.name) {
      sanitizedDto.name = this.sanitizer.sanitizeText(dto.name);
    }
    if (dto.description) {
      sanitizedDto.description = this.sanitizer.sanitizeText(dto.description);
    }
    if (dto.subject) {
      sanitizedDto.subject = this.sanitizer.sanitizeText(dto.subject);
    }

    const t = await this.svc.update(id, sanitizedDto);
    return {
      id: String(t._id),
      key: t.key,
      name: t.name,
      updatedAt: t.updatedAt,
    };
  }

  /**
   * Delete a template by ID
   * @param id - Template ID
   * @returns Success confirmation
   */
  @Delete('/:id')
  @Permissions('projects.manage')
  async remove(
    @Param('id', new ZodValidationPipe(TemplateIdSchema.shape.id)) id: string,
  ) {
    this.logger.log(`Removing template: ${id}`);
    await this.svc.remove(id);
    return { ok: true };
  }
}
