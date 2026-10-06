const { test } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
process.env.MAX_FILE_SIZE_BYTES = '32';
const app = require('../src/app');
const repository = require('../src/repositories/documentRepository');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('API de documentos', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const uploadedFiles = new Set();
  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    await Promise.all(Array.from(uploadedFiles, (filePath) => fs.rm(filePath, { force: true })));
  });

  function request(route, options = {}, owner = 'alice') {
    return fetch(`${baseUrl}${route}`, {
      ...options,
      headers: owner === null ? {} : { 'X-User-Id': owner },
    });
  }

  function form(content, field = 'file', filename = 'relatorio.txt') {
    const body = new FormData();
    body.append(field, new Blob([content]), filename);
    return body;
  }

  let document;
  await context.test('upload grava conteudo local e retorna apenas metadados publicos', async () => {
    const response = await request('/upload', { method: 'POST', body: form('conteudo') });
    assert.strictEqual(response.status, 201);
    document = (await response.json()).document;
    const stored = repository.findById(document.id);
    const filePath = repository.getFilePath(stored.filename);
    uploadedFiles.add(filePath);
    assert.strictEqual(path.dirname(filePath), path.resolve(__dirname, '../storage'));
    assert.notStrictEqual(stored.filename, document.originalName);
    assert.strictEqual(await fs.readFile(filePath, 'utf8'), 'conteudo');
    assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.owner, 'alice');
    assert.strictEqual(document.size, 8);
    assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
  });

  await context.test('listagem filtra pelo dono', async () => {
    const response = await request('/documents');
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { documents: [document] });
    const other = await request('/documents', {}, 'bob');
    assert.deepStrictEqual(await other.json(), { documents: [] });
  });

  await context.test('download preserva conteudo, nome e tipo', async () => {
    const response = await request(`/documents/${document.id}/download`);
    assert.strictEqual(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment; filename="relatorio.txt"/);
    assert.match(response.headers.get('content-type'), /^text\/plain/);
    assert.strictEqual(await response.text(), 'conteudo');
  });

  await context.test('documento inexistente ou de outro dono retorna 404', async () => {
    for (const [id, owner] of [[document.id, 'bob'], [randomUUID(), 'alice']]) {
      const response = await request(`/documents/${id}/download`, {}, owner);
      assert.strictEqual(response.status, 404);
      assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
    }
    const invalid = await request('/documents/invalido/download');
    assert.strictEqual(invalid.status, 400);
  });

  await context.test('todas as rotas exigem usuario valido antes de gravar arquivos', async () => {
    for (const owner of [null, ' ', 'x'.repeat(101)]) {
      for (const route of ['/upload', '/documents', `/documents/${document.id}/download`]) {
        const options = route === '/upload' ? { method: 'POST', body: form('rejeitado') } : {};
        const response = await request(route, options, owner);
        assert.strictEqual(response.status, 400);
        assert.strictEqual((await response.json()).error.code, 'INVALID_USER_ID');
      }
    }
  });

  await context.test('rejeita upload ausente, vazio, campo incorreto, multiplos arquivos e excesso de tamanho', async () => {
    const multiple = form('primeiro');
    multiple.append('file', new Blob(['segundo']), 'segundo.txt');
    const storageDirectory = path.resolve(__dirname, '../storage');
    const before = (await fs.readdir(storageDirectory)).sort();
    for (const [body, status, code] of [
      [new FormData(), 400, 'FILE_REQUIRED'],
      [form(''), 400, 'EMPTY_FILE'],
      [form('arquivo', 'outro'), 400, 'INVALID_UPLOAD'],
      [multiple, 400, 'INVALID_UPLOAD'],
      [form('x'.repeat(33)), 413, 'FILE_TOO_LARGE'],
    ]) {
      const response = await request('/upload', { method: 'POST', body });
      assert.strictEqual(response.status, status);
      assert.strictEqual((await response.json()).error.code, code);
      assert.deepStrictEqual((await fs.readdir(storageDirectory)).sort(), before);
    }
  });

  await context.test('aceita tamanho igual ao limite e lista documentos mais recentes primeiro', async () => {
    const response = await request('/upload', { method: 'POST', body: form('x'.repeat(32)) });
    assert.strictEqual(response.status, 201);
    const newest = (await response.json()).document;
    uploadedFiles.add(repository.getFilePath(repository.findById(newest.id).filename));
    const listing = await request('/documents');
    assert.deepStrictEqual((await listing.json()).documents, [newest, document]);
  });

  await context.test('falha ao registrar metadados remove o arquivo e retorna erro generico', async (subcontext) => {
    const storageDirectory = path.resolve(__dirname, '../storage');
    const before = (await fs.readdir(storageDirectory)).sort();
    subcontext.mock.method(repository, 'save', () => {
      throw new Error('Falha interna com caminho privado');
    });
    const response = await request('/upload', { method: 'POST', body: form('conteudo') });
    assert.strictEqual(response.status, 500);
    assert.deepStrictEqual(await response.json(), {
      error: { code: 'INTERNAL_ERROR', message: 'Nao foi possivel concluir a operacao.' },
    });
    assert.deepStrictEqual((await fs.readdir(storageDirectory)).sort(), before);
  });

  await context.test('falha de armazenamento retorna erro generico sem registrar documento', async (subcontext) => {
    const listing = await request('/documents');
    const before = await listing.json();
    subcontext.mock.method(require('node:fs'), 'mkdir', (directory, options, callback) => {
      callback(new Error('Falha interna com caminho privado'));
    });
    const response = await request('/upload', { method: 'POST', body: form('conteudo') });
    assert.strictEqual(response.status, 500);
    assert.deepStrictEqual(await response.json(), {
      error: { code: 'INTERNAL_ERROR', message: 'Nao foi possivel concluir a operacao.' },
    });
    const after = await request('/documents');
    assert.deepStrictEqual(await after.json(), before);
  });

  await context.test('arquivo ausente no disco retorna erro JSON sem caminho fisico', async () => {
    await fs.unlink(repository.getFilePath(repository.findById(document.id).filename));
    const response = await request(`/documents/${document.id}/download`);
    assert.strictEqual(response.status, 500);
    assert.deepStrictEqual(await response.json(), {
      error: { code: 'INTERNAL_ERROR', message: 'Nao foi possivel concluir a operacao.' },
    });
  });

  await context.test('health continua disponivel', async () => {
    const response = await request('/health', {}, null);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { status: 'ok' });
  });
});
