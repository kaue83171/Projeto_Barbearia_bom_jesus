# Barbearia Bom Jesus

Site público de agendamento com banco SQLite central e painel privado para barbeiros.

## Rodar localmente

```powershell
npm start
```

Abra `http://localhost:3000` para clientes e `http://localhost:3000/barbeiro.html` para o painel.

O banco é criado automaticamente em `data.sqlite`. Na primeira execução são criados João, Felipe e Gustavo. A senha inicial é `troque-esta-senha`; defina `BARBER_DEFAULT_PASSWORD` antes da primeira publicação.

## Integrações opcionais

O núcleo de agendamento funciona sem integrações externas. Para sincronizar no Google Calendar, configure `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` e `GOOGLE_CALENDAR_ID`, compartilhando o calendário com o e-mail da conta de serviço. Para WhatsApp Cloud API, configure `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`; o telefone do barbeiro deve estar salvo com DDI.

Em produção, use HTTPS, um processo persistente e backup do `data.sqlite`. Para vários servidores, migre o SQLite para PostgreSQL antes de escalar horizontalmente.
