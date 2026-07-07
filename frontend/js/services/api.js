export function createApi({ fallbackData }) {
  const baseUrl = 'http://localhost:4000/api';

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  return {
    async loadBootstrap() {
      try {
        return await request('/bootstrap');
      } catch (error) {
        return {
          industryGroups: fallbackData.industryGroups,
          projects: fallbackData.projects,
          liveLogs: fallbackData.liveLogs,
          savedIds: fallbackData.projects.filter(project => project.saved).map(project => project.id),
          recentIds: [],
          recentCats: ['CAT-14','CAT-05'],
          favoriteCats: ['CAT-05','CAT-11','CAT-14']
        };
      }
    },
    async toggleSavedProject(projectId) {
      try {
        return await request(`/user/saved/${projectId}`, { method: 'POST' });
      } catch (error) {
        return null;
      }
    },
    async pushRecentProject(projectId) {
      try {
        return await request('/user/recent', {
          method: 'POST',
          body: JSON.stringify({ projectId })
        });
      } catch (error) {
        return null;
      }
    },
    async login(payload) {
      return request('/auth/login', { method:'POST', body: JSON.stringify(payload) });
    },
    async register(payload) {
      return request('/auth/register', { method:'POST', body: JSON.stringify(payload) });
    }
  };
}
