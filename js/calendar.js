// js/calendar.js
// Renderização e interação do calendário.

import { $, $$, dataLocal, chaveDia, hojeChave, toast } from "./utils.js";
import { statusDoDia } from "./schedule.js";

const MESES_A_FRENTE = 2;

export function createCalendar({ onDaySelected }) {
  let calState = { year: 0, month: 0 };
  let diaSelecionado = null;

  function reset() {
    const hoje = new Date();
    calState = { year: hoje.getFullYear(), month: hoje.getMonth() };
    diaSelecionado = null;
    renderDow();
  }

  function renderDow() {
    $("#cal-dow").innerHTML = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
      .map((d) => `<div class="cal-dow">${d}</div>`)
      .join("");
  }

  function renderCalendario() {
    const barbeiro = $("#sel-barbeiro").value;
    const { year, month } = calState;

    const titulo = new Date(year, month, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    $("#cal-titulo").textContent =
      titulo.charAt(0).toUpperCase() + titulo.slice(1);

    const hoje = new Date();
    const inicioAtual = hoje.getFullYear() * 12 + hoje.getMonth();
    const esteMes = year * 12 + month;

    $("#cal-prev").disabled = esteMes <= inicioAtual;
    $("#cal-next").disabled = esteMes >= inicioAtual + MESES_A_FRENTE;

    const primeiroDiaSemana = new Date(year, month, 1).getDay();
    const totalDias = new Date(year, month + 1, 0).getDate();

    const celulas = [];

    for (let i = 0; i < primeiroDiaSemana; i++) {
      celulas.push('<div class="cal-day is-empty"></div>');
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      const dataStr = chaveDia(year, month, dia);
      const status = statusDoDia(dataStr, barbeiro);
      const bloqueado = status === "fechado" || status === "lotado";
      const selecionado = dataStr === diaSelecionado ? "selected" : "";
      const dot =
        status === "fechado" ? "" : '<span class="dot"></span>';
      const classeStatus =
        status === "fechado" ? "is-closed" : `st-${status}`;

      celulas.push(
        `<button type="button" class="cal-day ${classeStatus} ${selecionado}" data-data="${dataStr}" data-bloqueado="${bloqueado}">${dia}${dot}</button>`
      );
    }

    $("#cal-dias").innerHTML = celulas.join("");

    $$("#cal-dias .cal-day[data-data]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.bloqueado === "true") {
          toast("Esse dia não está disponível com esse barbeiro.");
          return;
        }

        diaSelecionado = btn.dataset.data;
        renderCalendario();
        onDaySelected(diaSelecionado);
      });
    });
  }

  $("#cal-prev").addEventListener("click", () => {
    calState.month--;
    if (calState.month < 0) {
      calState.month = 11;
      calState.year--;
    }
    renderCalendario();
  });

  $("#cal-next").addEventListener("click", () => {
    calState.month++;
    if (calState.month > 11) {
      calState.month = 0;
      calState.year++;
    }
    renderCalendario();
  });

  return {
    reset,
    render: renderCalendario,
    getSelectedDay: () => diaSelecionado,
    clearSelectedDay: () => {
      diaSelecionado = null;
    },
  };
}
