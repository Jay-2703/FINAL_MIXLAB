// ================= LESSON STATE =================
const lessonState = {
  instrument: null,
  module: null
};

// ================= LOAD LESSON =================
async function loadLesson() {
  try {
    const response = await fetch(`/api/lesson/${lessonState.instrument}/${lessonState.module}`);
    const lesson = await response.json();

    document.getElementById('lesson-title').textContent =
      `${capitalizeFirst(lessonState.instrument)} - Module ${lessonState.module}`;

    document.getElementById('lesson-heading').textContent = lesson.title;
    document.getElementById('lesson-text').textContent = lesson.content;

    const nextBtn = document.getElementById('next-lesson-btn');
    nextBtn.onclick = async () => {
      if (!state.isGuest) {
        await fetch('/api/lesson/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instrument: lessonState.instrument,
            module: lessonState.module
          })
        });
      }

      if (lessonState.module < 4) {
        lessonState.module++;
        loadLesson();
      } else {
        alert("You completed all modules!");
        showScreen('home');
      }
    };

    showScreen('lesson');
  } catch (err) {
    console.error(err);
    alert("Failed to load lesson.");
  }
}
