// js/account.js
// Cabeçalho + criação de conta + login/logout.

import { $, $$, closeModal, openModal, primeiroNome, shakeField, soDigitos, toast } from "./utils.js";
import {
  getUsers,
  setUsers,
  getCurrentUser,
  setSession,
  clearSession,
} from "./storage.js";

export function initAccount({ modalConta, modalAgenda, prepararModalAgenda }) {
  function renderNavConta() {
    const slot = $("#nav-conta");
    const user = getCurrentUser();

    if (!user) {
      slot.innerHTML = `<button class="btn btn-ghost btn-sm" id="nav-entrar">Entrar</button>`;
      $("#nav-entrar").addEventListener("click", () => abrirConta("entrar"));
    } else {
      slot.innerHTML = `
        <div class="user-chip">
          <span>Olá, ${primeiroNome(user.nome)}</span>
          <button class="btn btn-ghost btn-sm" id="nav-sair">Sair</button>
        </div>`;
      $("#nav-sair").addEventListener("click", fazerLogout);
    }
  }

  function fazerLogout() {
    clearSession();
    renderNavConta();
    toast("Você saiu da sua conta.");
    if (modalAgenda.open) prepararModalAgenda();
  }

  function abrirConta(aba = "entrar") {
    ativarTab(aba);
    openModal(modalConta);
  }

  function ativarTab(aba) {
    $$(".tab-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === aba)
    );
    $$(".tab-panel").forEach((p) => (p.hidden = p.dataset.panel !== aba));
  }

  $$(".tab-btn").forEach((btn) =>
    btn.addEventListener("click", () => ativarTab(btn.dataset.tab))
  );

  $$("[data-gate]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal(modalAgenda);
      abrirConta(btn.dataset.gate);
    });
  });

  $("#form-criar").addEventListener("submit", (e) => {
    e.preventDefault();

    const form = e.target;
    const fd = new FormData(form);
    const nome = fd.get("nome").trim();
    const telefone = soDigitos(fd.get("telefone"));
    const senha = fd.get("senha");
    const erro = $("[data-error='criar']");
    erro.textContent = "";

    if (telefone.length < 10) {
      erro.textContent = "Informe um telefone válido com DDD.";
      shakeField(form);
      return;
    }

    const usuarios = getUsers();
    if (usuarios.some((u) => u.telefone === telefone)) {
      erro.textContent = "Já existe uma conta com esse telefone. Tente entrar.";
      shakeField(form);
      return;
    }

    const novo = {
      id: "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome,
      telefone,
      senha,
    };

    usuarios.push(novo);
    setUsers(usuarios);
    setSession(novo.id);

    form.reset();
    closeModal(modalConta);
    renderNavConta();
    toast(`Conta criada. Bem-vindo, ${primeiroNome(nome)}!`);

    if (modalAgenda.open) prepararModalAgenda();
  });

  $("#form-entrar").addEventListener("submit", (e) => {
    e.preventDefault();

    const form = e.target;
    const fd = new FormData(form);
    const telefone = soDigitos(fd.get("telefone"));
    const senha = fd.get("senha");
    const erro = $("[data-error='entrar']");
    erro.textContent = "";

    const usuario = getUsers().find(
      (u) => u.telefone === telefone && u.senha === senha
    );

    if (!usuario) {
      erro.textContent = "Telefone ou senha incorretos.";
      shakeField(form);
      return;
    }

    setSession(usuario.id);
    form.reset();
    closeModal(modalConta);
    renderNavConta();
    toast(`Bem-vindo de volta, ${primeiroNome(usuario.nome)}!`);

    if (modalAgenda.open) prepararModalAgenda();
  });

  return { renderNavConta, fazerLogout, abrirConta };
}
