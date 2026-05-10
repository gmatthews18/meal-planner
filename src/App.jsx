import React, { useState, useEffect } from 'react';
import mealData from './mealData.json';
import './App.css';

function App() {
  const [selectedPerson, setSelectedPerson] = useState('george');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [grokResponse, setGrokResponse] = useState('');
  const [loadingMeal, setLoadingMeal] = useState(null);
  const [meals, setMeals] = useState({});
  const [dailyCalories, setDailyCalories] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [editingCalories, setEditingCalories] = useState({});

  // Load saved data on mount
  useEffect(() => {
    const savedMeals = localStorage.getItem('saved_meals');
    const savedCalories = localStorage.getItem('daily_calories');
    if (savedMeals) setMeals(JSON.parse(savedMeals));
    if (savedCalories) setDailyCalories(JSON.parse(savedCalories));
    setEditingCalories({
      george: savedCalories ? JSON.parse(savedCalories).george || mealData.george.dailyCalories : mealData.george.dailyCalories,
      jude: savedCalories ? JSON.parse(savedCalories).jude || mealData.jude.dailyCalories : mealData.jude.dailyCalories
    });
  }, []);

  const handleAISuggestions = () => {
    alert('AI suggestions coming soon! Set up your preferred AI service:\n\n• Ollama (local)\n• Hugging Face\n• Together AI\n• Open Router\n\nFor now, you can manually edit meal names and calorie targets.');
  };

  const person = mealData[selectedPerson];
  const currentWeekData = person.weeks[currentWeek];
  const personDailyCalories = dailyCalories[selectedPerson] || person.dailyCalories;

  const saveMeals = (updatedMeals) => {
    setMeals(updatedMeals);
    localStorage.setItem('saved_meals', JSON.stringify(updatedMeals));
  };

  const getMealName = (dayIndex, mealType, defaultName) => {
    const key = `${selectedPerson}-w${currentWeek}-d${dayIndex}-${mealType}`;
    return meals[key] || defaultName;
  };

  const updateMealName = (dayIndex, mealType, newName) => {
    const key = `${selectedPerson}-w${currentWeek}-d${dayIndex}-${mealType}`;
    const updatedMeals = { ...meals, [key]: newName };
    saveMeals(updatedMeals);
  };

  const saveCalories = () => {
    const updated = { ...dailyCalories, [selectedPerson]: parseInt(editingCalories[selectedPerson]) };
    setDailyCalories(updated);
    localStorage.setItem('daily_calories', JSON.stringify(updated));
    setShowSettings(false);
  };

  const changeMeal = (dayIndex, mealType) => {
    handleAISuggestions();
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
        <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
      </header>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>⚙️ Settings</h2>
            <div className="settings-group">
              <label>Daily Calorie Target for {selectedPerson === 'george' ? 'George' : 'Jude'}</label>
              <input
                type="number"
                value={editingCalories[selectedPerson] || 0}
                onChange={e => setEditingCalories({...editingCalories, [selectedPerson]: e.target.value})}
                min="500"
                max="5000"
                step="50"
              />
              <small>Current: {personDailyCalories} calories/day</small>
            </div>
            <div className="button-group">
              <button onClick={saveCalories} className="btn-primary">Save Settings</button>
              <button onClick={() => setShowSettings(false)} className="btn-secondary">Cancel</button>
            </div>
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
            <div className="stat-value">{personDailyCalories}</div>
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
                        <div className="meal-name-edit">
                          <h4
                            className="editable-meal"
                            contentEditable
                            onBlur={e => {
                              const newName = e.currentTarget.textContent.trim();
                              if (newName && newName !== getMealName(di, meal.meal, meal.name)) {
                                updateMealName(di, meal.meal, newName);
                              }
                            }}
                            onClick={e => e.currentTarget.focus()}
                          >
                            {getMealName(di, meal.meal, meal.name)}
                          </h4>
                          <small className="edit-hint">click to edit</small>
                        </div>
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
