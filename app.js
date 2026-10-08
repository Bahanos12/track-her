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
const colorThemes = [
  { id: "plum", name: "Plum", colors: ["#70485a", "#bf7787", "#e5bdc9"] },
  { id: "navy", name: "Navy & Butter", colors: ["#2b3f74", "#d82d32", "#feeea7"] },
  { id: "aubergine", name: "Aubergine & Sand", colors: ["#3f1d47", "#e06e2d", "#e9d2aa"] },
  { id: "terracotta", name: "Brick & Apricot", colors: ["#a04740", "#ef9c44", "#f3e1c8"] },
];
function applyTheme() {
  const theme = colorThemes.find((candidate) => candidate.id === state.theme) || colorThemes[0];
  if (theme.id === "plum") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.colors[0]);
}
const defaultState = () => ({
  version: 1, onboarded: false, name: "Sarah", units: "kg", weightStep: 2.5, theme: "plum", activeTab: "Home", activeWorkout: null, workoutPaused: false, todayWorkoutOverride: null, restAlerts: "", // "" = not asked, "on" | "off"
  sex: "", // "female" | "male" | "unspecified" ("" = not asked yet)
  // Optional cycle-aware training. "asked" records that the opt-in question was answered.
  wellbeing: { enabled: false, logs: {}, skipped: "" }, // logs: { "YYYY-MM-DD": { mood, energy, stress, sleep, symptoms } }
  readinessSuggestions: undefined, // undefined = not chosen yet (follows cycle tracking for older saves)
  menstrual: { asked: false, enabled: false, periodStarts: [], cycleLength: null, periodLength: 5, regularity: "unknown", contraception: "", checkins: [], dismissedInsights: {} },
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
  if (state.activeWorkout?.restEndsAt) runRestTicker(); // resume a rest timer after the app was reloaded
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
function isWorkoutComplete(day) { return Boolean(completionEntry(day)); }
// The logged workout that counts this session as done right now (most recent first), if any.
function completionEntry(day) {
  return state.history.find((workout) => {
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
  // Keep moving past weeks that are already done (possible after reopening an older workout).
  for (let guard = 0; guard < cycleWeeks; guard += 1) {
    const activeWeek = Number(state.program.activeCycleWeek) || 1;
    const weekDays = activeCycleDays();
    if (!weekDays.length || !weekDays.every(isWorkoutComplete)) return;
    const nextWeek = firstWeekWithSessions(activeWeek + 1);
    if (nextWeek) { state.program.activeCycleWeek = nextWeek; continue; }
    if (state.program.repeatWeekly) {
      state.program.activeCycleWeek = firstWeekWithSessions(1) || 1;
      state.program.cycleId = uid();
      state.program.cycleStartedAt = todayKey();
    } else state.program.activeCycleWeek = cycleWeeks + 1;
    return;
  }
}
// First week from `from` up to the program's end that still has sessions (weeks can be emptied by deleting days).
function firstWeekWithSessions(from) {
  const cycleWeeks = Number(state.program.cycleWeeks) || 1;
  for (let week = from; week <= cycleWeeks; week += 1) if (state.program.days.some((day) => (Number(day.programWeek) || 1) === week)) return week;
  return null;
}
function confirmDeleteDay(dayId) {
  const day = state.program.days.find((item) => item.id === dayId);
  if (!day) return;
  if (state.activeWorkout?.dayId === dayId || state.activeWorkout?.workoutId === dayId) { toast("Finish or discard the workout in progress first."); return; }
  const multiWeek = Number(state.program.cycleWeeks) > 1;
  const renumbers = /\bday\s*\d{1,2}\b/i.test(day.name);
  const where = multiWeek ? ` in Week ${Number(day.programWeek) || 1}` : "";
  const count = day.exercises.length;
  showSheet(`Delete ${day.name}?`, `This removes the session and its ${count} ${count === 1 ? "exercise" : "exercises"} from your plan. Your workout history stays saved.${renumbers ? ` The days after it${where} move up one number.` : ""}`, "", `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="danger-button" data-action="confirm-delete-day" data-day-id="${dayId}">DELETE DAY</button>`);
}
function deleteDay(dayId) {
  const day = state.program.days.find((item) => item.id === dayId);
  if (!day) return;
  const week = Number(day.programWeek) || 1;
  const multiWeek = Number(state.program.cycleWeeks) > 1;
  state.program.days = state.program.days.filter((item) => item.id !== dayId);
  // Renumber "Day N" in what's left of that week, in plan order: deleting Day 3 makes Day 4 the new Day 3.
  let number = 0;
  for (const item of state.program.days) {
    if (multiWeek && (Number(item.programWeek) || 1) !== week) continue;
    if (!/\bday\s*\d{1,2}\b/i.test(item.name)) continue;
    number += 1;
    item.name = item.name.replace(/\b(day\s*)\d{1,2}\b/i, (match, prefix) => `${prefix}${number}`);
  }
  const override = state.todayWorkoutOverride;
  if (override && (override.scheduledDayId === dayId || override.workoutId === dayId)) state.todayWorkoutOverride = null;
  // If the active week is now empty, move on to the next week that still has sessions.
  if (multiWeek && !activeCycleDays().length) {
    const active = Number(state.program.activeCycleWeek) || 1;
    if (active <= Number(state.program.cycleWeeks)) state.program.activeCycleWeek = firstWeekWithSessions(active) || (state.program.repeatWeekly ? firstWeekWithSessions(1) || 1 : Number(state.program.cycleWeeks) + 1);
  }
  save(); document.querySelector(".overlay")?.remove(); render();
  toast(`${escapeHtml(day.name)} deleted.`);
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
let toastTimer = null;
function toast(message, pr = false, duration = 3000) {
  toastRegion.innerHTML = `<div class="toast${pr ? " pr" : ""}" role="status">${message}</div>`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastRegion.innerHTML = ""; }, duration);
}
// Describes where the plan goes after a finished workout (call after advanceProgramCycle).
function nextWorkoutMessage(previousWeek, previousCycleId) {
  const multiWeek = Number(state.program.cycleWeeks) > 1;
  const week = Number(state.program.activeCycleWeek) || 1;
  const next = currentWorkout() || getUpcomingWorkout();
  const describe = (day, thisWeek = true) => {
    const weekNote = multiWeek && !/\bweek\s*\d/i.test(day.name) ? ` · Week ${week}` : "";
    const when = weekdayNames.includes(day.day) ? ` — ${thisWeek && day.day === todayDay() ? "Today" : day.day}` : "";
    return `Next workout: ${escapeHtml(day.name)}${weekNote}${when}`;
  };
  if (next) {
    if (multiWeek && state.program.cycleId !== previousCycleId) return `Program complete — starting again at Week 1.<br>${describe(next)}`;
    if (multiWeek && week !== previousWeek) return `Week ${previousWeek} done. ${describe(next)}`;
    return describe(next);
  }
  if (multiWeek && week > Number(state.program.cycleWeeks)) return "Program complete. Turn on repeat in Plan to go again.";
  if (!state.program.repeatWeekly) return "Plan complete. Turn on weekly repeat in Plan to reuse it.";
  const firstNextWeek = [...activeCycleDays()].sort((a, b) => (weekdayNames.indexOf(a.day) + 6) % 7 - (weekdayNames.indexOf(b.day) + 6) % 7)[0];
  return firstNextWeek ? `Week complete. ${describe(firstNextWeek, false)}` : "Week complete.";
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
// ---------- About you & recommended plans ----------
// Existing users who already turned on cycle tracking are treated as female.
function userSex() { return state.sex || (state.menstrual?.enabled ? "female" : ""); }
function cycleAvailable() { return userSex() === "female"; }
const planExercise = (id, name, sets, reps, rest, equipment, notes = "") => ({ id, name, sets, reps, rest, notes, equipment });
// A starter plan for people who don't have one yet, chosen by what they told us about themselves.
function recommendedPlan(sex = userSex()) {
  const base = { repeatWeekly: true, cycleWeeks: 1, activeCycleWeek: 1, cycleId: uid(), cycleStartedAt: todayKey() };
  if (sex === "male") return { ...base, name: "Strength Builder", days: [
    { id: "sb-upper", day: "Monday", programWeek: 1, name: "Upper Body", exercises: [planExercise("sb-bench", "Barbell Bench Press", 4, 6, 150, "barbell"), planExercise("sb-row", "Barbell Row", 4, 8, 120, "barbell"), planExercise("sb-ohp", "Overhead Press", 3, 8, 120, "barbell"), planExercise("sb-pulldown", "Lat Pulldown", 3, 10, 90, "machine"), planExercise("sb-curl", "Dumbbell Curl", 3, 12, 60, "dumbbell"), planExercise("sb-pressdown", "Triceps Pressdown", 3, 12, 60, "cable")] },
    { id: "sb-lower", day: "Wednesday", programWeek: 1, name: "Lower Body", exercises: [planExercise("sb-squat", "Back Squat", 4, 6, 180, "barbell"), planExercise("sb-rdl", "Romanian Deadlift", 3, 8, 120, "barbell"), planExercise("sb-legpress", "Leg Press", 3, 10, 120, "machine"), planExercise("sb-legcurl", "Leg Curl", 3, 12, 75, "machine"), planExercise("sb-calf", "Standing Calf Raise", 3, 15, 60, "machine")] },
    { id: "sb-full", day: "Friday", programWeek: 1, name: "Full Body", exercises: [planExercise("sb-deadlift", "Deadlift", 3, 5, 180, "barbell"), planExercise("sb-incline", "Incline Dumbbell Press", 3, 10, 90, "dumbbell"), planExercise("sb-pullup", "Pull-Up", 3, 8, 120, "bodyweight", "Use assistance if needed"), planExercise("sb-lunge", "Walking Lunge", 3, 10, 90, "dumbbell", "Each leg"), planExercise("sb-lateral", "Lateral Raise", 3, 15, 60, "dumbbell")] },
  ] };
  if (sex === "female") return { ...base, name: "Glute Growth", days: defaultState().program.days.map((day) => ({ ...day, programWeek: 1 })) };
  return { ...base, name: "Full Body Basics", days: [
    { id: "fb-a", day: "Monday", programWeek: 1, name: "Full Body A", exercises: [planExercise("fb-squat", "Goblet Squat", 3, 10, 90, "dumbbell"), planExercise("fb-bench", "Dumbbell Bench Press", 3, 10, 90, "dumbbell"), planExercise("fb-row", "Seated Cable Row", 3, 10, 90, "cable"), planExercise("fb-hipthrust", "Hip Thrust", 3, 10, 90, "barbell"), planExercise("fb-plank", "Plank", 3, 30, 60, "bodyweight", "Seconds")] },
    { id: "fb-b", day: "Wednesday", programWeek: 1, name: "Full Body B", exercises: [planExercise("fb-rdl", "Romanian Deadlift", 3, 10, 90, "barbell"), planExercise("fb-ohp", "Dumbbell Shoulder Press", 3, 10, 90, "dumbbell"), planExercise("fb-pulldown", "Lat Pulldown", 3, 10, 90, "machine"), planExercise("fb-lunge", "Reverse Lunge", 3, 10, 90, "dumbbell", "Each leg"), planExercise("fb-deadbug", "Dead Bug", 3, 12, 60, "bodyweight")] },
    { id: "fb-c", day: "Friday", programWeek: 1, name: "Full Body C", exercises: [planExercise("fb-legpress", "Leg Press", 3, 12, 90, "machine"), planExercise("fb-incline", "Incline Push-Up", 3, 12, 60, "bodyweight"), planExercise("fb-onearm", "One-Arm Dumbbell Row", 3, 10, 75, "dumbbell", "Each side"), planExercise("fb-legcurl", "Leg Curl", 3, 12, 75, "machine"), planExercise("fb-lateral", "Lateral Raise", 3, 15, 60, "dumbbell")] },
  ] };
}
const sexOptions = [["female", "Female"], ["male", "Male"], ["unspecified", "Prefer not to say"]];
function setSex(sex) {
  state.sex = sex;
  if (sex !== "female" && state.menstrual?.enabled) state.menstrual.enabled = false; // logged cycle data is kept
}
let onboardingAfterSex = "plans";
function showSexOnboarding(next) {
  onboardingAfterSex = next;
  document.querySelector(".onboarding").innerHTML = `<div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Honna</div><div class="onboarding-visual" style="min-height:140px"><div style="text-align:center"><div class="eyebrow">About you</div><h2 style="margin-top:8px">Let&rsquo;s get to know you</h2></div></div><label class="field onboarding-name"><span class="field-label">What should we call you?</span><input class="text-field" id="onboarding-name" maxlength="32" placeholder="Your first name" autocomplete="given-name" value="${escapeHtml(state.name === defaultState().name ? "" : state.name)}"></label><p class="onboarding-copy">Then choose what fits. It shapes your recommended plan and which features you see. You can change both anytime in Profile.</p><div class="onboarding-actions">${sexOptions.map(([value, label]) => `<button class="secondary-button" data-action="choose-sex" data-sex="${value}">${label}</button>`).join("")}</div></div><div><div class="step-dots"><i class="active"></i><i></i><i></i></div><button class="link-button" data-action="onboarding-back">Back</button></div>`;
}
function renderAboutYouCard() {
  if (userSex()) return "";
  return `<section class="cycle-card cycle-invite"><div><strong>Tell Honna a little about you</strong><small>It shapes recommendations and which features you see. You can change it anytime in Profile.</small></div><div class="cycle-actions sex-actions">${sexOptions.map(([value, label]) => `<button class="secondary-button" data-action="choose-sex" data-sex="${value}">${label}</button>`).join("")}</div></section>`;
}
// ---------- Cycle-aware training ----------
// Everything here is optional and stays on the device. Phases are estimates; adaptations are always offered, never applied.
const dayMs = 86400000;
const dateFromKey = (key) => new Date(`${key}T12:00:00`);
const keyFromDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const daysBetween = (fromKey, toKey) => Math.round((dateFromKey(toKey) - dateFromKey(fromKey)) / dayMs);
const symptomOptions = ["Cramps", "Low energy", "Fatigue", "Headache", "Bloating", "Poor sleep", "Sore muscles", "Low mood"];
const contraceptionOptions = [["", "None"], ["pill", "Pill"], ["hormonal-iud", "Hormonal IUD"], ["implant", "Implant"], ["injection", "Injection"], ["ring-patch", "Ring or patch"], ["private", "Prefer not to say"]];
// Always the same stored object, with any missing fields filled in (older saves don't have them).
function menstrual() {
  if (!state.menstrual || typeof state.menstrual !== "object") state.menstrual = {};
  for (const [key, value] of Object.entries(defaultState().menstrual)) if (state.menstrual[key] === undefined) state.menstrual[key] = value;
  return state.menstrual;
}
function sortedPeriodStarts() { return [...new Set(menstrual().periodStarts)].filter(Boolean).sort(); }
function loggedCycleLengths() {
  const starts = sortedPeriodStarts();
  return starts.slice(1).map((start, index) => daysBetween(starts[index], start)).filter((length) => length >= 15 && length <= 60);
}
// Prefer what the user's own logged cycles show; otherwise their stated length; otherwise a typical 28 days.
function expectedCycleLength() {
  const logged = loggedCycleLengths().slice(-6);
  if (logged.length >= 2) return Math.round(logged.reduce((sum, length) => sum + length, 0) / logged.length);
  return Number(menstrual().cycleLength) || logged[0] || 28;
}
function hormonalContraception() { return ["pill", "hormonal-iud", "implant", "injection", "ring-patch"].includes(menstrual().contraception); }
// Where a date sits in the cycle: day number, phase bucket and which logged cycle it belongs to.
function cycleInfo(dateKey = todayKey()) {
  const starts = sortedPeriodStarts().filter((start) => start <= dateKey);
  if (!starts.length) return null;
  const start = starts.at(-1);
  const nextLogged = sortedPeriodStarts().find((item) => item > dateKey);
  const length = nextLogged ? daysBetween(start, nextLogged) : expectedCycleLength();
  const day = daysBetween(start, dateKey) + 1;
  const periodLength = Math.max(2, Number(menstrual().periodLength) || 5);
  const ovulation = Math.max(periodLength + 3, length - 14);
  let bucket;
  if (day <= 2) bucket = "period-early";
  else if (day <= periodLength) bucket = "period-late";
  else if (day > length) bucket = "late";
  else if (day > length - 5) bucket = "premenstrual";
  else if (day >= ovulation - 1 && day <= ovulation + 1) bucket = "ovulation";
  else if (day < ovulation - 1) bucket = "follicular";
  else bucket = "luteal";
  const phase = { "period-early": "Period", "period-late": "Period", follicular: "Follicular phase", ovulation: "Around ovulation", luteal: "Luteal phase", premenstrual: "Before your period", late: "Period expected" }[bucket];
  const nextPeriod = keyFromDate(new Date(dateFromKey(start).getTime() + length * dayMs));
  return { start, day, length, bucket, phase, nextPeriod, cycleIndex: starts.length - 1, estimated: !nextLogged };
}
const bucketPhrases = { "period-early": "the first two days of your period", "period-late": "the later days of your period", follicular: "the days after your period", ovulation: "the days around ovulation", luteal: "the second half of your cycle", premenstrual: "the last few days before your period", late: "the days when your period is late" };
// A lift's strength score: the best set's estimated one-rep max.
const setScore = (set) => (Number(set.weight) || 0) * (1 + (Number(set.reps) || 0) / 30);
// Learn recurring patterns from the user's own check-ins and workouts. A pattern needs at least two different cycles.
function cycleInsights() {
  const data = menstrual();
  const checkins = dailySignals().map((signal) => ({ ...signal, info: cycleInfo(signal.date) })).filter((signal) => signal.info);
  const insights = [];
  if (checkins.length >= 4) {
    const lowOverall = checkins.filter((checkin) => checkin.low).length / checkins.length;
    for (const bucket of Object.keys(bucketPhrases)) {
      const inBucket = checkins.filter((checkin) => checkin.info.bucket === bucket);
      const cycles = new Set(inBucket.map((checkin) => checkin.info.cycleIndex));
      if (inBucket.length < 2 || cycles.size < 2) continue;
      const low = inBucket.filter((checkin) => checkin.low);
      const lowCycles = new Set(low.map((checkin) => checkin.info.cycleIndex));
      if (low.length / inBucket.length >= 0.6 && lowCycles.size >= 2 && low.length / inBucket.length >= lowOverall + 0.2) {
        insights.push({ id: `energy-${bucket}`, bucket, kind: "energy", strength: low.length / inBucket.length, cycles: lowCycles.size, text: `You usually report lower energy during ${bucketPhrases[bucket]}.` });
      }
      for (const symptom of symptomOptions) {
        const symptomCycles = new Set(inBucket.filter((checkin) => checkin.symptoms?.includes(symptom)).map((checkin) => checkin.info.cycleIndex));
        if (symptomCycles.size >= 2 && !insights.some((insight) => insight.id === `energy-${bucket}`)) {
          insights.push({ id: `symptom-${bucket}-${symptom}`, bucket, kind: "symptom", strength: symptomCycles.size / cycles.size, cycles: symptomCycles.size, text: `You've noted ${symptom.toLowerCase()} during ${bucketPhrases[bucket]} in ${symptomCycles.size} cycles.` });
        }
      }
    }
  }
  // Performance: compare each lift's best set to that lift's own typical level (median), per cycle part.
  const workouts = state.history.filter((workout) => workout.cycle?.day && workout.readiness?.choice !== "light");
  const scoresByLift = {};
  for (const workout of workouts) for (const exercise of workout.exercises) {
    const best = Math.max(0, ...exercise.sets.map(setScore));
    if (best > 0) (scoresByLift[exercise.name.toLowerCase()] ||= []).push({ best, workout });
  }
  const ratios = [];
  for (const entries of Object.values(scoresByLift)) {
    if (entries.length < 4) continue;
    const sorted = entries.map((entry) => entry.best).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    for (const entry of entries) { const info = cycleInfo(entry.workout.date); if (info) ratios.push({ ratio: entry.best / median, bucket: info.bucket, cycleIndex: info.cycleIndex }); }
  }
  for (const bucket of Object.keys(bucketPhrases)) {
    const inBucket = ratios.filter((item) => item.bucket === bucket);
    const cycles = new Set(inBucket.map((item) => item.cycleIndex));
    if (inBucket.length < 4 || cycles.size < 2) continue;
    const average = inBucket.reduce((sum, item) => sum + item.ratio, 0) / inBucket.length;
    if (average <= 0.94) insights.push({ id: `perf-low-${bucket}`, bucket, kind: "performance", strength: 1 - average, cycles: cycles.size, text: `Your lifts tend to be about ${Math.round((1 - average) * 100)}% lower than usual during ${bucketPhrases[bucket]}.` });
    if (average >= 1.04) insights.push({ id: `perf-high-${bucket}`, bucket, kind: "strong", strength: average - 1, cycles: cycles.size, text: `You tend to lift about ${Math.round((average - 1) * 100)}% more than usual during ${bucketPhrases[bucket]}.` });
  }
  return insights;
}
// The insight worth raising before today's workout, if any (energy dips first, then lower performance, then symptoms).
function todaysCycleSuggestion() {
  const info = menstrual().enabled && cycleAvailable() ? cycleInfo() : null;
  if (!info) return null;
  const order = { energy: 0, performance: 1, symptom: 2 };
  return cycleInsights().filter((insight) => insight.bucket === info.bucket && insight.kind in order && !menstrual().dismissedInsights[`${insight.id}:${info.start}`])
    .sort((a, b) => order[a.kind] - order[b.kind] || b.strength - a.strength)[0] || null;
}
function renderCycleCard() {
  if (!cycleAvailable()) return renderAboutYouCard();
  const data = menstrual();
  if (!data.asked) return `<section class="cycle-card cycle-invite"><div><strong>Would you like Honna to adapt your training based on your menstrual cycle?</strong><small>Optional. Honna learns from your own patterns and always asks before changing a workout. Your data stays on this device.</small></div><div class="cycle-actions"><button class="secondary-button" data-action="cycle-decline">Not now</button><button class="primary-button" data-action="cycle-setup">SET IT UP</button></div></section>`;
  if (!data.enabled) return "";
  const info = cycleInfo();
  if (!info) return `<section class="cycle-card"><div><strong>Cycle tracking is on</strong><small>Log when your last period started to see your cycle day.</small></div><button class="secondary-button" data-action="log-period">Log period</button></section>`;
  const next = info.day > info.length ? `Period may be ${info.day - info.length} ${info.day - info.length === 1 ? "day" : "days"} late` : `Next period ≈ ${prettyDate(info.nextPeriod)}`;
  const phase = hormonalContraception() && !info.bucket.startsWith("period") ? "" : ` · ${info.phase}`;
  return `<section class="cycle-card"><button class="cycle-summary" data-action="cycle-details" aria-label="Cycle details"><span class="cycle-day" aria-label="Cycle day ${info.day}"><b>${info.day}</b><small>day</small></span><span><strong>Day ${info.day}${phase}</strong><small>${next}${data.regularity === "irregular" || info.estimated ? " · estimate" : ""}</small></span></button><button class="secondary-button cycle-log" data-action="log-period">Log period</button></section>`;
}
function renderCycleSettings() {
  const data = menstrual();
  const select = (change, on, label) => `<select class="select-field" data-change="${change}" aria-label="${label}"><option value="on" ${on ? "selected" : ""}>On</option><option value="off" ${on ? "" : "selected"}>Off</option></select>`;
  const info = cycleTrackingOn() ? cycleInfo() : null;
  const cycleRow = cycleAvailable() ? `<div class="setting-row"><div><strong>Menstrual cycle tracking</strong><small>${cycleTrackingOn() ? (info ? `Cycle day ${info.day}` : "Log your period to start") : "Cycle day, next period and your own patterns"}</small></div>${select("toggle-cycle", cycleTrackingOn(), "Menstrual cycle tracking")}</div>` : "";
  const logged = Object.values(wellbeing().logs).filter(wellbeingComplete).length;
  const wellbeingRow = `<div class="setting-row"><div><strong>Wellbeing tracking</strong><small>${wellbeingOn() ? `Mood, energy, stress, sleep & symptoms · ${logged} ${logged === 1 ? "day" : "days"} logged` : "Quick daily mood, energy, stress, sleep & symptoms"}</small></div>${select("toggle-wellbeing", wellbeingOn(), "Wellbeing tracking")}</div>`;
  const readinessRow = `<div class="setting-row"><div><strong>Training readiness suggestions</strong><small>Gentle suggestions from your ${[wellbeingOn() ? "wellbeing" : "", cycleTrackingOn() ? "cycle" : ""].filter(Boolean).join(" & ") || "wellbeing & cycle"} data. Never automatic.</small></div>${select("toggle-readiness", readinessOn(), "Training readiness suggestions")}</div>`;
  const details = cycleTrackingOn() ? `<div class="setting-row"><div><strong>My cycle & what Honna learned</strong><small>${dailySignals().length} days of check-ins · ${sortedPeriodStarts().length} periods logged</small></div><button class="link-button" data-action="cycle-details">View ${icon("arrow")}</button></div>` : "";
  return `<section class="settings-group"><div class="eyebrow" style="margin-bottom:7px">Wellbeing & training</div>${cycleRow}${wellbeingRow}${readinessRow}${details}</section>`;
}
function showCycleSetup() {
  const data = menstrual();
  const lastStart = sortedPeriodStarts().at(-1) || "";
  const regularity = [["regular", "Regular"], ["irregular", "Irregular"], ["unknown", "Not sure"]].map(([value, label]) => `<option value="${value}" ${data.regularity === value ? "selected" : ""}>${label}</option>`).join("");
  const contraception = contraceptionOptions.map(([value, label]) => `<option value="${value}" ${data.contraception === value ? "selected" : ""}>${label}</option>`).join("");
  showSheet("Cycle-aware training", "Honna uses this to estimate your cycle day. Training only changes when you say so. Everything stays on this device.", `<label class="field"><span class="field-label">When did your last period start?</span><input class="text-field" type="date" id="cycle-last-start" max="${todayKey()}" value="${lastStart}"></label><div class="counter-row"><label class="field"><span class="field-label">Typical cycle length (days)</span><input class="number-field" type="number" id="cycle-length" min="15" max="60" placeholder="e.g. 28" value="${data.cycleLength || ""}"></label><label class="field"><span class="field-label">Period length (days)</span><input class="number-field" type="number" id="cycle-period-length" min="1" max="12" value="${data.periodLength || 5}"></label></div><label class="check-field"><input type="checkbox" id="cycle-length-unknown" ${data.asked && !data.cycleLength ? "checked" : ""}><span>I don't know my cycle length</span></label><div class="counter-row"><label class="field"><span class="field-label">My cycle is</span><select class="select-field" id="cycle-regularity">${regularity}</select></label><label class="field"><span class="field-label">Hormonal contraception <small>(optional)</small></span><select class="select-field" id="cycle-contraception">${contraception}</select></label></div>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-cycle-setup">SAVE</button>`);
}
function saveCycleSetup() {
  const data = menstrual();
  const lastStart = document.querySelector("#cycle-last-start").value;
  if (!lastStart || lastStart > todayKey()) { document.querySelector("#cycle-last-start").focus(); toast("Add when your last period started."); return; }
  const unknown = document.querySelector("#cycle-length-unknown").checked;
  const length = Number(document.querySelector("#cycle-length").value);
  Object.assign(data, {
    asked: true, enabled: true,
    cycleLength: !unknown && length >= 15 && length <= 60 ? length : null,
    periodLength: Math.min(12, Math.max(1, Number(document.querySelector("#cycle-period-length").value) || 5)),
    regularity: document.querySelector("#cycle-regularity").value,
    contraception: document.querySelector("#cycle-contraception").value,
  });
  addPeriodStart(lastStart);
  save(); document.querySelector(".overlay")?.remove(); render(); toast("Cycle-aware training is on.");
}
// A new start within 10 days of a logged one is treated as a correction of that one.
function addPeriodStart(dateKey) {
  const data = menstrual();
  data.periodStarts = sortedPeriodStarts().filter((start) => Math.abs(daysBetween(start, dateKey)) > 10);
  data.periodStarts.push(dateKey);
  data.periodStarts.sort();
}
function showLogPeriod() {
  const info = cycleInfo();
  showSheet("Log your period", info ? `Your last logged start was ${prettyDate(info.start, { month: "long", day: "numeric" })}.` : "", `<label class="field"><span class="field-label">Period started on</span><input class="text-field" type="date" id="period-start" max="${todayKey()}" value="${todayKey()}"></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-period">SAVE</button>`);
}
function showCycleDetails() {
  const data = menstrual();
  const info = cycleInfo();
  const insights = cycleInsights();
  const starts = sortedPeriodStarts().slice(-6).reverse().map((start) => `<li>${prettyDate(start, { month: "short", day: "numeric", year: "numeric" })}</li>`).join("");
  const learned = insights.length ? `<ul class="insight-list">${insights.map((insight) => `<li>${escapeHtml(insight.text)} <small>(${insight.cycles} cycles)</small></li>`).join("")}</ul>` : `<p class="muted-copy">Nothing yet. Honna looks for patterns that repeat in at least two cycles, using how you felt (wellbeing check-ins) and the weights and reps you log. Keep logging your period.</p>`;
  const lengths = loggedCycleLengths();
  showSheet("Your cycle", info ? `Day ${info.day} of about ${info.length} · ${hormonalContraception() ? "hormonal contraception noted" : info.phase}` : "No period logged yet.", `<div class="preview-block"><div class="field-label">What Honna has learned</div>${learned}</div><div class="preview-block"><div class="field-label">Logged period starts</div>${starts ? `<ul class="plain-list">${starts}</ul>` : "<p>None yet.</p>"}${lengths.length ? `<p class="muted-copy">Your logged cycles: ${lengths.slice(-6).join(", ")} days.</p>` : ""}</div><div class="preview-block"><div class="field-label">Check-ins</div><p class="muted-copy">${dailySignals().length} days of how-you-felt data so far${wellbeingOn() ? "" : " (turn on Wellbeing tracking to add more)"}.</p></div>`, `<button class="secondary-button" data-action="cycle-setup">Edit settings</button><button class="primary-button" data-action="log-period">LOG PERIOD</button>`);
}
// ---------- Wellbeing tracking & training readiness suggestions ----------
function wellbeing() {
  if (!state.wellbeing || typeof state.wellbeing !== "object") state.wellbeing = {};
  for (const [key, value] of Object.entries(defaultState().wellbeing)) if (state.wellbeing[key] === undefined) state.wellbeing[key] = value;
  return state.wellbeing;
}
function wellbeingOn() { return wellbeing().enabled === true; }
function readinessOn() { return (state.readinessSuggestions ?? Boolean(state.menstrual?.enabled)) === true; }
function cycleTrackingOn() { return menstrual().enabled && cycleAvailable(); }
const wellbeingFields = [
  { key: "mood", label: "Mood", low: "Low", high: "Great", faces: ["😞", "🙁", "😐", "🙂", "😄"] },
  { key: "energy", label: "Energy", low: "Drained", high: "Energised" },
  { key: "stress", label: "Stress", low: "Calm", high: "Very stressed" },
  { key: "sleep", label: "Sleep", low: "Poor", high: "Great" },
];
function wellbeingSymptomOptions() { return symptomOptions.filter((symptom) => cycleAvailable() || !["Cramps", "Bloating"].includes(symptom)); }
function todaysWellbeing() { return wellbeing().logs[todayKey()] || null; }
function wellbeingComplete(log) { return Boolean(log) && wellbeingFields.every((field) => Number(log[field.key]) >= 1); }
// Every day with a self-reported state, for learning cycle patterns: wellbeing logs (when on) and older check-ins.
function dailySignals() {
  const byDate = new Map();
  for (const checkin of menstrual().checkins || []) {
    if (["good", "off", "rough"].includes(checkin.level)) byDate.set(checkin.date, { date: checkin.date, low: checkin.level !== "good", symptoms: checkin.symptoms || [] });
  }
  if (wellbeingOn()) for (const [date, log] of Object.entries(wellbeing().logs)) {
    if (!wellbeingComplete(log)) continue;
    byDate.set(date, { date, low: Number(log.energy) <= 2 || Number(log.mood) <= 2 || (Number(log.sleep) <= 2 && Number(log.energy) <= 3), symptoms: log.symptoms || [] });
  }
  return [...byDate.values()];
}
let wellbeingEditing = false, wellbeingSymptomsOpen = false;
function renderWellbeingForm(log, context) {
  const scale = (field) => `<div class="wb-row"><span class="wb-label">${field.label}</span><div class="wb-scale" role="radiogroup" aria-label="${field.label}">${[1, 2, 3, 4, 5].map((value) => `<button class="wb-dot${Number(log?.[field.key]) === value ? " selected" : ""}" data-action="wb-set" data-field="${field.key}" data-value="${value}" data-context="${context}" role="radio" aria-checked="${Number(log?.[field.key]) === value}" aria-label="${field.label} ${value} of 5">${field.faces ? field.faces[value - 1] : value}</button>`).join("")}</div><span class="wb-ends"><small>${field.low}</small><small>${field.high}</small></span></div>`;
  const symptoms = log?.symptoms || [];
  const chips = wellbeingSymptomOptions().map((symptom) => `<button class="symptom-chip${symptoms.includes(symptom) ? " selected" : ""}" data-action="wb-symptom" data-symptom="${symptom}" data-context="${context}" aria-pressed="${symptoms.includes(symptom)}">${symptom}</button>`).join("");
  const open = wellbeingSymptomsOpen || symptoms.length > 0;
  return `<div class="wb-form">${wellbeingFields.map(scale).join("")}${open ? `<div class="field-label" style="margin-top:8px">Symptoms <small>(optional)</small></div><div class="symptom-chips">${chips}</div>` : `<button class="link-button wb-more" data-action="wb-symptoms-open" data-context="${context}">+ Symptoms (optional)</button>`}</div>`;
}
function wellbeingSummary(log) {
  const parts = wellbeingFields.map((field) => `${field.label} ${field.faces ? field.faces[log[field.key] - 1] : `${log[field.key]}/5`}`);
  return parts.join(" · ") + (log.symptoms?.length ? ` · ${log.symptoms.join(", ")}` : "");
}
const suggestionCopy = { keep: "Looks like a good day for your planned workout.", adapted: "Consider reducing intensity today.", light: "A lighter session might suit you today." };
function renderWellbeingCard() {
  if (!wellbeingOn()) return "";
  const log = todaysWellbeing();
  const skippedToday = wellbeing().skipped === todayKey();
  if (wellbeingComplete(log) && !wellbeingEditing) {
    const suggestion = readinessOn() ? readinessSuggestion() : null;
    return `<section class="cycle-card wb-card wb-done"><div><strong>Today's check-in</strong><small>${escapeHtml(wellbeingSummary(log))}</small>${suggestion ? `<small class="wb-suggestion">${suggestionCopy[suggestion.level]}</small>` : ""}</div><button class="secondary-button cycle-log" data-action="wb-edit">Edit</button></section>`;
  }
  if (skippedToday && !wellbeingEditing) return "";
  return `<section class="cycle-card wb-card"><div class="wb-head"><strong>How are you today?</strong><button class="link-button" data-action="wb-skip">Not today</button></div>${renderWellbeingForm(log, "card")}</section>`;
}
function setWellbeingValue(field, value) {
  const logs = wellbeing().logs;
  const log = logs[todayKey()] ||= {};
  log[field] = value; log.updatedAt = Date.now();
  if (wellbeingComplete(log)) wellbeingEditing = false;
}
// Gentle suggestion from today's wellbeing and the user's own cycle patterns. Never applied automatically.
function readinessSuggestion() {
  const reasons = [];
  let score = 0;
  const log = wellbeingOn() ? todaysWellbeing() : null;
  if (log) {
    const energy = Number(log.energy), sleep = Number(log.sleep), stress = Number(log.stress), mood = Number(log.mood);
    if (energy === 1) { score += 2.5; reasons.push("very low energy"); } else if (energy === 2) { score += 2; reasons.push("low energy"); }
    if (sleep === 1) { score += 2; reasons.push("very poor sleep"); } else if (sleep === 2) { score += 1.5; reasons.push("poor sleep"); }
    if (stress === 5) { score += 1.5; reasons.push("very high stress"); } else if (stress === 4) { score += 1; reasons.push("high stress"); }
    if (mood && mood <= 2) { score += 1; reasons.push("low mood"); }
    const strong = (log.symptoms || []).filter((symptom) => ["Cramps", "Headache", "Fatigue", "Low energy", "Sore muscles"].includes(symptom));
    if (strong.length) { score += Math.min(2, strong.length * 0.75); reasons.push(strong.map((symptom) => symptom.toLowerCase()).join(", ")); }
    // Compared with the user's own usual energy (needs a week of logs).
    const history = Object.entries(wellbeing().logs).filter(([date, item]) => date !== todayKey() && Number(item.energy) >= 1).map(([, item]) => Number(item.energy));
    if (history.length >= 7 && energy) {
      const usual = history.reduce((sum, value) => sum + value, 0) / history.length;
      if (energy <= usual - 1.5) { score += 0.5; reasons.push("lower energy than usual for you"); }
    }
  }
  const pattern = cycleTrackingOn() ? todaysCycleSuggestion() : null;
  if (pattern) { score += 2; reasons.push(pattern.text.replace(/\.$/, "").replace(/^You /, "you ").replace(/^Your /, "your ")); }
  const level = score >= 4 ? "light" : score >= 2 ? "adapted" : "keep";
  return { level, score, reasons, pattern };
}
// Before a workout: optional quick check-in (if wellbeing is on and today isn't logged), then a suggestion (if readiness is on).
let pendingWorkoutStart = null;
function showPreWorkoutCheckIn(start) {
  pendingWorkoutStart = start;
  showSheet("Quick check-in", "Optional · a few taps. It helps Honna suggest how hard to go today.", renderWellbeingForm(todaysWellbeing(), "sheet"), `<button class="secondary-button" data-action="prestart-skip">Skip</button><button class="primary-button" data-action="prestart-continue">CONTINUE</button>`);
}
function showReadinessSuggestion(start) {
  pendingWorkoutStart = start;
  const suggestion = readinessSuggestion();
  if (suggestion.level === "keep" || state.readinessDeclined === todayKey()) { beginCheckedWorkout("normal", suggestion); return; }
  const why = suggestion.reasons.length ? `Based on ${suggestion.reasons.join("; ")}.` : "";
  const option = (choice, title, detail) => `<button class="readiness-option${choice === suggestion.level ? " selected" : ""}" data-action="adapt-choice" data-choice="${choice === "keep" ? "normal" : choice}"><span><strong>${title}${choice === suggestion.level ? " · suggested" : ""}</strong><small>${detail}</small></span></button>`;
  showSheet("A gentle suggestion", `${suggestionCopy[suggestion.level]} ${why} You decide.`, `<div class="readiness-options">${option("keep", "Keep my planned workout", "Nothing changes")}${option("adapted", "Reduce intensity", "One set fewer per exercise, same weights, stop 1–2 reps short of failure")}${option("light", "Lighter session", "About half the sets, ~10% lighter, longer rest")}</div>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button>`);
}
function beginStartFlowChecks(start) {
  if (!readinessOn()) { launchWorkout(start.workoutId, start.scheduledWorkoutId); return; }
  if (wellbeingOn() && !wellbeingComplete(todaysWellbeing()) && wellbeing().skipped !== todayKey()) { showPreWorkoutCheckIn(start); return; }
  showReadinessSuggestion(start);
}
// Apply the chosen adaptation to today's session only; the plan is never changed.
function applyAdaptation(choice) {
  if (choice === "normal") return;
  for (const exercise of state.activeWorkout.exercises) {
    const keep = choice === "light" ? Math.max(1, Math.ceil(exercise.sets.length / 2)) : Math.max(1, exercise.sets.length - 1);
    exercise.sets = exercise.sets.slice(0, keep);
    exercise.targetSets = Math.min(exercise.targetSets, keep);
    if (choice === "light") {
      const step = Number(state.weightStep) || 2.5;
      exercise.sets.forEach((set) => { if (Number(set.weight) > 0) set.weight = Math.max(0, Math.round(Number(set.weight) * 0.9 / step) * step); });
      exercise.rest = Math.round((Number(exercise.rest) || 60) * 1.3);
    }
    exercise.notes = [choice === "light" ? "Lighter session today" : "Adapted today: aim ~1–2 reps further from failure", exercise.notes].filter(Boolean).join(" · ");
  }
}
function beginCheckedWorkout(choice, suggestion = readinessSuggestion()) {
  const start = pendingWorkoutStart;
  if (!start) return;
  pendingWorkoutStart = null;
  if (choice === "normal" && suggestion.level !== "keep") state.readinessDeclined = todayKey(); // don't ask again today
  document.querySelector(".overlay")?.remove();
  launchWorkout(start.workoutId, start.scheduledWorkoutId, { date: todayKey(), choice, suggested: suggestion.level, reasons: suggestion.reasons });
  applyAdaptation(choice);
  save(); render();
  if (choice !== "normal") toast(choice === "light" ? "Lighter session ready. Your plan is unchanged." : "Adapted workout ready. Your plan is unchanged.");
}
// A workout in progress is either open (full screen) or paused while you look around the app.
function workoutOpen() { return Boolean(state.activeWorkout) && !state.workoutPaused; }
function render() {
  applyTheme();
  if (!state.onboarded) return renderOnboarding();
  if (workoutOpen()) { app.innerHTML = renderWorkout(); syncBackHistory(); return; }
  const tab = state.activeTab;
  app.innerHTML = `${renderTopbar()}${tab === "Home" ? renderHome() : tab === "Plan" ? renderPlan() : tab === "Progress" ? renderProgress() : renderProfile()}${renderResumeBar()}${renderNav()}`;
  app.classList.toggle("has-resume-bar", Boolean(state.activeWorkout));
  syncBackHistory();
  if (tab === "Progress") {
    const historySection = app.querySelector(".history-list")?.closest(".section");
    historySection?.insertAdjacentHTML("beforebegin", `<section class="section"><div class="section-heading"><h2>Workout calendar</h2><span class="eyebrow">${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span></div>${renderCalendar()}</section>`);
  }
}
function renderResumeBar() {
  const workout = state.activeWorkout;
  if (!workout) return "";
  const done = workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.complete).length, 0);
  const total = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  return `<button class="resume-bar" data-action="resume-workout"><span class="resume-dot" aria-hidden="true"></span><span class="resume-text"><strong>${escapeHtml(workout.name)} in progress</strong><small>${done} of ${total} sets logged</small></span><span class="resume-cta">Resume ${icon("arrow")}</span></button>`;
}
function pauseWorkout(message = "Workout paused. Resume it anytime.") {
  if (!state.activeWorkout) return;
  state.workoutPaused = true; state.activeTab = "Home";
  save(); render(); toast(message);
}
function resumeWorkout() {
  if (!state.activeWorkout) return;
  state.workoutPaused = false;
  save(); document.querySelector(".overlay")?.remove(); render();
  if (state.activeWorkout.restEndsAt) runRestTicker();
}
function discardWorkout() {
  state.activeWorkout = null; state.workoutPaused = false; state.todayWorkoutOverride = null; state.activeTab = "Home";
  clearInterval(restInterval); restInterval = null;
  save(); document.querySelector(".overlay")?.remove(); render(); toast("Workout discarded. Nothing was saved.");
}
// The phone's Back button: close an open sheet first, then pause an open workout, otherwise leave the app as usual.
let backDepth = Number(history.state?.honnaDepth) || 0, ignoreNextPop = false, handlingPop = false;
function syncBackHistory() {
  const wanted = (state.onboarded && workoutOpen() ? 1 : 0) + (document.querySelector(".overlay") ? 1 : 0);
  // history.go() is asynchronous: wait for it to land before pushing or stepping again.
  if (ignoreNextPop || handlingPop || wanted === backDepth) return;
  if (wanted > backDepth) {
    while (backDepth < wanted) { backDepth += 1; history.pushState({ honnaDepth: backDepth }, ""); }
  } else {
    ignoreNextPop = true;
    history.go(wanted - backDepth);
    backDepth = wanted;
  }
}
window.addEventListener("popstate", () => {
  if (ignoreNextPop) { ignoreNextPop = false; backDepth = Math.max(0, Number(history.state?.honnaDepth) || 0); syncBackHistory(); return; }
  backDepth = Math.max(0, Number(history.state?.honnaDepth) || 0);
  handlingPop = true;
  try {
    if (document.querySelector(".overlay")) document.querySelector(".overlay").remove();
    else if (workoutOpen()) pauseWorkout();
  } finally { handlingPop = false; }
  syncBackHistory();
});
function renderTopbar() {
  return `<header class="topbar"><div class="brand"><span class="brand-mark">${icon("spark")}</span>Honna</div><button class="top-action" data-action="profile" aria-label="Open profile">${icon("profile")}</button></header>`;
}
function renderNav() {
  const tabs = [["Home", "home"], ["Plan", "plan"], ["Progress", "progress"], ["Profile", "profile"]];
  return `<nav class="bottom-nav" aria-label="Main navigation">${tabs.map(([label, glyph]) => `<button class="nav-item ${state.activeTab === label ? "active" : ""}" data-tab="${label}">${icon(glyph)}<span>${label}</span></button>`).join("")}</nav>`;
}
function renderHome() {
  const override = todayOverride();
  const pinned = override?.pinned ? state.program.days.find((day) => day.id === override.scheduledDayId && !isWorkoutComplete(day)) : null;
  const scheduledWorkout = pinned || currentWorkout() || getUpcomingWorkout();
  const alternate = override && override.scheduledDayId === scheduledWorkout?.id && override.workoutId !== override.scheduledDayId
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
    return `<section class="greeting"><div class="eyebrow">Your training, in rhythm</div><h1>${greeting}${state.name ? `, ${escapeHtml(state.name)}` : ""}</h1></section>${renderUndoFinishCard()}<div class="surface empty-state"><h3>${state.program.repeatWeekly ? "Your week is complete" : "Plan complete"}</h3><p>${repeatMessage}</p><div class="empty-actions"><button class="primary-button" data-tab="Plan">REVIEW MY PLAN</button>${state.history.length ? `<button class="link-button" data-action="reopen-session-picker">Reopen a session</button>` : ""}</div></div>`;
  }
  if (!workout) return `<section class="greeting"><div class="eyebrow">Your training, in rhythm</div><h1>${greeting}${state.name ? `, ${escapeHtml(state.name)}` : ""}</h1></section><div class="surface empty-state"><h3>Your next chapter starts here</h3><p>Start with a recommended plan, create your own, or import the one you already follow.</p><div class="empty-actions"><button class="primary-button" data-action="use-recommended-plan">USE ${escapeHtml(recommendedPlan().name.toUpperCase())}</button><button class="secondary-button" data-action="create-program">Create my plan</button></div></div>`;
  const isToday = scheduledWorkout.day === todayDay();
  const alternatives = Number(state.program.cycleWeeks) > 1 ? [true] : activeCycleDays().filter((day) => day.id !== scheduledWorkout.id); // other sessions to swap to, or done ones to reopen
  return `<section class="greeting"><div class="eyebrow">Your training, in rhythm</div><h1>${greeting}${state.name ? `, ${escapeHtml(state.name)}` : ""}</h1></section>${renderUndoFinishCard()}${renderCycleCard()}${renderWellbeingCard()}
    <div class="section-heading"><h2>${isToday ? "Today's workout" : "Up next"}</h2><button class="link-button" data-tab="Plan">View plan</button></div>
    <section class="today-card"><div class="today-top"><span class="eyebrow">${escapeHtml(scheduledWorkout.day)} · ${isToday ? "Today" : "Coming up"}${alternate ? " · Changed for today" : ""}</span><div class="today-card-actions"><span class="date-chip">${weekdayNames.includes(scheduledWorkout.day) ? prettyDate(keyFromDate(weekdayDate(scheduledWorkout.day)), { month: "short", day: "numeric" }) : "Any day"}</span>${alternatives.length ? `<button class="today-options-button" data-action="change-today-workout" data-scheduled-day-id="${scheduledWorkout.id}" aria-label="More workout options" title="More workout options">${icon("more")}</button>` : ""}</div></div><div class="today-title">${escapeHtml(workout.name)}</div><p class="today-meta">${workout.exercises.length} exercises <span aria-hidden="true">·</span> Approximately ${estimateDuration(workout)} min</p><div class="today-bottom"><div class="avatar-stack"><span class="tiny-dots"><i></i><i></i><i></i></span><span>${escapeHtml(state.program.name)}</span></div><button class="primary-button" data-action="start-workout" data-workout-id="${workout.id}" data-scheduled-workout-id="${scheduledWorkout.id}">${state.activeWorkout?.workoutId === workout.id ? "RESUME WORKOUT" : "START WORKOUT"} ${icon("arrow")}</button></div></section>
    <section class="section"><div class="section-heading"><h2>Today's flow</h2><span class="eyebrow">${workout.exercises.length} moves</span></div><div class="exercise-preview">${workout.exercises.map((exercise, index) => `<button class="exercise-row" data-action="preview-exercise" data-day-id="${workout.id}" data-exercise-id="${exercise.id}" aria-label="Preview ${escapeHtml(exercise.name)}"><span class="exercise-number">${String(index + 1).padStart(2, "0")}</span><span class="exercise-row-main"><span class="exercise-row-name">${escapeHtml(exercise.name)}</span>${exercise.notes ? `<span class="exercise-row-detail">${escapeHtml(exercise.notes)}</span>` : ""}</span><span class="target-pill">${exercise.sets} × ${exercise.reps || "—"}</span></button>`).join("") || `<div class="empty-state"><p>Add exercises to this workout in your plan.</p></div>`}</div></section>
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
  return `<section class="page-intro"><div class="eyebrow">Your routine</div><h1>Your plan</h1><p>Keep it simple. Show up, one session at a time.</p></section><div class="toolbar"><div><h3>${escapeHtml(state.program.name)}</h3><span class="eyebrow">${planSummary}</span></div><button class="inline-icon-button" data-action="edit-program" aria-label="Edit program name">${icon("edit")}</button></div><div class="button-row" style="margin-bottom:14px"><button class="secondary-button" data-action="import-pdf">↑ &nbsp;Import file</button><button class="secondary-button" data-action="add-day">+ &nbsp;Add workout</button></div><div class="setting-row cycle-setting"><div><strong>${repeatTitle}</strong><small>${repeatHint}</small></div><select class="select-field" data-change="repeat-weekly" aria-label="Repeat this cycle every week"><option value="false" ${repeatWeekly ? "" : "selected"}>One-time</option><option value="true" ${repeatWeekly ? "selected" : ""}>Repeat</option></select></div><div class="program-card">${state.program.days.map((day) => `<section class="day-block"><div class="day-heading"><button class="plan-edit-target day-edit" data-action="edit-day" data-day-id="${day.id}" aria-label="Edit ${escapeHtml(day.name)}"><span class="day-label"><i class="day-dot"></i>${escapeHtml(day.name)}<span class="edit-hint" aria-hidden="true">${icon("edit")}</span></span><span class="day-name">${multiWeek ? `Week ${day.programWeek || 1} · ` : ""}${escapeHtml(day.day)}</span></button><div class="day-actions"><button class="inline-icon-button" data-action="add-exercise" data-day-id="${day.id}" aria-label="Add exercise to ${escapeHtml(day.name)}">+</button><button class="inline-icon-button destructive-icon" data-action="delete-day" data-day-id="${day.id}" aria-label="Delete ${escapeHtml(day.name)}" title="Delete this day">${icon("trash")}</button></div></div>${day.exercises.length ? day.exercises.map((exercise) => `<div class="plan-exercise"><button class="plan-edit-target exercise-edit" data-action="edit-plan-exercise" data-day-id="${day.id}" data-exercise-id="${exercise.id}" aria-label="Edit ${escapeHtml(exercise.name)}"><strong>${escapeHtml(exercise.name)}</strong><span class="edit-hint" aria-hidden="true">${icon("edit")}</span></button><div class="plan-exercise-detail"><span>${exercise.sets} × ${exercise.reps || "—"}${exercise.rest ? ` · ${exercise.rest}s rest` : ""}</span><button class="inline-icon-button" data-action="replace-plan-exercise" data-day-id="${day.id}" data-exercise-id="${exercise.id}" aria-label="Replace ${escapeHtml(exercise.name)}" title="Find a similar movement">${icon("swap")}</button><button class="inline-icon-button destructive-icon" data-action="remove-plan-exercise" data-day-id="${day.id}" data-exercise-id="${exercise.id}" aria-label="Remove ${escapeHtml(exercise.name)}" title="Remove from this workout">${icon("trash")}</button></div></div>`).join("") : `<p class="day-empty">No exercises yet. Tap + to add one.</p>`}</section>`).join("") || `<div class="empty-state"><h3>No workouts yet</h3><p>Add a workout day to begin.</p><button class="primary-button" data-action="add-day">ADD WORKOUT</button></div>`}</div><div class="section plan-footer"><button class="link-button" data-action="import-pdf">Import a workout PDF or spreadsheet →</button>${state.program.days.length ? `<button class="secondary-button new-plan-button" data-action="new-plan">${icon("trash")} Delete plan &amp; start a new one</button>` : ""}</div>`;
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
  return `<section class="page-intro"><div class="eyebrow">Small steps, real strength</div><h1>Your progress</h1><p>Notice how far you've come.</p></section><div class="metric-grid"><div class="metric-card"><strong>${historyCount}</strong><span>workouts completed</span></div><div class="metric-card"><strong>${best ? `${best} ${state.units}` : "—"}</strong><span>best ${selected ? escapeHtml(selected) : "lift"}</span></div></div><section class="chart-card"><div class="chart-toolbar"><h3>Strength over time</h3>${names.length ? `<select class="select-field" style="width:auto;max-width:55%;min-height:37px;padding:6px 9px" data-change="progress-exercise">${names.map((name) => `<option ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select>` : ""}</div>${records.length ? renderChart(records) : `<div class="empty-state" style="padding:30px 8px 15px"><h3>Your first PR is waiting</h3><p>Complete a workout to see your lifts build over time.</p><button class="secondary-button" data-tab="Home">Go to today's workout</button></div>`}</section><section class="section"><div class="section-heading"><h2>Workout history</h2><span class="eyebrow">${historyCount} sessions</span></div><div class="history-list">${state.history.length ? state.history.map((workout) => `<details class="history-item"><summary class="history-summary"><div><strong>${escapeHtml(workout.name)}</strong><span>${prettyDate(workout.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · ${workout.exercises.length} exercises</span></div>${icon("arrow")}</summary><div class="history-content">${workout.exercises.map((exercise) => `<div class="history-exercise"><strong>${escapeHtml(exercise.name)}</strong><p>${exercise.sets.map((set) => `${set.weight || 0} ${state.units} × ${set.reps}`).join(" · ")}</p>${exercise.notes ? `<p>${escapeHtml(exercise.notes)}</p>` : ""}</div>`).join("")}<div class="history-actions"><button class="secondary-button" data-action="reopen-workout" data-history-id="${workout.id}" data-resume="1">${icon("history")} Reopen</button><button class="secondary-button destructive-text" data-action="reopen-workout" data-history-id="${workout.id}" data-resume="0">${icon("trash")} Remove</button></div></div></details>`).join("") : `<div class="surface empty-state"><p>Completed workouts will appear here.</p></div>`}</div></section>`;
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
  return `<section class="page-intro profile-intro"><div class="profile-avatar">${escapeHtml((state.name || "H").slice(0, 1).toUpperCase())}</div><div class="profile-intro-text"><div class="eyebrow">Made for your pace</div><button class="profile-name" data-action="edit-name" aria-label="Edit your name"><h1>${escapeHtml(state.name || "Add your name")}</h1><span class="edit-hint" aria-hidden="true">${icon("edit")}</span></button><p>${escapeHtml(state.program.name)}</p></div></section><section class="settings-group"><div class="eyebrow" style="margin-bottom:7px">Preferences</div><div class="setting-row"><div><strong>About you</strong><small>Shapes recommendations and features</small></div><select class="select-field" data-change="sex" aria-label="About you"><option value="" ${userSex() ? "" : "selected"} disabled>Choose</option>${sexOptions.map(([value, label]) => `<option value="${value}" ${userSex() === value ? "selected" : ""}>${label}</option>`).join("")}</select></div><div class="setting-row"><div><strong>Weight units</strong><small>Choose the units you train with</small></div><select class="select-field" data-change="units"><option value="kg" ${state.units === "kg" ? "selected" : ""}>Kilograms</option><option value="lbs" ${state.units === "lbs" ? "selected" : ""}>Pounds</option></select></div><div class="setting-row"><div><strong>Weight increment</strong><small>Change per tap on + or −</small></div><select class="select-field" data-change="weight-step">${(state.units === "kg" ? [0.5, 1, 2, 2.5, 5] : [1, 2, 2.5, 5, 10]).map((step) => `<option value="${step}" ${Number(state.weightStep) === step ? "selected" : ""}>${step} ${state.units}</option>`).join("")}</select></div>${notificationsSupported() ? `<div class="setting-row"><div><strong>Rest timer alerts</strong><small>${state.restAlerts === "on" && Notification.permission !== "granted" ? "Blocked in browser settings" : "Notify when you leave the app during a rest"}</small></div><select class="select-field" data-change="rest-alerts" aria-label="Rest timer alerts"><option value="on" ${restAlertsOn() ? "selected" : ""}>On</option><option value="off" ${restAlertsOn() ? "" : "selected"}>Off</option></select></div>` : ""}<div class="theme-setting"><div><strong>Color theme</strong><small>Pick the colors that feel like you</small></div><div class="theme-options" role="radiogroup" aria-label="Color theme">${colorThemes.map((theme) => { const selected = (colorThemes.find((item) => item.id === state.theme) || colorThemes[0]).id === theme.id; return `<button class="theme-option${selected ? " selected" : ""}" data-action="set-theme" data-theme-id="${theme.id}" role="radio" aria-checked="${selected}"><span class="theme-dots" aria-hidden="true">${theme.colors.map((color) => `<i style="background:${color}"></i>`).join("")}</span><span class="theme-name">${theme.name}</span></button>`; }).join("")}</div></div></section><section class="settings-group"><div class="eyebrow" style="margin-bottom:7px">Your account</div><div class="setting-row"><div><strong>Program</strong><small>${escapeHtml(state.program.name)}</small></div><button class="link-button" data-tab="Plan">View plan ${icon("arrow")}</button></div><div class="setting-row"><div><strong>Workout history</strong><small>${state.history.length} sessions saved on this device</small></div><button class="link-button" data-tab="Progress">View ${icon("arrow")}</button></div></section>${renderCycleSettings()}<section class="settings-group"><div class="eyebrow" style="margin-bottom:7px">Device data</div><div class="backup-actions"><button class="secondary-button" data-action="export-backup">↓ &nbsp;Export backup</button><button class="secondary-button" data-action="restore-backup">↑ &nbsp;Restore backup</button></div>${standalone ? "" : `<button class="secondary-button install-button" data-action="install-app">${icon("arrow")} &nbsp;Install Honna</button>`}</section><p class="eyebrow" style="margin:22px 0;text-align:center">Honna · Your workouts, in rhythm</p>`;
}
function renderOnboarding() {
  app.innerHTML = `<div class="onboarding"><div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Honna</div><div class="onboarding-visual"><svg viewBox="0 0 220 190" fill="none" aria-hidden="true"><path d="M45 146c13-38 26-50 49-50 17 0 23 11 34 11 12 0 17-15 28-15 15 0 21 18 25 54" stroke="#60796c" stroke-width="14" stroke-linecap="round"/><path d="M73 81c-2-14 3-27 17-31 14-4 25 5 26 20 1 16-7 29-20 30-12 0-21-7-23-19Z" fill="#bd7f76"/><path d="M59 147h116" stroke="#40594d" stroke-width="8" stroke-linecap="round"/><circle cx="172" cy="48" r="16" fill="#dfb965"/><path d="m169 48 3 3 6-7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="eyebrow">A little stronger, each time</div><h1>Welcome to Honna</h1><p class="onboarding-copy">Your workouts. Your progress. All in one place.</p></div><div><div class="step-dots"><i class="active"></i><i></i><i></i></div><div class="onboarding-actions"><button class="primary-button" data-action="onboarding-next">LET'S GET STARTED ${icon("arrow")}</button><button class="link-button" data-action="use-sample">Explore with a sample plan</button></div></div></div>`;
}
// A plan exercise as it appears in a live session, pre-filled with last time's numbers.
function activeExerciseFrom(exercise) {
  const previous = previousExercise(exercise);
  const count = Math.max(Number(exercise.sets) || 1, previous?.sets?.length || 0);
  return { exerciseId: exercise.id, name: exercise.name, targetSets: Number(exercise.sets) || 1, targetReps: Number(exercise.reps) || 0, rest: Number(exercise.rest) || 0, notes: exercise.notes || "", sets: Array.from({ length: count }, (_, index) => ({ weight: previous?.sets?.[index]?.weight ?? previous?.sets?.at(-1)?.weight ?? "", reps: previous?.sets?.[index]?.reps ?? previous?.sets?.at(-1)?.reps ?? (Number(exercise.reps) || 0), complete: false })) };
}
function beginStartFlow(start) { beginStartFlowChecks(start); }
function launchWorkout(workoutId, scheduledWorkoutId = workoutId, readiness = null) {
  const workout = state.program.days.find((day) => day.id === workoutId);
  if (!workout) return;
  const scheduledWorkout = state.program.days.find((day) => day.id === scheduledWorkoutId);
  const pinned = Boolean(todayOverride()?.pinned);
  state.todayWorkoutOverride = scheduledWorkoutId === workout.id && !pinned ? null : { date: todayKey(), scheduledDayId: scheduledWorkoutId, workoutId: workout.id, pinned };
  startWorkout(workout, scheduledWorkoutId, scheduledWorkout?.programWeek || workout.programWeek || 1);
  if (readiness) state.activeWorkout.readiness = readiness;
}
function startWorkout(workout, scheduledWorkoutId = workout.id, scheduledProgramWeek = workout.programWeek || 1) {
  state.workoutPaused = false;
  state.activeWorkout = { id: uid(), dayId: scheduledWorkoutId, workoutId: workout.id, programWeek: scheduledProgramWeek, cycleId: state.program.cycleId, name: workout.name, date: todayKey(), startedAt: Date.now(), exercises: workout.exercises.map(activeExerciseFrom) };
  save(); render();
}
function showAddActiveExercise() {
  const planDay = state.program.days.find((day) => day.id === state.activeWorkout.workoutId);
  const known = allExerciseNames().map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  showSheet("Add an exercise", "Adds it to this workout. Your last numbers for it are filled in.", `<label class="field"><span class="field-label">Exercise name</span><input class="text-field" id="active-exercise-name" list="known-exercises" placeholder="Start typing — e.g. Cable Kickback" maxlength="60" autocomplete="off"><datalist id="known-exercises">${known}</datalist></label><div class="counter-row"><label class="field"><span class="field-label">Sets</span><input class="number-field" id="active-exercise-sets" type="number" min="1" max="20" value="3"></label><label class="field"><span class="field-label">Rep target</span><input class="number-field" id="active-exercise-reps" type="number" min="1" max="100" placeholder="10"></label></div><label class="field"><span class="field-label">Rest (seconds)</span><input class="number-field" id="active-exercise-rest" type="number" min="0" max="900" value="90"></label>${planDay ? `<label class="check-field"><input type="checkbox" id="active-exercise-to-plan"><span>Also add it to ${escapeHtml(planDay.name)} in my plan</span></label>` : ""}`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-active-exercise">ADD</button>`);
}
function saveActiveExercise() {
  const nameInput = document.querySelector("#active-exercise-name");
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const known = getExercise(null, name); // same spelling as the known exercise, so its last numbers are found by name
  const exercise = { id: uid(), name: known?.name || name, sets: Math.max(1, Number(document.querySelector("#active-exercise-sets").value) || 3), reps: Number(document.querySelector("#active-exercise-reps").value) || "", rest: Number(document.querySelector("#active-exercise-rest").value) || "", effort: "", notes: "", equipment: known?.equipment || "other" };
  state.activeWorkout.exercises.push(activeExerciseFrom(exercise));
  const planDay = state.program.days.find((day) => day.id === state.activeWorkout.workoutId);
  const toPlan = planDay && document.querySelector("#active-exercise-to-plan")?.checked;
  if (toPlan) planDay.exercises.push({ ...exercise });
  save(); document.querySelector(".overlay")?.remove(); render();
  toast(`${escapeHtml(exercise.name)} added${toPlan ? " to this workout and your plan" : " to this workout"}.`);
  document.querySelectorAll(".log-card")[state.activeWorkout.exercises.length - 1]?.scrollIntoView({ block: "center" });
}
function renderWorkout() {
  const workout = state.activeWorkout;
  const completed = workout.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.complete).length, 0);
  const total = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  return `<header class="workout-header"><button class="inline-icon-button" data-action="exit-workout" aria-label="Pause workout and go back">‹</button><div><h2>${escapeHtml(workout.name)}</h2><p>${prettyDate(workout.date, { weekday: "long", month: "short", day: "numeric" })}</p></div><button class="link-button" style="margin-left:auto" data-action="finish-workout">Finish</button></header><div class="workout-progress"><div class="workout-progress-label"><span>Your session</span><span>${completed} of ${total} sets</span></div><div class="progress-track"><span style="width:${total ? completed / total * 100 : 0}%"></span></div></div>${workout.restEndsAt ? renderRestTimer() : ""}${workout.exercises.map((exercise, index) => renderLogExercise(exercise, index)).join("")}<button class="secondary-button add-exercise-button" data-action="add-active-exercise">+ &nbsp;Add exercise</button><button class="primary-button finish-button" data-action="finish-workout">FINISH WORKOUT ${icon("check")}</button><button class="link-button discard-workout" data-action="discard-workout">Discard workout</button>`;
}
function renderLogExercise(exercise, exerciseIndex) {
  const previous = previousExercise({ id: exercise.exerciseId, name: exercise.name });
  const prevText = previous ? `Last time: ${previous.sets.at(-1).weight || 0} ${state.units} × ${previous.sets.at(-1).reps}` : "Your first time with this lift";
  return `<section class="log-card"><div class="log-title-row"><div><h3>${String(exerciseIndex + 1).padStart(2, "0")} &nbsp;${escapeHtml(exercise.name)}</h3><p>Target: ${exercise.targetSets} × ${exercise.targetReps || "—"}${exercise.notes ? ` · ${escapeHtml(exercise.notes)}` : ""}</p></div><div class="log-actions"><button class="inline-icon-button" data-action="replace-active-exercise" data-exercise-index="${exerciseIndex}" aria-label="Replace ${escapeHtml(exercise.name)}" title="Find a similar movement">${icon("swap")}</button><button class="inline-icon-button" data-action="exercise-note" data-exercise-index="${exerciseIndex}" aria-label="Add a note">${icon("edit")}</button><button class="inline-icon-button destructive-icon" data-action="remove-active-exercise" data-exercise-index="${exerciseIndex}" aria-label="Remove ${escapeHtml(exercise.name)} from this session" title="Remove from this session">${icon("trash")}</button></div></div><div class="previous-line">${escapeHtml(prevText)}</div>${exercise.sets.map((set, setIndex) => renderSetLine(exerciseIndex, setIndex, set)).join("")}<div class="log-card-actions"><button class="add-set" data-action="add-set" data-exercise-index="${exerciseIndex}">+ Add set</button>${exercise.sets.some((set) => !set.complete) ? `<button class="complete-all" data-action="complete-all-sets" data-exercise-index="${exerciseIndex}">${icon("check")} All sets done</button>` : ""}</div></section>`;
}
function renderSetLine(exerciseIndex, setIndex, set) {
  return `<div class="set-line ${set.complete ? "complete" : ""}"><div class="set-heading"><span>Set ${setIndex + 1}</span><div class="set-heading-actions">${state.activeWorkout.exercises[exerciseIndex].sets.length > 1 ? `<button class="set-delete" data-action="delete-set" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" aria-label="Delete set ${setIndex + 1}" title="Delete this set">×</button>` : ""}<button class="set-done" data-action="complete-set" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" aria-label="${set.complete ? "Mark set incomplete" : "Complete set"}">${icon("check")}</button></div></div><div class="counter-row">${counterMarkup("weight", exerciseIndex, setIndex, set.weight, `${state.units}`, state.weightStep)}${counterMarkup("reps", exerciseIndex, setIndex, set.reps, "reps", 1)}</div></div>`;
}
function counterMarkup(type, exerciseIndex, setIndex, value, unit, step) {
  const shown = value === "" || value == null ? "—" : escapeHtml(value);
  return `<div><div class="counter"><button data-action="adjust-value" data-type="${type}" data-dir="-1" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" aria-label="Decrease ${type}">−</button><div class="counter-value" data-action="edit-value" data-type="${type}" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" data-unit="${unit}" data-step="${step}">${shown}</div><button data-action="adjust-value" data-type="${type}" data-dir="1" data-exercise-index="${exerciseIndex}" data-set-index="${setIndex}" aria-label="Increase ${type}">+</button></div><div class="counter-caption">${unit}</div></div>`;
}
function renderRestTimer() {
  const remaining = Math.max(0, Math.ceil((state.activeWorkout.restEndsAt - Date.now()) / 1000));
  return `<div class="rest-banner"><div><small>Take your time</small><strong>${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")} remaining</strong></div><div class="rest-actions"><button data-action="add-rest">+30 sec</button><button data-action="skip-rest">Skip</button></div>${shouldAskRestAlerts() ? `<div class="rest-alert-ask"><span>Get an alert when rest ends, even outside the app?</span><button data-action="rest-alerts-no">No thanks</button><button class="allow" data-action="rest-alerts-yes">Allow</button></div>` : ""}</div>`;
}
function beginRest(seconds) {
  if (!seconds) return;
  state.activeWorkout.restEndsAt = Date.now() + seconds * 1000;
  save(); render();
  runRestTicker();
}
// ---------- Rest alerts outside the app (notifications) ----------
// Web apps can't show a live countdown in the status bar; they can post a notification with the end time
// when you leave, and a "Rest is up" alert at the end (best effort: the phone may pause a backgrounded app).
const restAlertTag = "honna-rest";
let restAlertTimer = null;
function notificationsSupported() { return "Notification" in window && "serviceWorker" in navigator; }
function restAlertsOn() { return notificationsSupported() && state.restAlerts === "on" && Notification.permission === "granted"; }
// Asked once, inside the rest bar (never a pop-up over the workout).
function shouldAskRestAlerts() { return notificationsSupported() && !state.restAlerts && Notification.permission !== "denied"; }
async function enableRestAlerts() {
  if (!notificationsSupported()) return false;
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  state.restAlerts = permission === "granted" ? "on" : "off";
  save();
  if (permission !== "granted") toast("Notifications are blocked. You can allow them for this site in your browser settings.");
  return permission === "granted";
}
function nextSetLabel() {
  for (const exercise of state.activeWorkout?.exercises || []) {
    const index = exercise.sets.findIndex((set) => !set.complete);
    if (index >= 0) return `${exercise.name}, set ${index + 1}`;
  }
  return "";
}
async function showRestNotification(title, options) {
  try { (await navigator.serviceWorker.ready).showNotification(title, { tag: restAlertTag, icon: "icons/icon-192.png", badge: "icons/favicon-48.png", ...options }); } catch { }
}
async function clearRestNotifications() {
  clearTimeout(restAlertTimer); restAlertTimer = null;
  try { for (const notification of await (await navigator.serviceWorker.ready).getNotifications({ tag: restAlertTag })) notification.close(); } catch { }
}
document.addEventListener("visibilitychange", () => {
  const endsAt = state.activeWorkout?.restEndsAt;
  if (document.visibilityState === "visible") { clearRestNotifications(); return; }
  if (!restAlertsOn() || !endsAt || endsAt <= Date.now()) return;
  const time = new Date(endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  showRestNotification("Rest timer", { body: `Back at ${time} · ${state.activeWorkout.name}`, silent: true, timestamp: endsAt });
  clearTimeout(restAlertTimer);
  restAlertTimer = setTimeout(() => {
    if (document.visibilityState === "visible" || state.activeWorkout?.restEndsAt !== endsAt) return;
    const next = nextSetLabel();
    showRestNotification("Rest is up", { body: next ? `Time for ${next}.` : "Time for your next set.", renotify: true, silent: false, vibrate: [220, 110, 220] });
  }, endsAt - Date.now());
});
function runRestTicker() {
  clearInterval(restInterval);
  restInterval = window.setInterval(() => {
    if (!state.activeWorkout?.restEndsAt || Date.now() >= state.activeWorkout.restEndsAt) {
      clearInterval(restInterval); restInterval = null;
      if (state.activeWorkout) { state.activeWorkout.restEndsAt = null; save(); render(); toast("Rest is up. You've got this."); if (document.visibilityState === "visible") navigator.vibrate?.([180, 90, 180]); }
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
  if (set.complete && Number(exercise.rest) > 0) { beginRest(Number(exercise.rest)); return; }
  if (!set.complete) state.activeWorkout.restEndsAt = null;
  save(); render();
}
function renderUndoFinishCard() {
  const last = state.lastFinish;
  if (!last || last.allLogged || last.date !== todayKey() || !state.history.some((item) => item.id === last.historyId)) return "";
  return `<section class="cycle-card undo-card"><div><strong>Finished ${escapeHtml(last.workout.name)} by mistake?</strong><small>Reopen it to keep logging. Your plan goes back to how it was.</small></div><button class="secondary-button cycle-log" data-action="reopen-workout" data-history-id="${last.historyId}" data-resume="1">Reopen</button></section>`;
}
// Personal bests from what is actually in history (after a workout is removed, nothing stale remains).
function rebuildPersonalBests() {
  const prs = {};
  for (const workout of [...state.history].reverse()) for (const exercise of workout.exercises) for (const set of exercise.sets) {
    if (!(Number(set.weight) > 0)) continue;
    const key = exercise.name.toLowerCase(), score = Number(set.weight) * (1 + Number(set.reps) / 30);
    if (!prs[key] || score > prs[key].score) prs[key] = { weight: set.weight, reps: set.reps, score };
  }
  state.prs = prs;
}
// Undo a finished workout: take it out of history and (if `resume`) open it again to keep logging.
// The most recent finish is restored exactly from its snapshot, including any week change or program restart.
function reopenWorkout(historyId, resume = true) {
  const entry = state.history.find((item) => item.id === historyId);
  if (!entry) return;
  if (state.activeWorkout) { toast("Finish or discard the workout in progress first."); return; }
  const snapshot = state.lastFinish?.historyId === historyId ? state.lastFinish : null;
  state.history = state.history.filter((item) => item.id !== historyId);
  const program = state.program;
  if (snapshot && snapshot.program.cycleId === entry.cycleId) Object.assign(program, snapshot.program);
  else if (entry.cycleId === program.cycleId && Number(program.cycleWeeks) > 1 && Number(entry.programWeek || 1) < Number(program.activeCycleWeek)) program.activeCycleWeek = Number(entry.programWeek) || 1;
  rebuildPersonalBests();
  if (resume) {
    const workout = snapshot ? snapshot.workout : {
      id: entry.id, dayId: entry.programDayId, workoutId: entry.programDayId, programWeek: entry.programWeek, cycleId: entry.cycleId, name: entry.name, date: entry.date, startedAt: Date.now() - (entry.duration || 1) * 60000,
      exercises: entry.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, name: exercise.name, targetSets: exercise.sets.length, targetReps: Number(exercise.sets[0]?.reps) || 0, rest: Number(getExercise(exercise.exerciseId, exercise.name)?.rest) || 0, notes: exercise.notes || "", sets: exercise.sets.map((set) => ({ ...set, complete: true })) })),
    };
    if (entry.readiness && !workout.readiness) workout.readiness = entry.readiness;
    state.activeWorkout = workout;
    state.workoutPaused = false;
    state.todayWorkoutOverride = snapshot?.override || null;
  }
  if (snapshot) state.lastFinish = null;
  save(); document.querySelector(".overlay")?.remove(); render();
  toast(resume ? "Workout reopened. Finish it again when you're done." : "Removed. That session is open again in your plan.");
}
function confirmReopen(historyId, resume) {
  const entry = state.history.find((item) => item.id === historyId);
  if (!entry) return;
  const when = prettyDate(entry.date, { weekday: "long", month: "short", day: "numeric" });
  if (resume) showSheet(`Reopen ${entry.name}?`, `From ${when}. It leaves your history until you finish it again, and your plan goes back to before you finished it.`, "", `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="confirm-reopen" data-history-id="${historyId}" data-resume="1">REOPEN</button>`);
  else showSheet(`Remove ${entry.name}?`, `From ${when}. Its logged sets are deleted and the session counts as not done.`, "", `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="danger-button" data-action="confirm-reopen" data-history-id="${historyId}" data-resume="0">REMOVE</button>`);
}
function finishWorkout() {
  const workout = state.activeWorkout;
  if (!workout) return;
  // Everything finishing changes, so "Reopen" can put it back exactly (taken before any auto-fill).
  // Every set ticked by hand = a deliberate finish, so no "by mistake?" prompt (Reopen stays in History and ⋯).
  const allLogged = workout.exercises.length > 0 && workout.exercises.every((exercise) => exercise.sets.length && exercise.sets.every((set) => set.complete));
  const undo = { historyId: workout.id, date: todayKey(), allLogged, workout: JSON.parse(JSON.stringify({ ...workout, restEndsAt: null })), override: state.todayWorkoutOverride ? { ...state.todayWorkoutOverride } : null,
    program: { activeCycleWeek: state.program.activeCycleWeek, cycleId: state.program.cycleId, cycleStartedAt: state.program.cycleStartedAt } };
  // Finishing without ticking anything means "I did it as planned": log every set with the usual numbers.
  const quickFinish = !workout.exercises.some((exercise) => exercise.sets.some((set) => set.complete));
  if (quickFinish) workout.exercises.forEach(fillAndCompleteSets);
  const finished = { id: workout.id, programDayId: workout.dayId, programWeek: workout.programWeek || 1, cycleId: workout.cycleId, name: workout.name, date: workout.date, duration: Math.max(1, Math.round((Date.now() - workout.startedAt) / 60000)), exercises: workout.exercises.map((exercise) => ({ exerciseId: exercise.exerciseId, name: exercise.name, notes: exercise.notes, sets: exercise.sets.filter((set) => set.complete).map(({ weight, reps }) => ({ weight: Number(weight) || 0, reps: Number(reps) || 0 })) })).filter((exercise) => exercise.sets.length) };
  const cycleNow = menstrual().enabled && cycleAvailable() ? cycleInfo(workout.date) : null;
  if (cycleNow) finished.cycle = { day: cycleNow.day, bucket: cycleNow.bucket };
  if (workout.readiness) finished.readiness = { choice: workout.readiness.choice, suggested: workout.readiness.suggested || "", reasons: workout.readiness.reasons || [] };
  const wellbeingToday = wellbeingOn() ? wellbeing().logs[workout.date] : null;
  if (wellbeingComplete(wellbeingToday)) finished.wellbeing = { mood: wellbeingToday.mood, energy: wellbeingToday.energy, stress: wellbeingToday.stress, sleep: wellbeingToday.sleep, symptoms: wellbeingToday.symptoms || [] };
  if (finished.exercises.length) {
    state.history.unshift(finished);
    state.history = state.history.slice(0, 250);
    const previousWeek = Number(state.program.activeCycleWeek) || 1, previousCycleId = state.program.cycleId;
    advanceProgramCycle();
    let newPR = null;
    for (const exercise of finished.exercises) for (const set of exercise.sets) {
      if (!(Number(set.weight) > 0)) continue; // unweighted sets are logged, but never a personal best
      const key = exercise.name.toLowerCase();
      const old = state.prs[key];
      const score = Number(set.weight) * (1 + Number(set.reps) / 30);
      if (!old || score > old.score) { state.prs[key] = { weight: set.weight, reps: set.reps, score }; if (!old || Number(set.weight) > Number(old.weight)) newPR = { name: exercise.name, ...set, previous: old }; }
    }
    state.lastFinish = undo;
    state.workoutPaused = false;
    state.activeWorkout = null; state.todayWorkoutOverride = null; state.activeTab = "Home"; save(); render();
    const personalBest = newPR ? `<span class="toast-line">New personal best · ${escapeHtml(newPR.name)} ${newPR.weight} ${state.units} × ${newPR.reps}</span>` : "";
    const quickLine = quickFinish ? `<span class="toast-line">All sets logged with your usual numbers.</span>` : "";
    toast(`<strong class="toast-title">Workout complete 🎉</strong>${quickLine}${personalBest}<span class="toast-line">${nextWorkoutMessage(previousWeek, previousCycleId)}</span>`, Boolean(newPR), 5000);
  } else {
    state.activeWorkout = null; state.workoutPaused = false; state.activeTab = "Home"; save(); render(); toast("Workout closed without completed sets.");
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
// Add a new exercise to a day, or (with exerciseId) edit an existing one in place.
function showExerciseEditor(dayId, exerciseId = "") {
  const day = state.program.days.find((item) => item.id === dayId);
  const exercise = exerciseId ? day?.exercises.find((item) => item.id === exerciseId) : null;
  if (exerciseId && !exercise) return;
  const value = (key, fallback = "") => escapeHtml(exercise ? exercise[key] ?? "" : fallback);
  const title = exercise ? "Edit exercise" : "Add an exercise";
  const description = exercise ? `In ${day.name}. Changes apply to your plan; past workouts stay as logged.` : "Add only the details in your plan. You can fill in the rest later.";
  showSheet(title, description, `<input type="hidden" id="exercise-day" value="${escapeHtml(dayId)}"><input type="hidden" id="exercise-id" value="${escapeHtml(exerciseId)}"><label class="field"><span class="field-label">Exercise name</span><input class="text-field" id="exercise-name" placeholder="e.g. Dumbbell row" maxlength="60" value="${value("name")}"></label><div class="counter-row"><label class="field"><span class="field-label">Sets</span><input class="number-field" id="exercise-sets" type="number" min="1" max="20" value="${exercise ? value("sets") : "3"}"></label><label class="field"><span class="field-label">Rep target</span><input class="number-field" id="exercise-reps" type="number" min="1" max="100" placeholder="8" value="${value("reps")}"></label></div><div class="counter-row"><label class="field"><span class="field-label">Rest (seconds)</span><input class="number-field" id="exercise-rest" type="number" min="0" max="900" placeholder="Optional" value="${value("rest")}"></label><label class="field"><span class="field-label">RPE / RIR</span><input class="text-field" id="exercise-effort" placeholder="Optional" value="${value("effort")}"></label></div><label class="field"><span class="field-label">Notes</span><textarea class="textarea-field" id="exercise-notes" placeholder="Optional" maxlength="1200">${value("notes")}</textarea></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-exercise">${exercise ? "SAVE" : "ADD EXERCISE"}</button>`);
}
// Read-only look at one exercise from Home's "Today's flow": targets, last numbers and the full coaching note.
function showExercisePreview(dayId, exerciseId) {
  const day = state.program.days.find((item) => item.id === dayId);
  const exercise = day?.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return;
  const previous = previousExercise(exercise);
  const stat = (label, value) => `<div class="preview-stat"><span>${label}</span><strong>${value}</strong></div>`;
  const rest = Number(exercise.rest) ? (Number(exercise.rest) >= 60 && Number(exercise.rest) % 60 === 0 ? `${Number(exercise.rest) / 60} min` : `${exercise.rest}s`) : "—";
  const stats = `<div class="preview-stats">${stat("Sets", escapeHtml(exercise.sets || "—"))}${stat("Reps", escapeHtml(exercise.reps || "—"))}${stat("Rest", rest)}${stat("Effort", escapeHtml(exercise.effort || "—"))}</div>`;
  const last = previous ? `<div class="preview-block"><div class="field-label">Last time</div><p>${previous.sets.map((set) => `${set.weight || 0} ${state.units} × ${set.reps}`).join(" · ")}</p></div>` : `<div class="preview-block"><div class="field-label">Last time</div><p>Your first time with this lift.</p></div>`;
  const notes = exercise.notes ? `<div class="preview-block"><div class="field-label">Coach's notes</div><p>${escapeHtml(exercise.notes).split(" · ").join("<br>")}</p></div>` : "";
  showSheet(exercise.name, day.name, `${stats}${last}${notes}`, `<button class="secondary-button" data-action="close-sheet">Close</button><button class="primary-button" data-action="edit-plan-exercise" data-day-id="${day.id}" data-exercise-id="${exercise.id}">EDIT</button>`);
}
function showDayEditSheet(dayId) {
  const day = state.program.days.find((item) => item.id === dayId);
  if (!day) return;
  const multiWeek = Number(state.program.cycleWeeks) > 1;
  const options = ["Unscheduled", ...weekdayNames].map((name) => `<option value="${name}" ${day.day === name ? "selected" : ""}>${name === "Unscheduled" ? "Any day (unscheduled)" : name}</option>`).join("");
  showSheet("Edit day", `${multiWeek ? `Week ${Number(day.programWeek) || 1} · ` : ""}${day.exercises.length} ${day.exercises.length === 1 ? "exercise" : "exercises"}. Past workouts stay as logged.`, `<input type="hidden" id="edit-day-id" value="${escapeHtml(dayId)}"><label class="field"><span class="field-label">Day name</span><input class="text-field" id="edit-day-name" maxlength="60" value="${escapeHtml(day.name)}"></label><label class="field"><span class="field-label">Training day</span><select class="select-field" id="edit-day-weekday">${options}</select></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-day-edit">SAVE</button>`);
}
function saveDayEdit() {
  const day = state.program.days.find((item) => item.id === document.querySelector("#edit-day-id")?.value);
  if (!day) return;
  const name = document.querySelector("#edit-day-name").value.trim();
  if (!name) { document.querySelector("#edit-day-name").focus(); return; }
  day.name = name;
  day.day = document.querySelector("#edit-day-weekday").value;
  save(); document.querySelector(".overlay")?.remove(); render(); toast("Day updated.");
}
function showNameEditor() {
  showSheet("Your name", "This appears in your daily welcome.", `<label class="field"><span class="field-label">Name</span><input class="text-field" id="user-name" value="${escapeHtml(state.name)}" maxlength="32"></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-name">SAVE</button>`);
}
function exportBackup() {
  const backup = { app: "Honna", backupVersion: 1, exportedAt: new Date().toISOString(), state };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `honna-backup-${todayKey()}.json`;
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
      if (!["Honna", "Track-Her"].includes(backup?.app) || backup.backupVersion !== 1 || backup.state?.version !== 1 || !Array.isArray(backup.state.program?.days) || !Array.isArray(backup.state.history)) throw new Error("This file is not a valid Honna backup.");
      restoreDraft = backup.state;
      const exported = backup.exportedAt ? ` Backup date: ${new Date(backup.exportedAt).toLocaleDateString()}.` : "";
      showSheet("Restore this backup?", `This replaces the data on this device with ${backup.state.program.days.length} workout days and ${backup.state.history.length} saved workouts.${exported}`, "", `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="confirm-restore">RESTORE DATA</button>`);
    } catch (error) {
      showSheet("Can't restore this file", error.message || "Choose a Honna backup JSON file.", "", `<button class="primary-button" data-action="close-sheet">CLOSE</button>`);
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
  if (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true) { toast("Honna is already installed."); return; }
  const instructions = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "In Safari, open Share and choose Add to Home Screen."
    : "Open your browser menu and choose Install app or Add to Home screen.";
  showSheet("Install Honna", instructions, "", `<button class="primary-button" data-action="close-sheet">GOT IT</button>`);
}
function showNoteEditor(index) {
  const exercise = state.activeWorkout.exercises[index];
  showSheet(`${exercise.name} notes`, "A quick reminder for this session.", `<label class="field"><span class="field-label">Notes</span><textarea id="workout-note" class="textarea-field" maxlength="240">${escapeHtml(exercise.notes)}</textarea></label>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="primary-button" data-action="save-note" data-exercise-index="${index}">SAVE</button>`);
}
function confirmNewPlan() {
  const sessions = state.program.days.length;
  showSheet("Delete this plan?", `"${state.program.name}" and its ${sessions} ${sessions === 1 ? "session" : "sessions"} will be deleted. Your workout history and personal bests stay saved.`, `<button class="link-button" data-action="export-backup">↓ Export a backup first</button>`, `<button class="secondary-button" data-action="close-sheet">Cancel</button><button class="danger-button" data-action="confirm-new-plan">DELETE PLAN</button>`);
}
function startNewPlan() {
  state.program = { name: "My Program", repeatWeekly: false, cycleWeeks: 1, activeCycleWeek: 1, cycleId: uid(), cycleStartedAt: todayKey(), days: [] };
  state.todayWorkoutOverride = null; state.activeTab = "Plan";
  save(); render();
  showSheet("Start your new plan", "Your old plan is deleted. How would you like to add the new one?", `<div class="replacement-options"><button class="replacement-option" data-action="use-recommended-plan"><span><strong>Use a recommended plan</strong><small>${escapeHtml(recommendedPlan().name)} · 3 days a week</small></span>${icon("arrow")}</button><button class="replacement-option" data-action="import-pdf"><span><strong>Import a workout file</strong><small>PDF or spreadsheet. You review it first</small></span>${icon("arrow")}</button><button class="replacement-option" data-action="new-plan-manual"><span><strong>Build it myself</strong><small>Add workout days one by one</small></span>${icon("arrow")}</button></div>`, `<button class="secondary-button" data-action="close-sheet">Later</button>`);
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
function todayOverride() {
  const override = state.todayWorkoutOverride;
  return override?.date === todayKey() ? override : null;
}
function showWorkoutDayPicker(scheduledDayId, week = Number(state.program.activeCycleWeek) || 1) {
  const multiWeek = Number(state.program.cycleWeeks) > 1;
  const activeWeek = Number(state.program.activeCycleWeek) || 1;
  const override = todayOverride();
  const selectedId = override && override.scheduledDayId === scheduledDayId ? override.workoutId : scheduledDayId;
  const weeks = multiWeek ? [...new Set(state.program.days.map((day) => Number(day.programWeek) || 1))].sort((a, b) => a - b) : [];
  const days = multiWeek ? state.program.days.filter((day) => (Number(day.programWeek) || 1) === week) : activeCycleDays();
  const weekTabs = weeks.length > 1 ? `<div class="week-tabs" role="tablist" aria-label="Program week">${weeks.map((number) => `<button class="week-tab${number === week ? " selected" : ""}" data-action="picker-week" data-week="${number}" data-scheduled-day-id="${scheduledDayId}" role="tab" aria-selected="${number === week}">Week ${number}${number === activeWeek ? " ·&nbsp;now" : ""}</button>`).join("")}</div>` : "";
  const list = days.map((day) => {
    const selected = day.id === selectedId;
    const done = isWorkoutComplete(day);
    const detail = [weekdayNames.includes(day.day) ? day.day : "", `${day.exercises.length} ${day.exercises.length === 1 ? "exercise" : "exercises"}`, day.id === scheduledDayId ? "Scheduled" : "", done ? "Done · tap to reopen" : ""].filter(Boolean).join(" · ");
    // Finished sessions can be reopened from here (same as Reopen in History).
    if (done) return `<button class="replacement-option done" data-action="reopen-day" data-day-id="${day.id}"><span><strong>${escapeHtml(day.name)}</strong><small>${escapeHtml(detail)}</small></span>${icon("history")}</button>`;
    return `<button class="replacement-option${selected ? " selected" : ""}" data-action="choose-today-workout" data-scheduled-day-id="${scheduledDayId}" data-workout-id="${day.id}"${selected ? ' aria-current="true"' : ""}><span><strong>${escapeHtml(day.name)}</strong><small>${escapeHtml(detail)}</small></span>${icon(selected ? "check" : "arrow")}</button>`;
  }).join("") || `<p class="replacement-empty">No sessions in this week.</p>`;
  const description = multiWeek ? "Pick a session in this week to swap today's workout, or pick another week to move your plan there." : "For today only. Your program stays as planned, and your scheduled session counts as complete when you finish.";
  showSheet("Pick today's session", description, `${weekTabs}<div class="replacement-options">${list}</div>`, `<button class="secondary-button" data-action="close-sheet">Close</button>`);
  document.querySelector(".week-tab.selected")?.scrollIntoView({ block: "nearest", inline: "center" });
}
function chooseTodayWorkout(scheduledDayId, workoutId) {
  const day = state.program.days.find((item) => item.id === workoutId);
  if (!day) return;
  const activeWeek = Number(state.program.activeCycleWeek) || 1;
  const dayWeek = Number(day.programWeek) || 1;
  const pinned = Boolean(todayOverride()?.pinned);
  if (Number(state.program.cycleWeeks) > 1 && dayWeek !== activeWeek) {
    // Another week: move the plan there and make this session today's scheduled one.
    state.program.activeCycleWeek = dayWeek;
    state.todayWorkoutOverride = { date: todayKey(), scheduledDayId: day.id, workoutId: day.id, pinned: true };
    save(); document.querySelector(".overlay")?.remove(); render(); toast(`Moved to Week ${dayWeek}. Today: ${escapeHtml(day.name)}`);
    return;
  }
  const backToScheduled = workoutId === scheduledDayId;
  state.todayWorkoutOverride = backToScheduled ? (pinned ? { date: todayKey(), scheduledDayId, workoutId: scheduledDayId, pinned } : null) : { date: todayKey(), scheduledDayId, workoutId, pinned };
  save(); document.querySelector(".overlay")?.remove(); render(); toast(backToScheduled ? "Back to your scheduled session." : "Today's session changed. Your plan is unchanged.");
}
function showUnitsOnboarding() {
  document.querySelector(".onboarding").innerHTML = `<div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Honna</div><div class="onboarding-visual" style="min-height:140px"><div style="text-align:center"><div class="eyebrow">One last thing</div><h2 style="margin-top:8px">Your preferred units</h2></div></div><div class="eyebrow">Choose what feels familiar</div><div class="onboarding-actions" style="grid-template-columns:1fr 1fr"><button class="${state.units === "kg" ? "primary-button" : "secondary-button"}" data-action="set-units-onboarding" data-units="kg">kg <span style="font-weight:400">Kilograms</span></button><button class="${state.units === "lbs" ? "primary-button" : "secondary-button"}" data-action="set-units-onboarding" data-units="lbs">lbs <span style="font-weight:400">Pounds</span></button></div></div><div><div class="step-dots"><i></i><i></i><i class="active"></i></div><button class="primary-button" style="width:100%" data-action="complete-onboarding">GO TO MY WORKOUT ${icon("arrow")}</button></div>`;
}
function showPlanChoice() {
  document.querySelector(".onboarding").innerHTML = `<div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Honna</div><div class="onboarding-visual" style="min-height:140px"><div style="text-align:center"><div class="eyebrow">Start with what you have</div><h2 style="margin-top:8px">Your plan, your way</h2></div></div><div class="eyebrow">How would you like to add your plan?</div><div class="onboarding-actions"><button class="secondary-button" data-action="import-pdf"><span><strong>Upload a workout file</strong><span>PDF or spreadsheet (Excel, CSV). You review it first</span></span>${icon("arrow")}</button><button class="secondary-button" data-action="create-program"><span><strong>Create my plan</strong><span>Build a simple weekly schedule</span></span>${icon("arrow")}</button><button class="link-button" data-action="use-sample">Explore with a sample plan</button></div></div><div><div class="step-dots"><i></i><i class="active"></i><i></i></div><button class="link-button" data-action="onboarding-back">Back</button></div>`;
}
function useSamplePlan() {
  state.onboarded = true; state.activeTab = "Home"; save(); render();
}
function showCycleOnboarding() {
  document.querySelector(".onboarding").innerHTML = `<div><div class="brand"><span class="brand-mark">${icon("spark")}</span>Honna</div><div class="onboarding-visual" style="min-height:140px"><div style="text-align:center"><div class="eyebrow">Optional</div><h2 style="margin-top:8px">Train with your cycle</h2></div></div><p class="onboarding-copy">Would you like Honna to adapt your training based on your menstrual cycle? It learns from your own patterns and always asks before changing a workout. Your data stays on this device.</p></div><div><div class="onboarding-actions"><button class="primary-button" data-action="cycle-onboarding-yes">YES, SET IT UP ${icon("arrow")}</button><button class="secondary-button" data-action="cycle-onboarding-no">Not now</button></div></div>`;
}
function finishOnboarding() { state.onboarded = true; state.activeTab = "Home"; save(); render(); }
const spreadsheetPattern = /\.(xlsx|xlsm|xlsb|xls|ods|csv)$/i;
async function openPdfPicker() {
  const input = document.createElement("input"); input.type = "file";
  input.accept = ".pdf,application/pdf,.xlsx,.xlsm,.xlsb,.xls,.ods,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.oasis.opendocument.spreadsheet,text/csv,text/comma-separated-values";
  input.addEventListener("change", async () => {
    const file = input.files?.[0]; if (!file) return;
    if (spreadsheetPattern.test(file.name)) { importSpreadsheet(file); return; }
    try {
      showSheet("Reading your plan", "Pulling the text from your PDF. Nothing is saved until you confirm.", `<div class="empty-state"><p id="import-progress">This usually takes a few seconds…</p></div>`);
      const extracted = await extractPdfText(file, (message) => {
        const progress = document.querySelector("#import-progress");
        if (progress) progress.textContent = `${message} This PDF is made of images, so each page is read like a photo — it can take a few minutes.`;
      });
      importDraft = parseWorkoutPdf(extracted.pages, extracted.text, file.name);
      showImportReview(importProgramName.endsWith("Week 1") ? `${file.name} · Week 1 only` : file.name);
    } catch (error) { document.querySelector(".overlay")?.remove(); showSheet("Couldn't read this PDF", "Try a text-based PDF, or add your plan manually.", `<div class="empty-state"><p>${escapeHtml(error.message || "This PDF could not be read.")}</p></div>`, `<button class="secondary-button" data-action="close-sheet">Close</button><button class="primary-button" data-action="create-program">CREATE MY PLAN</button>`); }
  });
  input.click();
}
// ---------- Spreadsheets (Excel, Google Sheets downloads, LibreOffice, CSV) ----------
// Cells are read directly (no PDF/OCR step), so values like 67%, 8RPE or 1+2F come through exactly.
let sheetJsLoader = null;
function loadSheetJs() {
  sheetJsLoader ||= new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => { sheetJsLoader = null; reject(new Error("Couldn't load the spreadsheet reader. Check your internet connection and try again.")); };
    document.head.append(script);
  });
  return sheetJsLoader;
}
async function importSpreadsheet(file) {
  try {
    showSheet("Reading your plan", "Reading the spreadsheet. Nothing is saved until you confirm.", `<div class="empty-state"><p>This usually takes a second…</p></div>`);
    const XLSX = await loadSheetJs();
    // raw: CSV text stays text (otherwise "6-8" reps would turn into a date).
    const workbook = /\.csv$/i.test(file.name) ? XLSX.read(await file.text(), { type: "string", raw: true }) : XLSX.read(await file.arrayBuffer());
    const sheets = workbook.SheetNames.map((name) => ({ name, rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, blankrows: true, defval: "" }).map((row) => row.map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim())) }));
    importDraft = parseWorkoutSheets(sheets);
    const fullTitle = file.name.replace(spreadsheetPattern, "").replace(/\s*\(\d+\)$/, "").replace(/[_+]+/g, " ").replace(/\s+-\s+/g, " · ").replace(/\s+/g, " ").trim();
    importProgramName = (fullTitle.length > 40 ? fullTitle.slice(0, 41).replace(/\s+\S*$/, "") : fullTitle).replace(/[\s\-–—·:,]+$/, "") || "Imported Program";
    if (!importDraft.length) importDraft = parseWorkoutText(sheets.map((sheet) => sheet.rows.map((row) => row.filter(Boolean).join(" ")).join("\n")).join("\n"));
    showImportReview(file.name);
  } catch (error) {
    document.querySelector(".overlay")?.remove();
    showSheet("Couldn't read this spreadsheet", "Try saving it as .xlsx or .csv, or add your plan manually.", `<div class="empty-state"><p>${escapeHtml(error.message || "This file could not be read.")}</p></div>`, `<button class="secondary-button" data-action="close-sheet">Close</button><button class="primary-button" data-action="create-program">CREATE MY PLAN</button>`);
  }
}
// Normalise one spreadsheet value: "8RPE" → effort, "67%" → load target, "0"/"x" → nothing.
function sheetValueKind(value) {
  if (!value || /^(x|-|—|0|n\/?a)$/i.test(value)) return null;
  if (/^(rpe|rir)\s*\d|^\d+(?:\.\d+)?\s*(rpe|rir)$/i.test(value)) return "effort";
  if (/%/.test(value)) return "intensity";
  return "other";
}
// Workout tables laid out as an "Exercise" column plus one or more column groups (Sets, Reps, Load, Rest…),
// each group usually a week. Week/day labels come from the title row above each header.
function parseWorkoutSheets(sheets) {
  const sessions = [];
  let lastWeek = 0;
  for (const sheet of sheets) {
    const { rows } = sheet;
    let sheetGroupWeeks = null;
    const sheetHasWeek = rows.some((row) => row.some((cell) => /\bweek\s*\d/i.test(cell)));
    let undatedWeek = null, blockIndex = 0;
    for (let r = 0; r < rows.length; r += 1) {
      const row = rows[r];
      const kinds = row.map((cell) => (cell && isImportHeaderCell(cell) ? classifyImportHeader(cell) : null));
      const exerciseCol = kinds.indexOf("exercise");
      const groupStarts = kinds.map((kind, col) => (col > exerciseCol && (kind === "sets" || kind === "setsreps") ? col : -1)).filter((col) => col >= 0);
      if (exerciseCol < 0 || !groupStarts.length || !kinds.some((kind) => kind === "reps" || kind === "setsreps")) continue;
      const groups = groupStarts.map((start, index) => {
        const end = (groupStarts[index + 1] ?? row.length) - 1;
        const columns = [];
        for (let col = start; col <= end; col += 1) if (kinds[col] && kinds[col] !== "ignore" && kinds[col] !== "week") columns.push({ col, kind: kinds[col], header: row[col] });
        return { start, end, columns, label: "" };
      });
      // Title row: the nearest non-empty row above (within 2 rows).
      let titleRow = null;
      for (let up = r - 1; up >= Math.max(0, r - 2); up -= 1) if (rows[up].some(Boolean)) { titleRow = rows[up]; break; }
      const titles = (titleRow || []).map((text, col) => ({ text, col })).filter((cell) => cell.text);
      for (const title of titles) {
        const group = groups.find((item, index) => (index === 0 ? title.col <= item.end : title.col >= item.start && title.col <= item.end));
        if (group) group.label = [group.label, title.text].filter(Boolean).join(" ");
      }
      const weekOf = (label) => Number(label.match(/\bweek\s*(\d{1,2})/i)?.[1]) || null;
      // One long table with a "Day" (and/or "Week") column: each row goes to the session named in that column.
      const dayCol = row.findIndex((cell, col) => col !== exerciseCol && /^(training\s*)?(day|session|workout)s?(\s*(name|#|no\.?|number))?$/i.test(cell));
      const weekCol = row.findIndex((cell, col) => col !== exerciseCol && /^(week|wk)s?(\s*(#|no\.?|number))?$/i.test(cell));
      const longMode = groups.length === 1 && (dayCol >= 0 || weekCol >= 0);
      const longSessions = new Map();
      let currentDay = "", currentWeek = "";
      if (groups.some((group) => weekOf(group.label))) sheetGroupWeeks = groups.map((group) => weekOf(group.label));
      const dayTitle = titles.map((title) => title.text).find((text) => /\bday\s*\d/i.test(text)) || "";
      const dayNumber = Number(dayTitle.match(/\bday\s*(\d{1,2})/i)?.[1]) || null;
      const dayLabel = importLabelText((dayNumber ? dayTitle.replace(/^.*?\bday\s*\d{1,2}\b/i, "") : titles.map((title) => title.text).join(" ")).replace(/\bweek\s*\d{1,2}\b,?/gi, ""));
      if (!sheetHasWeek && undatedWeek === null) undatedWeek = lastWeek + 1;
      blockIndex += 1;
      // Exercise rows until a blank row or the next header/title.
      const blockSessions = groups.map(() => []);
      let previousName = "";
      for (let rr = r + 1; rr < rows.length; rr += 1) {
        const line = rows[rr];
        if (!line.some(Boolean)) { if (longMode) continue; break; }
        if (line.some((cell) => cell && classifyImportHeader(cell) === "exercise" && isImportHeaderCell(cell))) break;
        if (longMode) {
          // Blank Day/Week cells (merged cells in Excel) continue the one above; a new day starts fresh.
          if (dayCol >= 0 && line[dayCol] && line[dayCol] !== currentDay) { currentDay = line[dayCol]; previousName = ""; }
          if (weekCol >= 0 && line[weekCol] && line[weekCol] !== currentWeek) { currentWeek = line[weekCol]; previousName = ""; }
          if (!line[exerciseCol] && !groups.some((group) => group.columns.some((column) => line[column.col]))) continue;
        }
        const name = line[exerciseCol] || previousName;
        if (!line[exerciseCol] && !groups.some((group) => group.columns.some((column) => line[column.col]))) break;
        if (!name) continue;
        if (line[exerciseCol]) previousName = line[exerciseCol];
        groups.forEach((group, groupIndex) => {
          const cells = { exercise: [{ text: name, header: "Exercise" }] };
          let setsText = "", repsText = "";
          for (const { col, kind, header } of group.columns) {
            const value = line[col];
            if (kind === "sets" || kind === "setsreps") { setsText = value; continue; }
            if (kind === "reps") { repsText = value; continue; }
            const valueKind = sheetValueKind(value);
            if (!valueKind) continue;
            if (valueKind === "effort") (cells.effort ||= []).push({ text: value.replace(/^(\d+(?:\.\d+)?)\s*(rpe|rir)$/i, (m, number, unit) => `${unit.toUpperCase()} ${number}`), header: "RPE" });
            else if (valueKind === "intensity") (cells.intensity ||= []).push({ text: value, header });
            else if (kind === "tempo" || kind === "rest" || kind === "warmup" || kind === "substitution" || kind === "notes" || kind === "technique") (cells[kind] ||= []).push({ text: value, header });
            else if (/^\d+\s*(s|sec|secs|seconds)$/i.test(value) && /^x?$/i.test(repsText)) repsText = value;
            else (cells.notes ||= []).push({ text: /^opener$/i.test(value) ? "Opener (competition attempt)" : value, header });
          }
          if (!setsText && !repsText) return;
          const plus = setsText.match(/^(\d{1,2})\s*\+\s*(\d{1,2})\s*([a-z])?$/i);
          if (plus) {
            cells.sets = [{ text: String(Number(plus[1]) + Number(plus[2])), header: "Sets" }];
            (cells.notes ||= []).unshift({ text: `Sets: ${setsText} (${plus[1]} top set + ${plus[2]} back-off)`, header: "Sets" });
          } else if (setsText) cells.sets = [{ text: setsText, header: "Sets" }];
          if (repsText && !/^x$/i.test(repsText)) cells.reps = [{ text: repsText, header: "Reps" }];
          const exercise = buildImportedExercise(cells);
          if (exercise && longMode) {
            const key = `${currentWeek}\u0000${currentDay}`;
            if (!longSessions.has(key)) longSessions.set(key, { week: currentWeek, day: currentDay, exercises: [] });
            longSessions.get(key).exercises.push(exercise);
          } else if (exercise) blockSessions[groupIndex].push(exercise);
        });
      }
      for (const entry of longSessions.values()) {
        const week = Number(entry.week.match(/\d{1,2}/)?.[0]) || sheetGroupWeeks?.[0] || (sheetHasWeek ? lastWeek || 1 : undatedWeek);
        lastWeek = Math.max(lastWeek, week);
        const weekday = weekdayNames.find((name) => name.toLowerCase() === entry.day.toLowerCase() || name.slice(0, 3).toLowerCase() === entry.day.toLowerCase());
        const number = Number(entry.day.match(/^(?:day|session|workout)?\s*#?\s*(\d{1,2})\b/i)?.[1]) || null;
        const rest = number ? entry.day.replace(/^(?:day|session|workout)?\s*#?\s*\d{1,2}\b/i, "") : weekday ? "" : entry.day;
        sessions.push({ week, dayNumber: number, dayLabel: importLabelText(rest), weekday: weekday || "", order: sessions.length, exercises: entry.exercises });
      }
      groups.forEach((group, groupIndex) => {
        if (!blockSessions[groupIndex].length) return;
        const week = weekOf(group.label) || sheetGroupWeeks?.[groupIndex] || (sheetHasWeek ? lastWeek || 1 : undatedWeek);
        lastWeek = Math.max(lastWeek, week);
        sessions.push({ week, dayNumber, dayLabel, order: sessions.length, exercises: blockSessions[groupIndex] });
      });
    }
  }
  if (!sessions.length) return [];
  const weeks = new Set(sessions.map((session) => session.week));
  const counts = new Map();
  return sessions.sort((a, b) => a.week - b.week || a.order - b.order).map((session) => {
    const number = (counts.get(session.week) || 0) + 1;
    counts.set(session.week, number);
    const day = session.dayNumber ? `Day ${session.dayNumber}` : session.dayLabel || session.weekday ? "" : `Day ${number}`;
    const title = [day, session.dayLabel || session.weekday].filter(Boolean).join(" · ");
    return { id: uid(), day: session.weekday || "Unscheduled", programWeek: session.week, name: weeks.size > 1 || session.week > 1 ? `Week ${session.week} · ${title}` : title, exercises: session.exercises };
  });
}
async function extractPdfText(file, onProgress = () => { }) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
  const pdfDocument = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
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
  // Image-only (scanned or flattened) PDFs have no text layer: read them with OCR instead.
  const characters = pages.reduce((total, page) => total + page.items.reduce((sum, item) => sum + item.text.length, 0), 0);
  if (characters < pdfDocument.numPages * 20) await ocrPdfPages(pdfDocument, pages, onProgress);
  const text = pages.map((page) => pdfTextRows(page.items).map((row) => row.items.map((item) => item.text).join(" ")).join("\n")).join("\n");
  return { pages, text };
}
let tesseractLoader = null;
function loadTesseract() {
  tesseractLoader ||= new Promise((resolve, reject) => {
    if (window.Tesseract) { resolve(window.Tesseract); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => { tesseractLoader = null; reject(new Error("Couldn't load the text recognizer. Check your internet connection and try again.")); };
    document.head.append(script);
  });
  return tesseractLoader;
}
// Black text on white for OCR: marks pixels that stand out from their neighbourhood (dark-on-light and
// light-on-dark alike), then erases long straight runs — table borders and link underlines.
function prepareOcrCanvas(source, textHeight) {
  const { width, height } = source;
  const context = source.getContext("2d", { willReadFrequently: true });
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  const luminance = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) luminance[index] = pixels[index * 4] * .299 + pixels[index * 4 + 1] * .587 + pixels[index * 4 + 2] * .114;
  const stride = width + 1, integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < width; x += 1) { rowSum += luminance[y * width + x]; integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum; }
  }
  // Flip dark regions (e.g. white-on-charcoal headers) so every label is dark text on a light background.
  const radius = Math.max(8, Math.round(textHeight * 0.9));
  const output = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1);
      const mean = (integral[bottom * stride + right] - integral[top * stride + right] - integral[bottom * stride + left] + integral[top * stride + left]) / ((bottom - top) * (right - left));
      const value = luminance[y * width + x];
      output[y * width + x] = mean < 110 ? 255 - value : value;
    }
  }
  // Erase long thin dark runs: table borders and link underlines (letters never have strokes this long).
  const eraseRuns = (horizontal, minimum) => {
    const outer = horizontal ? height : width, inner = horizontal ? width : height;
    const at = (a, b) => horizontal ? a * width + b : b * width + a;
    for (let a = 0; a < outer; a += 1) {
      let start = -1;
      for (let b = 0; b <= inner; b += 1) {
        const on = b < inner && output[at(a, b)] < 180;
        if (on && start < 0) start = b;
        else if (!on && start >= 0) { if (b - start >= minimum) for (let c = start; c < b; c += 1) output[at(a, c)] = 255; start = -1; }
      }
    }
  };
  eraseRuns(true, Math.round(textHeight * 2.2));
  eraseRuns(false, Math.round(textHeight * 2.6));
  // Black where clearly dark, or noticeably darker than its surroundings (keeps low-contrast text like green-on-charcoal).
  const flipped = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < width; x += 1) { rowSum += output[y * width + x]; flipped[(y + 1) * stride + x + 1] = flipped[y * stride + x + 1] + rowSum; }
  }
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1);
      const mean = (flipped[bottom * stride + right] - flipped[top * stride + right] - flipped[bottom * stride + left] + flipped[top * stride + left]) / ((bottom - top) * (right - left));
      const index = y * width + x, value = output[index];
      pixels[index * 4] = pixels[index * 4 + 1] = pixels[index * 4 + 2] = value < 150 || value < mean - 18 ? 0 : 255; pixels[index * 4 + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return source;
}
function ocrItemsFromLines(lines, toPage, minimumConfidence) {
  const items = [];
  for (const line of lines) {
    // Short numeric cells ("1", "2-4", "~7") get low confidence even when right; a lone vertical stroke is a "1".
    const words = line.words.map((word) => ({ ...word, text: /^[|lI\]\[!]$/.test(word.text.trim()) ? "1" : word.text }))
      .filter((word) => {
        const text = word.text.trim();
        if (/^[~≈]?\d{1,3}(?:[-–/]\d{1,3})?$/.test(text)) return word.confidence >= 10;
        if (text.length <= 2) return word.confidence >= 80; // short letter blobs are usually stray marks
        return word.confidence >= minimumConfidence;
      })
      .sort((a, b) => a.bbox.x0 - b.bbox.x0);
    if (!words.length) continue;
    const height = Math.max(4, ...words.map((word) => word.bbox.y1 - word.bbox.y0));
    const baseline = line.baseline?.y0 != null ? (line.baseline.y0 + line.baseline.y1) / 2 : Math.max(...words.map((word) => word.bbox.y1));
    let phrase = null;
    const flush = () => { if (phrase) items.push({ ...toPage(phrase.x0, phrase.x1, baseline), text: phrase.text }); phrase = null; };
    // Words close together form one cell; a wide gap (or a stray border mark) starts a new table column.
    for (const word of words) {
      const text = word.text.replace(/^[|¦]+|[|¦]+$/g, "");
      if (!text || /^[|¦!_=—-]+$/.test(text)) { flush(); continue; }
      if (phrase && word.bbox.x0 - phrase.x1 < height * 0.9) { phrase.text += ` ${text}`; phrase.x1 = word.bbox.x1; }
      else { flush(); phrase = { text, x0: word.bbox.x0, x1: word.bbox.x1 }; }
    }
    flush();
  }
  return items;
}
// Sparse OCR drops lone characters such as a "1" in a sets column. Find each table's number columns and
// re-read their empty cells one at a time as a single line of digits.
async function fillMissingOcrNumbers(worker, canvas, scale, items) {
  const numericKinds = new Set(["warmup", "sets", "reps"]);
  const rowKinds = new Set(["intensity", "technique", "warmup", "sets", "reps", "effort", "rest"]);
  const crops = [];
  const headers = findImportHeaders(importRowsOf(items));
  headers.forEach((header, tableIndex) => {
    const nextTop = headers[tableIndex + 1]?.top ?? -Infinity;
    const body = items.filter((item) => item.y < header.bottom - 2 && item.y > nextTop + 2);
    const { columns } = header;
    const edges = importColumnBoundaries(columns, body);
    const columnOf = (item) => { const index = edges.findIndex((edge) => item.x + item.width / 2 < edge); return index === -1 ? columns.length - 1 : index; };
    const rowYs = [];
    for (const item of body) {
      if (!rowKinds.has(columns[columnOf(item)].kind) || !/\d|n\/?a/i.test(item.text)) continue;
      if (!rowYs.some((y) => Math.abs(y - item.y) <= 4)) rowYs.push(item.y);
    }
    columns.forEach((column, index) => {
      if (!numericKinds.has(column.kind)) return;
      const left = index ? edges[index - 1] : column.left - 10, right = index < edges.length ? edges[index] : column.right + 10;
      for (const y of rowYs) {
        if (body.some((item) => columnOf(item) === index && Math.abs(item.y - y) <= 6)) continue;
        crops.push({ left, right, y });
      }
    });
  });
  if (!crops.length) return;
  const textHeight = 12 * scale;
  await worker.setParameters({ tessedit_pageseg_mode: "7", tessedit_char_whitelist: "0123456789-~/" });
  try {
    for (const crop of crops) {
      const x0 = Math.max(0, Math.round(crop.left * scale)), x1 = Math.min(canvas.width, Math.round(crop.right * scale));
      const baseline = canvas.height - crop.y * scale;
      const y0 = Math.max(0, Math.round(baseline - textHeight * 1.3)), y1 = Math.min(canvas.height, Math.round(baseline + textHeight * 0.5));
      if (x1 - x0 < 4 || y1 - y0 < 4) continue;
      const pad = Math.round(textHeight);
      const cell = document.createElement("canvas");
      cell.width = x1 - x0 + pad * 2; cell.height = y1 - y0 + pad * 2;
      const context = cell.getContext("2d");
      context.fillStyle = "#fff"; context.fillRect(0, 0, cell.width, cell.height);
      context.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, pad, pad, x1 - x0, y1 - y0);
      const { data } = await worker.recognize(cell, {}, { text: true });
      const value = (data.text || "").replace(/\s+/g, "").trim();
      if (/^~?\d{1,3}(?:[-/]\d{1,3})?$/.test(value)) items.push({ x: (crop.left + crop.right) / 2 - 3, width: 6, y: crop.y, text: value, rotated: false });
    }
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: "11", tessedit_char_whitelist: "" });
  }
}
// A "Week" label whose number wasn't read (faint or low-contrast digits): re-read the patch to its right from the
// original render, with the patch's own contrast stretched to full black and white.
async function fillMissingWeekNumbers(worker, original, scale, items) {
  const targets = items.filter((item) => !item.rotated && /\bweeks?$/i.test(item.text.trim()));
  if (!targets.length) return;
  const textHeight = 12 * scale;
  await worker.setParameters({ tessedit_pageseg_mode: "7", tessedit_char_whitelist: "0123456789" });
  try {
    for (const item of targets) {
      const x0 = Math.round((item.x + item.width) * scale), x1 = Math.min(original.width, Math.round(x0 + textHeight * 2.6));
      const baseline = original.height - item.y * scale;
      const y0 = Math.max(0, Math.round(baseline - textHeight * 1.4)), y1 = Math.min(original.height, Math.round(baseline + textHeight * 0.4));
      if (x1 - x0 < 4 || y1 - y0 < 4) continue;
      const pad = Math.round(textHeight);
      const cell = document.createElement("canvas");
      cell.width = (x1 - x0) * 2 + pad * 2; cell.height = (y1 - y0) * 2 + pad * 2;
      const context = cell.getContext("2d", { willReadFrequently: true });
      context.drawImage(original, x0, y0, x1 - x0, y1 - y0, pad, pad, (x1 - x0) * 2, (y1 - y0) * 2);
      const image = context.getImageData(pad, pad, (x1 - x0) * 2, (y1 - y0) * 2);
      const values = [];
      for (let index = 0; index < image.data.length; index += 4) values.push(image.data[index] * .299 + image.data[index + 1] * .587 + image.data[index + 2] * .114);
      const sorted = [...values].sort((a, b) => a - b);
      const low = sorted[Math.floor(sorted.length * .05)], high = sorted[Math.floor(sorted.length * .95)];
      const background = sorted[Math.floor(sorted.length / 2)];
      const darkBackground = background < (low + high) / 2;
      const middle = (low + high) / 2;
      values.forEach((value, index) => {
        const ink = darkBackground ? value > middle : value < middle;
        image.data[index * 4] = image.data[index * 4 + 1] = image.data[index * 4 + 2] = ink ? 0 : 255; image.data[index * 4 + 3] = 255;
      });
      context.fillStyle = "#fff"; context.fillRect(0, 0, cell.width, cell.height);
      context.putImageData(image, pad, pad);
      const { data } = await worker.recognize(cell, {}, { text: true });
      const digits = (data.text || "").replace(/\D/g, "");
      if (/^\d{1,2}$/.test(digits)) item.text = `${item.text.trim()} ${digits}`;
    }
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: "11", tessedit_char_whitelist: "" });
  }
}
// OCR each page and turn recognised words into positioned items (PDF units, y from the bottom) for the importers.
async function ocrPdfPages(pdfDocument, pages, onProgress) {
  const Tesseract = await loadTesseract();
  onProgress("Preparing text recognition…");
  const worker = await Tesseract.createWorker("eng");
  const linesOf = (data) => (data.blocks || []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines));
  try {
    await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "11" });
    for (const target of pages) {
      onProgress(`Reading page ${target.number} of ${pages.length}…`);
      const page = await pdfDocument.getPage(target.number);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(4, 4400 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      // Sideways labels (e.g. a session name running up a table's edge): a copy of the page turned a quarter clockwise.
      const small = 0.5;
      const turned = document.createElement("canvas");
      turned.width = Math.ceil(canvas.height * small); turned.height = Math.ceil(canvas.width * small);
      const turnedContext = turned.getContext("2d");
      turnedContext.translate(turned.width, 0); turnedContext.rotate(Math.PI / 2); turnedContext.scale(small, small);
      turnedContext.drawImage(canvas, 0, 0);
      const original = document.createElement("canvas");
      original.width = canvas.width; original.height = canvas.height;
      original.getContext("2d").drawImage(canvas, 0, 0);
      prepareOcrCanvas(canvas, 10 * scale);
      const { data } = await worker.recognize(canvas, {}, { blocks: true, text: false });
      const items = ocrItemsFromLines(linesOf(data), (x0, x1, baseline) => ({ x: x0 / scale, width: (x1 - x0) / scale, y: (canvas.height - baseline) / scale, rotated: false }), 45);
      await fillMissingOcrNumbers(worker, canvas, scale, items);
      await fillMissingWeekNumbers(worker, original, scale, items);
      original.width = original.height = 0;
      const sideways = await worker.recognize(turned, {}, { blocks: true, text: false });
      // Turned pixel (u, v) came from page pixel x = v / small, y_from_bottom = u / small (text read bottom-to-top).
      for (const item of ocrItemsFromLines(linesOf(sideways.data), (u0, u1, v) => ({ x: v / small / scale, width: 1, y: (u0 + u1) / 2 / small / scale, rotated: true }), 80)) {
        if (/[a-z]{3}/i.test(item.text) && item.text.length >= 4) items.push(item);
      }
      target.items = items.map((item) => ({ ...item, text: item.text.trim() }));
      target.width = base.width;
      target.ocr = true;
      canvas.width = canvas.height = turned.width = turned.height = 0;
    }
  } finally {
    await worker.terminate();
  }
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
  const fullTitle = fileName.replace(/\.pdf$/i, "").replace(/\s*\(\d+\)$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  const fileTitle = (fullTitle.length > 40 ? fullTitle.slice(0, 41).replace(/\s+\S*$/, "") : fullTitle).replace(/[\s\-–—·:,]+$/, "");
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
  ["ignore", /video|demo|link|^#$|^no\.?$|^ls\s*rpe$|^last\s*set$|^set\s*\d+$|^\d+$|^done$|^log$/i],
  ["warmup", /warm/i],
  ["substitution", /substitut|alternat|swap|option/i],
  ["notes", /note|cue|comment|instruction|coach|technique/i],
  ["tempo", /tempo/i],
  ["rest", /rest|recovery/i],
  ["setsreps", /sets?\s*[x×/]\s*reps?/i],
  ["effort", /rp[eil]\b|rpe|rir|effort/i],
  ["technique", /technique|method/i],
  ["intensity", /%|1\s*rm|intensity/i],
  ["load", /load|weight|kg|lbs/i],
  ["reps", /rep|time|duration/i],
  ["sets", /set/i],
  ["exercise", /exercise|movement|lift|name/i],
];
const importHeaderWord = /^(?:exercises?|movements?|lifts?|names?|sets?|working|warm|warmup|up|reps?|repetitions|time|duration|rest|recovery|rpe|rir|lsrpe|effort|intensity|%?1rm|%|load|weight|kg|lbs|tempo|notes?|coaching|cues?|comments?|instructions?|technique|method|early|tracking|substitutions?|substitutes?|alternatives?|options?|swap|video|demo|links?|weeks?|ls|last|done|log|of|and|or|x|×|min|mins|sec|secs|seconds|minutes|target|top|#|no|\d{1,2})$/i;
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
  let label = text.replace(importWeekPattern, "").replace(/\s*#\s*/g, " #").replace(/^[\s\-–—:|·/.,]+|[\s\-–—:|·/.,]+$/g, "").replace(/\s+/g, " ").trim();
  if ((label.match(/\(/g) || []).length > (label.match(/\)/g) || []).length) label += ")"; // OCR sometimes drops a closing bracket
  return /[a-z][A-Z]/.test(label) || label === label.toUpperCase() || label === label.toLowerCase() ? label.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (match, before, letter) => before + letter.toUpperCase()) : label;
}
function findImportHeaders(rows) {
  const headerLikeItem = (item) => !/^\d+(?:[.,]\d+)?$/.test(item.text) && (item.text.match(/\d/g) || []).length <= 1 && item.text.split(/\s+/).length <= 4;
  // A header line is mostly header-like cells; one stray mark (common in OCR) doesn't disqualify it.
  const isHeaderLike = (row) => { const good = row.items.filter(headerLikeItem).length; return good === row.items.length || (row.items.length >= 3 && good >= row.items.length - 1 && row.items.some((item) => isImportHeaderCell(item.text))); };
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
    // Stray marks inside a header line (OCR noise such as a lone "1") are dropped rather than disqualifying the line.
    const headerItems = band.flatMap((row) => row.items).filter((item) => (weekColumns >= 2 || !importWeekPattern.test(item.text)) && /[a-z%#]/i.test(item.text));
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
  if (!/[a-z]{3}/i.test(name)) return null;
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
  const effortCells = (cells.effort || []).map((cell) => ({ ...cell, text: cell.text.replace(/\bn\/a\b/gi, "").replace(/\s+/g, " ").trim() })).filter((cell) => cell.text && !/^-+$/.test(cell.text));
  for (const cell of effortCells) {
    const parsed = importEffort(cell.text, cell.header);
    if (parsed.note) notes.push(parsed.note);
    else if (effortCells.length > 1) notes.push(`${importLabelText(cell.header.replace(/\b(?:rpe|rir)\b/i, "").trim()) || "Effort"}: ${parsed.effort}`);
    effort = parsed.effort || effort; // the last effort column (e.g. last-set RPE) is the target
  }
  if (text("technique")) notes.push(`Technique: ${text("technique")}`);
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
    // "Week N" may carry a stray OCR mark in front ("1 WEEK 1"), so look inside short cells too.
    // OCR often confuses digits with look-alike letters right after "Week" (S/5, O/0, I/l/1, B/8, Z/2).
    const ocrDigits = (text) => text.replace(/(\bweeks?\s*)([0-9SOoIlBZ|]{1,2})\b/i, (match, word, number) => word + number.replace(/S/g, "5").replace(/[Oo]/g, "0").replace(/[Il|]/g, "1").replace(/B/g, "8").replace(/Z/g, "2"));
    const weekIn = (raw) => {
      const text = ocrDigits(raw);
      if (importWeekPattern.test(text)) return text.match(importWeekPattern); // "Week 3 / Day 1-2", "Weeks 1-4"
      const at = text.search(/\bweeks?\s*\d/i);
      return at >= 0 && text.split(/\s+/).length <= 4 ? text.slice(at).match(importWeekPattern) : null;
    };
    const markers = rows.flatMap((row) => row.items.map((item) => ({ y: row.y, match: /\bweeks?\b/i.test(item.text) ? weekIn(item.text) : null })).filter((marker) => marker.match));
    let previousBottom = Infinity;
    headers.forEach((header, tableIndex) => {
      const nextTop = headers[tableIndex + 1]?.top ?? -Infinity;
      const body = flat.filter((item) => item.y < header.bottom - 2 && item.y > nextTop + 2);
      const columns = [...header.columns];
      // Long sentences well right of the last header are a notes column whose header wasn't read (common with OCR).
      const lastRight = columns.at(-1).right;
      const beyond = body.filter((item) => item.x > lastRight + 30 && item.text.split(/\s+/).length >= 5);
      if (beyond.length >= 2 && !columns.some((column) => column.kind === "notes")) {
        const left = Math.min(...beyond.map((item) => item.x)), right = Math.max(...beyond.map((item) => item.x + item.width));
        columns.push({ left, right, center: (left + right) / 2, header: "Notes", kind: "notes", items: [] });
      }
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
        // Short marks entirely left of the first header (bits of side labels, OCR specks) are not part of any cell.
        const lines = importRowsOf(body.filter((item) => columnOf(item) === columnIndex && (item.x + item.width >= columns[0].left - 5 || (item.text.match(/[a-z]/gi) || []).length >= 3)));
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
  const explanation = multiWeek ? `This program has ${cycleWeeks} weeks. Your sessions will move forward week by week before restarting.` : "Should Honna reuse this same workout cycle every week? You can change this later in Plan.";
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
  set.edited = true;
  save(); render();
}
// "All sets done": copy the set you adjusted to the untouched ones, otherwise reuse last session's numbers.
// Marks every set done: untouched sets copy the set you adjusted, otherwise last session's numbers.
function fillAndCompleteSets(exercise) {
  const source = [...exercise.sets].reverse().find((set) => set.edited);
  const previous = previousExercise({ id: exercise.exerciseId, name: exercise.name });
  exercise.sets.forEach((set, index) => {
    if (!set.complete && !set.edited) {
      const fill = source || previous?.sets?.[index] || previous?.sets?.at(-1);
      if (fill) { set.weight = fill.weight; set.reps = fill.reps; }
    }
    set.complete = true;
  });
  return { source, previous };
}
function completeAllSets(exerciseIndex) {
  const { source, previous } = fillAndCompleteSets(state.activeWorkout.exercises[exerciseIndex]);
  state.activeWorkout.restEndsAt = null; clearInterval(restInterval); restInterval = null;
  save(); render();
  toast(source ? `All sets done · ${escapeHtml(source.weight === "" ? "—" : source.weight)} ${state.units} × ${escapeHtml(source.reps)}` : previous ? "All sets done with last session's numbers." : "All sets done.");
}
function editValue(element) {
  const { type, exerciseIndex, setIndex, unit } = element.dataset;
  const set = state.activeWorkout.exercises[Number(exerciseIndex)].sets[Number(setIndex)];
  const input = document.createElement("input"); input.type = "number"; input.inputMode = "decimal"; input.min = type === "weight" ? "0" : "1"; input.step = type === "weight" ? String(state.weightStep) : "1"; input.value = set[type] ?? ""; input.setAttribute("aria-label", type === "weight" ? `Weight in ${unit}` : "Reps");
  element.replaceChildren(input); input.focus(); input.select();
  const commit = () => { const value = input.value === "" ? "" : Math.max(type === "weight" ? 0 : 1, Number(input.value) || 0); if (value !== set[type]) set.edited = true; set[type] = value; save(); render(); };
  input.addEventListener("blur", commit, { once: true }); input.addEventListener("keydown", (event) => { if (event.key === "Enter") input.blur(); if (event.key === "Escape") render(); });
}
function deleteSet(exerciseIndex, setIndex) {
  const sets = state.activeWorkout.exercises[exerciseIndex]?.sets;
  if (!sets || sets.length < 2 || !sets[setIndex]) return;
  sets.splice(setIndex, 1);
  save(); render(); toast(`Set ${setIndex + 1} removed.`);
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
    if (select.dataset.change === "toggle-wellbeing") { wellbeing().enabled = select.value === "on"; toast(select.value === "on" ? "Wellbeing tracking is on. Check in from Home." : "Wellbeing tracking is off. Your past logs are kept."); }
    if (select.dataset.change === "toggle-readiness") { state.readinessSuggestions = select.value === "on"; toast(select.value === "on" ? "Readiness suggestions are on. Honna will only suggest; you decide." : "Readiness suggestions are off."); }
    if (select.dataset.change === "toggle-cycle") {
      if (select.value === "on") { if (sortedPeriodStarts().length) { menstrual().enabled = true; menstrual().asked = true; } else { save(); render(); showCycleSetup(); return; } }
      else { menstrual().enabled = false; toast("Cycle tracking is off. Your logged data is kept."); }
    }
    if (select.dataset.change === "rest-alerts") { if (select.value === "on") { enableRestAlerts().then((on) => { if (on) toast("Rest alerts are on."); render(); }); return; } state.restAlerts = "off"; clearRestNotifications(); }
    if (select.dataset.change === "sex") { const wasOn = state.menstrual?.enabled; setSex(select.value); if (wasOn && !state.menstrual.enabled) toast("Cycle-aware training is off. Your logged data is kept."); }
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
  else if (action === "onboarding-next") showSexOnboarding("plans");
  else if (action === "choose-sex") {
    setSex(button.dataset.sex);
    const nameInput = document.querySelector("#onboarding-name");
    if (!state.onboarded && nameInput) state.name = nameInput.value.trim(); // empty is fine: the greeting then has no name
    if (!state.onboarded) {
      state.program = recommendedPlan(button.dataset.sex); // the starter plan matches; an import or own plan replaces it later
      if (onboardingAfterSex === "sample") showUnitsOnboarding(); else showPlanChoice();
    } else { save(); render(); toast("Thanks. You can change this anytime in Profile."); }
  }
  else if (action === "use-recommended-plan") { if (!state.program.days.length) { state.program = recommendedPlan(); state.todayWorkoutOverride = null; save(); document.querySelector(".overlay")?.remove(); render(); toast(`${escapeHtml(state.program.name)} is ready.`); } }
  else if (action === "onboarding-back") renderOnboarding();
  else if (action === "use-sample") { if (userSex()) showUnitsOnboarding(); else showSexOnboarding("sample"); }
  else if (action === "set-units-onboarding") { state.units = button.dataset.units; state.weightStep = state.units === "kg" ? 2.5 : 5; render(); showUnitsOnboarding(); }
  else if (action === "complete-onboarding") { if (cycleAvailable()) showCycleOnboarding(); else finishOnboarding(); }
  else if (action === "create-program") { document.querySelector(".overlay")?.remove(); if (!state.onboarded) state.program = { name: "My Program", repeatWeekly: false, days: [] }; state.onboarded = true; state.activeTab = "Plan"; save(); render(); showDayEditor(); }
  else if (action === "start-workout") {
    const start = { workoutId: button.dataset.workoutId, scheduledWorkoutId: button.dataset.scheduledWorkoutId || button.dataset.workoutId };
    const current = state.activeWorkout;
    if (current && current.workoutId === start.workoutId) resumeWorkout();
    else if (current) showSheet(`${current.name} is still in progress`, "Resume it, or discard it and start the new session.", "", `<button class="secondary-button" data-action="discard-and-start" data-workout-id="${start.workoutId}" data-scheduled-workout-id="${start.scheduledWorkoutId}">Discard &amp; start new</button><button class="primary-button" data-action="resume-workout">RESUME</button>`);
    else beginStartFlow(start);
  }
  else if (action === "cycle-setup") showCycleSetup();
  else if (action === "save-cycle-setup") saveCycleSetup();
  else if (action === "cycle-decline") { menstrual().asked = true; save(); render(); toast("No problem. You can turn it on anytime in Profile."); }
  else if (action === "cycle-disable") { menstrual().enabled = false; save(); render(); toast("Cycle-aware training is off. Your logged data is kept."); }
  else if (action === "log-period") showLogPeriod();
  else if (action === "save-period") { const value = document.querySelector("#period-start")?.value; if (!value || value > todayKey()) return; addPeriodStart(value); save(); document.querySelector(".overlay")?.remove(); render(); toast("Period logged."); }
  else if (action === "cycle-details") showCycleDetails();
  else if (action === "wb-set") { setWellbeingValue(button.dataset.field, Number(button.dataset.value)); save(); if (button.dataset.context === "sheet") showPreWorkoutCheckIn(pendingWorkoutStart); else render(); }
  else if (action === "wb-symptom") {
    const log = wellbeing().logs[todayKey()] ||= {};
    const symptoms = new Set(log.symptoms || []);
    if (symptoms.has(button.dataset.symptom)) symptoms.delete(button.dataset.symptom); else symptoms.add(button.dataset.symptom);
    log.symptoms = [...symptoms]; save();
    if (button.dataset.context === "sheet") showPreWorkoutCheckIn(pendingWorkoutStart); else render();
  }
  else if (action === "wb-symptoms-open") { wellbeingSymptomsOpen = true; if (button.dataset.context === "sheet") showPreWorkoutCheckIn(pendingWorkoutStart); else render(); }
  else if (action === "wb-edit") { wellbeingEditing = true; render(); }
  else if (action === "wb-skip") { wellbeing().skipped = todayKey(); wellbeingEditing = false; save(); render(); }
  else if (action === "prestart-skip" && pendingWorkoutStart) { wellbeing().skipped = todayKey(); save(); showReadinessSuggestion(pendingWorkoutStart); }
  else if (action === "prestart-continue" && pendingWorkoutStart) showReadinessSuggestion(pendingWorkoutStart);
  else if (action === "adapt-choice") beginCheckedWorkout(button.dataset.choice);
  else if (action === "cycle-onboarding-yes") { finishOnboarding(); showCycleSetup(); }
  else if (action === "cycle-onboarding-no") { menstrual().asked = true; finishOnboarding(); }
  else if (action === "change-today-workout") showWorkoutDayPicker(button.dataset.scheduledDayId);
  else if (action === "choose-today-workout") chooseTodayWorkout(button.dataset.scheduledDayId, button.dataset.workoutId);
  else if (action === "picker-week") showWorkoutDayPicker(button.dataset.scheduledDayId, Number(button.dataset.week));
  else if (action === "edit-program") showProgramEditor();
  else if (action === "save-program") { const value = document.querySelector("#program-name")?.value.trim(); if (value) state.program.name = value; save(); document.querySelector(".overlay")?.remove(); render(); }
  else if (action === "add-day") showDayEditor();
  else if (action === "new-plan") confirmNewPlan();
  else if (action === "delete-day") confirmDeleteDay(button.dataset.dayId);
  else if (action === "confirm-delete-day") deleteDay(button.dataset.dayId);
  else if (action === "confirm-new-plan") startNewPlan();
  else if (action === "new-plan-manual") showDayEditor();
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
  else if (action === "save-exercise") {
    const name = document.querySelector("#exercise-name").value.trim(); if (!name) { document.querySelector("#exercise-name").focus(); return; }
    const day = state.program.days.find((item) => item.id === document.querySelector("#exercise-day").value); if (!day) return;
    const fields = { name, sets: Number(document.querySelector("#exercise-sets").value) || 3, reps: Number(document.querySelector("#exercise-reps").value) || "", rest: Number(document.querySelector("#exercise-rest").value) || "", effort: document.querySelector("#exercise-effort").value.trim(), notes: document.querySelector("#exercise-notes").value.trim() };
    const existing = day.exercises.find((item) => item.id === document.querySelector("#exercise-id")?.value);
    if (existing) Object.assign(existing, fields); // same id, so this exercise's history and last numbers still link up
    else day.exercises.push({ id: uid(), ...fields, equipment: "other" });
    save(); document.querySelector(".overlay")?.remove(); render(); if (existing) toast("Exercise updated.");
  }
  else if (action === "edit-plan-exercise") showExerciseEditor(button.dataset.dayId, button.dataset.exerciseId);
  else if (action === "edit-day") showDayEditSheet(button.dataset.dayId);
  else if (action === "preview-exercise") showExercisePreview(button.dataset.dayId, button.dataset.exerciseId);
  else if (action === "save-day-edit") saveDayEdit();
  else if (action === "import-pdf") { document.querySelector(".overlay")?.remove(); openPdfPicker(); }
  else if (action === "save-import") saveImportedPlan();
  else if (action === "save-import-once") commitImportedPlan(false);
  else if (action === "save-import-weekly") commitImportedPlan(true);
  else if (action === "parse-pasted") parsePastedText();
  else if (action === "exit-workout") pauseWorkout();
  else if (action === "resume-workout") resumeWorkout();
  else if (action === "rest-alerts-yes") enableRestAlerts().then((on) => { if (on) toast("Rest alerts are on."); render(); });
  else if (action === "rest-alerts-no") { state.restAlerts = "off"; save(); render(); toast("Okay. You can turn rest alerts on in Profile."); }
  else if (action === "discard-workout") showSheet("Discard this workout?", "Everything you logged in this session will be lost. Your plan stays as it is.", "", `<button class="secondary-button" data-action="close-sheet">Keep it</button><button class="danger-button" data-action="confirm-discard-workout">DISCARD</button>`);
  else if (action === "confirm-discard-workout") discardWorkout();
  else if (action === "discard-and-start") { const start = { workoutId: button.dataset.workoutId, scheduledWorkoutId: button.dataset.scheduledWorkoutId }; discardWorkout(); beginStartFlow(start); }
  else if (action === "finish-workout") finishWorkout();
  else if (action === "adjust-value") changeValue(button, Number(button.dataset.dir));
  else if (action === "edit-value") editValue(button);
  else if (action === "complete-set") completeSet(Number(button.dataset.exerciseIndex), Number(button.dataset.setIndex));
  else if (action === "add-set") addSet(Number(button.dataset.exerciseIndex));
  else if (action === "reopen-workout") { if (button.closest(".undo-card")) reopenWorkout(button.dataset.historyId, true); else confirmReopen(button.dataset.historyId, button.dataset.resume === "1"); }
  else if (action === "reopen-day") { const entry = completionEntry(state.program.days.find((day) => day.id === button.dataset.dayId) || {}); if (entry) confirmReopen(entry.id, true); }
  else if (action === "reopen-session-picker") {
    const multiWeek = Number(state.program.cycleWeeks) > 1;
    const week = multiWeek ? Math.min(Number(state.program.activeCycleWeek) || 1, Number(state.program.cycleWeeks)) : 1;
    const first = (multiWeek ? state.program.days.filter((day) => (Number(day.programWeek) || 1) === week) : activeCycleDays())[0];
    if (first) showWorkoutDayPicker(first.id, week);
  }
  else if (action === "confirm-reopen") reopenWorkout(button.dataset.historyId, button.dataset.resume === "1");
  else if (action === "add-active-exercise") showAddActiveExercise();
  else if (action === "save-active-exercise") saveActiveExercise();
  else if (action === "delete-set") deleteSet(Number(button.dataset.exerciseIndex), Number(button.dataset.setIndex));
  else if (action === "complete-all-sets") completeAllSets(Number(button.dataset.exerciseIndex));
  else if (action === "skip-rest") { state.activeWorkout.restEndsAt = null; clearInterval(restInterval); save(); render(); }
  else if (action === "add-rest") { state.activeWorkout.restEndsAt += 30000; save(); render(); }
  else if (action === "exercise-note") showNoteEditor(Number(button.dataset.exerciseIndex));
  else if (action === "save-note") { state.activeWorkout.exercises[Number(button.dataset.exerciseIndex)].notes = document.querySelector("#workout-note").value.trim(); save(); document.querySelector(".overlay")?.remove(); render(); }
  else if (action === "set-theme") { state.theme = button.dataset.themeId; save(); render(); }
  else if (action === "edit-name") showNameEditor();
  else if (action === "save-name") { state.name = document.querySelector("#user-name").value.trim(); save(); document.querySelector(".overlay")?.remove(); render(); }
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
// Freeze the page behind any open sheet (works on iOS too) and restore the scroll position on close.
let lockedScrollY = null;
new MutationObserver(() => {
  const open = Boolean(document.querySelector(".overlay"));
  if (open && lockedScrollY === null) {
    lockedScrollY = window.scrollY;
    Object.assign(document.body.style, { position: "fixed", top: `-${lockedScrollY}px`, left: "0", right: "0" });
  } else if (!open && lockedScrollY !== null) {
    const y = lockedScrollY;
    lockedScrollY = null;
    Object.assign(document.body.style, { position: "", top: "", left: "", right: "" });
    window.scrollTo(0, y);
  }
  syncBackHistory();
}).observe(document.body, { childList: true });
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  if (state.activeTab === "Profile" && !workoutOpen()) render();
});
window.addEventListener("appinstalled", () => { installPrompt = null; if (state.activeTab === "Profile") render(); });
// Updates: check for a new version when the app opens or comes back to the front, and switch to it as soon as
// nothing is in the middle of being edited (saved data is kept; a workout in progress resumes where it was).
if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let updateWaiting = false;
  const applyUpdate = () => { if (updateWaiting && !document.querySelector(".overlay")) location.reload(); };
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((registration) => {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") registration.update().catch(() => { }); });
  }).catch(() => { });
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!hadController) return; updateWaiting = true; applyUpdate(); });
  new MutationObserver(applyUpdate).observe(document.body, { childList: true });
}
initializeState();