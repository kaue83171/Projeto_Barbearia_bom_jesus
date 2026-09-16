// js/appointments.js
// Lista e cancelamento de agendamentos.

import { $, $$, formatarDataCurta, toast } from "./utils.js";
import { getAppointments, setAppointments, getCurrentUser } from "./storage.js";

export function renderLista() {
  const user = getCurrentUser();
  const container = $("#lista-agendamentos");

  if (!user) {
    container.innerHTML =
      '<p class="hint">Entre na sua conta para ver seus agendamentos.</p>';
    return;
  }

  const itens = getAppointments()
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.usuarioId === user.id)
    .sort((a, b) =>
      (a.item.data + a.item.hora).localeCompare(
        b.item.data + b.item.hora
      )
    );

  if (!itens.length) {
    container.innerHTML =
      '<p class="hint">Você ainda não tem agendamentos.</p>';
    return;
  }

  container.innerHTML = itens
    .map(
      ({ item, index }) => `
      <div class="appt-card" data-idx="${index}">
        <div>
          <span class="when">${formatarDataCurta(item.data)} às ${item.hora}</span><br/>
          <span>${item.servico}</span> com <span>${item.barbeiro}</span>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="del">Cancelar</button>
      </div>`
    )
    .join("");

  $$("#lista-agendamentos [data-action='del']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.target.closest("[data-idx]").dataset.idx);
      const arr = getAppointments();
      arr.splice(idx, 1);
      setAppointments(arr);
      renderLista();
      toast("Agendamento cancelado.");
    });
  });
}
