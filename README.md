# Barbearia Bom Jesus — versão modular

A lógica e o visual foram mantidos, mas o código foi dividido por responsabilidade.

## JavaScript
- `js/main.js`: ponto de entrada e inicialização.
- `js/utils.js`: seletores, modais, toast, máscara/formatadores.
- `js/storage.js`: localStorage e sessão.
- `js/account.js`: login, cadastro e estado da conta.
- `js/schedule.js`: horários e disponibilidade.
- `js/calendar.js`: calendário.
- `js/booking.js`: fluxo de agendamento.
- `js/appointments.js`: lista e cancelamento.

## CSS
- `css/style.css`: agregador.
- `css/base.css`: variáveis, reset, tipografia.
- `css/header.css`: cabeçalho e botões.
- `css/hero.css`: hero.
- `css/sections.css`: preços, galeria, equipe e rodapé.
- `css/modal.css`: modais, calendário, horários e toast.
- `css/responsive.css`: responsividade.

## Importante
O projeto usa módulos ES (`type="module"`). Para evitar restrições de `file://`, abra o projeto por um servidor local, por exemplo:
`python -m http.server 8000`

Depois acesse `http://localhost:8000/`.
