import React from 'react';
import './Dashboard.css';

function Dashboard({ user, onLogout, children, apiUrl, token }) {
  const getRoleName = (role) => {
    const roles = {
      'admin': 'Yönetici',
      'teacher': 'Öğretmen',
      'student': 'Öğrenci'
    };
    return roles[role] || role;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-container">
            <img src="/logo.jpeg" alt="LexiMindPro" className="logo-icon" />
            <h1>LexiMindPro</h1>
          </div>
        </div>
        
        <div className="header-right">
          <span className="header-username">{user.username}</span>
          {user.role === 'admin' && <span className="crown-icon">👑</span>}
          <span className="header-role-badge">{getRoleName(user.role)}</span>
          {user.points && <span className="header-points">🏆 {user.points}</span>}
          <button onClick={onLogout} className="logout-button">
            Çıkış Yap
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}

export default Dashboard;
