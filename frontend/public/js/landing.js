// =====================================================================
// MIXLAB MUSIC STUDIO - LANDING PAGE SCRIPT
// =====================================================================

document.addEventListener('DOMContentLoaded', () => {

  // ===================================================================
  // 1. AUTHENTICATION & USER ACCOUNT
  // ===================================================================
  
  const accountLink = document.getElementById('account-link');
  const mobileAccountBtn = document.getElementById('mobile-account-btn');

  // Helper: Get display name from user object
  function getDisplayName(user) {
    if (!user) return null;
    // Prefer human-friendly `name` (first + last), then username, then email
    return user.name || user.username || user.fullname || user.email || null;
  }

  // Helper: Add user avatar (plain color, no gradient, no border)
  function addUserAvatar(element, displayName) {
    const initial = displayName.charAt(0).toUpperCase();
    const avatarHtml = `<span class="user-avatar">${initial}</span>`;
    element.innerHTML = avatarHtml + displayName;
  }

  function initAuth() {
    try {
      const userJson = localStorage.getItem('user');

      if (userJson) {
        // --- USER IS LOGGED IN ---
        const user = JSON.parse(userJson);
        const displayName = getDisplayName(user);

        // Show notification bell
        const notifWrapper = document.getElementById("notif-wrapper");
        if (notifWrapper) notifWrapper.style.display = "inline-block";

        if (displayName) {
          // Desktop account link - goes to profile
          if (accountLink) {
            accountLink.setAttribute('href', '/frontend/views/user/profile.html');
            accountLink.setAttribute('title', 'View your profile');
            addUserAvatar(accountLink, displayName);
          }

          // Mobile account button - goes to profile
          if (mobileAccountBtn) {
            mobileAccountBtn.textContent = displayName;
            mobileAccountBtn.setAttribute('href', '/frontend/views/user/profile.html');
          }
        }

      } else {
        // --- USER IS NOT LOGGED IN ---
        if (accountLink) {
          accountLink.textContent = 'Log in';
          accountLink.setAttribute('href', '/frontend/views/auth/login.html');
        }
        
        if (mobileAccountBtn) {
          mobileAccountBtn.textContent = 'Log in';
          mobileAccountBtn.setAttribute('href', '/frontend/views/auth/login.html');
        }

        // Hide notification bell
        const notifWrapper = document.getElementById("notif-wrapper");
        if (notifWrapper) notifWrapper.style.display = "none";
      }

    } catch (err) {
      console.error('Error initializing auth:', err);
    }
  }

  // Initialize authentication
  initAuth();

  // ===================================================================
  // 2. SIDEBAR / MOBILE MENU
  // ===================================================================
  
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebar-close');
  const toggleServices = document.getElementById('toggle-services');
  const submenuServices = document.getElementById('submenu-services');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
    });
  }

  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }

  // Services submenu toggle
  if (toggleServices && submenuServices) {
    toggleServices.addEventListener('click', () => {
      if (submenuServices.style.display === 'block') {
        submenuServices.style.display = 'none';
        toggleServices.textContent = '+';
      } else {
        submenuServices.style.display = 'block';
        toggleServices.textContent = '−';
      }
    });
  }

  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active')) {
      if (!e.target.closest('#sidebar') && !e.target.closest('#menu-toggle')) {
        sidebar.classList.remove('active');
      }
    }
  });

  // ===================================================================
// 3. BOOKING FORM (FIXED)
// ===================================================================

const bookingForm = document.getElementById('booking-form');
const submitBooking = document.getElementById('submit-booking');
const bookingName = document.getElementById('booking-name');
const bookingDate = document.getElementById('booking-date');
const bookingHours = document.getElementById('booking-hours');
const bookingMsg = document.getElementById('booking-msg');

// Set minimum date to today
if (bookingDate) {
  const today = new Date().toISOString().split('T')[0];
  bookingDate.setAttribute('min', today);
}

// Prefill pending booking from sessionStorage
try {
  const pendingBooking = sessionStorage.getItem('pendingBooking');
  if (pendingBooking) {
    const data = JSON.parse(pendingBooking);
    if (bookingName && data.name) bookingName.value = data.name;
    if (bookingDate && data.date) bookingDate.value = data.date;
    if (bookingHours && data.hours) bookingHours.value = data.hours;
  }
} catch (err) {
  console.warn('Error reading pending booking:', err);
}

// Handle booking submission
if (submitBooking) {
  submitBooking.addEventListener('click', async (e) => {
    e.preventDefault();

    // Validation
    if (!bookingName?.value || !bookingDate?.value || !bookingHours?.value) {
      if (bookingMsg) {
        bookingMsg.textContent = 'Please fill in all fields';
        bookingMsg.style.color = 'red';
      }
      return;
    }

    const bookingData = {
      name: bookingName.value.trim(),
      date: bookingDate.value,
      hours: bookingHours.value
    };

    // Validate date (must be today or in the future)
    const selectedDate = new Date(bookingData.date);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < todayDate) {
      if (bookingMsg) {
        bookingMsg.textContent = 'Please select today or a future date';
        bookingMsg.style.color = 'red';
      }
      return;
    }

    // Save to sessionStorage and redirect to main booking page
    try {
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      // FIXED: Use the correct path that matches your server structure
      window.location.href = '/frontend/views/user/booking.html';
    } catch (error) {
      console.error('Error saving booking data:', error);
      if (bookingMsg) {
        bookingMsg.textContent = 'Error saving booking data. Please try again.';
        bookingMsg.style.color = 'red';
      }
    }
  });
}

  // ===================================================================
  // 4. CONTACT FORM
  // ===================================================================
  
  const contactForm = document.getElementById('contact-form');
  const sendMsg = document.getElementById('send-msg');
  const contactMsg = document.getElementById('contact-msg');

  if (sendMsg) {
    sendMsg.addEventListener('click', async (e) => {
      e.preventDefault();

      const contactData = {
        name: document.getElementById('contact-name')?.value || '',
        email: document.getElementById('contact-email')?.value || '',
        message: document.getElementById('contact-message')?.value || ''
      };

      try {
        const response = await fetch('http://localhost:3000/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData)
        });

        const result = await response.json();
        
        if (contactMsg) {
          contactMsg.textContent = result.message || (response.ok ? 'Message sent successfully!' : 'Error sending message');
          contactMsg.style.color = response.ok ? 'green' : 'red';
        }

        if (response.ok) {
          contactForm?.reset();
        }
      } catch (error) {
        console.error('Contact form error:', error);
        if (contactMsg) {
          contactMsg.textContent = 'Network error. Please try again.';
          contactMsg.style.color = 'red';
        }
      }
    });
  }

  // ===================================================================
  // 5. TESTIMONIALS CAROUSEL
  // ===================================================================
  
  const testimonials = [
    {
      name: "Prince Barnal",
      content: "MixLab Music Studios is an exceptional destination for musicians of all levels. With state-of-the-art equipment, a talented staff, comprehensive services, and a vibrant community, it's the perfect place to elevate your music and bring your artistic vision to life.",
      rating: 5
    },
    {
      name: "Michael Chen",
      content: "Outstanding service and attention to detail. They understood our vision perfectly and delivered beyond our expectations.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      content: "We saw a 300% increase in engagement within the first month. The ROI has been incredible and continues to exceed our goals.",
      rating: 5
    },
    {
      name: "David Thompson",
      content: "Professional, reliable, and innovative. Working with this team has been one of the best decisions we've made this year.",
      rating: 5
    }
  ];

  let currentTestimonial = 0;
  let isAnimating = false;

  const testimonialContent = document.getElementById('testimonial-content');
  const testimonialName = document.getElementById('testimonial-name');
  const starsContainer = document.getElementById('stars');
  const dotsContainer = document.getElementById('dots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  function renderTestimonial(index) {
    if (!testimonialContent) return;

    const testimonial = testimonials[index];
    
    testimonialContent.style.opacity = '0';
    
    setTimeout(() => {
      testimonialContent.textContent = `"${testimonial.content}"`;
      if (testimonialName) testimonialName.textContent = testimonial.name;
      
      if (starsContainer) {
        starsContainer.innerHTML = '★'.repeat(testimonial.rating)
          .split('')
          .map(star => `<span class="star">${star}</span>`)
          .join('');
      }
      
      // Update dots
      document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
      
      testimonialContent.style.opacity = '1';
    }, 200);
  }

  function nextTestimonial() {
    if (isAnimating) return;
    isAnimating = true;
    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    renderTestimonial(currentTestimonial);
    setTimeout(() => { isAnimating = false; }, 500);
  }

  function prevTestimonial() {
    if (isAnimating) return;
    isAnimating = true;
    currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
    renderTestimonial(currentTestimonial);
    setTimeout(() => { isAnimating = false; }, 500);
  }

  // Create dots
  if (dotsContainer) {
    testimonials.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.addEventListener('click', () => {
        if (!isAnimating) {
          currentTestimonial = index;
          renderTestimonial(currentTestimonial);
        }
      });
      dotsContainer.appendChild(dot);
    });
  }

  // Navigation buttons
  if (prevBtn) prevBtn.addEventListener('click', prevTestimonial);
  if (nextBtn) nextBtn.addEventListener('click', nextTestimonial);

  // Auto-rotate testimonials
  setInterval(nextTestimonial, 6000);

  // Initial render
  renderTestimonial(currentTestimonial);

  // ===================================================================
  // 6. IMAGE SLIDER (About Section)
  // ===================================================================
  
  const slider = document.getElementById('slider');
  if (slider) {
    const slides = slider.querySelector('.slides');
    if (slides) {
      let slideIndex = 0;
      const totalSlides = slides.children.length;

      function rotateSlider() {
        slideIndex = (slideIndex + 1) % totalSlides;
        slides.style.transform = `translateX(-${slideIndex * 100}%)`;
      }

      // Auto-rotate every 4 seconds
      setInterval(rotateSlider, 4000);
    }
  }

  // ===================================================================
  // 7. FOOTER - DYNAMIC YEAR
  // ===================================================================
  
  const yearElement = document.getElementById('year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // ===================================================================
  // 8. SMOOTH SCROLLING FOR ANCHOR LINKS
  // ===================================================================
  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#' || !href) return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Close sidebar if open
        if (sidebar) {
          sidebar.classList.remove('active');
        }
      }
    });
  });

});