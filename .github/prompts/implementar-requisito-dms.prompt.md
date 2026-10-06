---
name: implementar-requisito-dms
description: Implementa um requisito específico do DMS a partir da especificação, com mudanças mínimas e testes correspondentes.
argument-hint: ID do requisito (por exemplo RF-06) e contexto opcional
agent: agent
---

Implemente o requisito `${input:requisito:ID do requisito, por exemplo RF-06}` no Document Management System.

1. Leia [docs/specs/dms-spec.md](../../docs/specs/dms-spec.md), [.github/copilot-instructions.md](../copilot-instructions.md) e o código e os testes mais próximos do requisito.
2. Determine os critérios de aceite a partir da especificação e altere somente as camadas necessárias. Preserve o fluxo do backend `routes -> controllers -> services -> repositories` e as convenções do frontend.
3. Atualize ou adicione testes seguindo os padrões existentes. Não crie uma camada ou abstração que o requisito não precise.
4. Execute `npm --prefix backend test`. Se a alteração envolver o frontend, execute também `npm --prefix frontend test` e `npm --prefix frontend run build`.
5. Se o ID não existir ou houver ambiguidade que impeça uma implementação correta, não invente o contrato: explique a dúvida e peça esclarecimento.

Ao concluir, resuma o comportamento implementado, os arquivos alterados, a cobertura de teste e os comandos executados, incluindo falhas ou validações que não puderam ser realizadas.