const taskForm = document.getElementById("taskForm");
const taskName = document.getElementById("taskName");
const course = document.getElementById("course");
const deadline = document.getElementById("deadline");
const priority = document.getElementById("priority");
const clearBtn = document.getElementById("clearBtn");
const searchInput = document.getElementById("searchInput");
const filterPriority = document.getElementById("filterPriority");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const formMessage = document.getElementById("formMessage");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const pendingCount = document.getElementById("pendingCount");
const progressPercent = document.getElementById("progressPercent");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const dashboardTaskList = document.getElementById("dashboardTaskList");

let tasks = [];
try {
  tasks = JSON.parse(localStorage.getItem("taskmate_tasks") || "[]");
  if (!Array.isArray(tasks)) tasks = [];
} catch (error) {
  tasks = [];
}

function saveTasks() {
  localStorage.setItem("taskmate_tasks", JSON.stringify(tasks));
}

// Mengecek apakah pengguna memilih mengurangi gerakan animasi.
function motionAllowed() {
  return !window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
}

// Fungsi umum untuk menjalankan animasi.
function animateElement(
  element,
  keyframes,
  duration = 240,
  easing = "ease-out"
) {
  if (
    !element ||
    !motionAllowed() ||
    typeof element.animate !== "function"
  ) {
    return;
  }

  element.animate(keyframes, {
    duration: Math.min(400, Math.max(150, duration)),
    easing: easing,
    fill: "both"
  });
}

/* NAVIGASI: tiga tampilan di dalam satu aplikasi */
const navButtons = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");

function showView(viewId) {
  const validIds = ["dashboard", "tasks", "about"];

  if (!validIds.includes(viewId)) return;

  // Menampilkan tampilan yang dipilih.
  views.forEach(view => {
    view.hidden = view.id !== viewId;
  });

  // Memperbarui status tombol navigasi.
  document.querySelectorAll(".main-nav [data-view]")
    .forEach(button => {
      const active = button.dataset.view === viewId;

      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

  // ANIMASI 1: tampilan baru muncul dengan fade-in
  // dan sedikit gerakan ke atas.
  const activeView = document.getElementById(viewId);

  animateElement(
    activeView,
    [
      {
        opacity: 0,
        transform: "translateY(8px)"
      },
      {
        opacity: 1,
        transform: "translateY(0)"
      }
    ],
    240
  );

  if (viewId === "dashboard") {
    renderDashboard();
  }
}

navButtons.forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-view-link]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    showView(link.dataset.viewLink);
  });
});

function showError(id, message) {
  document.getElementById(id).textContent = message;
}

function clearErrors() {
  ["taskNameError", "courseError", "deadlineError", "priorityError"]
    .forEach(id => showError(id, ""));
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (taskName.value.trim().length < 3) {
    showError("taskNameError", "Nama tugas minimal 3 karakter.");
    valid = false;
  }

  if (course.value.trim() === "") {
    showError("courseError", "Mata kuliah wajib diisi.");
    valid = false;
  }

  if (deadline.value === "") {
    showError("deadlineError", "Deadline wajib dipilih.");
    valid = false;
  } else {
    const selected = new Date(deadline.value + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      showError("deadlineError", "Deadline tidak boleh sebelum hari ini.");
      valid = false;
    }
  }

  if (priority.value === "") {
    showError("priorityError", "Pilih salah satu prioritas.");
    valid = false;
  }

  return valid;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(dateString + "T00:00:00"));
}

function priorityClass(value) {
  if (value === "Tinggi") return "badge-high";
  if (value === "Sedang") return "badge-medium";
  return "badge-low";
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#039;"
  }[char]));
}

/* Memperbarui ringkasan Dashboard */
function renderDashboard() {
  const total = tasks.length;
  const done = tasks.filter(task => task.completed).length;
  const pending = total - done;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  totalCount.textContent = total;
  doneCount.textContent = done;
  pendingCount.textContent = pending;
  progressPercent.textContent = percent + "%";
  progressFill.style.width = percent + "%";
  progressBar.setAttribute("aria-valuenow", String(percent));

  if (tasks.length === 0) {
    dashboardTaskList.innerHTML =
      '<p class="empty-inline">Belum ada tugas. Buka Kelola Tugas untuk menambahkan tugas pertamamu.</p>';
    return;
  }

  const latestTasks = [...tasks].sort((a, b) => b.id - a.id).slice(0, 3);
  dashboardTaskList.innerHTML = latestTasks.map(task => `
    <article class="dashboard-task">
      <div>
        <strong>${escapeHtml(task.name)}</strong>
        <small>${escapeHtml(task.course)} · Deadline: ${formatDate(task.deadline)}</small>
      </div>
      <span class="status-pill ${task.completed ? "done" : ""}">
        ${task.completed ? "Selesai" : "Belum selesai"}
      </span>
    </article>
  `).join("");
}

/* Daftar tugas, pencarian, dan filter */
function renderTasks(animateTaskId = null) {
  const search = searchInput.value.trim().toLowerCase();
  const filter = filterPriority.value;

  const filtered = tasks.filter(task => {
    const matchesSearch =
      task.name.toLowerCase().includes(search) ||
      task.course.toLowerCase().includes(search);
    const matchesPriority =
      filter === "Semua" || task.priority === filter;
    return matchesSearch && matchesPriority;
  });

  taskList.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").textContent =
      tasks.length === 0 ? "Belum ada tugas" : "Tugas tidak ditemukan";
    emptyState.querySelector("p").textContent =
      tasks.length === 0
        ? "Tambahkan tugas pertama kamu melalui formulir di atas."
        : "Coba ubah kata pencarian atau filter.";
  } else {
    emptyState.classList.add("hidden");
  }

  filtered.forEach(task => {
    const article = document.createElement("article");
    article.className = "task-item" + (task.completed ? " completed" : "");
    article.innerHTML = `
      <div class="task-main">
        <h3 class="${task.completed ? "done-title" : ""}">
          ${escapeHtml(task.name)}
          <span class="badge ${priorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
        </h3>
        <p>${escapeHtml(task.course)} • Deadline: ${formatDate(task.deadline)}</p>
        <p>Status: ${task.completed ? "Selesai" : "Belum selesai"}</p>
      </div>
      <div class="task-actions">
        <button type="button" data-action="toggle" data-id="${task.id}">
          ${task.completed ? "Batalkan selesai" : "Tandai selesai"}
        </button>
        <button type="button" class="delete" data-action="delete" data-id="${task.id}">Hapus</button>
      </div>
    `;
    taskList.appendChild(article);
    // ANIMASI 2: animasikan hanya kartu tugas yang baru ditambahkan.
if (
  animateTaskId !== null &&
  task.id === animateTaskId
) {
  animateElement(
    article,
    [
      {
        opacity: 0,
        transform: "translateY(10px)"
      },
      {
        opacity: 1,
        transform: "translateY(0)"
      }
    ],
    260
  );
}
  });
}

function renderAll(animateTaskId = null) {
  renderTasks(animateTaskId);
  renderDashboard();
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();

  if (!validateForm()) {
    formMessage.textContent = "Periksa kembali data yang bertanda merah.";
    formMessage.style.color = "#ff7770";
    return;
  }

  const newTask = {
    id: Date.now(),
    name: taskName.value.trim(),
    course: course.value.trim(),
    deadline: deadline.value,
    priority: priority.value,
    completed: false
  };

  loadingState.classList.remove("hidden");
  taskList.classList.add("hidden");
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;

  setTimeout(() => {
    tasks.push(newTask);
    saveTasks();
    taskForm.reset();
    clearErrors();

    loadingState.classList.add("hidden");
    taskList.classList.remove("hidden");
    submitBtn.disabled = false;
    formMessage.textContent = "Tugas berhasil ditambahkan.";
    formMessage.style.color = "#78e6a0";
    renderAll(newTask.id);
  }, 300);
});

clearBtn.addEventListener("click", () => {
  taskForm.reset();
  clearErrors();
  formMessage.textContent = "Form sudah dikosongkan.";
  formMessage.style.color = "#a7b5cc";
});

searchInput.addEventListener("input", renderTasks);
filterPriority.addEventListener("change", renderTasks);

taskName.addEventListener("input", () => {
  if (taskName.value.trim().length >= 3) showError("taskNameError", "");
});

document.addEventListener("keydown", event => {
  if (event.key === "Enter" && document.activeElement === taskName) {
    event.preventDefault();
    course.focus();
  }
});

taskList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "toggle") {
    const task = tasks.find(item => item.id === id);
    if (task) task.completed = !task.completed;
  } else if (action === "delete") {
    tasks = tasks.filter(item => item.id !== id);
  }

  saveTasks();
  renderAll();
});

renderAll();
showView("dashboard");

if (window.lucide) {
  window.lucide.createIcons();
}
