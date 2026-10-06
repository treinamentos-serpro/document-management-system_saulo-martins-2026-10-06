import { useState } from 'react';
import { downloadDocument } from '../services/documentApi';

export default function DownloadButton({ document, userId }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleDownload() {
    setIsDownloading(true);
    setError('');
    setMessage('');
    try {
      const blob = await downloadDocument(document.id, userId);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      try {
        link.href = url;
        link.download = document.originalName;
        window.document.body.appendChild(link);
        link.click();
        setMessage('Download iniciado.');
      } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        type="button"
        className="secondary-button"
        disabled={isDownloading}
        aria-label={`Baixar ${document.originalName}`}
        onClick={handleDownload}
      >
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
    </div>
  );
}