import { apiClient } from './client';
import { DepartmentSettings } from '../types';

export const settingsApi = {
  get: async (): Promise<DepartmentSettings> => {
    const response = await apiClient.get('/api/settings');
    return response.data;
  },

  update: async (data: {
    departmentName?: string;
    deanery?: string;
    headOfDepartment?: string;
    postalAddress?: string;
    phoneNumbers?: string;
  }): Promise<DepartmentSettings> => {
    const params = new URLSearchParams();
    if (data.departmentName !== undefined && data.departmentName !== null) {
      params.append('departmentName', data.departmentName);
    }
    if (data.deanery !== undefined && data.deanery !== null) {
      params.append('deanery', data.deanery);
    }
    if (data.headOfDepartment !== undefined && data.headOfDepartment !== null) {
      params.append('headOfDepartment', data.headOfDepartment);
    }
    if (data.postalAddress !== undefined && data.postalAddress !== null) {
      params.append('postalAddress', data.postalAddress);
    }
    if (data.phoneNumbers !== undefined && data.phoneNumbers !== null) {
      params.append('phoneNumbers', data.phoneNumbers);
    }

    const response = await apiClient.put('/api/settings?' + params.toString());
    return response.data;
  },
};
