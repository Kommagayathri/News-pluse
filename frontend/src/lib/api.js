import axios from 'axios';

export const API_BASE_URL = "https://news-pluse-production.up.railway.app";
const api = axios.create({ baseURL: API_BASE_URL });

export async function getTimeline(selectedSources = []) {
  const params = selectedSources.length ? { sources: selectedSources.join(',') } : {};
  const response = await api.get('/timeline', { params });
  return response.data;
}

export async function getClusters() {
  const response = await api.get('/clusters');
  return response.data;
}

export async function getCluster(id) {
  const response = await api.get(`/clusters/${id}`);
  return response.data;
}

export async function triggerIngest() {
  const response = await api.post('/ingest/trigger');
  return response.data;
}

export async function getIngestStatus(jobId) {
  const response = await api.get(`/ingest/status/${jobId}`);
  return response.data;
}
