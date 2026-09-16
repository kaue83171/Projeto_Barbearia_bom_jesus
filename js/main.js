// js/main.js
// Ponto de entrada da aplicação.
// Apenas inicializa os módulos e conecta os módulos que dependem uns dos outros.

import { $, $$, closeModal } from "./utils.js";
import { getCurrentUser } from "./storage.js";
import { initAccount } from "./account.js";
import { initBooking } from "./booking.js";
import { renderLista } from "./appointments.js";

const modalConta = $("#modal-conta");
const modalAgenda = $("#modal-agenda");
const modalLista = $("#modal-lista");

// Ano do rodapé.
$("#year").textContent = new Date().getFullYear();

// Fechamento dos modais.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    [modalConta, modalAgenda, modalLista].forEach(
      (m) => m.open && closeModal(m)
    );
  }
});

$$(".modal [data-close]").forEach((el) => {
  el.addEventListener("click", () => closeModal(el.closest(".modal")));
});

// Máscara de telefone.
document.addEventListener("input", (e) => {
  if (!e.target.matches('input[type="tel"]')) return;

  let v = e.target.value.replace(/\D/g, "").slice(0, 11);

  if (v.length > 6) {
    v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
  } else {
    v = v.replace(/(\d{0,2})/, "($1");
  }

  e.target.value = v.replace(/[()\-\s]$/, "");
});

// Reveal on scroll.
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

$$(".reveal").forEach((el) => io.observe(el));

// O booking precisa existir antes da conta porque logout/conta
// atualiza o estado do modal de agendamento.
let bookingApi;

const accountApi = initAccount({
  modalConta,
  modalAgenda,
  prepararModalAgenda: () => bookingApi?.prepararModalAgenda(),
});

bookingApi = initBooking({
  modalAgenda,
  modalLista,
  abrirConta: accountApi.abrirConta,
  renderLista,
});

bookingApi.setLogoutHandler(accountApi.fazerLogout);

// Estado inicial do cabeçalho.
accountApi.renderNavConta();
