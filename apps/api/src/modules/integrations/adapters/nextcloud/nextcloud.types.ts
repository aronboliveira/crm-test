/**
 * NextCloud API Types
 *
 * Type definitions for NextCloud WebDAV and OCS API responses and requests.
 * Based on NextCloud API documentation.
 *
 * @see https://docs.nextcloud.com/server/latest/developer_manual/client_apis/
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Share types supported by NextCloud */
export const NEXTCLOUD_SHARE_TYPES = {
  USER: 0,
  GROUP: 1,
  PUBLIC_LINK: 3,
  EMAIL: 4,
  FEDERATED_CLOUD: 6,
  CIRCLE: 7,
  TALK_CONVERSATION: 10,
} as const;

export type NextcloudShareType =
  (typeof NEXTCLOUD_SHARE_TYPES)[keyof typeof NEXTCLOUD_SHARE_TYPES];

/** Permission flags for shares */
export const NEXTCLOUD_PERMISSIONS = {
  READ: 1,
  UPDATE: 2,
  CREATE: 4,
  DELETE: 8,
  SHARE: 16,
  ALL: 31,
} as const;

export type NextcloudPermission =
  (typeof NEXTCLOUD_PERMISSIONS)[keyof typeof NEXTCLOUD_PERMISSIONS];

/** File types */
export const NEXTCLOUD_FILE_TYPES = {
  FILE: 'file',
  FOLDER: 'dir',
} as const;

export type NextcloudFileType =
  (typeof NEXTCLOUD_FILE_TYPES)[keyof typeof NEXTCLOUD_FILE_TYPES];

/** Activity types */
export const NEXTCLOUD_ACTIVITY_TYPES = {
  FILE_CREATED: 'file_created',
  FILE_CHANGED: 'file_changed',
  FILE_DELETED: 'file_deleted',
  FILE_RESTORED: 'file_restored',
  FILE_SHARED: 'shared',
  FILE_UNSHARED: 'unshared',
  COMMENT_ADDED: 'comments',
  TAG_ADDED: 'systemtag',
} as const;

export type NextcloudActivityType =
  (typeof NEXTCLOUD_ACTIVITY_TYPES)[keyof typeof NEXTCLOUD_ACTIVITY_TYPES];

// =============================================================================
// SHARE TYPE MAPS
// =============================================================================

/** Maps share type to display string */
export const NEXTCLOUD_SHARE_TYPE_MAP: Record<NextcloudShareType, string> = {
  [NEXTCLOUD_SHARE_TYPES.USER]: 'User',
  [NEXTCLOUD_SHARE_TYPES.GROUP]: 'Group',
  [NEXTCLOUD_SHARE_TYPES.PUBLIC_LINK]: 'Public Link',
  [NEXTCLOUD_SHARE_TYPES.EMAIL]: 'Email',
  [NEXTCLOUD_SHARE_TYPES.FEDERATED_CLOUD]: 'Federated',
  [NEXTCLOUD_SHARE_TYPES.CIRCLE]: 'Circle',
  [NEXTCLOUD_SHARE_TYPES.TALK_CONVERSATION]: 'Talk',
};

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/** OCS API response wrapper */
export interface NextcloudOcsResponse<T> {
  ocs: {
    meta: {
      status: 'ok' | 'failure';
      statuscode: number;
      message: string | null;
      totalitems?: string;
      itemsperpage?: string;
    };
    data: T;
  };
}

/** WebDAV PROPFIND response property set */
export interface NextcloudWebdavProps {
  'd:getlastmodified'?: string;
  'd:getetag'?: string;
  'd:getcontenttype'?: string;
  'd:getcontentlength'?: string;
  'd:resourcetype'?: { 'd:collection'?: {} };
  'oc:id'?: string;
  'oc:fileid'?: string;
  'oc:permissions'?: string;
  'oc:size'?: string;
  'oc:favorite'?: string;
  'nc:has-preview'?: string;
  'oc:owner-display-name'?: string;
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

/** NextCloud file/folder entry */
export interface NextcloudFile {
  id: string;
  path: string;
  name: string;
  type: NextcloudFileType;
  mimetype?: string;
  size: number;
  etag: string;
  lastModified: Date;
  permissions: string;
  favorite: boolean;
  hasPreview: boolean;
  ownerDisplayName?: string;
  parentId?: string;
}

/** NextCloud share entry */
export interface NextcloudShare {
  id: string;
  shareType: NextcloudShareType;
  shareWith?: string;
  shareWithDisplayname?: string;
  path: string;
  itemType: 'file' | 'folder';
  permissions: number;
  stime: number;
  expiration?: string;
  token?: string;
  url?: string;
  uidOwner: string;
  displaynameOwner: string;
  uidFileOwner: string;
  displaynameFileOwner: string;
  password?: boolean;
  sendPasswordByTalk?: boolean;
  note?: string;
  label?: string;
  hideDownload?: boolean;
}

/** NextCloud user */
export interface NextcloudUser {
  id: string;
  displayname: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  twitter?: string;
  enabled: boolean;
  groups: string[];
  quota: {
    free: number;
    used: number;
    total: number;
    relative: number;
    quota: number | string;
  };
  language?: string;
  locale?: string;
  lastLogin?: number;
}

/** NextCloud group */
export interface NextcloudGroup {
  id: string;
  displayname: string;
  usercount: number;
  disabled: boolean;
  canAdd: boolean;
  canRemove: boolean;
}

/** NextCloud activity entry */
export interface NextcloudActivity {
  activityId: number;
  app: string;
  type: string;
  user: string;
  subject: string;
  subjectRich: Array<{
    type: string;
    id: string;
    name: string;
    path?: string;
    link?: string;
  }>;
  message: string;
  messageRich: string[];
  objectType: string;
  objectId: number;
  objectName: string;
  link: string;
  icon: string;
  datetime: string;
}

/** NextCloud calendar event */
export interface NextcloudCalendarEvent {
  id: string;
  uri: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  recurrence?: string;
  status: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  organizer?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    status: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
  }>;
  created: Date;
  lastModified: Date;
}

/** NextCloud task */
export interface NextcloudTask {
  id: string;
  uri: string;
  calendarId: string;
  summary: string;
  description?: string;
  priority: number;
  percentComplete: number;
  status: 'NEEDS-ACTION' | 'IN-PROCESS' | 'COMPLETED' | 'CANCELLED';
  due?: Date;
  start?: Date;
  completed?: Date;
  categories?: string[];
  created: Date;
  lastModified: Date;
}

// =============================================================================
// REQUEST PAYLOADS
// =============================================================================

/** Create share payload */
export interface NextcloudCreateSharePayload {
  path: string;
  shareType: NextcloudShareType;
  shareWith?: string;
  publicUpload?: boolean;
  password?: string;
  expireDate?: string;
  permissions?: number;
  note?: string;
  label?: string;
}

/** Update share payload */
export interface NextcloudUpdateSharePayload {
  permissions?: number;
  password?: string;
  expireDate?: string;
  note?: string;
  label?: string;
  hideDownload?: boolean;
}

/** Create folder payload */
export interface NextcloudCreateFolderPayload {
  path: string;
}

/** Upload file payload */
export interface NextcloudUploadPayload {
  path: string;
  content: Buffer | string;
  contentType?: string;
  overwrite?: boolean;
}

/** Move/copy payload */
export interface NextcloudMovePayload {
  source: string;
  destination: string;
  overwrite?: boolean;
}

// =============================================================================
// QUERY PARAMETERS
// =============================================================================

/** File list query parameters */
export interface NextcloudFileQueryParams {
  path?: string;
  depth?: '0' | '1' | 'infinity';
  properties?: string[];
  filter?: {
    favorite?: boolean;
    type?: NextcloudFileType;
    mimetype?: string;
  };
}

/** Share list query parameters */
export interface NextcloudShareQueryParams {
  path?: string;
  reshares?: boolean;
  subfiles?: boolean;
  sharedWithMe?: boolean;
}

/** Activity query parameters */
export interface NextcloudActivityQueryParams {
  since?: number;
  limit?: number;
  objectType?: string;
  objectId?: number;
  sort?: 'asc' | 'desc';
}

/** User search parameters */
export interface NextcloudUserSearchParams {
  search?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/** NextCloud webhook payload */
export interface NextcloudWebhookPayload {
  event: string;
  userId?: string;
  time: number;
  data: Record<string, unknown>;
}

/** File change webhook data */
export interface NextcloudFileChangeWebhook extends NextcloudWebhookPayload {
  event: 'file_created' | 'file_changed' | 'file_deleted' | 'file_renamed';
  data: {
    path: string;
    oldPath?: string;
    fileId: string;
    owner: string;
    size?: number;
    mimetype?: string;
  };
}

/** Share webhook data */
export interface NextcloudShareWebhook extends NextcloudWebhookPayload {
  event: 'share_created' | 'share_deleted' | 'share_updated';
  data: {
    shareId: string;
    shareType: NextcloudShareType;
    shareWith?: string;
    path: string;
    owner: string;
    permissions: number;
  };
}
