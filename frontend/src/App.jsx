import { useState } from 'react';
import UploadComponent from './components/UploadComponent';
import DocumentList from './components/DocumentList';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState('usuario-123');
  const [userInput, setUserInput] = useState('usuario-123');
  const [userError, setUserError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function refreshDocuments() {
    setRefreshKey((current) => current + 1);
  }

  function handleUserChange(event) {
    event.preventDefault();
    const nextUserId = userInput.trim();
    if (!nextUserId || userInput.length > 100) {
      setUserError('Informe um usuario com 1 a 100 caracteres.');
      return;
    }
    setUserError('');
    setUserId(nextUserId);
    setUserInput(nextUserId);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="brand">DMS</p>
        <h1>Gestao de documentos</h1>
      </header>
      <section className="user-section" aria-labelledby="user-title">
        <h2 id="user-title">Usuario</h2>
        <form onSubmit={handleUserChange}>
          <label htmlFor="user-id">Identificador</label>
          <div className="user-controls">
            <input
              id="user-id"
              value={userInput}
              maxLength={100}
              required
              disabled={isUploading}
              onChange={(event) => setUserInput(event.target.value)}
            />
            <button type="submit" className="secondary-button" disabled={isUploading}>Selecionar usuario</button>
          </div>
        </form>
        {userError && <p className="error-message" role="alert">{userError}</p>}
        <p className="active-user">Usuario atual: <strong>{userId}</strong></p>
      </section>
      <UploadComponent key={`upload-${userId}`} userId={userId} onUploaded={refreshDocuments} onBusyChange={setIsUploading} />
      <DocumentList key={`list-${userId}`} userId={userId} refreshKey={refreshKey} onRefresh={refreshDocuments} />
    </main>
  );
}
