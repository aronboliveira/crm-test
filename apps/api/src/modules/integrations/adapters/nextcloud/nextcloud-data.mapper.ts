/**
 * NextCloud Data Mapper
 *
 * Handles bidirectional mapping between NextCloud API entities
 * and CRM internal entities.
 */

import type {
  NextcloudFile,
  NextcloudShare,
  NextcloudUser,
  NextcloudActivity,
  NextcloudShareType,
  NextcloudCreateSharePayload,
} from './nextcloud.types';
import {
  NEXTCLOUD_SHARE_TYPES,
  NEXTCLOUD_PERMISSIONS,
} from './nextcloud.types';

// =============================================================================
// CRM ENTITY TYPES (for mapping)
// =============================================================================

/** CRM Attachment entity */
export interface CrmAttachment {
  id: string;
  name: string;
  path: string;
  mimeType?: string;
  size: number;
  lastModified: Date;
  isFolder: boolean;
  parentId?: string;
  source: 'nextcloud';
  metadata: Record<string, unknown>;
}

/** CRM Share/Collaboration entity */
export interface CrmShare {
  id: string;
  resourcePath: string;
  resourceType: 'file' | 'folder';
  shareType: 'user' | 'group' | 'link' | 'email';
  sharedWith?: string;
  sharedWithName?: string;
  permissions: {
    read: boolean;
    write: boolean;
    create: boolean;
    delete: boolean;
    share: boolean;
  };
  createdAt: Date;
  expiresAt?: Date;
  url?: string;
  password?: boolean;
  note?: string;
  owner: {
    id: string;
    displayName: string;
  };
  source: 'nextcloud';
  metadata: Record<string, unknown>;
}

/** CRM User entity (simplified for integrations) */
export interface CrmIntegrationUser {
  id: string;
  displayName: string;
  email?: string;
  source: 'nextcloud';
  quota?: {
    used: number;
    total: number;
    percentage: number;
  };
  metadata: Record<string, unknown>;
}

/** CRM Activity entity */
export interface CrmActivityLog {
  id: string;
  type: string;
  user: string;
  subject: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  link?: string;
  timestamp: Date;
  source: 'nextcloud';
  metadata: Record<string, unknown>;
}

// =============================================================================
// NEXTCLOUD DATA MAPPER
// =============================================================================

export class NextcloudDataMapper {
  // ===========================================================================
  // FILE MAPPING
  // ===========================================================================

  /**
   * Map NextCloud file to CRM attachment
   */
  static fileToCrmAttachment(file: NextcloudFile): CrmAttachment {
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      mimeType: file.mimetype,
      size: file.size,
      lastModified: file.lastModified,
      isFolder: file.type === 'dir',
      parentId: file.parentId,
      source: 'nextcloud',
      metadata: {
        etag: file.etag,
        permissions: file.permissions,
        favorite: file.favorite,
        hasPreview: file.hasPreview,
        ownerDisplayName: file.ownerDisplayName,
      },
    };
  }

  /**
   * Map multiple NextCloud files to CRM attachments
   */
  static filesToCrmAttachments(files: NextcloudFile[]): CrmAttachment[] {
    return files.map((file) => this.fileToCrmAttachment(file));
  }

  /**
   * Map CRM attachment to NextCloud upload path
   */
  static crmAttachmentToUploadPath(
    attachment: { name: string; folder?: string },
    baseFolder: string = '/CRM',
  ): string {
    const folder = attachment.folder || baseFolder;
    return `${folder}/${attachment.name}`.replace(/\/+/g, '/');
  }

  // ===========================================================================
  // SHARE MAPPING
  // ===========================================================================

  /**
   * Map NextCloud share type to CRM share type
   */
  static mapShareType(shareType: NextcloudShareType): CrmShare['shareType'] {
    switch (shareType) {
      case NEXTCLOUD_SHARE_TYPES.USER:
        return 'user';
      case NEXTCLOUD_SHARE_TYPES.GROUP:
        return 'group';
      case NEXTCLOUD_SHARE_TYPES.PUBLIC_LINK:
        return 'link';
      case NEXTCLOUD_SHARE_TYPES.EMAIL:
        return 'email';
      case NEXTCLOUD_SHARE_TYPES.FEDERATED_CLOUD:
        return 'user'; // Treat federated as user
      case NEXTCLOUD_SHARE_TYPES.CIRCLE:
        return 'group'; // Treat circle as group
      case NEXTCLOUD_SHARE_TYPES.TALK_CONVERSATION:
        return 'group'; // Treat talk as group
      default:
        return 'link';
    }
  }

  /**
   * Map CRM share type to NextCloud share type
   */
  static mapCrmShareType(shareType: CrmShare['shareType']): NextcloudShareType {
    switch (shareType) {
      case 'user':
        return NEXTCLOUD_SHARE_TYPES.USER;
      case 'group':
        return NEXTCLOUD_SHARE_TYPES.GROUP;
      case 'link':
        return NEXTCLOUD_SHARE_TYPES.PUBLIC_LINK;
      case 'email':
        return NEXTCLOUD_SHARE_TYPES.EMAIL;
      default:
        return NEXTCLOUD_SHARE_TYPES.PUBLIC_LINK;
    }
  }

  /**
   * Parse NextCloud permissions bitmask
   */
  static parsePermissions(permissions: number): CrmShare['permissions'] {
    return {
      read: (permissions & NEXTCLOUD_PERMISSIONS.READ) !== 0,
      write: (permissions & NEXTCLOUD_PERMISSIONS.UPDATE) !== 0,
      create: (permissions & NEXTCLOUD_PERMISSIONS.CREATE) !== 0,
      delete: (permissions & NEXTCLOUD_PERMISSIONS.DELETE) !== 0,
      share: (permissions & NEXTCLOUD_PERMISSIONS.SHARE) !== 0,
    };
  }

  /**
   * Convert CRM permissions to NextCloud bitmask
   */
  static convertPermissionsToBitmask(
    permissions: CrmShare['permissions'],
  ): number {
    let bitmask = 0;
    if (permissions.read) bitmask |= NEXTCLOUD_PERMISSIONS.READ;
    if (permissions.write) bitmask |= NEXTCLOUD_PERMISSIONS.UPDATE;
    if (permissions.create) bitmask |= NEXTCLOUD_PERMISSIONS.CREATE;
    if (permissions.delete) bitmask |= NEXTCLOUD_PERMISSIONS.DELETE;
    if (permissions.share) bitmask |= NEXTCLOUD_PERMISSIONS.SHARE;
    return bitmask;
  }

  /**
   * Map NextCloud share to CRM share
   */
  static shareToCrmShare(share: NextcloudShare): CrmShare {
    return {
      id: share.id,
      resourcePath: share.path,
      resourceType: share.itemType === 'folder' ? 'folder' : 'file',
      shareType: this.mapShareType(share.shareType),
      sharedWith: share.shareWith,
      sharedWithName: share.shareWithDisplayname,
      permissions: this.parsePermissions(share.permissions),
      createdAt: new Date(share.stime * 1000),
      expiresAt: share.expiration ? new Date(share.expiration) : undefined,
      url: share.url,
      password: share.password,
      note: share.note,
      owner: {
        id: share.uidOwner,
        displayName: share.displaynameOwner,
      },
      source: 'nextcloud',
      metadata: {
        token: share.token,
        label: share.label,
        hideDownload: share.hideDownload,
        uidFileOwner: share.uidFileOwner,
        displaynameFileOwner: share.displaynameFileOwner,
      },
    };
  }

  /**
   * Map multiple NextCloud shares to CRM shares
   */
  static sharesToCrmShares(shares: NextcloudShare[]): CrmShare[] {
    return shares.map((share) => this.shareToCrmShare(share));
  }

  /**
   * Map CRM share to NextCloud create share payload
   */
  static crmShareToCreatePayload(
    share: Partial<CrmShare> & { resourcePath: string },
  ): NextcloudCreateSharePayload {
    return {
      path: share.resourcePath,
      shareType: this.mapCrmShareType(share.shareType || 'link'),
      shareWith: share.sharedWith,
      permissions: share.permissions
        ? this.convertPermissionsToBitmask(share.permissions)
        : NEXTCLOUD_PERMISSIONS.READ,
      expireDate: share.expiresAt
        ? share.expiresAt.toISOString().split('T')[0]
        : undefined,
      note: share.note,
    };
  }

  // ===========================================================================
  // USER MAPPING
  // ===========================================================================

  /**
   * Map NextCloud user to CRM integration user
   */
  static userToCrmUser(user: NextcloudUser): CrmIntegrationUser {
    return {
      id: user.id,
      displayName: user.displayname,
      email: user.email,
      source: 'nextcloud',
      quota: {
        used: user.quota.used,
        total: user.quota.total,
        percentage: user.quota.relative,
      },
      metadata: {
        groups: user.groups,
        enabled: user.enabled,
        lastLogin: user.lastLogin,
        language: user.language,
        locale: user.locale,
      },
    };
  }

  /**
   * Map multiple NextCloud users to CRM users
   */
  static usersToCrmUsers(users: NextcloudUser[]): CrmIntegrationUser[] {
    return users.map((user) => this.userToCrmUser(user));
  }

  // ===========================================================================
  // ACTIVITY MAPPING
  // ===========================================================================

  /**
   * Map NextCloud activity to CRM activity log
   */
  static activityToCrmActivity(activity: NextcloudActivity): CrmActivityLog {
    return {
      id: activity.activityId.toString(),
      type: activity.type,
      user: activity.user,
      subject: activity.subject,
      message: activity.message,
      resourceType: activity.objectType,
      resourceId: activity.objectId?.toString(),
      resourceName: activity.objectName,
      link: activity.link,
      timestamp: new Date(activity.datetime),
      source: 'nextcloud',
      metadata: {
        app: activity.app,
        icon: activity.icon,
        subjectRich: activity.subjectRich,
        messageRich: activity.messageRich,
      },
    };
  }

  /**
   * Map multiple NextCloud activities to CRM activity logs
   */
  static activitiesToCrmActivities(
    activities: NextcloudActivity[],
  ): CrmActivityLog[] {
    return activities.map((activity) => this.activityToCrmActivity(activity));
  }

  // ===========================================================================
  // FOLDER STRUCTURE MAPPING
  // ===========================================================================

  /**
   * Map CRM entity to NextCloud folder structure
   */
  static mapCrmEntityToFolderStructure(
    entityType: 'project' | 'client' | 'lead' | 'task',
    entity: { id: string; name: string },
  ): string {
    const sanitizedName = entity.name
      .replace(/[<>:"/\\|?*]/g, '-')
      .substring(0, 100);
    return `/CRM/${entityType}s/${entity.id}_${sanitizedName}`;
  }

  /**
   * Extract CRM entity info from NextCloud folder path
   */
  static extractEntityFromPath(
    path: string,
  ): { entityType: string; entityId: string; entityName: string } | null {
    const match = path.match(
      /\/CRM\/(project|client|lead|task)s\/([a-f0-9-]+)_(.+)/i,
    );
    if (!match) return null;

    return {
      entityType: match[1],
      entityId: match[2],
      entityName: match[3],
    };
  }

  // ===========================================================================
  // SYNC STATE MAPPING
  // ===========================================================================

  /**
   * Create sync state from files
   */
  static createSyncState(
    files: NextcloudFile[],
  ): Map<string, { etag: string; lastModified: Date }> {
    const state = new Map<string, { etag: string; lastModified: Date }>();
    for (const file of files) {
      state.set(file.path, {
        etag: file.etag,
        lastModified: file.lastModified,
      });
    }
    return state;
  }

  /**
   * Detect changes between two sync states
   */
  static detectChanges(
    oldState: Map<string, { etag: string; lastModified: Date }>,
    newState: Map<string, { etag: string; lastModified: Date }>,
  ): {
    added: string[];
    modified: string[];
    deleted: string[];
  } {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    // Check for new and modified files
    for (const [path, newInfo] of newState) {
      const oldInfo = oldState.get(path);
      if (!oldInfo) {
        added.push(path);
      } else if (oldInfo.etag !== newInfo.etag) {
        modified.push(path);
      }
    }

    // Check for deleted files
    for (const path of oldState.keys()) {
      if (!newState.has(path)) {
        deleted.push(path);
      }
    }

    return { added, modified, deleted };
  }
}
