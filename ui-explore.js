// Phase 4: EXPLORE View — Multi-Dimensional Search & Composable Timetable Filtering
// Answers: "Where is Dilip Kumar teaching this week?", "Which classes have labs on Friday?", "Show me all 3rd semester mechanical classes."

import {
  searchAndFilterEntries,
  getSlotState
} from "./time.js";

/**
 * Calculates currently free / unscheduled faculty for real-time consultation or substitution.
 */
export function getAvailableFacultyNow(data, currentDate) {
  const slotState = getSlotState(data, currentDate || new Date());
  const { status, day, currentSlot, timeStr } = slotState;
  
  const allLecturerKeys = Object.keys(data.lecturers || {});
  if (status === "closed" || !data.days.includes(day)) {
    return {
      status,
      day,
      timeStr,
      activeSlot: null,
      isAvailable: false,
      message: "Campus is closed today (Sunday/Holiday).",
      busyFaculty: [],
      freeFaculty: allLecturerKeys.map(k => ({ code: k, ...data.lecturers[k] }))
    };
  }

  if (status === "before") {
    return {
      status,
      day,
      timeStr,
      activeSlot: null,
      isAvailable: true,
      message: "Classes have not started yet. All faculty are available.",
      busyFaculty: [],
      freeFaculty: allLecturerKeys.map(k => ({ code: k, ...data.lecturers[k] }))
    };
  }

  if (status === "after") {
    return {
      status,
      day,
      timeStr,
      activeSlot: null,
      isAvailable: true,
      message: "Schedule complete for today. All faculty finished teaching.",
      busyFaculty: [],
      freeFaculty: allLecturerKeys.map(k => ({ code: k, ...data.lecturers[k] }))
    };
  }

  if (status === "break") {
    return {
      status,
      day,
      timeStr,
      activeSlot: currentSlot,
      isAvailable: true,
      message: `Currently on ${currentSlot?.label || "Break"} (${currentSlot?.start}–${currentSlot?.end}). All faculty free.`,
      busyFaculty: [],
      freeFaculty: allLecturerKeys.map(k => ({ code: k, ...data.lecturers[k] }))
    };
  }

  // Active in-period: find faculty currently teaching
  const slotId = currentSlot ? currentSlot.id : "";
  const busyInitials = new Set();
  const busyDetails = {};

  (data.entries || []).forEach(e => {
    if (e.day === day) {
      const slots = data.slots;
      const startIdx = slots.findIndex(s => s.id === e.startSlot);
      const endIdx = slots.findIndex(s => s.id === e.endSlot);
      const curIdx = slots.findIndex(s => s.id === slotId);
      if (curIdx >= startIdx && curIdx <= endIdx) {
        (e.lecturers || []).forEach(l => {
          busyInitials.add(l);
          busyDetails[l] = { subject: e.subject, classId: e.classId, room: e.room };
        });
      }
    }
  });

  const freeFaculty = allLecturerKeys
    .filter(k => !busyInitials.has(k))
    .map(k => ({ code: k, ...data.lecturers[k] }))
    .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));

  const busyFaculty = Array.from(busyInitials).map(k => ({
    code: k,
    ...(data.lecturers[k] || {}),
    teaching: busyDetails[k]
  }));

  return {
    status,
    day,
    timeStr,
    activeSlot: currentSlot,
    isAvailable: true,
    message: `Period ${currentSlot.label} (${currentSlot.start}–${currentSlot.end}): ${freeFaculty.length} of ${allLecturerKeys.length} faculty members free right now.`,
    busyFaculty,
    freeFaculty
  };
}

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
 * Escape HTML utility
 */
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Renders HTML for result cards or empty state.
 */
function renderResultsFeedHtml(results, totalMatches, query, data) {
  if (totalMatches === 0) {
    return `
      <div class="feed-empty-state">
        <span class="empty-icon">🔍</span>
        <h4>No classes match "${escapeHtml(query)}"</h4>
        <p>Try searching with a subject code, faculty name, semester, branch, or day.</p>
        <button type="button" id="btn-empty-reset" class="btn-secondary" style="margin-top: 12px;">Clear Search</button>
      </div>
    `;
  }

  return results.map(item => {
    const entry = item.entry;
    const isLab = entry.type === "lab";
    const branchCode = item.branch.toLowerCase();
    const facultyDisplay = formatFaculty(entry.lecturers, data.lecturers);
    const classBadgeText = formatClassBadge(item.branch, item.sem, item.classId);

    return `
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
  }).join("");
}

/**
 * Renders the Explore search and filter interface into container.
 * Supports both full initial render and in-place DOM updates so that typing never causes
 * the search bar or virtual keyboard to close.
 */
export function renderExploreView(container, data, exploreState, onStateChange, filters = { branch: "ALL", lecturer: "ALL" }) {
  if (!container) return;

  const query = exploreState?.query || "";
  // Synchronize global header filters with explore state
  const branch = (filters && filters.branch && filters.branch !== "ALL")
    ? filters.branch
    : (exploreState?.branch || "ALL");
  const sem = exploreState?.sem || "ALL";
  const day = exploreState?.day || "ALL";
  const activityType = exploreState?.activityType || "ALL";
  const lecturer = (filters && filters.lecturer && filters.lecturer !== "ALL")
    ? filters.lecturer
    : (exploreState?.lecturer || "ALL");
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

  // Check if explore screen is already mounted in the container
  const existingScreen = container.querySelector(".explore-screen");
  if (existingScreen) {
    // -------------------------------------------------------------------------
    // IN-PLACE UPDATE:
    // Preserves the existing <input> element so focus is never lost and mobile
    // keyboards do not close between keystrokes / words.
    // -------------------------------------------------------------------------
    const searchInput = existingScreen.querySelector("#explore-search-input");
    const inputWrapper = existingScreen.querySelector(".explore-search-input-wrapper");
    const countBadge = existingScreen.querySelector(".explore-count-badge");
    const statusBar = existingScreen.querySelector(".explore-status-bar");
    const resultsFeed = existingScreen.querySelector(".explore-results-feed");

    // 1. Sync input value only when not actively focused by user
    if (searchInput && document.activeElement !== searchInput) {
      if (searchInput.value !== query) {
        searchInput.value = query;
      }
    }

    // 2. Toggle or update Clear (×) button in search bar
    if (inputWrapper) {
      let clearBtn = inputWrapper.querySelector("#explore-search-clear");
      if (query) {
        if (!clearBtn) {
          clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.id = "explore-search-clear";
          clearBtn.className = "search-clear-btn";
          clearBtn.setAttribute("aria-label", "Clear search");
          clearBtn.textContent = "×";
          clearBtn.addEventListener("click", () => {
            window.TimetableApp?.triggerHaptic?.(12);
            if (searchInput) {
              searchInput.value = "";
              searchInput.focus();
            }
            onStateChange({ ...exploreState, query: "" });
          });
          inputWrapper.appendChild(clearBtn);
        }
      } else if (clearBtn) {
        clearBtn.remove();
      }
    }

    // 3. Update Result Counter Badge
    if (countBadge) {
      countBadge.textContent = totalMatches === 1 ? '1 session found' : `${totalMatches} sessions found`;
    }

    // 4. Update Clear Search Action Button
    if (statusBar) {
      let clearAllBtn = statusBar.querySelector("#explore-clear-all-btn");
      if (isFiltered) {
        if (!clearAllBtn) {
          clearAllBtn = document.createElement("button");
          clearAllBtn.type = "button";
          clearAllBtn.id = "explore-clear-all-btn";
          clearAllBtn.className = "btn-clear-all-filters";
          clearAllBtn.title = "Clear search";
          clearAllBtn.textContent = "Clear Search";
          clearAllBtn.addEventListener("click", () => {
            window.TimetableApp?.triggerHaptic?.(16);
            if (window.TimetableApp?.resetFilters) {
              window.TimetableApp.resetFilters();
            }
            if (searchInput) {
              searchInput.value = "";
            }
            onStateChange({
              ...exploreState,
              query: "",
              branch: "ALL",
              lecturer: "ALL"
            });
          });
          statusBar.appendChild(clearAllBtn);
        }
      } else if (clearAllBtn) {
        clearAllBtn.remove();
      }
    }

    // 5. Update Active Filter Chips Tray (Branch / Faculty)
    let chipsTray = existingScreen.querySelector(".explore-active-chips-tray");
    const hasActiveChips = branch !== "ALL" || lecturer !== "ALL";
    if (hasActiveChips) {
      if (!chipsTray) {
        chipsTray = document.createElement("div");
        chipsTray.className = "explore-active-chips-tray";
        if (statusBar && statusBar.parentNode) {
          statusBar.parentNode.insertBefore(chipsTray, statusBar.nextSibling);
        }
      }
      chipsTray.innerHTML = `
        ${branch !== "ALL" ? `
          <button type="button" class="filter-dismiss-chip" data-clear="branch" title="Remove branch filter" aria-label="Remove branch filter ${branch}">
            <span>Branch: <strong>${branch}</strong></span>
            <span class="filter-dismiss-x" aria-hidden="true">×</span>
          </button>
        ` : ''}
        ${lecturer !== "ALL" ? `
          <button type="button" class="filter-dismiss-chip" data-clear="lecturer" title="Remove faculty filter" aria-label="Remove faculty filter ${lecturer}">
            <span>Faculty: <strong>${lecturer}</strong></span>
            <span class="filter-dismiss-x" aria-hidden="true">×</span>
          </button>
        ` : ''}
      `;
      chipsTray.querySelectorAll(".filter-dismiss-chip").forEach(chip => {
        chip.addEventListener("click", (e) => {
          e.stopPropagation();
          window.TimetableApp?.triggerHaptic?.(12);
          const clearType = chip.getAttribute("data-clear");
          if (clearType === "branch") {
            window.TimetableApp?.setBranchFilter?.("ALL");
          } else if (clearType === "lecturer") {
            window.TimetableApp?.setLecturerFilter?.("ALL");
          }
        });
      });
    } else if (chipsTray) {
      chipsTray.remove();
    }

    // 6. Update Results Feed Cards
    if (resultsFeed) {
      resultsFeed.innerHTML = renderResultsFeedHtml(results, totalMatches, query, data);
      const emptyResetBtn = resultsFeed.querySelector("#btn-empty-reset");
      if (emptyResetBtn) {
        emptyResetBtn.addEventListener("click", () => {
          window.TimetableApp?.triggerHaptic?.(16);
          if (window.TimetableApp?.resetFilters) {
            window.TimetableApp.resetFilters();
          }
          if (searchInput) {
            searchInput.value = "";
          }
          onStateChange({
            ...exploreState,
            query: "",
            branch: "ALL",
            lecturer: "ALL"
          });
        });
      }
    }

    return;
  }

  // ---------------------------------------------------------------------------
  // FULL INITIAL MOUNT (When switching tabs to Explore):
  // ---------------------------------------------------------------------------
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

      <!-- Result Counter, Free Faculty Quick Action & Clear Action -->
      <div class="explore-status-bar">
        <span class="explore-count-badge" role="status">
          ${totalMatches === 1 ? '1 session found' : `${totalMatches} sessions found`}
        </span>

        <div class="explore-status-actions">
          <button type="button" id="btn-toggle-free-faculty" class="btn-free-faculty-toggle" title="Check available faculty right now">
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
            <span>Free Faculty Now</span>
          </button>

          ${isFiltered ? `
            <button type="button" id="explore-clear-all-btn" class="btn-clear-all-filters" title="Clear search">
              Clear Search
            </button>
          ` : ""}
        </div>
      </div>

      <!-- Free Faculty Now Collapsible Panel -->
      <div id="free-faculty-panel" class="free-faculty-panel" style="display: none;" role="region" aria-label="Currently Available Faculty"></div>

      ${(branch !== "ALL" || lecturer !== "ALL") ? `
        <div class="explore-active-chips-tray">
          ${branch !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="branch" title="Remove branch filter" aria-label="Remove branch filter ${branch}">
              <span>Branch: <strong>${branch}</strong></span>
              <span class="filter-dismiss-x" aria-hidden="true">×</span>
            </button>
          ` : ''}
          ${lecturer !== "ALL" ? `
            <button type="button" class="filter-dismiss-chip" data-clear="lecturer" title="Remove faculty filter" aria-label="Remove faculty filter ${lecturer}">
              <span>Faculty: <strong>${lecturer}</strong></span>
              <span class="filter-dismiss-x" aria-hidden="true">×</span>
            </button>
          ` : ''}
        </div>
      ` : ''}

      <!-- Results Feed -->
      <div class="explore-results-feed" role="feed" aria-label="Search results">
        ${renderResultsFeedHtml(results, totalMatches, query, data)}
      </div>
    </div>
  `;

  container.innerHTML = html;

  attachExploreEventListeners(container, exploreState, onStateChange, data);
}

/**
 * Event handlers for Explore screen (full mount)
 */
function attachExploreEventListeners(container, exploreState, onStateChange, data) {
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
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      onStateChange({ ...exploreState, query: "" });
    });
  }

  // Clear search action button
  const clearAllBtn = container.querySelector("#explore-clear-all-btn");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      window.TimetableApp?.triggerHaptic?.(16);
      if (window.TimetableApp?.resetFilters) {
        window.TimetableApp.resetFilters();
      }
      if (searchInput) {
        searchInput.value = "";
      }
      onStateChange({
        ...exploreState,
        query: "",
        branch: "ALL",
        lecturer: "ALL"
      });
    });
  }

  // Empty state reset button
  const emptyResetBtn = container.querySelector("#btn-empty-reset");
  if (emptyResetBtn) {
    emptyResetBtn.addEventListener("click", () => {
      window.TimetableApp?.triggerHaptic?.(16);
      if (window.TimetableApp?.resetFilters) {
        window.TimetableApp.resetFilters();
      }
      if (searchInput) {
        searchInput.value = "";
      }
      onStateChange({
        ...exploreState,
        query: "",
        branch: "ALL",
        lecturer: "ALL"
      });
    });
  }

  // Active filter dismiss chips in tray
  container.querySelectorAll(".filter-dismiss-chip").forEach(chip => {
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      window.TimetableApp?.triggerHaptic?.(12);
      const clearType = chip.getAttribute("data-clear");
      if (clearType === "branch") {
        window.TimetableApp?.setBranchFilter?.("ALL");
      } else if (clearType === "lecturer") {
        window.TimetableApp?.setLecturerFilter?.("ALL");
      }
    });
  });

  // Free Faculty Now panel toggle & inspector
  const toggleFreeBtn = container.querySelector("#btn-toggle-free-faculty");
  const freePanel = container.querySelector("#free-faculty-panel");
  if (toggleFreeBtn && freePanel) {
    toggleFreeBtn.addEventListener("click", () => {
      window.TimetableApp?.triggerHaptic?.(12);
      const isVisible = freePanel.style.display !== "none";
      if (isVisible) {
        freePanel.style.display = "none";
        toggleFreeBtn.classList.remove("active");
      } else {
        const currentDate = window.TimetableApp?.getCurrentEffectiveDate ? window.TimetableApp.getCurrentEffectiveDate() : new Date();
        const activeData = window.TimetableApp?.getData ? window.TimetableApp.getData() : {};
        const avail = getAvailableFacultyNow(activeData, currentDate);
        
        freePanel.innerHTML = `
          <div class="free-panel-inner">
            <div class="free-panel-header">
              <div class="free-panel-title-group">
                <span class="free-panel-badge">👥 Available Faculty Right Now</span>
                <span class="free-panel-sub">${avail.message}</span>
              </div>
              <button type="button" class="free-panel-close-btn" aria-label="Close panel">×</button>
            </div>
            <div class="free-faculty-grid">
              ${avail.freeFaculty.length === 0 ? `
                <p class="free-empty-msg">No faculty members are unscheduled at this time.</p>
              ` : avail.freeFaculty.map(f => `
                <div class="free-faculty-card">
                  <div class="free-faculty-avatar">${f.code}</div>
                  <div class="free-faculty-info">
                    <span class="free-faculty-name">${f.name || f.code}</span>
                    <span class="free-faculty-dept">${f.department || 'Faculty'} · ${f.designation || 'Lecturer'}</span>
                  </div>
                  <button type="button" class="btn-inspect-faculty" data-code="${f.code}" title="View ${f.name || f.code}'s schedule">
                    Schedule
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        freePanel.style.display = "block";
        toggleFreeBtn.classList.add("active");

        const closeBtn = freePanel.querySelector(".free-panel-close-btn");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            window.TimetableApp?.triggerHaptic?.(10);
            freePanel.style.display = "none";
            toggleFreeBtn.classList.remove("active");
          });
        }

        freePanel.querySelectorAll(".btn-inspect-faculty").forEach(btn => {
          btn.addEventListener("click", () => {
            const code = btn.getAttribute("data-code");
            if (code) {
              window.TimetableApp?.triggerHaptic?.(14);
              window.TimetableApp?.setLecturerFilter?.(code);
              freePanel.style.display = "none";
              toggleFreeBtn.classList.remove("active");
            }
          });
        });
      }
    });
  }
}
