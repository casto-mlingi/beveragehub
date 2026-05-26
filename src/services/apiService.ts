const API_BASE = '/api';

export const apiService = {
  async get(entity: string, params: Record<string, string> = {}, signal?: AbortSignal) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/${entity}${query ? `?${query}` : ''}`;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.error || text;
        } catch { /* ignore if not JSON */ }
        throw new Error(message || `Server error: ${response.status}`);
      }
      return response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        throw new Error('Connection failed. Please ensure the server is running.');
      }
      if (err.message.toUpperCase().includes('ERR_NETWORK_CHANGED') || err.message.toUpperCase().includes('ERR_NETWORK_IO_SUSPENDED') || err.message.toUpperCase().includes('ERR_ABORTED') || err.name === 'AbortError') {
        if (err.name === 'AbortError' || err.message.toUpperCase().includes('ERR_ABORTED')) {
          const error = new Error('Request aborted. This is normal during updates or navigation.');
          error.name = 'AbortError';
          throw error;
        }
        throw new Error('Network connection interrupted. Retrying...');
      }
      throw err;
    }
  },

  async post(entity: string, data: any) {
    try {
      const response = await fetch(`${API_BASE}/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.error || text;
        } catch { /* ignore if not JSON */ }
        throw new Error(message || `Server error: ${response.status}`);
      }
      return response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        throw new Error('Connection failed. Please ensure the server is running.');
      }
      if (err.message.includes('ERR_NETWORK_CHANGED') || err.message.includes('ERR_NETWORK_IO_SUSPENDED') || err.message.includes('ERR_ABORTED')) {
        throw new Error('Network connection interrupted. Retrying...');
      }
      throw err;
    }
  },

  async delete(entity: string, id: string) {
    try {
      const response = await fetch(`${API_BASE}/${entity}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
          const json = JSON.parse(text);
          message = json.error || text;
        } catch { /* ignore if not JSON */ }
        throw new Error(message || `Server error: ${response.status}`);
      }
      return response.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('NetworkError'))) {
        throw new Error('Connection failed. Please ensure the server is running.');
      }
      if (err.message.includes('ERR_NETWORK_CHANGED') || err.message.includes('ERR_NETWORK_IO_SUSPENDED') || err.message.includes('ERR_ABORTED')) {
        throw new Error('Network connection interrupted. Retrying...');
      }
      throw err;
    }
  },

  async inspectDb() {
    const response = await fetch(`${API_BASE}/inspect-db`);
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
};
