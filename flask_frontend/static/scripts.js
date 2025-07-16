// ✅ Base API URL
const API_BASE = "http://127.0.0.1:8000";

// ✅ Retrieve token from localStorage
let token = localStorage.getItem("token");

// ✅ Redirect if not logged in on /book page
if (window.location.pathname === "/book" && !token) {
  alert("⚠ Please login first.");
  window.location.href = "/";
}

// ✅ DateTime Format Fix (Adds ":00" if missing seconds)
function formatDateTime(dt) {
  return dt && dt.length === 16 ? dt + ":00" : dt;
}

// ✅ Login Function
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  const data = await response.json();

  if (response.ok) {
    alert("✅ Login successful! Redirecting to bookings...");
    localStorage.setItem("token", data.access_token);
    window.location.href = "/book";
  } else {
    alert(data.detail || "Login failed");
  }
}

// ✅ Register Function (no email)
async function register(event) {
  event.preventDefault();

  const username = document.getElementById("register-username").value;
  const password = document.getElementById("register-password").value;

  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (response.ok) {
    alert("✅ Registration successful! Redirecting to login...");
    window.location.href = "/";
  } else {
    alert(data.detail || "Registration failed");
  }
}

// ✅ Logout
function logout() {
  localStorage.removeItem("token");
  alert("👋 Logged out!");
  window.location.href = "/";
}

// ✅ Create Booking
async function createBooking() {
  const booking = {
    room_id: parseInt(document.getElementById("room_id").value),
    booked_by: document.getElementById("booked_by").value,
    start_time: formatDateTime(document.getElementById("start_time").value),
    end_time: formatDateTime(document.getElementById("end_time").value),
  };

  const res = await fetch(`${API_BASE}/bookings/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(booking),
  });

  const data = await res.json();

  if (res.ok) {
    alert(`✅ Booking created successfully!
Room: ${data.room_id}
Booked By: ${data.booked_by}
From: ${data.start_time}
To: ${data.end_time}`);
    loadBookings();
  } else {
    alert("❌ Booking failed: " + (data.detail || "Unknown error"));
  }
}

// ✅ Load All Bookings (List Display)
async function loadBookings() {
  console.log("Loading bookings...");

  const res = await fetch(`${API_BASE}/bookings/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    const bookings = await res.json();
    console.log("Bookings fetched:", bookings);

    const list = document.getElementById("booking-list");
    list.innerHTML = "";

    if (bookings.length === 0) {
      list.innerHTML = "<li>❌ No bookings found</li>";
      return;
    }

    bookings.forEach((b) => {
      const start = new Date(b.start_time).toLocaleString();
      const end = new Date(b.end_time).toLocaleString();

      const li = document.createElement("li");
      li.innerHTML = `
        <strong>📌 Room ${b.room_id}</strong> booked by <strong>${b.booked_by}</strong><br>
        🕐 ${start} → ${end}
        <br>
        <button onclick="editBooking(${b.id})">✏ Edit</button>
        <button onclick="deleteBooking(${b.id})">🗑 Delete</button>
      `;
      list.appendChild(li);
    });
  } else {
    alert("⚠ Failed to load bookings.");
  }
}

// ✅ Delete Booking
async function deleteBooking(id) {
  const res = await fetch(`${API_BASE}/bookings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    alert("🗑 Booking deleted");
    loadBookings();
  } else {
    alert("❌ Deletion failed");
  }
}

// ✅ Edit Booking
function editBooking(id) {
  const roomId = prompt("New Room ID:");
  const bookedBy = prompt("New Booked By:");
  const startTime = formatDateTime(prompt("New Start Time (YYYY-MM-DDTHH:MM):"));
  const endTime = formatDateTime(prompt("New End Time (YYYY-MM-DDTHH:MM):"));

  const updated = {
    room_id: parseInt(roomId),
    booked_by: bookedBy,
    start_time: startTime,
    end_time: endTime,
  };

  fetch(`${API_BASE}/bookings/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updated),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.id) {
        alert(`✏ Booking updated:
Room: ${data.room_id}
Booked By: ${data.booked_by}`);
        loadBookings();
      } else {
        alert("❌ Update failed: " + (data.detail || "Unknown error"));
      }
    })
    .catch(() => {
      alert("Update failed");
    });
}

// ✅ Auto-load Bookings on /book Page
if (window.location.pathname === "/book") {
  window.onload = loadBookings;
}

// ✅ Create Booking (Auto-refresh list)
async function createBooking() {
  const booking = {
    room_id: parseInt(document.getElementById("room_id").value),
    booked_by: document.getElementById("booked_by").value,
    start_time: formatDateTime(document.getElementById("start_time").value),
    end_time: formatDateTime(document.getElementById("end_time").value),
  };

  const res = await fetch(`${API_BASE}/bookings/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(booking),
  });

  const data = await res.json();

  if (res.ok) {
    alert(`✅ Booking created successfully!
Room: ${data.room_id}
Booked By: ${data.booked_by}`);

    // ✅ Clear Form Fields after booking
    document.getElementById("room_id").value = "";
    document.getElementById("booked_by").value = "";
    document.getElementById("start_time").value = "";
    document.getElementById("end_time").value = "";

    // ✅ Refresh booking list (no page reload)
    await loadBookings();
  } else {
    alert("❌ Booking failed: " + (data.detail || "Unknown error"));
  }
}
