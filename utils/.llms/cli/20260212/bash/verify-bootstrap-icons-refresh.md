# verify-bootstrap-icons-refresh.sh

Replay command:

```bash
bash utils/.llms/cli/20260212/bash/verify-bootstrap-icons-refresh.sh
```

What it verifies:

1. Sidebar icon key swaps are in place:
   - `Meu Trabalho` -> `briefcase`
   - `Tarefas` -> `stickies`
   - `Calendário` -> `calendar3`
   - `Caixa de Saída` -> `envelope-paper`
2. Sidebar icon rendering is centralized with Bootstrap path maps.
3. Integration card action buttons use Bootstrap icons:
   - `Ajuda` -> `info-circle`
   - `Testar Conexão` -> `router`
   - `Configurar` -> `gear-wide-connected`
4. Integration card fallback provider icons use Bootstrap path maps.
5. Integrations page header + notice icons use Bootstrap path maps.
6. Web unit tests pass.
7. Web production build passes.
