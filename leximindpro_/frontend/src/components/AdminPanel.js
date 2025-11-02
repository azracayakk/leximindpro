import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './AdminPanel.css';
import GameSelector from './games/GameSelector';

function AdminPanel({ user, token, apiUrl }) {
  const [showDashboard, setShowDashboard] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  
  // Force CSS injection for modern admin dashboard - ensures styles apply
  useEffect(() => {
    const styleId = 'admin-dashboard-forced-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = `
        /* Modern Admin Dashboard - Tailwind Prensip Uygulaması */
        /* 1. Arka plan: bg-gradient-to-br from-white to-[#eef7ff] */
        main.dashboard-content .admin-dashboard-modern,
        .admin-dashboard-modern,
        .dashboard-content .admin-dashboard-modern,
        div.admin-dashboard-modern {
          background: linear-gradient(to bottom right, #ffffff 0%, #eef7ff 100%) !important;
          min-height: calc(100vh - 80px) !important;
          padding: 0 !important;
          margin: -30px -30px 0 -30px !important;
          width: calc(100% + 60px) !important;
          max-width: none !important;
          position: relative !important;
          box-sizing: border-box !important;
        }
        
        /* 2. Ana container: max-w-6xl mx-auto px-6 py-16 */
        .admin-dashboard-container {
          max-width: 1152px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-left: 24px !important;
          padding-right: 24px !important;
          padding-top: 64px !important;
          padding-bottom: 64px !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* 3. Başlık: text-4xl font-bold text-center text-gray-800 mb-4 */
        .welcome-title-modern {
          font-size: 2.25rem !important;
          font-weight: 700 !important;
          text-align: center !important;
          color: #1f2937 !important;
          margin: 0 0 16px 0 !important;
          line-height: 1.2 !important;
        }
        
        /* 3. Alt açıklama: text-gray-500 text-center text-lg mb-14 */
        .welcome-subtitle-modern {
          color: #6b7280 !important;
          text-align: center !important;
          font-size: 1.125rem !important;
          margin: 0 0 56px 0 !important;
          line-height: 1.6 !important;
        }
        
        /* 4. Kart Grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 */
        .dashboard-cards-modern {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 32px !important;
          margin-top: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        @media (min-width: 640px) {
          .dashboard-cards-modern {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        @media (min-width: 1024px) {
          .dashboard-cards-modern {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        
        /* 5. Kart Bileşeni: bg-white p-8 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] */
        .dashboard-card-modern {
          background-color: #ffffff !important;
          padding: 32px !important;
          border-radius: 20px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          text-align: center !important;
          border: none !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
          width: 100% !important;
        }
        
        /* hover:shadow-lg hover:scale-[1.02] */
        .dashboard-card-modern:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          transform: scale(1.02) !important;
        }
        
        /* 6. İkon: text-4xl mb-4 */
        .card-icon-modern {
          font-size: 3rem !important;
          margin-bottom: 16px !important;
          display: block !important;
          line-height: 1 !important;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .dashboard-card-modern:hover .card-icon-modern {
          transform: scale(1.05) !important;
        }
        
        /* Başlık: text-lg font-semibold text-gray-800 mb-1 */
        .card-title-modern {
          font-size: 1.125rem !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin: 0 0 4px 0 !important;
          line-height: 1.4 !important;
        }
        
        /* Açıklama: text-sm text-gray-500 */
        .card-description-modern {
          font-size: 0.875rem !important;
          color: #6b7280 !important;
          margin: 0 !important;
          line-height: 1.5 !important;
        }
      `;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // Keep styles persistent
    };
  }, []);
  const [users, setUsers] = useState([]);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student', class_name: '' });
  const [newWord, setNewWord] = useState({ english: '', turkish: '', difficulty: 1, category: 'general' });
  const [csvFile, setCsvFile] = useState(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [league, setLeague] = useState(null);

  useEffect(() => {
    if (!showDashboard) {
      if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'words') {
        fetchWords();
      } else if (activeTab === 'leaderboard') {
        fetchLeaderboard();
      } else if (activeTab === 'achievements') {
        fetchAchievements();
      } else if (activeTab === 'league') {
        fetchLeague();
      }
    }
  }, [activeTab, showDashboard]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      });
      if (response.ok) {
        toast.success('✅ Kullanıcı başarıyla oluşturuldu!');
        setNewUser({ username: '', password: '', role: 'student', class_name: '' });
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Kullanıcı oluşturulamadı');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleCreateWord = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newWord)
      });
      if (response.ok) {
        toast.success('✅ Kelime başarıyla eklendi!');
        setNewWord({ english: '', turkish: '', difficulty: 1, category: 'general' });
        fetchWords();
      } else {
        toast.error('Kelime eklenemedi');
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('🗑️ Kullanıcı silindi');
        fetchUsers();
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (!window.confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${apiUrl}/words/${wordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        toast.success('🗑️ Kelime silindi');
        fetchWords();
      }
    } catch (error) {
      toast.error('Hata oluştu: ' + error.message);
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Lütfen bir CSV dosyası seçin');
      return;
    }

    setCsvLoading(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header if exists
        const startIndex = lines[0].toLowerCase().includes('english') ? 1 : 0;
        const wordsData = [];

        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          if (parts.length >= 2) {
            wordsData.push({
              english: parts[0],
              turkish: parts[1],
              difficulty: parseInt(parts[2]) || 1,
              category: parts[3] || 'general'
            });
          }
        }

        const response = await fetch(`${apiUrl}/words/bulk-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ words: wordsData, auto_generate_examples: false })
        });

        if (response.ok) {
          const data = await response.json();
          toast.success(`✅ ${data.count} kelime başarıyla yüklendi!`);
          setCsvFile(null);
          fetchWords();
        } else {
          toast.error('Toplu yükleme başarısız');
        }
      } catch (error) {
        toast.error('CSV işleme hatası: ' + error.message);
      } finally {
        setCsvLoading(false);
      }
    };

    reader.readAsText(csvFile);
  };

  const generateAIExamples = async (word) => {
    setAiLoading(true);
    try {
      const response = await fetch(`${apiUrl}/ai/generate-examples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          word: word.english,
          turkish: word.turkish,
          level: word.category || 'beginner',
          count: 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`✨ ${data.examples.length} örnek cümle oluşturuldu!`);
        // Optionally update the word with new examples
        fetchWords();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Örnek cümle oluşturulamadı');
      }
    } catch (error) {
      toast.error('AI servisi kullanılamıyor: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
    setLoading(false);
  };

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const [achResponse, userAchResponse] = await Promise.all([
        fetch(`${apiUrl}/achievements`),
        fetch(`${apiUrl}/achievements/user`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);
      
      if (achResponse.ok) {
        const achData = await achResponse.json();
        setAchievements(achData);
      }
      
      if (userAchResponse.ok) {
        const userAchData = await userAchResponse.json();
        setUserAchievements(userAchData);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
    setLoading(false);
  };

  const fetchLeague = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/league/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeague(data);
      }
    } catch (error) {
      console.error('Error fetching league:', error);
    }
    setLoading(false);
  };

  const hasAchievement = (achievementId) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  // Filter words based on difficulty and category
  const filteredWords = words.filter(word => {
    const matchesDifficulty = filterDifficulty === 'all' || word.difficulty === parseInt(filterDifficulty);
    const matchesCategory = filterCategory === 'all' || word.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesDifficulty && matchesCategory;
  });

  const dashboardCards = [
    {
      id: 'games',
      icon: '🎮',
      title: 'Oyunlar',
      description: 'Eğlenceli oyunlarla kelime öğren',
      color: '#a855f7',
      onClick: () => setShowGames(true)
    },
    {
      id: 'words',
      icon: '📚',
      title: 'Kelime Yönetimi',
      description: 'Kelime setleri oluştur ve düzenle',
      color: '#10b981',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('words');
      }
    },
    {
      id: 'leaderboard',
      icon: '🏆',
      title: 'Liderlik Tablosu',
      description: 'Sınıf sıralamasını gör',
      color: '#f59e0b',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('leaderboard');
      }
    },
    {
      id: 'achievements',
      icon: '🏅',
      title: 'Başarılar',
      description: 'Rozetlerini ve başarılarını gör',
      color: '#f59e0b',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('achievements');
      }
    },
    {
      id: 'league',
      icon: '🏆',
      title: 'Haftalık Lig',
      description: 'Lig sıralaması ve yarışma',
      color: '#f59e0b',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('league');
      }
    },
    {
      id: 'users',
      icon: '👥',
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcı listesi ve yönetimi',
      color: '#3b82f6',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('users');
      }
    },
    {
      id: 'admin',
      icon: '⚙️',
      title: 'Admin Paneli',
      description: 'Sistem yönetimi',
      color: '#6b7280',
      onClick: () => {
        setShowDashboard(false);
        setActiveTab('users');
      }
    }
  ];

  if (showGames) {
    return <GameSelector apiUrl={apiUrl} token={token} onClose={() => setShowGames(false)} />;
  }

  if (showDashboard) {
    const mainCards = dashboardCards.slice(0, 6);
    const adminCard = dashboardCards[6];
    
    return (
      <div 
        className="admin-dashboard-modern"
        style={{
          background: 'linear-gradient(to bottom right, #ffffff 0%, #eef7ff 100%)',
          minHeight: 'calc(100vh - 80px)',
          padding: 0,
          margin: '-30px -30px 0 -30px',
          width: 'calc(100% + 60px)',
          maxWidth: 'none',
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        <div 
          className="admin-dashboard-container"
          style={{
            maxWidth: '1152px',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: '24px',
            paddingRight: '24px',
            paddingTop: '64px',
            paddingBottom: '64px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="welcome-section-modern"
            style={{
              textAlign: 'center',
              marginBottom: 0
            }}
          >
            <h1 
              className="welcome-title-modern"
              style={{
                fontSize: '2.25rem',
                fontWeight: 700,
                textAlign: 'center',
                color: '#1f2937',
                margin: '0 0 16px 0',
                lineHeight: 1.2
              }}
            >
              Hoş Geldin, admin!
            </h1>
            <p 
              className="welcome-subtitle-modern"
              style={{
                color: '#6b7280',
                textAlign: 'center',
                fontSize: '1.125rem',
                margin: '0 0 56px 0',
                lineHeight: 1.6
              }}
            >
              İngilizce öğrenme yolculuğuna hazır mısın?
            </p>
          </div>
          
          <div 
            className="dashboard-cards-modern"
            style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth >= 1024 ? 'repeat(3, 1fr)' : window.innerWidth >= 640 ? 'repeat(2, 1fr)' : '1fr',
              gap: '32px',
              marginTop: 0,
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {mainCards.map((card) => (
              <div
                key={card.id}
                className="dashboard-card-modern"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Card clicked:', card.id, card.title);
                  if (card.onClick) {
                    card.onClick();
                  } else {
                    console.error('No onClick function for card:', card.id);
                  }
                }}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'center',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div 
                  className="card-icon-modern"
                  style={{
                    fontSize: '3rem',
                    marginBottom: '16px',
                    display: 'block',
                    lineHeight: 1
                  }}
                >
                  {card.icon}
                </div>
                <h3 
                  className="card-title-modern"
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: '0 0 4px 0',
                    lineHeight: 1.4
                  }}
                >
                  {card.title}
                </h3>
                <p 
                  className="card-description-modern"
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
          
          {adminCard && (
            <div 
              className="dashboard-cards-bottom-modern"
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginTop: '32px',
                width: '100%'
              }}
            >
              <div
                className="dashboard-card-modern"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (adminCard.onClick) {
                    adminCard.onClick();
                  }
                }}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '32px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'center',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  maxWidth: '300px',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <div 
                  className="card-icon-modern"
                  style={{
                    fontSize: '3rem',
                    marginBottom: '16px',
                    display: 'block',
                    lineHeight: 1
                  }}
                >
                  {adminCard.icon}
                </div>
                <h3 
                  className="card-title-modern"
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#1f2937',
                    margin: '0 0 4px 0',
                    lineHeight: 1.4
                  }}
                >
                  {adminCard.title}
                </h3>
                <p 
                  className="card-description-modern"
                  style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}
                >
                  {adminCard.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="panel-header">
        
        <button className="back-to-dashboard" onClick={() => setShowDashboard(true)}>
          Ana Menü
        </button>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          👥 Kullanıcılar
        </button>
        <button 
          className={activeTab === 'words' ? 'active' : ''} 
          onClick={() => setActiveTab('words')}
        >
          📚 Kelimeler
        </button>
        <button 
          className={activeTab === 'leaderboard' ? 'active' : ''} 
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Liderlik Tablosu
        </button>
        <button 
          className={activeTab === 'achievements' ? 'active' : ''} 
          onClick={() => setActiveTab('achievements')}
        >
          🏅 Başarılar
        </button>
        <button 
          className={activeTab === 'league' ? 'active' : ''} 
          onClick={() => setActiveTab('league')}
        >
          🏆 Haftalık Lig
        </button>
        <button 
          className={activeTab === 'stats' ? 'active' : ''} 
          onClick={() => setActiveTab('stats')}
        >
          📊 İstatistikler
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h3>Kullanıcı Yönetimi</h3>
            </div>

            <form onSubmit={handleCreateUser} className="create-form">
              <h4>Yeni Kullanıcı Ekle</h4>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Kullanıcı Adı"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                />
                <input
                  type="password"
                  placeholder="Şifre"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="student">Öğrenci</option>
                  <option value="teacher">Öğretmen</option>
                  <option value="admin">Yönetici</option>
                </select>
                <input
                  type="text"
                  placeholder="Sınıf (opsiyonel)"
                  value={newUser.class_name}
                  onChange={(e) => setNewUser({...newUser, class_name: e.target.value})}
                />
                <button type="submit">Ekle</button>
              </div>
            </form>

            <div className="data-table">
              {loading ? (
                <p>Yükleniyor...</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Kullanıcı Adı</th>
                      <th>Rol</th>
                      <th>Sınıf</th>
                      <th>Puan</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.role}</td>
                        <td>{u.class_name || '-'}</td>
                        <td>{u.points || 0}</td>
                        <td>
                          {u.username !== 'admin' && (
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="delete-btn"
                            >
                              Sil
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'words' && (
          <div className="words-section">
            <div className="section-header">
              <h3>Kelime Yönetimi</h3>
            </div>

            <form onSubmit={handleCreateWord} className="word-add-form">
              <div className="word-input-row">
                <div className="word-input-group">
                  <label>İngilizce Kelime</label>
                  <input
                    type="text"
                    placeholder="Örn: apple"
                    value={newWord.english}
                    onChange={(e) => setNewWord({...newWord, english: e.target.value})}
                    required
                  />
                </div>
                <div className="word-input-group">
                  <label>Türkçe Anlamı</label>
                  <input
                    type="text"
                    placeholder="Örn: elma"
                    value={newWord.turkish}
                    onChange={(e) => setNewWord({...newWord, turkish: e.target.value})}
                    required
                  />
                </div>
                <button type="submit" className="word-add-button">Ekle +</button>
              </div>
            </form>

            {/* Filter Section */}
            <div className="filter-section">
              <h4>Filtrele</h4>
              <div className="filter-row">
                <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)}>
                  <option value="all">Tüm Seviyeler</option>
                  <option value="1">Seviye 1</option>
                  <option value="2">Seviye 2</option>
                  <option value="3">Seviye 3</option>
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">Tüm Kategoriler</option>
                  <option value="general">Genel</option>
                  <option value="technology">Teknoloji</option>
                  <option value="education">Eğitim</option>
                  <option value="business">İş</option>
                  <option value="daily">Günlük Yaşam</option>
                </select>
                <span className="filter-count">{filteredWords.length} kelime</span>
              </div>
            </div>

            {/* CSV Upload Form */}
            <form onSubmit={handleCsvUpload} className="csv-upload-form">
              <h4>📥 Toplu Kelime Yükle</h4>
              <p className="csv-info">
                CSV formatında kelime listesi yükleyin (English, Turkish, Difficulty, Category)
              </p>
              <div className="form-row">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                />
                <button type="submit" disabled={csvLoading}>
                  {csvLoading ? 'Yükleniyor...' : '📤 Yükle'}
                </button>
              </div>
            </form>

            {/* Words Table */}
            {loading ? (
              <p>Yükleniyor...</p>
            ) : filteredWords.length === 0 ? (
              <div className="empty-state">
                <p>Henüz kelime eklenmemiş.</p>
              </div>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>İngilizce</th>
                      <th>Türkçe</th>
                      <th>Seviye</th>
                      <th>Kategori</th>
                      <th>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWords.map((word) => (
                      <tr key={word.id}>
                        <td>{word.english}</td>
                        <td>{word.turkish}</td>
                        <td>
                          <span className={`difficulty-badge difficulty-${word.difficulty}`}>
                            Seviye {word.difficulty}
                          </span>
                        </td>
                        <td>{word.category}</td>
                        <td>
                          <button 
                            onClick={() => handleDeleteWord(word.id)}
                            className="delete-btn"
                          >
                            Sil
                          </button>
                          <button 
                            onClick={() => generateAIExamples(word)}
                            disabled={aiLoading}
                            className="ai-btn"
                          >
                            ✨ AI Örnekler
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <h3>İstatistikler</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Toplam Kullanıcı</h4>
                <p className="stat-number">{users.length}</p>
              </div>
              <div className="stat-card">
                <h4>Toplam Kelime</h4>
                <p className="stat-number">{words.length}</p>
              </div>
              <div className="stat-card">
                <h4>Toplam Öğrenci</h4>
                <p className="stat-number">{users.filter(u => u.role === 'student').length}</p>
              </div>
              <div className="stat-card">
                <h4>Toplam Öğretmen</h4>
                <p className="stat-number">{users.filter(u => u.role === 'teacher').length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-section">
            <div className="section-header">
              <h3>🏆 Liderlik Tablosu</h3>
            </div>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Sıra</th>
                      <th>Kullanıcı Adı</th>
                      <th>Puan</th>
                      <th>Kelime</th>
                      <th>Oyun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td>{entry.username}</td>
                        <td>⭐ {entry.points || 0}</td>
                        <td>📚 {entry.words_learned || 0}</td>
                        <td>🎮 {entry.games_played || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-section">
            <div className="section-header">
              <h3>🏅 Başarılar ve Rozetler</h3>
            </div>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : (
              <div className="achievements-grid">
                {achievements.map((ach) => (
                  <div key={ach.id} className={`achievement-card ${hasAchievement(ach.id) ? 'earned' : ''}`}>
                    <div className="achievement-icon">{ach.icon || '🏅'}</div>
                    <h4>{ach.name}</h4>
                    <p>{ach.description}</p>
                    <div className="achievement-points">⭐ {ach.points} puan</div>
                    {hasAchievement(ach.id) && (
                      <div className="achievement-badge">✓ Kazanıldı</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'league' && (
          <div className="league-section">
            <div className="section-header">
              <h3>🏆 Haftalık Lig</h3>
            </div>
            {loading ? (
              <p>Yükleniyor...</p>
            ) : league ? (
              <div className="league-info">
                <div className="league-stats">
                  <div className="stat-card">
                    <h4>Toplam Katılımcı</h4>
                    <p className="stat-number">{league.total_participants || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Senin Sıran</h4>
                    <p className="stat-number">{league.your_rank || '-'}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Toplam Puan</h4>
                    <p className="stat-number">⭐ {league.your_points || 0}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p>Henüz lig başlamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;

