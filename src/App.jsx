import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RobotProvider } from './sim/RobotContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Navigation from './pages/Navigation';
import Inspection from './pages/Inspection';
import Missions from './pages/Missions';
import Health from './pages/Health';

const KEY = 'mmr.user';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };

export default function App() {
  const [user, setUser] = useState(load);

  const login = (u) => { try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* private mode */ } setUser(u); };
  const logout = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setUser(null); };

  if (!user) return <Login onLogin={login} />;

  return (
    <RobotProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout user={user} onLogout={logout} />}>
            <Route index element={<Overview />} />
            <Route path="navigation" element={<Navigation />} />
            <Route path="inspection" element={<Inspection />} />
            <Route path="missions" element={<Missions />} />
            <Route path="health" element={<Health />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </RobotProvider>
  );
}
