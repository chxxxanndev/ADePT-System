// frontend/src/config.ts

export const API_ROOT: string = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_URLS = {
  requests: `${API_ROOT}/api/requests`,
  auth: `${API_ROOT}/api/auth`,
  taxDeclarations: `${API_ROOT}/api/tax-declarations`,
  landholding: `${API_ROOT}/api/landholding`,
  nolandholding: `${API_ROOT}/api/nolandholding`,
  notifications: `${API_ROOT}/api/notifications`,
  users: `${API_ROOT}/api/users`,
  account: `${API_ROOT}/api/account`,
  auditLog: `${API_ROOT}/api/audit-log`,
};