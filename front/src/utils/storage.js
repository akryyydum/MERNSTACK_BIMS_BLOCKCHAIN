// Storage utility for non-sensitive data only
// Tokens are now stored in HTTP-only cookies on the backend

/**
 * Store non-sensitive data in localStorage
 */
export const setItem = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (error) {
    console.error(`[Storage] Failed to set ${key}:`, error);
  }
};

/**
 * Retrieve data from localStorage
 */
export const getItem = (key) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  } catch (error) {
    console.error(`[Storage] Failed to get ${key}:`, error);
    return null;
  }
};

/**
 * Remove item from localStorage
 */
export const removeItem = (key) => {
  localStorage.removeItem(key);
};

/**
 * Clear all storage
 */
export const clearStorage = () => {
  localStorage.clear();
};

/**
 * Refresh access token using HTTP-only cookie
 */
export const refreshAccessToken = async () => {
  try {
    const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000';
    const response = await fetch(`${API_BASE}/api/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Storage] Token refresh failed:', error);
    // Clear storage and redirect to login
    clearStorage();
    window.location.href = '/login';
    throw error;
  }
};

/**
 * Logout - clear cookies on server
 */
export const logout = async () => {
  try {
    const API_BASE = import.meta?.env?.VITE_API_URL || 'http://localhost:4000';
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[Storage] Logout failed:', error);
  } finally {
    clearStorage();
    window.location.href = '/login';
  }
};
