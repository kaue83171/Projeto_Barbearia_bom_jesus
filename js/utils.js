// js/utils.js
// Utilidades gerais compartilhadas por todos os módulos.

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function openModal(dlg) {
  if (typeof dlg.showModal === "function") dlg.showModal();
  else dlg.setAttribute("open", "");
}

export function closeModal(dlg) {
  dlg.close ? dlg.close() : dlg.removeAttribute("open");
}

export const soDigitos = (v) => (v || "").replace(/\D/g, "");

export function primeiroNome(nomeCompleto) {
  return (nomeCompleto || "").trim().split(/\s+/)[0] || "cliente";
}

export function toast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2200);
}

export function shakeField(form) {
  form.classList.remove("shake");
  void form.offsetWidth;
  form.classList.add("shake");
}

export function dataLocal(dataStr) {
  return new Date(`${dataStr}T00:00:00`);
}

export function chaveDia(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function hojeChave() {
  const h = new Date();
  return chaveDia(h.getFullYear(), h.getMonth(), h.getDate());
}

export function formatarDataCurta(dataStr) {
  return dataLocal(dataStr).toLocaleDateString("pt-BR");
}
