export const isAuthenticated = () => !!localStorage.getItem("token");

export const getUserRole = () => localStorage.getItem("role");

export const getDefaultPathByRole = (role) => {
  if (role === "admin") return "/admin-dashboard";
  if (role === "official") return "/official-dashboard";
  return "/resident-dashboard";
};