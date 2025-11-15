import React, { useState, useEffect } from 'react';
import './GameStyles.css';

function FlashcardGame({ words, onComplete, apiUrl, token, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [gameWords, setGameWords] = useState([]);

  useEffect(() => {
    // Shuffle and select 10 random words
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
    setGameWords(shuffled);
  }, [words]);

  if (gameWords.length === 0) {
    return <div className="loading">Kelimeler yükleniyor...</div>;
  }

  const currentWord = gameWords[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnow = () => {
    const updatedScore = score + 10;
    const updatedCorrect = correctAnswers + 1;

    setScore(updatedScore);
    setCorrectAnswers(updatedCorrect);
    nextCard(updatedScore, updatedCorrect, wrongAnswers);
  };

  const handleDontKnow = () => {
    const updatedWrong = wrongAnswers + 1;
    setWrongAnswers(updatedWrong);
    nextCard(score, correctAnswers, updatedWrong);
  };

  const nextCard = (updatedScore = score, updatedCorrect = correctAnswers, updatedWrong = wrongAnswers) => {
    setIsFlipped(false);
    if (currentIndex + 1 < gameWords.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishGame(updatedScore, updatedCorrect, updatedWrong);
    }
  };

  const finishGame = async (finalScore = score, finalCorrect = correctAnswers, finalWrong = wrongAnswers) => {
    try {
      await fetch(`${apiUrl}/games/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_type: 'flashcard',
          score: finalScore,
          correct_answers: finalCorrect,
          wrong_answers: finalWrong
        })
      });
      onComplete(finalScore, finalCorrect, finalWrong);
    } catch (error) {
      console.error('Error saving score:', error);
      onComplete(finalScore, finalCorrect, finalWrong);
    }
  };

  const handleExit = () => {
    onClose(score, correctAnswers, wrongAnswers);
  };

  return (
    <div className="game-container flashcard-game">
      <div className="game-header">
        <div className="game-header-left">
          <button className="back-button" onClick={handleExit}>
            ← Geri
          </button>
          <h2>🎴 Kart Oyunu</h2>
        </div>
        <div className="game-progress">
          <span>Kart: {currentIndex + 1} / {gameWords.length}</span>
          <span>Puan: {score}</span>
        </div>
      </div>

      <div className="game-content">
        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
          <div className="flashcard-inner">
            <div className="flashcard-front">
              <h3>{currentWord.english}</h3>
              <p className="hint">Kartı çevirmek için tıkla</p>
            </div>
            <div className="flashcard-back">
              <h3>{currentWord.turkish}</h3>
              <p className="word-category">{currentWord.category}</p>
            </div>
          </div>
        </div>

        {isFlipped && (
          <div className="flashcard-actions">
            <button className="btn-wrong" onClick={handleDontKnow}>
              ❌ Bilmiyordum
            </button>
            <button className="btn-correct" onClick={handleKnow}>
              ✅ Biliyordum
            </button>
          </div>
        )}
      </div>

      <div className="game-stats">
        <div className="stat-box correct">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{correctAnswers}</span>
          <span className="stat-label">Doğru</span>
        </div>
        <div className="stat-box wrong">
          <span className="stat-icon">❌</span>
          <span className="stat-value">{wrongAnswers}</span>
          <span className="stat-label">Yanlış</span>
        </div>
      </div>
    </div>
  );
}

export default FlashcardGame;

