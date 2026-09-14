import axios from "axios";

const apiClient = axios.create({ baseURL: "/api" });

export const getCmicrolocksStripeSummaryApi = async (environment = "live") => {
  const { data } = await apiClient.get("/stripe/cmicrolocks/summary", { params: { environment } });
  return data;
};
