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
  const [weeklyQuiz, setWeeklyQuiz] = useState(null);
  const [quizStatus, setQuizStatus] = useState({ completed: false, result: null });
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [activeWordQuiz, setActiveWordQuiz] = useState(null);
  const [wordQuizFeedback, setWordQuizFeedback] = useState(null);

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
    } else if (activeTab === 'weeklyQuiz') {
      fetchWeeklyQuiz();
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

  const fetchWeeklyQuiz = async () => {
    setQuizLoading(true);
    setQuizError(null);
    try {
      const response = await fetch(`${apiUrl}/quizzes/weekly`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWeeklyQuiz(data.quiz || null);
        setQuizStatus({ completed: data.completed, result: data.result });
        if (data.result && data.result.answers) {
          const answerMap = {};
          data.result.answers.forEach((answer) => {
            answerMap[answer.question_id] = answer.selected_option;
          });
          setSelectedAnswers(answerMap);
        } else {
          setSelectedAnswers({});
        }
      } else {
        setQuizError('Quiz bilgisi alınamadı.');
      }
    } catch (error) {
      console.error('Error fetching weekly quiz:', error);
      setQuizError('Quiz bilgisi alınırken bir hata oluştu.');
    }
    setQuizLoading(false);
  };

  const handleAnswerChange = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitWeeklyQuiz = async (event) => {
    event.preventDefault();
    if (!weeklyQuiz || !weeklyQuiz.questions) {
      return;
    }

    const unanswered = weeklyQuiz.questions.filter(
      (question) => selectedAnswers[question.id] === undefined
    );

    if (unanswered.length > 0) {
      setQuizError('Lütfen tüm soruları yanıtlayın.');
      return;
    }

    setQuizSubmitting(true);
    setQuizError(null);

    try {
      const response = await fetch(`${apiUrl}/quizzes/weekly/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          quiz_id: weeklyQuiz.id,
          answers: weeklyQuiz.questions.map((question) => ({
            question_id: question.id,
            selected_option: selectedAnswers[question.id]
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setQuizStatus({ completed: true, result: data.result });
        setWeeklyQuiz(data.quiz || weeklyQuiz);
        if (data.result && data.result.answers) {
          const answerMap = {};
          data.result.answers.forEach((answer) => {
            answerMap[answer.question_id] = answer.selected_option;
          });
          setSelectedAnswers(answerMap);
        }
      } else {
        const errorData = await response.json();
        setQuizError(errorData.detail || 'Quiz gönderilirken hata oluştu.');
      }
    } catch (error) {
      console.error('Error submitting weekly quiz:', error);
      setQuizError('Quiz gönderilirken beklenmeyen bir hata oluştu.');
    }

    setQuizSubmitting(false);
  };

  const pronounceWord = (word) => {
    if (!word || !word.english) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.english);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startWordMiniQuiz = (word) => {
    if (!word || words.length === 0) return;
    const distractors = words
      .filter((w) => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, words.length - 1))
      .map((w) => ({
        id: `${word.id}-${w.id}`,
        text: w.turkish
      }));
    const options = [...distractors, { id: `${word.id}-correct`, text: word.turkish }]
      .sort(() => Math.random() - 0.5);

    setActiveWordQuiz({
      wordId: word.id,
      prompt: `"${word.english}" kelimesinin Türkçe karşılığı nedir?`,
      correctAnswer: word.turkish,
      options
    });
    setWordQuizFeedback(null);
  };

  const handleWordQuizAnswer = (wordId, selectedText) => {
    if (!activeWordQuiz || activeWordQuiz.wordId !== wordId) {
      return;
    }
    const isCorrect = selectedText === activeWordQuiz.correctAnswer;
    setActiveWordQuiz((prev) =>
      prev && prev.wordId === wordId ? { ...prev, selectedOption: selectedText } : prev
    );
    setWordQuizFeedback({
      wordId,
      isCorrect,
      message: isCorrect
        ? 'Harika! Doğru cevabı seçtin.'
        : 'Tekrar dene! Doğru cevaba bir kez daha bak.'
    });
    if (isCorrect) {
      setTimeout(() => {
        setActiveWordQuiz(null);
        setWordQuizFeedback(null);
      }, 1800);
    }
  };

  const closeWordQuiz = () => {
    setActiveWordQuiz(null);
    setWordQuizFeedback(null);
  };

  const hasAchievement = (achievementId) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

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
          className={activeTab === 'weeklyQuiz' ? 'active' : ''} 
          onClick={() => setActiveTab('weeklyQuiz')}
        >
          📝 Haftalık Quiz
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
                    <div className="word-card-header">
                      <div className="word-card-header-left">
                        <div className="word-english">{word.english}</div>
                        <div className="word-turkish">{word.turkish}</div>
                      </div>
                    </div>
                    <div className="word-meta">
                      <span className={`difficulty difficulty-${word.difficulty}`}>
                        Seviye {word.difficulty}
                      </span>
                      <span className="category">{word.category}</span>
                    </div>
                    {word.synonyms && word.synonyms.length > 0 && (
                      <div className="word-synonyms">
                        <span className="meta-title">Eş anlamlılar:</span>
                        <div className="meta-chips">
                          {word.synonyms.map((synonym, index) => (
                            <span key={`${word.id}-syn-${index}`} className="meta-chip">
                              {synonym}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {word.antonyms && word.antonyms.length > 0 && (
                      <div className="word-antonyms">
                        <span className="meta-title">Zıt anlamlılar:</span>
                        <div className="meta-chips">
                          {word.antonyms.map((antonym, index) => (
                            <span key={`${word.id}-ant-${index}`} className="meta-chip antonym">
                              {antonym}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {word.example_sentences && word.example_sentences.length > 0 && (
                      <div className="word-examples">
                        <span className="meta-title">Örnek cümleler:</span>
                        <ul>
                          {word.example_sentences.slice(0, 2).map((example, index) => (
                            <li key={`${word.id}-ex-${index}`}>
                              <span className="example-en">{example.sentence}</span>
                              <span className="example-tr">{example.turkish}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="word-actions">
                      <div className="word-action-buttons">
                        <button
                          className="pronunciation-button"
                          onClick={() => pronounceWord(word)}
                          title="Telaffuz dinle"
                        >
                          🔊 Telaffuz
                        </button>
                        <button className="btn-outline" onClick={() => startWordMiniQuiz(word)}>
                          🎯 Mini Quiz
                        </button>
                      </div>
                    </div>
                    {activeWordQuiz && activeWordQuiz.wordId === word.id && (
                      <div className="word-mini-quiz">
                        <div className="mini-quiz-header">
                          <span>{activeWordQuiz.prompt}</span>
                          <button className="close-quiz" onClick={closeWordQuiz} title="Kapat">
                            ✕
                          </button>
                        </div>
                        <div className="mini-quiz-options">
                          {activeWordQuiz.options.map((option) => {
                            const isSelected =
                              activeWordQuiz.wordId === word.id &&
                              activeWordQuiz.selectedOption === option.text;
                            const isCorrectOption =
                              wordQuizFeedback &&
                              wordQuizFeedback.wordId === word.id &&
                              option.text === activeWordQuiz.correctAnswer &&
                              wordQuizFeedback.isCorrect;
                            const isWrongSelection =
                              wordQuizFeedback &&
                              wordQuizFeedback.wordId === word.id &&
                              !wordQuizFeedback.isCorrect &&
                              isSelected;
                            const optionClassName = [
                              'mini-quiz-option',
                              isSelected ? 'selected' : '',
                              isCorrectOption ? 'correct' : '',
                              isWrongSelection ? 'incorrect' : ''
                            ]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <button
                                key={option.id}
                                className={optionClassName}
                                onClick={() => handleWordQuizAnswer(word.id, option.text)}
                              >
                                {option.text}
                              </button>
                            );
                          })}
                        </div>
                        {wordQuizFeedback && wordQuizFeedback.wordId === word.id && (
                          <div
                            className={`mini-quiz-feedback ${
                              wordQuizFeedback.isCorrect ? 'correct' : 'incorrect'
                            }`}
                          >
                            {wordQuizFeedback.message}
                          </div>
                        )}
                      </div>
                    )}
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

        {activeTab === 'weeklyQuiz' && (
          <div className="weekly-quiz-section">
            <h3>Haftalık Quiz</h3>
            {quizLoading ? (
              <div className="loading">Yükleniyor...</div>
            ) : quizError && !weeklyQuiz ? (
              <div className="error-message">{quizError}</div>
            ) : weeklyQuiz && weeklyQuiz.questions && weeklyQuiz.questions.length > 0 ? (
              <form className="weekly-quiz-form" onSubmit={handleSubmitWeeklyQuiz}>
                {quizError && <div className="error-message">{quizError}</div>}
                {weeklyQuiz.questions.map((question, index) => {
                  const userSelection = selectedAnswers[question.id];
                  const isCompleted = quizStatus.completed;
                  const correctIndex = question.correct_option_index;
                  const resultAnswer = quizStatus.result && quizStatus.result.answers
                    ? quizStatus.result.answers.find((answer) => answer.question_id === question.id)
                    : null;
                  const wasCorrect = isCompleted && resultAnswer
                    ? resultAnswer.is_correct
                    : false;

                  return (
                    <div
                      key={question.id}
                      className={`quiz-question ${isCompleted ? (wasCorrect ? 'correct' : 'incorrect') : ''}`}
                    >
                      <div className="quiz-question-title">
                        {index + 1}. {question.prompt}
                      </div>
                      <div className="quiz-options">
                        {question.options.map((option, optionIndex) => {
                          let optionClass = 'quiz-option';
                          if (!isCompleted && userSelection === optionIndex) {
                            optionClass += ' selected';
                          }
                          if (isCompleted) {
                            if (optionIndex === correctIndex) {
                              optionClass += ' correct-option';
                            } else if (optionIndex === userSelection) {
                              optionClass += ' selected-option';
                            }
                          }
                          return (
                            <label
                              key={`${question.id}-${optionIndex}`}
                              className={optionClass}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={optionIndex}
                                checked={userSelection === optionIndex}
                                disabled={isCompleted}
                                onChange={() => handleAnswerChange(question.id, optionIndex)}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                      {isCompleted && resultAnswer && (
                        <div className={`quiz-feedback ${wasCorrect ? 'correct' : 'incorrect'}`}>
                          {wasCorrect
                            ? 'Tebrikler! Bu soruya doğru cevap verdin.'
                            : `Doğru cevap: ${question.options[resultAnswer.correct_option_index]}`}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!quizStatus.completed && (
                  <button type="submit" className="submit-quiz-button" disabled={quizSubmitting}>
                    {quizSubmitting ? 'Gönderiliyor...' : 'Quizi Tamamla'}
                  </button>
                )}

                {quizStatus.completed && quizStatus.result && (() => {
                  const totalQuestions = quizStatus.result.total_questions || 0;
                  const correctAnswers = quizStatus.result.correct_answers || 0;
                  const accuracyPercent = totalQuestions > 0
                    ? Math.round((correctAnswers / totalQuestions) * 100)
                    : 0;
                  const isSuccess = accuracyPercent >= 70;
                  const feedbackMessage = isSuccess
                    ? 'Tebrikler! Haftalık quizde harika bir başarı gösterdin.'
                    : 'Kendini geliştir! Yanlış yaptığın soruları gözden geçirerek ilerleyebilirsin.';

                  return (
                    <div className="quiz-result-summary">
                      <h4>Quiz Sonucu</h4>
                      <p>Skor: {quizStatus.result.score}</p>
                      <p>
                        Doğru sayısı: {correctAnswers} / {totalQuestions}
                      </p>
                      <p>Başarı Oranı: %{accuracyPercent}</p>
                      {quizStatus.result.submitted_at && (
                        <p>
                          Tamamlanma: {new Date(quizStatus.result.submitted_at).toLocaleString('tr-TR')}
                        </p>
                      )}
                      <div className={`quiz-feedback-summary ${isSuccess ? 'success' : 'improve'}`}>
                        {feedbackMessage}
                      </div>
                    </div>
                  );
                })()}
              </form>
            ) : (
              <p>Bu hafta için quiz henüz hazır değil.</p>
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
              onNavigate={(targetTab) => {
                setShowGames(false);
                if (targetTab) {
                  setActiveTab(targetTab);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentPanel;

