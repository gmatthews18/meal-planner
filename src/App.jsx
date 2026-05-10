import React, { useState, useEffect } from 'react';
import mealData from './mealData.json';
import './App.css';

function App() {
  const [selectedPerson, setSelectedPerson] = useState('george');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [meals, setMeals] = useState({});
  const [dailyCalories, setDailyCalories] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [editingCalories, setEditingCalories] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [activeTab, setActiveTab] = useState('week'); // 'week', 'shopping', 'dashboard'
  const [shoppingList, setShoppingList] = useState([]);

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

  const getTotals = (meals) => meals.reduce((a, m) => ({
    calories: a.calories + m.calories,
    protein: a.protein + m.protein,
    carbs: a.carbs + m.carbs,
    fat: a.fat + m.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const getWeeklyTotals = () => {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    currentWeekData.days.forEach(day => {
      const dayTotals = getTotals(day.meals);
      totals.calories += dayTotals.calories;
      totals.protein += dayTotals.protein;
      totals.carbs += dayTotals.carbs;
      totals.fat += dayTotals.fat;
    });
    return totals;
  };

  useEffect(() => {
    if (activeTab === 'shopping') {
      const ingredients = {};
      currentWeekData.days.forEach(day => {
        day.meals.forEach(meal => {
          // Skip shared meals if this is not george (to avoid duplication)
          if (meal.isShared && selectedPerson !== 'george') return;

          meal.ingredients.forEach(ing => {
            const key = ing.name;
            if (!ingredients[key]) {
              ingredients[key] = { quantity: 0, unit: ing.unit };
            }
            ingredients[key].quantity += parseFloat(ing.quantity) || 0;
          });
        });
      });

      const list = Object.entries(ingredients).map(([name, data]) => ({
        name,
        quantity: data.quantity.toFixed(2),
        unit: data.unit,
        checked: false
      }));

      setShoppingList(list);
    }
  }, [activeTab, currentWeek, selectedPerson, currentWeekData]);

  const generateNutritionAdvice = () => {
    const weeklyTotals = getWeeklyTotals();
    const avgDailyCalories = weeklyTotals.calories / 7;
    const avgDailyProtein = weeklyTotals.protein / 7;
    const avgDailyCarbs = weeklyTotals.carbs / 7;
    const avgDailyFat = weeklyTotals.fat / 7;
    const calorieTarget = personDailyCalories;
    const calorieRatio = avgDailyCalories / calorieTarget;

    const responses = [];

    // Calorie advice
    if (calorieRatio < 0.9) {
      responses.push(`Your meal plan averages ${Math.round(avgDailyCalories)} calories/day, which is about ${Math.round((1 - calorieRatio) * 100)}% below your ${calorieTarget} calorie target. Consider adding more protein-rich snacks or increasing portion sizes.`);
    } else if (calorieRatio > 1.1) {
      responses.push(`Your meal plan averages ${Math.round(avgDailyCalories)} calories/day, which is about ${Math.round((calorieRatio - 1) * 100)}% above your ${calorieTarget} calorie target. Try reducing portion sizes or swapping high-calorie items for lighter alternatives.`);
    } else {
      responses.push(`Great! Your meal plan averages ${Math.round(avgDailyCalories)} calories/day, which is right on target with your ${calorieTarget} calorie goal.`);
    }

    // Protein advice
    const proteinTarget = calorieTarget * 0.3 / 4; // 30% of calories from protein
    if (avgDailyProtein < proteinTarget * 0.9) {
      responses.push(`Your protein intake (${Math.round(avgDailyProtein)}g/day) is a bit low. Consider adding more chicken, fish, eggs, or legumes to meet your ~${Math.round(proteinTarget)}g daily target.`);
    } else if (avgDailyProtein > proteinTarget * 1.2) {
      responses.push(`Excellent protein intake at ${Math.round(avgDailyProtein)}g/day! This will help with muscle recovery and satiety.`);
    } else {
      responses.push(`Your protein intake (${Math.round(avgDailyProtein)}g/day) is well-balanced for your calorie goals.`);
    }

    // Macro balance advice
    const carbPercent = (avgDailyCarbs * 4) / avgDailyCalories * 100;
    if (carbPercent > 60) {
      responses.push(`Your carb ratio is ${Math.round(carbPercent)}%, which is on the higher side. You might consider swapping some refined carbs for whole grains.`);
    }

    // Dietary restrictions check
    if (person.restrictions.length > 0) {
      responses.push(`Remember: Your meal plan accounts for your dietary restrictions: ${person.restrictions.join(', ')}.`);
    }

    return responses.join(' ');
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { text: chatInput, sender: 'user' };
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setLoadingChat(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const userQuery = chatInput.toLowerCase();
    let aiResponse = '';

    if (userQuery.includes('calor') || userQuery.includes('energy')) {
      const weeklyTotals = getWeeklyTotals();
      const avgDaily = weeklyTotals.calories / 7;
      aiResponse = `Your meal plan for this week averages ${Math.round(avgDaily)} calories per day against a target of ${personDailyCalories}. ${generateNutritionAdvice()}`;
    } else if (userQuery.includes('protein')) {
      const weeklyTotals = getWeeklyTotals();
      const avgProtein = weeklyTotals.protein / 7;
      aiResponse = `Your protein intake averages ${Math.round(avgProtein)}g per day. ${generateNutritionAdvice()}`;
    } else if (userQuery.includes('macro') || userQuery.includes('balance')) {
      aiResponse = generateNutritionAdvice();
    } else if (userQuery.includes('restrict') || userQuery.includes('allerg')) {
      if (person.restrictions.length > 0) {
        aiResponse = `Your dietary restrictions are: ${person.restrictions.join(', ')}. Your meal plan is designed to accommodate these restrictions. ${generateNutritionAdvice()}`;
      } else {
        aiResponse = `You don't have any dietary restrictions set. ${generateNutritionAdvice()}`;
      }
    } else if (userQuery.includes('recommend') || userQuery.includes('suggest')) {
      aiResponse = `Here are my recommendations: ${generateNutritionAdvice()} Try mixing up your meals to keep things interesting while staying within your nutritional targets!`;
    } else {
      aiResponse = `Here's your nutrition analysis: ${generateNutritionAdvice()} Feel free to ask me about calories, protein, macros, or your dietary restrictions!`;
    }

    const aiMessage = { text: aiResponse, sender: 'ai' };
    setChatMessages(prev => [...prev, aiMessage]);
    setLoadingChat(false);
  };

  const progressPercent = ((currentWeek + 1) / 6) * 100;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🍽️ AI Meal Planner</h1>
          <p>Personalized 6-week nutrition plan</p>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>⚙️</button>
      </header>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
              onClick={() => {setSelectedPerson('george'); setCurrentWeek(0); setActiveTab('week');}}
            >
              <span className="emoji">👨</span>
              <span className="name">George</span>
              <span className="goal">{person.currentWeight}kg → {person.targetWeight}kg</span>
            </button>
            <button
              className={`user-btn ${selectedPerson === 'jude' ? 'active' : ''}`}
              onClick={() => {setSelectedPerson('jude'); setCurrentWeek(0); setActiveTab('week');}}
            >
              <span className="emoji">👦</span>
              <span className="name">Jude</span>
              <span className="goal">{person.currentWeight}kg → {person.targetWeight}kg</span>
            </button>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'week' ? 'active' : ''}`}
            onClick={() => setActiveTab('week')}
          >
            📅 Week Plan
          </button>
          <button
            className={`tab-btn ${activeTab === 'shopping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shopping')}
          >
            🛒 Shopping List
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
        </section>

        {/* Week Plan Tab */}
        {activeTab === 'week' && (
          <>
            {/* Stats Section */}
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
                {(() => {
                  const totals = getTotals(currentWeekData.days[0].meals);
                  return (
                    <>
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
                    </>
                  );
                })()}
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
                        <div key={mi} className={`meal-item ${meal.isShared ? 'shared-meal' : ''}`}>
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
                            {meal.isShared && <span className="shared-badge">Shared</span>}
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
                            <div className="nutrition-badge">
                              <span className="label">⏱️</span>
                              <span className="value">{meal.prepTime}m</span>
                            </div>
                          </div>
                          {meal.ingredients && (
                            <div className="meal-ingredients">
                              <p><strong>Ingredients:</strong></p>
                              <ul>
                                {meal.ingredients.map((ing, idx) => (
                                  <li key={idx}>{ing.quantity} {ing.unit} {ing.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.instructions && (
                            <div className="meal-instructions">
                              <p><strong>Instructions:</strong></p>
                              <ol>
                                {meal.instructions.map((instr, idx) => (
                                  <li key={idx}>{instr}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Chat Interface */}
            <section className="chat-section">
              <h2>💬 Ask about this week's meals</h2>
              <div className="chat-container">
                <div className="chat-messages">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.sender}`}>
                      <div className="message-avatar">{msg.sender === 'user' ? '👤' : '🤖'}</div>
                      <div className="message-text">{msg.text}</div>
                    </div>
                  ))}
                  {loadingChat && (
                    <div className="chat-message ai loading">
                      <div className="message-avatar">🤖</div>
                      <div className="message-text">Thinking...</div>
                    </div>
                  )}
                </div>
                <div className="chat-input-group">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Ask about nutrition, ingredients, alternatives..."
                    disabled={loadingChat}
                  />
                  <button onClick={sendChatMessage} disabled={loadingChat} className="btn-send">
                    {loadingChat ? '⏳' : '📤'}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Shopping List Tab */}
        {activeTab === 'shopping' && (
          <section className="shopping-section">
            <h2>🛒 Shopping List - Week {currentWeek + 1}</h2>
            <div className="shopping-list">
              {shoppingList.length > 0 ? (
                <ul>
                  {shoppingList.map((item, idx) => (
                    <li key={idx} className="shopping-item">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => {
                          const updated = [...shoppingList];
                          updated[idx].checked = !updated[idx].checked;
                          setShoppingList(updated);
                        }}
                      />
                      <span className={item.checked ? 'checked' : ''}>
                        {item.quantity} {item.unit} {item.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No items in shopping list</p>
              )}
            </div>
          </section>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <section className="dashboard-section">
            <h2>📊 Progress Dashboard</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Weight Progress</h3>
                <div className="progress-details">
                  <p>Current: <strong>{person.currentWeight} kg</strong></p>
                  <p>Target: <strong>{person.targetWeight} kg</strong></p>
                  <p>To Lose: <strong>{(person.currentWeight - person.targetWeight).toFixed(1)} kg</strong></p>
                  <div className="weight-bar">
                    <div className="weight-progress" style={{
                      width: `${((person.currentWeight - person.targetWeight) / (person.currentWeight - person.targetWeight) * 100)}%`
                    }}></div>
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <h3>Weekly Nutrition Summary</h3>
                <div className="nutrition-summary">
                  {(() => {
                    const weeklyTotals = getWeeklyTotals();
                    const avgDaily = {
                      calories: (weeklyTotals.calories / 7).toFixed(0),
                      protein: (weeklyTotals.protein / 7).toFixed(1),
                      carbs: (weeklyTotals.carbs / 7).toFixed(1),
                      fat: (weeklyTotals.fat / 7).toFixed(1)
                    };
                    return (
                      <>
                        <p>Avg Daily: <strong>{avgDaily.calories} cal</strong> ({weeklyTotals.calories} total)</p>
                        <p>Protein: <strong>{avgDaily.protein}g/day</strong></p>
                        <p>Carbs: <strong>{avgDaily.carbs}g/day</strong></p>
                        <p>Fat: <strong>{avgDaily.fat}g/day</strong></p>
                        <p className={avgDaily.calories <= personDailyCalories ? 'good' : 'warning'}>
                          {avgDaily.calories <= personDailyCalories ? '✓ Within target' : '⚠ Exceeds target'}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="dashboard-card">
                <h3>Plan Overview</h3>
                <div className="plan-overview">
                  <p>Week: <strong>{currentWeek + 1} of 6</strong></p>
                  <p>Days Planned: <strong>{currentWeekData.days.length}/7</strong></p>
                  <p>Meals Planned: <strong>{currentWeekData.days.reduce((sum, day) => sum + day.meals.length, 0)}</strong></p>
                  <p>Dietary Restrictions: <strong>{person.restrictions.length > 0 ? person.restrictions.join(', ') : 'None'}</strong></p>
                </div>
              </div>

              <div className="dashboard-card">
                <h3>Shared Meals This Week</h3>
                <div className="shared-meals">
                  {currentWeekData.days.filter(day => day.meals.some(m => m.isShared)).map(day => (
                    <div key={day.day}>
                      <p><strong>{day.day}:</strong></p>
                      {day.meals.filter(m => m.isShared).map(meal => (
                        <p key={meal.name} className="shared-meal-name">
                          🍽️ {getMealName(currentWeekData.days.indexOf(day), meal.meal, meal.name)}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Navigation */}
        {activeTab === 'week' && (
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
        )}
      </main>
    </div>
  );
}

export default App;
