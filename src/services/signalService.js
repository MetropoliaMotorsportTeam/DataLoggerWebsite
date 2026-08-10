import { getApiBase, getAuthHeaders, handleUnauthorized } from '../utils/api';

const API_BASE_URL = getApiBase();

export async function getSignalNames() {
  const response = await fetch(`${API_BASE_URL}/signal/names`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized(response);
  }

  if (!response.ok) {
    throw new Error(`Name request failed (${response.status})`);
  }

  return response.json();
}

export async function getHistoricalSignals(names, from, to) {
  const response = await fetch(`${API_BASE_URL}/signal/range`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      names,
      from,
      to,
    }),
  });

  if (response.status === 401) {
    handleUnauthorized(response);
  }

  if (!response.ok) {
    throw new Error(`History request failed (${response.status})`);
  }

  return response.json();
}