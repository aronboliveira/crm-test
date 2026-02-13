export type DeviceKind = "physical" | "virtual";
export type DeviceStatus = "online" | "offline" | "maintenance";
export type DeviceSortBy =
  | "updatedAt"
  | "lastSeenAt"
  | "name"
  | "status"
  | "kind"
  | "vendor";
export type DeviceSortDir = "asc" | "desc";

export interface DeviceRow {
  id: string;
  ownerEmail: string;
  name: string;
  kind: DeviceKind;
  vendor?: string;
  model?: string;
  operatingSystem?: string;
  host?: string;
  ipAddress?: string;
  serialNumber?: string;
  status: DeviceStatus;
  tags?: string[];
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceDto {
  name: string;
  kind: DeviceKind;
  status?: DeviceStatus;
  vendor?: string;
  model?: string;
  operatingSystem?: string;
  host?: string;
  ipAddress?: string;
  serialNumber?: string;
  tags?: string[];
}

export type UpdateDeviceDto = Partial<CreateDeviceDto> & {
  lastSeenAt?: string;
};

export interface DeviceListQuery {
  q?: string;
  status?: DeviceStatus;
  kind?: DeviceKind;
  page?: number;
  pageSize?: number;
  sortBy?: DeviceSortBy;
  sortDir?: DeviceSortDir;
}

export interface DeviceAnalyticsQuery {
  q?: string;
  status?: DeviceStatus;
  kind?: DeviceKind;
  days?: number;
  top?: number;
}

export interface DeviceAnalyticsEntry {
  label: string;
  value: number;
}

export interface DeviceAnalyticsDailyPoint {
  date: string;
  total: number;
  online: number;
  offline: number;
  maintenance: number;
}

export interface DeviceAnalyticsResponse {
  total: number;
  status: Record<DeviceStatus, number>;
  kind: Record<DeviceKind, number>;
  topVendors: DeviceAnalyticsEntry[];
  topOperatingSystems: DeviceAnalyticsEntry[];
  topTags: DeviceAnalyticsEntry[];
  activityByDay: DeviceAnalyticsDailyPoint[];
}

export interface DeviceListResponse {
  items: DeviceRow[];
  total: number;
  page: number;
  pageSize: number;
  nextCursor: string | null;
  sortBy: DeviceSortBy;
  sortDir: DeviceSortDir;
}
