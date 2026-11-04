import axios from "axios";

const apiClient = axios.create({ baseURL: "/api" });

export const getCmicrolocksStripeSummaryApi = async (environment = "live") => {
  const { data } = await apiClient.get("/stripe/cmicrolocks/summary", { params: { environment } });
  return data;
};

// LoveList : 100 % Hizope, pas de commission — mêmes champs que CMicrolocks, avec
// serviceFeePercent = 100, netMargin = brut − frais Stripe et payoutDue = 0.
export const getLovelistStripeSummaryApi = async (environment = "live") => {
  const { data } = await apiClient.get("/stripe/lovelist/summary", { params: { environment } });
  return data;
};

// Virements Stripe -> compte bancaire + solde disponible / en attente.
export const getLovelistPayoutsApi = async (environment = "live") => {
  const { data } = await apiClient.get("/stripe/lovelist/payouts", { params: { environment } });
  return data;
};
