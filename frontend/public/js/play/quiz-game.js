/**
 * Quiz Game JavaScript
 * Handles quiz gameplay, timer, scoring, and submission
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let points = 0;
let streak = 0;
let maxStreak = 0;
let timeRemaining = 300; // 5 minutes default
let timerInterval = null;
let startTime = null;

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const instrument = urlParams.get('instrument');
const level = urlParams.get('level');

// Load quiz
async function loadQuiz() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/quiz/quizzes/${instrument}/${level}`);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
      // Use first quiz (or implement quiz selection)
      currentQuiz = result.data[0];
      timeRemaining = currentQuiz.time_limit || 300;
      startTime = Date.now();
      displayQuestion();
    } else {
      alert('No quiz available for this level. Please try another level.');
      window.location.href = '/frontend/views/user/play.html';
    }
  } catch (error) {
    console.error('Error loading quiz:', error);
    alert('Error loading quiz. Please try again.');
  }
}

function startQuiz() {
  document.getElementById('instructionModal').style.display = 'none';
  document.getElementById('quizContainer').style.display = 'block';
  startTimer();
  loadQuiz();
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();

    if (timeRemaining <= 0) {
      endQuiz();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  document.getElementById('timer').textContent = 
    `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  if (timeRemaining <= 30) {
    document.getElementById('timer').style.color = '#dc3545';
  }
}

function displayQuestion() {
  if (!currentQuiz || !currentQuiz.questions) return;

  const question = currentQuiz.questions[currentQuestionIndex];
  if (!question) {
    endQuiz();
    return;
  }

  // Update question number
  document.getElementById('questionNumber').textContent = 
    `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;

  // Update progress bar
  const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
  document.getElementById('progressBar').style.width = `${progress}%`;

  // Display question
  document.getElementById('questionText').textContent = question.question;

  // Display options
  const optionsList = document.getElementById('optionsList');
  optionsList.innerHTML = '';
  
  question.options.forEach((option, index) => {
    const optionButton = document.createElement('button');
    optionButton.className = 'option-button';
    optionButton.textContent = option;
    optionButton.onclick = () => selectOption(index);
    optionsList.appendChild(optionButton);
  });

  // Reset next button
  const nextButton = document.getElementById('nextButton');
  nextButton.disabled = true;
  nextButton.textContent = 'Next Question';
}

function selectOption(optionIndex) {
  // Remove previous selection
  document.querySelectorAll('.option-button').forEach(btn => {
    btn.classList.remove('selected');
  });

  // Mark selected
  const buttons = document.querySelectorAll('.option-button');
  buttons[optionIndex].classList.add('selected');

  // Enable next button
  document.getElementById('nextButton').disabled = false;
}

function nextQuestion() {
  // Get selected answer
  const selectedButton = document.querySelector('.option-button.selected');
  if (!selectedButton) return;

  const selectedIndex = Array.from(document.querySelectorAll('.option-button')).indexOf(selectedButton);
  const question = currentQuiz.questions[currentQuestionIndex];
  
  // Store answer
  userAnswers[currentQuestionIndex] = selectedIndex;

  // Check if correct
  const isCorrect = selectedIndex === question.correctAnswer;
  
  if (isCorrect) {
    // Award points
    const questionPoints = currentQuiz.points_per_question || 10;
    points += questionPoints;
    
    // Update streak
    streak++;
    if (streak > maxStreak) {
      maxStreak = streak;
    }
    
    // Visual feedback
    selectedButton.classList.add('correct');
  } else {
    // Reset streak
    streak = 0;
    selectedButton.classList.add('incorrect');
    
    // Show correct answer
    const buttons = document.querySelectorAll('.option-button');
    buttons[question.correctAnswer].classList.add('correct');
  }

  // Update displays
  document.getElementById('points').textContent = points;
  document.getElementById('streak').textContent = streak;

  // Disable all buttons
  document.querySelectorAll('.option-button').forEach(btn => {
    btn.disabled = true;
  });

  // Move to next question after delay
  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuiz.questions.length) {
      displayQuestion();
    } else {
      endQuiz();
    }
  }, 1500);
}

async function endQuiz() {
  clearInterval(timerInterval);

  // Calculate time taken
  const timeTaken = Math.floor((Date.now() - startTime) / 1000);

  // Submit quiz results
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login to save your results');
    window.location.href = '/frontend/views/auth/login.html';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/quiz/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        quizId: currentQuiz.id,
        answers: userAnswers,
        timeTaken: timeTaken,
        maxStreak: maxStreak
      })
    });

    const result = await response.json();

    if (result.success) {
      // Store results and navigate to results page
      sessionStorage.setItem('quizResults', JSON.stringify({
        ...result.data,
        totalQuestions: currentQuiz.questions.length,
        quizTitle: currentQuiz.title
      }));
      window.location.href = '/frontend/views/user/quiz-results.html';
    } else {
      alert(result.message || 'Error submitting quiz');
    }
  } catch (error) {
    console.error('Error submitting quiz:', error);
    alert('Network error. Results may not be saved.');
    // Still show results
    sessionStorage.setItem('quizResults', JSON.stringify({
      score: Math.round((userAnswers.filter((a, i) => a === currentQuiz.questions[i].correctAnswer).length / currentQuiz.questions.length) * 100),
      correctAnswers: userAnswers.filter((a, i) => a === currentQuiz.questions[i].correctAnswer).length,
      totalQuestions: currentQuiz.questions.length,
      pointsEarned: points,
      maxStreak: maxStreak,
      quizTitle: currentQuiz.title
    }));
    window.location.href = '/frontend/views/user/quiz-results.html';
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (!instrument || !level) {
    window.location.href = '/frontend/views/user/play.html';
  }
});

