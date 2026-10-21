const API_URL = "https://ticket-api-production-91ed.up.railway.app";

const loginBtn = document.getElementById("loginBtn");
const message = document.getElementById("message");

loginBtn.addEventListener("click", async function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const response = await fetch(API_URL + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
    });

    const data = await response.json();
    console.log(data);

    if (response.ok) {
        localStorage.setItem("token", data.access_token);
        showLoggedIn();
    } else {
        message.textContent = data.detail;
    }
});


const loadBtn = document.getElementById("loadBtn");
const ticketList = document.getElementById("ticketList");

loadBtn.addEventListener("click", async function() {
    const token = localStorage.getItem("token");

    const response = await fetch(API_URL + "/tickets", {
        headers: { "Authorization": "Bearer " + token }
    });

    const tickets = await response.json();
    console.log(tickets);

    ticketList.innerHTML = "";

     for (const ticket of tickets) {
        ticketList.innerHTML += `
            <div class="ticket">
                <span>#${ticket.id} ${ticket.title} — ${ticket.priority} — ${ticket.status}</span>
                <button onclick="closeTicket(${ticket.id})">Close</button>
                <button onclick="deleteTicket(${ticket.id})">Delete</button>
            </div>
        `;
    }
});


const createBtn = document.getElementById("createBtn");

createBtn.addEventListener("click", async function() {
    const token = localStorage.getItem("token");
    const title = document.getElementById("title").value;
    const priority = document.getElementById("priority").value;

    const response = await fetch(API_URL + "/tickets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ title: title, priority: priority })
    });

    const data = await response.json();
    console.log(data);
    loadBtn.click();
});


const registerBtn = document.getElementById("registerBtn");
const regMessage = document.getElementById("regMessage");

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
        regMessage.textContent = "Account created — you can log in now";
    } else {
        regMessage.textContent = data.detail;
    }
});

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const logoutBtn = document.getElementById("logoutBtn");

function showLoggedIn() {
    authSection.style.display = "none";
    appSection.style.display = "block";
    loadBtn.click();
}

function showLoggedOut() {
    authSection.style.display = "block";
    appSection.style.display = "none";
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

async function closeTicket(id) {
    const token = localStorage.getItem("token");
    await fetch(API_URL + "/tickets/" + id, {
        method: "PATCH",
        headers: { "Authorization": "Bearer " + token }
    });
    loadBtn.click();
}

async function deleteTicket(id) {
    const token = localStorage.getItem("token");
    const response = await fetch(API_URL + "/tickets/" + id, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
    });
    if (!response.ok) {
        alert("Only admins can delete tickets");
    }
    loadBtn.click();
}