import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi';

export default function UploadComponent({ userId, onUploaded, onBusyChange }) {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!file || file.size === 0) {
      setError('Selecione um arquivo com conteudo.');
      return;
    }

    setIsUploading(true);
    onBusyChange(true);
    try {
      const document = await uploadDocument(file, userId);
      setMessage(`Arquivo "${document.originalName}" enviado com sucesso.`);
      setFile(null);
      fileInput.current.value = '';
      onUploaded();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
      onBusyChange(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <h2 id="upload-title">Enviar documento</h2>
      <form onSubmit={handleSubmit} aria-busy={isUploading}>
        <label htmlFor="document-file">Arquivo</label>
        <div className="upload-controls">
          <input
            ref={fileInput}
            id="document-file"
            type="file"
            required
            disabled={isUploading}
            onChange={(event) => {
              setFile(event.target.files[0] || null);
              setError('');
              setMessage('');
            }}
          />
          <button type="submit" disabled={isUploading || !file}>
            {isUploading ? 'Enviando...' : 'Enviar arquivo'}
          </button>
        </div>
      </form>
      {isUploading && <p role="status">Enviando documento...</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
    </section>
  );
}