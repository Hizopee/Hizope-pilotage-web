import axios from "axios";

// Relatif : Caddy sert le site et proxifie /api vers hizope-pilotage-api (même origine). Le
// Pilotage relaie vers api/platform/moderation/* de Gaia avec la clé partagée.
const apiClient = axios.create({ baseURL: "/api/moderation/gaia" });

export const gaiaPhotoUrl = (fileName) => `/api/moderation/gaia-photos/${encodeURIComponent(fileName)}`;
export const gaiaVoiceUrl = (userId) => `/api/moderation/gaia/users/${userId}/voice`;
export const gaiaVerificationMediaUrl = (requestId, kind) =>
  `/api/moderation/gaia/verification-requests/${requestId}/media/${kind}`;

export const listGaiaUsersApi = async ({ status, search } = {}) => {
  const { data } = await apiClient.get("/users", { params: { status, search } });
  return data;
};

export const getGaiaUserApi = async (userId) => (await apiClient.get(`/users/${userId}`)).data;

export const approveGaiaUserApi = async (userId) => apiClient.post(`/users/${userId}/approve`);
export const rejectGaiaUserApi = async (userId, reason) => apiClient.post(`/users/${userId}/reject`, { reason });
export const banGaiaUserApi = async (userId, reason) => apiClient.post(`/users/${userId}/ban`, { reason });
export const unbanGaiaUserApi = async (userId) => apiClient.post(`/users/${userId}/unban`);

// requestAudio / requestVideo à false tous les deux : suspension simple, sans demande de vérification.
export const suspendGaiaUserApi = async (userId, { reason, requestAudio, requestVideo, prompt }) =>
  (await apiClient.post(`/users/${userId}/suspend`, { reason, requestAudio, requestVideo, prompt })).data;
export const unsuspendGaiaUserApi = async (userId) => apiClient.post(`/users/${userId}/unsuspend`);

export const listGaiaVerificationRequestsApi = async (status) =>
  (await apiClient.get("/verification-requests", { params: { status } })).data;
export const acceptGaiaVerificationApi = async (requestId, note) =>
  apiClient.post(`/verification-requests/${requestId}/accept`, { note });
export const refuseGaiaVerificationApi = async (requestId, note) =>
  apiClient.post(`/verification-requests/${requestId}/refuse`, { note });

export const listGaiaReportsApi = async (pendingOnly) =>
  (await apiClient.get("/reports", { params: { pendingOnly } })).data;
export const resolveGaiaReportApi = async (reportId, note) =>
  apiClient.post(`/reports/${reportId}/resolve`, { note });

export const listGaiaMessagesApi = async ({ userId, matchId, take } = {}) =>
  (await apiClient.get("/messages", { params: { userId, matchId, take } })).data;
