import axios from "axios";

// Relatif : Caddy sert le site + proxifie /api vers hizope-pilotage-api sur la même
// origine en prod (comme cmicrolocks.fr). En dev, le proxy Vite (vite.config.js) route
// vers VITE_DEV_API_TARGET.
const apiClient = axios.create({ baseURL: "/api" });

export const getCmicrolocksReconciliationApi = async () => {
  const { data } = await apiClient.get("/reconciliation/cmicrolocks");
  return data;
};

export const recordCmicrolocksReversalApi = async (amount, reversedAt, note) => {
  await apiClient.post("/reconciliation/cmicrolocks/reversals", { amount, reversedAt, note });
};
