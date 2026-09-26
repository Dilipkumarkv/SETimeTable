// Stage 2: Application Orchestrator, Shell Wiring & Filters
import { TIMETABLE } from "./data.js";
import { validateTimetable } from "./validate.js";
import {
  getSlotState,
  getCurrentEntries,
  getUpcomingEntries,
  getTodayTimeline,
  filterTodayTimeline,
  getDayGrid,
  getClassWeek,
  getLecturerWeek,
  filterCurrentEntries,
  filterUpcomingEntries,
  filterDayGrid,
  getDayFeed,
  searchAndFilterEntries
} from "./time.js";
import { renderTodayView } from "./ui-today.js";
import { renderWeekView } from "./ui-week.js";
import { renderExploreView } from "./ui-explore.js";
import { renderNowView } from "./ui-now.js";
import { renderNextView } from "./ui-next.js";
import { renderOverviewView } from "./ui-overview.js";

// Global application state (Filters in memory only)
const state = {
  activeTab: "today",
  isSimulating: false,
  simDay: "MON",
  simTime: "12:00",
  nowSearchQuery: "",
  filters: {
    branch: "ALL", // "ALL" | "CE" | "CS" | "EC" | "EE" | "ME"
    lecturer: "ALL" // "ALL" | lecturer initials
  },
  weekState: {
    scope: "all", // "all" | "class" | "lecturer"
    day: "MON",
    layout: "feed", // "feed" | "grid"
    selectedClass: "CS-III",
    selectedLecturer: "RBL"
  },
  exploreState: {
    query: "",
    branch: "ALL",
    sem: "ALL",
    day: "ALL",
    activityType: "ALL",
    lecturer: "ALL",
    classId: "ALL"
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
  getTodayTimeline,
  filterTodayTimeline,
  getDayGrid,
  getDayFeed,
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
  setWeekState(newState) {
    state.weekState = newState;
    renderFilterBar();
    renderCurrentTab();
  },
  getWeekState() {
    return { ...state.weekState };
  },
  searchAndFilterEntries,
  setExploreState(newState) {
    state.exploreState = newState;
    renderFilterBar();
    renderCurrentTab();
  },
  getExploreState() {
    return { ...state.exploreState };
  },
  setOverviewState(newState) {
    state.overviewState = newState;
    renderFilterBar();
    renderCurrentTab();
  },
  setSimulatedTime(day, time) {
    state.isSimulating = true;
    state.simDay = day;
    state.simTime = time;
    const simDaySelect = document.getElementById("sim-day");
    const simTimeInput = document.getElementById("sim-time");
    if (simDaySelect) simDaySelect.value = day;
    if (simTimeInput) simTimeInput.value = time;
    updateHeaderClock();
    renderCurrentTab();
  },
  resetSimulation() {
    state.isSimulating = false;
    const simDaySelect = document.getElementById("sim-day");
    const simTimeInput = document.getElementById("sim-time");
    if (simDaySelect) simDaySelect.value = "MON";
    if (simTimeInput) simTimeInput.value = "12:00";
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

  const simActiveBadge = document.getElementById("sim-active-badge");
  const simActiveText = document.getElementById("sim-active-text");

  if (state.isSimulating) {
    clockEl.innerHTML = `<span class="live-indicator sim-indicator"></span>SIM: ${dayName} ${h}:${m}`;
    if (simActiveBadge) {
      simActiveBadge.style.display = "flex";
      if (simActiveText) simActiveText.textContent = `${state.simDay} ${state.simTime}`;
    }
  } else {
    clockEl.innerHTML = `<span class="live-indicator"></span>${dayName} ${h}:${m}`;
    if (simActiveBadge) {
      simActiveBadge.style.display = "none";
    }
  }
}

function updateHeaderFiltersUI() {
  const branchValEl = document.getElementById("header-branch-val");
  const branchBtn = document.getElementById("header-branch-btn");
  const branchDropdown = document.getElementById("header-branch-dropdown");

  const facultyValEl = document.getElementById("header-faculty-val");
  const facultyBtn = document.getElementById("header-faculty-btn");
  const facultyDropdown = document.getElementById("header-faculty-dropdown");

  if (branchValEl) {
    branchValEl.textContent = state.filters.branch === "ALL" ? "All" : state.filters.branch;
  }
  if (branchBtn) {
    if (state.filters.branch !== "ALL") {
      branchBtn.classList.add("active-filter");
    } else {
      branchBtn.classList.remove("active-filter");
    }
  }
  if (branchDropdown) {
    branchDropdown.querySelectorAll(".header-dropdown-item").forEach(item => {
      const b = item.getAttribute("data-branch");
      if (b === state.filters.branch) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  if (facultyValEl) {
    facultyValEl.textContent = state.filters.lecturer === "ALL" ? "All" : state.filters.lecturer;
  }
  if (facultyBtn) {
    if (state.filters.lecturer !== "ALL") {
      facultyBtn.classList.add("active-filter");
    } else {
      facultyBtn.classList.remove("active-filter");
    }
  }

  if (facultyDropdown && state.data && state.data.lecturers) {
    const lecturerKeys = Object.keys(state.data.lecturers).sort();
    facultyDropdown.innerHTML = `
      <button type="button" class="header-dropdown-item ${state.filters.lecturer === "ALL" ? "active" : ""}" data-lecturer="ALL">
        All Faculty
      </button>
      ${lecturerKeys.map(init => `
        <button type="button" class="header-dropdown-item ${state.filters.lecturer === init ? "active" : ""}" data-lecturer="${init}">
          ${init}
        </button>
      `).join("")}
    `;

    facultyDropdown.querySelectorAll(".header-dropdown-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const l = item.getAttribute("data-lecturer");
        window.TimetableApp.setLecturerFilter(l);
        if (facultyDropdown) facultyDropdown.style.display = "none";
        if (facultyBtn) facultyBtn.setAttribute("aria-expanded", "false");
      });
    });
  }
}

/**
 * Updates header collapsible filters and ensures redundant filter bar below info bar is hidden.
 */
function renderFilterBar() {
  updateHeaderFiltersUI();
  const filterContainer = document.getElementById("global-filter-bar");
  if (filterContainer) {
    filterContainer.style.display = "none";
    filterContainer.innerHTML = "";
  }
}

/**
 * Handles individual active filter dismissal chip clicks (.filter-dismiss-chip with data-clear).
 */
function handleFilterDismiss(target) {
  if (!target) return;
  const chip = target.closest(".filter-dismiss-chip");
  if (!chip) return;
  const clearType = chip.getAttribute("data-clear");
  if (clearType === "branch") {
    window.TimetableApp.setBranchFilter("ALL");
  } else if (clearType === "lecturer") {
    window.TimetableApp.setLecturerFilter("ALL");
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

  if (state.activeTab === "today" || state.activeTab === "now") {
    renderTodayView(mainContent, state.data, effDate, state.filters);
  } else if (state.activeTab === "week") {
    renderWeekView(
      mainContent,
      state.data,
      effDate,
      state.weekState,
      (newWeekState) => {
        state.weekState = newWeekState;
        renderCurrentTab();
      },
      state.filters
    );
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
  } else if (state.activeTab === "explore") {
    renderExploreView(
      mainContent,
      state.data,
      state.exploreState,
      (newExploreState) => {
        state.exploreState = newExploreState;
        renderCurrentTab();
      }
    );
  } else if (state.activeTab === "next") {
    renderNextView(mainContent, state.data, effDate, state.filters);
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

  // Top Header Dev Toggle & Quick Reset
  const toggleSimBtn = document.getElementById("toggle-sim-btn");
  const simPanel = document.getElementById("sim-panel");
  if (toggleSimBtn && simPanel) {
    toggleSimBtn.addEventListener("click", () => {
      const isCollapsed = simPanel.classList.toggle("collapsed");
      toggleSimBtn.setAttribute("aria-expanded", String(!isCollapsed));
    });
  }

  const quickResetBtn = document.getElementById("btn-quick-reset-sim");
  if (quickResetBtn) {
    quickResetBtn.addEventListener("click", () => {
      window.TimetableApp.resetSimulation();
    });
  }

  // Time simulation collapsible toggle (clickable & keyboard accessible)
  const simHeader = document.getElementById("sim-header");
  const simControls = document.getElementById("sim-controls");
  const simToggleText = document.getElementById("sim-toggle-text");
  const toggleSim = () => {
    const isHidden = simControls.style.display === "none";
    simControls.style.display = isHidden ? "flex" : "none";
    simHeader.setAttribute("aria-expanded", isHidden ? "true" : "false");
    if (simToggleText) {
      simToggleText.textContent = isHidden ? "Hide Controls" : "Show Controls";
    }
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

  // Simulation Quick Preset Buttons
  const presetBtns = document.querySelectorAll(".sim-preset-btn");
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const day = btn.getAttribute("data-day");
      const time = btn.getAttribute("data-time");
      if (day && time) {
        window.TimetableApp.setSimulatedTime(day, time);
      }
    });
  });

  // Setup header dropdowns for branch and faculty
  setupHeaderDropdowns();
}

function setupHeaderDropdowns() {
  const branchBtn = document.getElementById("header-branch-btn");
  const branchDropdown = document.getElementById("header-branch-dropdown");
  const facultyBtn = document.getElementById("header-faculty-btn");
  const facultyDropdown = document.getElementById("header-faculty-dropdown");

  function closeAllDropdowns() {
    if (branchDropdown) branchDropdown.style.display = "none";
    if (branchBtn) branchBtn.setAttribute("aria-expanded", "false");
    if (facultyDropdown) facultyDropdown.style.display = "none";
    if (facultyBtn) facultyBtn.setAttribute("aria-expanded", "false");
  }

  if (branchBtn && branchDropdown) {
    branchBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = branchDropdown.style.display === "flex";
      closeAllDropdowns();
      if (!isOpen) {
        branchDropdown.style.display = "flex";
        branchBtn.setAttribute("aria-expanded", "true");
      }
    });

    branchDropdown.querySelectorAll(".header-dropdown-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const b = item.getAttribute("data-branch");
        window.TimetableApp.setBranchFilter(b);
        closeAllDropdowns();
      });
    });
  }

  if (facultyBtn && facultyDropdown) {
    facultyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = facultyDropdown.style.display === "flex";
      closeAllDropdowns();
      if (!isOpen) {
        facultyDropdown.style.display = "flex";
        facultyBtn.setAttribute("aria-expanded", "true");
      }
    });
  }

  // Close dropdowns on outside click or escape
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".header-menu-container")) {
      closeAllDropdowns();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllDropdowns();
    }
  });
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

  // Step 2: Sample Data Banner suppressed
  const banner = document.getElementById("sample-banner");
  if (banner) {
    banner.style.display = "none";
  }

  // Step 3: Setup interactions
  setupEventListeners();

  // Step 4: Setup PWA capabilities (Service Worker, In-App Install Prompt, Offline status)
  setupPWA();

  // Default to real live device clock (real-time mode)
  state.isSimulating = false;

  updateHeaderFiltersUI();
  updateHeaderClock();
  renderCurrentTab();

  // Clock tick interval (every 1 second update header live clock, re-render view if minute changes)
  let lastMinute = -1;
  setInterval(() => {
    updateHeaderClock();
    if (!state.isSimulating) {
      const effDate = getCurrentEffectiveDate();
      const currentMin = effDate.getMinutes();
      if (currentMin !== lastMinute) {
        lastMinute = currentMin;
        renderCurrentTab();
      }
    }
  }, 1000);
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
        // Force periodic background update check
        registration.update();

        // If an updated worker is already waiting to activate, trigger immediate activation
        if (registration.waiting) {
          newWorker = registration.waiting;
          newWorker.postMessage({ type: "SKIP_WAITING" });
          if (updateBanner) updateBanner.style.display = "flex";
        }

        registration.addEventListener("updatefound", () => {
          newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New update available, activate immediately and alert user
                newWorker.postMessage({ type: "SKIP_WAITING" });
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
      updateReloadBtn.addEventListener("click", () => {
        if (newWorker) {
          newWorker.postMessage({ type: "SKIP_WAITING" });
        } else {
          window.location.reload();
        }
      });
    }
  }
}

// Bootstrap on DOMContentLoaded or immediately if already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
