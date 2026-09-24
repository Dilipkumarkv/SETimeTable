// Phase 2, 4 & 5: Application Orchestrator, Shell Wiring & Filters
import { TIMETABLE } from "./data.js";
import { validateTimetable } from "./validate.js";
import {
  getSlotState,
  getCurrentEntries,
  getUpcomingEntries,
  getDayGrid,
  getClassWeek,
  getLecturerWeek,
  filterCurrentEntries,
  filterUpcomingEntries,
  filterDayGrid
} from "./time.js";
import { renderNowView } from "./ui-now.js";
import { renderNextView } from "./ui-next.js";
import { renderOverviewView } from "./ui-overview.js";

// Global application state (Filters in memory only)
const state = {
  activeTab: "now",
  isSimulating: false,
  simDay: "MON",
  simTime: "12:00",
  nowSearchQuery: "",
  filters: {
    branch: "ALL", // "ALL" | "CE" | "CS" | "EC" | "EE" | "ME"
    lecturer: "ALL" // "ALL" | lecturer initials
  },
  overviewState: {
    mode: "day",
    day: "MON",
    weekTargetType: "class",
    selectedClass: "CS-III",
    selectedLecturer: "RBL"
  },
  data: TIMETABLE,
  diagnostics: []
};

// Global namespace for views and dev simulation
window.TimetableApp = {
  getSlotState,
  getCurrentEntries,
  getUpcomingEntries,
  getDayGrid,
  getClassWeek,
  getLecturerWeek,
  filterCurrentEntries,
  filterUpcomingEntries,
  filterDayGrid,
  getFilters() {
    return { ...state.filters };
  },
  setBranchFilter(branch) {
    state.filters.branch = branch;
    renderFilterBar();
    renderCurrentTab();
  },
  setLecturerFilter(lecturer) {
    state.filters.lecturer = lecturer;
    renderFilterBar();
    renderCurrentTab();
  },
  resetFilters() {
    state.filters.branch = "ALL";
    state.filters.lecturer = "ALL";
    renderFilterBar();
    renderCurrentTab();
  },
  setSearchQuery(q) {
    state.nowSearchQuery = q;
    renderCurrentTab();
  },
  setOverviewState(newState) {
    state.overviewState = newState;
    renderFilterBar();
    renderCurrentTab();
  },
  resetSimulation() {
    state.isSimulating = false;
    document.getElementById("sim-day").value = "MON";
    document.getElementById("sim-time").value = "12:00";
    updateHeaderClock();
    renderCurrentTab();
  }
};

/**
 * Returns either simulated Date or actual Date.
 */
function getCurrentEffectiveDate() {
  if (!state.isSimulating) {
    return new Date();
  }
  // Construct Date from simDay and simTime
  const dayMap = {
    SUN: "2026-09-27",
    MON: "2026-09-28",
    TUE: "2026-09-29",
    WED: "2026-09-30",
    THU: "2026-10-01",
    FRI: "2026-10-02",
    SAT: "2026-10-03"
  };
  const [h, m] = state.simTime.split(":");
  return new Date(`${dayMap[state.simDay]}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`);
}

/**
 * Updates top header clock indicator.
 */
function updateHeaderClock() {
  const clockEl = document.getElementById("header-clock");
  const effDate = getCurrentEffectiveDate();
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayName = days[effDate.getDay()];
  const h = String(effDate.getHours()).padStart(2, "0");
  const m = String(effDate.getMinutes()).padStart(2, "0");

  if (state.isSimulating) {
    clockEl.innerHTML = `<span class="live-indicator sim-indicator"></span>SIM: ${dayName} ${h}:${m}`;
  } else {
    clockEl.innerHTML = `<span class="live-indicator"></span>${dayName} ${h}:${m}`;
  }
}

/**
 * Renders the global filter bar for Branch and Lecturer.
 * Filter applies to Now, Next, and Day overview.
 * Hidden on Week overview and diagnostic errors.
 */
function renderFilterBar() {
  const filterContainer = document.getElementById("global-filter-bar");
  if (!filterContainer) return;

  const isVisibleTab = (
    state.activeTab === "now" ||
    state.activeTab === "next" ||
    (state.activeTab === "overview" && state.overviewState.mode === "day")
  );

  if (!isVisibleTab || state.diagnostics.length > 0) {
    filterContainer.style.display = "none";
    return;
  }

  filterContainer.style.display = "flex";

  const branches = ["ALL", "CE", "CS", "EC", "EE", "ME"];
  const lecturerKeys = Object.keys(state.data.lecturers);

  const isFiltered = (state.filters.branch !== "ALL" || state.filters.lecturer !== "ALL");

  let lecturerOptionsHtml = `<option value="ALL"${state.filters.lecturer === "ALL" ? " selected" : ""}>All Lecturers</option>`;
  lecturerKeys.forEach(initials => {
    const l = state.data.lecturers[initials];
    const label = l && l.name ? `${l.name} (${initials})` : initials;
    const selected = state.filters.lecturer === initials ? " selected" : "";
    lecturerOptionsHtml += `<option value="${initials}"${selected}>${label}</option>`;
  });

  filterContainer.innerHTML = `
    <div class="filter-row filter-row-branch">
      <span class="filter-label" id="branch-label">Branch:</span>
      <div class="filter-branch-group" role="group" aria-labelledby="branch-label">
        ${branches.map(b => `
          <button
            type="button"
            class="filter-branch-btn ${state.filters.branch === b ? "active" : ""}"
            data-branch="${b}"
            aria-pressed="${state.filters.branch === b ? "true" : "false"}"
          >${b}</button>
        `).join("")}
      </div>
    </div>
    <div class="filter-row filter-row-lecturer">
      <label class="filter-label" for="filter-lecturer-select">Lecturer:</label>
      <div class="filter-lecturer-wrapper">
        <select id="filter-lecturer-select" class="filter-select" aria-label="Filter by lecturer">
          ${lecturerOptionsHtml}
        </select>
        ${isFiltered ? `
          <button type="button" id="filter-clear-btn" class="filter-clear-btn" title="Clear all filters">
            Clear Filters
          </button>
        ` : ""}
      </div>
    </div>
    ${isFiltered ? `
      <div class="filter-active-indicator">
        <span>Active:</span>
        <span class="filter-tag-pill">${state.filters.branch !== "ALL" ? `Branch: ${state.filters.branch}` : "All Branches"}</span>
        <span class="filter-tag-pill">${state.filters.lecturer !== "ALL" ? `Lecturer: ${state.data.lecturers[state.filters.lecturer]?.name || state.filters.lecturer}` : "All Lecturers"}</span>
      </div>
    ` : ""}
  `;

  // Attach event listeners for branch buttons
  const branchBtns = filterContainer.querySelectorAll(".filter-branch-btn");
  branchBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const b = btn.getAttribute("data-branch");
      window.TimetableApp.setBranchFilter(b);
    });
  });

  // Attach event listener for lecturer select
  const lecSelect = filterContainer.querySelector("#filter-lecturer-select");
  if (lecSelect) {
    lecSelect.addEventListener("change", (e) => {
      window.TimetableApp.setLecturerFilter(e.target.value);
    });
  }

  // Attach event listener for clear button
  const clearBtn = filterContainer.querySelector("#filter-clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      window.TimetableApp.resetFilters();
    });
  }
}

/**
 * Renders active view according to selected tab.
 */
function renderCurrentTab() {
  const mainContent = document.getElementById("main-content");
  const effDate = getCurrentEffectiveDate();

  renderFilterBar();

  if (state.diagnostics.length > 0) {
    renderDiagnostics(mainContent);
    return;
  }

  if (state.activeTab === "now") {
    renderNowView(mainContent, state.data, effDate, state.nowSearchQuery, state.filters);
  } else if (state.activeTab === "next") {
    renderNextView(mainContent, state.data, effDate, state.filters);
  } else if (state.activeTab === "overview") {
    renderOverviewView(
      mainContent,
      state.data,
      effDate,
      state.overviewState,
      (newOverviewState) => {
        state.overviewState = newOverviewState;
        renderCurrentTab();
      },
      state.filters
    );
  }
}

/**
 * Render diagnostic error table if timetable fails validation.
 */
function renderDiagnostics(container) {
  container.innerHTML = `
    <div class="diagnostic-box">
      <div class="diagnostic-title">TIMETABLE DATA VALIDATION FAILED</div>
      <p>The application refuses to render because <strong>${state.diagnostics.length}</strong> fatal error(s) were found in <code>data.js</code>:</p>
      <table class="diagnostic-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Error Message</th>
            <th>Entry Index</th>
          </tr>
        </thead>
        <tbody>
          ${state.diagnostics.map((err, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td style="color: #b91c1c; font-weight: 600;">${err.message}</td>
              <td>${err.entryIndex !== undefined ? err.entryIndex : "N/A"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Setup UI Event Listeners
 */
function setupEventListeners() {
  // Navigation tabs
  const tabBtns = document.querySelectorAll(".nav-tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      const tabName = btn.getAttribute("data-tab");
      state.activeTab = tabName;
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.setAttribute("aria-labelledby", `tab-${tabName}`);
      }
      renderCurrentTab();
    });
  });

  // Time simulation collapsible toggle (clickable & keyboard accessible)
  const simHeader = document.getElementById("sim-header");
  const simControls = document.getElementById("sim-controls");
  const toggleSim = () => {
    const isHidden = simControls.style.display === "none";
    simControls.style.display = isHidden ? "flex" : "none";
    simHeader.setAttribute("aria-expanded", isHidden ? "true" : "false");
  };

  if (simHeader && simControls) {
    simHeader.addEventListener("click", toggleSim);
    simHeader.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSim();
      }
    });
  }

  // Simulation controls
  const simDaySelect = document.getElementById("sim-day");
  const simTimeInput = document.getElementById("sim-time");
  const simApplyBtn = document.getElementById("sim-apply-btn");
  const simResetBtn = document.getElementById("sim-reset-btn");

  if (simApplyBtn) {
    simApplyBtn.addEventListener("click", () => {
      state.isSimulating = true;
      state.simDay = simDaySelect.value;
      state.simTime = simTimeInput.value || "09:45";
      updateHeaderClock();
      renderCurrentTab();
    });
  }

  if (simResetBtn) {
    simResetBtn.addEventListener("click", () => {
      window.TimetableApp.resetSimulation();
    });
  }
}

/**
 * Application Bootstrap
 */
function init() {
  // Step 1: Validate data
  const issues = validateTimetable(state.data);
  const errors = issues.filter(i => i.level === "error");

  if (errors.length > 0) {
    state.diagnostics = errors;
    console.error("Timetable validation failed:", errors);
  }

  // Step 2: Show Sample Data Banner if isSample is true
  const banner = document.getElementById("sample-banner");
  if (state.data.meta && state.data.meta.isSample) {
    banner.style.display = "block";
  } else {
    banner.style.display = "none";
  }

  // Step 3: Setup interactions
  setupEventListeners();

  // Step 4: Setup PWA capabilities (Service Worker, In-App Install Prompt, Offline status)
  setupPWA();

  // In sample mode, default to simulation on MON 12:00 so principal/reviewer immediately sees populated classes.
  // When real data is handed off (isSample: false), defaults to live device clock with zero code changes.
  if (state.data.meta && state.data.meta.isSample) {
    state.isSimulating = true;
    state.simDay = "MON";
    state.simTime = "12:00";
    document.getElementById("sim-day").value = "MON";
    document.getElementById("sim-time").value = "12:00";
  } else {
    state.isSimulating = false;
  }

  updateHeaderClock();
  renderCurrentTab();

  // Clock tick interval (every 30 seconds update clock and recalculate view if not in manual simulation)
  setInterval(() => {
    if (!state.isSimulating) {
      updateHeaderClock();
      renderCurrentTab();
    }
  }, 30000);
}

/**
 * Setup PWA Features: Service Worker Registration, Install Prompt, and Offline Status
 */
function setupPWA() {
  const offlineBanner = document.getElementById("offline-banner");
  const updateBanner = document.getElementById("update-banner");
  const updateReloadBtn = document.getElementById("update-reload-btn");
  const installContainer = document.getElementById("install-container");
  const installAppBtn = document.getElementById("install-app-btn");
  const iosGuideModal = document.getElementById("ios-guide-modal");
  const iosModalClose = document.getElementById("ios-modal-close");

  // 1. Online / Offline Status Monitoring
  function updateOnlineStatus() {
    if (!navigator.onLine) {
      if (offlineBanner) offlineBanner.style.display = "flex";
    } else {
      if (offlineBanner) offlineBanner.style.display = "none";
    }
  }

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  // 2. In-App Install Prompt
  let deferredPrompt = null;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  if (!isStandalone) {
    if (isIOS) {
      // Show install button for iOS that reveals guide modal
      if (installContainer) installContainer.style.display = "flex";
      if (installAppBtn) {
        installAppBtn.addEventListener("click", () => {
          if (iosGuideModal) iosGuideModal.style.display = "flex";
        });
      }
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent browser mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPrompt = e;
      if (installContainer) installContainer.style.display = "flex";
    });

    if (installAppBtn && !isIOS) {
      installAppBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        installAppBtn.disabled = true;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          if (installContainer) installContainer.style.display = "none";
        }
        deferredPrompt = null;
        installAppBtn.disabled = false;
      });
    }

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      if (installContainer) installContainer.style.display = "none";
    });
  }

  if (iosModalClose && iosGuideModal) {
    iosModalClose.addEventListener("click", () => {
      iosGuideModal.style.display = "none";
    });
    iosGuideModal.addEventListener("click", (e) => {
      if (e.target === iosGuideModal) {
        iosGuideModal.style.display = "none";
      }
    });
  }

  // 3. Service Worker Registration & Update Lifecycle
  if ("serviceWorker" in navigator) {
    let newWorker = null;

    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then((registration) => {
        // If an updated worker is already waiting to activate
        if (registration.waiting) {
          newWorker = registration.waiting;
          if (updateBanner) updateBanner.style.display = "flex";
        }

        registration.addEventListener("updatefound", () => {
          newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New update available and ready to activate
                if (updateBanner) updateBanner.style.display = "flex";
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    if (updateReloadBtn) {
      updateReloadBtn.addEventListener("click", async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          } else if (newWorker) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          } else {
            window.location.reload();
          }
        } catch {
          window.location.reload();
        }
      });
    }
  }
}

// Kick off when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
