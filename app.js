const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const STORAGE_KEY = "track-her-v1";
const DATABASE_NAME = "track-her-local";
const DATABASE_VERSION = 1;
const DATABASE_STORE = "app-state";
const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plan: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h3M8 17h7"/>',
  progress: '<path d="M3 3v18h18M7 14l4-4 4 3 6-7"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5m4-1v5l4 2"/>',
  spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  swap: '<path d="m16 3 4 4-4 4M20 7H4m4 14-4-4 4-4m-4 4h16"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m-10 0 1 14h10l1-14M10 11v5m4-5v5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ""}</svg>`;
const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const defaultState = () => ({
  version: 1, onboarded: false, name: "Sarah", units: "kg", weightStep: 2.5, activeTab: "Home", activeWorkout: null, todayWorkoutOverride: null,
  program: { name: "Glute Growth", repeatWeekly: true, cycleWeeks: 1, activeCycleWeek: 1, cycleStartedAt: todayKey(), days: [
    { id: "mon", day: "Monday", name: "Lower Body", exercises: [
      { id: "hip", name: "Barbell Hip Thrust", sets: 4, reps: 8, rest: 120, notes: "", equipment: "barbell" },
      { id: "rdl", name: "Romanian Deadlift", sets: 3, reps: 10, rest: 90, notes: "", equipment: "barbell" },
      { id: "split", name: "Bulgarian Split Squat", sets: 3, reps: 10, rest: 90, notes: "Each leg", equipment: "dumbbell" },
      { id: "curl", name: "Leg Curl", sets: 3, reps: 12, rest: 75, notes: "", equipment: "machine" },
      { id: "abduction", name: "Hip Abduction", sets: 3, reps: 15, rest: 60, notes: "", equipment: "machine" },
    ] },
    { id: "wed", day: "Wednesday", name: "Upper Body", exercises: [
      { id: "pulldown", name: "Lat Pulldown", sets: 4, reps: 10, rest: 90, notes: "", equipment: "machine" },
      { id: "row", name: "Seated Row", sets: 3, reps: 10, rest: 90, notes: "", equipment: "machine" },
      { id: "press", name: "Shoulder Press", sets: 3, reps: 10, rest: 75, notes: "", equipment: "dumbbell" },
      { id: "raise", name: "Lateral Raise", sets: 3, reps: 15, rest: 60, notes: "", equipment: "dumbbell" },
    ] },
    { id: "fri", day: "Friday", name: "Glutes + Hamstrings", exercises: [
      { id: "bridge", name: "Glute Bridge", sets: 4, reps: 10, rest: 90, notes: "", equipment: "barbell" },
      { id: "thrust2", name: "Hip Thrust", sets: 3, reps: 10, rest: 90, notes: "", equipment: "barbell" },
      { id: "kickback", name: "Cable Kickback", sets: 3, reps: 12, rest: 60, notes: "Each leg", equipment: "machine" },
    ] },
  ] },
  history: [], prs: {},
});
let state = loadState();
let restInterval = null;
let importDraft = [];
let importProgramName = "Imported Program";
let pendingProgramDraft = null;
let restoreDraft = null;
let installPrompt = null;
let databasePromise = null;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.version === 1 ? normalizeState(stored) : defaultState();
  } catch { return defaultState(); }
}
function normalizeState(stored) {
  const defaults = defaultState();
    const program = { ...defaults.program, ...stored.program, cycleId: stored.program.cycleId || uid() };
  return { ...defaults, ...stored, program: { ...program, repeatWeekly: program.repeatWeekly ?? false, cycleWeeks: Math.max(1, Number(program.cycleWeeks) || 1), activeCycleWeek: Math.max(1, Number(program.activeCycleWeek) || 1), cycleStartedAt: program.cycleStartedAt || todayKey(), days: (program.days || []).map((day) => ({ ...day, programWeek: Math.max(1, Number(day.programWeek) || 1) })) } };
}
function openStateDatabase() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error("IndexedDB is not available.")); return; }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(DATABASE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local storage."));
  });
  return databasePromise;
}
async function readIndexedState() {
  const database = await openStateDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(DATABASE_STORE, "readonly").objectStore(DATABASE_STORE).get("current");
    request.onsuccess = () => {
      try { resolve(request.result ? JSON.parse(request.result) : null); }
      catch { resolve(null); }
    };
    request.onerror = () => reject(request.error);
  });
}
async function writeIndexedState(serialized) {
  const database = await openStateDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DATABASE_STORE, "readwrite");
    transaction.objectStore(DATABASE_STORE).put(serialized, "current");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Local save was interrupted."));
  });
}
function save() {
  const serialized = JSON.stringify(state);
  try { localStorage.setItem(STORAGE_KEY, serialized); } catch { }
  writeIndexedState(serialized).catch(() => { });
}
async function initializeState() {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const persisted = await readIndexedState();
      if (persisted?.version === 1) state = normalizeState(persisted);
    }
    await writeIndexedState(JSON.stringify(state));
  } catch { }
  render();
  navigator.storage?.persist?.().catch(() => { });
}
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function prettyDate(date, options = { month: "short", day: "numeric" }) { return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", options); }
function todayDay() { return weekdayNames[new Date().getDay()]; }
function currentWorkout() {
  const workout = activeCycleDays().find((item) => item.day === todayDay());
  return workout && !isWorkoutComplete(workout) ? workout : null;
}
function weekStartKey() {
  const start = weekStart();
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}
function isWorkoutComplete(day) {
  return state.history.some((workout) => {
    const sameDay = workout.programDayId ? workout.programDayId === day.id : workout.name === day.name;
    if (!sameDay) return false;
      if (Number(state.program.cycleWeeks) > 1) return Number(workout.programWeek || 1) === Number(day.programWeek || 1) && (workout.cycleId ? workout.cycleId === state.program.cycleId : workout.date >= (state.program.cycleStartedAt || "0000-01-01"));
    return !state.program.repeatWeekly || workout.date >= weekStartKey();
  });
}
function activeCycleDays() {
  const week = Number(state.program.activeCycleWeek) || 1;
  return Number(state.program.cycleWeeks) > 1 ? state.program.days.filter((day) => Number(day.programWeek || 1) === week) : state.program.days;
}
function advanceProgramCycle() {
  const cycleWeeks = Number(state.program.cycleWeeks) || 1;
  if (cycleWeeks < 2) return;
  const activeWeek = Number(state.program.activeCycleWeek) || 1;
  const weekDays = activeCycleDays();
  if (!weekDays.length || !weekDays.every(isWorkoutComplete)) return;
  if (activeWeek < cycleWeeks) state.program.activeCycleWeek = activeWeek + 1;
  else if (state.program.repeatWeekly) {
    state.program.activeCycleWeek = 1;
      state.program.cycleId = uid();
      state.program.cycleStartedAt = todayKey();
  } else state.program.activeCycleWeek = cycleWeeks + 1;
}
function getExercise(id, name) { return state.program.days.flatMap((day) => day.exercises).find((exercise) => exercise.id === id || exercise.name.toLowerCase() === name?.toLowerCase()); }
function previousExercise(exercise) {
  for (const workout of state.history) {
    const found = workout.exercises.find((item) => item.exerciseId === exercise.id || item.name.toLowerCase() === exercise.name.toLowerCase());
    if (found?.sets?.length) return found;
  }
  return null;
}
const replacementGroups = [
  { label: "Squat or lunge", matches: /squat|lunge|leg press/i, options: [["Goblet squat", "Same squat pattern, simpler setup", "dumbbell"], ["Leg press", "Similar knee-dominant leg work", "machine"], ["Reverse lunge", "Single-leg squat pattern", "bodyweight"], ["Box squat", "Squat pattern with a depth target", "barbell"]] },
  { label: "Hip hinge", matches: /deadlift|good morning|hyperextension|back extension|kettlebell swing/i, options: [["Dumbbell Romanian deadlift", "Hip hinge with a lighter setup", "dumbbell"], ["Cable pull-through", "Hip hinge with steady cable tension", "cable"], ["45° back extension", "Posterior-chain hinge", "machine"], ["Kettlebell swing", "Dynamic hip hinge", "kettlebell"]] },
  { label: "Glute extension", matches: /hip thrust|glute bridge|glute kickback|frog pump/i, options: [["Glute bridge", "Horizontal hip extension", "bodyweight"], ["Smith machine hip thrust", "Hip thrust with a guided bar path", "machine"], ["Cable glute kickback", "Single-leg glute extension", "cable"], ["Dumbbell frog pump", "Short-range glute extension", "dumbbell"]] },
  { label: "Hip abduction", matches: /abduction|lateral band walk/i, options: [["Cable hip abduction", "Single-leg abduction", "cable"], ["Side-lying hip raise", "Bodyweight hip abduction", "bodyweight"], ["Lateral band walk", "Band-resisted hip abduction", "band"], ["Seated hip abduction", "Machine-based abduction", "machine"]] },
  { label: "Hamstring curl", matches: /leg curl|hamstring curl/i, options: [["Seated leg curl", "Knee-flexion hamstring work", "machine"], ["Lying leg curl", "Knee-flexion hamstring work", "machine"], ["Stability-ball leg curl", "Bodyweight hamstring curl", "bodyweight"]] },
  { label: "Vertical pull", matches: /pulldown|chin[- ]?up|pull[- ]?up/i, options: [["Lat pulldown", "Vertical pull with adjustable load", "machine"], ["Assisted chin-up", "Vertical pull with assistance", "machine"], ["Band-assisted pull-up", "Vertical pull with band assistance", "band"]] },
  { label: "Row", matches: /row|face pull|reverse fly/i, options: [["Chest-supported row", "Horizontal pull with torso support", "dumbbell"], ["Seated cable row", "Horizontal pull with cable tension", "cable"], ["One-arm dumbbell row", "Single-arm horizontal pull", "dumbbell"], ["Face pull", "Upper-back and rear-shoulder pull", "cable"]] },
  { label: "Lateral shoulder raise", matches: /lateral raise/i, options: [["Cable lateral raise", "Lateral raise with cable tension", "cable"], ["Machine lateral raise", "Guided lateral raise", "machine"], ["Lean-away dumbbell raise", "Single-arm lateral raise", "dumbbell"]] },
  { label: "Shoulder press", matches: /shoulder press|overhead press/i, options: [["Dumbbell shoulder press", "Vertical press with independent arms", "dumbbell"], ["Machine shoulder press", "Guided vertical press", "machine"], ["Landmine press", "Angled press with a shoulder-friendly path", "barbell"]] },
  { label: "Chest press", matches: /bench press|chest press|push[- ]?up/i, options: [["Dumbbell bench press", "Horizontal press with independent arms", "dumbbell"], ["Machine chest press", "Guided horizontal press", "machine"], ["Incline push-up", "Bodyweight horizontal press", "bodyweight"]] },
  { label: "Triceps", matches: /triceps|skull crusher/i, options: [["Cable triceps pressdown", "Elbow-extension isolation", "cable"], ["Overhead cable extension", "Overhead triceps isolation", "cable"], ["Close-grip push-up", "Compound triceps press", "bodyweight"]] },
  { label: "Biceps curl", matches: /curl/i, options: [["Hammer curl", "Neutral-grip elbow flexion", "dumbbell"], ["Cable curl", "Elbow flexion with steady tension", "cable"], ["Dumbbell curl", "Supinated elbow flexion", "dumbbell"]] },
  { label: "Core", matches: /leg raise|crunch|ab vacuum/i, options: [["Dead bug", "Controlled trunk stability", "bodyweight"], ["Cable crunch", "Loaded trunk flexion", "cable"], ["Reverse crunch", "Bodyweight trunk flexion", "bodyweight"]] },
  { label: "Calf raise", matches: /calf raise/i, options: [["Seated calf raise", "Bent-knee calf raise", "machine"], ["Standing calf raise", "Straight-knee calf raise", "machine"], ["Leg-press calf raise", "Calf raise on a leg press", "machine"]] },
];
function replacementSuggestions(name) {
  const group = replacementGroups.find((candidate) => candidate.matches.test(name));
  return group ? { label: group.label, options: group.options.filter(([option]) => option.toLowerCase() !== name.toLowerCase()) } : null;
}
function toast(message, pr = false) {
  toastRegion.innerHTML = `<div class="toast${pr ? " pr" : ""}">${message}</div>`;
  window.setTimeout(() => { toastRegion.innerHTML = ""; }, 3000);
}
function weekdayDate(dayName) {
  const now = new Date();
  const target = weekdayNames.indexOf(dayName);
  const date = new Date(now);
  date.setDate(now.getDate() + ((target - now.getDay() + 7) % 7));
  return date;
}
function getUpcomingWorkout() {
  const availableDays = activeCycleDays();
  if (!availableDays.length) return null;
  const ordered = [...availableDays].sort((a, b) => {
    const offset = (day) => weekdayNames.includes(day) ? (weekdayNames.indexOf(day) - new Date().getDay() + 7) % 7 : 8;
    return offset(a.day) - offset(b.day);
  });
  return ordered.find((day) => !isWorkoutComplete(day)) || null;
}
function render() {
  if (!state.onboarded) return renderOnboarding();
  if (state.activeWorkout) { app.innerHTML = renderWorkout(); return; }
  const tab = state.activeTab;
  app.innerHTML = `${renderTopbar()}${tab === "Home" ? renderHome() : tab === "Plan" ? renderPlan() : tab === "Progress" ? renderProgress() : renderProfile()}${renderNav()}`;
  if (tab === "Progress") {
    const historySection = app.querySelector(".history-list")?.closest(".section");
    historySection?.insertAdjacentHTML("beforebegin", `<section class="section"><div class="section-heading"><h2>Workout calendar</h2><span class="eyebrow">${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></div>${renderCalendar()}</section>`);
  }
}
function renderTopbar() {
  return `<header class="topbar"><div class="brand"><span class="brand-mark">${icon("spark")}</span>Track-Her</div><button class="top-action" data-action="profile" aria-label="Open profile">${icon("profile")}</button></header>`;
}
function renderNav() {
  const tabs = [["Home", "home"], ["Plan", "plan"], ["Progress", "progress"], ["Profile", "profile"]];
  return `<nav class="bottom-nav" aria-label="Main navigation">${tabs.map(([label, glyph]) => `<button class="nav-item ${state.activeTab === label ? "active" : ""}" data-tab="${label}">${icon(glyph)}<span>${label}</span></button>`).join("")}</nav>`;
}
function renderHome() {
  const scheduledWorkout = currentWorkout() || getUpcomingWorkout();
  const override = state.todayWorkoutOverride;
  const alternate = override?.date === todayKey() && override.scheduledDayId === scheduledWorkout?.id
    ? state.program.days.find((day) => day.id === override.workoutId)
    : null;
  const workout = alternate || scheduledWorkout;
  const date = new Date();
  const hour = date.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const last = state.history[0];
  const cycleDays = activeCycleDays();
  const cycleDayIds = new Set(cycleDays.map((day) => day.id));
  const thisWeek = Number(state.program.cycleWeeks) > 1
    ? state.history.filter((item) => Number(item.programWeek || 1) === Number(state.program.activeCycleWeek) && cycleDayIds.has(item.programDayId)).length
    : state.history.filter((item) => new Date(`${item.date}T12:00:00`).getTime() >= weekStart().getTime()).length;
  if (!workout && state.program.days.length) {
    const repeatMessage = state.program.repeatWeekly ? "Your weekly cycle starts again next week." : "This plan is complete. Turn on weekly repeat in Plan if you'd like to reuse it.";
    return `<section class="greeting"><div class="eyebrow">Your training, in rhythm</div><h1>${greeting}, ${escapeHtml(state.name)}</h1></section><div class="surface empty-state"><h3>${state.program.repeatWeekly ? "Your week is complete" : "Plan complete"}</h3><p>${repeatMessage}</p><button class="primary-button" data-tab="Plan">REVIEW MY PLAN</button></div>`;
  }
  if (!workout) return `<section class="greeting"><div class="eyebrow">Your training, in rhythm</div><h1>${greeting}, ${escapeHtml(state.name)}</h1></section><div class="surface empty-state"><h3>Your next chapter starts here</h3><p>Create a simple workout plan or import the one you already follow.</p><button class="primary-button" data-action="create-program">CREATE MY PLAN</button></div>`;
  const isToday = scheduledWorkout.day === todayDay();
  const alternatives = activeCycleDays().filter((day) => day.id !== scheduledWorkout.id && !isWorkoutComplete(day));
  return `<section class="greeting"><div class="eyebrow">Your training, in rhythm</div><h1>${greeting}, ${escapeHtml(state.name)}</h1></section>
    <div class="section-heading"><h2>${isToday ? "Today's workout" : "Up next"}</h2><button class="link-button" data-tab="Plan">View plan</button></div>
    <section class="today-card"><div class="today-top"><span class="eyebrow">${escapeHtml(scheduledWorkout.day)} · ${isToday ? "Today" : "Coming up"}${alternate ? " · Changed for today" : ""}</span><div class="today-card-actions"><span class="date-chip">${weekdayNames.includes(scheduledWorkout.day) ? prettyDate(weekdayDate(scheduledWorkout.day).toISOString().slice(0, 10), { month: "short", day: "numeric" }) : "Any day"}</span>${alternatives.length ? `<button class="today-options-button" data-action="change-today-workout" data-scheduled-day-id="${scheduledWorkout.id}" aria-label="More workout options" title="More workout options">${icon("more")}</button>` : ""}</div></div><div class="today-title">${escapeHtml(workout.name)}</div><p class="today-meta">${workout.exercises.length} exercises <span aria-hidden="true">·</span> Approximately ${estimateDuration(workout)} min</p><div class="today-bottom"><div class="avatar-stack"><span class="tiny-dots"><i></i><i></i><i></i></span><span>${escapeHtml(state.program.name)}</span></div><button class="primary-button" data-action="start-workout" data-workout-id="${workout.id}" data-scheduled-workout-id="${scheduledWorkout.id}">START WORKOUT ${icon("arrow")}</button></div></section>
    <section class="section"><div class="section-heading"><h2>Today's flow</h2><span class="eyebrow">${workout.exercises.length} moves</span></div><div class="exercise-preview">${workout.exercises.slice(0, 5).map((exercise, index) => `<div class="exercise-row"><span class="exercise-number">0${index + 1}</span><div class="exercise-row-main"><div class="exercise-row-name">${escapeHtml(exercise.name)}</div><div class="exercise-row-detail">${escapeHtml(exercise.notes || "")}</div></div><span class="target-pill">${exercise.sets} × ${exercise.reps}</span></div>`).join("") || `<div class="empty-state"><p>Add exercises to this workout in your plan.</p></div>`}</div></section>
    ${last ? `<section class="section"><div class="section-heading"><h2>Last workout</h2><button class="link-button" data-tab="Progress">History</button></div><div class="last-workout"><div><div class="exercise-row-name">${escapeHtml(last.name)}</div><div class="exercise-row-detail">Completed ${prettyDate(last.date, { weekday: "long", month: "short", day: "numeric" })}</div></div><span class="last-icon">${icon("history")}</span></div></section>` : ""}
    <section class="section"><div class="section-heading"><h2>This week</h2></div><div class="week-summary"><span class="week-count">${thisWeek}<span style="font-size:15px;color:#9ba49c"> / ${cycleDays.length || 0}</span></span><div class="week-copy">workouts completed<small>Every session adds up.</small><div class="progress-track"><span style="width:${Math.min(100, cycleDays.length ? thisWeek / cycleDays.length * 100 : 0)}%"></span></div></div></div></section>`;
}
function weekStart() { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
function estimateDuration(workout) { return Math.max(20, Math.round(workout.exercises.reduce((total, exercise) => total + exercise.sets * 2.2 + Number(exercise.rest || 60) * exercise.sets / 60, 0))); }
function renderPlan() {
  const repeatWeekly = state.program.repeatWeekly === true;
  const multiWeek = Number(state.program.cycleWeeks) > 1;
  const repeatTitle = multiWeek ? `Repeat full ${state.program.cycleWeeks}-week program` : "Repeat this cycle every week";
  const repeatHint = repeatWeekly ? (multiWeek ? "Starts again at Week 1 when the full program is complete." : "Your sessions restart next week.") : "This program stops after its sessions are complete.";
  const planSummary = multiWeek ? `${state.program.cycleWeeks}-week program · ${state.program.days.length} sessions` : `${state.program.days.length} training days`;
  return `<section class="page-intro"><div class="eyebrow">Your routine</div><h1>Your plan</h1><p>Keep it simple. Show up, one session at a time.</p></section><div class="toolbar"><div><h3>${escapeHtml(state.program.name)}</h3><span class="eyebrow">${planSummary}</span></div><button class="inline-icon-button" data-action="edit-program" aria-label="Edit program name">${icon("edit")}</button></div><div class="button-row" style="margin-bottom:14px"><button class="secondary-button" data-action="import-pdf">↑ &nbsp;Import PDF</button><button class="secondary-button" data-action="add-day">+ &nbsp;Add workout</button></div><div class="setting-row cycle-setting"><div><strong>${repeatTitle}</strong><small>${repeatHint}</small></div><select class="select-field" data-change="repeat-weekly" aria-label="Repeat this cycle every week"><option value="false" ${repeatWeekly ? "" : "selected"}>One-time</option><option value="true" ${repeatWeekly ? "selected" : ""}>Repeat</option></select></div><div class="program-card">${state.program.days.map((day) => `<section class="day-block"><div class="day-heading"><div><div class="day-label"><i class="day-dot"></i>${escapeHtml(day.name)}</div><div class="day-name">${multiWeek ? `Week ${day.programWeek || 1} · ` : ""}${escapeHtml(day.day)}</div></div><button class="inline-icon-button" data-action="add-exercise" data-day-id="${day.id}" aria-label="Add exercise to ${escapeHtml(day.name)}">+</button></div>${day.exercises.length ? day.exercises.map((exercise) => `<div class="plan-exercise"><strong>${escapeHtml(exercise.name)}</strong><div class="plan-exercise-detail"><span>${exercise.sets} × ${exercise.reps || "—"}${exercise.rest ? ` · ${exercise.rest}s rest` : ""}</span><button class="inline-icon-button" data-action="replace-plan-exercise" data-day-id="${day.id}" data-exercise-id="${exercise.id}" aria-label="Replace ${escapeHtml(exercise.name)}" title="Find a similar movement">${icon("swap")}</button><button class="inline-icon-button destructive-icon" data-action="remove-plan-exercise" data-day-id="${day.id}" data-exercise-id="${exercise.id}" aria-label="Remove ${escapeHtml(exercise.name)}" title="Remove from this workout">${icon("trash")}</button></div></div>`).join("") : `<p class="day-empty">No exercises yet. Tap + to add one.</p>`}</section>`).join("") || `<div class="empty-state"><h3>No workouts yet</h3><p>Add a workout day to begin.</p><button class="primary-button" data-action="add-day">ADD WORKOUT</button></div>`}</div><div class="section"><button class="link-button" data-action="import-pdf">Import a workout PDF →</button></div>`;
}
function allExerciseNames() { return [...new Set([...state.program.days.flatMap((day) => day.exercises.map((exercise) => exercise.name)), ...state.history.flatMap((workout) => workout.exercises.map((exercise) => exercise.name))])].sort(); }
function recordsFor(name) { return state.history.flatMap((workout) => workout.exercises.filter((exercise) => exercise.name.toLowerCase() === name.toLowerCase()).flatMap((exercise) => exercise.sets.map((set) => ({ ...set, date: workout.date })))); }
function renderProgress() {
  const names = allExerciseNames();
  const selected = names.includes(progressSelection) ? progressSelection : names[0];
  progressSelection = selected || "";
  const records = selected ? recordsFor(selected).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const best = records.reduce((max, set) => Math.max(max, Number(set.weight) || 0), 0);
  const historyCount = state.history.length;
  return `<section class="page-intro"><div class="eyebrow">Small steps, real strength</div><h1>Your progress</h1><p>Notice how far you've come.</p></section><div class="metric-grid"><div class="metric-card"><strong>${historyCount}</strong><span>workouts completed</span></div><div class="metric-card"><strong>${best ? `${best} ${state.units}` : "—"}</strong><span>best ${selected ? escapeHtml(selected) : "lift"}</span></div></div><section class="chart-card"><div class="chart-toolbar"><h3>Strength over time</h3>${names.length ? `<select class="select-field" style="width:auto;max-width:55%;min-height:37px;padding:6px 9px" data-change="progress-exercise">${names.map((name) => `<option ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select>` : ""}</div>${records.length ? renderChart(records) : `<div class="empty-state" style="padding:30px 8px 15px"><h3>Your first PR is waiting</h3><p>Complete a workout to see your lifts build over time.</p><button class="secondary-button" data-tab="Home">Go to today's workout</button></div>`}</section><section class="section"><div class="section-heading"><h2>Workout history</h2><span class="eyebrow">${historyCount} sessions</span></div><div class="history-list">${state.history.length ? state.history.map((workout) => `<details class="history-item"><summary class="history-summary"><div><strong>${escapeHtml(workout.name)}</strong><span>${prettyDate(workout.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${workout.exercises.length} exercises</span></div>${icon("arrow")}</summary><div class="history-content">${workout.exercises.map((exercise) => `<div class="history-exercise"><strong>${escapeHtml(exercise.name)}</strong><p>${exercise.sets.map((set) => `${set.weight || 0} ${state.units} × ${set.reps}`).join(" · ")}</p>${exercise.notes ? `<p>${escapeHtml(exercise.notes)}</p>` : ""}</div>`).join("")}</div></details>`).join("") : `<div class="surface empty-state"><p>Completed workouts will appear here.</p></div>`}</div></section>`;
}
let progressSelection = "";
function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const offset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const trainedDates = new Set(state.history.map((workout) => workout.date));
  const cells = Array.from({ length: offset + daysInMonth }, (_, index) => {
    if (index < offset) return `<span class="calendar-day blank"></span>`;
    const day = index - offset + 1;
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return `<span class="calendar-day ${trainedDates.has(dateKey) ? "trained" : ""} ${day === now.getDate() ? "today" : ""}">${day}${trainedDates.has(dateKey) ? `<i aria-label="Workout completed"></i>` : ""}</span>`;
  });
  return `<div class="calendar-card"><div class="calendar-grid calendar-weekdays">${["S", "M", "T", "W", "T", "F", "S"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div></div>`;
}
function renderChart(records) {
  const points = records.reduce((bestByDate, record) => { const prior = bestByDate.at(-1); if (!prior || prior.date !== record.date) bestByDate.push(record); else if (Number(record.weight) > Number(prior.weight)) bestByDate[bestByDate.length - 1] = record; return bestByDate; }, []);
  if (points.length < 2) return `<div class="empty-state" style="padding:25px 8px 13px"><p>Log this lift in one more workout to see your trend.</p><div class="history-exercise"><strong>${prettyDate(points[0].date)} · ${points[0].weight} ${state.units} × ${points[0].reps}</strong></div></div>`;
  const weights = points.map((point) => Number(point.weight) || 0);
  const min = Math.min(...weights) * .88, max = Math.max(...weights) * 1.08 || 1;
  const coords = points.map((point, index) => ({ x: 30 + index * 270 / (points.length - 1), y: 145 - ((Number(point.weight) - min) / (max - min || 1)) * 115, point }));
  const path = coords.map(({ x, y }, index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
  return `<div class="chart-area"><svg viewBox="0 0 310 180" role="img" aria-label="Weight progression chart">${[35, 80, 125, 160].map((y) => `<line class="chart-grid" x1="26" y1="${y}" x2="304" y2="${y}"/>`).join("")}<path class="chart-line" d="${path}"/>${coords.map(({ x, y, point }) => `<circle class="chart-point" cx="${x}" cy="${y}" r="4"><title>${point.weight} ${state.units} on ${prettyDate(point.date)}</title></circle>`).join("")}${coords.filter((_, i) => i === 0 || i === coords.length - 1).map(({ x, point }) => `<text class="chart-label" x="${x}" y="176" text-anchor="middle">${prettyDate(point.date)}</text>`).join("")}</svg></div><div class="eyebrow" style="text-align:right">Best set weight · ${state.units}</div>`;
}
function renderProfile() {
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  return `<section class="page-intro"><div class="eyebrow">Made for your pace</div><h1>Your space</h1></section><div class="profile-head"><div class="profile-avatar">${escapeHtml(state.name.slice(0, 1).toUpperCase())}</div><div><h3>${escapeHtml(state.name)}</h3><p>${escapeHtml(state.program.name)}</p></div></div><section class="settings-group"><div class="eyebrow" style="margin-bottom:7px">Preferences</div><div class="setting-row"><div><strong>Weight units</strong><small>Choose the units you train with</small></div><select class="select-field" data-change="units"><option value="kg" ${state.units === "kg" ? "selected" : ""}>Kilograms</option><option value="lbs" ${state.units === "lbs" ? "selected" : ""}>Pounds</option></select></div><div class="setting-row"><div><strong>Weight increment</strong><small>Change per tap on + or −</small></div><select class="select-field" data-change="weight-step">${(state.units === "kg" ? [0.5, 1, 2, 2.5, 5] : [1, 2, 2.5, 5, 10]).map((step) => `<option value="${step}" ${Number(state.weightStep) === step ? "selected" : ""}>${step} ${state.units}</option>`).join("")}</select></div><div class="setting-row"><div><strong>Your name</strong><small>Personalize your home screen</small></div><button class="link-button" data-action="edit-name">${escapeHtml(state.name)} ${icon("edit")}</button></div></section><section class="settings-group"><div class="eyebrow" style="margin-bottom:7px">Your account</div><div class="setting-row"><div><strong>Program</strong><small>${escapeHtml(state.program.name)}</small></div><button class="link-button" data-tab="Plan">View plan ${icon("arrow")}</button></div><div class="setting-row"><div><strong>Workout history</strong><small>${state.history.length} sessions saved on this device</small></div><button class="link-button" data-tab="Progress">View ${icon("arrow")}</button></div></section><section class="settings-group"><div class="eyebrow" style="margin-bottom:7px">Device data</div><div class="backup-actions"><button class="secondary-button" data-action="export-backup">↓ &nbsp;Export backup</button><button class="secondary-button" data-action="restore-backup">↑ &nbsp;Restore backup</button></div>${standalone ? "" : `<button class="secondary-button install-button" data-action="install-app">${icon("arrow")} &nbsp;Install Track-Her</button>`}</section><p class="eyebrow" style="margin:22px 0;text-align:center">Track-Her · Your workouts, in rhythm</p>`;
}
function renderOnboarding() {
  app.innerHTML = `<div class="onboarding"><div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Track-Her</div><div class="onboarding-visual"><svg viewBox="0 0 220 190" fill="none" aria-hidden="true"><path d="M45 146c13-38 26-50 49-50 17 0 23 11 34 11 12 0 17-15 28-15 15 0 21 18 25 54" stroke="#60796c" stroke-width="14" stroke-linecap="round"/><path d="M73 81c-2-14 3-27 17-31 14-4 25 5 26 20 1 16-7 29-20 30-12 0-21-7-23-19Z" fill="#bd7f76"/><path d="M59 147h116" stroke="#40594d" stroke-width="8" stroke-linecap="round"/><circle cx="172" cy="48" r="16" fill="#dfb965"/><path d="m169 48 3 3 6-7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="eyebrow">A little stronger, each time</div><h1>Welcome to Track-Her</h1><p class="onboarding-copy">Your workouts. Your progress. All in one place.</p></div><div><div class="step-dots"><i class="active"></i><i></i><i></i></div><div class="onboarding-actions"><button class="primary-button" data-action="onboarding-next">LET'S GET STARTED ${icon("arrow")}</button><button class="link-button" data-action="use-sample">Explore with a sample plan</button></div></div></div>`;
}
function startWorkout(workout, scheduledWorkoutId = workout.id, scheduledProgramWeek = workout.programWeek || 1) {
  state.activeWorkout = { id: uid(), dayId: scheduledWorkoutId, workoutId: workout.id, programWeek: scheduledProgramWeek, cycleId: state.program.cycleId, name: workout.name, date: todayKey(), startedAt: Date.now(), exercises: workout.exercises.map((exercise) => {
    const previous = previousExercise(exercise);
    const count = Math.max(Number(exercise.sets) || 1, previous?.sets?.length || 0);
    return { exerciseId: exercise.id, name: exercise.name, targetSets: Number(exercise.sets) || 1, targetReps: Number(exercise.reps) || 0, rest: Number(exercise.rest) || 0, notes: exercise.notes || "", sets: Array.from({ length: count }, (_, index) => ({ weight: previous?.sets?.[index]?.weight ?? previous?.sets?.at(-1)?.weight ?? "", reps: previous?.sets?.[index]?.reps ?? previous?.sets?.at(-1)?.reps ?? (Number(exercise.reps) || 0), complete: false })) };
  }) };
  save(); render();
}
function renderWorkout() {
  const workout = state.activeWorkout;
  const completed = workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.complete).length, 0);
  const total = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  return `<header class="workout-header"><button class="inline-icon-button" data-action="exit-workout" aria-label="Exit workout">‹</button><div><h2>${escapeHtml(workout.name)}</h2><p>${prettyDate(workout.date, { weekday: "long", month: "short", day: "numeric" })}</p></div><button class="link-button" style="margin-left:auto" data-action="finish-workout">Finish</button></header><div class="workout-progress"><div class="workout-progress-label"><span>Your session</span><span>${completed} of ${total} sets</span></div><div class="progress-track"><span style="width:${total ? completed / total * 100 : 0}%"></span></div></div>${workout.restEndsAt ? renderRestTimer() : ""}${workout.exercises.map((exercise, index) => renderLogExercise(exercise, index)).join("")}<button class="primary-button finish-button" data-action="finish-workout">FINISH WORKOUT ${icon("check")}</button>`;
}
function renderLogExercise(exercise, exerciseIndex) {
  const previous = previousExercise({ id: exercise.exerciseId, name: exercise.name });
  const prevText = previous ? `Last time: ${previous.sets.at(-1).weight || 0} ${state.units} × ${previous.sets.at(-1).reps}` : "Your first time with this lift";
  return `<section class="log-card"><div class="log-title-row"><div><h3>${String(exerciseIndex + 1).padStart(2, "0")} &nbsp;${escapeHtml(exercise.name)}</h3><p>Target: ${exercise.targetSets} × ${exercise.targetReps || "—"}${exercise.notes ? ` · ${escapeHtml(exercise.notes)}` : ""}</p></div><div class="log-actions"><button class="inline-icon-button" data-action="replace-active-exercise" data-exercise-index="${exerciseIndex}" aria-label="Replace ${escapeHtml(exercise.name)}" title="Find a similar movement">${icon("swap")}</button><button class="inline-icon-button" data-action="exercise-note" data-exercise-index="${exerciseIndex}" aria-label="Add a note">${icon("edit")}</button><button class="inline-icon-button destructive-icon" data-action="remove-active-exercise" data-exercise-index="${exerciseIndex}" aria-label="Remove ${escapeHtml(exercise.name)} from this session" title="Remove from this session">${icon("trash")}</button></div></div><div class="previous-line">${escapeHtml(prevText)}</div>${exercise.sets.map((set, setIndex) => renderSetLine(exerciseIndex, setIndex, set)).join("")}<button class="add-set" data-action="add-set" data-exercise-index="${exerciseIndex}">+ Add set</button></section>`;
}
function renderSetLine(exerciseIndex, setIndex, set) {
  return `<div class="set-line ${set.complete ? "complete" : ""}"><div class="set-heading"><span>Set ${setIndex + 1}</span><button class="set-done" data-action="complete-set" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" aria-label="${set.complete ? "Mark set incomplete" : "Complete set"}">${icon("check")}</button></div><div class="counter-row">${counterMarkup("weight", exerciseIndex, setIndex, set.weight, `${state.units}`, state.weightStep)}${counterMarkup("reps", exerciseIndex, setIndex, set.reps, "reps", 1)}</div></div>`;
}
function counterMarkup(type, exerciseIndex, setIndex, value, unit, step) {
  const shown = value === "" || value == null ? "—" : escapeHtml(value);
  return `<div><div class="counter"><button data-action="adjust-value" data-type="${type}" data-dir="-1" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" aria-label="Decrease ${type}">−</button><div class="counter-value" data-action="edit-value" data-type="${type}" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" data-unit="${unit}" data-step="${step}">${shown}</div><button data-action="adjust-value" data-type="${type}" data-dir="1" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" aria-label="Increase ${type}">+</button></div><div class="counter-caption">${unit}</div></div>`;
}
function renderRestTimer() {
  const remaining = Math.max(0, Math.ceil((state.activeWorkout.restEndsAt - Date.now()) / 1000));
  return `<div class="rest-banner"><div><small>Take your time</small><strong>${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")} remaining</strong></div><div class="rest-actions"><button data-action="add-rest">+30 sec</button><button data-action="skip-rest">Skip</button></div></div>`;
}
function beginRest(seconds) {
  if (!seconds) return;
  state.activeWorkout.restEndsAt = Date.now() + seconds * 1000;
  save(); render();
  clearInterval(restInterval);
  restInterval = window.setInterval(() => {
    if (!state.activeWorkout?.restEndsAt || Date.now() >= state.activeWorkout.restEndsAt) {
      clearInterval(restInterval); restInterval = null;
      if (state.activeWorkout) { state.activeWorkout.restEndsAt = null; save(); render(); toast("Rest is up. You've got this."); }
      return;
    }
    const banner = document.querySelector(".rest-banner strong");
    if (banner) { const left = Math.ceil((state.activeWorkout.restEndsAt - Date.now()) / 1000); banner.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")} remaining`; }
  }, 1000);
}
function completeSet(exerciseIndex, setIndex) {
  const exercise = state.activeWorkout.exercises[exerciseIndex];
  const set = exercise.sets[setIndex];
  set.complete = !set.complete;
  if (set.complete) beginRest(exercise.rest);
  else { state.activeWorkout.restEndsAt = null; save(); render(); }
}
function finishWorkout() {
  const workout = state.activeWorkout;
  if (!workout) return;
  const finished = { id: workout.id, programDayId: workout.dayId, programWeek: workout.programWeek || 1, cycleId: workout.cycleId, name: workout.name, date: workout.date, duration: Math.max(1, Math.round((Date.now() - workout.startedAt) / 60000)), exercises: workout.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, name: exercise.name, notes: exercise.notes, sets: exercise.sets.filter((set) => set.complete).map(({ weight, reps }) => ({ weight: Number(weight) || 0, reps: Number(reps) || 0 })) })).filter((exercise) => exercise.sets.length) };
  if (finished.exercises.length) {
    state.history.unshift(finished);
    state.history = state.history.slice(0, 250);
    advanceProgramCycle();
    let newPR = null;
    for (const exercise of finished.exercises) for (const set of exercise.sets) {
      const key = exercise.name.toLowerCase();
      const old = state.prs[key];
      const score = Number(set.weight) * (1 + Number(set.reps) / 30);
      if (!old || score > old.score) { state.prs[key] = { weight: set.weight, reps: set.reps, score }; if (!old || Number(set.weight) > Number(old.weight)) newPR = { name: exercise.name, ...set, previous: old }; }
    }
    state.activeWorkout = null; state.todayWorkoutOverride = null; state.activeTab = "Home"; save(); render();
    if (newPR) toast(`New personal best · ${escapeHtml(newPR.name)} ${newPR.weight} ${state.units} × ${newPR.reps}`, true);
    else toast("Workout saved. Nice work.");
  } else {
    state.activeWorkout = null; state.activeTab = "Home"; save(); render(); toast("Workout closed without completed sets.");
  }
  clearInterval(restInterval); restInterval = null;
}
function showSheet(title, description, content, actions = "") {
  document.querySelector(".overlay")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="overlay" data-action="overlay-close"><section class="sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="sheet-top"><div><h2>${escapeHtml(title)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div><button class="sheet-close" data-action="close-sheet" aria-label="Close">×</button></div>${content}${actions ? `<div class="sheet-actions">${actions}</div>` : ""}</section></div>`);
  const review = document.querySelector("#import-review");
  review?.querySelectorAll(":scope > .eyebrow").forEach((heading, groupIndex) => {
    const source = review.querySelector(`[data-import="group"][data-group="${groupIndex}"]`);
    if (!source) return;
    const groupName = heading.textContent.split(" · ").slice(1).join(" · ");
    const select = document.createElement("select");
    select.className = "select-field";
    select.dataset.import = "group";
    select.dataset.group = String(groupIndex);
    select.setAttribute("aria-label", `Workout day ${groupIndex + 1}`);
    select.innerHTML = ["Unscheduled", ...weekdayNames].map((day) => `<option value="${day}">${day}</option>`).join("");
    select.value = source.value;
    heading.replaceChildren(select, document.createTextNode(` · ${groupName}`));
    review.querySelectorAll(`input[data-import="group"][data-group="${groupIndex}"]`).forEach((input) => input.remove());
  });
}
function showProgramEditor() {
  showSheet("Program name", "Give this training block a name.", `<label class="field"><span class="field-label">Program name</span><input class="text-field" id="program-name" value="${escapeHtml(state.program.name)}" maxlength="40"></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-program">SAVE</button>`);
}
function showDayEditor() {
  const availableDays = weekdayNames.filter((day) => !state.program.days.some((item) => item.day === day));
  if (!availableDays.length) { toast("Your plan already has every day of the week."); return; }
  showSheet("Add a workout", "Choose a day, then give this session a name.", `<label class="field"><span class="field-label">Day</span><select class="select-field" id="day-name">${availableDays.map((day) => `<option>${day}</option>`).join("")}</select></label><label class="field"><span class="field-label">Workout name</span><input class="text-field" id="workout-name" placeholder="e.g. Lower Body" maxlength="45"></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-day">ADD WORKOUT</button>`);
}
function showExerciseEditor(dayId) {
  showSheet("Add an exercise", "Add only the details in your plan. You can fill in the rest later.", `<input type="hidden" id="exercise-day" value="${escapeHtml(dayId)}"><label class="field"><span class="field-label">Exercise name</span><input class="text-field" id="exercise-name" placeholder="e.g. Dumbbell row" maxlength="60"></label><div class="counter-row"><label class="field"><span class="field-label">Sets</span><input class="number-field" id="exercise-sets" type="number" min="1" max="20" value="3"></label><label class="field"><span class="field-label">Rep target</span><input class="number-field" id="exercise-reps" type="number" min="1" max="100" placeholder="8"></label></div><div class="counter-row"><label class="field"><span class="field-label">Rest (seconds)</span><input class="number-field" id="exercise-rest" type="number" min="0" max="900" placeholder="Optional"></label><label class="field"><span class="field-label">RPE / RIR</span><input class="text-field" id="exercise-effort" placeholder="Optional"></label></div><label class="field"><span class="field-label">Notes</span><input class="text-field" id="exercise-notes" placeholder="Optional"></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-exercise">ADD EXERCISE</button>`);
}
function showNameEditor() {
  showSheet("Your name", "This appears in your daily welcome.", `<label class="field"><span class="field-label">Name</span><input class="text-field" id="user-name" value="${escapeHtml(state.name)}" maxlength="32"></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-name">SAVE</button>`);
}
function exportBackup() {
  const backup = { app: "Track-Her", backupVersion: 1, exportedAt: new Date().toISOString(), state };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `track-her-backup-${todayKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup downloaded.");
}
function openBackupPicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.app !== "Track-Her" || backup.backupVersion !== 1 || backup.state?.version !== 1 || !Array.isArray(backup.state.program?.days) || !Array.isArray(backup.state.history)) throw new Error("This file is not a valid Track-Her backup.");
      restoreDraft = backup.state;
      const exported = backup.exportedAt ? ` Backup date: ${new Date(backup.exportedAt).toLocaleDateString()}.` : "";
      showSheet("Restore this backup?", `This replaces the data on this device with ${backup.state.program.days.length} workout days and ${backup.state.history.length} saved workouts.${exported}`, "", `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="confirm-restore">RESTORE DATA</button>`);
    } catch (error) {
      showSheet("Can't restore this file", error.message || "Choose a Track-Her backup JSON file.", "", `<button class="primary-button" data-action="close-sheet">CLOSE</button>`);
    }
  });
  input.click();
}
async function installApp() {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    await prompt.prompt();
    await prompt.userChoice;
    if (state.activeTab === "Profile") render();
    return;
  }
  if (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true) { toast("Track-Her is already installed."); return; }
  const instructions = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "In Safari, open Share and choose Add to Home Screen."
    : "Open your browser menu and choose Install app or Add to Home screen.";
  showSheet("Install Track-Her", instructions, "", `<button class="primary-button" data-action="close-sheet">GOT IT</button>`);
}
function showNoteEditor(index) {
  const exercise = state.activeWorkout.exercises[index];
  showSheet(`${exercise.name} notes`, "A quick reminder for this session.", `<label class="field"><span class="field-label">Notes</span><textarea id="workout-note" class="textarea-field" maxlength="240">${escapeHtml(exercise.notes)}</textarea></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-note" data-exercise-index="${index}">SAVE</button>`);
}
function confirmRemovePlanExercise(dayId, exerciseId) {
  const day = state.program.days.find((item) => item.id === dayId);
  const exercise = day?.exercises.find((item) => item.id === exerciseId);
  if (!day || !exercise) return;
  showSheet(`Remove ${exercise.name}?`, `Remove it from ${day.name}? Completed workout history will stay saved.`, "", `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="danger-button" data-action="confirm-remove-plan-exercise" data-day-id="${dayId}" data-exercise-id="${exerciseId}">REMOVE</button>`);
}
function confirmRemoveActiveExercise(index) {
  const exercise = state.activeWorkout.exercises[index];
  if (!exercise) return;
  if (exercise.sets.some((set) => set.complete)) {
    showSheet("Keep this exercise", "It already has completed sets, so removing it could hide logged work. Finish the session first, then remove it from Plan if you no longer want it in the routine.", "", `<button class="primary-button" data-action="close-sheet">GOT IT</button>`);
    return;
  }
  showSheet(`Remove ${exercise.name}?`, "This removes the exercise from today's session only. It stays in your plan.", "", `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="danger-button" data-action="confirm-remove-active-exercise" data-exercise-index="${index}">REMOVE</button>`);
}
function showReplacementSheet({ name, source, dayId = "", exerciseId = "", exerciseIndex = "" }) {
  if (source === "workout" && state.activeWorkout.exercises[Number(exerciseIndex)].sets.some((set) => set.complete)) {
    showSheet("Keep this movement", "Some sets are already logged, so swapping now could attach the wrong lift to those results. You can replace it from Plan for future workouts.", "", `<button class="primary-button" data-action="close-sheet">GOT IT</button>`);
    return;
  }
  const suggestions = replacementSuggestions(name);
  const context = `data-source="${source}" data-day-id="${escapeHtml(dayId)}" data-exercise-id="${escapeHtml(exerciseId)}" data-exercise-index="${escapeHtml(exerciseIndex)}"`;
  const options = suggestions?.options.map(([replacement, reason, equipment]) => `<button class="replacement-option" data-action="choose-replacement" ${context} data-replacement-name="${escapeHtml(replacement)}" data-replacement-equipment="${equipment}"><span><strong>${escapeHtml(replacement)}</strong><small>${escapeHtml(reason)}</small></span>${icon("arrow")}</button>`).join("") || `<p class="replacement-empty">No close match in the movement guide yet. You can enter your own alternative below.</p>`;
  const content = `<p class="replacement-pattern">${suggestions ? `Suggested for the ${escapeHtml(suggestions.label.toLowerCase())} movement pattern` : "No movement pattern match found"} · Local exercise guide</p><div class="replacement-options">${options}</div><label class="field"><span class="field-label">Use another exercise</span><input id="custom-replacement" class="text-field" maxlength="60" placeholder="Type an exercise name"></label>`;
  showSheet(`Replace ${name}`, "Choose a similar movement or enter your own.", content, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="choose-custom-replacement" ${context}>REPLACE</button>`);
}
function applyMovementReplacement(button, name, equipment) {
  const { source, dayId, exerciseId } = button.dataset;
  const activeExercise = source === "workout" ? state.activeWorkout.exercises[Number(button.dataset.exerciseIndex)] : null;
  if (activeExercise?.sets.some((set) => set.complete)) { document.querySelector(".overlay")?.remove(); toast("Finish this movement before swapping it."); return; }
  const day = state.program.days.find((item) => item.id === dayId);
  const plannedExercise = day?.exercises.find((item) => item.id === exerciseId) || (activeExercise && state.program.days.flatMap((item) => item.exercises).find((item) => item.id === activeExercise.exerciseId));
  const newId = uid();
  if (plannedExercise) Object.assign(plannedExercise, { id: newId, name, equipment, notes: "" });
  if (activeExercise) {
    activeExercise.exerciseId = newId;
    activeExercise.name = name;
    activeExercise.notes = "";
    activeExercise.sets = activeExercise.sets.map(() => ({ weight: "", reps: activeExercise.targetReps, complete: false }));
  }
  document.querySelector(".overlay")?.remove();
  save(); render(); toast(`${escapeHtml(name)} added to your plan.`);
}
function showWorkoutDayPicker(scheduledDayId) {
  const options = state.program.days.filter((day) => day.id !== scheduledDayId && !isWorkoutComplete(day));
  if (!options.length) { toast("There are no other sessions available this week."); return; }
  const content = `<div class="replacement-options">${options.map((day) => `<button class="replacement-option" data-action="choose-today-workout" data-scheduled-day-id="${scheduledDayId}" data-workout-id="${day.id}"><span><strong>${escapeHtml(day.name)}</strong><small>${escapeHtml(day.day)} · ${day.exercises.length} exercises</small></span>${icon("arrow")}</button>`).join("")}</div>`;
  showSheet("Change today's session", "For today only. Your program stays as planned, and your scheduled session counts as complete when you finish.", content, `<button class="secondary-button" data-action="close-sheet">Keep original</button>`);
}
function showUnitsOnboarding() {
  document.querySelector(".onboarding").innerHTML = `<div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Track-Her</div><div class="onboarding-visual" style="min-height:140px"><div style="text-align:center"><div class="eyebrow">One last thing</div><h2 style="margin-top:8px">Your preferred units</h2></div></div><div class="eyebrow">Choose what feels familiar</div><div class="onboarding-actions" style="grid-template-columns:1fr 1fr"><button class="${state.units === "kg" ? "primary-button" : "secondary-button"}" data-action="set-units-onboarding" data-units="kg">kg <span style="font-weight:400">Kilograms</span></button><button class="${state.units === "lbs" ? "primary-button" : "secondary-button"}" data-action="set-units-onboarding" data-units="lbs">lbs <span style="font-weight:400">Pounds</span></button></div></div><div><div class="step-dots"><i></i><i></i><i class="active"></i></div><button class="primary-button" style="width:100%" data-action="complete-onboarding">GO TO MY WORKOUT ${icon("arrow")}</button></div>`;
}
function showPlanChoice() {
  document.querySelector(".onboarding").innerHTML = `<div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Track-Her</div><div class="onboarding-visual" style="min-height:140px"><div style="text-align:center"><div class="eyebrow">Start with what you have</div><h2 style="margin-top:8px">Your plan, your way</h2></div></div><div class="eyebrow">How would you like to add your plan?</div><div class="onboarding-actions"><button class="secondary-button" data-action="import-pdf"><span><strong>Upload workout PDF</strong><span>We'll read it together, then you review</span></span>${icon("arrow")}</button><button class="secondary-button" data-action="create-program"><span><strong>Create my plan</strong><span>Build a simple weekly schedule</span></span>${icon("arrow")}</button><button class="link-button" data-action="use-sample">Explore with a sample plan</button></div></div><div><div class="step-dots"><i></i><i class="active"></i><i></i></div><button class="link-button" data-action="onboarding-back">Back</button></div>`;
}
function useSamplePlan() {
  state.onboarded = true; state.activeTab = "Home"; save(); render();
}
function finishOnboarding() { state.onboarded = true; state.activeTab = "Home"; save(); render(); }
async function openPdfPicker() {
  const input = document.createElement("input"); input.type = "file"; input.accept = ".pdf,application/pdf";
  input.addEventListener("change", async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      showSheet("Reading your plan", "Pulling the text from your PDF. Nothing is saved until you confirm.", `<div class="empty-state"><p>This usually takes a few seconds…</p></div>`);
      const extracted = await extractPdfText(file);
      importDraft = parseWorkoutPdf(extracted.pages, extracted.text, file.name);
      showImportReview(importProgramName.endsWith("Week 1") ? `${file.name} · Week 1 only` : file.name);
    } catch (error) { document.querySelector(".overlay")?.remove(); showSheet("Couldn't read this PDF", "Try a text-based PDF, or add your plan manually.", `<div class="empty-state"><p>${escapeHtml(error.message || "This PDF could not be read.")}</p></div>`, `<button class="secondary-button" data-action="close-sheet">Close</button><button class="primary-button" data-action="create-program">CREATE MY PLAN</button>`); }
  });
  input.click();
}
async function extractPdfText(file) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.filter((item) => item.str?.trim()).map((item) => ({
      x: item.transform?.[4] || 0,
      y: item.transform?.[5] || 0,
      width: item.width || 0,
      text: item.str.trim(),
      rotated: Math.abs(item.transform?.[1] || 0) > Math.abs(item.transform?.[0] || 0),
    }));
    pages.push({ number: pageNumber, width: page.getViewport({ scale: 1 }).width, items });
  }
  const text = pages.map((page) => pdfTextRows(page.items).map((row) => row.items.map((item) => item.text).join(" ")).join("\n")).join("\n");
  return { pages, text };
}
function pdfTextRows(items) {
  const rows = [];
  for (const item of items) {
    let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
    if (!row) { row = { y: item.y, items: [] }; rows.push(row); }
    row.items.push(item);
  }
  return rows.sort((a, b) => b.y - a.y).map((row) => ({ ...row, items: row.items.sort((a, b) => a.x - b.x) }));
}
function parseWorkoutPdf(pages, fallbackText, fileName = "") {
  const tablePages = pages.filter((page) => {
    const text = page.items.map((item) => item.text).join(" ");
    return /WORKING\s+SETS/i.test(text) && /REPS\s*\/\s*TIME/i.test(text);
  });
  const plan = tablePages.flatMap(parseWorkoutTablePage);
  if (plan.length) {
    importProgramName = "Imported Program · Full Cycle";
    return plan;
  }
  const fileTitle = fileName.replace(/\.pdf$/i, "").replace(/\s*\(\d+\)$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  const tablePlan = parseGenericWorkoutTables(pages);
  if (tablePlan.reduce((total, group) => total + group.exercises.length, 0) >= 2) {
    importProgramName = fileTitle || (tablePlan.some((group) => group.programWeek > 1) ? "Imported Program · Full Cycle" : "Imported Program");
    return tablePlan;
  }
  importProgramName = fileTitle || "Imported Program";
  const exerciseCount = (groups) => groups.reduce((total, group) => total + group.exercises.length, 0);
  return [pages.map((page) => importPageText(page, true)).join("\n"), pages.map((page) => importPageText(page, false)).join("\n"), fallbackText]
    .map(parseWorkoutText).reduce((best, groups) => exerciseCount(groups) > exerciseCount(best) ? groups : best, []);
}
function parseWorkoutTablePage(page) {
  const rows = pdfTextRows(page.items);
  const pageText = page.items.map((item) => item.text).join(" ");
  const pageHeading = pageText.match(/\bWEEK\s*(\d+)[^/]{0,60}\/\s*DAY\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
  if (!pageHeading) return [];
  const weekNumber = Number(pageHeading[1]);
  const firstDay = Number(pageHeading[2]);
  const lastDay = Number(pageHeading[3] || pageHeading[2]);
  const dayLabels = new Map();
  for (const row of rows) for (const item of row.items) {
    if (item.x >= 180) continue;
    const marker = item.text.match(/\bDAY\s*(\d+)\s*:\s*(.+)/i);
    if (marker) dayLabels.set(Number(marker[1]), marker[2].trim());
  }
  const groups = new Map();
  let currentDay = firstDay;
  let tableHeaderCount = 0;
  let lastExercise = null;
  let lastExerciseDay = null;
  let lastExerciseY = null;
  for (const row of rows) {
    const tableHeader = row.items.some((item) => item.x < 150 && /VIDEO\s+DEMO/i.test(item.text));
    if (tableHeader) {
      if (tableHeaderCount > 0 && currentDay < lastDay) currentDay += 1;
      tableHeaderCount += 1;
    }
    const markerItem = row.items.find((item) => item.x < 180 && /\bDAY\s*\d+\s*:/i.test(item.text));
    const marker = markerItem?.text.match(/\bDAY\s*(\d+)\s*:\s*(.+)/i);
    if (marker) currentDay = Number(marker[1]);
    const workingSetsItem = row.items.find((item) => item.x >= 360 && item.x < 430 && /^\d+$/.test(item.text));
    const repsItem = row.items.find((item) => item.x >= 430 && item.x < 480 && /^\d+(?:\s*[-/]\s*\d+)?(?:\s*-?\s*SEC)?$/i.test(item.text));
    const exerciseName = row.items.filter((item) => item.x >= 180 && item.x < 310 && !/^(EXERCISE|WARMUP|WORKING|REPS|NOTES)$/i.test(item.text)).map((item) => item.text).join(" ").trim();
    if (workingSetsItem && repsItem && exerciseName) {
      const groupName = dayLabels.get(currentDay) || `Training Day ${currentDay}`;
      if (!groups.has(currentDay)) groups.set(currentDay, { id: uid(), day: "Unscheduled", programWeek: weekNumber, name: `Week ${weekNumber} · Day ${currentDay} · ${groupName.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())}`, exercises: [] });
      const warmup = row.items.find((item) => item.x >= 300 && item.x < 360 && /^\d+$/.test(item.text))?.text;
      const effortItem = row.items.find((item) => item.x >= 480 && item.x < 530 && /RPE\s*\d+/i.test(item.text));
      const intensityItem = row.items.find((item) => item.x >= 480 && item.x < 530 && /%/.test(item.text));
      const restItem = row.items.find((item) => item.x >= 530 && item.x < 585 && /\d/.test(item.text));
      const repMatch = repsItem.text.match(/^(\d+)(?:\s*[-/]\s*(\d+))?(?:\s*-?\s*SEC)?$/i);
      const notes = [];
      if (warmup && Number(warmup)) notes.push(`${warmup} warm-up sets`);
      if (intensityItem) notes.push(`Target load: ${intensityItem.text} 1RM`);
      const restMatch = restItem?.text.match(/^(\d+(?:\.\d+)?)\s*(MIN|SEC)$/i);
      if (restItem && !restMatch) notes.push(`Rest: ${restItem.text}`);
      if (/SEC/i.test(repsItem.text)) notes.push(`Timed target: ${repMatch[1]} sec`);
      if (repMatch[2]) notes.push(`${repsItem.text.includes("/") ? "Rep scheme" : "Rep range"}: ${repMatch[1]}${repsItem.text.includes("/") ? "/" : "-"}${repMatch[2]}`);
      if (/\bA[1-4]\s*:/i.test(exerciseName)) notes.push("Superset");
      if (/DROP\s*SET/i.test(exerciseName)) notes.push("Drop set");
      const rowNotes = row.items.filter((item) => item.x >= 770 && !/^NOTES$/i.test(item.text)).map((item) => item.text).join(" ");
      if (rowNotes) notes.push(rowNotes);
      const restSeconds = restMatch ? Number(restMatch[1]) * (/MIN/i.test(restMatch[2]) ? 60 : 1) : "";
      const exercise = { id: uid(), name: exerciseName.replace(/\s+/g, " "), sets: Number(workingSetsItem.text), reps: Number(repMatch[1]), rest: restSeconds, effort: effortItem?.text.replace(/\s+/g, " ") || "", notes: notes.join(" · "), equipment: "other" };
      groups.get(currentDay).exercises.push(exercise);
      lastExercise = exercise;
      lastExerciseDay = currentDay;
      lastExerciseY = row.y;
    } else if (lastExercise && currentDay === lastExerciseDay && Math.abs(lastExerciseY - row.y) <= 20) {
      const continuation = row.items.filter((item) => item.x >= 180 && item.x < 310).map((item) => item.text).join(" ").trim();
      const noteContinuation = row.items.filter((item) => item.x >= 770 && !/^NOTES$/i.test(item.text)).map((item) => item.text).join(" ").trim();
      if (continuation) lastExercise.name = `${lastExercise.name} ${continuation}`.replace(/\s+/g, " ");
      if (noteContinuation) lastExercise.notes = [lastExercise.notes, noteContinuation].filter(Boolean).join(" ");
      lastExerciseY = row.y;
    }
  }
  return [...groups.values()].filter((group) => group.exercises.length);
}
const importWeekPattern = /^\s*weeks?\s*(\d{1,2})(?:\s*(?:-|–|—|to|&)\s*(\d{1,2}))?/i;
const importSessionPattern = /\b(?:day|session|workout)\s*(?:\d{1,2}|[a-e])\b/i;
const importHeadingPattern = /^\s*(?:weeks?\s*\d|(?:day|session|workout)\s*(?:\d{1,2}|[a-e])\b|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b)/i;
const importHeaderRules = [
  ["ignore", /video|demo|link|^#$|^no\.?$|^ls\s*rpe$|last\s*set|^set\s*\d+$|^\d+$|^done$|^log$/i],
  ["warmup", /warm/i],
  ["substitution", /substitut|alternat|swap|option/i],
  ["notes", /note|cue|comment|instruction|coach|technique/i],
  ["tempo", /tempo/i],
  ["rest", /rest|recovery/i],
  ["setsreps", /sets?\s*[x×/]\s*reps?/i],
  ["effort", /rpe|rir|effort/i],
  ["intensity", /%|1\s*rm|intensity/i],
  ["load", /load|weight|kg|lbs/i],
  ["reps", /rep|time|duration/i],
  ["sets", /set/i],
  ["exercise", /exercise|movement|lift|name/i],
];
const importHeaderWord = /^(?:exercises?|movements?|lifts?|names?|sets?|working|warm|warmup|up|reps?|repetitions|time|duration|rest|recovery|rpe|rir|lsrpe|effort|intensity|%?1rm|%|load|weight|kg|lbs|tempo|notes?|coaching|cues?|comments?|instructions?|technique|substitutions?|substitutes?|alternatives?|options?|swap|video|demo|links?|weeks?|ls|last|done|log|of|and|or|x|×|min|mins|sec|secs|seconds|minutes|target|top|#|no|\d{1,2})$/i;
function isImportHeaderCell(text) {
  const words = text.split(/[\s/()\-–:,.]+/).filter(Boolean);
  return text.length <= 32 && words.length > 0 && words.filter((word) => importHeaderWord.test(word)).length / words.length >= 0.6;
}
function classifyImportHeader(text) {
  if (/^weeks?\s*\d{1,2}$/i.test(text.trim())) return "week";
  return importHeaderRules.find(([, pattern]) => pattern.test(text))?.[0] || null;
}
// Joins pdf.js fragments that touch (e.g. "R" + "eps", "com" + "fortable") into one item.
function mergeImportFragments(items) {
  return items.reduce((merged, item) => {
    const previous = merged.at(-1);
    if (previous && item.x >= previous.x && item.x - (previous.x + previous.width) < 1.2) {
      previous.text += item.text;
      previous.width = Math.max(previous.width, item.x + item.width - previous.x);
    } else merged.push({ ...item });
    return merged;
  }, []);
}
function importRowsOf(items, tolerance = 3) {
  const rows = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.at(-1);
    if (row && row.y - item.y <= tolerance) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  return rows.map((row) => ({ y: row.y, items: mergeImportFragments(row.items.sort((a, b) => a.x - b.x)) }));
}
function importText(items) {
  return importRowsOf(items).map((row) => row.items.map((item) => item.text).join(" ")).join(" ").replace(/\s+/g, " ")
    .replace(/(\w)- (\w)/g, (match, before, after) => /[A-Z0-9]/.test(before + after) ? `${before}-${after}` : `${before}${after}`).trim();
}
function importLabelText(text) {
  const label = text.replace(importWeekPattern, "").replace(/\s*#\s*/g, " #").replace(/^[\s\-–—:|·/.,]+|[\s\-–—:|·/.,]+$/g, "").replace(/\s+/g, " ").trim();
  return /[a-z][A-Z]/.test(label) || label === label.toUpperCase() || label === label.toLowerCase() ? label.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (match, before, letter) => before + letter.toUpperCase()) : label;
}
function findImportHeaders(rows) {
  const isHeaderLike = (row) => row.items.every((item) => !/^\d+(?:[.,]\d+)?$/.test(item.text) && (item.text.match(/\d/g) || []).length <= 1 && item.text.split(/\s+/).length <= 4);
  const scored = rows.map((row) => {
    const kinds = row.items.map((item) => isImportHeaderCell(item.text) ? classifyImportHeader(item.text) : null);
    const named = new Set(kinds.filter((kind) => kind && kind !== "ignore" && kind !== "week"));
    const weekColumns = kinds.filter((kind) => kind === "week").length;
    const hasTarget = named.has("sets") || named.has("reps") || named.has("setsreps") || weekColumns >= 2;
    return { row, score: hasTarget ? named.size + (weekColumns >= 2 ? 1 : 0) : 0, weekColumns };
  }).filter((candidate) => candidate.score >= 3).sort((a, b) => b.score - a.score);
  const cores = [];
  for (const candidate of scored) if (!cores.some((core) => Math.abs(core.row.y - candidate.row.y) <= 30)) cores.push(candidate);
  return cores.map(({ row: core, weekColumns }) => {
    const band = rows.filter((row) => row === core || (Math.abs(row.y - core.y) <= 22 && isHeaderLike(row) && !cores.some((other) => other.row === row)));
    const headerItems = band.flatMap((row) => row.items).filter((item) => weekColumns >= 2 || !importWeekPattern.test(item.text));
    const columns = [];
    for (const item of [...headerItems].sort((a, b) => a.x - b.x)) {
      const column = columns.at(-1);
      if (column && item.x <= column.right + 1) { column.items.push(item); column.right = Math.max(column.right, item.x + item.width); }
      else columns.push({ left: item.x, right: item.x + item.width, items: [item] });
    }
    for (const column of columns) {
      column.header = importText(column.items);
      column.kind = classifyImportHeader(column.header) || "ignore";
      column.center = (column.left + column.right) / 2;
      if (column.kind === "week") column.week = Number(column.header.match(/\d+/)[0]);
    }
    return { top: Math.max(...band.map((row) => row.y)), bottom: Math.min(...band.map((row) => row.y)), columns };
  }).sort((a, b) => b.top - a.top);
}
// Column edges sit in the widest empty vertical strip between neighbouring header centres.
function importColumnBoundaries(columns, items) {
  return columns.slice(0, -1).map((column, index) => {
    const start = column.center, end = columns[index + 1].center;
    const covered = new Uint8Array(Math.max(1, Math.ceil(end - start)));
    for (const item of items) {
      if (item.rotated || item.width >= end - start) continue;
      for (let x = Math.max(0, Math.floor(item.x - start)); x < Math.min(covered.length, Math.ceil(item.x + item.width - start)); x += 1) covered[x] = 1;
    }
    let best = null, runStart = null;
    for (let x = 0; x <= covered.length; x += 1) {
      if (x < covered.length && !covered[x]) { if (runStart === null) runStart = x; }
      else if (runStart !== null) { if (!best || x - runStart > best[1] - best[0]) best = [runStart, x]; runStart = null; }
    }
    return best && best[1] - best[0] >= 2 ? start + (best[0] + best[1]) / 2 : (start + end) / 2;
  });
}
// Gives each wrapped line of a column to the right exercise row, whether the layout is top-aligned or vertically centred.
function assignImportLines(lines, anchors, spacing) {
  const result = anchors.map(() => []);
  const free = [];
  for (const line of lines) {
    const index = anchors.findIndex((anchor) => Math.abs(anchor - line.y) <= 3);
    if (index >= 0) result[index].push(...line.items); else free.push(line);
  }
  for (let index = -1; index < anchors.length; index += 1) {
    const upper = index >= 0 ? anchors[index] : Infinity, lower = index + 1 < anchors.length ? anchors[index + 1] : -Infinity;
    const segment = free.filter((line) => line.y < upper && line.y > lower).sort((a, b) => b.y - a.y);
    if (!segment.length) continue;
    if (index === -1 || index === anchors.length - 1) {
      const target = index === -1 ? 0 : index;
      let edge = anchors[target];
      for (const line of index === -1 ? [...segment].reverse() : segment) {
        if (Math.abs(edge - line.y) > spacing * 2.2) break;
        result[target].push(...line.items); edge = line.y;
      }
      continue;
    }
    const ys = [upper, ...segment.map((line) => line.y), lower];
    const gaps = ys.slice(1).map((y, gapIndex) => ys[gapIndex] - y);
    const widest = Math.max(...gaps);
    const split = widest > Math.min(...gaps) * 1.5 && widest > spacing * 1.3 ? gaps.indexOf(widest) : gaps.length;
    segment.forEach((line, lineIndex) => result[lineIndex < split ? index : index + 1].push(...line.items));
  }
  return result;
}
function importRepTarget(text) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value || /^n\/?a$|^-+$/i.test(value)) return { reps: "", note: "" };
  if (/^\d{1,3}$/.test(value)) return { reps: Number(value), note: "" };
  const range = value.match(/^(\d{1,3})\s*[-–]\s*(\d{1,3})$/);
  if (range) return { reps: Number(range[1]), note: `Rep range: ${range[1]}-${range[2]}` };
  if (/^\d{1,3}\s*(?:s|sec|secs|seconds)\b|^\d{1,2}:\d{2}$|hold/i.test(value)) return { reps: "", note: `Timed: ${value}` };
  const first = value.match(/^(\d{1,3})/);
  return { reps: first ? Number(first[1]) : "", note: `Reps: ${value}` };
}
function importRestSeconds(text, header = "") {
  const value = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!value || /^n\/?a$|^-+$/.test(value)) return { rest: "", note: "" };
  const clock = value.match(/(\d{1,2}):(\d{2})/);
  const number = value.match(/(\d+(?:\.\d+)?)/);
  let rest = "";
  if (clock) rest = Number(clock[1]) * 60 + Number(clock[2]);
  else if (number) {
    const minutes = /\d\s*(?:[-–]\s*\d+\s*)?(?:m|min|mins|minutes)\b|'/.test(value) || (!/\d\s*(?:[-–]\s*\d+\s*)?(?:s|sec|secs|seconds)\b|"/.test(value) && (/min/i.test(header) || Number(number[1]) <= 5));
    rest = Math.round(Number(number[1]) * (minutes ? 60 : 1));
  }
  return { rest: rest || "", note: /\d\s*[-–]\s*\d|~/.test(value) ? `Rest: ${text.replace(/\s+/g, " ").trim()}` : "" };
}
function importEffort(text, header = "") {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value || /^n\/?a$|^-+$/i.test(value)) return { effort: "", note: "" };
  if (/%/.test(value) && !/rpe|rir/i.test(value)) return { effort: "", note: `Target load: ${value}${/1\s*rm/i.test(header) && !/rm/i.test(value) ? " 1RM" : ""}` };
  const labelled = value.match(/^(RPE|RIR)\s*(.+)$/i);
  if (labelled) return { effort: `${labelled[1].toUpperCase()} ${labelled[2]}`, note: "" };
  return { effort: `${/rir/i.test(header) && !/rpe/i.test(header) ? "RIR" : "RPE"} ${value}`, note: "" };
}
// "4x8", "3 sets of 10-12", "4×6 @ RPE 8" → sets, rep target and any effort written inline.
function importSetsReps(text) {
  const match = text.replace(/\s+/g, " ").trim().match(/^(\d{1,2})\s*(?:sets?\s*(?:of|x|×)|[x×])\s*(.+)$/i);
  if (!match) return null;
  const effortMatch = match[2].match(/@?\s*\b(RPE|RIR)\s*[:=]?\s*(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)/i);
  const percentMatch = match[2].match(/@?\s*(\d{2,3}(?:\.\d)?\s*%(?:\s*1\s*RM)?)/i);
  const reps = match[2].replace(effortMatch?.[0] || "", "").replace(percentMatch?.[0] || "", "").replace(/\breps?\b/i, "").replace(/[@,·]\s*$/, "").trim();
  return { sets: Number(match[1]), reps, effort: effortMatch ? `${effortMatch[1].toUpperCase()} ${effortMatch[2]}` : "", load: percentMatch?.[1] || "" };
}
function buildImportedExercise(cells, weekCell = null) {
  const text = (kind) => (cells[kind] || []).map((cell) => cell.text).filter((value) => value && !/^n\/?a$/i.test(value)).join(" / ");
  const header = (kind) => cells[kind]?.[0]?.header || "";
  let repsText = text("reps"), sets = "", effort = "";
  const trailingTime = text("exercise").match(/\s+(\d{1,3}\s*(?:s|sec|secs))$/i);
  const name = text("exercise").replace(trailingTime && repsText.replace(/\s/g, "").toLowerCase().includes(trailingTime[1].replace(/\s/g, "").toLowerCase()) ? trailingTime[0] : "", "").replace(/^\d{1,2}[.)]\s+/, "").trim();
  if (!/[a-z]{2}/i.test(name)) return null;
  const notes = [];
  const setsText = text("sets");
  if (/^\d{1,2}/.test(setsText)) {
    sets = Number(setsText.match(/^\d{1,2}/)[0]);
    if (/^\d{1,2}\s*[-–]\s*\d{1,2}$/.test(setsText)) notes.push(`Sets: ${setsText}`);
  }
  for (const combined of [text("setsreps"), weekCell].filter(Boolean)) {
    const parsed = importSetsReps(combined);
    if (parsed) { sets = parsed.sets; repsText = parsed.reps; effort = parsed.effort || effort; if (parsed.load) notes.push(`Target load: ${parsed.load}`); }
    else if (combined === weekCell) repsText = combined;
  }
  if (weekCell !== null && !/\d|amrap|max|fail/i.test(weekCell)) return null;
  const warmup = text("warmup");
  if (warmup && !/^0$/.test(warmup)) notes.push(`${warmup} warm-up sets`);
  const target = importRepTarget(repsText);
  if (target.note) notes.push(target.note);
  const rest = importRestSeconds(text("rest"), header("rest"));
  if (rest.note) notes.push(rest.note);
  for (const cell of cells.effort || []) {
    const parsed = importEffort(cell.text, cell.header);
    if (parsed.note) notes.push(parsed.note);
    effort = effort || parsed.effort;
  }
  for (const cell of cells.intensity || []) if (cell.text && !/^n\/?a$/i.test(cell.text)) notes.push(importEffort(cell.text, `${cell.header} %`).note || `Target load: ${cell.text}`);
  if (text("load")) notes.push(`Load: ${text("load")}`);
  if (text("tempo")) notes.push(`Tempo: ${text("tempo")}`);
  if (/^[A-Z]\d\s*[.:)]/.test(name) && !/superset/i.test(text("notes"))) notes.push("Superset");
  if (/drop\s*set/i.test(name)) notes.push("Drop set");
  if (text("substitution")) notes.push(`Subs: ${text("substitution")}`);
  if (text("notes")) notes.push(text("notes"));
  return { id: uid(), name, sets: sets || 1, reps: target.reps, rest: rest.rest, effort, notes: notes.join(" · "), equipment: "other" };
}
function parseGenericWorkoutTables(pages) {
  const sessions = [];
  const weeks = { offset: 0, lastRaw: 0, current: null, found: false };
  const absoluteWeeks = (start, end = start) => {
    if (start < weeks.lastRaw) weeks.offset += weeks.lastRaw;
    weeks.lastRaw = end;
    weeks.found = true;
    return Array.from({ length: Math.min(16, end - start + 1) }, (_, index) => weeks.offset + start + index);
  };
  for (const page of pages) {
    const flat = page.items.filter((item) => !item.rotated);
    const rows = importRowsOf(flat);
    const headers = findImportHeaders(rows);
    const markers = rows.flatMap((row) => row.items.filter((item) => importWeekPattern.test(item.text)).map((item) => ({ y: row.y, match: item.text.match(importWeekPattern) })));
    let previousBottom = Infinity;
    headers.forEach((header, tableIndex) => {
      const nextTop = headers[tableIndex + 1]?.top ?? -Infinity;
      const body = flat.filter((item) => item.y < header.bottom - 2 && item.y > nextTop + 2);
      const { columns } = header;
      const boundaries = importColumnBoundaries(columns, body);
      const columnOf = (item) => { const index = boundaries.findIndex((edge) => item.x + item.width / 2 < edge); return index === -1 ? columns.length - 1 : index; };
      const weekColumns = columns.filter((column) => column.kind === "week");
      const anchorKind = ["sets", "setsreps", "reps"].find((kind) => columns.some((column) => column.kind === kind)) || (weekColumns.length ? "week" : null);
      if (!anchorKind) return;
      const anchorPattern = { sets: /^\d{1,2}(?:\s*[-–]\s*\d{1,2})?$/, setsreps: /^\d{1,2}\s*(?:sets?\s*)?[x×]/i, reps: /^(?:\d|amrap|max|fail)/i, week: /^\d/ }[anchorKind];
      const anchorColumn = columns.indexOf(columns.find((column) => column.kind === anchorKind));
      const anchors = [];
      for (const row of importRowsOf(body.filter((item) => columnOf(item) === anchorColumn))) {
        if (row.items.some((item) => anchorPattern.test(item.text)) && !anchors.some((anchor) => Math.abs(anchor - row.y) <= 3)) anchors.push(row.y);
      }
      if (!anchors.length) return;
      // A session/week heading after the last row starts the next table's title, not a wrapped cell.
      const headingRow = importRowsOf(body.filter((item) => item.y < anchors.at(-1) - 3)).find((row) => importHeadingPattern.test(row.items.map((item) => item.text).join(" ")));
      if (headingRow) body.splice(0, body.length, ...body.filter((item) => item.y > headingRow.y + 3));
      const bodyRows = importRowsOf(body);
      const gaps = bodyRows.slice(1).map((row, index) => bodyRows[index].y - row.y).filter((gap) => gap > 3 && gap <= 30).sort((a, b) => a - b);
      const spacing = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12;
      const cellsByAnchor = anchors.map(() => ({}));
      let tableBottom = anchors.at(-1);
      columns.forEach((column, columnIndex) => {
        const lines = importRowsOf(body.filter((item) => columnOf(item) === columnIndex));
        assignImportLines(lines, anchors, spacing).forEach((items, anchorIndex) => {
          if (!items.length) return;
          tableBottom = Math.min(tableBottom, ...items.map((item) => item.y));
          (cellsByAnchor[anchorIndex][column.kind] ||= []).push({ text: importText(items), header: column.header, week: column.week });
        });
      });
      const lastAnchor = anchors.at(-1);
      const exerciseColumn = columns.findIndex((column) => column.kind === "exercise");
      const exerciseLeft = Math.min(...body.filter((item) => columnOf(item) === exerciseColumn).map((item) => item.x));
      const labelZone = (item) => item.y >= lastAnchor - spacing * 2 && item.y <= header.top + spacing * 6 && item.y < previousBottom - 1;
      const labelCandidates = flat.filter((item) => labelZone(item) && (item.y > header.top + 2 || ["ignore"].includes(columns[columnOf(item)].kind) || item.x + item.width < exerciseLeft - 3));
      const rotated = page.items.filter((item) => item.rotated && item.y >= lastAnchor - spacing * 2 && item.y <= header.top + spacing).sort((a, b) => a.y - b.y);
      const rotatedLabel = rotated.length ? rotated.map((item) => item.text).join(rotated.every((item) => item.text.length <= 4) ? "" : " ") : "";
      const titleRow = importRowsOf(flat.filter((item) => item.y > header.top + 2 && item.y <= header.top + spacing * 4 && item.y < previousBottom - 1)).at(-1);
      const titleText = titleRow ? titleRow.items.map((item) => item.text).join(" ") : "";
      const label = importLabelText(labelCandidates.map((item) => item.text).find((value) => importSessionPattern.test(value)) || rotatedLabel || (titleText.split(/\s+/).length <= 8 ? titleText : ""));
      previousBottom = tableBottom;
      const tableWeeks = weekColumns.length >= 2 ? (weeks.found = true, weekColumns.map((column) => column.week)) : (() => {
        const marker = markers.filter((candidate) => candidate.y >= header.bottom - spacing).sort((a, b) => a.y - b.y)[0];
        if (marker) weeks.current = absoluteWeeks(Number(marker.match[1]), Number(marker.match[2] || marker.match[1]));
        return weeks.current || [1];
      })();
      const weekKnown = weekColumns.length >= 2 || Boolean(weeks.current);
      tableWeeks.forEach((week, weekIndex) => {
        const exercises = cellsByAnchor.map((cells) => buildImportedExercise(cells, weekColumns.length >= 2 ? (cells.week || []).find((cell) => cell.week === weekColumns[weekIndex].week)?.text || "" : null)).filter(Boolean);
        if (exercises.length) sessions.push({ id: uid(), day: weekdayNames.find((day) => new RegExp(day, "i").test(label)) || "Unscheduled", programWeek: week, label, weekKnown, exercises });
      });
    });
  }
  const dayCounts = new Map();
  // In a week-by-week program, tables before the first week heading (warm-ups, glossaries) are not sessions.
  return sessions.filter((session) => !weeks.found || session.weekKnown).map(({ label, weekKnown, ...session }) => {
    const dayNumber = (dayCounts.get(session.programWeek) || 0) + 1;
    dayCounts.set(session.programWeek, dayNumber);
    const plainLabel = importLabelText(label.replace(new RegExp(`^${session.day}\\b`, "i"), ""));
    const labelled = plainLabel.match(/^(day|session|workout)\s*(\d{1,2}|[a-e])\b\s*[-–—:|·.)]*\s*(.*)$/i);
    const title = labelled ? `${labelled[1][0].toUpperCase()}${labelled[1].slice(1).toLowerCase()} ${labelled[2].toUpperCase()}${labelled[3] ? ` · ${labelled[3]}` : ""}` : `Day ${dayNumber}${plainLabel ? ` · ${plainLabel}` : ""}`;
    return { ...session, name: weeks.found ? `Week ${session.programWeek} · ${title}` : title };
  }).sort((a, b) => a.programWeek - b.programWeek);
}
// Page text in reading order; optionally reads a two-column page left column first.
function importPageText(page, splitColumns = true) {
  const items = page.items.filter((item) => !item.rotated);
  if (!items.length) return "";
  const lines = (list) => importRowsOf(list).map((row) => row.items.map((item) => item.text).join(" ")).join("\n");
  if (!splitColumns) return lines(items);
  const width = page.width || Math.max(...items.map((item) => item.x + item.width));
  const covered = new Uint8Array(Math.ceil(width) + 1);
  for (const item of items.filter((candidate) => candidate.width < width * 0.45)) {
    for (let x = Math.max(0, Math.floor(item.x)); x < Math.min(covered.length, Math.ceil(item.x + item.width)); x += 1) covered[x] = 1;
  }
  let gutter = null, runStart = null;
  for (let x = Math.floor(width * 0.25); x <= Math.ceil(width * 0.75); x += 1) {
    if (!covered[x]) { if (runStart === null) runStart = x; }
    else if (runStart !== null) { if (x - runStart >= 12 && (!gutter || x - runStart > gutter[1] - gutter[0])) gutter = [runStart, x]; runStart = null; }
  }
  if (!gutter) return lines(items);
  const split = (gutter[0] + gutter[1]) / 2;
  const left = items.filter((item) => item.x + item.width / 2 < split), right = items.filter((item) => item.x + item.width / 2 >= split);
  return Math.min(left.length, right.length) >= items.length * 0.2 ? `${lines(left)}\n${lines(right)}` : lines(items);
}
function parseWorkoutText(text) {
  const groups = [];
  let week = 1;
  const weeksSeen = new Set();
  let current = { day: "Unscheduled", name: "Workout", programWeek: week, exercises: [] };
  const startGroup = (day, name) => {
    if (current.exercises.length) groups.push(current);
    current = { day, name: name || "Workout", programWeek: week, exercises: [] };
  };
  const dayPattern = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*(?:[-–—:|]\s*)?(.*)$/i;
  const sessionPattern = /^(day|session|workout)\s*(\d{1,2}|[a-e])\b\s*[-–—:|.)]*\s*(.*)$/i;
  const splitPattern = /^(?:push|pull|legs?|lower|upper|full[- ]body|arms|glutes?|core|conditioning)(?:\s+(?:body|day|[a-e]|#?\d{1,2}))*(?:\s+[-–—:|]\s*.*|:.*)?$/i;
  const restUnits = String.raw`(?:(?:seconds|secs|sec|s|minutes|mins|min|m)\b|')`;
  for (const rawLine of text.split(/\r?\n|(?<=\.)\s{2,}/)) {
    let line = rawLine.replace(/[•●▪]/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;
    const weekMatch = line.match(/^weeks?\s*(\d{1,2})\b\s*[-–—:|.,]*\s*(.*)$/i);
    if (weekMatch) {
      week = Number(weekMatch[1]);
      weeksSeen.add(week);
      if (current.exercises.length) startGroup("Unscheduled", "Workout"); else current.programWeek = week;
      line = weekMatch[2];
      if (!line) continue;
    }
    const dayMatch = line.match(dayPattern);
    if (dayMatch) {
      startGroup(`${dayMatch[1][0].toUpperCase()}${dayMatch[1].slice(1).toLowerCase()}`, dayMatch[2].replace(/^[-–:|\s]+/, "").trim());
      continue;
    }
    const match = line.match(new RegExp(String.raw`^(.{2,80}?)\s*[-–—:|,]?\s*(\d{1,2})\s*(?:sets?\s*(?:of|x|×)|[x×])\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?(?:\s*(?:s|sec|secs|seconds)\b)?|amrap|max|failure)\s*(?:reps?\b)?(.*)$`, "i"));
    const sessionMatch = line.match(sessionPattern);
    if (!match && sessionMatch) {
      startGroup("Unscheduled", `${sessionMatch[1][0].toUpperCase()}${sessionMatch[1].slice(1).toLowerCase()} ${sessionMatch[2].toUpperCase()}${sessionMatch[3] ? ` · ${sessionMatch[3]}` : ""}`);
      continue;
    }
    if (!match && splitPattern.test(line) && line.split(/\s+/).length <= 6) { startGroup("Unscheduled", line); continue; }
    if (!match) continue;
    const name = match[1].replace(/^(?:\d{1,2}[.)]|[-–])\s*/, "").replace(/^[\d\s]+(?=[A-Za-z]{2})/, "").replace(/[-–—:|,]+\s*$/, "").trim();
    const supersetLabel = name.match(/^[A-Z]\d\s*[.:)]\s*/);
    const plainName = supersetLabel ? name.slice(supersetLabel[0].length) : name;
    if (!plainName || /^(sets?|reps?|workout|day)$/i.test(plainName) || /[.!?]/.test(plainName) || /[^\p{L}\p{N}\s()'’/&+\-–#°,:]/u.test(plainName) || plainName.split(/\s+/).length > 8) continue;
    let tail = match[4].trim();
    const take = (pattern) => { const found = tail.match(pattern); if (found) tail = tail.replace(found[0], " "); return found; };
    const leadingRest = take(new RegExp(String.raw`^[@,]?\s*(\d{1,3}\s*(?:sec|secs|seconds|s))\b`, "i"));
    const restMatch = leadingRest || take(new RegExp(String.raw`rest\s*[:=]?\s*((?:\d{1,2}:\d{2})|[~\d.]+(?:\s*[-–]\s*[\d.]+)?\s*${restUnits}?)`, "i")) || take(new RegExp(String.raw`((?:\d{1,2}:\d{2})|[~\d.]+(?:\s*[-–]\s*[\d.]+)?\s*${restUnits})\s*rest\b`, "i"));
    const effort = take(/@?\s*\b(RPE|RIR)\s*[:=@]?\s*(\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)/i);
    const tempo = take(/tempo\s*[:=]?\s*([\dxX]{1,2}(?:\s*[-–]\s*[\dxX]{1,2}){2,3})/i);
    const percent = take(/@?\s*(\d{2,3}(?:\.\d)?\s*%(?:\s*(?:of\s*)?1\s*RM)?)/i);
    const dropSet = /drop\s*set/i.test(tail);
    const superset = Boolean(supersetLabel) || /superset|\bSS\b/i.test(tail);
    const cleanNotes = tail.replace(/drop\s*set/ig, "").replace(/superset|\bSS\b/ig, "").replace(/^[\s,;@·|-]+|[\s,;@·|-]+$/g, "").replace(/\s+/g, " ").trim();
    const target = importRepTarget(match[3]);
    const rest = restMatch ? importRestSeconds(restMatch[1]) : { rest: "", note: "" };
    const notes = [target.note, rest.note, tempo ? `Tempo: ${tempo[1]}` : "", percent ? `Target load: ${percent[1]}` : "", dropSet ? "Drop set" : "", superset ? "Superset" : "", cleanNotes];
    current.exercises.push({ id: uid(), name, sets: Number(match[2]), reps: target.reps, rest: rest.rest, effort: effort ? `${effort[1].toUpperCase()} ${effort[2]}` : "", notes: notes.filter(Boolean).join(" · "), equipment: "other" });
  }
  if (current.exercises.length) groups.push(current);
  if (weeksSeen.size > 1) groups.forEach((group) => { if (!/^week\s*\d/i.test(group.name)) group.name = `Week ${group.programWeek} · ${group.name}`; });
  return groups;
}
function showImportReview(filename) {
  if (!importDraft.length) { showSheet("No exercises found", "The PDF text came through, but the plan structure wasn't clear enough to fill in.", `<label class="field"><span class="field-label">Paste workout text to try again</span><textarea class="textarea-field" id="import-text" placeholder="Monday — Lower body&#10;Hip Thrust — 4×8"></textarea></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="parse-pasted">TRY AGAIN</button>`); return; }
  const rows = importDraft.flatMap((group, groupIndex) => group.exercises.map((exercise, exerciseIndex) => ({ ...exercise, groupIndex, exerciseIndex })));
  const weekCount = new Set(importDraft.map((group) => Number(group.programWeek) || 1)).size;
  showSheet("Review your plan", `${filename} · ${weekCount > 1 ? `${weekCount} weeks · ` : ""}${importDraft.length} ${importDraft.length === 1 ? "session" : "sessions"} · ${rows.length} exercises found. Please check each detail before saving.`, `<div id="import-review">${importDraft.map((group, groupIndex) => `<div class="eyebrow" style="margin:14px 0 7px">${escapeHtml(group.day)} · ${escapeHtml(group.name)}</div>${group.exercises.map((exercise, exerciseIndex) => `<div class="program-card" style="padding:11px;margin-bottom:8px"><input type="hidden" data-import="group" data-group="${groupIndex}" value="${escapeHtml(group.day)}"><input class="text-field" data-import="name" data-group="${groupIndex}" data-index="${exerciseIndex}" value="${escapeHtml(exercise.name)}"><div class="counter-row" style="margin-top:8px"><label><span class="field-label">Sets</span><input class="number-field" type="number" min="1" data-import="sets" data-group="${groupIndex}" data-index="${exerciseIndex}" value="${exercise.sets}"></label><label><span class="field-label">Reps</span><input class="number-field" type="number" min="1" data-import="reps" data-group="${groupIndex}" data-index="${exerciseIndex}" value="${exercise.reps}"></label></div><div class="counter-row" style="margin-top:8px"><label><span class="field-label">Rest sec</span><input class="number-field" type="number" min="0" data-import="rest" data-group="${groupIndex}" data-index="${exerciseIndex}" value="${exercise.rest}" placeholder="Not specified"></label><label><span class="field-label">RPE / RIR</span><input class="text-field" data-import="effort" data-group="${groupIndex}" data-index="${exerciseIndex}" value="${escapeHtml(exercise.effort)}" placeholder="Not specified"></label></div><label class="field" style="margin-bottom:0"><span class="field-label">Notes / set style</span><input class="text-field" data-import="notes" data-group="${groupIndex}" data-index="${exerciseIndex}" value="${escapeHtml(exercise.notes)}" placeholder="Not specified"></label></div>`).join("")}`).join("")}</div>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-import">SAVE PLAN</button>`);
}
function saveImportedPlan() {
  const days = importDraft.map((group, groupIndex) => {
    const dayInput = document.querySelector(`[data-import="group"][data-group="${groupIndex}"]`);
    const day = dayInput?.value || group.day;
    group.exercises.forEach((exercise, index) => {
      const field = (key) => document.querySelector(`[data-import="${key}"][data-group="${groupIndex}"][data-index="${index}"]`)?.value?.trim() ?? "";
      const name = field("name"); if (!name) return;
      group.exercises[index] = { ...exercise, id: exercise.id || uid(), name, sets: Math.max(1, Number(field("sets")) || 1), reps: Number(field("reps")) || "", rest: Number(field("rest")) || "", effort: field("effort"), notes: [field("notes"), field("effort")].filter(Boolean).join(" · "), equipment: "other" };
    });
    return { id: uid(), day, programWeek: Number(group.programWeek) || 1, name: group.name, exercises: group.exercises.filter((exercise) => exercise?.name) };
  }).filter((day) => day.exercises.length);
  const cycleWeeks = Math.max(1, ...days.map((day) => day.programWeek));
  pendingProgramDraft = { name: importProgramName, days, cycleWeeks, activeCycleWeek: 1, cycleId: uid(), cycleStartedAt: todayKey() };
  const multiWeek = cycleWeeks > 1;
  const question = multiWeek ? "Repeat the entire program after its final week?" : "Repeat this week every week?";
  const explanation = multiWeek ? `This program has ${cycleWeeks} weeks. Your sessions will move forward week by week before restarting.` : "Should Track-Her reuse this same workout cycle every week? You can change this later in Plan.";
  const repeatLabel = multiWeek ? `Yes, repeat after Week ${cycleWeeks}` : "Yes, every week";
  showSheet(question, explanation, "", `<button class="secondary-button" data-action="save-import-once">No, one time</button><button class="primary-button" data-action="save-import-weekly">${repeatLabel}</button>`);
}
function commitImportedPlan(repeatWeekly) {
  if (!pendingProgramDraft) return;
  state.program = { ...pendingProgramDraft, repeatWeekly };
  pendingProgramDraft = null;
  state.onboarded = true; state.activeTab = "Plan"; save(); document.querySelector(".overlay")?.remove(); render(); toast("Plan imported. Make it yours.");
}
function parsePastedText() {
  const text = document.querySelector("#import-text")?.value || "";
  importDraft = parseWorkoutText(text);
  showImportReview("Pasted workout text");
}
function changeValue(button, delta) {
  const { type, exerciseIndex, setIndex } = button.dataset;
  const set = state.activeWorkout.exercises[Number(exerciseIndex)].sets[Number(setIndex)];
  const previous = Number(set[type]) || 0;
  const step = type === "weight" ? Number(state.weightStep) || 2.5 : 1;
  set[type] = Math.max(type === "weight" ? 0 : 1, Math.round((previous + delta * step) * 100) / 100);
  save(); render();
}
function editValue(element) {
  const { type, exerciseIndex, setIndex, unit } = element.dataset;
  const set = state.activeWorkout.exercises[Number(exerciseIndex)].sets[Number(setIndex)];
  const input = document.createElement("input"); input.type = "number"; input.inputMode = "decimal"; input.min = type === "weight" ? "0" : "1"; input.step = type === "weight" ? String(state.weightStep) : "1"; input.value = set[type] ?? ""; input.setAttribute("aria-label", type === "weight" ? `Weight in ${unit}` : "Reps");
  element.replaceChildren(input); input.focus(); input.select();
  const commit = () => { set[type] = input.value === "" ? "" : Math.max(type === "weight" ? 0 : 1, Number(input.value) || 0); save(); render(); };
  input.addEventListener("blur", commit, { once: true }); input.addEventListener("keydown", (event) => { if (event.key === "Enter") input.blur(); if (event.key === "Escape") render(); });
}
function addSet(exerciseIndex) {
  const sets = state.activeWorkout.exercises[exerciseIndex].sets;
  const previous = sets.at(-1) || { weight: "", reps: 0 };
  sets.push({ weight: previous.weight, reps: previous.reps, complete: false }); save(); render();
}
function bindSelects() {
  app.querySelectorAll("[data-change]").forEach((select) => select.addEventListener("change", () => {
    if (select.dataset.change === "units") { state.units = select.value; if (state.units === "lbs" && Number(state.weightStep) === 2.5) state.weightStep = 5; else if (state.units === "kg" && Number(state.weightStep) === 5) state.weightStep = 2.5; }
    if (select.dataset.change === "weight-step") state.weightStep = Number(select.value);
    if (select.dataset.change === "progress-exercise") progressSelection = select.value;
    if (select.dataset.change === "repeat-weekly") state.program.repeatWeekly = select.value === "true";
    save(); render();
  }));
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action], [data-tab]"); if (!button) return;
  if (button.dataset.tab) { state.activeTab = button.dataset.tab; save(); render(); return; }
  const { action } = button.dataset;
  if (action === "profile") { state.activeTab = "Profile"; save(); render(); }
  else if (action === "onboarding-next") showPlanChoice();
  else if (action === "onboarding-back") renderOnboarding();
  else if (action === "use-sample") { showUnitsOnboarding(); }
  else if (action === "set-units-onboarding") { state.units = button.dataset.units; state.weightStep = state.units === "kg" ? 2.5 : 5; render(); showUnitsOnboarding(); }
  else if (action === "complete-onboarding") finishOnboarding();
  else if (action === "create-program") { document.querySelector(".overlay")?.remove(); if (!state.onboarded) state.program = { name: "My Program", repeatWeekly: false, days: [] }; state.onboarded = true; state.activeTab = "Plan"; save(); render(); showDayEditor(); }
  else if (action === "start-workout") {
    const workout = state.program.days.find((day) => day.id === button.dataset.workoutId);
    const scheduledWorkoutId = button.dataset.scheduledWorkoutId || button.dataset.workoutId;
    const scheduledWorkout = state.program.days.find((day) => day.id === scheduledWorkoutId);
    if (workout) {
      state.todayWorkoutOverride = scheduledWorkoutId === workout.id ? null : { date: todayKey(), scheduledDayId: scheduledWorkoutId, workoutId: workout.id };
      startWorkout(workout, scheduledWorkoutId, scheduledWorkout?.programWeek || workout.programWeek || 1);
    }
  }
  else if (action === "change-today-workout") showWorkoutDayPicker(button.dataset.scheduledDayId);
  else if (action === "choose-today-workout") {
    state.todayWorkoutOverride = { date: todayKey(), scheduledDayId: button.dataset.scheduledDayId, workoutId: button.dataset.workoutId };
    save(); document.querySelector(".overlay")?.remove(); render(); toast("Today's session changed. Your plan is unchanged.");
  }
  else if (action === "edit-program") showProgramEditor();
  else if (action === "save-program") { const value = document.querySelector("#program-name")?.value.trim(); if (value) state.program.name = value; save(); document.querySelector(".overlay")?.remove(); render(); }
  else if (action === "add-day") showDayEditor();
  else if (action === "save-day") { const day = document.querySelector("#day-name").value; const name = document.querySelector("#workout-name").value.trim() || "Workout"; state.program.days.push({ id: uid(), day, name, exercises: [] }); state.program.days.sort((a, b) => weekdayNames.indexOf(a.day) - weekdayNames.indexOf(b.day)); save(); document.querySelector(".overlay")?.remove(); render(); }
  else if (action === "add-exercise") showExerciseEditor(button.dataset.dayId);
  else if (action === "remove-plan-exercise") confirmRemovePlanExercise(button.dataset.dayId, button.dataset.exerciseId);
  else if (action === "confirm-remove-plan-exercise") {
    const day = state.program.days.find((item) => item.id === button.dataset.dayId);
    if (day) day.exercises = day.exercises.filter((item) => item.id !== button.dataset.exerciseId);
    save(); document.querySelector(".overlay")?.remove(); render(); toast("Exercise removed from your plan.");
  }
  else if (action === "remove-active-exercise") confirmRemoveActiveExercise(Number(button.dataset.exerciseIndex));
  else if (action === "confirm-remove-active-exercise") {
    state.activeWorkout.exercises.splice(Number(button.dataset.exerciseIndex), 1);
    save(); document.querySelector(".overlay")?.remove(); render(); toast("Exercise removed from this session.");
  }
  else if (action === "replace-plan-exercise") {
    const exercise = state.program.days.find((day) => day.id === button.dataset.dayId)?.exercises.find((item) => item.id === button.dataset.exerciseId);
    if (exercise) showReplacementSheet({ name: exercise.name, source: "plan", dayId: button.dataset.dayId, exerciseId: button.dataset.exerciseId });
  }
  else if (action === "replace-active-exercise") {
    const exercise = state.activeWorkout.exercises[Number(button.dataset.exerciseIndex)];
    showReplacementSheet({ name: exercise.name, source: "workout", dayId: state.activeWorkout.dayId, exerciseId: exercise.exerciseId, exerciseIndex: button.dataset.exerciseIndex });
  }
  else if (action === "choose-replacement") applyMovementReplacement(button, button.dataset.replacementName, button.dataset.replacementEquipment);
  else if (action === "choose-custom-replacement") {
    const name = document.querySelector("#custom-replacement")?.value.trim();
    if (!name) { document.querySelector("#custom-replacement")?.focus(); return; }
    applyMovementReplacement(button, name, "other");
  }
  else if (action === "save-exercise") { const name = document.querySelector("#exercise-name").value.trim(); if (!name) { document.querySelector("#exercise-name").focus(); return; } const day = state.program.days.find((item) => item.id === document.querySelector("#exercise-day").value); const effort = document.querySelector("#exercise-effort").value.trim(); day.exercises.push({ id: uid(), name, sets: Number(document.querySelector("#exercise-sets").value) || 3, reps: Number(document.querySelector("#exercise-reps").value) || "", rest: Number(document.querySelector("#exercise-rest").value) || "", effort, notes: document.querySelector("#exercise-notes").value.trim(), equipment: "other" }); save(); document.querySelector(".overlay")?.remove(); render(); }
  else if (action === "import-pdf") { document.querySelector(".overlay")?.remove(); openPdfPicker(); }
  else if (action === "save-import") saveImportedPlan();
  else if (action === "save-import-once") commitImportedPlan(false);
  else if (action === "save-import-weekly") commitImportedPlan(true);
  else if (action === "parse-pasted") parsePastedText();
  else if (action === "exit-workout") { state.activeWorkout = null; state.activeTab = "Home"; save(); clearInterval(restInterval); render(); }
  else if (action === "finish-workout") finishWorkout();
  else if (action === "adjust-value") changeValue(button, Number(button.dataset.dir));
  else if (action === "edit-value") editValue(button);
  else if (action === "complete-set") completeSet(Number(button.dataset.exerciseIndex), Number(button.dataset.setIndex));
  else if (action === "add-set") addSet(Number(button.dataset.exerciseIndex));
  else if (action === "skip-rest") { state.activeWorkout.restEndsAt = null; clearInterval(restInterval); save(); render(); }
  else if (action === "add-rest") { state.activeWorkout.restEndsAt += 30000; save(); render(); }
  else if (action === "exercise-note") showNoteEditor(Number(button.dataset.exerciseIndex));
  else if (action === "save-note") { state.activeWorkout.exercises[Number(button.dataset.exerciseIndex)].notes = document.querySelector("#workout-note").value.trim(); save(); document.querySelector(".overlay")?.remove(); render(); }
  else if (action === "edit-name") showNameEditor();
  else if (action === "save-name") { state.name = document.querySelector("#user-name").value.trim() || "Sarah"; save(); document.querySelector(".overlay")?.remove(); render(); }
  else if (action === "export-backup") exportBackup();
  else if (action === "restore-backup") openBackupPicker();
  else if (action === "confirm-restore") {
    if (!restoreDraft) return;
    state = normalizeState({ ...restoreDraft, version: 1, activeTab: "Home" });
    restoreDraft = null; save(); document.querySelector(".overlay")?.remove(); render(); toast("Backup restored.");
  }
  else if (action === "install-app") installApp();
  else if (action === "close-sheet") document.querySelector(".overlay")?.remove();
  else if (action === "overlay-close" && event.target === button) button.remove();
});
bindSelects();
new MutationObserver(bindSelects).observe(app, { childList: true });
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if (state.activeTab === "Profile" && !state.activeWorkout) render();
});
window.addEventListener("appinstalled", () => { installPrompt = null; if (state.activeTab === "Profile") render(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => { });
initializeState();