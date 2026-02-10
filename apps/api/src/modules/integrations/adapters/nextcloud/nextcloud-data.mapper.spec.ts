/**
 * NextCloud Data Mapper Unit Tests
 *
 * Tests the bidirectional mapping between NextCloud API entities
 * and CRM internal entities.
 */

import { NextcloudDataMapper } from './nextcloud-data.mapper';
import {
  NEXTCLOUD_SHARE_TYPES,
  NEXTCLOUD_PERMISSIONS,
} from './nextcloud.types';
import type {
  NextcloudFile,
  NextcloudShare,
  NextcloudUser,
  NextcloudActivity,
} from './nextcloud.types';

describe('NextcloudDataMapper', () => {
  describe('File Mapping', () => {
    const mockNextcloudFile: NextcloudFile = {
      id: '12345',
      path: '/CRM/projects/test.pdf',
      name: 'test.pdf',
      type: 'file',
      mimetype: 'application/pdf',
      size: 1024000,
      etag: 'abc123',
      lastModified: new Date('2024-01-15T10:00:00Z'),
      permissions: 'RGDNVCK',
      favorite: false,
      hasPreview: true,
      ownerDisplayName: 'Admin User',
    };

    it('should map NextCloud file to CRM attachment', () => {
      const result = NextcloudDataMapper.fileToCrmAttachment(mockNextcloudFile);

      expect(result.id).toBe('12345');
      expect(result.name).toBe('test.pdf');
      expect(result.path).toBe('/CRM/projects/test.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(1024000);
      expect(result.isFolder).toBe(false);
      expect(result.source).toBe('nextcloud');
      expect(result.metadata.etag).toBe('abc123');
    });

    it('should correctly identify folders', () => {
      const folder: NextcloudFile = {
        ...mockNextcloudFile,
        type: 'dir',
        name: 'Documents',
        path: '/CRM/Documents',
        mimetype: undefined,
      };

      const result = NextcloudDataMapper.fileToCrmAttachment(folder);

      expect(result.isFolder).toBe(true);
    });

    it('should map multiple files', () => {
      const files = [
        mockNextcloudFile,
        { ...mockNextcloudFile, id: '12346', name: 'test2.pdf' },
      ];

      const result = NextcloudDataMapper.filesToCrmAttachments(files);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('12345');
      expect(result[1].id).toBe('12346');
    });

    it('should generate correct upload paths', () => {
      const attachment = { name: 'document.pdf', folder: '/Custom' };
      const result = NextcloudDataMapper.crmAttachmentToUploadPath(attachment);

      expect(result).toBe('/Custom/document.pdf');
    });

    it('should use default folder when not specified', () => {
      const attachment = { name: 'document.pdf' };
      const result = NextcloudDataMapper.crmAttachmentToUploadPath(attachment);

      expect(result).toBe('/CRM/document.pdf');
    });
  });

  describe('Share Mapping', () => {
    const mockNextcloudShare: NextcloudShare = {
      id: '500',
      shareType: NEXTCLOUD_SHARE_TYPES.USER,
      shareWith: 'john',
      shareWithDisplayname: 'John Doe',
      path: '/CRM/projects/proposal.pdf',
      itemType: 'file',
      permissions: NEXTCLOUD_PERMISSIONS.ALL,
      stime: 1705320000, // Unix timestamp
      expiration: '2024-02-15',
      token: 'abc123token',
      url: 'https://cloud.example.com/s/abc123token',
      uidOwner: 'admin',
      displaynameOwner: 'Admin User',
      uidFileOwner: 'admin',
      displaynameFileOwner: 'Admin User',
      password: false,
      note: 'Project proposal',
      label: 'Important',
    };

    it('should map NextCloud share to CRM share', () => {
      const result = NextcloudDataMapper.shareToCrmShare(mockNextcloudShare);

      expect(result.id).toBe('500');
      expect(result.shareType).toBe('user');
      expect(result.sharedWith).toBe('john');
      expect(result.sharedWithName).toBe('John Doe');
      expect(result.resourcePath).toBe('/CRM/projects/proposal.pdf');
      expect(result.resourceType).toBe('file');
      expect(result.note).toBe('Project proposal');
      expect(result.source).toBe('nextcloud');
    });

    it('should parse permissions correctly', () => {
      const result = NextcloudDataMapper.parsePermissions(
        NEXTCLOUD_PERMISSIONS.ALL,
      );

      expect(result.read).toBe(true);
      expect(result.write).toBe(true);
      expect(result.create).toBe(true);
      expect(result.delete).toBe(true);
      expect(result.share).toBe(true);
    });

    it('should parse read-only permissions', () => {
      const result = NextcloudDataMapper.parsePermissions(
        NEXTCLOUD_PERMISSIONS.READ,
      );

      expect(result.read).toBe(true);
      expect(result.write).toBe(false);
      expect(result.create).toBe(false);
      expect(result.delete).toBe(false);
      expect(result.share).toBe(false);
    });

    it('should convert permissions to bitmask', () => {
      const permissions = {
        read: true,
        write: true,
        create: false,
        delete: false,
        share: false,
      };

      const result =
        NextcloudDataMapper.convertPermissionsToBitmask(permissions);

      expect(result).toBe(
        NEXTCLOUD_PERMISSIONS.READ | NEXTCLOUD_PERMISSIONS.UPDATE,
      );
    });

    it('should map share types correctly', () => {
      expect(NextcloudDataMapper.mapShareType(NEXTCLOUD_SHARE_TYPES.USER)).toBe(
        'user',
      );
      expect(
        NextcloudDataMapper.mapShareType(NEXTCLOUD_SHARE_TYPES.GROUP),
      ).toBe('group');
      expect(
        NextcloudDataMapper.mapShareType(NEXTCLOUD_SHARE_TYPES.PUBLIC_LINK),
      ).toBe('link');
      expect(
        NextcloudDataMapper.mapShareType(NEXTCLOUD_SHARE_TYPES.EMAIL),
      ).toBe('email');
    });

    it('should map CRM share type to NextCloud', () => {
      expect(NextcloudDataMapper.mapCrmShareType('user')).toBe(
        NEXTCLOUD_SHARE_TYPES.USER,
      );
      expect(NextcloudDataMapper.mapCrmShareType('group')).toBe(
        NEXTCLOUD_SHARE_TYPES.GROUP,
      );
      expect(NextcloudDataMapper.mapCrmShareType('link')).toBe(
        NEXTCLOUD_SHARE_TYPES.PUBLIC_LINK,
      );
    });

    it('should create share payload from CRM share', () => {
      const crmShare = {
        resourcePath: '/CRM/test.pdf',
        shareType: 'link' as const,
        permissions: {
          read: true,
          write: false,
          create: false,
          delete: false,
          share: false,
        },
        note: 'Test share',
      };

      const result = NextcloudDataMapper.crmShareToCreatePayload(crmShare);

      expect(result.path).toBe('/CRM/test.pdf');
      expect(result.shareType).toBe(NEXTCLOUD_SHARE_TYPES.PUBLIC_LINK);
      expect(result.permissions).toBe(NEXTCLOUD_PERMISSIONS.READ);
      expect(result.note).toBe('Test share');
    });
  });

  describe('User Mapping', () => {
    const mockNextcloudUser: NextcloudUser = {
      id: 'john',
      displayname: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      enabled: true,
      groups: ['staff', 'sales'],
      quota: {
        free: 5000000000,
        used: 1000000000,
        total: 6000000000,
        relative: 16.67,
        quota: 10000000000,
      },
      language: 'en',
      locale: 'en_US',
      lastLogin: 1705320000,
    };

    it('should map NextCloud user to CRM integration user', () => {
      const result = NextcloudDataMapper.userToCrmUser(mockNextcloudUser);

      expect(result.id).toBe('john');
      expect(result.displayName).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.source).toBe('nextcloud');
      expect(result.quota?.used).toBe(1000000000);
      expect(result.quota?.total).toBe(6000000000);
      expect(result.metadata.groups).toEqual(['staff', 'sales']);
    });
  });

  describe('Activity Mapping', () => {
    const mockNextcloudActivity: NextcloudActivity = {
      activityId: 1000,
      app: 'files',
      type: 'file_created',
      user: 'admin',
      subject: 'You created test.pdf',
      subjectRich: [
        {
          type: 'file',
          id: '12345',
          name: 'test.pdf',
          path: '/CRM/test.pdf',
        },
      ],
      message: '',
      messageRich: [],
      objectType: 'files',
      objectId: 12345,
      objectName: 'test.pdf',
      link: 'https://cloud.example.com/f/12345',
      icon: 'https://cloud.example.com/core/img/filetypes/file.svg',
      datetime: '2024-01-15T10:00:00Z',
    };

    it('should map NextCloud activity to CRM activity log', () => {
      const result = NextcloudDataMapper.activityToCrmActivity(
        mockNextcloudActivity,
      );

      expect(result.id).toBe('1000');
      expect(result.type).toBe('file_created');
      expect(result.user).toBe('admin');
      expect(result.subject).toBe('You created test.pdf');
      expect(result.resourceType).toBe('files');
      expect(result.resourceId).toBe('12345');
      expect(result.resourceName).toBe('test.pdf');
      expect(result.source).toBe('nextcloud');
    });

    it('should map multiple activities', () => {
      const activities = [
        mockNextcloudActivity,
        { ...mockNextcloudActivity, activityId: 1001 },
      ];

      const result = NextcloudDataMapper.activitiesToCrmActivities(activities);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1000');
      expect(result[1].id).toBe('1001');
    });
  });

  describe('Folder Structure Mapping', () => {
    it('should map CRM entity to folder structure', () => {
      const result = NextcloudDataMapper.mapCrmEntityToFolderStructure(
        'project',
        {
          id: 'abc-123',
          name: 'Test Project',
        },
      );

      expect(result).toBe('/CRM/projects/abc-123_Test Project');
    });

    it('should sanitize special characters in names', () => {
      const result = NextcloudDataMapper.mapCrmEntityToFolderStructure(
        'client',
        {
          id: 'def-456',
          name: 'Test/Client:Name',
        },
      );

      expect(result).toBe('/CRM/clients/def-456_Test-Client-Name');
    });

    it('should extract entity info from path', () => {
      const result = NextcloudDataMapper.extractEntityFromPath(
        '/CRM/projects/abc-123_Test Project',
      );

      expect(result).not.toBeNull();
      expect(result?.entityType).toBe('project');
      expect(result?.entityId).toBe('abc-123');
      expect(result?.entityName).toBe('Test Project');
    });

    it('should return null for invalid paths', () => {
      const result = NextcloudDataMapper.extractEntityFromPath('/random/path');

      expect(result).toBeNull();
    });
  });

  describe('Sync State', () => {
    it('should create sync state from files', () => {
      const files: NextcloudFile[] = [
        {
          id: '1',
          path: '/test1.pdf',
          name: 'test1.pdf',
          type: 'file',
          size: 1000,
          etag: 'etag1',
          lastModified: new Date('2024-01-15'),
          permissions: 'R',
          favorite: false,
          hasPreview: false,
        },
        {
          id: '2',
          path: '/test2.pdf',
          name: 'test2.pdf',
          type: 'file',
          size: 2000,
          etag: 'etag2',
          lastModified: new Date('2024-01-16'),
          permissions: 'R',
          favorite: false,
          hasPreview: false,
        },
      ];

      const state = NextcloudDataMapper.createSyncState(files);

      expect(state.size).toBe(2);
      expect(state.get('/test1.pdf')?.etag).toBe('etag1');
      expect(state.get('/test2.pdf')?.etag).toBe('etag2');
    });

    it('should detect changes between sync states', () => {
      const oldState = new Map([
        ['/file1.pdf', { etag: 'old1', lastModified: new Date() }],
        ['/file2.pdf', { etag: 'old2', lastModified: new Date() }],
        ['/deleted.pdf', { etag: 'old3', lastModified: new Date() }],
      ]);

      const newState = new Map([
        ['/file1.pdf', { etag: 'old1', lastModified: new Date() }], // unchanged
        ['/file2.pdf', { etag: 'new2', lastModified: new Date() }], // modified
        ['/new.pdf', { etag: 'new3', lastModified: new Date() }], // added
      ]);

      const changes = NextcloudDataMapper.detectChanges(oldState, newState);

      expect(changes.added).toEqual(['/new.pdf']);
      expect(changes.modified).toEqual(['/file2.pdf']);
      expect(changes.deleted).toEqual(['/deleted.pdf']);
    });
  });
});
