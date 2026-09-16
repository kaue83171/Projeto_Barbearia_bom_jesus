// js/booking.js
// Modal e fluxo de agendamento.

import {
  $,
  $$,
  closeModal,
  dataLocal,
  openModal,
  shakeField,
  toast,
} from "./utils.js";
import {
  getAppointments,
  setAppointments,
  getCurrentUser,
} from "./storage.js";
import { gerarHorarios } from "./schedule.js";
import { createCalendar } from "./calendar.js";

export function initBooking({ modalAgenda, modalLista, abrirConta, renderLista }) {
  let diaSelecionado = null;

  const calendar = createCalendar({
    onDaySelected: (dataStr) => {
      diaSelecionado = dataStr;
      abrirPassoHorarios();
    },
  });

  function prepararModalAgenda() {
    const user = getCurrentUser();
    const gate = $("#agenda-gate");
    const form = $("#form-agenda");

    if (!user) {
      gate.hidden = false;
      form.hidden = true;
      return;
    }

    gate.hidden = true;
    form.hidden = false;
    $("#agenda-usuario-nome").textContent = user.nome;

    form.reset();
    diaSelecionado = null;
    calendar.clearSelectedDay();
    $("#step-calendario").classList.remove("open");
    $("#step-horarios").classList.remove("open");
    $("#btn-confirmar").disabled = true;

    calendar.reset();
  }

  function atualizarPassoCalendario() {
    const barbeiro = $("#sel-barbeiro").value;
    diaSelecionado = null;
    calendar.clearSelectedDay();
    $("#step-horarios").classList.remove("open");

    if (barbeiro) {
      $("#step-calendario").classList.add("open");
      calendar.render();
    } else {
      $("#step-calendario").classList.remove("open");
    }

    atualizarBotaoConfirmar();
  }

  function abrirPassoHorarios() {
    const barbeiro = $("#sel-barbeiro").value;
    const legivel = dataLocal(diaSelecionado).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    $("#horarios-data-legivel").textContent = legivel;

    const container = $("#horarios-disponiveis");
    container.innerHTML = "";
    $("#hora").value = "";

    const agendados = getAppointments()
      .filter(
        (a) => a.data === diaSelecionado && a.barbeiro === barbeiro
      )
      .map((a) => a.hora);

    gerarHorarios(diaSelecionado).forEach((hora) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "horario-btn";
      btn.textContent = hora;

      if (agendados.includes(hora)) {
        btn.classList.add("disabled");
      } else {
        btn.addEventListener("click", () => {
          $$(".horario-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          $("#hora").value = hora;
          atualizarBotaoConfirmar();
        });
      }

      container.appendChild(btn);
    });

    $("#step-horarios").classList.add("open");
    atualizarBotaoConfirmar();
  }

  function atualizarBotaoConfirmar() {
    const ok =
      $("#sel-servico").value &&
      $("#sel-barbeiro").value &&
      diaSelecionado &&
      $("#hora").value;

    $("#btn-confirmar").disabled = !ok;
  }

  $("#sel-barbeiro").addEventListener("change", atualizarPassoCalendario);
  $("#sel-servico").addEventListener("change", atualizarBotaoConfirmar);
  $("#agenda-sair").addEventListener("click", () => {
    // O logout real é fornecido pelo módulo de conta.
    // Este listener é substituído no main.js pelo método de logout.
  });

  $("#form-agenda").addEventListener("submit", (e) => {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) return;

    const servico = $("#sel-servico").value;
    const barbeiro = $("#sel-barbeiro").value;
    const hora = $("#hora").value;

    if (!servico || !barbeiro || !diaSelecionado || !hora) {
      shakeField(e.target);
      return;
    }

    const lista = getAppointments();

    // Mantém a mesma estrutura de dados usada pelo projeto original.
    lista.push({
      id: "a" + Date.now().toString(36),
      usuarioId: user.id,
      nome: user.nome,
      telefone: user.telefone,
      servico,
      barbeiro,
      data: diaSelecionado,
      hora,
      criadoEm: Date.now(),
    });

    setAppointments(lista);

    closeModal(modalAgenda);
    toast("Agendamento salvo com sucesso!");
  });

  $$("[data-open]").forEach((el) => {
    el.addEventListener("click", () => {
      const alvo = el.getAttribute("data-open");

      if (alvo === "agenda") {
        prepararModalAgenda();
        openModal(modalAgenda);
      }

      if (alvo === "lista") {
        if (!getCurrentUser()) {
          toast("Entre na sua conta para ver seus agendamentos.");
          abrirConta("entrar");
          return;
        }

        renderLista();
        openModal(modalLista);
      }
    });
  });

  return {
    prepararModalAgenda,
    setLogoutHandler(handler) {
      $("#agenda-sair").onclick = handler;
    },
  };
}
