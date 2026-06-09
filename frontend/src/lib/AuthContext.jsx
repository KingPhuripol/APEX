import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('apex-auth');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (doctorId, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, password })
      });
      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('apex-auth', JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Auth Server is unreachable. Please start services/auth' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('apex-auth');
  };

  if (loading) {
    return <div className="h-screen w-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text)]">Loading APEX Secure Environment...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
