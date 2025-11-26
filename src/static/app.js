document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to avoid inserting raw HTML from server (simple escaping)
  function escapeHtml(str) {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select and keep default prompt
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participants.length;

        // Build participants HTML (render each participant with a delete button)
        let participantsHTML = "";
        if (participants.length === 0) {
          participantsHTML = `<div class="participants"><h5>Participants (0)</h5><div class="empty">No participants yet</div></div>`;
        } else {
          const listItems = participants
            .map(
              (p) =>
                `<li><span class="participant-email">${escapeHtml(p)}</span><button class="delete-btn" data-activity="${escapeHtml(
                  name
                )}" data-email="${escapeHtml(p)}" title="Unregister">\u00d7</button></li>`
            )
            .join("");

          participantsHTML = `<div class="participants"><h5>Participants (${participants.length})</h5><ul class="participants-list">${listItems}</ul></div>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participants in this activity card
        activityCard.addEventListener("click", async (e) => {
          const btn = e.target.closest(".delete-btn");
          if (!btn) return;

          const activityName = btn.dataset.activity;
          const email = btn.dataset.email;

          if (!activityName || !email) return;

          // Confirm before unregistering
          const ok = window.confirm(`Unregister ${email} from ${activityName}?`);
          if (!ok) return;

          try {
            const resp = await fetch(
              `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
              { method: "DELETE" }
            );

            const result = await resp.json();
            if (resp.ok) {
              // Refresh activities list to reflect the change
              fetchActivities();
              messageDiv.textContent = result.message || "Unregistered";
              messageDiv.className = "message info";
              messageDiv.classList.remove("hidden");
              setTimeout(() => messageDiv.classList.add("hidden"), 3000);
            } else {
              messageDiv.textContent = result.detail || "Failed to unregister";
              messageDiv.className = "message error";
              messageDiv.classList.remove("hidden");
            }
          } catch (err) {
            console.error("Error unregistering:", err);
            messageDiv.textContent = "Failed to unregister. Please try again.";
            messageDiv.className = "message error";
            messageDiv.classList.remove("hidden");
          }
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
