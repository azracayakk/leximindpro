import React, { useState } from 'react';
import './GameStyles.css';

function StoryMode({ apiUrl, token, onClose }) {
  const [difficulty, setDifficulty] = useState('beginner');
  const [topic, setTopic] = useState('');
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateStory = async () => {
    if (!topic.trim()) {
      setError('Lütfen bir konu girin');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${apiUrl}/ai/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          difficulty,
          topic
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStory(data);
      } else {
        setError(data.detail || 'Hikaye oluşturulamadı');
      }
    } catch (error) {
      setError('Bağlantı hatası. AI özellikleri devre dışı olabilir.');
      console.error('Story generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExit = () => {
    onClose(0, 0, 0);
  };

  const resetStory = () => {
    setStory(null);
    setTopic('');
  };

  if (story) {
    return (
      <div className="game-container story-mode">
        <div className="game-header">
          <div className="game-header-left">
            <button className="back-button" onClick={handleExit}>
              ← Geri
            </button>
            <h2>📖 AI Hikaye Modu</h2>
          </div>
          <button className="btn-secondary" onClick={resetStory}>
            ← Yeni Hikaye
          </button>
        </div>

        <div className="story-content">
          <div className="story-header">
            <h3>{story.topic}</h3>
            <span className="difficulty-badge">{story.difficulty}</span>
          </div>

          <div className="story-text">
            <p>{story.story}</p>
          </div>

          {story.words_used && story.words_used.length > 0 && (
            <div className="story-words">
              <h4>Hikayede Kullanılan Kelimeler:</h4>
              <div className="words-list">
                {story.words_used.map((word, idx) => (
                  <span key={idx} className="word-tag">{word}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="story-actions">
          <button className="btn-secondary" onClick={resetStory}>
            Başka Hikaye Oluştur
          </button>
          <button className="btn-primary" onClick={handleExit}>
            Bitir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container story-mode">
      <div className="game-header">
        <div className="game-header-left">
          <button className="back-button" onClick={handleExit}>
            ← Geri
          </button>
          <h2>📖 AI Hikaye Modu</h2>
        </div>
      </div>

      <div className="story-generator">
        <h3>Yapay Zeka ile Hikaye Oluştur</h3>
        <p className="description">
          İstediğin bir konuda, seviyene uygun hikaye oluştur ve kelime öğren!
        </p>

        <div className="form-group">
          <label>Zorluk Seviyesi</label>
          <select 
            value={difficulty} 
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={loading}
          >
            <option value="beginner">Başlangıç (A1-A2)</option>
            <option value="intermediate">Orta (B1-B2)</option>
            <option value="advanced">İleri (C1-C2)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Hikaye Konusu</label>
          <input
            type="text"
            placeholder="Örn: Bir kedinin macerası, okul günü, tatil..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
            onKeyPress={(e) => e.key === 'Enter' && generateStory()}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          className="btn-generate" 
          onClick={generateStory}
          disabled={loading}
        >
          {loading ? '🤖 Hikaye Oluşturuluyor...' : '✨ Hikaye Oluştur'}
        </button>

        <div className="topic-suggestions">
          <p>Öneri konular:</p>
          <div className="suggestions-grid">
            {[
              'Bir robot arkadaş',
              'Okul günü',
              'Tatil macerası',
              'Hayvanlar aleminde',
              'Uzay yolculuğu',
              'Zaman makinesi'
            ].map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-btn"
                onClick={() => setTopic(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoryMode;

