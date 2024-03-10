const calendar = document.getElementById("calendar");

// Date
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // Returns 0 - 11
const currentDate = new Date().getDate();

// Draw calendar
let dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
let firstDay = new Date(currentYear, currentMonth, 1).getDay(); // Returns 0 - 6
let day = 1;
let numberOfDays = new Date(currentYear, currentMonth + 1, 0).getDate();

for (let i = 0; i < dayNames.length; i++) {
    let dayName = dayNames[i];
    calendar.insertAdjacentHTML("beforeend", `<div class="day-name">${dayName}</div>`);
}

for (let i = 0; i < 35; i++) {
    if (i < firstDay - 1) {
        calendar.insertAdjacentHTML("beforeend", `<div></div>`);
    } else {
        if (day <= numberOfDays) {
            calendar.insertAdjacentHTML("beforeend", `<div class="day">${day}</div>`);
            day++;
        }
    }
}

// Event Listener
document.addEventListener("DOMContentLoaded", () => {
    const days = document.querySelectorAll("#calendar .day");

    for (let i = 0; i < days.length; i++) {
        days[i].addEventListener("click", (e) => {
            e.currentTarget.classList.toggle("selected");
        })
    }
})