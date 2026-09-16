// js/schedule.js
// Regras de funcionamento e disponibilidade.

import { dataLocal, hojeChave, chaveDia } from "./utils.js";
import { getAppointments } from "./storage.js";

export const HORARIO_ABERTURA = 8;
export const HORARIO_FECHAMENTO = 18;

export function gerarHorarios(dataStr) {
  const data = dataLocal(dataStr);
  if (isNaN(data) || data.getDay() === 0) return [];

  const horarios = [];
  for (let h = HORARIO_ABERTURA; h <= HORARIO_FECHAMENTO; h++) {
    horarios.push(h.toString().padStart(2, "0") + ":00");
  }
  return horarios;
}

export function statusDoDia(dataStr, barbeiro) {
  if (dataStr < hojeChave()) return "fechado";

  const total = gerarHorarios(dataStr);
  if (total.length === 0) return "fechado";

  const ocupados = getAppointments().filter(
    (a) => a.data === dataStr && a.barbeiro === barbeiro
  ).length;

  if (ocupados === 0) return "livre";
  if (ocupados >= total.length) return "lotado";
  return "parcial";
}

export { chaveDia };
