/**
 * Play Mode JavaScript
 * Handles instrument selection, level selection, and navigation to game
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';
let selectedInstrument = null;

// Load instruments
async function loadInstruments() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/lessons/instruments`);
    const result = await response.json();

    if (result.success) {
      displayInstruments(result.data);
    }
  } catch (error) {
    console.error('Error loading instruments:', error);
  }
}

function displayInstruments(instruments) {
  const grid = document.getElementById('instrumentsGrid');
  grid.innerHTML = instruments.map(instrument => `
    <div class="instrument-card" onclick="selectInstrument('${instrument.name}', ${instrument.id})">
      <div class="instrument-icon">${instrument.icon || '🎵'}</div>
      <div class="instrument-name">${instrument.name}</div>
    </div>
  `).join('');
}

function selectInstrument(instrumentName, instrumentId) {
  selectedInstrument = { name: instrumentName, id: instrumentId };
  
  // Hide instrument selection, show level selection
  document.getElementById('instrumentSection').style.display = 'none';
  document.getElementById('levelSection').style.display = 'block';
  document.getElementById('selectedInstrumentTitle').textContent = `Select Level - ${instrumentName}`;

  // Show levels (1-5)
  const levelsGrid = document.getElementById('levelsGrid');
  levelsGrid.innerHTML = '';
  
  for (let level = 1; level <= 5; level++) {
    const levelCard = document.createElement('div');
    levelCard.className = 'level-card';
    levelCard.textContent = `Level ${level}`;
    levelCard.onclick = () => startQuiz(instrumentName, level);
    levelsGrid.appendChild(levelCard);
  }
}

function startQuiz(instrumentName, level) {
  // Navigate to quiz game page
  window.location.href = `/frontend/views/user/quiz-game.html?instrument=${encodeURIComponent(instrumentName)}&level=${level}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadInstruments();
});

