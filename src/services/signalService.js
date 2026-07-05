const API_BASE_URL = 'http://localhost:3000/api';

export async function getSignalNames() {
  const response = await fetch(`${API_BASE_URL}/signal/names`);

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
    },
    body: JSON.stringify({
      names,
      from,
      to,
    }),
  });

  if (!response.ok) {
    throw new Error(`History request failed (${response.status})`);
  }

  return response.json();
}