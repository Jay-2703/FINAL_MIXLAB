// ================= GAME STATE =================
const gameState = {
  instrument: null,
  level: null,
  gameScore: 0,
  gameTime: 0,
  currentQuestion: 0,
  correctAnswers: 0,
  gameQuestions: [],
  timerInterval: null
};

// ================= GAME QUESTIONS =================
const gameQuestions = {
  guitar: { /* same content */ },
  piano: { /* same content */ },
  theory: { /* same content */ }
};

// ================= GAME FUNCTIONS =================
function showGameInstructions() {
  const modal = document.getElementById('instruction-modal');
  const text = document.getElementById('instruction-text');

  text.innerHTML = `
    <p><strong>Welcome to ${gameState.instrument} Level ${gameState.level}</strong></p>
    <p>You will answer 5 questions. Each correct answer = 20 points.</p>
  `;

  modal.classList.add('active');
}

function startGame() {
  document.getElementById('instruction-modal').classList.remove('active');

  gameState.gameScore = 0;
  gameState.gameTime = 0;
  gameState.currentQuestion = 0;
  gameState.correctAnswers = 0;

  gameState.gameQuestions =
    gameQuestions[gameState.instrument][gameState.level];

  gameState.timerInterval = setInterval(() => {
    gameState.gameTime++;
    document.getElementById('game-time').textContent = gameState.gameTime;
  }, 1000);

  showScreen('game');
  renderQuestion();
}

function renderQuestion() {
  const question = gameState.gameQuestions[gameState.currentQuestion];
  if (!question) return endGame();

  const container = document.getElementById('game-container');
  container.innerHTML = `
    <h3>Question ${gameState.currentQuestion + 1}</h3>
    <p>${question.question}</p>
    <div id="options"></div>
  `;

  const options = document.getElementById('options');
  question.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(index);
    options.appendChild(btn);
  });

  document.getElementById('game-score').textContent = gameState.gameScore;
}

function handleAnswer(selected) {
  const q = gameState.gameQuestions[gameState.currentQuestion];
  const buttons = document.querySelectorAll('.option-btn');

  buttons.forEach(b => b.disabled = true);

  if (selected === q.correct) {
    buttons[selected].classList.add('correct');
    gameState.correctAnswers++;
    gameState.gameScore += 20;
  } else {
    buttons[selected].classList.add('incorrect');
    buttons[q.correct].classList.add('correct');
  }

  setTimeout(() => {
    gameState.currentQuestion++;
    renderQuestion();
  }, 1500);
}

function endGame() {
  clearInterval(gameState.timerInterval);

  const accuracy =
    Math.round((gameState.correctAnswers / gameState.gameQuestions.length) * 100);

  document.getElementById('result-points').textContent = gameState.gameScore;
  document.getElementById('result-accuracy').textContent = accuracy + "%";

  showScreen('result');
}
