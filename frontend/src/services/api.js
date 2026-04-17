export const API_BASE = 'http://localhost:8000';
export const WS_BASE = 'ws://localhost:8000';

export const startSimulation = async (scenario) => {
  const response = await fetch(`${API_BASE}/api/simulation/start/${scenario}`, {
    method: 'POST'
  });
  return response.json();
};

export const getState = async () => {
  const response = await fetch(`${API_BASE}/api/state`);
  return response.json();
};
