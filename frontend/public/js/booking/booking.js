document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('submitBooking');
  const bookingForm = document.getElementById('bookingForm');

  // If there is a pending booking in sessionStorage, prefill the form
  try {
    const pending = sessionStorage.getItem('pendingBooking');
    if (pending) {
      const obj = JSON.parse(pending);
      if (obj.name) document.getElementById('name').value = obj.name;
      if (obj.date) document.getElementById('date').value = obj.date;
      if (obj.hours) document.getElementById('hours').value = obj.hours;
      // clear pending only after prefill (we'll keep it until successful POST)
    }
  } catch (err) {
    // ignore parse errors
  }

  if (!submitBtn) return;

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const hours = document.getElementById('hours').value;

    const data = { name, date, hours };

    // Check login state
    const user = localStorage.getItem('user');

    // If user is not logged in, save pending booking and redirect to login page
    if (!user) {
      try {
        sessionStorage.setItem('pendingBooking', JSON.stringify(data));
      } catch (err) {
        console.warn('Could not save pending booking:', err);
      }

      // Redirect to login page (absolute URL to backend server)
      window.location.href = 'http://localhost:3000/login/login.html';
      return;
    }

    // If we are on the landing page and user is logged in, redirect to booking page to confirm details
    const path = window.location.pathname.toLowerCase();
    if (!path.endsWith('/booking.html') && !path.endsWith('/booking')) {
      try {
        sessionStorage.setItem('pendingBooking', JSON.stringify(data));
      } catch (err) {
        console.warn('Could not save pending booking:', err);
      }
      window.location.href = 'http://localhost:3000/Landing/booking.html';
      return;
    }

    // Otherwise we are on booking.html and should submit to backend
    try {
      const res = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const msg = await res.json();
      const msgEl = document.getElementById('bookingMsg');
      if (msgEl) msgEl.textContent = msg.message || (res.ok ? 'Booking requested' : 'Error');

      if (res.ok) {
        // Clear pending booking and reset form
        try { sessionStorage.removeItem('pendingBooking'); } catch (err) {}
        bookingForm?.reset();
      }
    } catch (error) {
      const msgEl = document.getElementById('bookingMsg');
      if (msgEl) msgEl.textContent = 'Network error. Please try again.';
    }
  });
});