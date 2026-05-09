import React, { useState } from 'react';
import mealData from './mealData.json';
import './App.css';

function App() {
  const [selectedPerson, setSelectedPerson] = useState('george');
  const [currentWeek, setCurrentWeek] = useState(0);
  const [apiKey, setApiKey] = useState(localStorage.getItem('grok_api_key') || '');
  const [showApiInput, setShowApiInput] = useState(!apiKey);
  const [grokResponse, setGrokResponse] = useState('');
  
  const person = mealData[selectedPerson];
  const currentWeekData = person.weeks[currentWeek];

  const saveApiKey = () => {
    localStorage.setItem('grok_api_key', apiKey);
    setShowApiInput(false);
  };

  const changeMeal = async (dayIndex, mealType) => {
    if (!apiKey) { alert('Enter API key'); return; }
    const day = currentWeekData.days[dayIndex];
    const meal = day.meals.find(m => m.meal === mealType);
    try {
      const res = await fetch('https://api.x.ai/openai/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey},
        body: JSON.stringify({
          model: 'grok-2',
          messages: [{role: 'user', content: 'Current meal: ' + meal.name + ' (' + meal.calories + 'cal). Suggest 3 similar alternatives with cooking tips. Restrictions: ' + (person.restrictions.length > 0 ? person.restrictions.join(', ') : 'None')}],
          max_tokens: 800
        })
      });
      const data = await res.json();
      setGrokResponse(data.choices[0].message.content);
    } catch (e) { alert('Error: ' + e.message); }
  };

  const getTotals = (meals) => meals.reduce((a, m) => ({calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat}), {calories: 0, protein: 0, carbs: 0, fat: 0});
  const totals = getTotals(currentWeekData.days[0].meals);

  return (
    <div className="app">
      <header><h1>Meal Planner</h1><p>6-Week AI Nutrition with Grok</p></header>
      {showApiInput && <div className="modal"><div><h2>Grok API Key</h2><input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="xai-..."/><button onClick={saveApiKey}>Save</button></div></div>}
      <div className="container">
        <div className="people"><button onClick={() => {setSelectedPerson('george'); setCurrentWeek(0);}} className={selectedPerson === 'george' ? 'active' : ''}>George</button><button onClick={() => {setSelectedPerson('jude'); setCurrentWeek(0);}} className={selectedPerson === 'jude' ? 'active' : ''}>Jude</button></div>
        <div className="stats"><div>{person.dailyCalories} cal</div><div>{person.currentWeight}kg to {person.targetWeight}kg</div><div>Week {currentWeek + 1}/6</div></div>
        <div className="totals"><div>{totals.calories}cal</div><div>{totals.protein}gP</div><div>{totals.carbs}gC</div><div>{totals.fat}gF</div></div>
        <div className="week">{currentWeekData.days.map((day, di) => <div key={di} className="day"><h3>{day.day}</h3>{day.meals.map((meal, mi) => <div key={mi} className="meal"><h4>{meal.name}</h4><div className="nums"><span>{meal.calories}</span><span>{meal.protein}g</span><span>{meal.carbs}g</span><span>{meal.fat}g</span></div><button onClick={() => changeMeal(di, meal.meal)}>Change</button></div>)}</div>)}</div>
        {grokResponse && <div className="resp"><h3>AI Suggestions</h3><p>{grokResponse}</p></div>}
        <div className="nav"><button onClick={() => currentWeek > 0 && setCurrentWeek(currentWeek - 1)} disabled={currentWeek === 0}>Previous</button><button onClick={() => currentWeek < 5 && setCurrentWeek(currentWeek + 1)} disabled={currentWeek === 5}>Next</button></div>
      </div>
    </div>
  );
}

export default App;
