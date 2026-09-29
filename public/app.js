// Stage 2: Application Orchestrator, Shell Wiring & Filters
import {
  TIMETABLE,
  timetableStorage,
  saveTimetableData,
  getTimetableData,
  clearTimetableData
} from "./data.js";
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

/**
 * Triggers subtle tactile haptic feedback via window.navigator.vibrate() on mobile devices.
 * Gracefully no-ops if unsupported or blocked by permissions.
 * @param {number|number[]} pattern - Vibration duration in ms or pattern array
 */
export function triggerHaptic(pattern = 14) {
  try {
    if (typeof window !== "undefined" && window.navigator && typeof window.navigator.vibrate === "function") {
      window.navigator.vibrate(pattern);
    }
  } catch {
    // Ignore environments where navigator.vibrate is restricted or throws
  }
}

/**
 * Checks whether Developer / Simulation Mode is active.
 * Production mode (default): Dev panel & toggle button are hidden. Timetable uses real clock.
 * Dev mode: Enabled via ?dev=true / ?sim=true URL parameter, or localStorage.getItem("devMode") === "true".
 */
export function isDevModeActive() {
  try {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "true" || params.get("sim") === "true") {
        return true;
      }
      if (params.get("dev") === "false" || params.get("sim") === "false") {
        return false;
      }
    }
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("devMode");
      if (stored === "true") return true;
      if (stored === "false") return false;
    }
  } catch (e) {
    // Fallback safely to production mode
  }
  return false;
}

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
  triggerHaptic,
  vibrate: triggerHaptic,
  getFilters() {
    return { ...state.filters };
  },
  setBranchFilter(branch) {
    triggerHaptic(14);
    state.filters.branch = branch;
    renderFilterBar();
    renderCurrentTab();
  },
  setLecturerFilter(lecturer) {
    triggerHaptic(14);
    state.filters.lecturer = lecturer;
    renderFilterBar();
    renderCurrentTab();
  },
  resetFilters() {
    triggerHaptic(22);
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
  getData() {
    return state.data;
  },
  getCurrentEffectiveDate,
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
  },
  isDevMode: isDevModeActive,
  enableDevMode() {
    try {
      localStorage.setItem("devMode", "true");
    } catch (e) {}
    if (typeof window !== "undefined") window.location.reload();
  },
  disableDevMode() {
    try {
      localStorage.removeItem("devMode");
    } catch (e) {}
    if (typeof window !== "undefined") window.location.reload();
  },
  storage: timetableStorage,
  saveTimetableData,
  getTimetableData,
  clearTimetableData
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
  if (!clockEl) return;
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
      },
      state.filters
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
      triggerHaptic(10);
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
  const isDev = isDevModeActive();
  const toggleSimBtn = document.getElementById("toggle-sim-btn");
  const simPanel = document.getElementById("sim-panel");

  if (!isDev) {
    // Production Mode: Hide developer controls & drawer completely from end users
    if (toggleSimBtn) {
      toggleSimBtn.style.display = "none";
      toggleSimBtn.setAttribute("aria-hidden", "true");
    }
    if (simPanel) {
      simPanel.style.display = "none";
      simPanel.setAttribute("aria-hidden", "true");
    }
    // Guarantee real-time clock in production mode
    state.isSimulating = false;
  } else {
    // Developer Mode: Reveal Settings & Simulation Drawer
    if (toggleSimBtn) {
      toggleSimBtn.style.display = "inline-flex";
      toggleSimBtn.removeAttribute("aria-hidden");
    }
    if (simPanel) {
      simPanel.style.display = "";
      simPanel.removeAttribute("aria-hidden");
    }
    console.info("🛠️ [Timetable Dev Mode Active] Developer controls enabled. (To disable: ?dev=false or TimetableApp.disableDevMode())");
  }

  if (toggleSimBtn && simPanel) {
    toggleSimBtn.addEventListener("click", () => {
      triggerHaptic(12);
      const isCollapsed = simPanel.classList.toggle("collapsed");
      toggleSimBtn.setAttribute("aria-expanded", String(!isCollapsed));
    });
  }

  const quickResetBtn = document.getElementById("btn-quick-reset-sim");
  if (quickResetBtn) {
    quickResetBtn.addEventListener("click", () => {
      triggerHaptic(18);
      window.TimetableApp.resetSimulation();
    });
  }

  // Time simulation collapsible toggle (clickable & keyboard accessible)
  const simHeader = document.getElementById("sim-header");
  const simControls = document.getElementById("sim-controls");
  const simToggleText = document.getElementById("sim-toggle-text");
  const toggleSim = () => {
    triggerHaptic(10);
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
      triggerHaptic(16);
      state.isSimulating = true;
      state.simDay = simDaySelect.value;
      state.simTime = simTimeInput.value || "09:45";
      updateHeaderClock();
      renderCurrentTab();
    });
  }

  if (simResetBtn) {
    simResetBtn.addEventListener("click", () => {
      triggerHaptic(18);
      window.TimetableApp.resetSimulation();
    });
  }

  // Simulation Quick Preset Buttons
  const presetBtns = document.querySelectorAll(".sim-preset-btn");
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      triggerHaptic(14);
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
      triggerHaptic(8);
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
      triggerHaptic(8);
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

  // Step 5: Cache master timetable into IndexedDB / localStorage for offline availability
  if (typeof window !== "undefined") {
    timetableStorage.save(state.data).catch(() => {});
  }

  // Default to real live device clock (real-time mode)
  state.isSimulating = false;

  updateHeaderFiltersUI();
  updateHeaderClock();
  renderCurrentTab();

  // Clock tick interval (every 1 second update header live clock, re-render view if minute changes or day crosses midnight)
  let lastMinute = -1;
  let lastDayStr = "";
  setInterval(() => {
    updateHeaderClock();
    if (!state.isSimulating) {
      const effDate = getCurrentEffectiveDate();
      const currentMin = effDate.getMinutes();
      const currentDayStr = effDate.toDateString();
      if (currentMin !== lastMinute || currentDayStr !== lastDayStr) {
        lastMinute = currentMin;
        lastDayStr = currentDayStr;
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
  const pwaModal = document.getElementById("pwa-install-modal") || document.getElementById("ios-guide-modal");
  const pwaModalClose = document.getElementById("pwa-modal-close") || document.getElementById("ios-modal-close");
  const modalNativeInstallBtn = document.getElementById("modal-native-install-btn");
  const installGuideIos = document.getElementById("install-guide-ios");
  const installGuideAndroid = document.getElementById("install-guide-android");
  const installGuideDesktop = document.getElementById("install-guide-desktop");
  const installGuideIframe = document.getElementById("install-guide-iframe");
  const btnOpenTabLink = document.getElementById("btn-open-tab-link");
  const modalDownloadOfflineBtn = document.getElementById("modal-download-offline-file-btn");

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

  // 2. In-App Install Prompt & Themed Window Modal
  let deferredPrompt = null;
  const isAndroidApp = typeof document !== "undefined" && document.referrer && document.referrer.includes("android-app://");
  const isStandalone =
    (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) ||
    (typeof window !== "undefined" && window.navigator && window.navigator.standalone === true) ||
    isAndroidApp;

  const isIOS = typeof window !== "undefined" && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isDesktop = typeof window !== "undefined" && !(/android|iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));

  // Hide install button if running in standalone window / Android WebAPK
  if (isStandalone) {
    if (installContainer) installContainer.style.display = "none";
  }

  // Check Android getInstalledRelatedApps API if available
  if (typeof window !== "undefined" && window.navigator && "getInstalledRelatedApps" in window.navigator) {
    try {
      window.navigator.getInstalledRelatedApps().then((apps) => {
        if (apps && apps.length > 0 && installContainer) {
          installContainer.style.display = "none";
        }
      }).catch(() => {});
    } catch {}
  }

  const isInIframe = typeof window !== "undefined" && window.self !== window.top;
  if (btnOpenTabLink) {
    btnOpenTabLink.href = window.location.href;
  }

  function showInstallModal() {
    if (!pwaModal) return;

    if (btnOpenTabLink) {
      btnOpenTabLink.href = window.location.href;
    }

    // Hide all guides first
    if (installGuideIos) installGuideIos.style.display = "none";
    if (installGuideAndroid) installGuideAndroid.style.display = "none";
    if (installGuideDesktop) installGuideDesktop.style.display = "none";
    if (installGuideIframe) installGuideIframe.style.display = "none";

    if (isInIframe) {
      if (installGuideIframe) installGuideIframe.style.display = "block";
    }

    if (isIOS) {
      if (installGuideIos) installGuideIos.style.display = "block";
      if (modalNativeInstallBtn) modalNativeInstallBtn.style.display = "none";
    } else if (isDesktop) {
      if (installGuideDesktop) installGuideDesktop.style.display = "block";
      if (modalNativeInstallBtn) {
        modalNativeInstallBtn.style.display = "inline-flex";
        const txt = modalNativeInstallBtn.querySelector("#modal-install-text") || modalNativeInstallBtn;
        if (txt) txt.textContent = deferredPrompt ? "Install App (1-Click)" : "Add to Home Screen";
      }
    } else {
      // Android / Other mobile
      if (installGuideAndroid) installGuideAndroid.style.display = "block";
      if (modalNativeInstallBtn) {
        modalNativeInstallBtn.style.display = "inline-flex";
        const txt = modalNativeInstallBtn.querySelector("#modal-install-text") || modalNativeInstallBtn;
        if (txt) txt.textContent = deferredPrompt ? "Install App (1-Click)" : "Add to Home Screen";
      }
    }
    pwaModal.style.display = "flex";
  }

  function hideInstallModal() {
    if (pwaModal) pwaModal.style.display = "none";
  }

  async function triggerNativePrompt() {
    if (deferredPrompt) {
      try {
        console.log("[PWA] Invoking deferredPrompt.prompt()");
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log(`[PWA] User choice outcome: ${choice ? choice.outcome : "unknown"}`);
        if (choice && choice.outcome === "accepted") {
          try {
            localStorage.setItem("timetable_pwa_installed", "true");
          } catch {}
          if (installContainer) installContainer.style.display = "none";
          hideInstallModal();
        }
      } catch (err) {
        console.warn("[PWA] Prompt error:", err);
      }
      deferredPrompt = null;
    } else {
      // Deferred prompt is NOT available. Do not pretend native install was triggered.
      console.log("[PWA] Native prompt not available, showing guided install modal");
      showInstallModal();
    }
  }

  // Universal Standalone Offline App File Download Handler (Blob-Based)
  async function downloadOfflineAppFile() {
    triggerHaptic(14);
    const span = modalDownloadOfflineBtn ? modalDownloadOfflineBtn.querySelector("span") : null;
    if (span) span.textContent = "⏳ Preparing Download...";

    try {
      let htmlContent = "";
      try {
        const response = await fetch("/SET_Polytechnic_Timetable_App.html", { cache: "no-store" });
        if (response.ok) {
          htmlContent = await response.text();
        }
      } catch (e) {
        console.warn("Fetch failed, will use current DOM:", e);
      }

      if (!htmlContent || htmlContent.length < 5000) {
        htmlContent = "<!doctype html>\n" + document.documentElement.outerHTML;
      }

      // Using application/octet-stream forces browser to save file to disk on Android & Windows
      const blob = new Blob([htmlContent], { type: "application/octet-stream" });
      const blobUrl = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");
      downloadLink.style.display = "none";
      downloadLink.href = blobUrl;
      downloadLink.setAttribute("download", "SET_Polytechnic_Timetable_App.html");
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        if (downloadLink.parentNode) {
          downloadLink.parentNode.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobUrl);
      }, 2000);

      if (span) {
        span.textContent = "✓ File Downloaded!";
        setTimeout(() => {
          span.textContent = "Download Offline App (.html)";
        }, 3500);
      }
    } catch (err) {
      console.error("Blob download failed, using navigation fallback:", err);
      if (span) span.textContent = "Download Offline App (.html)";
      window.location.href = "/SET_Polytechnic_Timetable_App.html";
    }
  }

  if (modalDownloadOfflineBtn) {
    modalDownloadOfflineBtn.addEventListener("click", () => {
      downloadOfflineAppFile();
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent default browser banner and save the prompt event
    e.preventDefault();
    deferredPrompt = e;
    console.log("[PWA] beforeinstallprompt fired");
    if (!isStandalone && installContainer) {
      installContainer.style.display = "flex";
    }
    if (modalNativeInstallBtn) {
      modalNativeInstallBtn.style.display = "inline-flex";
      const txt = modalNativeInstallBtn.querySelector("#modal-install-text") || modalNativeInstallBtn;
      if (txt) txt.textContent = "Install App (1-Click)";
    }
  });

  if (installAppBtn) {
    installAppBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerHaptic(14);
      if (deferredPrompt) {
        triggerNativePrompt();
      } else {
        showInstallModal();
      }
    });
  }

  if (modalNativeInstallBtn) {
    modalNativeInstallBtn.addEventListener("click", () => {
      triggerHaptic(14);
      triggerNativePrompt();
    });
  }

  if (pwaModalClose) {
    pwaModalClose.addEventListener("click", () => {
      triggerHaptic(10);
      hideInstallModal();
    });
  }

  if (pwaModal) {
    pwaModal.addEventListener("click", (e) => {
      if (e.target === pwaModal) {
        hideInstallModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pwaModal && pwaModal.style.display === "flex") {
      hideInstallModal();
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    try {
      localStorage.setItem("timetable_pwa_installed", "true");
    } catch {}
    if (installContainer) installContainer.style.display = "none";
    hideInstallModal();
  });

  // 3. Service Worker Registration & Update Lifecycle
  if ("serviceWorker" in navigator) {
    let newWorker = null;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => navigator.serviceWorker.register("./sw.js", { scope: "./" }))
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

  // Phase 15: PWA Installability Diagnostics Function (factual, observable)
  window.__pwaDiagnostics = async function () {
    const isSecure = window.isSecureContext === true;
    let manifestFetch = "FAIL";
    let manifestValid = "FAIL";
    let manifestData = null;
    try {
      const mRes = await fetch("/manifest.webmanifest");
      if (mRes.ok) {
        manifestFetch = "PASS";
        manifestData = await mRes.json();
        if (manifestData && manifestData.name && manifestData.icons && manifestData.start_url) {
          manifestValid = "PASS";
        }
      }
    } catch (e) {
      manifestFetch = "FAIL";
    }

    const swSupported = "serviceWorker" in navigator;
    let swRegistered = "FAIL";
    let swActive = "FAIL";
    let swScope = "N/A";
    if (swSupported) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          swRegistered = "PASS";
          swScope = reg.scope;
          if (reg.active) swActive = "PASS";
        }
      } catch (e) {}
    }

    const pageControlled = navigator.serviceWorker && navigator.serviceWorker.controller ? "PASS" : "FAIL";
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator && window.navigator.standalone === true);

    const report = {
      "Secure Context": isSecure ? "PASS" : "FAIL",
      "Current URL": window.location.href,
      "Manifest URL": "/manifest.webmanifest",
      "Manifest Fetch": manifestFetch,
      "Manifest Valid": manifestValid,
      "Service Worker Supported": swSupported ? "PASS" : "FAIL",
      "Service Worker Registered": swRegistered,
      "Service Worker Active": swActive,
      "Service Worker Scope": swScope,
      "Page Controlled": pageControlled,
      "Display Mode": isStandaloneMode ? "standalone" : "browser",
      "Standalone": isStandaloneMode ? "PASS" : "FAIL",
      "beforeinstallprompt": deferredPrompt ? "FIRED" : "NOT FIRED"
    };

    console.table(report);
    return report;
  };
}

// Bootstrap on DOMContentLoaded or immediately if already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
