const FAST_RESPONSE_MS = 2500;

let questionStartedAt = Date.now();
let questionTiming = createQuestionTiming();

function createQuestionTiming() {
  const now = Date.now();
  return {
    startedAt: now,
    pausedAt: null,
    pausedMs: 0,
    fastConfirmed: false
  };
}

function resetQuestionTiming() {
  questionTiming = createQuestionTiming();
  questionStartedAt = questionTiming.startedAt;
}

function pauseQuestionTiming() {
  if (!questionTiming || questionTiming.pausedAt) return;
  questionTiming.pausedAt = Date.now();
  state.session.metrics.tabSwitchCount = (state.session.metrics.tabSwitchCount || 0) + 1;
}

function resumeQuestionTiming() {
  if (!questionTiming?.pausedAt) return;
  const pausedFor = Date.now() - questionTiming.pausedAt;
  questionTiming.pausedMs += pausedFor;
  questionTiming.pausedAt = null;
  state.session.metrics.inactiveTimeMs = (state.session.metrics.inactiveTimeMs || 0) + pausedFor;
}

function getQuestionTimingSnapshot() {
  const now = Date.now();
  const currentPauseMs = questionTiming.pausedAt ? now - questionTiming.pausedAt : 0;
  const rawMs = now - questionTiming.startedAt;
  const inactiveMs = questionTiming.pausedMs + currentPauseMs;
  const effectiveMs = Math.max(0, rawMs - inactiveMs);
  return { rawMs, inactiveMs, effectiveMs };
}
