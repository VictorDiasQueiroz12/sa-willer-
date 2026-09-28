import { useAuth } from './AuthContext.jsx';
import Dashboard from './components/Dashboard.jsx';
import Login from './components/Login.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="boot">Carregando…</p>;
  return user ? <Dashboard /> : <Login />;
}
