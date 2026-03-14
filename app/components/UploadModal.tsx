'use client';
import { useState, useRef } from 'react';
import { showToast } from './Toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.pdf')) {
      showToast('Apenas arquivos PDF são aceitos.', 'error');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      showToast('Arquivo deve ter no máximo 10MB.', 'error');
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace('.pdf', ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) {
      showToast('Preencha o título e selecione um arquivo.', 'error');
      return;
    }
    setLoading(true);
    const interval = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 300);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title);
      fd.append('status', status);
      const res = await fetch('/api/documents', { method: 'POST', body: fd });
      clearInterval(interval); setProgress(100);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao criar documento');
      showToast('Documento enviado com sucesso!', 'success');
      onSuccess();
    } catch (err: any) {
      clearInterval(interval); setProgress(0);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">📄 Novo Documento</div>
        <div className="modal-subtitle">Faça upload de um documento PDF para o vault.</div>

        <div
          className={`upload-zone ${drag ? 'drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          style={{ marginBottom: 16 }}
        >
          <input ref={inputRef} type="file" accept=".pdf" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className="upload-icon">{file ? '✅' : '📁'}</div>
          {file ? (
            <>
              <div className="upload-title">{file.name}</div>
              <div className="upload-subtitle">{(file.size / 1024).toFixed(1)} KB · Clique para trocar</div>
            </>
          ) : (
            <>
              <div className="upload-title">Arraste o PDF ou clique para selecionar</div>
              <div className="upload-subtitle">Apenas PDF · Máximo 10MB</div>
            </>
          )}
        </div>

        {loading && (
          <div className="progress-wrap" style={{ marginBottom: 16 }}>
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Título do Documento *</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Contrato de Prestação de Serviços" />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input form-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="draft">Rascunho</option>
            <option value="pending">Pendente</option>
            <option value="signed">Assinado</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Enviando…' : '🚀 Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
