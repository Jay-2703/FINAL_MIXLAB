const API_URL_BASE = 'http://localhost:3000'; // <-- Set this to your backend!

document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) {
    console.error("Could not find table body with id bookingsTableBody!");
    return;
  }

  // Minimal loader example for demo:
  async function loadAppointments() {
    tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
    try {
      const url = new URL(API_URL_BASE + '/api/admin/appointments');
      url.searchParams.set('page', 1);
      url.searchParams.set('limit', 5);
      const resp = await fetch(url, { credentials: "include" });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      const appointments = data.data?.appointments || [];
      if (!appointments.length) {
        tbody.innerHTML = `<tr><td colspan="6">No appointments found</td></tr>`;
        return;
      }
      tbody.innerHTML = appointments.map(app => `
        <tr>
          <td>${(app.student_first_name || "") + " " + (app.student_last_name || "")}</td>
          <td>${app.service_type || ""}</td>
          <td>${formatDateTime(app.date, app.time)}</td>
          <td>${(app.instructor_first_name || "") + " " + (app.instructor_last_name || "")}</td>
          <td>${app.status || ""}</td>
          <td><button class="action-btn" data-action="delete" data-id="${app.id}">Delete</button></td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6">Error: ${err.message}</td></tr>`;
    }
  }

  function formatDateTime(date, time) {
    if (!date) return "";
    return (new Date(date + "T" + (time || "00:00"))).toLocaleString();
  }

  loadAppointments();
});