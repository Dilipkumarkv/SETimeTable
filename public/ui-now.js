// Stage 2: Now View Renderer with Branch Color Tokens & Visual Hierarchy
// Displays live status for every class grouped by branch.
// Handles all states:
// - "before": Before college starts
// - "in-period": Active teaching period (theory, lab batches stacked, free)
// - "break": Lunch or inter-period break
// - "after": After college hours
// - "closed": Sunday or non-working day
// Search filter: Class / Lecturer / Subject
// Filters: Branch (All / CE / CS / EC / EE / ME) and Lecturer

import { filterCurrentEntries, getTimeRemaining } from "./time.js";

export function renderNowView(container, data, simDate, searchQuery = "", filters = { branch: "ALL", lecturer: "ALL" }) {
  container.innerHTML = "";

  const q = searchQuery.trim().toLowerCase();

  // Pure data lookup
  const rawEntries = window.TimetableApp.getCurrentEntries(data, simDate);
  const currentEntries = filterCurrentEntries(rawEntries, filters);
  const slotState = window.TimetableApp.getSlotState(data, simDate);

  // Compute remaining time for active period
  let timeRem = { diffMins: 0, text: "" };
  if (slotState.status === "in-period" && slotState.currentSlot) {
    timeRem = getTimeRemaining(slotState.currentSlot.end, slotState.timeStr);
  }

  // Status banner describing college-wide state
  const statusBanner = document.createElement("div");
  statusBanner.className = "college-status-banner";

  if (slotState.status === "in-period" && slotState.currentSlot) {
    statusBanner.classList.add("status-live-banner");
    const remBadge = timeRem.text ? `<span class="time-countdown-pill">${timeRem.text}</span>` : "";
    statusBanner.innerHTML = `
      <div class="college-status-title">
        <span class="live-tag">LIVE</span> Active Period: ${slotState.currentSlot.label} (${slotState.currentSlot.start} – ${slotState.currentSlot.end})
      </div>
      <div class="college-status-desc">Day: ${slotState.day} • College is in session • Ends at ${slotState.currentSlot.end} ${remBadge}</div>
    `;
  } else if (slotState.status === "break" && slotState.currentSlot) {
    const breakRem = getTimeRemaining(slotState.currentSlot.end, slotState.timeStr);
    const breakPill = breakRem.text ? `<span class="time-countdown-pill">${breakRem.text}</span>` : "";
    statusBanner.classList.add("status-break-banner");
    statusBanner.innerHTML = `
      <div class="college-status-title">Lunch Break (${slotState.currentSlot.start} – ${slotState.currentSlot.end})</div>
      <div class="college-status-desc">Day: ${slotState.day} • Classes resume at ${slotState.currentSlot.end} ${breakPill}</div>
    `;
  } else if (slotState.status === "before") {
    statusBanner.classList.add("status-closed-banner");
    const nextStart = slotState.nextSlot ? slotState.nextSlot.start : "09:45";
    statusBanner.innerHTML = `
      <div class="college-status-title">Before College Hours</div>
      <div class="college-status-desc">Day: ${slotState.day} • First period begins at ${nextStart}</div>
    `;
  } else if (slotState.status === "after") {
    statusBanner.classList.add("status-closed-banner");
    statusBanner.innerHTML = `
      <div class="college-status-title">College Hours Over</div>
      <div class="college-status-desc">Day: ${slotState.day} • All scheduled classes have concluded for today</div>
    `;
  } else {
    // closed / Sunday
    statusBanner.classList.add("status-closed-banner");
    statusBanner.innerHTML = `
      <div class="college-status-title">College Closed (${slotState.day})</div>
      <div class="college-status-desc">No classes scheduled on this day</div>
    `;
  }

  container.appendChild(statusBanner);

  // Group classes by branch
  const branches = ["CE", "CS", "EC", "EE", "ME"];
  const branchMap = new Map();
  branches.forEach(b => branchMap.set(b, []));

  currentEntries.forEach(item => {
    if (!branchMap.has(item.branch)) {
      branchMap.set(item.branch, []);
    }
    branchMap.get(item.branch).push(item);
  });

  // Calculate filtered counts
  let totalVisibleCards = 0;
  const filteredBranchMap = new Map();

  branches.forEach(branch => {
    const classList = branchMap.get(branch) || [];
    const filtered = classList.filter(item => {
      if (!q) return true;
      if (item.classId.toLowerCase().includes(q)) return true;
      if (item.branch.toLowerCase().includes(q)) return true;

      return item.entries.some(e => {
        if (e.subject.toLowerCase().includes(q)) return true;
        return e.lecturers.some(l => {
          if (l.toLowerCase().includes(q)) return true;
          const lecturerObj = data.lecturers[l];
          if (lecturerObj && lecturerObj.name && lecturerObj.name.toLowerCase().includes(q)) return true;
          return false;
        });
      });
    });

    filteredBranchMap.set(branch, filtered);
    totalVisibleCards += filtered.length;
  });

  const totalPossibleCards = currentEntries.length;

  // Search input bar with Clear button and live count chip
  const searchBar = document.createElement("div");
  searchBar.className = "search-bar";
  searchBar.innerHTML = `
    <div class="search-input-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        type="text"
        class="search-input"
        id="now-search-input"
        placeholder="Search class, subject, lecturer..."
        value="${escapeHtml(searchQuery)}"
        aria-label="Search current classes"
      />
      ${searchQuery ? `<button type="button" id="search-clear-btn" class="search-clear-btn" aria-label="Clear search">×</button>` : ""}
    </div>
    <div class="search-meta">
      <span class="search-count-chip" id="now-search-count">${totalVisibleCards} of ${totalPossibleCards} classes</span>
    </div>
  `;
  container.appendChild(searchBar);

  const searchInput = searchBar.querySelector("#now-search-input");
  searchInput.addEventListener("input", (e) => {
    window.TimetableApp.setSearchQuery(e.target.value);
  });

  const clearSearchBtn = searchBar.querySelector("#search-clear-btn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      window.TimetableApp.setSearchQuery("");
      searchInput.focus();
    });
  }

  // Quick-Jump Branch Anchor Bar
  const activeBranchesWithClasses = branches.filter(b => (filteredBranchMap.get(b) || []).length > 0);
  if (activeBranchesWithClasses.length > 1) {
    const jumpBar = document.createElement("div");
    jumpBar.className = "branch-jump-bar";
    jumpBar.setAttribute("role", "navigation");
    jumpBar.setAttribute("aria-label", "Quick jump to department");
    jumpBar.innerHTML = `
      <span class="branch-jump-label">Jump:</span>
      <div class="branch-jump-chips">
        ${activeBranchesWithClasses.map(b => `
          <button type="button" class="branch-jump-chip branch-jump-chip-${b.toLowerCase()}" data-branch="${b}">
            ${b} (${(filteredBranchMap.get(b) || []).length})
          </button>
        `).join("")}
      </div>
    `;

    jumpBar.querySelectorAll(".branch-jump-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const branchCode = chip.getAttribute("data-branch");
        const targetEl = document.getElementById(`branch-section-${branchCode.toLowerCase()}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    container.appendChild(jumpBar);
  }

  // Render class cards grouped by branch
  branches.forEach(branch => {
    const filtered = filteredBranchMap.get(branch) || [];
    if (filtered.length === 0) return;

    const section = document.createElement("section");
    section.className = "branch-section";
    section.id = `branch-section-${branch.toLowerCase()}`;

    // Branch Section Header with Stage 2 Badge Pill & count
    const branchHeader = document.createElement("div");
    branchHeader.className = "branch-section-header";
    branchHeader.innerHTML = `
      <span class="branch-pill branch-pill-${branch.toLowerCase()}">${branch}</span>
      <h2 class="branch-title">${branch} Department</h2>
      <span class="branch-count-badge">${filtered.length} ${filtered.length === 1 ? "class" : "classes"}</span>
    `;
    section.appendChild(branchHeader);

    const cardList = document.createElement("div");
    cardList.className = "class-card-list";

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = `class-card branch-${item.branch.toLowerCase()}`;
      card.setAttribute("data-branch", item.branch);

      // Card styling based on state
      if (slotState.status === "in-period") {
        if (item.isFree) {
          card.classList.add("class-card-free");
        } else {
          card.classList.add("class-card-live");
        }
      } else {
        card.classList.add("class-card-closed");
      }

      // Card Header
      const header = document.createElement("div");
      header.className = "class-card-header";

      const badgeWrapper = document.createElement("div");
      badgeWrapper.className = "class-badge-wrapper";
      badgeWrapper.innerHTML = `
        <span class="branch-pill branch-pill-${item.branch.toLowerCase()}">${item.branch}</span>
        <span class="class-badge">${item.classId}</span>
      `;
      header.appendChild(badgeWrapper);

      const statusGroup = document.createElement("div");
      statusGroup.className = "class-card-status-group";
      if (slotState.status === "in-period") {
        const remText = timeRem.text ? `(${timeRem.text})` : "";
        if (item.isFree) {
          statusGroup.innerHTML = `
            <span class="free-tag">FREE</span>
            <span class="time-tag">Ends ${slotState.currentSlot.end}</span>
          `;
        } else {
          statusGroup.innerHTML = `
            <span class="live-tag">LIVE</span>
            <span class="time-tag">Ends ${slotState.currentSlot.end} ${remText}</span>
          `;
        }
      } else {
        const statusLabel = slotState.status === "break" ? "Lunch break" : "Not in session";
        statusGroup.innerHTML = `<span class="time-tag">${statusLabel}</span>`;
      }
      header.appendChild(statusGroup);
      card.appendChild(header);

      // Card Body
      if (slotState.status === "in-period") {
        if (item.isFree) {
          const freeText = document.createElement("div");
          freeText.className = "free-period-text";
          freeText.innerHTML = `<em>Free Period</em> — No lecture scheduled`;
          card.appendChild(freeText);
        } else {
          const stack = document.createElement("div");
          stack.className = "batch-stack";

          item.entries.forEach(entry => {
            const row = document.createElement("div");
            row.className = "batch-row";

            const left = document.createElement("div");
            left.style.display = "flex";
            left.style.alignItems = "center";
            left.style.flexWrap = "wrap";
            left.style.gap = "6px";

            if (entry.batch) {
              const bBadge = document.createElement("span");
              bBadge.className = "batch-badge";
              bBadge.textContent = entry.batch;
              left.appendChild(bBadge);
            }

            if (entry.type === "lab") {
              const labTag = document.createElement("span");
              labTag.className = "type-tag";
              labTag.textContent = "LAB";
              left.appendChild(labTag);
            }

            const sub = document.createElement("span");
            sub.className = "subject-name";
            sub.textContent = entry.subject;
            left.appendChild(sub);

            if (entry.room) {
              const room = document.createElement("span");
              room.className = "room-badge";
              room.textContent = entry.room;
              left.appendChild(room);
            }

            row.appendChild(left);

            // Lecturer initials and full names
            const right = document.createElement("div");
            right.className = "lecturer-name";
            if (entry.lecturers && entry.lecturers.length > 0) {
              const lecturerDisplay = entry.lecturers.map(l => {
                const info = (data.lecturers && data.lecturers[l]) ? data.lecturers[l] : null;
                return info && info.name ? `${info.name} (${l})` : l;
              }).join(", ");
              right.textContent = lecturerDisplay;
            } else {
              right.textContent = "—";
            }
            row.appendChild(right);

            stack.appendChild(row);
          });

          card.appendChild(stack);
        }
      } else {
        // Outside teaching period (before, break, after, closed)
        const note = document.createElement("div");
        note.className = "free-period-text";
        if (slotState.status === "break") {
          note.textContent = "In lunch break (13:25 – 14:00)";
        } else if (slotState.status === "before") {
          note.textContent = "College has not started yet today";
        } else if (slotState.status === "after") {
          note.textContent = "Classes concluded for today";
        } else {
          note.textContent = "College is closed today";
        }
        card.appendChild(note);
      }

      cardList.appendChild(card);
    });

    section.appendChild(cardList);
    container.appendChild(section);
  });

  // Empty state handling
  if (totalVisibleCards === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const filterDesc = [];
    if (filters.branch && filters.branch !== "ALL") filterDesc.push(`Branch: ${filters.branch}`);
    if (filters.lecturer && filters.lecturer !== "ALL") {
      const lName = data.lecturers[filters.lecturer]?.name || filters.lecturer;
      filterDesc.push(`Lecturer: ${lName} (${filters.lecturer})`);
    }
    if (q) filterDesc.push(`Search: "${q}"`);

    const filterText = filterDesc.length > 0 ? filterDesc.join(" • ") : "active filters";

    empty.innerHTML = `
      <div class="empty-state-title">Nothing matches</div>
      <p class="text-muted">No classes currently match the selected criteria (${filterText}).</p>
      <button type="button" class="btn-secondary" style="margin-top: 12px;" id="now-clear-filters-btn">Clear Filters</button>
    `;

    const clearBtn = empty.querySelector("#now-clear-filters-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (window.TimetableApp && window.TimetableApp.resetFilters) {
          window.TimetableApp.resetFilters();
        }
        if (window.TimetableApp && window.TimetableApp.setSearchQuery) {
          window.TimetableApp.setSearchQuery("");
        }
      });
    }

    container.appendChild(empty);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}
