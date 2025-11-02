import React, { useState, useEffect } from 'react';
import './TeacherPanel.css';

function TeacherPanel({ user, apiUrl }) {
  const [showDashboard, setShowDashboard] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [words, setWords] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showDashboard) {
      if (activeTab === 'students') {
        fetchStudents();
      } else if (activeTab === 'words') {
        fetchWords();
      } else if (activeTab === 'overview' || activeTab === 'stats') {
        fetchStatistics();
      }
    }
  }, [activeTab, showDashboard]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
    setLoading(false);
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/words`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWords(data);
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    }
    setLoading(false);
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/teacher/statistics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
    setLoading(false);
  };

  const dashboardCards = [
    {
      id: 'students',
      icon: '👨‍🎓',
      title: 'Öğrenciler',
      description: 'Öğrenci listesi ve takibi',
      color: '#3b82f6',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('students');
      }
    },
    {
      id: 'words',
      icon: '📚',
      title: 'Kelimeler',
      description: 'Kelime listesi',
      color: '#10b981',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('words');
      }
    },
    {
      id: 'stats',
      icon: '📊',
      title: 'İstatistikler',
      description: 'Detaylı istatistikler',
      color: '#f59e0b',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('stats');
      }
    },
    {
      id: 'heatmap',
      icon: '🔥',
      title: 'Aktivite Haritası',
      description: 'Öğrenci aktivite haritası',
      color: '#ef4444',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('heatmap');
      }
    },
    {
      id: 'timeline',
      icon: '⏱️',
      title: 'Zaman Çizelgesi',
      description: 'Aktivite zaman çizelgesi',
      color: '#8b5cf6',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('timeline');
      }
    },
    {
      id: 'progression',
      icon: '📈',
      title: 'Seviye İlerleme',
      description: 'Öğrenci ilerleme takibi',
      color: '#14b8a6',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('progression');
      }
    }
  ];

  if (showDashboard) {
    return (
      <div className="admin-dashboard">
        <div className="welcome-section">
          <h1 className="welcome-title">Hoş Geldin, {user.username}!</h1>
          <p className="welcome-subtitle">Profesyonel öğretmen paneli</p>
        </div>
        
        <div className="dashboard-cards">
          {dashboardCards.map((card) => (
            <div
              key={card.id}
              className="dashboard-card"
              onClick={card.onClick}
              style={{ borderTopColor: card.color }}
            >
              <div className="card-icon" style={{ color: card.color }}>
                {card.icon}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-panel">
      <div className="panel-header">
        <h2>Öğretmen Paneli</h2>
        <button className="back-to-dashboard" onClick={() => setShowDashboard(true)}>
          Ana Menü
        </button>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          📊 Genel Bakış
        </button>
        <button 
          className={activeTab === 'students' ? 'active' : ''} 
          onClick={() => setActiveTab('students')}
        >
          👥 Öğrenciler
        </button>
        <button 
          className={activeTab === 'classes' ? 'active' : ''} 
          onClick={() => setActiveTab('classes')}
        >
          🏫 Sınıflar
        </button>
        <button 
          className={activeTab === 'badges' ? 'active' : ''} 
          onClick={() => setActiveTab('badges')}
        >
          🏅 Rozetler
        </button>
        <button 
          className={activeTab === 'comparison' ? 'active' : ''} 
          onClick={() => setActiveTab('comparison')}
        >
          📈 Karşılaştırma
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid-overview">
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#10b981' }}>{statistics.total_students || 0}</div>
                <div className="stat-label-overview">Toplam Öğrenci</div>
              </div>
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#10b981' }}>{statistics.active_students || 0}</div>
                <div className="stat-label-overview">Aktif Öğrenci</div>
              </div>
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#f59e0b' }}>{statistics.total_words || 0}</div>
                <div className="stat-label-overview">Toplam Kelime</div>
              </div>
              <div className="stat-card-overview">
                <div className="stat-number-overview" style={{ color: '#10b981' }}>{statistics.total_games || 0}</div>
                <div className="stat-label-overview">Toplam Oyun</div>
              </div>
            </div>
            
            <div className="overview-cards">
              <div className="overview-card">
                <div className="overview-card-header">
                  <span className="overview-icon">⭐</span>
                  <h4>Bu Hafta Öne Çıkanlar</h4>
                </div>
                <div className="overview-card-content">
                  <p>Henüz veri yok.</p>
                </div>
              </div>
              
              <div className="overview-card">
                <div className="overview-card-header">
                  <span className="overview-icon">🎮</span>
                  <h4>Oyun Tercihleri</h4>
                </div>
                <div className="overview-card-content">
                  <p>Hangi oyunlar daha popüler?</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-section">
            <h3>Öğrenci Listesi</h3>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Öğrenci Adı</th>
                      <th>Sınıf</th>
                      <th>Puan</th>
                      <th>Öğrenilen Kelime</th>
                      <th>Oynanan Oyun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.filter(s => s.role === 'student').map((student) => (
                      <tr key={student.id}>
                        <td>{student.username}</td>
                        <td>{student.class_name || '-'}</td>
                        <td>{student.points || 0}</td>
                        <td>{student.words_learned || 0}</td>
                        <td>{student.games_played || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'words' && (
          <div className="words-section">
            <h3>Kelime Listesi ({words.length} kelime)</h3>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="words-grid">
                {words.map((word) => (
                  <div key={word.id} className="word-card">
                    <div className="word-english">{word.english}</div>
                    <div className="word-turkish">{word.turkish}</div>
                    <div className="word-meta">
                      <span className={`difficulty difficulty-${word.difficulty}`}>
                        Seviye {word.difficulty}
                      </span>
                      <span className="category">{word.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <h3>Genel İstatistikler</h3>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Toplam Öğrenci</h4>
                  <p className="stat-number">{statistics.total_students || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Toplam Kelime</h4>
                  <p className="stat-number">{statistics.total_words || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Toplam Oyun</h4>
                  <p className="stat-number">{statistics.total_games || 0}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="heatmap-section">
            <h3>🔥 Aktivite Haritası (Son 30 Gün)</h3>
            <div className="heatmap-grid">
              {[...Array(30)].map((_, i) => {
                const activity = Math.floor(Math.random() * 5);
                return (
                  <div
                    key={i}
                    className={`heatmap-cell activity-${activity}`}
                    title={`Gün ${i + 1}: ${activity} aktivite`}
                  >
                    <span>{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="heatmap-legend">
              <span>Düşük</span>
              <div className="legend-colors">
                <div className="activity-0"></div>
                <div className="activity-1"></div>
                <div className="activity-2"></div>
                <div className="activity-3"></div>
                <div className="activity-4"></div>
              </div>
              <span>Yüksek</span>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="timeline-section">
            <h3>⏱️ Aktivite Zaman Çizelgesi (Son 10 Oyun)</h3>
            <div className="timeline-list">
              {students.slice(0, 10).map((student, index) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong>{student.username}</strong>
                      <span className="timeline-game">🎮 {student.games_played || 0} oyun</span>
                    </div>
                    <div className="timeline-meta">
                      <span>⭐ {student.points || 0} puan</span>
                      <span>📚 {student.words_learned || 0} kelime</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'progression' && (
          <div className="progression-section">
            <h3>📈 Seviye İlerleme</h3>
            <div className="progression-list">
              {students.map((student) => {
                const level = Math.floor((student.points || 0) / 100) + 1;
                const progress = ((student.points || 0) % 100);
                return (
                  <div key={student.id} className="progression-item">
                    <div className="progression-header">
                      <span className="student-name">{student.username}</span>
                      <span className="level-badge">Seviye {level}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${progress}%` }}
                      >
                        <span className="progress-text">{progress}%</span>
                      </div>
                    </div>
                    <div className="progression-stats">
                      <span>⭐ {student.points || 0} puan</span>
                      <span>Bir sonraki seviyeye: {100 - progress} puan</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="goals-section">
            <h3>🎯 Hedef Takibi</h3>
            <div className="goals-grid">
              <div className="goal-card">
                <h4>📚 Kelime Öğrenme Hedefi</h4>
                <p className="goal-description">Her öğrenci 50 kelime öğrensin</p>
                <div className="goal-students">
                  {students.filter(s => (s.words_learned || 0) >= 50).length} / {students.length} öğrenci tamamladı
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(students.filter(s => (s.words_learned || 0) >= 50).length / students.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="goal-card">
                <h4>🎮 Oyun Oynama Hedefi</h4>
                <p className="goal-description">Her öğrenci 10 oyun oynasın</p>
                <div className="goal-students">
                  {students.filter(s => (s.games_played || 0) >= 10).length} / {students.length} öğrenci tamamladı
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(students.filter(s => (s.games_played || 0) >= 10).length / students.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div className="goal-card">
                <h4>⭐ Puan Hedefi</h4>
                <p className="goal-description">Her öğrenci 500 puan kazansın</p>
                <div className="goal-students">
                  {students.filter(s => (s.points || 0) >= 500).length} / {students.length} öğrenci tamamladı
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(students.filter(s => (s.points || 0) >= 500).length / students.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherPanel;

