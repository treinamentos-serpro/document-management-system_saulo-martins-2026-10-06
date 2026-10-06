import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, listDocuments, uploadDocument, downloadDocument } from '../src/services/documentApi.js';

test('lista documentos via /api e envia identidade e signal', async (context) => {
  const documents = [{ id: 'document-id', originalName: 'relatorio.txt' }];
  const signal = new AbortController().signal;
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ documents }));
  assert.deepEqual(await listDocuments('usuario-123', { signal }), documents);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/documents');
  assert.equal(options.headers['X-User-Id'], 'usuario-123');
  assert.equal(options.signal, signal);
});

test('envia um arquivo no campo file sem definir o boundary manualmente', async (context) => {
  const document = { id: 'document-id' };
  const file = new File(['conteudo'], 'relatorio.txt');
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ document }, { status: 201 }));
  assert.deepEqual(await uploadDocument(file, 'usuario-123'), document);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/upload');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['X-User-Id'], 'usuario-123');
  assert.equal(options.headers['Content-Type'], undefined);
  assert.deepEqual([...options.body.keys()], ['file']);
  assert.equal(options.body.get('file').name, file.name);
});

test('baixa o binario com identidade e identificador codificado', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response('conteudo'));
  assert.equal(await (await downloadDocument('id/test', 'usuario-123')).text(), 'conteudo');
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/documents/id%2Ftest/download');
  assert.equal(options.headers['X-User-Id'], 'usuario-123');
});

test('preserva mensagens de erro do backend', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { code: 'FILE_TOO_LARGE', message: 'Arquivo muito grande.' },
  }, { status: 413 }));
  await assert.rejects(uploadDocument(new File(['conteudo'], 'arquivo.txt'), 'usuario-123'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'Arquivo muito grande.');
    assert.equal(error.status, 413);
    assert.equal(error.code, 'FILE_TOO_LARGE');
    return true;
  });
});

test('trata respostas de erro sem JSON', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response('Indisponivel', { status: 502 }));
  await assert.rejects(listDocuments('usuario-123'), /Nao foi possivel concluir/);
});

test('trata falhas de rede e preserva cancelamentos', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(listDocuments('usuario-123'), /Nao foi possivel conectar/);
  fetchMock.mock.mockImplementation(async () => { throw new DOMException('Cancelado', 'AbortError'); });
  await assert.rejects(listDocuments('usuario-123'), { name: 'AbortError' });
});