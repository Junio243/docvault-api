'use client';
import { useState, useEffect, useCallback } from 'react';
import UploadModal from './components/UploadModal';
import { ToastContainer, showToast } from './components/Toast';

type DocStatus = 'draft' | 'pending' | 'signed' | 'archived';

interface Doc {
  id: string;
  title: string;
  status: DocStatus;
  version: number;
  file_url: string;
  file_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface Meta { total: number; page: number; limit: number; }

const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Rascunho', pending: 'Pendente', signed: 'Assinado', archived: 'Arquivado',
};

function StatusBadge({ status }: { status: DocStatus }) {
  const icons: Record<DocStatus, string> = { draft: '✏️', pending: '⏳', signed: '✅', archived: '📦' };
  return (
    <span className={`badge badge-${status}`}>
      {icons[status]} {STATUS_LABELS[status]}
    </span>
  );
}

function Sidebar({ activeView, setView, user }: {
  activeView: string; setView: (v: string) => void; user: any;
}) {
  const items = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'documents', icon: '📄', label: 'Documentos' },
    { id: 'verified', icon: '🔐', label: 'Verificações' },
  ];
  const initials = user?.email?.[0]?.toUpperCase() ?? '?';
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🔒</div>
        <div className="sidebar-logo-text">Doc<span>Vault</span></div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {items.map(i => (
          <a key={i.id} className={`nav-item ${activeView === i.id ? 'active' : ''}`} onClick={() => setView(i.id)}>
            <span className="icon">{i.icon}</span> {i.label}
          </a>
        ))}
        <div className="nav-section-label" style={{ marginTop: 24 }}>Conta</div>
        <a className="nav-item" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.reload(); }}>
          <span className="icon">🚪</span> Sair
        </a>
      </nav>
      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-email">{user?.email ?? 'Usuário'}</div>
            <div className="user-role">Conta ativa</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardView({ docs, loading }: { docs: Doc[]; loading: boolean }) {
  const total = docs.length;
  const signed = docs.filter(d => d.status === 'signed').length;
  const pending = docs.filter(d => d.status === 'pending').length;
  const withHash = docs.filter(d => d.file_hash).length;

  const stats = [
    { label: 'Total de Documentos', value: total, icon: '📄', color: 'rgba(79,124,255,0.15)', sub: 'no vault' },
    { label: 'Assinados', value: signed, icon: '✅', color: 'rgba(16,185,129,0.15)', sub: 'com assinatura' },
    { label: 'Pendentes', value: pending, icon: '⏳', color: 'rgba(245,158,11,0.15)', sub: 'aguardando revisão' },
    { label: 'Com Hash', value: withHash, icon: '🔐', color: 'rgba(124,58,237,0.15)', sub: 'verificáveis' },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral dos seus documentos no vault.</p>
      </div>
      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-header">
              <div className="stat-label">{s.label}</div>
              <div className="stat-icon" style={{ background: s.color }}>{s.icon}</div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 36, width: 60 }} />
            ) : (
              <div className="stat-value">{s.value}</div>
            )}
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Documentos Recentes</div><div className="card-subtitle">Últimas atividades</div></div>
        </div>
        <RecentActivity docs={docs.slice(0, 5)} loading={loading} />
      </div>
    </>
  );
}

function RecentActivity({ docs, loading }: { docs: Doc[]; loading: boolean }) {
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44 }} />)}
    </div>
  );
  if (!docs.length) return (
    <div className="empty-state">
      <div className="empty-icon">📭</div>
      <div className="empty-title">Nenhum documento ainda</div>
      <div className="empty-subtitle">Faça upload do primeiro documento para começar.</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {docs.map(d => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, background: 'rgba(79,124,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-semibold truncate" style={{ fontSize: '0.875rem' }}>{d.title}</div>
            <div className="text-xs text-muted">v{d.version} · {new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
          </div>
          <StatusBadge status={d.status} />
        </div>
      ))}
    </div>
  );
}

function DocumentsView({ docs, loading, search, setSearch, onUpload, onDelete, setDocs }: {
  docs: Doc[]; loading: boolean;
  search: string; setSearch: (s: string) => void;
  onUpload: () => void;
  onDelete: (id: string) => void;
  setDocs: (docs: Doc[]) => void;
}) {
  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = async (id: string, newStatus: DocStatus) => {
    try {
      const fd = new FormData();
      fd.append('status', newStatus);
      const res = await fetch(`/api/documents/${id}`, { method: 'PATCH', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setDocs(docs.map(d => d.id === id ? { ...d, status: newStatus } : d));
      showToast('Status atualizado!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Documentos</h1>
        <p>Gerencie todos os arquivos do seu vault.</p>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Buscar documentos…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={onUpload}>+ Novo Documento</button>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0' }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{search ? '🔎' : '📂'}</div>
              <div className="empty-title">{search ? 'Nenhum resultado' : 'Nenhum documento'}</div>
              <div className="empty-subtitle">{search ? 'Tente outro termo.' : 'Clique em "+ Novo Documento" para começar.'}</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Status</th>
                  <th>Versão</th>
                  <th>Hash</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-semibold truncate" style={{ maxWidth: 280 }}>{d.title}</div>
                    </td>
                    <td>
                      <select
                        value={d.status}
                        onChange={e => handleStatusChange(d.id, e.target.value as DocStatus)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.8rem' }}
                      >
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td><span className="badge badge-draft">v{d.version}</span></td>
                    <td>
                      {d.file_hash
                        ? <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>🔐 {d.file_hash.slice(0, 8)}…</span>
                        : <span className="text-muted text-xs">—</span>}
                    </td>
                    <td className="text-sm text-muted">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className="flex gap-2">
                        <a href={d.file_url} target="_blank" rel="noopener" className="btn btn-sm btn-outline">⬇ Baixar</a>
                        <button className="btn btn-sm btn-danger" onClick={() => onDelete(d.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function VerifyView({ docs }: { docs: Doc[] }) {
  const [selected, setSelected] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!selected || !file) { showToast('Selecione o documento e o arquivo.', 'error'); return; }
    setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/documents/${selected}/verify`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setResult(data.data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Verificação de Integridade</h1>
        <p>Compare um arquivo com o hash SHA-256 registrado no vault.</p>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Verificar Arquivo</div></div>
          <div className="form-group">
            <label className="form-label">Documento do Vault</label>
            <select className="form-input form-select" value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">Selecione um documento…</option>
              {docs.filter(d => d.file_hash).map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Arquivo para Verificar (PDF)</label>
            <input type="file" accept=".pdf" className="form-input" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <button className="btn btn-primary w-full" onClick={handleVerify} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? '⏳ Verificando…' : '🔍 Verificar Integridade'}
          </button>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Resultado</div></div>
          {!result ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-icon">🛡️</div>
              <div className="empty-subtitle">Aguardando verificação…</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 20, borderRadius: 10, background: result.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${result.valid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>{result.valid ? '✅' : '❌'}</div>
                <div style={{ fontWeight: 700, color: result.valid ? 'var(--green)' : 'var(--red)' }}>
                  {result.valid ? 'Arquivo Autêntico' : 'Arquivo Adulterado'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{result.message}</div>
              </div>
              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Versão</span><span>v{result.version}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="text-muted" style={{ flexShrink: 0 }}>Hash Registrado</span>
                  <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--green)' }}>{result.stored_hash}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="text-muted" style={{ flexShrink: 0 }}>Hash Fornecido</span>
                  <span style={{ fontFamily: 'monospace', wordBreak: 'break-all', color: result.valid ? 'var(--green)' : 'var(--red)' }}>{result.provided_hash}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function AuthPage({ onAuth }: { onAuth: (user: any) => void }) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email || !password) { showToast('Preencha todos os campos.', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro de autenticação');
      if (tab === 'signup') {
        showToast('Conta criada! Verifique seu email.', 'success');
        setTab('login');
      } else {
        showToast('Bem-vindo ao DocVault!', 'success');
        onAuth(data.data?.user);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🔒</div>
          <h1>Doc<span>Vault</span></h1>
          <p>Gestão segura de documentos</p>
        </div>
        <div className="card">
          <div className="auth-tabs">
            <div className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Entrar</div>
            <div className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Criar conta</div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
          </div>
          <button className="btn btn-primary w-full" style={{ marginTop: 8 }} onClick={handle} disabled={loading}>
            {loading ? '⏳ Aguarde…' : tab === 'login' ? '🚀 Entrar' : '✨ Criar Conta'}
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState('dashboard');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents?limit=50');
      const data = await res.json();
      if (res.ok) setDocs(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.data?.user) {
          setUser(data.data.user); setAuthed(true); loadDocs();
        }
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [loadDocs]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir.');
      setDocs(prev => prev.filter(d => d.id !== id));
      showToast('Documento excluído.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (!authChecked) return null;
  if (!authed) return <AuthPage onAuth={u => { setUser(u); setAuthed(true); loadDocs(); }} />;

  return (
    <div className="app-layout">
      <Sidebar activeView={view} setView={setView} user={user} />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            {view === 'dashboard' ? '📊 Dashboard' : view === 'documents' ? '📄 Documentos' : '🔐 Verificações'}
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>+ Novo</button>
          </div>
        </header>
        <main className="page-content">
          {view === 'dashboard' && <DashboardView docs={docs} loading={loading} />}
          {view === 'documents' && (
            <DocumentsView
              docs={docs} loading={loading}
              search={search} setSearch={setSearch}
              onUpload={() => setShowUpload(true)}
              onDelete={handleDelete}
              setDocs={setDocs}
            />
          )}
          {view === 'verified' && <VerifyView docs={docs} />}
        </main>
      </div>
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); loadDocs(); }}
        />
      )}
      <ToastContainer />
    </div>
  );
}
