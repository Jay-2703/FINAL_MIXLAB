// frontend/public/js/booking/booking.js

// --- CONFIG ---
const SERVICE_PRICES = {
  vocal: 1500,
  band: 2800,
  podcast: 1200,
  mixing: 1800
};

const SERVICE_LABELS = {
  vocal: "Vocal Recording",
  band: "Band Recording",
  podcast: "Podcast",
  mixing: "Mixing & Mastering"
};

// --- STATE ---
let booking = {};
let bookingRef = "";
const STEPS = { FORM: "form", REVIEW: "review", SUCCESS: "success" };
let currentStep = STEPS.FORM;

// --- UTILITIES ---
function peso(val) {
  return "₱" + (typeof val === "number" ? val : parseFloat(val || 0))
    .toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

function generateRef() {
  return "SS-" + new Date().toISOString().slice(2, 10).replace(/-/g, "")
    + "-" + Math.random().toString(36).slice(-6).toUpperCase();
}

function getBookingDetailsObj(b) {
  return {
    "Full Name": b.name,
    "Email": b.email,
    "Mobile": b.contact,
    "Birthday": b.birthday,
    "Address": b.address,
    "Service": SERVICE_LABELS[b.service],
    "Booking Date": b.date,
    "Start Time": b.time,
    "Hours": b.hours,
    "No. of People": b.people,
    "Payment Method": b.payment,
    "Total": peso(b.price || 0)
  };
}

function renderDetailRows(container, obj) {
  if (!container) return;
  container.innerHTML = "";
  for (const [label, value] of Object.entries(obj)) {
    const row = document.createElement("div");
    row.className = "detail-row";
    row.innerHTML = `<span class="detail-label">${label}</span><span class="detail-value">${value}</span>`;
    container.appendChild(row);
  }
}

function genBookingQRUrl(ref) {
  return `Booking Reference: ${ref}`;
}

function showQRCode(el, ref) {
  if (!el) return;
  el.innerHTML = "";
  if (typeof QRCode !== "undefined") {
    new QRCode(el, {
      text: genBookingQRUrl(ref),
      width: 170,
      height: 170,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    el.textContent = genBookingQRUrl(ref);
  }
}

// --- AUTO-FILL FROM USER DATA ---
function getAutoFillData() {
  const autoFillData = {};
  
  // 1. Get user data from localStorage (from registration/login)
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      
      // Auto-fill name
      if (user.first_name) {
        autoFillData.name = user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : user.first_name;
      } else if (user.name) {
        autoFillData.name = user.name;
      } else if (user.fullname) {
        autoFillData.name = user.fullname;
      }
      
      // Auto-fill email
      if (user.email) {
        autoFillData.email = user.email;
      }
      
      // Auto-fill contact (remove +63 prefix if present)
      if (user.contact) {
        let contact = user.contact.toString();
        if (contact.startsWith('+63')) {
          contact = '0' + contact.slice(3);
        } else if (contact.startsWith('63')) {
          contact = '0' + contact.slice(2);
        }
        autoFillData.contact = contact;
      }
      
      // Auto-fill birthday
      if (user.birthday) {
        autoFillData.birthday = user.birthday;
      }
      
      // Auto-fill address
      if (user.home_address) {
        autoFillData.address = user.home_address;
      } else if (user.address) {
        autoFillData.address = user.address;
      }
    }
  } catch (err) {
    console.warn('Error loading user data for auto-fill:', err);
  }
  
  // 2. Get pending booking from landing page (from sessionStorage)
  try {
    const pendingBookingJson = sessionStorage.getItem('pendingBooking');
    if (pendingBookingJson) {
      const pendingBooking = JSON.parse(pendingBookingJson);
      
      // Override with pending booking data if available
      if (pendingBooking.name) {
        autoFillData.name = pendingBooking.name;
      }
      
      if (pendingBooking.date) {
        autoFillData.date = pendingBooking.date;
      }
      
      if (pendingBooking.hours) {
        autoFillData.hours = pendingBooking.hours;
      }
      
      // Clear pending booking after using it
      sessionStorage.removeItem('pendingBooking');
    }
  } catch (err) {
    console.warn('Error loading pending booking:', err);
  }
  
  return autoFillData;
}

// --- MAPPING ---
const SERVICE_TO_BACKEND = {
  vocal: "recording",
  band: "recording",
  podcast: "voiceover",
  mixing: "arrangement"
};

const PAYMENT_MAP = {
  "gcash": "gcash",
  "credit/debit card": "credit_card",
  "cash": "cash",
  "GCash": "gcash",
  "Credit/Debit Card": "credit_card",
  "Cash": "cash"
};

// --- FORM VALIDATION ---
function validateForm(form) {
  let isValid = true;
  const data = {};
  document.querySelectorAll(".error").forEach(el => el.textContent = "");

  // Name
  const name = form.name.value.trim();
  if (!name) { 
    document.getElementById("err-name").textContent = "Name is required"; 
    isValid = false; 
  } else if (name.length < 2) { 
    document.getElementById("err-name").textContent = "Name must be at least 2 characters"; 
    isValid = false; 
  } else { 
    data.name = name; 
  }

  // Email
  const email = form.email.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) { 
    document.getElementById("err-email").textContent = "Email is required"; 
    isValid = false; 
  } else if (!emailRegex.test(email)) { 
    document.getElementById("err-email").textContent = "Please enter a valid email"; 
    isValid = false; 
  } else { 
    data.email = email; 
  }

  // Contact
  const contact = form.contact.value.trim();
  const contactRegex = /^09\d{9}$/;
  if (!contact) { 
    document.getElementById("err-contact").textContent = "Mobile number is required"; 
    isValid = false; 
  } else if (!contactRegex.test(contact)) { 
    document.getElementById("err-contact").textContent = "Please enter valid PH mobile (09XXXXXXXXX)"; 
    isValid = false; 
  } else { 
    data.contact = contact; 
  }

  // Birthday
  const birthday = form.birthday.value;
  if (!birthday) { 
    document.getElementById("err-birthday").textContent = "Birthday is required"; 
    isValid = false; 
  } else { 
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 13 || age > 120) { 
      document.getElementById("err-birthday").textContent = "You must be between 13 and 120 years old"; 
      isValid = false; 
    } else { 
      data.birthday = birthday; 
    }
  }

  // Address
  const address = form.address.value.trim();
  if (!address) { 
    document.getElementById("err-address").textContent = "Address is required"; 
    isValid = false; 
  } else if (address.length < 10) { 
    document.getElementById("err-address").textContent = "Please enter a complete address"; 
    isValid = false; 
  } else { 
    data.address = address; 
  }

  // Service
  const service = form.service.value;
  if (!service) { 
    document.getElementById("err-service").textContent = "Please select a service"; 
    isValid = false; 
  } else { 
    data.service = service; 
  }

  // Date
  const date = form.date.value;
  if (!date) { 
    document.getElementById("err-date").textContent = "Booking date is required"; 
    isValid = false; 
  } else {
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) { 
      document.getElementById("err-date").textContent = "Booking date cannot be in the past"; 
      isValid = false; 
    } else { 
      data.date = date; 
    }
  }

  // Time
  const time = form.time.value;
  if (!time) { 
    document.getElementById("err-time").textContent = "Start time is required"; 
    isValid = false; 
  } else { 
    data.time = time; 
  }

  // Hours
  const hours = parseInt(form.hours.value);
  if (!hours || hours < 1 || hours > 12) { 
    document.getElementById("err-hours").textContent = "Hours must be between 1 and 12"; 
    isValid = false; 
  } else { 
    data.hours = hours; 
  }

  // People
  const people = parseInt(form.people.value);
  if (!people || people < 1 || people > 20) { 
    document.getElementById("err-people").textContent = "Number of people must be between 1 and 20"; 
    isValid = false; 
  } else { 
    data.people = people; 
  }

  // Payment
  const payment = form.payment.value;
  if (!payment) { 
    document.getElementById("err-payment").textContent = "Please select a payment method"; 
    isValid = false; 
  } else { 
    data.payment = payment; 
  }

  return isValid ? data : null;
}

// --- STEP MANAGEMENT ---
function renderStep() {
  switch(currentStep) {
    case STEPS.FORM: 
      renderBookingForm(); 
      break;
    case STEPS.REVIEW: 
      renderBookingReview(); 
      break;
    case STEPS.SUCCESS: 
      renderBookingSuccess(); 
      break;
  }
}

// --- FORM RENDER (WITH AUTO-FILL) ---
function renderBookingForm() {
  const app = document.getElementById("app");
  if (!app) return;
  const template = document.getElementById("booking-form");
  if (!template) return;
  app.innerHTML = template.innerHTML;

  const form = document.getElementById("form-booking");
  if (!form) return;

  // Get auto-fill data
  const autoFillData = getAutoFillData();
  
  // Merge with existing booking data (existing booking data takes priority)
  const fillData = { ...autoFillData, ...booking };

  // Populate form fields
  Object.keys(fillData).forEach(k => {
    if (form[k] && fillData[k]) {
      form[k].value = fillData[k];
    }
  });

  form.onsubmit = function(e) {
    e.preventDefault();
    const validated = validateForm(form);
    if (validated) {
      validated.price = SERVICE_PRICES[validated.service] * validated.hours;
      booking = validated;
      currentStep = STEPS.REVIEW;
      renderStep();
    }
  };
}

// --- REVIEW STEP ---
function renderBookingReview() {
  const app = document.getElementById("app");
  if (!app) return;
  const template = document.getElementById("booking-review");
  if (!template) return;
  app.innerHTML = template.innerHTML;

  if (!bookingRef) bookingRef = generateRef();
  document.getElementById("review-ref").textContent = bookingRef;

  renderDetailRows(document.getElementById("review-details"), getBookingDetailsObj(booking));
  showQRCode(document.getElementById("review-qr"), bookingRef);

  // Edit
  document.getElementById("btn-edit").onclick = e => {
    e.preventDefault();
    currentStep = STEPS.FORM;
    renderStep();
  };

  // Confirm
  document.getElementById("btn-confirm").onclick = async e => {
    e.preventDefault();
    await processBooking();
  };
}

// --- PROCESS BOOKING ---
async function processBooking() {
  const btnConfirm = document.getElementById("btn-confirm");
  btnConfirm.disabled = true;
  const prevText = btnConfirm.textContent;
  btnConfirm.textContent = "Processing...";

  const mappedService = SERVICE_TO_BACKEND[booking.service] || booking.service;
  const normalizedPayment = PAYMENT_MAP[booking.payment] || booking.payment.toLowerCase();

  const payload = {
    name: booking.name,
    birthday: booking.birthday,
    email: booking.email,
    contact: booking.contact,
    homeAddress: booking.address,
    serviceType: mappedService,
    bookingDate: booking.date,
    bookingTime: booking.time,
    hours: booking.hours,
    members: booking.people,
    paymentMethod: normalizedPayment
  };

  try {
    // Get authentication token from localStorage
    const token = localStorage.getItem('token');
    
    // Prepare headers
    const headers = {
      "Content-Type": "application/json"
    };
    
    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Use user bookings endpoint
    const resp = await fetch("http://localhost:3000/api/bookings/create", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data?.success) {
      const errorMsg = data?.message || "Please try again.";
      alert("Booking failed: " + errorMsg);
      console.error("Booking error:", data);
      btnConfirm.disabled = false;
      btnConfirm.textContent = prevText;
      return;
    }

    // Extract booking reference from response
    bookingRef = data.data?.booking?.booking_id || bookingRef;

    // Store booking data in sessionStorage for success page
    sessionStorage.setItem('completedBooking', JSON.stringify({
      bookingRef: bookingRef,
      booking: booking,
      paymentUrl: data.data?.paymentUrl
    }));

    // For online payments (GCash/Credit Card)
    if (normalizedPayment !== "cash" && data.data?.paymentUrl) {
      // Show success message and redirect to payment
      alert(`Booking successful! Reference: ${bookingRef}\n\nYou will now be redirected to complete your payment.`);
      
      // Redirect to payment URL
      window.location.href = data.data.paymentUrl;
      return;
    }

    // For cash payments, show success page immediately
    currentStep = STEPS.SUCCESS;
    renderStep();

  } catch (err) {
    console.error("Booking error:", err);
    alert("Network/server error: " + (err.message || String(err)));
    btnConfirm.disabled = false;
    btnConfirm.textContent = prevText;
  }
}

// --- SUCCESS STEP ---
function renderBookingSuccess() {
  const app = document.getElementById("app");
  if (!app) {
    console.error('❌ App container not found');
    return;
  }

  const template = document.getElementById("booking-success");
  if (!template) {
    console.error('❌ booking-success template not found');
    return;
  }

  // Clone the template content
  app.innerHTML = template.innerHTML;

  // Verify booking object has data
  if (!booking || !booking.name) {
    console.error('❌ Booking data is missing:', booking);
    app.innerHTML = '<p style="color: var(--error);">Error: Booking data not found</p>';
    return;
  }

  // Populate success details
  const successDetails = document.getElementById("success-details");
  if (successDetails) {
    renderDetailRows(successDetails, getBookingDetailsObj(booking));
  }

  // Set booking reference
  const bookingRefEl = document.getElementById("booking-ref");
  if (bookingRefEl) {
    bookingRefEl.textContent = bookingRef || 'N/A';
  }

  // Set total amount
  const totalAmountEl = document.getElementById("total-amount");
  if (totalAmountEl) {
    totalAmountEl.textContent = peso(booking.price || 0);
  }

  // Generate QR code
  const successQr = document.getElementById("success-qr");
  if (successQr) {
    showQRCode(successQr, bookingRef);
  }

  // Handle receipt download button
  const btnReceipt = document.getElementById("btn-receipt");
  if (btnReceipt) {
    btnReceipt.type = "button";
    btnReceipt.onclick = function() {
      const txt = `
STUDIO SESSION RECEIPT
Reference: ${bookingRef}
Name: ${booking.name}
Service: ${SERVICE_LABELS[booking.service] || booking.service}
Date: ${booking.date} ${booking.time}
Hours: ${booking.hours}
No. of People: ${booking.people}
Total: ${peso(booking.price)}
Payment: ${booking.payment}

Thank you for booking! Please keep this receipt.
      `;
      const blob = new Blob([txt], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "studio-session-receipt-" + bookingRef + ".txt";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
      }, 350);
    };
  }

  console.log('✅ Success page rendered');
}

// --- CHECK FOR PAYMENT RETURN FROM XENDIT ---
function checkPaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const bookingId = urlParams.get('booking_id');

  if (paymentStatus && bookingId) {
    // Clear URL parameters to clean history
    window.history.replaceState({}, document.title, window.location.pathname);

    if (paymentStatus === 'success') {
      // Payment successful - fetch booking details and show success page
      fetchBookingAndShowSuccess(bookingId);
    } else if (paymentStatus === 'failed') {
      // Payment failed - show error and redirect to form
      alert(`Payment failed for booking ${bookingId}.\n\nYou can try booking again or contact us for assistance.`);
      currentStep = STEPS.FORM;
      renderStep();
    }
    return true; // Signal that we handled the payment return
  }
  return false; // No payment return detected
}

// Fetch booking details and show success page
async function fetchBookingAndShowSuccess(bookingId) {
  try {
    // Show loading state
    const app = document.getElementById("app");
    app.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--accent);">
        <div style="font-size: 3em; margin-bottom: 20px;">✓</div>
        <h2>Payment Successful!</h2>
        <p>Loading your booking details...</p>
        <div class="spinner" style="margin-top: 20px;"></div>
      </div>
    `;

    // Fetch booking details from API
    const response = await fetch(`http://localhost:3000/api/webhooks/xendit/verify/${bookingId}`);
    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to load booking details');
    }

    const bookingData = data.data;

    // Map backend data to frontend format
    booking = {
      name: bookingData.name,
      email: bookingData.email,
      contact: bookingData.contact,
      birthday: bookingData.birthday,
      address: bookingData.home_address,
      service: mapBackendToFrontendService(bookingData.service_type),
      date: bookingData.booking_date,
      time: bookingData.booking_time,
      hours: bookingData.hours,
      people: bookingData.members,
      payment: mapBackendToFrontendPayment(bookingData.payment_method),
      price: parseFloat(bookingData.total_price)
    };

    bookingRef = bookingData.booking_id;

    // Show success page (Step 3)
    currentStep = STEPS.SUCCESS;
    renderStep();

  } catch (error) {
    console.error('Error fetching booking details:', error);
    
    const app = document.getElementById("app");
    app.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--error);">
        <h2>Payment Verification Failed</h2>
        <p style="margin: 20px 0;">${error.message}</p>
        <button class="btn" onclick="location.href='/frontend/views/booking.html'" style="margin-top: 20px;">
          Back to Booking
        </button>
      </div>
    `;
  }
}

// Map backend service types to frontend
function mapBackendToFrontendService(backendService) {
  const mapping = {
    'recording': 'vocal',
    'voiceover': 'podcast',
    'arrangement': 'mixing'
  };
  return mapping[backendService] || 'vocal';
}

// Map backend payment methods to frontend
function mapBackendToFrontendPayment(backendPayment) {
  const mapping = {
    'gcash': 'GCash',
    'credit_card': 'Credit/Debit Card',
    'cash': 'Cash'
  };
  return mapping[backendPayment] || backendPayment;
}

// --- INITIAL ---
document.addEventListener("DOMContentLoaded", () => {
  // Check if returning from payment
  if (!checkPaymentReturn()) {
    // Normal flow - render form
    renderStep();
  }
});
// Fetch booking details and show success page
// Fetch booking details and show success page
async function fetchBookingAndShowSuccess(bookingId) {
  try {
    // Show loading state
    const app = document.getElementById("app");
    app.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--accent);">
        <div style="font-size: 3em; margin-bottom: 20px;">✓</div>
        <h2>Payment Successful!</h2>
        <p>Loading your booking details...</p>
        <div class="spinner" style="margin-top: 20px;"></div>
      </div>
    `;

    console.log(`🔍 Fetching booking details for: ${bookingId}`);

    // Fetch booking details from API
    const response = await fetch(`http://localhost:3000/api/webhooks/xendit/verify/${bookingId}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 API Response:', data);

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to load booking details');
    }

    const bookingData = data.data;
    console.log('✅ Booking data loaded:', bookingData);

    // Map backend data to frontend format
    booking = {
      name: bookingData.name,
      email: bookingData.email,
      contact: bookingData.contact,
      birthday: bookingData.birthday,
      address: bookingData.home_address,
      service: mapBackendToFrontendService(bookingData.service_type),
      date: bookingData.booking_date,
      time: bookingData.booking_time,
      hours: bookingData.hours,
      people: bookingData.members,
      payment: mapBackendToFrontendPayment(bookingData.payment_method),
      price: parseFloat(bookingData.total_price)
    };

    bookingRef = bookingData.booking_id;

    console.log('🎯 Mapped booking object:', booking);
    console.log('📋 Booking reference:', bookingRef);

    // Show success page (Step 3)
    currentStep = STEPS.SUCCESS;
    renderStep();

  } catch (error) {
    console.error('❌ Error fetching booking details:', error);
    
    const app = document.getElementById("app");
    app.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--error); background: var(--bg-card); border-radius: 12px; margin: 20px;">
        <h2>⚠️ Payment Verification Failed</h2>
        <p style="margin: 20px 0; font-size: 16px;">${error.message}</p>
        <p style="color: #aaa; margin: 15px 0;">Please check your email for booking confirmation or contact support.</p>
        <button class="btn" onclick="location.href='/views/user/booking.html'" style="margin-top: 20px;">
          Back to Booking
        </button>
      </div>
    `;
  }
}
// Map backend service types to frontend
function mapBackendToFrontendService(backendService) {
  const mapping = {
    'recording': 'vocal',
    'voiceover': 'podcast',
    'arrangement': 'mixing'
  };
  return mapping[backendService] || 'vocal';
}

// Map backend payment methods to frontend
function mapBackendToFrontendPayment(backendPayment) {
  const mapping = {
    'gcash': 'GCash',
    'credit_card': 'Credit/Debit Card',
    'cash': 'Cash'
  };
  return mapping[backendPayment] || backendPayment;
}

// --- INITIAL ---
document.addEventListener("DOMContentLoaded", () => {
  // Check if returning from payment
  if (!checkPaymentReturn()) {
    // Normal flow - render form
    renderStep();
  }
});