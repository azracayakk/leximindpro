import React, { useState, useEffect } from 'react';
import './GameStyles.css';
import FlashcardGame from './FlashcardGame';
import MatchingGame from './MatchingGame';
import SpeedGame from './SpeedGame';
import SentenceGame from './SentenceGame';
import StoryMode from './StoryMode';

const getPerformanceFeedback = (score, correct, wrong) => {
  const totalAttempts = correct + wrong;
  const accuracy = totalAttempts > 0 ? correct / totalAttempts : 1;
  const accuracyPercent = Math.round(accuracy * 100);

  if (totalAttempts === 0) {
    return {
      totalAttempts,
      accuracy,
      accuracyPercent: 100,
      type: 'celebration',
      icon: '🎉',
      title: 'Harika Başlangıç!',
      message: 'İlk turun hazır. Yeni bir oyuna geçerek öğrenmeye devam edebilirsin.',
      suggestions: [
        'Farklı bir oyun modu seçerek kelime dağarcığını genişlet.',
        'Öğrendiğin yeni kelimeleri not al ve gün içinde kullan.',
        'Kısa bir quiz çözerek kelimeleri pekiştir.'
      ]
    };
  }

  if (accuracy >= 0.85) {
    return {
      totalAttempts,
      accuracy,
      accuracyPercent,
      type: 'celebration',
      icon: '🎉',
      title: 'Harika İş!',
      message: `Tebrikler! Doğruluk oranı %${accuracyPercent}. Yeni bir oyuna hazırsın.`,
      suggestions: [
        'Yeni bir oyun modunu dene ve puanını daha da yükselt.',
        'Kelime listesinde ileri seviye kelimelere göz at.',
        'Başarını öğretmeninle paylaş ya da liderlik tablosunu kontrol et.'
      ]
    };
  }

  if (accuracy >= 0.6) {
    return {
      totalAttempts,
      accuracy,
      accuracyPercent,
      type: 'encouraging',
      icon: '💪',
      title: 'Güzel Gidiyorsun!',
      message: `Doğruluk oranı %${accuracyPercent}. Ufak tekrarlarla becerilerini güçlendirebilirsin.`,
      suggestions: [
        'Az yanıldığın kelimeleri favorilere ekleyip yeniden gözden geçir.',
        'Aynı oyunu bir tur daha oyna ve doğruluk oranını artır.',
        'Haftalık quizde kısa bir test çözerek bilgini tazele.'
      ]
    };
  }

  return {
    totalAttempts,
    accuracy,
    accuracyPercent,
    type: 'improve',
    icon: '🧠',
    title: 'Tekrar Zamanı!',
    message: `Bu oyunda doğruluk %${accuracyPercent}. Zorlandığın kelimeleri tekrar çalış, bir sonraki turda farkı göreceksin.`,
    suggestions: [
      'Kelime listesinde yanlış yaptığın kelimeleri tekrar çalış.',
      'Tekrar oyna butonuyla aynı oyunu dene ve doğru cevaplara odaklan.',
      'Kişisel öğrenme planındaki önerilen kelimelere göz at.'
    ]
  };
};

function GameSelector({ apiUrl, token, onClose, onNavigate = () => {} }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameResult, setGameResult] = useState(null);

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

  useEffect(() => {
    fetchWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showResult = (score = 0, correct = 0, wrong = 0) => {
    const performance = getPerformanceFeedback(score, correct, wrong);
    setGameResult({
      score,
      correct,
      wrong,
      ...performance
    });
  };

  const handleGameComplete = (score, correct, wrong) => {
    setSelectedGame(null);
    showResult(score, correct, wrong);
  };

  const handleGameExit = (score = 0, correct = 0, wrong = 0) => {
    setSelectedGame(null);
    showResult(score, correct, wrong);
  };

  const handlePlayAgain = () => {
    setGameResult(null);
    setSelectedGame(null);
  };

  const handleExit = () => {
    onClose();
  };

  const handleNavigate = (targetTab) => {
    onNavigate(targetTab);
    onClose();
  };

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (gameResult) {
    return (
      <div className="game-result-container">
        <div className="game-result">
          <div className="result-feedback">
            <h2 className={`result-title ${gameResult.type}`}>
              {gameResult.icon} {gameResult.title}
            </h2>
            <p className="result-message">{gameResult.message}</p>
          </div>
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
            <div className="result-stat">
              <span className="result-label">Doğruluk</span>
              <span className="result-value accuracy">{gameResult.accuracyPercent}%</span>
            </div>
          </div>
          <div className="result-suggestions">
            <h3>Bir Sonraki Adım</h3>
            <ul>
              {gameResult.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
          <div className="result-quick-links">
            <button
              className="btn-ghost"
              onClick={() => handleNavigate('words')}
            >
              📚 Kelime Listesine Git
            </button>
            <button
              className="btn-ghost"
              onClick={() => handleNavigate('weeklyQuiz')}
            >
              📝 Haftalık Quiz Çöz
            </button>
            <button
              className="btn-ghost"
              onClick={() => handleNavigate('leaderboard')}
            >
              🏅 Liderlik Tablosunu Gör
            </button>
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
        onClose={handleGameExit}
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

