/**
 * Devices API Service
 * Handles HTTP requests for device management
 */

import ApiClientService from "./ApiClientService";

export interface Device {
  id: string;
  name: string;
  kind: "physical" | "virtual";
  status: "online" | "offline" | "maintenance";
  vendor?: string;
  model?: string;
  operatingSystem?: string;
  host?: string;
  ipAddress?: string;
  serialNumber?: string;
  ownerEmail?: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceListQuery {
  q?: string;
  status?: Device["status"] | "all";
  kind?: Device["kind"] | "all";
  page?: number;
  pageSize?: number;
  sortBy?: "updatedAt" | "lastSeenAt" | "name" | "status" | "kind" | "vendor";
  sortDir?: "asc" | "desc";
}

export interface DeviceListResponse {
  rows: Device[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateDeviceDto {
  name: string;
  kind: Device["kind"];
  status: Device["status"];
  vendor?: string;
  model?: string;
  operatingSystem?: string;
  host?: string;
  ipAddress?: string;
  serialNumber?: string;
}

export type UpdateDeviceDto = Partial<CreateDeviceDto> & {
  lastSeenAt?: string;
};

/**
 * Devices API Service
 */
class DevicesService {
  /**
   * List devices with optional filtering and pagination
   */
  async list(query?: DeviceListQuery): Promise<DeviceListResponse> {
    const params = new URLSearchParams();

    if (query?.q) params.append("q", query.q);
    if (query?.status && query.status !== "all")
      params.append("status", query.status);
    if (query?.kind && query.kind !== "all") params.append("kind", query.kind);
    if (query?.page) params.append("page", String(query.page));
    if (query?.pageSize) params.append("pageSize", String(query.pageSize));
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortDir) params.append("sortDir", query.sortDir);

    const url = `/admin/devices${params.toString() ? `?${params}` : ""}`;
    const response = await ApiClientService.raw.get<DeviceListResponse>(url);

    return response.data;
  }

  /**
   * Get device by ID
   */
  async getById(id: string): Promise<Device> {
    const response = await ApiClientService.raw.get<Device>(
      `/admin/devices/${id}`,
    );
    return response.data;
  }

  /**
   * Create new device
   */
  async create(payload: CreateDeviceDto): Promise<Device> {
    const response = await ApiClientService.raw.post<Device>(
      "/admin/devices",
      payload,
    );
    return response.data;
  }

  /**
   * Update existing device
   */
  async update(id: string, payload: UpdateDeviceDto): Promise<Device> {
    const response = await ApiClientService.raw.patch<Device>(
      `/admin/devices/${id}`,
      payload,
    );
    return response.data;
  }

  /**
   * Delete device
   */
  async delete(id: string): Promise<void> {
    await ApiClientService.raw.delete(`/admin/devices/${id}`);
  }
}

export default new DevicesService();
