import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
  NextcloudOcsResponse,
  NextcloudFile,
  NextcloudShare,
  NextcloudUser,
  NextcloudActivity,
  NextcloudCreateSharePayload,
  NextcloudUpdateSharePayload,
  NextcloudFileQueryParams,
  NextcloudShareQueryParams,
  NextcloudActivityQueryParams,
  NextcloudUserSearchParams,
  NextcloudWebdavProps,
} from './nextcloud.types';

/**
 * Low-level HTTP client for NextCloud WebDAV and OCS APIs.
 * Handles authentication and all API requests.
 *
 * @see https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/
 * @see https://docs.nextcloud.com/server/latest/developer_manual/client_apis/OCS/
 */
@Injectable()
export class NextcloudApiClient {
  private readonly logger = new Logger(NextcloudApiClient.name);
  private baseUrl: string = '';
  private username: string = '';
  private password: string = '';
  private appPassword: string = '';

  constructor(private readonly httpService: HttpService) {}

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Configure the client with NextCloud server details
   */
  configure(config: {
    baseUrl: string;
    username: string;
    password?: string;
    appPassword?: string;
  }): void {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password || '';
    this.appPassword = config.appPassword || '';
  }

  /**
   * Get authorization header for requests
   */
  private getAuthHeader(): string {
    const auth = this.appPassword || this.password;
    const credentials = Buffer.from(`${this.username}:${auth}`).toString(
      'base64',
    );
    return `Basic ${credentials}`;
  }

  /**
   * Get common request headers
   */
  private getHeaders(
    additionalHeaders?: Record<string, string>,
  ): Record<string, string> {
    return {
      Authorization: this.getAuthHeader(),
      'OCS-APIRequest': 'true',
      ...additionalHeaders,
    };
  }

  // ===========================================================================
  // WEBDAV OPERATIONS (FILES)
  // ===========================================================================

  /**
   * List files and folders using WebDAV PROPFIND
   */
  async listFiles(
    params: NextcloudFileQueryParams = {},
  ): Promise<NextcloudFile[]> {
    const path = params.path || '/';
    const depth = params.depth || '1';

    const propfindBody = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:getlastmodified />
    <d:getetag />
    <d:getcontenttype />
    <d:getcontentlength />
    <d:resourcetype />
    <oc:id />
    <oc:fileid />
    <oc:permissions />
    <oc:size />
    <oc:favorite />
    <nc:has-preview />
    <oc:owner-display-name />
  </d:prop>
</d:propfind>`;

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'PROPFIND',
          url: `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`,
          headers: {
            ...this.getHeaders({
              'Content-Type': 'application/xml',
            }),
            Depth: depth,
          },
          data: propfindBody,
        }),
      );

      return this.parseWebdavResponse(response.data, path);
    } catch (error) {
      this.logger.error(`Failed to list files at ${path}`, error);
      throw error;
    }
  }

  /**
   * Parse WebDAV XML response to NextcloudFile array
   */
  private parseWebdavResponse(xmlData: string, basePath: string): NextcloudFile[] {
    const files: NextcloudFile[] = [];
    // Simple XML parsing for WebDAV response
    const responsePattern = /<d:response>([\s\S]*?)<\/d:response>/g;
    let match;

    while ((match = responsePattern.exec(xmlData)) !== null) {
      const responseBlock = match[1];
      const file = this.parseFileFromResponse(responseBlock, basePath);
      if (file) {
        files.push(file);
      }
    }

    return files;
  }

  /**
   * Parse individual file from WebDAV response block
   */
  private parseFileFromResponse(
    responseBlock: string,
    basePath: string,
  ): NextcloudFile | null {
    const getValue = (tag: string): string | undefined => {
      const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`);
      const match = pattern.exec(responseBlock);
      return match?.[1];
    };

    const href = getValue('d:href');
    if (!href) return null;

    // Skip the base path itself
    const decodedHref = decodeURIComponent(href);
    const pathPrefix = `/remote.php/dav/files/${this.username}`;
    const filePath = decodedHref.replace(pathPrefix, '');

    if (filePath === basePath || filePath === basePath + '/') {
      return null;
    }

    const isFolder = responseBlock.includes('<d:collection');
    const name = filePath.split('/').filter(Boolean).pop() || '';

    return {
      id: getValue('oc:fileid') || getValue('oc:id') || '',
      path: filePath,
      name,
      type: isFolder ? 'dir' : 'file',
      mimetype: getValue('d:getcontenttype'),
      size: parseInt(getValue('oc:size') || getValue('d:getcontentlength') || '0', 10),
      etag: (getValue('d:getetag') || '').replace(/"/g, ''),
      lastModified: new Date(getValue('d:getlastmodified') || Date.now()),
      permissions: getValue('oc:permissions') || '',
      favorite: getValue('oc:favorite') === '1',
      hasPreview: getValue('nc:has-preview') === 'true',
      ownerDisplayName: getValue('oc:owner-display-name'),
    };
  }

  /**
   * Get file info using WebDAV PROPFIND with depth 0
   */
  async getFileInfo(path: string): Promise<NextcloudFile | null> {
    const files = await this.listFiles({ path, depth: '0' });
    return files[0] || null;
  }

  /**
   * Download file content
   */
  async downloadFile(path: string): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`,
          {
            headers: this.getHeaders(),
            responseType: 'arraybuffer',
          },
        ),
      );
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download file ${path}`, error);
      throw error;
    }
  }

  /**
   * Upload file content
   */
  async uploadFile(
    path: string,
    content: Buffer | string,
    contentType?: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`,
          content,
          {
            headers: this.getHeaders({
              'Content-Type': contentType || 'application/octet-stream',
            }),
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to upload file ${path}`, error);
      throw error;
    }
  }

  /**
   * Create folder
   */
  async createFolder(path: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.request({
          method: 'MKCOL',
          url: `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`,
          headers: this.getHeaders(),
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to create folder ${path}`, error);
      throw error;
    }
  }

  /**
   * Delete file or folder
   */
  async deleteFile(path: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/remote.php/dav/files/${this.username}${path}`,
          {
            headers: this.getHeaders(),
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to delete ${path}`, error);
      throw error;
    }
  }

  /**
   * Move or rename file/folder
   */
  async moveFile(source: string, destination: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.request({
          method: 'MOVE',
          url: `${this.baseUrl}/remote.php/dav/files/${this.username}${source}`,
          headers: this.getHeaders({
            Destination: `${this.baseUrl}/remote.php/dav/files/${this.username}${destination}`,
            Overwrite: 'F',
          }),
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to move ${source} to ${destination}`, error);
      throw error;
    }
  }

  /**
   * Copy file/folder
   */
  async copyFile(source: string, destination: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.request({
          method: 'COPY',
          url: `${this.baseUrl}/remote.php/dav/files/${this.username}${source}`,
          headers: this.getHeaders({
            Destination: `${this.baseUrl}/remote.php/dav/files/${this.username}${destination}`,
            Overwrite: 'F',
          }),
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to copy ${source} to ${destination}`, error);
      throw error;
    }
  }

  // ===========================================================================
  // OCS SHARE API
  // ===========================================================================

  /**
   * List shares
   */
  async getShares(
    params: NextcloudShareQueryParams = {},
  ): Promise<NextcloudShare[]> {
    const queryParams = new URLSearchParams();
    if (params.path) queryParams.append('path', params.path);
    if (params.reshares) queryParams.append('reshares', 'true');
    if (params.subfiles) queryParams.append('subfiles', 'true');
    if (params.sharedWithMe) queryParams.append('shared_with_me', 'true');

    try {
      const response = await firstValueFrom(
        this.httpService.get<NextcloudOcsResponse<NextcloudShare[]>>(
          `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares?${queryParams.toString()}`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
      return response.data.ocs.data;
    } catch (error) {
      this.logger.error('Failed to get shares', error);
      throw error;
    }
  }

  /**
   * Get share by ID
   */
  async getShare(shareId: string): Promise<NextcloudShare> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NextcloudOcsResponse<NextcloudShare[]>>(
          `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares/${shareId}`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
      return response.data.ocs.data[0];
    } catch (error) {
      this.logger.error(`Failed to get share ${shareId}`, error);
      throw error;
    }
  }

  /**
   * Create a new share
   */
  async createShare(
    payload: NextcloudCreateSharePayload,
  ): Promise<NextcloudShare> {
    const formData = new URLSearchParams();
    formData.append('path', payload.path);
    formData.append('shareType', payload.shareType.toString());
    if (payload.shareWith) formData.append('shareWith', payload.shareWith);
    if (payload.publicUpload)
      formData.append('publicUpload', payload.publicUpload.toString());
    if (payload.password) formData.append('password', payload.password);
    if (payload.expireDate) formData.append('expireDate', payload.expireDate);
    if (payload.permissions)
      formData.append('permissions', payload.permissions.toString());
    if (payload.note) formData.append('note', payload.note);
    if (payload.label) formData.append('label', payload.label);

    try {
      const response = await firstValueFrom(
        this.httpService.post<NextcloudOcsResponse<NextcloudShare>>(
          `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
          formData.toString(),
          {
            headers: this.getHeaders({
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            }),
          },
        ),
      );
      return response.data.ocs.data;
    } catch (error) {
      this.logger.error('Failed to create share', error);
      throw error;
    }
  }

  /**
   * Update an existing share
   */
  async updateShare(
    shareId: string,
    payload: NextcloudUpdateSharePayload,
  ): Promise<NextcloudShare> {
    const formData = new URLSearchParams();
    if (payload.permissions !== undefined)
      formData.append('permissions', payload.permissions.toString());
    if (payload.password) formData.append('password', payload.password);
    if (payload.expireDate) formData.append('expireDate', payload.expireDate);
    if (payload.note) formData.append('note', payload.note);
    if (payload.label) formData.append('label', payload.label);
    if (payload.hideDownload !== undefined)
      formData.append('hideDownload', payload.hideDownload.toString());

    try {
      const response = await firstValueFrom(
        this.httpService.put<NextcloudOcsResponse<NextcloudShare>>(
          `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares/${shareId}`,
          formData.toString(),
          {
            headers: this.getHeaders({
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            }),
          },
        ),
      );
      return response.data.ocs.data;
    } catch (error) {
      this.logger.error(`Failed to update share ${shareId}`, error);
      throw error;
    }
  }

  /**
   * Delete a share
   */
  async deleteShare(shareId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares/${shareId}`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Failed to delete share ${shareId}`, error);
      throw error;
    }
  }

  // ===========================================================================
  // OCS USER/GROUP API
  // ===========================================================================

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<NextcloudUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NextcloudOcsResponse<NextcloudUser>>(
          `${this.baseUrl}/ocs/v2.php/cloud/user`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
      return response.data.ocs.data;
    } catch (error) {
      this.logger.error('Failed to get current user', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(params: NextcloudUserSearchParams = {}): Promise<string[]> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    try {
      const response = await firstValueFrom(
        this.httpService.get<NextcloudOcsResponse<{ users: string[] }>>(
          `${this.baseUrl}/ocs/v2.php/cloud/users?${queryParams.toString()}`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
      return response.data.ocs.data.users;
    } catch (error) {
      this.logger.error('Failed to search users', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<NextcloudUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NextcloudOcsResponse<NextcloudUser>>(
          `${this.baseUrl}/ocs/v2.php/cloud/users/${encodeURIComponent(userId)}`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
      return response.data.ocs.data;
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}`, error);
      throw error;
    }
  }

  // ===========================================================================
  // ACTIVITY API
  // ===========================================================================

  /**
   * Get activities
   */
  async getActivities(
    params: NextcloudActivityQueryParams = {},
  ): Promise<NextcloudActivity[]> {
    const queryParams = new URLSearchParams();
    if (params.since) queryParams.append('since', params.since.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.objectType) queryParams.append('object_type', params.objectType);
    if (params.objectId)
      queryParams.append('object_id', params.objectId.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    try {
      const response = await firstValueFrom(
        this.httpService.get<NextcloudOcsResponse<NextcloudActivity[]>>(
          `${this.baseUrl}/ocs/v2.php/apps/activity/api/v2/activity?${queryParams.toString()}`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
      return response.data.ocs.data;
    } catch (error) {
      this.logger.error('Failed to get activities', error);
      throw error;
    }
  }

  // ===========================================================================
  // SERVER CAPABILITIES
  // ===========================================================================

  /**
   * Get server capabilities
   */
  async getCapabilities(): Promise<Record<string, unknown>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NextcloudOcsResponse<{ capabilities: Record<string, unknown> }>>(
          `${this.baseUrl}/ocs/v2.php/cloud/capabilities`,
          {
            headers: this.getHeaders({ Accept: 'application/json' }),
          },
        ),
      );
      return response.data.ocs.data.capabilities;
    } catch (error) {
      this.logger.error('Failed to get capabilities', error);
      throw error;
    }
  }

  /**
   * Test connection to NextCloud server
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }
}
