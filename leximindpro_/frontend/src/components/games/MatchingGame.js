import React, { useState, useEffect } from 'react';
import './GameStyles.css';

function MatchingGame({ words, onComplete, apiUrl, token, onClose }) {
  const [gameWords, setGameWords] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    // Select 6 random words
    const selected = [...words].sort(() => Math.random() - 0.5).slice(0, 6);
    setGameWords(selected);
    
    // Create card pairs
    const englishCards = selected.map((word, idx) => ({
      id: `en-${idx}`,
      text: word.english,
      type: 'english',
      wordId: word.id,
      matched: false
    }));
    
    const turkishCards = selected.map((word, idx) => ({
      id: `tr-${idx}`,
      text: word.turkish,
      type: 'turkish',
      wordId: word.id,
      matched: false
    }));
    
    const allCards = [...englishCards, ...turkishCards].sort(() => Math.random() - 0.5);
    setCards(allCards);
  }, [words]);

  const handleCardClick = (card) => {
    if (selectedCards.length === 2 || card.matched || selectedCards.includes(card.id)) {
      return;
    }

    const newSelected = [...selectedCards, card.id];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves(moves + 1);
      checkMatch(newSelected);
    }
  };

  const checkMatch = (selected) => {
    const [first, second] = selected;
    const firstCard = cards.find(c => c.id === first);
    const secondCard = cards.find(c => c.id === second);

    if (firstCard.wordId === secondCard.wordId && firstCard.type !== secondCard.type) {
      // Match found!
      setMatchedPairs([...matchedPairs, firstCard.wordId]);
      setScore(score + 20);
      
      const updatedCards = cards.map(card => 
        card.wordId === firstCard.wordId ? { ...card, matched: true } : card
      );
      setCards(updatedCards);

      // Check if game is complete
      if (matchedPairs.length + 1 === gameWords.length) {
        setTimeout(() => finishGame(score + 20, gameWords.length), 500);
      }
    }

    setTimeout(() => setSelectedCards([]), 1000);
  };

  const finishGame = async (finalScore, correct) => {
    try {
      await fetch(`${apiUrl}/games/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          game_type: 'matching',
          score: finalScore,
          correct_answers: correct,
          wrong_answers: moves - correct
        })
      });
      onComplete(finalScore, correct, moves - correct);
    } catch (error) {
      console.error('Error saving score:', error);
      onComplete(finalScore, correct, moves - correct);
    }
  };

  if (cards.length === 0) {
    return <div className="loading">Oyun hazırlanıyor...</div>;
  }

  return (
    <div className="game-container matching-game">
      <div className="game-header">
        <div className="game-header-left">
          <button className="back-button" onClick={onClose}>
            ← Geri
          </button>
          <h2>🎯 Eşleştirme Oyunu</h2>
        </div>
        <div className="game-progress">
          <span>Hamle: {moves}</span>
          <span>Eşleşen: {matchedPairs.length} / {gameWords.length}</span>
          <span>Puan: {score}</span>
        </div>
      </div>

      <div className="game-content">
        <div className="matching-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`matching-card ${card.matched ? 'matched' : ''} ${
                selectedCards.includes(card.id) ? 'selected' : ''
              } ${card.type}`}
              onClick={() => handleCardClick(card)}
            >
              <div className="card-content">
                {card.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-instructions">
        <p>İngilizce kelimeleri Türkçe karşılıklarıyla eşleştir!</p>
      </div>
    </div>
  );
}

export default MatchingGame;

