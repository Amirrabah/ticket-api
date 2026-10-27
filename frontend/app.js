const API_URL = "https://ticket-api-production-91ed.up.railway.app";

// Escapes text so it is shown as text, never run as HTML.
// Also escapes quotes, so it is safe inside attributes.
function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// Only known values are allowed into CSS class names.
function safeValue(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}

const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");
const loadBtn = document.getElementById("loadBtn");
const ticketList = document.getElementById("ticketList");
const createBtn = document.getElementById("createBtn");
const registerBtn = document.getElementById("registerBtn");
const regMessage = document.getElementById("regMessage");
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const logoutBtn = document.getElementById("logoutBtn");


// Login
loginBtn.addEventListener("click", async function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch(API_URL + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem("token", data.access_token);
        message.textContent = "";
        showLoggedIn();
    } else if (response.status === 429) {
        message.textContent = "Too many login attempts. Wait a minute and try again.";
    } else {
        message.textContent = data.detail;
    }
});

// Register
registerBtn.addEventListener("click", async function() {
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;

    const response = await fetch(API_URL + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, email: email, password: password })
    });

    const data = await response.json();

    if (response.ok) {
        regMessage.textContent = "Account created. Log in above.";
    } else if (response.status === 422) {
        regMessage.textContent = "Fill in every field. The password needs at least 8 characters.";
    } else {
        regMessage.textContent = data.detail;
    }
});


// Load tickets
loadBtn.addEventListener("click", async function() {
    const token = localStorage.getItem("token");

    const response = await fetch(API_URL + "/tickets", {
        headers: { "Authorization": "Bearer " + token }
    });

    if (!response.ok) {
        localStorage.removeItem("token");
        showLoggedOut();
        message.textContent = "Your session expired. Log in again.";
        return;
    }

    const tickets = await response.json();
    ticketList.innerHTML = "";

    if (tickets.length === 0) {
        ticketList.innerHTML = `<p class="empty">No tickets yet. Describe a problem above to open your first one.</p>`;
        return;
    }

    for (const ticket of tickets) {
        const id = Number(ticket.id);
        const priority = safeValue(ticket.priority, ["low", "normal", "high"], "normal");
        const status = safeValue(ticket.status, ["open", "closed"], "open");

        const nextStatus = status === "open" ? "closed" : "open";
        const buttonText = status === "open" ? "Close" : "Reopen";
        const date = new Date(ticket.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);

        ticketList.innerHTML += `
            <article class="ticket prio-${priority} status-${status}">
                <span class="ticket-no">${id}</span>
                <div>
                    <p class="ticket-title">${escapeHtml(ticket.title)}</p>
                    <p class="ticket-meta">${priorityLabel} priority, ${status}, opened ${escapeHtml(date)} by ${escapeHtml(ticket.created_by)}</p>
                </div>
                <div class="ticket-actions">
                    <button class="btn-secondary" onclick="updateStatus(${id}, '${nextStatus}')">${buttonText}</button>
                    <button class="btn-delete" onclick="deleteTicket(${id})">Delete</button>
                </div>
            </article>
        `;
    }
});


// Create ticket
createBtn.addEventListener("click", async function() {
    const token = localStorage.getItem("token");
    const titleInput = document.getElementById("title");
    const priority = document.getElementById("priority").value;

    if (titleInput.value.trim() === "") {
        titleInput.focus();
        return;
    }

    await fetch(API_URL + "/tickets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ title: titleInput.value, priority: priority })
    });

    titleInput.value = "";
    loadBtn.click();
});


// Close / reopen
async function updateStatus(id, status) {
    const token = localStorage.getItem("token");
    await fetch(API_URL + "/tickets/" + id, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ status: status })
    });
    loadBtn.click();
}


// Delete
async function deleteTicket(id) {
    const token = localStorage.getItem("token");
    const response = await fetch(API_URL + "/tickets/" + id, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
    });
    if (!response.ok) {
        alert("Only admins can delete tickets.");
    }
    loadBtn.click();
}


// Switch between logged-in and logged-out views
function showLoggedIn() {
    authSection.style.display = "none";
    appSection.style.display = "block";
    logoutBtn.style.display = "inline-block";
    loadBtn.click();
}

function showLoggedOut() {
    authSection.style.display = "block";
    appSection.style.display = "none";
    logoutBtn.style.display = "none";
}

logoutBtn.addEventListener("click", function() {
    localStorage.removeItem("token");
    showLoggedOut();
});

if (localStorage.getItem("token")) {
    showLoggedIn();
} else {
    showLoggedOut();
}