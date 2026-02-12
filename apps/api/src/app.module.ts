import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import PermissionEntity from './entities/PermissionEntity';
import RoleEntity from './entities/RoleEntity';
import UserEntity from './entities/UserEntity';
import AuthAuditEventEntity from './entities/AuthAuditEventEntity';
import PasswordResetRequestEntity from './entities/PasswordResetRequestEntity';
import MailOutboxEntity from './entities/MailOutboxEntity';
import NotificationEntity from './entities/NotificationEntity';
import AssistantChatMessageEntity from './entities/AssistantChatMessageEntity';
import IntegrationConfigEntity from './entities/IntegrationConfigEntity';
import IntegrationSyncJobEntity from './entities/IntegrationSyncJobEntity';
import IntegrationSyncRecordEntity from './entities/IntegrationSyncRecordEntity';
import ImportTemplateEntity from './entities/ImportTemplateEntity';

import CommentEntity from './entities/CommentEntity';
import NoteEntity from './entities/NoteEntity';
import AttachmentEntity from './entities/AttachmentEntity';
import TagEntity from './entities/TagEntity';
import MilestoneEntity from './entities/MilestoneEntity';
import ProjectTemplateEntity from './entities/ProjectTemplateEntity';

import AuthModule from './modules/auth/auth.module';
import UsersModule from './modules/users/users.module';
import RbacModule from './modules/rbac/rbac.module';
import MockSeedModule from './seed/mock-seed.module';

import ProjectEntity from './entities/ProjectEntity';
import TaskEntity from './entities/TaskEntity';

import ProjectsModule from './modules/projects/projects.module';
import TasksModule from './modules/tasks/tasks.module';
import DashboardModule from './modules/dashboard/dashboard.module';
import AdminModule from './modules/admin/admin.module';

import CommentsModule from './modules/comments/comments.module';
import NotesModule from './modules/notes/notes.module';
import AttachmentsModule from './modules/attachments/attachments.module';
import TagsModule from './modules/tags/tags.module';
import MilestonesModule from './modules/milestones/milestones.module';
import TemplatesModule from './modules/templates/templates.module';
import ImportModule from './modules/import/import.module';
import { ClientsModule } from './modules/clients/clients.module';
import ClientEntity from './entities/ClientEntity';
import { LeadsModule } from './modules/leads/leads.module';
import LeadEntity from './entities/LeadEntity';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import NotificationsModule from './modules/notifications/notifications.module';
import MessageEventEntity from './entities/MessageEventEntity';
import { MessagesModule } from './modules/messages/messages.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AssistantWsModule } from './modules/assistant/assistant-ws.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mongodb',
      url: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/corp_admin',
      entities: [
        PermissionEntity,
        RoleEntity,
        UserEntity,
        ClientEntity,
        LeadEntity,
        ProjectEntity,
        TaskEntity,
        MessageEventEntity,
        AuthAuditEventEntity,
        PasswordResetRequestEntity,
        MailOutboxEntity,
        NotificationEntity,
        AssistantChatMessageEntity,
        IntegrationConfigEntity,
        IntegrationSyncJobEntity,
        IntegrationSyncRecordEntity,
        ImportTemplateEntity,
        CommentEntity,
        NoteEntity,
        AttachmentEntity,
        TagEntity,
        MilestoneEntity,
        ProjectTemplateEntity,
      ],
      synchronize: process.env.TYPEORM_SYNC === '1',
      logging: process.env.TYPEORM_LOGGING === '1',
    }),
    ScheduleModule.forRoot(),
    RbacModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    DashboardModule,
    AdminModule,
    CommentsModule,
    NotesModule,
    AttachmentsModule,
    TagsModule,
    MilestonesModule,
    TemplatesModule,
    ImportModule,
    MockSeedModule,
    ClientsModule,
    IntegrationsModule,
    NotificationsModule,
    LeadsModule,
    MessagesModule,
    WebhooksModule,
    AssistantWsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.warn('[AppModule] MONGO_URL not set, using default localhost');
    }
    console.log('[AppModule] Initialized with', {
      sync: process.env.TYPEORM_SYNC === '1',
      logging: process.env.TYPEORM_LOGGING === '1',
    });
  }
}
