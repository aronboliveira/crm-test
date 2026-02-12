# test-retry-recovery-full.sh

## Purpose

Executa validação completa de recuperação:
- suíte JSON safety direcionada
- suíte web completa
- suíte api completa

## Command

```bash
bash utils/.llms/cli/20260212/bash/test-retry-recovery-full.sh
```

## Notes

- O output pode conter logs `WARN/ERROR` esperados de cenários negativos de teste.
- Critério de sucesso: todos os suites finalizam como `PASS`.
