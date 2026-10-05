import axios from "axios";

const apiClient = axios.create({ baseURL: "/api" });

export const getCmicrolocksLogsApi = async ({ take = 200, level = "Warning" } = {}) => {
  const { data } = await apiClient.get("/logs/cmicrolocks", { params: { take, level } });
  return data;
};

export const getLovelistLogsApi = async ({ take = 200, level = "Warning" } = {}) => {
  const { data } = await apiClient.get("/logs/lovelist", { params: { take, level } });
  return data;
};
