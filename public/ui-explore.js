// Phase 4: EXPLORE View — Multi-Dimensional Search & Composable Timetable Filtering
// Answers: "Where is Dilip Kumar teaching this week?", "Which classes have labs on Friday?", "Show me all 3rd semester mechanical classes."

import {
  searchAndFilterEntries
} from "./time.js";

/**
 * Format faculty names.
 */
function formatFaculty(initials, lecturersMap) {
  if (!initials || initials.length === 0) return "Self Study / Library";
  return initials.map(init => {
    const info = lecturersMap && lecturersMap[init];
    return info && info.name && info.name !== init ? `${info.name} (${init})` : init;
  }).join(", ");
}

/**
 * Format class and semester display e.g. "Mech • Sem III"
 */
function formatClassBadge(branch, sem, classId) {
  const branchMap = {
    CE: "Civil",
    CS: "CSE",
    EC: "ECE",
    EE: "EEE",
    ME: "Mech"
  };
  const bName = branchMap[branch] || branch;
  return `${bName} • Sem ${sem}`;
}

/**
 * Renders the Explore search and filter interface into container.
 */
export function renderExploreView(container, data, exploreState, onStateChange) {
  if (!container) return;

  const query = exploreState?.query || "";
  const branch = exploreState?.branch || "ALL";
  const sem = exploreState?.sem || "ALL";
  const day = exploreState?.day || "ALL";
  const activityType = exploreState?.activityType || "ALL";
  const lecturer = exploreState?.lecturer || "ALL";
  const classId = exploreState?.classId || "ALL";

  const { totalMatches, results } = searchAndFilterEntries(data, {
    query,
    branch,
    sem,
    day,
    activityType,
    lecturer,
    classId
  });

  const isFiltered = query !== "" ||
                     branch !== "ALL" ||
                     sem !== "ALL" ||
                     day !== "ALL" ||
                     activityType !== "ALL" ||
                     lecturer !== "ALL" ||
                     classId !== "ALL";

  let html = `
    <div class="explore-screen" role="region" aria-label="Explore Timetable">
      
      <!-- Search Bar -->
      <div class="explore-search-bar">
        <div class="explore-search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
          <input
            type="search"
            id="explore-search-input"
            class="explore-search-input"
            placeholder="Search subject, faculty, class, or day..."
            value="${escapeHtml(query)}"
            aria-label="Search timetable"
          />
          ${query ? `
            <button type="button" id="explore-search-clear" class="search-clear-btn" aria-label="Clear search">×</button>
          ` : ""}
        </div>
      </div>

      <!-- Composable Multi-Dimensional Filters Bar -->
      <div class="explore-filters-box">
        
        <!-- Filter Row 1: Branch Chips -->
        <div class="explore-filter-row">
          <span class="explore-filter-label">Branch:</span>
          <div class="explore-chips-group" role="group" aria-label="Branch filter">
            ${["ALL", "CE", "CS", "EC", "EE", "ME"].map(b => `
              <button
                type="button"
                class="explore-chip-btn ${branch === b ? 'active' : ''}"
                data-filter="branch"
                data-value="${b}"
                aria-pressed="${branch === b}"
              >${b}</button>
            `).join("")}
          </div>
        </div>

        <!-- Filter Row 2: Semester & Day Chips -->
        <div class="explore-filter-row">
          <span class="explore-filter-label">Sem:</span>
          <div class="explore-chips-group" role="group" aria-label="Semester filter">
            ${["ALL", "I", "III", "V"].map(s => `
              <button
                type="button"
                class="explore-chip-btn ${sem === s ? 'active' : ''}"
                data-filter="sem"
                data-value="${s}"
                aria-pressed="${sem === s}"
              >${s === 'ALL' ? 'All' : `Sem ${s}`}</button>
            `).join("")}
          </div>
        </div>

        <!-- Filter Row 3: Day Chips -->
        <div class="explore-filter-row">
          <span class="explore-filter-label">Day:</span>
          <div class="explore-chips-group" role="group" aria-label="Day filter">
            ${["ALL", ...data.days].map(d => `
              <button
                type="button"
                class="explore-chip-btn ${day === d ? 'active' : ''}"
                data-filter="day"
                data-value="${d}"
                aria-pressed="${day === d}"
              >${d}</button>
            `).join("")}
          </div>
        </div>

        <!-- Filter Row 4: Activity Type Chips -->
        <div class="explore-filter-row">
          <span class="explore-filter-label">Type:</span>
          <div class="explore-chips-group" role="group" aria-label="Activity type filter">
            ${[
              { val: "ALL", label: "All" },
              { val: "theory", label: "Theory" },
              { val: "lab", label: "Lab" }
            ].map(t => `
              <button
                type="button"
                class="explore-chip-btn ${activityType === t.val ? 'active' : ''}"
                data-filter="activityType"
                data-value="${t.val}"
                aria-pressed="${activityType === t.val}"
              >${t.label}</button>
            `).join("")}
          </div>
        </div>

        <!-- Filter Row 5: Faculty & Class Select Dropdowns -->
        <div class="explore-selects-row">
          <div class="explore-select-group">
            <label for="explore-lecturer-select">Faculty:</label>
            <select id="explore-lecturer-select" class="explore-select" aria-label="Filter by faculty">
              <option value="ALL" ${lecturer === 'ALL' ? 'selected' : ''}>All Faculty Members</option>
              ${Object.keys(data.lecturers).map(init => {
                const l = data.lecturers[init];
                const name = l && l.name && l.name !== init ? `${l.name} (${init})` : init;
                return `<option value="${init}" ${lecturer === init ? 'selected' : ''}>${name}</option>`;
              }).join("")}
            </select>
          </div>

          <div class="explore-select-group">
            <label for="explore-class-select">Class:</label>
            <select id="explore-class-select" class="explore-select" aria-label="Filter by class">
              <option value="ALL" ${classId === 'ALL' ? 'selected' : ''}>All Classes</option>
              ${data.classes.map(c => `
                <option value="${c.id}" ${classId === c.id ? 'selected' : ''}>${c.id} (${c.branch} Sem ${c.sem})</option>
              `).join("")}
            </select>
          </div>
        </div>

      </div>

      <!-- Active Filter Chips & Result Counter -->
      <div class="explore-status-bar">
        <span class="explore-count-badge" role="status">
          ${totalMatches === 1 ? '1 session found' : `${totalMatches} sessions found`}
        </span>

        ${isFiltered ? `
          <button type="button" id="explore-clear-all-btn" class="btn-clear-all-filters" title="Reset all filters">
            Clear All Filters
          </button>
        ` : ""}
      </div>

      <!-- Active Filter Dismissal Chips -->
      ${isFiltered ? `
        <div class="explore-active-chips-tray" aria-label="Active filters">
          ${query ? `
            <button type="button" class="filter-dismiss-chip" data-clear="query">
              Query: "${query}" <span class="filter-dismiss-x">×</span>
            </button>
          ` : ""}
          ${branch !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="branch">
              Branch: ${branch} <span class="filter-dismiss-x">×</span>
            </button>
          ` : ""}
          ${sem !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="sem">
              Sem: ${sem} <span class="filter-dismiss-x">×</span>
            </button>
          ` : ""}
          ${day !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="day">
              Day: ${day} <span class="filter-dismiss-x">×</span>
            </button>
          ` : ""}
          ${activityType !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="activityType">
              Type: ${activityType.toUpperCase()} <span class="filter-dismiss-x">×</span>
            </button>
          ` : ""}
          ${lecturer !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="lecturer">
              Faculty: ${data.lecturers[lecturer]?.name || lecturer} <span class="filter-dismiss-x">×</span>
            </button>
          ` : ""}
          ${classId !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="classId">
              Class: ${classId} <span class="filter-dismiss-x">×</span>
            </button>
          ` : ""}
        </div>
      ` : ""}

      <!-- Results Feed -->
      <div class="explore-results-feed" role="feed" aria-label="Search results">
  `;

  if (totalMatches === 0) {
    html += `
      <div class="feed-empty-state">
        <span class="empty-icon">🔍</span>
        <h4>No classes match the selected filters</h4>
        <p>Try searching with different keywords or clearing some filters to expand your results.</p>
        <button type="button" id="btn-empty-reset" class="btn-secondary" style="margin-top: 12px;">Reset All Filters</button>
      </div>
    `;
  } else {
    results.forEach(item => {
      const entry = item.entry;
      const isLab = entry.type === "lab";
      const branchCode = item.branch.toLowerCase();
      const facultyDisplay = formatFaculty(entry.lecturers, data.lecturers);
      const classBadgeText = formatClassBadge(item.branch, item.sem, item.classId);

      html += `
        <div class="timeline-entry-card branch-${branchCode} ${isLab ? 'card-lab' : 'card-theory'}">
          <div class="card-indicator-strip"></div>
          <div class="card-main-body">
            
            <!-- 1. Subject / Activity Title -->
            <div class="entry-subject-row">
              <h4 class="entry-subject-title">${entry.subject}</h4>
              <span class="activity-type-tag type-${entry.type}">${isLab ? 'LAB' : 'THEORY'}</span>
              ${entry.batch ? `<span class="batch-badge">Batch ${entry.batch}</span>` : ''}
            </div>

            <!-- 2. Branch • Semester • Class & 3. Faculty -->
            <div class="entry-meta-row">
              <span class="class-hierarchy-pill branch-pill-${branchCode}">
                ${classBadgeText} (${item.classId})
              </span>
              <span class="entry-faculty-text">
                <svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                ${facultyDisplay}
              </span>
            </div>

            <!-- 4. Day & Time Range -->
            <div class="entry-time-footer">
              <span class="entry-slot-duration">
                <strong>${item.day}</strong> • Period ${item.spanStartSlot.label}${item.isMultiSlot ? `–${item.spanEndSlot.label}` : ''} (${item.spanTimeStr} • ${item.duration})
              </span>
              ${entry.room ? `<span class="room-subtle-tag">${entry.room}</span>` : ''}
            </div>

          </div>
        </div>
      `;
    });
  }

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  attachExploreEventListeners(container, exploreState, onStateChange);
}

/**
 * Escape HTML utility
 */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Event handlers for Explore screen
 */
function attachExploreEventListeners(container, exploreState, onStateChange) {
  // Search input with debounce or direct input
  const searchInput = container.querySelector("#explore-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      onStateChange({ ...exploreState, query: e.target.value });
    });
  }

  // Clear search button (×)
  const clearSearchBtn = container.querySelector("#explore-search-clear");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      onStateChange({ ...exploreState, query: "" });
    });
  }

  // Filter chips (Branch, Sem, Day, Activity Type)
  const chipBtns = container.querySelectorAll(".explore-chip-btn");
  chipBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const filterKey = btn.getAttribute("data-filter");
      const filterVal = btn.getAttribute("data-value");
      onStateChange({ ...exploreState, [filterKey]: filterVal });
    });
  });

  // Lecturer select
  const lecSelect = container.querySelector("#explore-lecturer-select");
  if (lecSelect) {
    lecSelect.addEventListener("change", (e) => {
      onStateChange({ ...exploreState, lecturer: e.target.value });
    });
  }

  // Class select
  const classSelect = container.querySelector("#explore-class-select");
  if (classSelect) {
    classSelect.addEventListener("change", (e) => {
      onStateChange({ ...exploreState, classId: e.target.value });
    });
  }

  // Clear All button
  const clearAllBtn = container.querySelector("#explore-clear-all-btn");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      onStateChange({
        query: "",
        branch: "ALL",
        sem: "ALL",
        day: "ALL",
        activityType: "ALL",
        lecturer: "ALL",
        classId: "ALL"
      });
    });
  }

  // Empty state reset button
  const emptyResetBtn = container.querySelector("#btn-empty-reset");
  if (emptyResetBtn) {
    emptyResetBtn.addEventListener("click", () => {
      onStateChange({
        query: "",
        branch: "ALL",
        sem: "ALL",
        day: "ALL",
        activityType: "ALL",
        lecturer: "ALL",
        classId: "ALL"
      });
    });
  }

  // Individual dismiss chips
  const dismissChips = container.querySelectorAll(".filter-dismiss-chip");
  dismissChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const clearKey = chip.getAttribute("data-clear");
      const defaultVal = clearKey === "query" ? "" : "ALL";
      onStateChange({ ...exploreState, [clearKey]: defaultVal });
    });
  });
}
