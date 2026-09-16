// js/storage.js
// Camada de persistência. Mantém a mesma estratégia do projeto original:
// localStorage no navegador atual.

const USERS_KEY = "bbj_usuarios_v1";
const SESSION_KEY = "bbj_sessao_v1";
const APPTS_KEY = "bbj_agendamentos_v1";

export const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
export const setUsers = (list) => localStorage.setItem(USERS_KEY, JSON.stringify(list));

export const getAppointments = () =>
  JSON.parse(localStorage.getItem(APPTS_KEY) || "[]");
export const setAppointments = (list) =>
  localStorage.setItem(APPTS_KEY, JSON.stringify(list));

export const getSession = () => localStorage.getItem(SESSION_KEY);
export const setSession = (userId) => localStorage.setItem(SESSION_KEY, userId);
export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export function getCurrentUser() {
  const id = getSession();
  if (!id) return null;
  return getUsers().find((u) => u.id === id) || null;
}
