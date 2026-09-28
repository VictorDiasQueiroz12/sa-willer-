import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <section className="login-brand">
        <h1>FinTech Flow</h1>
        <p>Cada centavo registrado, cada alteração rastreada.</p>
      </section>

      <form className="login-card" onSubmit={handleSubmit}>
        <h2>{isRegister ? 'Criar conta' : 'Entrar'}</h2>

        {isRegister && (
          <label>
            Nome
            <input value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" />
          </label>
        )}
        <label>
          E-mail
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={isRegister ? 8 : 1}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
        </label>
        {isRegister && <small className="hint">Mínimo de 8 caracteres, com letras e números.</small>}

        {error && (
          <div className="alert" role="alert">
            {error.message}
            {error.details?.map((d) => (
              <div key={d.field + d.message}>{d.message}</div>
            ))}
          </div>
        )}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Aguarde…' : isRegister ? 'Criar conta' : 'Entrar'}
        </button>
        <button
          type="button"
          className="btn link"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register');
            setError(null);
          }}
        >
          {isRegister ? 'Já tenho conta' : 'Criar uma conta'}
        </button>
      </form>
    </main>
  );
}
