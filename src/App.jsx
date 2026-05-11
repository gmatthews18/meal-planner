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
  const [activeTab, setActiveTab] = useState('dashboard'); // 'week', 'shopping', 'dashboard'
  const [shoppingList, setShoppingList] = useState([]);
  const [customRestrictions, setCustomRestrictions] = useState([]);
  const [weightHistory, setWeightHistory] = useState({});
  const [weightInput, setWeightInput] = useState('');
  const [eatenCalories, setEatenCalories] = useState({});
  const [dailyCalorieInput, setDailyCalorieInput] = useState('');

  // Load saved data on mount
  useEffect(() => {
    const savedMeals = localStorage.getItem('saved_meals');
    const savedCalories = localStorage.getItem('daily_calories');
    const savedWeights = localStorage.getItem('weight_history');
    const savedEatenCalories = localStorage.getItem('eaten_calories');
    if (savedMeals) setMeals(JSON.parse(savedMeals));
    if (savedCalories) setDailyCalories(JSON.parse(savedCalories));
    if (savedWeights) setWeightHistory(JSON.parse(savedWeights));
    if (savedEatenCalories) setEatenCalories(JSON.parse(savedEatenCalories));
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

  const saveWeight = () => {
    if (!weightInput || isNaN(weightInput)) return;
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const personKey = selectedPerson;
    const updated = {
      ...weightHistory,
      [personKey]: [...(weightHistory[personKey] || []), { date: today, weight: parseFloat(weightInput) }]
    };
    setWeightHistory(updated);
    localStorage.setItem('weight_history', JSON.stringify(updated));
    setWeightInput('');
  };

  // Convert kg to stones and pounds
  const kgToStonePounds = (kg) => {
    const totalPounds = kg * 2.20462;
    const stones = Math.floor(totalPounds / 14);
    const pounds = Math.round(totalPounds % 14);
    return { stones, pounds };
  };

  // Format weight display
  const formatWeight = (kg) => {
    const { stones, pounds } = kgToStonePounds(kg);
    return `${kg}kg (${stones}st ${pounds}lb)`;
  };

  // Log daily calories eaten
  const logDailyCalories = (day) => {
    if (!dailyCalorieInput || isNaN(dailyCalorieInput)) return;
    const key = `${selectedPerson}-w${currentWeek}-d${day}`;
    const updated = {
      ...eatenCalories,
      [key]: parseFloat(dailyCalorieInput)
    };
    setEatenCalories(updated);
    localStorage.setItem('eaten_calories', JSON.stringify(updated));
    setDailyCalorieInput('');
  };

  // Get calories eaten for a specific day
  const getEatenCaloriesForDay = (day) => {
    const key = `${selectedPerson}-w${currentWeek}-d${day}`;
    return eatenCalories[key] || 0;
  };

  // Get total eaten calories for the week
  const getTotalEatenCaloriesForWeek = () => {
    let total = 0;
    currentWeekData.days.forEach((day, idx) => {
      total += getEatenCaloriesForDay(idx);
    });
    return total;
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

  const mealSuggestions = {
    breakfast: [
      { name: 'Greek Yogurt & Granola', calories: 300, protein: 15, carbs: 40, fat: 8, ingredients: ['yogurt', 'granola', 'honey'] },
      { name: 'Banana & Peanut Butter Toast', calories: 280, protein: 10, carbs: 35, fat: 9, ingredients: ['bread', 'peanut butter', 'banana', 'nuts'] },
      { name: 'Smoothie Bowl with Granola', calories: 320, protein: 12, carbs: 45, fat: 8, ingredients: ['berries', 'yogurt', 'granola', 'honey'] },
      { name: 'Cottage Cheese & Fruit', calories: 250, protein: 20, carbs: 30, fat: 5, ingredients: ['cottage cheese', 'berries', 'honey'] },
      { name: 'Avocado Toast with Tomato', calories: 290, protein: 8, carbs: 32, fat: 12, ingredients: ['bread', 'avocado', 'tomato', 'olive oil'] },
      { name: 'Oatmeal & Berries', calories: 280, protein: 8, carbs: 48, fat: 5, ingredients: ['oats', 'berries', 'honey'] },
    ],
    lunch: [
      { name: 'Grilled Salmon & Broccoli', calories: 420, protein: 40, carbs: 35, fat: 12, ingredients: ['salmon', 'broccoli', 'olive oil'] },
      { name: 'Turkey & Veggie Sandwich', calories: 380, protein: 28, carbs: 45, fat: 10, ingredients: ['bread', 'turkey', 'lettuce', 'tomato'] },
      { name: 'Quinoa Buddha Bowl', calories: 420, protein: 15, carbs: 55, fat: 10, ingredients: ['quinoa', 'chickpeas', 'vegetables'] },
      { name: 'Lean Beef Taco Bowl', calories: 450, protein: 35, carbs: 40, fat: 12, ingredients: ['beef', 'rice', 'beans', 'vegetables'] },
      { name: 'Chickpea Curry with Rice', calories: 420, protein: 12, carbs: 60, fat: 10, ingredients: ['chickpeas', 'rice', 'coconut milk', 'spices'] },
    ],
    dinner: [
      { name: 'Baked Chicken Breast & Sweet Potato', calories: 480, protein: 45, carbs: 50, fat: 8, ingredients: ['chicken', 'sweet potato', 'olive oil'] },
      { name: 'Pasta Primavera with Chicken', calories: 500, protein: 38, carbs: 55, fat: 10, ingredients: ['pasta', 'chicken', 'vegetables', 'olive oil'] },
      { name: 'Grilled Tilapia & Green Beans', calories: 380, protein: 42, carbs: 30, fat: 10, ingredients: ['tilapia', 'green beans', 'olive oil', 'lemon'] },
      { name: 'Vegetable Stir-fry with Tofu', calories: 350, protein: 20, carbs: 40, fat: 12, ingredients: ['tofu', 'vegetables', 'soy sauce', 'rice'] },
      { name: 'Slow-cooker Chili', calories: 420, protein: 28, carbs: 45, fat: 10, ingredients: ['beef', 'beans', 'tomatoes', 'spices'] },
    ],
    snack: [
      { name: 'Almonds (1oz)', calories: 160, protein: 6, carbs: 6, fat: 14, ingredients: ['almonds', 'nuts'] },
      { name: 'Apple & Almond Butter', calories: 200, protein: 7, carbs: 25, fat: 8, ingredients: ['apple', 'almond butter', 'nuts'] },
      { name: 'Protein Bar', calories: 180, protein: 15, carbs: 20, fat: 5, ingredients: ['protein bar'] },
      { name: 'Yogurt & Berries', calories: 150, protein: 12, carbs: 20, fat: 2, ingredients: ['yogurt', 'berries'] },
      { name: 'Hummus & Veggie Sticks', calories: 140, protein: 5, carbs: 15, fat: 6, ingredients: ['hummus', 'vegetables', 'chickpeas'] },
    ],
  };

  const isIngredientsAllowed = (ingredients) => {
    const allRestrictions = [...person.restrictions, ...customRestrictions];
    return !ingredients.some(ing =>
      allRestrictions.some(rest => ing.toLowerCase().includes(rest.toLowerCase()))
    );
  };

  const getSuggestedMeal = (mealType) => {
    const meals = mealSuggestions[mealType] || [];
    const safeMeals = meals.filter(m => isIngredientsAllowed(m.ingredients));
    return safeMeals.length > 0
      ? safeMeals[Math.floor(Math.random() * safeMeals.length)]
      : meals[0];
  };

  const generateNutritionAdvice = () => {
    const weeklyTotals = getWeeklyTotals();
    const avgDailyCalories = weeklyTotals.calories / 7;
    const avgDailyProtein = weeklyTotals.protein / 7;
    const avgDailyCarbs = weeklyTotals.carbs / 7;
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

    // Handle custom restrictions
    if (userQuery.includes('remove') || userQuery.includes('no ') || userQuery.includes('avoid') || userQuery.includes('exclude')) {
      const words = userQuery.split(/\s+/);
      const restrictionIndex = words.findIndex(w => w === 'remove' || w === 'avoid' || w === 'exclude' || w.startsWith('no'));
      if (restrictionIndex !== -1) {
        const restriction = words.slice(restrictionIndex + 1).join(' ').replace(/[^\w\s]/g, '');
        if (restriction && restriction.length > 0) {
          setCustomRestrictions([...customRestrictions, restriction]);
          aiResponse = `Got it! I'll remove all ${restriction} from meal suggestions. Your updated preferences: ${[...person.restrictions, ...customRestrictions, restriction].join(', ')}`;
          const aiMessage = { text: aiResponse, sender: 'ai' };
          setChatMessages(prev => [...prev, aiMessage]);
          setLoadingChat(false);
          return;
        }
      }
    }

    // Handle clearing restrictions
    if (userQuery.includes('reset') || (userQuery.includes('clear') && userQuery.includes('restrict'))) {
      setCustomRestrictions([]);
      aiResponse = `Restrictions cleared! Back to your default preferences: ${person.restrictions.join(', ') || 'None'}`;
      const aiMessage = { text: aiResponse, sender: 'ai' };
      setChatMessages(prev => [...prev, aiMessage]);
      setLoadingChat(false);
      return;
    }
    const weeklyTotals = getWeeklyTotals();
    const avgDaily = Math.round(weeklyTotals.calories / 7);
    const avgProtein = Math.round(weeklyTotals.protein / 7);
    const avgCarbs = Math.round(weeklyTotals.carbs / 7);
    const calorieRatio = avgDaily / personDailyCalories;

    if (userQuery.includes('calor') || userQuery.includes('energy') || userQuery.includes('intake')) {
      if (calorieRatio < 0.9) {
        aiResponse = `You're averaging ${avgDaily} calories/day, which is ${Math.round((1 - calorieRatio) * 100)}% below your ${personDailyCalories} target. Try adding more snacks or increasing portion sizes.`;
      } else if (calorieRatio > 1.1) {
        aiResponse = `You're averaging ${avgDaily} calories/day, which is ${Math.round((calorieRatio - 1) * 100)}% above your ${personDailyCalories} target. Consider smaller portions or lower-calorie alternatives.`;
      } else {
        aiResponse = `Perfect! You're averaging ${avgDaily} calories/day, right on target with your ${personDailyCalories} calorie goal.`;
      }
    } else if (userQuery.includes('protein')) {
      const proteinTarget = Math.round(personDailyCalories * 0.3 / 4);
      if (avgProtein < proteinTarget * 0.9) {
        aiResponse = `Your protein is ${avgProtein}g/day, a bit low. Aim for ~${proteinTarget}g by adding chicken, fish, eggs, or legumes.`;
      } else if (avgProtein > proteinTarget * 1.2) {
        aiResponse = `Great protein intake at ${avgProtein}g/day! That's excellent for muscle recovery and satiety.`;
      } else {
        aiResponse = `Your protein at ${avgProtein}g/day is well-balanced for your goals.`;
      }
    } else if (userQuery.includes('carb')) {
      const carbPercent = Math.round((avgCarbs * 4) / avgDaily * 100);
      if (carbPercent > 60) {
        aiResponse = `Your carbs are ${carbPercent}% of calories, which is higher. Try swapping some refined carbs for whole grains or vegetables.`;
      } else if (carbPercent < 40) {
        aiResponse = `Your carbs are ${carbPercent}% of calories, which is lower. Carbs are important for energy—consider adding more fruits or grains.`;
      } else {
        aiResponse = `Your carb ratio at ${carbPercent}% is well-balanced for energy and performance.`;
      }
    } else if (userQuery.includes('macro') || userQuery.includes('balance')) {
      aiResponse = `Your macros: ${avgDaily}cal, ${avgProtein}g protein, ${avgCarbs}g carbs. ${generateNutritionAdvice()}`;
    } else if (userQuery.includes('restrict') || userQuery.includes('allerg')) {
      if (person.restrictions.length > 0) {
        aiResponse = `Your restrictions: ${person.restrictions.join(', ')}. Your meal plan fully accounts for these.`;
      } else {
        aiResponse = `You don't have any dietary restrictions set up.`;
      }
    } else if (userQuery.includes('new meal') || userQuery.includes('change meal') || userQuery.includes('swap meal')) {
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      const suggestions = mealTypes.map(type => {
        const meal = getSuggestedMeal(type);
        return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${meal.name} (${meal.calories}cal)`;
      });
      aiResponse = `Here are some meal ideas:\n${suggestions.join('\n')}\n\nLet me know which meals you'd like to try, and I can help update your plan!`;
    } else if (userQuery.includes('breakfast') || userQuery.includes('lunch') || userQuery.includes('dinner') || userQuery.includes('snack')) {
      let mealType = 'breakfast';
      if (userQuery.includes('lunch')) mealType = 'lunch';
      if (userQuery.includes('dinner')) mealType = 'dinner';
      if (userQuery.includes('snack')) mealType = 'snack';

      const meal = getSuggestedMeal(mealType);
      aiResponse = `For ${mealType}, I suggest: **${meal.name}**\n${meal.calories}cal, ${meal.protein}g protein, ${meal.carbs}g carbs. Would you like to swap this in?`;
    } else if (userQuery.includes('recommend') || userQuery.includes('suggest') || userQuery.includes('help')) {
      aiResponse = `Try asking about: calories, protein, carbs, macros, restrictions, meals. Or ask for "new meal ideas"! Your current average: ${avgDaily}cal/day, target: ${personDailyCalories}cal.`;
    } else {
      aiResponse = `I can help with your meal planning! Current stats: ${avgDaily}cal/day (target: ${personDailyCalories}), ${avgProtein}g protein. What would you like to know?`;
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
              <span className="goal">{formatWeight(mealData.george.currentWeight)} → {formatWeight(mealData.george.targetWeight)}</span>
            </button>
            <button
              className={`user-btn ${selectedPerson === 'jude' ? 'active' : ''}`}
              onClick={() => {setSelectedPerson('jude'); setCurrentWeek(0); setActiveTab('week');}}
            >
              <span className="emoji">👦</span>
              <span className="name">Jude</span>
              <span className="goal">{formatWeight(mealData.jude.currentWeight)} → {formatWeight(mealData.jude.targetWeight)}</span>
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
            <div className="shopping-header">
              <h2>🛒 Shopping List - Week {currentWeek + 1}</h2>
              <div className="shopping-stats">
                <span className="stat">{shoppingList.filter(i => i.checked).length}/{shoppingList.length} items</span>
              </div>
            </div>
            <div className="shopping-list">
              {shoppingList.length > 0 ? (
                <div className="shopping-items-grid">
                  {shoppingList.map((item, idx) => (
                    <div key={idx} className={`shopping-item-card ${item.checked ? 'checked' : ''}`}>
                      <div className="item-checkbox">
                        <input
                          type="checkbox"
                          id={`item-${idx}`}
                          checked={item.checked}
                          onChange={() => {
                            const updated = [...shoppingList];
                            updated[idx].checked = !updated[idx].checked;
                            setShoppingList(updated);
                          }}
                        />
                        <label htmlFor={`item-${idx}`}></label>
                      </div>
                      <div className="item-details">
                        <div className="item-name">{item.name}</div>
                        <div className="item-quantity">
                          <span className="quantity-value">{parseFloat(item.quantity)}</span>
                          <span className="quantity-unit">{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>📋 No items in shopping list</p>
                  <small>Select a week to view ingredients</small>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <section className="dashboard-section">
            <h2>📊 Progress Dashboard</h2>
            <div className="dashboard-grid">
              <div className="dashboard-card weight-card">
                <h3>📈 Weight Progress</h3>
                <div className="weight-input-section">
                  <div className="input-group">
                    <input
                      type="number"
                      value={weightInput}
                      onChange={e => setWeightInput(e.target.value)}
                      placeholder="Enter weight (kg)"
                      step="0.1"
                      min="0"
                      max="300"
                    />
                    <button onClick={saveWeight} className="btn-primary-small">Log Weight</button>
                  </div>
                </div>

                <div className="progress-details">
                  {weightHistory[selectedPerson] && weightHistory[selectedPerson].length > 0 ? (
                    <>
                      <p>Latest: <strong>{formatWeight(weightHistory[selectedPerson][weightHistory[selectedPerson].length - 1].weight)}</strong></p>
                      <p>Started: <strong>{formatWeight(weightHistory[selectedPerson][0].weight)}</strong></p>
                      <p>Lost: <strong>{(weightHistory[selectedPerson][0].weight - weightHistory[selectedPerson][weightHistory[selectedPerson].length - 1].weight).toFixed(1)} kg</strong></p>
                    </>
                  ) : (
                    <>
                      <p>Start: <strong>{formatWeight(person.currentWeight)}</strong></p>
                      <p>Latest: <strong>No data yet</strong></p>
                      <p>Lost: <strong>0 kg</strong></p>
                    </>
                  )}
                  <p>Target: <strong>{formatWeight(person.targetWeight)}</strong></p>

                  <div className="weight-bar">
                    {weightHistory[selectedPerson] && weightHistory[selectedPerson].length > 0 ? (
                      <div className="weight-progress" style={{
                        width: `${Math.min(((weightHistory[selectedPerson][0].weight - weightHistory[selectedPerson][weightHistory[selectedPerson].length - 1].weight) / (weightHistory[selectedPerson][0].weight - person.targetWeight)) * 100, 100)}%`
                      }}></div>
                    ) : (
                      <div className="weight-progress" style={{ width: '0%' }}></div>
                    )}
                  </div>
                </div>

                {weightHistory[selectedPerson] && weightHistory[selectedPerson].length > 0 && (
                  <div className="weight-history">
                    <p className="history-title">Recent Entries</p>
                    <div className="history-list">
                      {weightHistory[selectedPerson].slice(-5).reverse().map((entry, idx) => (
                        <div key={idx} className="history-item">
                          <span className="history-date">{entry.date}</span>
                          <span className="history-weight">{formatWeight(entry.weight)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="dashboard-card daily-calories-card">
                <h3>📊 Daily Calorie Tracker</h3>
                <div className="calorie-tracker-content">
                  <div className="calorie-summary">
                    <div className="summary-item">
                      <span className="summary-label">Planned This Week</span>
                      <span className="summary-value">{getWeeklyTotals().calories} cal</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Eaten So Far</span>
                      <span className="summary-value eaten">{getTotalEatenCaloriesForWeek()} cal</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Remaining</span>
                      <span className="summary-value remaining">{Math.max(0, getWeeklyTotals().calories - getTotalEatenCaloriesForWeek())} cal</span>
                    </div>
                  </div>

                  <div className="daily-inputs">
                    <p className="input-title">Log Calories by Day</p>
                    <div className="days-grid">
                      {currentWeekData.days.map((day, idx) => (
                        <div key={idx} className="day-input-group">
                          <label>{day.day.slice(0, 3)}</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={getEatenCaloriesForDay(idx)}
                            onChange={(e) => {
                              const updated = { ...eatenCalories };
                              const key = `${selectedPerson}-w${currentWeek}-d${idx}`;
                              if (e.target.value) {
                                updated[key] = parseFloat(e.target.value);
                              } else {
                                delete updated[key];
                              }
                              setEatenCalories(updated);
                              localStorage.setItem('eaten_calories', JSON.stringify(updated));
                            }}
                            min="0"
                            max="5000"
                          />
                        </div>
                      ))}
                    </div>
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
