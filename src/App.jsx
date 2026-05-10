import React, { useState } from 'react';
import mealData from './mealData.json';
import './App.css';

function App() {
  const [selectedPerson, setSelectedPerson] = useState('george');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [apiKey, setApiKey] = useState(localStorage.getItem('grok_api_key') || '');
  const [showApiInput, setShowApiInput] = useState(!apiKey);
  const [grokResponse, setGrokResponse] = useState('');
  const [loadingMeal, setLoadingMeal] = useState(null);

  const person = mealData[selectedPerson];
  const currentWeekData = person.weeks[currentWeek];

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('grok_api_key', apiKey);
      setShowApiInput(false);
    }
  };

  const changeMeal = async (dayIndex, mealType) => {
    if (!apiKey) {
      setShowApiInput(true);
      return;
    }

    const day = currentWeekData.days[dayIndex];
    const meal = day.meals.find(m => m.meal === mealType);
    setLoadingMeal(`${dayIndex}-${mealType}`);
    setGrokResponse('');

    try {
      const res = await fetch('https://api.x.ai/openai/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey},
        body: JSON.stringify({
          model: 'grok-2',
          messages: [{role: 'user', content: `Current meal: ${meal.name} (${meal.calories}cal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fat}g fat). Suggest 3 similar alternatives with brief cooking tips. Keep it concise. Dietary restrictions: ${person.restrictions.length > 0 ? person.restrictions.join(', ') : 'None'}`}],
          max_tokens: 600
        })
      });
      const data = await res.json();
      setGrokResponse(data.choices[0].message.content);
    } catch (e) {
      setGrokResponse(`Error: ${e.message}`);
    } finally {
      setLoadingMeal(null);
    }
  };

  const getTotals = (meals) => meals.reduce((a, m) => ({calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat}), {calories: 0, protein: 0, carbs: 0, fat: 0});
  const totals = getTotals(currentWeekData.days[0].meals);
  const progressPercent = ((currentWeek + 1) / 6) * 100;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🍽️ AI Meal Planner</h1>
          <p>Personalized 6-week nutrition plan powered by Grok</p>
        </div>
      </header>

      {showApiInput && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>🔑 Enter Grok API Key</h2>
            <p>Get your key from <a href="https://console.x.ai/api" target="_blank" rel="noopener noreferrer">console.x.ai/api</a></p>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="xai-..."
              onKeyPress={e => e.key === 'Enter' && saveApiKey()}
            />
            <button onClick={saveApiKey} className="btn-primary">Save API Key</button>
          </div>
        </div>
      )}

      <main className="container">
        {/* User Selection */}
        <section className="user-section">
          <h2>Select Profile</h2>
          <div className="user-buttons">
            <button
              className={`user-btn ${selectedPerson === 'george' ? 'active' : ''}`}
              onClick={() => {setSelectedPerson('george'); setCurrentWeek(0);}}
            >
              <span className="emoji">👨</span>
              <span className="name">George</span>
              <span className="goal">{person.currentWeight}kg → {person.targetWeight}kg</span>
            </button>
            <button
              className={`user-btn ${selectedPerson === 'jude' ? 'active' : ''}`}
              onClick={() => {setSelectedPerson('jude'); setCurrentWeek(0);}}
            >
              <span className="emoji">👦</span>
              <span className="name">Jude</span>
              <span className="goal">{person.currentWeight}kg → {person.targetWeight}kg</span>
            </button>
          </div>
        </section>

        {/* Progress & Stats */}
        <section className="stats-section">
          <div className="stat-card">
            <div className="stat-label">Daily Target</div>
            <div className="stat-value">{person.dailyCalories}</div>
            <div className="stat-unit">calories</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Current Weight</div>
            <div className="stat-value">{person.currentWeight}</div>
            <div className="stat-unit">kg</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Goal Weight</div>
            <div className="stat-value">{person.targetWeight}</div>
            <div className="stat-unit">kg</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Plan Progress</div>
            <div className="stat-value">Week {currentWeek + 1}</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width: progressPercent + '%'}}></div>
            </div>
          </div>
        </section>

        {/* Daily Totals */}
        <section className="totals-section">
          <h2>Daily Macros</h2>
          <div className="macro-grid">
            <div className="macro-card calories">
              <div className="macro-icon">🔥</div>
              <div className="macro-value">{totals.calories}</div>
              <div className="macro-label">Calories</div>
            </div>
            <div className="macro-card protein">
              <div className="macro-icon">💪</div>
              <div className="macro-value">{totals.protein}g</div>
              <div className="macro-label">Protein</div>
            </div>
            <div className="macro-card carbs">
              <div className="macro-icon">⚡</div>
              <div className="macro-value">{totals.carbs}g</div>
              <div className="macro-label">Carbs</div>
            </div>
            <div className="macro-card fat">
              <div className="macro-icon">🧈</div>
              <div className="macro-value">{totals.fat}g</div>
              <div className="macro-label">Fat</div>
            </div>
          </div>
        </section>

        {/* Weekly Meals */}
        <section className="meals-section">
          <h2>Week {currentWeek + 1} Meals</h2>
          <div className="week-grid">
            {currentWeekData.days.map((day, di) => (
              <div key={di} className="day-card">
                <h3 className="day-name">{day.day}</h3>
                <div className="meals-list">
                  {day.meals.map((meal, mi) => (
                    <div key={mi} className="meal-item">
                      <div className="meal-header">
                        <h4>{meal.name}</h4>
                        <span className="meal-type">{meal.meal.charAt(0).toUpperCase() + meal.meal.slice(1)}</span>
                      </div>
                      <div className="meal-nutrition">
                        <div className="nutrition-badge">
                          <span className="label">Cal</span>
                          <span className="value">{meal.calories}</span>
                        </div>
                        <div className="nutrition-badge">
                          <span className="label">P</span>
                          <span className="value">{meal.protein}g</span>
                        </div>
                        <div className="nutrition-badge">
                          <span className="label">C</span>
                          <span className="value">{meal.carbs}g</span>
                        </div>
                        <div className="nutrition-badge">
                          <span className="label">F</span>
                          <span className="value">{meal.fat}g</span>
                        </div>
                      </div>
                      <button
                        className="btn-change"
                        onClick={() => changeMeal(di, meal.meal)}
                        disabled={loadingMeal === `${di}-${meal.meal}`}
                      >
                        {loadingMeal === `${di}-${meal.meal}` ? '⏳ Loading...' : '✨ Get AI Suggestions'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Suggestions */}
        {grokResponse && (
          <section className="suggestions-section">
            <div className="suggestions-card">
              <h2>🤖 AI Suggestions</h2>
              <div className="suggestions-text">{grokResponse}</div>
            </div>
          </section>
        )}

        {/* Navigation */}
        <div className="navigation">
          <button
            className="nav-btn"
            onClick={() => currentWeek > 0 && setCurrentWeek(currentWeek - 1)}
            disabled={currentWeek === 0}
          >
            ← Previous Week
          </button>
          <span className="week-indicator">Week {currentWeek + 1} of 6</span>
          <button
            className="nav-btn"
            onClick={() => currentWeek < 5 && setCurrentWeek(currentWeek + 1)}
            disabled={currentWeek === 5}
          >
            Next Week →
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
