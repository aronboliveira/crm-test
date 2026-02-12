# reseed-and-verify-my-work.sh

## Purpose

Reexecuta o seed da API e valida rapidamente se o dashboard `Meu Trabalho` tem volume realista de dados para `admin@corp.local`.

## Command

```bash
utils/.llms/cli/20260212/bash/reseed-and-verify-my-work.sh
```

## Optional

Pular testes unitários:

```bash
utils/.llms/cli/20260212/bash/reseed-and-verify-my-work.sh --no-tests
```

## What it does

1. `docker-compose restart api` (com `SEED_MOCKS=1`).
2. Aguarda healthcheck da API.
3. Consulta MongoDB para:
   - total geral de tasks/projects
   - total de tasks/projects do admin
   - distribuição por status/prioridade
   - tarefas com prazo em 7 dias.
4. Executa testes unitários:
   - web: `npm test -- --run`
   - api: `npm test -- --runInBand modules/tasks/tasks.service.spec.ts modules/projects/projects.service.spec.ts`
