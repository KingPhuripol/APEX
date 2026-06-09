import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Layout from './components/Layout';
import Worklist from './pages/Worklist';
import Dashboard from './pages/Dashboard';
import PatientHub from './pages/PatientHub';
import Login from './pages/Login';

import MobileHub from './pages/MobileHub';

function ProtectedRoute() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/liff" element={<MobileHub />} />
      <Route path="/mobile" element={<MobileHub />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="worklist" element={<Worklist />} />
          <Route path="patient/:id" element={<PatientHub />} />
          <Route path="patient/:id/:module" element={<PatientHub />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
