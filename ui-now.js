// Phase 2 & 5: Now View Renderer with Branch & Lecturer Filters
// Displays live status for every class grouped by branch.
// Handles all states:
// - "before": Before college starts
// - "in-period": Active teaching period (theory, lab batches stacked, free)
// - "break": Lunch or inter-period break
// - "after": After college hours
// - "closed": Sunday or non-working day
// Search filter: Class / Lecturer / Subject
// Filters: Branch (All / CE / CS / EC / EE / ME) and Lecturer

import { filterCurrentEntries } from "./time.js";

export function renderNowView(container, data, simDate, searchQuery = "", filters = { branch: "ALL", lecturer: "ALL" }) {
  container.innerHTML = "";

  const q = searchQuery.trim().toLowerCase();

  // Pure data lookup
  const rawEntries = window.TimetableApp.getCurrentEntries(data, simDate);
  const currentEntries = filterCurrentEntries(rawEntries, filters);
  const slotState = window.TimetableApp.getSlotState(data, simDate);

  // Status banner describing college-wide state
  const statusBanner = document.createElement("div");
  statusBanner.className = "college-status-banner";

  if (slotState.status === "in-period" && slotState.currentSlot) {
    statusBanner.classList.add("status-live-banner");
    statusBanner.innerHTML = `
      <div class="college-status-title">Active Period: ${slotState.currentSlot.label} (${slotState.currentSlot.start} – ${slotState.currentSlot.end})</div>
      <div class="college-status-desc">Day: ${slotState.day} • College is in session • Ends at ${slotState.currentSlot.end}</div>
    `;
  } else if (slotState.status === "break" && slotState.currentSlot) {
    statusBanner.classList.add("status-break-banner");
    statusBanner.innerHTML = `
      <div class="college-status-title">Lunch Break (${slotState.currentSlot.start} – ${slotState.currentSlot.end})</div>
      <div class="college-status-desc">Day: ${slotState.day} • Classes resume at ${slotState.currentSlot.end}</div>
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

  // Search input bar
  const searchBar = document.createElement("div");
  searchBar.className = "search-bar";
  searchBar.innerHTML = `
    <input
      type="text"
      class="search-input"
      id="now-search-input"
      placeholder="Search class (e.g. CS-III), subject, lecturer..."
      value="${escapeHtml(searchQuery)}"
      aria-label="Search current classes"
    />
  `;
  container.appendChild(searchBar);

  const searchInput = searchBar.querySelector("#now-search-input");
  searchInput.addEventListener("input", (e) => {
    window.TimetableApp.setSearchQuery(e.target.value);
  });

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

  let totalVisibleCards = 0;

  branches.forEach(branch => {
    const classList = branchMap.get(branch) || [];

    // Filter by search query
    const filtered = classList.filter(item => {
      if (!q) return true;
      if (item.classId.toLowerCase().includes(q)) return true;
      if (item.branch.toLowerCase().includes(q)) return true;

      // Check subject or lecturer initials / full name
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

    if (filtered.length === 0) return;

    totalVisibleCards += filtered.length;

    const section = document.createElement("section");
    section.className = "branch-section";

    const title = document.createElement("h2");
    title.className = "branch-title";
    title.textContent = `${branch} Branch`;
    section.appendChild(title);

    const cardList = document.createElement("div");
    cardList.className = "class-card-list";

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "class-card";

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

      const badge = document.createElement("div");
      badge.className = "class-badge";
      badge.textContent = item.classId;
      header.appendChild(badge);

      const statusTag = document.createElement("div");
      if (slotState.status === "in-period") {
        if (item.isFree) {
          statusTag.className = "time-tag";
          statusTag.textContent = `Ends at ${slotState.currentSlot.end}`;
        } else {
          statusTag.innerHTML = `
            <span class="live-tag">LIVE</span>
            <span class="time-tag" style="margin-left: 6px;">ends ${slotState.currentSlot.end}</span>
          `;
        }
      } else {
        statusTag.className = "time-tag";
        statusTag.textContent = slotState.status === "break" ? "Lunch break" : "Not in session";
      }
      header.appendChild(statusTag);
      card.appendChild(header);

      // Card Body
      if (slotState.status === "in-period") {
        if (item.isFree) {
          const freeText = document.createElement("div");
          freeText.className = "free-period-text";
          freeText.textContent = "Free Period (No class scheduled)";
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
            left.style.gap = "4px";

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
              room.className = "text-muted";
              room.style.fontSize = "0.85rem";
              room.textContent = `(${entry.room})`;
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
        // Outside period hours
        const outsideText = document.createElement("div");
        outsideText.className = "text-muted";
        outsideText.style.fontSize = "0.95rem";
        if (slotState.status === "before") {
          outsideText.textContent = "Waiting for morning session to commence.";
        } else if (slotState.status === "break") {
          outsideText.textContent = "Lunch intermission in progress.";
        } else if (slotState.status === "after") {
          outsideText.textContent = "Class concluded for the day.";
        } else {
          outsideText.textContent = "No schedule on non-working days.";
        }
        card.appendChild(outsideText);
      }

      cardList.appendChild(card);
    });

    section.appendChild(cardList);
    container.appendChild(section);
  });

  if (totalVisibleCards === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    let filterDesc = [];
    if (filters.branch && filters.branch !== "ALL") filterDesc.push(`Branch: ${filters.branch}`);
    if (filters.lecturer && filters.lecturer !== "ALL") {
      const lName = data.lecturers[filters.lecturer]?.name || filters.lecturer;
      filterDesc.push(`Lecturer: ${lName} (${filters.lecturer})`);
    }
    if (searchQuery) filterDesc.push(`Search: "${escapeHtml(searchQuery)}"`);

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
