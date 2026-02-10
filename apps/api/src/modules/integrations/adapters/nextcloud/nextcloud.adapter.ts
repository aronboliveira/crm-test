import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type {
  IntegrationAdapter,
  IntegrationStatus,
  IntegrationConfig,
} from '../../types';
import { NextcloudApiClient } from './nextcloud-api.client';
import {
  NextcloudDataMapper,
  type CrmAttachment,
  type CrmShare,
  type CrmActivityLog,
  type CrmIntegrationUser,
} from './nextcloud-data.mapper';
import type {
  NextcloudFile,
  NextcloudShare,
  NextcloudCreateSharePayload,
  NextcloudShareQueryParams,
  NextcloudFileQueryParams,
  NextcloudActivityQueryParams,
} from './nextcloud.types';

/**
 * NextCloud Integration Adapter Configuration
 */
export interface NextcloudAdapterConfig {
  baseUrl: string;
  username: string;
  password?: string;
  appPassword?: string;
  defaultFolder?: string;
}

/**
 * NextCloud Integration Adapter
 *
 * Implements the IntegrationAdapter interface for NextCloud.
 * Provides file storage, sharing, and collaboration capabilities.
 */
@Injectable()
export class NextcloudAdapter implements IntegrationAdapter {
  public readonly id = 'nextcloud';
  public readonly name = 'NextCloud';
  public readonly description =
    'File storage and collaboration platform with WebDAV and sharing';
  public readonly version = '1.0.0';
  public readonly icon = 'nextcloud';
  public readonly category = 'storage' as const;

  private readonly logger = new Logger(NextcloudAdapter.name);
  private readonly apiClient: NextcloudApiClient;
  private config: NextcloudAdapterConfig | null = null;
  private syncState: Map<string, { etag: string; lastModified: Date }> =
    new Map();

  constructor(private readonly httpService: HttpService) {
    this.apiClient = new NextcloudApiClient(httpService);
  }

  // ===========================================================================
  // INTEGRATION ADAPTER INTERFACE
  // ===========================================================================

  /**
   * Get current integration status
   */
  async getStatus(): Promise<IntegrationStatus> {
    const baseStatus: IntegrationStatus = {
      id: 'nextcloud',
      name: 'NextCloud',
      type: 'Storage',
      status: this.config ? 'disconnected' : 'disconnected',
      configured: !!this.config,
      features: [
        'File storage (WebDAV)',
        'File sharing',
        'User collaboration',
        'Activity tracking',
        'Entity folder organization',
      ],
    };

    if (!this.config) {
      return baseStatus;
    }

    try {
      const isConnected = await this.apiClient.testConnection();
      return {
        ...baseStatus,
        status: isConnected ? 'connected' : 'disconnected',
        lastSyncAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        ...baseStatus,
        status: 'error',
        lastError: message,
      };
    }
  }

  /**
   * Test connection to NextCloud server
   */
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('NextCloud adapter not configured');
    }
    return this.apiClient.testConnection();
  }

  /**
   * Configure the NextCloud adapter
   */
  async configure(config: NextcloudAdapterConfig): Promise<void> {
    this.config = {
      ...config,
      defaultFolder: config.defaultFolder || '/CRM',
    };

    this.apiClient.configure({
      baseUrl: config.baseUrl,
      username: config.username,
      password: config.password,
      appPassword: config.appPassword,
    });

    this.logger.log(`NextCloud adapter configured for ${config.baseUrl}`);
  }

  /**
   * Check if adapter is configured
   */
  isConfigured(): boolean {
    return !!this.config;
  }

  /**
   * Sync files from NextCloud (implements IntegrationAdapter interface)
   */
  async sync(): Promise<void> {
    await this.syncFiles();
  }

  /**
   * Sync files from NextCloud with options
   */
  async syncFiles(options?: { fullSync?: boolean; path?: string }): Promise<{
    success: boolean;
    itemsProcessed: number;
    errors?: string[];
  }> {
    if (!this.config) {
      return { success: false, itemsProcessed: 0, errors: ['Not configured'] };
    }

    const errors: string[] = [];
    let itemsProcessed = 0;

    try {
      const path = options?.path || this.config.defaultFolder;
      const files = await this.apiClient.listFiles({ path, depth: 'infinity' });

      const newSyncState = NextcloudDataMapper.createSyncState(files);

      if (!options?.fullSync && this.syncState.size > 0) {
        const changes = NextcloudDataMapper.detectChanges(
          this.syncState,
          newSyncState,
        );
        itemsProcessed =
          changes.added.length +
          changes.modified.length +
          changes.deleted.length;
        this.logger.log(
          `Sync detected ${changes.added.length} new, ${changes.modified.length} modified, ${changes.deleted.length} deleted files`,
        );
      } else {
        itemsProcessed = files.length;
      }

      this.syncState = newSyncState;

      return { success: true, itemsProcessed };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      this.logger.error('Sync failed', error);
      return { success: false, itemsProcessed, errors };
    }
  }

  // ===========================================================================
  // FILE OPERATIONS
  // ===========================================================================

  /**
   * List files in a directory
   */
  async listFiles(params?: NextcloudFileQueryParams): Promise<CrmAttachment[]> {
    this.ensureConfigured();
    const files = await this.apiClient.listFiles(params);
    return NextcloudDataMapper.filesToCrmAttachments(files);
  }

  /**
   * Get file info
   */
  async getFileInfo(path: string): Promise<CrmAttachment | null> {
    this.ensureConfigured();
    const file = await this.apiClient.getFileInfo(path);
    return file ? NextcloudDataMapper.fileToCrmAttachment(file) : null;
  }

  /**
   * Download file content
   */
  async downloadFile(path: string): Promise<Buffer> {
    this.ensureConfigured();
    return this.apiClient.downloadFile(path);
  }

  /**
   * Upload file
   */
  async uploadFile(
    path: string,
    content: Buffer | string,
    contentType?: string,
  ): Promise<CrmAttachment | null> {
    this.ensureConfigured();
    await this.apiClient.uploadFile(path, content, contentType);
    return this.getFileInfo(path);
  }

  /**
   * Upload file to CRM entity folder
   */
  async uploadToEntity(
    entityType: 'project' | 'client' | 'lead' | 'task',
    entity: { id: string; name: string },
    fileName: string,
    content: Buffer | string,
    contentType?: string,
  ): Promise<CrmAttachment | null> {
    this.ensureConfigured();

    const folder = NextcloudDataMapper.mapCrmEntityToFolderStructure(
      entityType,
      entity,
    );

    // Ensure folder exists
    await this.ensureFolderExists(folder);

    const path = `${folder}/${fileName}`;
    return this.uploadFile(path, content, contentType);
  }

  /**
   * Create folder
   */
  async createFolder(path: string): Promise<void> {
    this.ensureConfigured();
    await this.apiClient.createFolder(path);
  }

  /**
   * Ensure folder exists (create recursively if needed)
   */
  async ensureFolderExists(path: string): Promise<void> {
    this.ensureConfigured();

    const parts = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      try {
        const info = await this.apiClient.getFileInfo(currentPath);
        if (!info) {
          await this.apiClient.createFolder(currentPath);
        }
      } catch {
        await this.apiClient.createFolder(currentPath);
      }
    }
  }

  /**
   * Delete file or folder
   */
  async deleteFile(path: string): Promise<void> {
    this.ensureConfigured();
    await this.apiClient.deleteFile(path);
  }

  /**
   * Move file or folder
   */
  async moveFile(source: string, destination: string): Promise<void> {
    this.ensureConfigured();
    await this.apiClient.moveFile(source, destination);
  }

  /**
   * Copy file or folder
   */
  async copyFile(source: string, destination: string): Promise<void> {
    this.ensureConfigured();
    await this.apiClient.copyFile(source, destination);
  }

  // ===========================================================================
  // SHARE OPERATIONS
  // ===========================================================================

  /**
   * List shares
   */
  async listShares(params?: NextcloudShareQueryParams): Promise<CrmShare[]> {
    this.ensureConfigured();
    const shares = await this.apiClient.getShares(params);
    return NextcloudDataMapper.sharesToCrmShares(shares);
  }

  /**
   * Get share by ID
   */
  async getShare(shareId: string): Promise<CrmShare | null> {
    this.ensureConfigured();
    try {
      const share = await this.apiClient.getShare(shareId);
      return NextcloudDataMapper.shareToCrmShare(share);
    } catch {
      return null;
    }
  }

  /**
   * Create a share
   */
  async createShare(
    shareData: Partial<CrmShare> & { resourcePath: string },
  ): Promise<CrmShare> {
    this.ensureConfigured();
    const payload = NextcloudDataMapper.crmShareToCreatePayload(shareData);
    const share = await this.apiClient.createShare(payload);
    return NextcloudDataMapper.shareToCrmShare(share);
  }

  /**
   * Create public link share
   */
  async createPublicLink(
    path: string,
    options?: {
      password?: string;
      expireDate?: Date;
      permissions?: CrmShare['permissions'];
    },
  ): Promise<CrmShare> {
    this.ensureConfigured();

    const payload: NextcloudCreateSharePayload = {
      path,
      shareType: 3, // PUBLIC_LINK
      password: options?.password,
      expireDate: options?.expireDate
        ? options.expireDate.toISOString().split('T')[0]
        : undefined,
      permissions: options?.permissions
        ? NextcloudDataMapper.convertPermissionsToBitmask(options.permissions)
        : 1, // READ only
    };

    const share = await this.apiClient.createShare(payload);
    return NextcloudDataMapper.shareToCrmShare(share);
  }

  /**
   * Share with user
   */
  async shareWithUser(
    path: string,
    userId: string,
    permissions?: CrmShare['permissions'],
  ): Promise<CrmShare> {
    this.ensureConfigured();

    const payload: NextcloudCreateSharePayload = {
      path,
      shareType: 0, // USER
      shareWith: userId,
      permissions: permissions
        ? NextcloudDataMapper.convertPermissionsToBitmask(permissions)
        : 1, // READ only
    };

    const share = await this.apiClient.createShare(payload);
    return NextcloudDataMapper.shareToCrmShare(share);
  }

  /**
   * Delete a share
   */
  async deleteShare(shareId: string): Promise<void> {
    this.ensureConfigured();
    await this.apiClient.deleteShare(shareId);
  }

  // ===========================================================================
  // USER OPERATIONS
  // ===========================================================================

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<CrmIntegrationUser> {
    this.ensureConfigured();
    const user = await this.apiClient.getCurrentUser();
    return NextcloudDataMapper.userToCrmUser(user);
  }

  /**
   * Search users
   */
  async searchUsers(search?: string): Promise<string[]> {
    this.ensureConfigured();
    return this.apiClient.searchUsers({ search });
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<CrmIntegrationUser | null> {
    this.ensureConfigured();
    try {
      const user = await this.apiClient.getUser(userId);
      return NextcloudDataMapper.userToCrmUser(user);
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // ACTIVITY OPERATIONS
  // ===========================================================================

  /**
   * Get recent activities
   */
  async getActivities(
    params?: NextcloudActivityQueryParams,
  ): Promise<CrmActivityLog[]> {
    this.ensureConfigured();
    const activities = await this.apiClient.getActivities(params);
    return NextcloudDataMapper.activitiesToCrmActivities(activities);
  }

  /**
   * Get activities for a specific file
   */
  async getFileActivities(
    fileId: string,
    limit?: number,
  ): Promise<CrmActivityLog[]> {
    this.ensureConfigured();
    const activities = await this.apiClient.getActivities({
      objectType: 'files',
      objectId: parseInt(fileId, 10),
      limit,
    });
    return NextcloudDataMapper.activitiesToCrmActivities(activities);
  }

  // ===========================================================================
  // ENTITY INTEGRATION
  // ===========================================================================

  /**
   * Setup folder structure for CRM entity
   */
  async setupEntityFolder(
    entityType: 'project' | 'client' | 'lead' | 'task',
    entity: { id: string; name: string },
  ): Promise<string> {
    this.ensureConfigured();

    const folder = NextcloudDataMapper.mapCrmEntityToFolderStructure(
      entityType,
      entity,
    );
    await this.ensureFolderExists(folder);

    // Create subfolders for organization
    const subfolders = ['Documents', 'Images', 'Contracts', 'Reports'];
    for (const subfolder of subfolders) {
      await this.ensureFolderExists(`${folder}/${subfolder}`);
    }

    return folder;
  }

  /**
   * Get files for CRM entity
   */
  async getEntityFiles(
    entityType: 'project' | 'client' | 'lead' | 'task',
    entity: { id: string; name: string },
  ): Promise<CrmAttachment[]> {
    this.ensureConfigured();

    const folder = NextcloudDataMapper.mapCrmEntityToFolderStructure(
      entityType,
      entity,
    );

    try {
      return await this.listFiles({ path: folder, depth: 'infinity' });
    } catch {
      // Folder doesn't exist yet
      return [];
    }
  }

  /**
   * Get server capabilities
   */
  async getCapabilities(): Promise<Record<string, unknown>> {
    this.ensureConfigured();
    return this.apiClient.getCapabilities();
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Ensure the adapter is configured
   */
  private ensureConfigured(): void {
    if (!this.config) {
      throw new Error('NextCloud adapter not configured');
    }
  }
}
