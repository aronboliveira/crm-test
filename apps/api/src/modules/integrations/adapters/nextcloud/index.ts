/**
 * NextCloud Integration Module Exports
 *
 * Provides file storage and collaboration capabilities via NextCloud.
 */

export * from './nextcloud.types';
export { NextcloudApiClient } from './nextcloud-api.client';
export {
  NextcloudDataMapper,
  type CrmAttachment,
  type CrmShare,
  type CrmIntegrationUser,
  type CrmActivityLog,
} from './nextcloud-data.mapper';
export { NextcloudAdapter, type NextcloudAdapterConfig } from './nextcloud.adapter';
