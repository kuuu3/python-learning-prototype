const KEYS = {
  profile: "pythonTutorProfile",
  progress: "pythonTutorProgress",
  attempts: "pythonTutorAttempts",
  session: "pythonTutorSession",
  summaries: "pythonTutorSummaries"
};

const dirtyKeys = new Set();
let storageFlushTimer = null;
let storageStatus = {
  lastFlushAt: null,
  lastFlushMode: null,
  lastFlushKeys: [],
  pendingFlush: false,
  flushCount: 0
};

function loadState() {
  try {
    if (localStorage.getItem("pythonTutorState")) {
      storageIssue = "偵測到舊版學習紀錄格式。";
      return false;
    }
    const profile = JSON.parse(localStorage.getItem(KEYS.profile));
    const progress = JSON.parse(localStorage.getItem(KEYS.progress));
    const attempts = JSON.parse(localStorage.getItem(KEYS.attempts));
    const session = JSON.parse(localStorage.getItem(KEYS.session));
    const summaries = JSON.parse(localStorage.getItem(KEYS.summaries));
    if (!profile && !progress && !attempts && !session && !summaries) {
      return false;
    }
    if (!profile || profile.schemaVersion !== SCHEMA_VERSION || profile.questionBankVersion !== QUESTION_BANK_VERSION) {
      storageIssue = "偵測到版本不相容或必要欄位缺失。";
      return false;
    }
    state = { profile, progress, attempts, session, summaries };
    return true;
  } catch {
    storageIssue = "偵測到學習紀錄 JSON 損毀。";
    return false;
  }
}

function markStateDirty(keys = Object.keys(KEYS)) {
  keys.forEach((key) => dirtyKeys.add(key));
}

function saveState(options = {}) {
  markStateDirty(options.keys);
  flushStateToLocalStorage(options);
}

function flushStateToLocalStorage(options = {}) {
  const { force = false } = options;
  if (storageFlushTimer) {
    clearTimeout(storageFlushTimer);
    storageFlushTimer = null;
  }
  if (!force) {
    storageStatus.pendingFlush = true;
    storageFlushTimer = setTimeout(() => flushStateToLocalStorage({ force: true, mode: "debounced" }), 350);
    return;
  }
  const keysToWrite = dirtyKeys.size ? Array.from(dirtyKeys) : Object.keys(KEYS);
  state.profile.lastActiveAt = new Date().toISOString();
  const writers = {
    profile: () => localStorage.setItem(KEYS.profile, JSON.stringify(state.profile)),
    progress: () => localStorage.setItem(KEYS.progress, JSON.stringify(state.progress)),
    attempts: () => localStorage.setItem(KEYS.attempts, JSON.stringify(state.attempts)),
    session: () => localStorage.setItem(KEYS.session, JSON.stringify(state.session)),
    summaries: () => localStorage.setItem(KEYS.summaries, JSON.stringify(state.summaries))
  };
  keysToWrite.forEach((key) => writers[key]?.());
  dirtyKeys.clear();
  storageStatus = {
    lastFlushAt: new Date().toISOString(),
    lastFlushMode: options.mode || "force",
    lastFlushKeys: keysToWrite,
    pendingFlush: false,
    flushCount: storageStatus.flushCount + 1
  };
}
