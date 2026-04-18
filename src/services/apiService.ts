const API_BASE = '/api';

export const apiService = {
  async get(entity: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/${entity}${query ? `?${query}` : ''}`;
    try {
      const response = await fetch(url);
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
      if (err.message === 'Failed to fetch') {
        throw new Error('Connection failed. Please ensure the server is running.');
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
      if (err.message === 'Failed to fetch') {
        throw new Error('Connection failed. Please ensure the server is running.');
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
      if (err.message === 'Failed to fetch') {
        throw new Error('Connection failed. Please ensure the server is running.');
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
