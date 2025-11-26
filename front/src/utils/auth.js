import { getItem } from './storage';

export const isAuthenticated = () => {
  // Check if role exists in localStorage (set during login)
  const role = getItem("role");
  return !!role;
};

export const getUserRole = () => {
  // Get role from localStorage (set during login)
  const role = getItem("role");
  return role ? (typeof role === 'string' ? role : role.role || role) : null;
};

export const getDefaultPathByRole = (role) => {
  switch (role) {
    case "admin":
      return "/admin-dashboard";
    case "official":
      return "/resident-dashboard"; // Official uses resident dashboard since /official-dashboard doesn't exist
    case "resident":
      return "/resident-dashboard";
    default:
      return "/login"; // don't default to resident if role is missing
  }
};