import React, { useState, useEffect } from 'react';
import './GameStyles.css';

function SentenceGame({ words, onComplete, apiUrl, token, onClose }) {
  const [gameWords, setGameWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  useEffect(() => {
    // Select words that have example sentences
    const wordsWithSentences = words.filter(w => w.example_sentences && w.example_sentences.length > 0);
    const selected = wordsWithSentences.sort(() => Math.random() - 0.5).slice(0, 10);
    
    if (selected.length === 0) {
      // If no words with sentences, use random words
      setGameWords([...words].sort(() => Math.random() - 0.5).slice(0, 10));
    } else {
      setGameWords(selected);
    }
  }, [words]);

  useEffect(() => {
    if (gameWords.length > 0 && currentIndex < gameWords.length) {
      generateOptions();
    }
  }, [currentIndex, gameWords]);

  const generateOptions = () => {
    const currentWord = gameWords[currentIndex];
    const correctAnswer = currentWord.english;
    
    // Get 3 random wrong answers
    const wrongOptions = gameWords
      .filter(w => w.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.english);
    
    const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setFeedback(null);
    setSelectedAnswer(null);
  };

  const getSentence = (word) => {
    if (word.example_sentences && word.example_sentences.length > 0) {
      const example = word.example_sentences[0];
      // Replace only complete words (not parts of other words)
      // Using word boundaries to match exact word
      const escapedWord = word.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return example.sentence.replace(new RegExp(`\\b${escapedWord}\\b`, 'gi'), '___');
    }
    // Create a simple sentence if no example exists
    return `I like ___ very much.`;
  };

  const handleAnswer = (answer) => {
    const currentWord = gameWords[currentIndex];
    const isCorrect = answer === currentWord.english;
    
    setSelectedAnswer(answer);
    setFeedback(isCorrect ? 'correct' : 'wrong');

    // Calculate new values
    const newScore = isCorrect ? score + 15 : score;
    const newCorrectAnswers = isCorrect ? correctAnswers + 1 : correctAnswers;
    const newWrongAnswers = isCorrect ? wrongAnswers : wrongAnswers + 1;

    // Update state
    if (isCorrect) {
      setScore(newScore);
      setCorrectAnswers(newCorrectAnswers);
    } else {
      setWrongAnswers(newWrongAnswers);
    }

    setTimeout(() => {
      if (currentIndex + 1 < gameWords.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishGame(newScore, newCorrectAnswers, newWrongAnswers);
      }
    }, 1500);
  };

  const finishGame = async (finalScore, finalCorrect, finalWrong) => {
    try {
      await fetch(`${apiUrl}/games/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_type: 'sentence',
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

  if (gameWords.length === 0) {
    return <div className="loading">Oyun hazırlanıyor...</div>;
  }

  const currentWord = gameWords[currentIndex];
  const sentence = getSentence(currentWord);

  return (
    <div className="game-container sentence-game">
      <div className="game-header">
        <div className="game-header-left">
          <button className="back-button" onClick={onClose}>
            ← Geri
          </button>
          <h2>📝 Cümle Tamamlama</h2>
        </div>
        <div className="game-progress">
          <span>Soru: {currentIndex + 1} / {gameWords.length}</span>
          <span>Puan: {score}</span>
        </div>
      </div>

      <div className="game-content">
        <div className={`sentence-card ${feedback || ''}`}>
          <p className="sentence-instruction">Boşluğu doldurun:</p>
          <h3 className="sentence-text">{sentence}</h3>
          {currentWord.example_sentences && currentWord.example_sentences.length > 0 && (
            <p className="sentence-translation">{currentWord.example_sentences[0].turkish}</p>
          )}
        </div>

        <div className="options-grid">
          {options.map((option, idx) => (
            <button
              key={idx}
              className={`option-button ${
                selectedAnswer === option
                  ? feedback === 'correct' && option === currentWord.english
                    ? 'correct-answer'
                    : feedback === 'wrong' && option === selectedAnswer
                    ? 'wrong-answer'
                    : ''
                  : ''
              }`}
              onClick={() => handleAnswer(option)}
              disabled={feedback !== null}
            >
              {option}
            </button>
          ))}
        </div>

        {feedback === 'wrong' && (
          <div className="correct-answer-display">
            Doğru cevap: <strong>{currentWord.english}</strong>
          </div>
        )}
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

export default SentenceGame;

