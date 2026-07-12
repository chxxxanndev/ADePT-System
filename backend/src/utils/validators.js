export const validatePassword = (password) => {
  return password && password.length >= 6;
};