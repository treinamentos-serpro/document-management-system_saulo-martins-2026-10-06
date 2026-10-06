# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem documentos, consultem os documentos associados ao seu identificador e baixem seus arquivos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, respeitando o usuário associado.
- Armazenamento dos arquivos em `backend/storage`, usando `multer` com `diskStorage`.
- Armazenamento temporário dos metadados em memória.
- Interface web para upload, listagem e download.

### Fora do escopo

- Autenticação, autorização baseada em credenciais ou gestão de contas.
- Armazenamento em nuvem, banco de dados ou serviços externos.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Persistência dos metadados após reiniciar o backend.
- Busca avançada, pastas e classificação de documentos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo usando `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema gera um identificador único e um nome de armazenamento interno, sem usar o nome fornecido pelo usuário como caminho no filesystem. |
| RF-03 | O sistema registra `id`, `originalName`, `size`, `uploadedAt` e `owner` para cada upload aceito. |
| RF-04 | O usuário pode listar somente os metadados associados ao seu identificador. |
| RF-05 | O usuário pode baixar um documento pelo identificador se ele existir e estiver associado ao seu identificador. |
| RF-06 | O sistema rejeita requisições sem arquivo, com mais de um arquivo, com arquivo vazio ou acima do limite configurado. |
| RF-07 | O sistema informa erros de validação e de documento inexistente em formato JSON consistente. |
| RF-08 | A interface apresenta estados de carregamento, sucesso e erro para upload, listagem e download. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local da aplicação, em `backend/storage`, por meio de `multer` com `diskStorage`. |
| RNF-02 | Os metadados são mantidos em memória nesta fase; não há garantia de persistência após reinício do processo. |
| RNF-03 | Configurações operacionais são obtidas por variáveis de ambiente, incluindo `PORT` e `MAX_FILE_SIZE_BYTES`. |
| RNF-04 | O limite padrão de arquivo é 10 MiB (`10485760` bytes), substituível por `MAX_FILE_SIZE_BYTES`. |
| RNF-05 | O backend não expõe o caminho físico nem o nome interno do arquivo nas respostas da API. |
| RNF-06 | O nome original é tratado como dado não confiável e não pode controlar caminhos ou nomes no filesystem. |
| RNF-07 | O identificador do usuário não representa autenticação. Sem autenticação, o sistema não deve ser considerado seguro para exposição pública. |

## 5. Identidade do usuário

Nesta versão, a identidade é fornecida pelo cabeçalho `X-User-Id`. O valor é obrigatório, não vazio e limitado a 100 caracteres. O backend o registra como `owner` e o utiliza para filtrar listagem e download.

Esse mecanismo é apenas uma associação funcional: qualquer cliente pode declarar outro valor de cabeçalho. Autenticação e verificação confiável da identidade estão fora do escopo.

## 6. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único gerado pelo sistema. |
| `originalName` | string | Nome original informado no upload. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data/hora de recebimento em ISO 8601 UTC. |
| `owner` | string | Valor de `X-User-Id` associado ao documento. |

### Dados internos de armazenamento

O repositório mantém uma associação interna entre `id` e o nome gerado para o arquivo no disco. Essa associação não é retornada pela API. O conteúdo do arquivo reside em `backend/storage`; os metadados e o índice em memória são perdidos ao reiniciar o processo. Arquivos podem permanecer no disco sem metadados correspondentes após um reinício.

## 7. Contratos de API

As rotas do backend são `/upload`, `/documents` e `/documents/:id/download`. No desenvolvimento, o frontend chama as mesmas rotas sob o prefixo `/api`; o proxy do Vite remove esse prefixo.

Todas as rotas funcionais exigem `X-User-Id`.

### Formato de erro

Erros da API usam JSON:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

`code` é estável para uso pelo cliente; `message` é legível e em português. Nenhuma resposta de erro inclui stack trace ou caminho local.

### `POST /upload`

- Entrada: `multipart/form-data`, exatamente um arquivo no campo `file`.
- Restrições: arquivo não vazio e tamanho menor ou igual a `MAX_FILE_SIZE_BYTES`.
- Sucesso: `201 Created`.

```json
{
  "document": {
    "id": "identificador-gerado",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-10-06T12:00:00.000Z",
    "owner": "usuario-123"
  }
}
```

- Erros:
  - `400 Bad Request`: cabeçalho de usuário ausente/inválido, arquivo ausente, arquivo vazio ou campo incorreto.
  - `413 Payload Too Large`: arquivo acima do limite.
  - `500 Internal Server Error`: falha ao gravar arquivo ou registrar metadados.

### `GET /documents`

- Entrada: sem corpo; exige `X-User-Id`.
- Sucesso: `200 OK`, com lista ordenada por `uploadedAt` decrescente.

```json
{
  "documents": [
    {
      "id": "identificador-gerado",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-10-06T12:00:00.000Z",
      "owner": "usuario-123"
    }
  ]
}
```

Uma lista vazia é sucesso e retorna `{"documents":[]}`. Erros: `400 Bad Request` para identidade ausente/inválida; `500 Internal Server Error` para falha inesperada.

### `GET /documents/:id/download`

- Entrada: identificador na URL e `X-User-Id`.
- Sucesso: `200 OK`, corpo binário do arquivo, `Content-Type` detectado quando possível e `Content-Disposition: attachment` com o nome original devidamente tratado.
- Erros:
  - `400 Bad Request`: identidade ou identificador inválido.
  - `404 Not Found`: documento inexistente ou pertencente a outro usuário.
  - `500 Internal Server Error`: falha de leitura do arquivo.

## 8. Decisões arquiteturais

- Backend em CommonJS com Express; frontend em React e Vite.
- Dependências seguem o fluxo `routes -> controllers -> services -> repositories`.
- `routes` declaram endpoints e conectam middlewares/controllers; `controllers` tratam HTTP e validam entrada; `services` aplicam regras de negócio e associação ao usuário; `repositories` gerenciam metadados em memória e acesso aos arquivos locais.
- `multer` com `diskStorage` grava os uploads em `backend/storage`; o nome físico é gerado pelo sistema. O nome original é preservado apenas nos metadados e no download.
- O frontend chama a API usando `fetch` com prefixo `/api`, conforme o proxy de desenvolvimento existente.
- Não adicionar banco de dados, autenticação ou armazenamento externo nesta fase.

## 9. Plano de execução do produto

Estas etapas descrevem a implementação futura; esta tarefa se limita à criação deste documento.

1. Formalizar contratos, validações, identidade e limites do upload. Aceite: requisitos e respostas da API estão definidos sem ambiguidades relevantes.
2. Implementar o backend em camadas, incluindo upload local, metadados em memória, isolamento por `owner` e download. Aceite: testes cobrem sucesso, validações, limites, isolamento e erros de arquivo.
3. Implementar a interface React para upload, listagem e download usando a API. Aceite: estados de sucesso, carregamento e erro são apresentados nos fluxos principais.
4. Validar a integração ponta a ponta e a configuração local. Aceite: o fluxo funciona via proxy do Vite, arquivos ficam em `backend/storage` e não há dependência externa de armazenamento.

## 10. Riscos conhecidos

- Reiniciar o backend apaga o índice de metadados em memória, deixando arquivos no disco inacessíveis pela API.
- `X-User-Id` não autentica o solicitante; não deve ser tratado como controle de acesso seguro.
- Sem limite de armazenamento total ou política de limpeza, uploads podem consumir espaço em disco.
