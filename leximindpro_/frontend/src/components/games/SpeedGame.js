import React, { useState, useEffect } from 'react';
import './GameStyles.css';

function SpeedGame({ words, onComplete, apiUrl, token, onClose }) {
  const [gameWords, setGameWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Select 20 random words
    const selected = [...words].sort(() => Math.random() - 0.5).slice(0, 20);
    setGameWords(selected);
  }, [words]);

  useEffect(() => {
    if (gameWords.length > 0 && currentIndex < gameWords.length) {
      generateOptions();
    }
  }, [currentIndex, gameWords]);

  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      finishGame();
    }
  }, [timeLeft, gameOver]);

  const generateOptions = () => {
    const currentWord = gameWords[currentIndex];
    const correctAnswer = currentWord.turkish;
    
    // Get 3 random wrong answers
    const wrongOptions = gameWords
      .filter(w => w.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.turkish);
    
    const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setFeedback(null);
  };

  const handleAnswer = (answer) => {
    const currentWord = gameWords[currentIndex];
    const isCorrect = answer === currentWord.turkish;

    if (isCorrect) {
      setScore(score + 10);
      setCorrectAnswers(correctAnswers + 1);
      setFeedback('correct');
    } else {
      setWrongAnswers(wrongAnswers + 1);
      setFeedback('wrong');
    }

    setTimeout(() => {
      if (currentIndex + 1 < gameWords.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishGame();
      }
    }, 500);
  };

  const finishGame = async () => {
    setGameOver(true);
    const finalScore = score;
    try {
      await fetch(`${apiUrl}/games/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_type: 'speed',
          score: finalScore,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers
        })
      });
      onComplete(finalScore, correctAnswers, wrongAnswers);
    } catch (error) {
      console.error('Error saving score:', error);
      onComplete(finalScore, correctAnswers, wrongAnswers);
    }
  };

  if (gameWords.length === 0) {
    return <div className="loading">Oyun hazırlanıyor...</div>;
  }

  if (gameOver) {
    return (
      <div className="game-over">
        <h2>Oyun Bitti!</h2>
        <div className="final-stats">
          <div className="stat">Puan: {score}</div>
          <div className="stat">Doğru: {correctAnswers}</div>
          <div className="stat">Yanlış: {wrongAnswers}</div>
        </div>
      </div>
    );
  }

  const currentWord = gameWords[currentIndex];

  return (
    <div className="game-container speed-game">
      <div className="game-header">
        <div className="game-header-left">
          <button className="back-button" onClick={onClose}>
            ← Geri
          </button>
          <h2>⚡ Hız Yarışması</h2>
        </div>
        <div className="game-progress">
          <span className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}>
            ⏱️ {timeLeft}s
          </span>
          <span>Soru: {currentIndex + 1} / {gameWords.length}</span>
          <span>Puan: {score}</span>
        </div>
      </div>

      <div className="game-content">
        <div className={`question-card ${feedback || ''}`}>
          <h3 className="question-word">{currentWord.english}</h3>
          <p className="question-text">Bu kelimenin Türkçe karşılığı nedir?</p>
        </div>

        <div className="options-grid">
          {options.map((option, idx) => (
            <button
              key={idx}
              className="option-button"
              onClick={() => handleAnswer(option)}
              disabled={feedback !== null}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="game-stats">
        <div className="stat-box correct">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{correctAnswers}</span>
        </div>
        <div className="stat-box wrong">
          <span className="stat-icon">❌</span>
          <span className="stat-value">{wrongAnswers}</span>
        </div>
      </div>
    </div>
  );
}

export default SpeedGame;

