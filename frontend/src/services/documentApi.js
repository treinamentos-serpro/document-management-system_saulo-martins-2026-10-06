export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, userId, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'X-User-Id': userId, ...options.headers },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Nao foi possivel conectar ao servidor. Tente novamente.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.error?.message || 'Nao foi possivel concluir a operacao.',
      response.status,
      body?.error?.code || 'REQUEST_FAILED'
    );
  }
  return response;
}

export async function listDocuments(userId, { signal } = {}) {
  const response = await request('/documents', userId, { signal });
  const { documents } = await response.json();
  return documents;
}

export async function uploadDocument(file, userId) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', userId, { method: 'POST', body });
  const { document } = await response.json();
  return document;
}

export async function downloadDocument(id, userId) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, userId);
  return response.blob();
}