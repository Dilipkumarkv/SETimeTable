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
            autocomplete="off"
          />
          ${query ? `
            <button type="button" id="explore-search-clear" class="search-clear-btn" aria-label="Clear search">×</button>
          ` : ""}
        </div>
      </div>

      <!-- Result Counter & Clear Action -->
      <div class="explore-status-bar">
        <span class="explore-count-badge" role="status">
          ${totalMatches === 1 ? '1 session found' : `${totalMatches} sessions found`}
        </span>

        ${isFiltered ? `
          <button type="button" id="explore-clear-all-btn" class="btn-clear-all-filters" title="Clear search">
            Clear Search
          </button>
        ` : ""}
      </div>

      <!-- Results Feed -->
      <div class="explore-results-feed" role="feed" aria-label="Search results">
  `;

  if (totalMatches === 0) {
    html += `
      <div class="feed-empty-state">
        <span class="empty-icon">🔍</span>
        <h4>No classes match "${escapeHtml(query)}"</h4>
        <p>Try searching with a subject code, faculty name, semester, branch, or day.</p>
        <button type="button" id="btn-empty-reset" class="btn-secondary" style="margin-top: 12px;">Clear Search</button>
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
  // Search input with instant reactive input
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
      window.TimetableApp?.triggerHaptic?.(12);
      onStateChange({ ...exploreState, query: "" });
    });
  }

  // Clear search action button
  const clearAllBtn = container.querySelector("#explore-clear-all-btn");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      window.TimetableApp?.triggerHaptic?.(16);
      onStateChange({
        ...exploreState,
        query: ""
      });
    });
  }

  // Empty state reset button
  const emptyResetBtn = container.querySelector("#btn-empty-reset");
  if (emptyResetBtn) {
    emptyResetBtn.addEventListener("click", () => {
      window.TimetableApp?.triggerHaptic?.(16);
      onStateChange({
        ...exploreState,
        query: ""
      });
    });
  }
}
