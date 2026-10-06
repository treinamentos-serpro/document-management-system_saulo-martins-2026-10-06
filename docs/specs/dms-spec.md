# Especificacao - Document Management System

## 1. Objetivo

Permitir que usuarios enviem documentos, consultem os documentos associados ao seu identificador e baixem os arquivos. Os arquivos ficam no filesystem local e os metadados sao mantidos em memoria.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisicao.
- Listagem dos documentos associados ao identificador de usuario da requisicao.
- Download de um documento por identificador, limitado ao usuario associado.
- Armazenamento local em `backend/storage` com `multer` e `diskStorage`.
- Metadados mantidos em memoria.
- Interface web para upload, listagem e download.

### Fora do escopo

- Autenticacao e gestao de contas.
- Banco de dados, armazenamento em nuvem ou servicos externos.
- Versionamento, edicao, exclusao e compartilhamento.
- Persistencia de metadados apos reiniciar o backend.
- Busca avancada, pastas e classificacao.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuario pode enviar um arquivo em `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema gera um identificador unico e um nome interno para armazenamento; o nome original nunca e usado como caminho local. |
| RF-03 | O sistema registra identificador, nome original, tamanho, data de upload e usuario associado. |
| RF-04 | O usuario pode listar somente os metadados associados ao identificador enviado na requisicao. |
| RF-05 | O usuario pode baixar um documento pelo identificador se o documento existir e estiver associado ao mesmo identificador de usuario. |
| RF-06 | O sistema rejeita requisicoes sem arquivo, com arquivo vazio ou acima do limite configurado. |
| RF-07 | O sistema retorna erros de validacao e de documento inexistente em JSON consistente. |
| RF-08 | A interface informa estados de carregamento, sucesso e erro nos fluxos de upload, listagem e download. |

## 4. Requisitos nao funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos sao gravados exclusivamente em `backend/storage` por `multer` com `diskStorage`. |
| RNF-02 | Os metadados ficam em memoria e se perdem quando o processo backend reinicia. |
| RNF-03 | A porta e o limite de upload sao configuraveis por `PORT` e `MAX_FILE_SIZE_BYTES`. |
| RNF-04 | O limite padrao por arquivo e 10 MiB (10485760 bytes). |
| RNF-05 | A API nao expoe caminhos locais nem nomes internos dos arquivos. |
| RNF-06 | Nomes de arquivos e valores recebidos do cliente sao dados nao confiaveis. |
| RNF-07 | O identificador de usuario nao e autenticacao e nao protege a aplicacao contra clientes maliciosos. |

## 5. Identidade do usuario

As rotas funcionais exigem o cabecalho `X-User-Id`, nao vazio e com no maximo 100 caracteres. O backend associa o valor ao documento e o utiliza para filtrar listagem e download. Esse mecanismo serve somente para associacao funcional; autenticacao e autorizacao confiavel nao fazem parte desta versao.

## 6. Modelo de dados

### Metadados publicos

| Campo | Tipo | Descricao |
| --- | --- | --- |
| `id` | string | Identificador unico gerado pelo sistema. |
| `originalName` | string | Nome original informado no upload. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora em ISO 8601 UTC. |
| `owner` | string | Valor de `X-User-Id` associado ao documento. |

### Armazenamento interno

O repositorio mantem uma associacao entre `id` e o nome gerado para o arquivo em disco. Essa associacao nao e retornada pela API. Os metadados e o indice em memoria sao perdidos ao reiniciar o backend; arquivos podem permanecer em disco sem metadados correspondentes.

## 7. Contratos de API

Todas as rotas funcionais exigem `X-User-Id`. O backend expoe `/upload`, `/documents` e `/documents/:id/download`. No desenvolvimento, o frontend usa o prefixo `/api`, removido pelo proxy do Vite.

Erros sao retornados no formato:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento nao encontrado."
  }
}
```

### `POST /upload`

- Entrada: `multipart/form-data` com um arquivo no campo `file`.
- Validacao: arquivo nao vazio e tamanho menor ou igual a `MAX_FILE_SIZE_BYTES`.
- Sucesso: `201 Created`, retornando `document` com `id`, `originalName`, `size`, `uploadedAt` e `owner`.
- Erros: `400` para usuario/arquivo invalido, `413` para arquivo acima do limite e `500` para falha interna.

### `GET /documents`

- Entrada: sem corpo; exige `X-User-Id`.
- Sucesso: `200 OK`, `{ "documents": [...] }`, ordenado por data decrescente. Lista vazia retorna `{"documents":[]}`.

### `GET /documents/:id/download`

- Entrada: identificador na URL e `X-User-Id`.
- Sucesso: `200 OK`, conteudo binario com `Content-Disposition: attachment` e nome original.
- Erros: `400` para usuario/identificador invalido, `404` para documento inexistente, de outro usuario ou sem arquivo, e `500` para outra falha de leitura.

## 8. Decisoes arquiteturais

- Backend CommonJS com Express; frontend React e Vite.
- Fluxo de dependencia: `routes -> controllers -> services -> repositories`.
- Rotas conectam endpoints e middlewares; controllers validam entrada HTTP e formatam respostas; services concentram regras de negocio; repositories mantem metadados em memoria e acessam arquivos locais.
- `multer` com `diskStorage` grava uploads em `backend/storage` usando nome interno gerado pelo sistema.
- O frontend consome a API por `fetch` com prefixo `/api`.
- Nao adicionar banco de dados, autenticacao ou armazenamento externo nesta fase.

## 9. Plano de execucao

1. Formalizar contratos, validacoes, identidade e limite de upload. Aceite: requisitos e respostas de API estao definidos.
2. Implementar o backend em camadas, incluindo upload local, metadados em memoria, isolamento por usuario e download. Aceite: testes cobrem sucesso, validacoes, limites, isolamento e erros de arquivo.
3. Implementar a interface React para upload, listagem e download. Aceite: estados de sucesso, carregamento e erro nos fluxos principais.
4. Validar integracao ponta a ponta e configuracao local. Aceite: fluxo via proxy Vite, arquivos em `backend/storage` e nenhuma dependencia externa de armazenamento.

## 10. Riscos conhecidos

- Reiniciar o backend apaga o indice de metadados em memoria, deixando arquivos no disco sem acesso pela API.
- `X-User-Id` nao autentica o solicitante e nao deve ser considerado controle de acesso seguro.
- Sem cota total ou politica de limpeza, uploads podem consumir o espaco disponivel em disco.