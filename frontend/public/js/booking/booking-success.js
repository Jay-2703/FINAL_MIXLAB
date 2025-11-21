//////////////////////////////
// booking-success.js
//////////////////////////////

let booking = {};
let bookingRef = "";

function peso(val) {
  return "₱" + Number(val).toLocaleString("en-PH", {
    minimumFractionDigits: 2
  });
}

function renderDetailRows(container, obj) {
  container.innerHTML = "";
  for (const [k, v] of Object.entries(obj)) {
    const div = document.createElement("div");
    div.className = "detail-row";
    div.innerHTML = `
      <span class="detail-label">${k}</span>
      <span class="detail-value">${v}</span>
    `;
    container.appendChild(div);
  }
}

const SERVICE_LABELS = {
  vocal: "Vocal Recording",
  band: "Band Recording",
  podcast: "Podcast",
  mixing: "Mixing & Mastering"
};

function mapBackendToFrontendService(s) {
  const map = {
    recording: "vocal",
    voiceover: "podcast",
    arrangement: "mixing"
  };
  return map[s] || "vocal";
}

function mapBackendToFrontendPayment(p) {
  const map = {
    gcash: "GCash",
    credit_card: "Credit/Debit Card",
    cash: "Cash"
  };
  return map[p] || p;
}

// --- MAIN ---
async function loadSuccessPage(bookingId) {
  const app = document.getElementById("app");
  app.innerHTML =
    "<h2>Loading booking...</h2><div class='spinner'></div>";

  let local = null;

  try {
    const saved = sessionStorage.getItem("completedBooking");
    if (saved) {
      const parsed = JSON.parse(saved);
      local = parsed.booking;
      bookingRef = parsed.bookingRef;
    }
  } catch {}

  if (!local) {
    // Fetch from API
    const resp = await fetch(
      "http://localhost:3000/api/webhooks/xendit/verify/" + bookingId
    );
    const data = await resp.json();

    if (!data.success) {
      app.innerHTML = "<h2>Error loading booking</h2>";
      return;
    }

    const b = data.data;
    bookingRef = b.booking_id;

    booking = {
      name: b.name,
      email: b.email,
      contact: b.contact,
      birthday: b.birthday,
      address: b.home_address,
      service: mapBackendToFrontendService(b.service_type),
      date: b.booking_date,
      time: b.booking_time,
      hours: b.hours,
      people: b.members,
      payment: mapBackendToFrontendPayment(b.payment_method),
      price: Number(b.total_price)
    };
  } else {
    // From sessionStorage
    booking = local;
  }

  renderSuccessPage();
}

function renderSuccessPage() {
  const app = document.getElementById("app");

  app.innerHTML = document.getElementById("booking-success").innerHTML;

  document.getElementById("booking-ref").textContent = bookingRef;
  document.getElementById("total-amount").textContent = peso(booking.price);

  renderDetailRows(
    document.getElementById("success-details"),
    {
      "Full Name": booking.name,
      "Email": booking.email,
      "Mobile": booking.contact,
      "Service": SERVICE_LABELS[booking.service],
      "Date": booking.date + " " + booking.time,
      "Hours": booking.hours,
      "People": booking.people,
      "Payment": booking.payment
    }
  );

  // Receipt download
  document.getElementById("btn-receipt").onclick = () => {
    const txt = `
Receipt
Ref: ${bookingRef}
Name: ${booking.name}
Total: ${peso(booking.price)}
    `;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "receipt-" + bookingRef + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  };
}

// --- INITIAL ---
document.addEventListener("DOMContentLoaded", () => {
  const url = new URLSearchParams(window.location.search);
  const bookingId = url.get("booking_id");

  if (!bookingId) {
    document.getElementById("app").innerHTML =
      "<h2>Error: Missing booking reference</h2>";
    return;
  }

  loadSuccessPage(bookingId);
});
