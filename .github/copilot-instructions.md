# Instruções do projeto - Document Management System (DMS)

Estas instruções são aplicadas automaticamente pelo GitHub Copilot em todas as
interações neste repositório. Use-as como contexto de engenharia para gerar
código consistente com a arquitetura e as convenções do projeto.

## Visão geral

Sistema web para gestão de documentos com:

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário

## Stack

- Backend: Node.js + Express (CommonJS)
- Frontend: React + Vite (ESM)
- Testes backend: runner nativo do Node (`node:test`)
- Sem TypeScript nesta fase (JavaScript puro)

## Princípios obrigatórios

- SOLID, DRY, KISS, YAGNI
- 12-Factor App (configuração via variáveis de ambiente)
- Código legível tem prioridade sobre código complexo
- Sem overengineering e sem abstrações desnecessárias

## Arquitetura do backend (Clean Architecture simples)

Separe responsabilidades em quatro camadas dentro de `backend/src`:

- `routes/`: definem os endpoints e delegam para os controllers
- `controllers/`: tratam entrada/saída HTTP e validação básica
- `services/`: concentram as regras de negócio
- `repositories/`: cuidam da persistência

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas não conhecem camadas externas.

## Endpoints previstos

- `POST /upload` - envia um documento
- `GET /documents` - lista os documentos
- `GET /documents/:id/download` - baixa um documento
- O contrato completo, os códigos de erro e as decisões de produto estão em [docs/specs/dms-spec.md](../docs/specs/dms-spec.md); mantenha essa especificação como fonte de verdade.

## Comandos de desenvolvimento e validação

- Backend: `npm --prefix backend start`, `npm --prefix backend run dev` e `npm --prefix backend test`.
- Frontend: `npm --prefix frontend run dev`, `npm --prefix frontend test` e `npm --prefix frontend run build`.
- O frontend requer Node.js 24 ou superior. O backend usa o runner nativo `node:test`.
- Não há lint ou formatador configurado; não introduza essas ferramentas sem necessidade explícita.
- Os testes existentes são referências para os padrões de integração do backend em [backend/test/app.test.js](../backend/test/app.test.js) e de API do frontend em [frontend/test/documentApi.test.js](../frontend/test/documentApi.test.js).

## Armazenamento (restrição importante)

- Os arquivos enviados são gravados no filesystem local da aplicação, na pasta
  `backend/storage`, utilizando `multer` com `diskStorage`.
- Os metadados dos documentos (id, nome original, tamanho, data, dono) ficam em
  memória nesta fase inicial.
- Não utilize provedores de armazenamento externos ou serviços de upload de
  terceiros. O armazenamento é estritamente local à aplicação.

## Convenções do frontend

- Componentes funcionais com React Hooks
- Organização baseada em componentes: `components/`, `pages/`, `services/`
- A comunicação com o backend é feita via `fetch`, através do prefixo `/api`
  (proxy configurado no Vite)
- Reutilize componentes e evite duplicação
- Envie uploads com `FormData` sem definir manualmente `Content-Type`; o navegador inclui o boundary multipart.
- Ao usar `AbortController`, propague `AbortError` sem tratá-lo como falha de rede.

## Regras de implementação importantes

- `X-User-Id` é obrigatório nas rotas de documentos e deve ser validado; ele associa e filtra documentos, mas não autentica o usuário.
- Preserve o isolamento por dono na listagem e no download. Não exponha o nome interno do arquivo nem caminhos locais nas respostas.
- O limite de upload é inclusivo: rejeite somente quando `file.size > MAX_FILE_SIZE_BYTES`. Se um upload já gravado for rejeitado ou falhar ao registrar metadados, remova o arquivo do disco.
- Mantenha o armazenamento em `backend/storage` com `multer` e `diskStorage`, e os metadados em memória. Não adicione banco de dados nem armazenamento externo nesta fase.
- Erros esperados devem preservar os códigos e status do contrato; erros inesperados devem retornar uma mensagem genérica, sem stack trace ou detalhes internos.

## Estilo de código

- Nomes descritivos em inglês para símbolos de código
- Mensagens ao usuário e comentários em português
- Funções pequenas e com responsabilidade única
- Trate erros nos limites do sistema (entrada HTTP, leitura/escrita de arquivos)

## Restrições gerais

- Não quebrar funcionalidades existentes
- Manter o seed simples e evolutivo
- Preferir dependências já presentes no `package.json`
