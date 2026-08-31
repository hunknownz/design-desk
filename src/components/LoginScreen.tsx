import { FormEvent, useState } from 'react';

interface Props { onLogin: (name: string, code: string) => Promise<void> }

export function LoginScreen({ onLogin }: Props) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try { await onLogin(String(data.get('name') || ''), String(data.get('code') || '')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '登录失败'); }
    finally { setBusy(false); }
  }
  return <main className="login-screen">
    <form className="login-card" onSubmit={submit}>
      <div className="login-mark">D</div>
      <h1>Design Desk</h1>
      <p>Review a website preview and leave contextual feedback.</p>
      <label>您的姓名<input name="name" autoComplete="name" required /></label>
      <label>访问码<input name="code" type="password" autoComplete="current-password" required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? '进入中…' : '进入设计台'}</button>
    </form>
  </main>;
}
