import React, { useState, useEffect } from 'react';
import './StudentPanel.css';
import GameSelector from './games/GameSelector';

function StudentPanel({ user, token, apiUrl }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showGames, setShowGames] = useState(false);
  const [words, setWords] = useState([]);
  const [scores, setScores] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'words') {
      fetchWords();
    } else if (activeTab === 'games') {
      fetchScores();
    } else if (activeTab === 'achievements') {
      fetchAchievements();
    } else if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    } else if (activeTab === 'league') {
      fetchLeague();
    }
  }, [activeTab]);

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

  const fetchScores = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/games/scores`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setScores(data);
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
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

  if (showGames) {
    return <GameSelector apiUrl={apiUrl} token={token} onClose={() => setShowGames(false)} />;
  }

  return (
    <div className="student-panel">
      <div className="welcome-banner">
        <h2>Hoş geldin, {user.username}! 👋</h2>
        <div className="user-stats">
          <div className="stat-item">
            <span className="stat-icon">⭐</span>
            <div>
              <div className="stat-value">{user.points || 0}</div>
              <div className="stat-label">Puan</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📚</span>
            <div>
              <div className="stat-value">{user.words_learned || 0}</div>
              <div className="stat-label">Kelime</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🎮</span>
            <div>
              <div className="stat-value">{user.games_played || 0}</div>
              <div className="stat-label">Oyun</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          🏠 Ana Sayfa
        </button>
        <button 
          className={activeTab === 'words' ? 'active' : ''} 
          onClick={() => setActiveTab('words')}
        >
          📚 Kelimeler
        </button>
        <button 
          className={activeTab === 'games' ? 'active' : ''} 
          onClick={() => setActiveTab('games')}
        >
          🎮 Oyunlarım
        </button>
        <button 
          className={activeTab === 'achievements' ? 'active' : ''} 
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Başarılar
        </button>
        <button 
          className={activeTab === 'leaderboard' ? 'active' : ''} 
          onClick={() => setActiveTab('leaderboard')}
        >
          🏅 Liderlik Tablosu
        </button>
        <button 
          className={activeTab === 'league' ? 'active' : ''} 
          onClick={() => setActiveTab('league')}
        >
          🏆 Haftalık Lig
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-section">
            <h3>Bugün Ne Öğrenmek İstersin?</h3>
            <div className="quick-actions">
              <div className="action-card" onClick={() => setActiveTab('words')}>
                <div className="action-icon">📚</div>
                <h4>Kelime Çalış</h4>
                <p>Yeni kelimeler öğren</p>
              </div>
              <div className="action-card" onClick={() => setShowGames(true)}>
                <div className="action-icon">🎮</div>
                <h4>Oyun Oyna</h4>
                <p>Eğlenerek öğren</p>
              </div>
              <div className="action-card" onClick={() => setActiveTab('leaderboard')}>
                <div className="action-icon">🏅</div>
                <h4>Sıralamayı Gör</h4>
                <p>Diğer öğrencilerle yarış</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'words' && (
          <div className="words-section">
            <h3>Kelime Listesi ({words.length} kelime)</h3>
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : (
              <div className="words-grid">
                {words.map((word) => (
                  <div key={word.id} className="word-card">
                    <div className="word-front">
                      <div className="word-english">{word.english}</div>
                      <div className="word-turkish">{word.turkish}</div>
                    </div>
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

        {activeTab === 'games' && (
          <div className="games-section">
            <h3>Oyun Geçmişim</h3>
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : scores.length === 0 ? (
              <p>Henüz oyun oynamadınız.</p>
            ) : (
              <div className="scores-list">
                {scores.map((score, index) => (
                  <div key={index} className="score-card">
                    <div className="score-header">
                      <h4>{score.game_type}</h4>
                      <span className="score-points">{score.score} puan</span>
                    </div>
                    <div className="score-details">
                      <span>✅ {score.correct_answers} doğru</span>
                      <span>❌ {score.wrong_answers} yanlış</span>
                      <span className="score-date">
                        {new Date(score.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="achievements-section">
            <h3>Başarılar</h3>
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : (
              <div className="achievements-grid">
                {achievements.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className={`achievement-card ${hasAchievement(achievement.id) ? 'earned' : 'locked'}`}
                  >
                    <div className="achievement-icon">{achievement.icon}</div>
                    <h4>{achievement.name}</h4>
                    <p>{achievement.description}</p>
                    <span className={`rarity ${achievement.rarity}`}>
                      {achievement.rarity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="leaderboard-section">
            <h3>Liderlik Tablosu 🏆</h3>
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map((player, index) => (
                  <div 
                    key={index} 
                    className={`leaderboard-item ${player.username === user.username ? 'current-user' : ''}`}
                  >
                    <div className="rank">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </div>
                    <div className="player-info">
                      <div className="player-name">{player.username}</div>
                      <div className="player-stats">
                        {player.words_learned || 0} kelime
                      </div>
                    </div>
                    <div className="player-points">{player.points || 0} puan</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'league' && (
          <div className="league-section">
            <h3>🏆 Haftalık Lig</h3>
            {loading ? (
              <div className="loading">Yükleniyor...</div>
            ) : league ? (
              <div>
                <div className="league-info">
                  <p>Hafta {league.week_number} - {league.year}</p>
                  <p className="league-dates">
                    {new Date(league.start_date).toLocaleDateString('tr-TR')} - {new Date(league.end_date).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div className="league-standings">
                  {league.standings && league.standings.length > 0 ? (
                    league.standings.map((player, index) => (
                      <div 
                        key={player.user_id} 
                        className={`league-item ${player.username === user.username ? 'current-user' : ''}`}
                      >
                        <div className="league-rank">
                          {index === 0 && <span className="medal gold">🥇</span>}
                          {index === 1 && <span className="medal silver">🥈</span>}
                          {index === 2 && <span className="medal bronze">🥉</span>}
                          {index > 2 && <span className="rank-number">#{index + 1}</span>}
                        </div>
                        <div className="league-player-info">
                          <div className="league-player-name">{player.username}</div>
                          {player.username === user.username && (
                            <span className="you-badge">Sen</span>
                          )}
                        </div>
                        <div className="league-points">{player.points} puan</div>
                      </div>
                    ))
                  ) : (
                    <p>Henüz sıralama yok.</p>
                  )}
                </div>
              </div>
            ) : (
              <p>Lig bilgisi yüklenemedi.</p>
            )}
          </div>
        )}
      </div>

      {showGames && (
        <div className="game-modal-overlay" onClick={() => setShowGames(false)}>
          <div className="game-modal-content" onClick={(e) => e.stopPropagation()}>
            <GameSelector 
              apiUrl={apiUrl} 
              token={token} 
              onClose={() => {
                setShowGames(false);
                // Refresh user stats after game
                fetchScores();
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentPanel;

