export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expMs = payload?.exp ? payload.exp * 1000 : 0;
    if (!expMs || Date.now() >= expMs) return false; // expired
    return true;
  } catch {
    return false;
  }
};

export const getUserRole = () => {
  // Prefer role from JWT, fallback to localStorage
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.role) return payload.role;
    } catch {}
  }
  return localStorage.getItem("role");
};

export const getDefaultPathByRole = (role) => {
  switch (role) {
    case "admin":
      return "/admin-dashboard";
    case "official":
      return "/official-dashboard";
    case "resident":
      return "/resident-dashboard";
    default:
      return "/login"; // don’t default to resident if role is missing
  }
};