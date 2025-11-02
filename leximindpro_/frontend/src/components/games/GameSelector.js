import React, { useState, useEffect } from 'react';
import './GameStyles.css';
import FlashcardGame from './FlashcardGame';
import MatchingGame from './MatchingGame';
import SpeedGame from './SpeedGame';
import SentenceGame from './SentenceGame';
import StoryMode from './StoryMode';

function GameSelector({ apiUrl, token, onClose }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      const response = await fetch(`${apiUrl}/words`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWords(data);
      }
    } catch (error) {
      console.error('Error fetching words:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameComplete = (score, correct, wrong) => {
    setGameResult({ score, correct, wrong });
  };

  const handlePlayAgain = () => {
    setGameResult(null);
    setSelectedGame(null);
  };

  const handleExit = () => {
    onClose();
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (gameResult) {
    return (
      <div className="game-result-container">
        <div className="game-result">
          <h2>🎉 Tebrikler!</h2>
          <div className="result-stats">
            <div className="result-stat">
              <span className="result-label">Toplam Puan</span>
              <span className="result-value">{gameResult.score}</span>
            </div>
            <div className="result-stat">
              <span className="result-label">Doğru Cevap</span>
              <span className="result-value correct">✅ {gameResult.correct}</span>
            </div>
            <div className="result-stat">
              <span className="result-label">Yanlış Cevap</span>
              <span className="result-value wrong">❌ {gameResult.wrong}</span>
            </div>
          </div>
          <div className="result-actions">
            <button className="btn-secondary" onClick={handlePlayAgain}>
              🎮 Başka Oyun Oyna
            </button>
            <button className="btn-primary" onClick={handleExit}>
              ✓ Bitir
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedGame) {
    const gameComponents = {
      flashcard: FlashcardGame,
      matching: MatchingGame,
      speed: SpeedGame,
      sentence: SentenceGame,
      story: StoryMode
    };

    const GameComponent = gameComponents[selectedGame];

    return (
      <GameComponent
        words={words}
        apiUrl={apiUrl}
        token={token}
        onComplete={handleGameComplete}
        onClose={() => setSelectedGame(null)}
      />
    );
  }

  const games = [
    {
      id: 'flashcard',
      name: 'Kart Oyunu',
      icon: '🃏',
      description: 'Kartları çevir ve kelimeleri öğren',
      difficulty: 'Kolay',
      color: '#a855f7'
    },
    {
      id: 'matching',
      name: 'Eşleştirme',
      icon: '🧩',
      description: 'Kelimeleri anlamlarıyla eşleştir',
      difficulty: 'Orta',
      color: '#10b981'
    },
    {
      id: 'speed',
      name: 'Hız Yarışması',
      icon: '⚡',
      description: 'Zamana karşı kelime yarışı',
      difficulty: 'Zor',
      color: '#f59e0b'
    },
    {
      id: 'sentence',
      name: 'Cümle Tamamlama',
      icon: '📝',
      description: 'Boş yerleri doğru kelimelerle doldur',
      difficulty: 'Orta',
      color: '#3b82f6'
    },
    {
      id: 'story',
      name: 'Hikaye Modu',
      icon: '📚',
      description: 'AI ile oluşturulan hikayelerle öğren',
      difficulty: 'Özel',
      color: '#14b8a6'
    }
  ];

  return (
    <div className="game-selector">
      <div className="selector-header">
        <div className="selector-header-left">
          <h2>🎮 Oyunlar</h2>
          <p className="selector-subtitle">Eğlenceli oyunlarla İngilizce öğren</p>
        </div>
        <button className="btn-main-menu" onClick={handleExit}>Ana Menü</button>
      </div>

      <div className="games-grid">
        {games.map((game) => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => setSelectedGame(game.id)}
            style={{ borderColor: game.color }}
          >
            <div className="game-icon" style={{ color: game.color }}>
              {game.icon}
            </div>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
            <span className="game-difficulty" style={{ background: game.color }}>
              {game.difficulty}
            </span>
          </div>
        ))}
      </div>

      {words.length === 0 && (
        <div className="no-words-warning">
          ⚠️ Henüz kelime eklenmemiş. Oyun oynamak için kelimeler gereklidir.
        </div>
      )}
    </div>
  );
}

export default GameSelector;

