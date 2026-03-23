const BASE = import.meta.env.VITE_API_URL || "http://localhost:8081/api";

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const register = (username, email, password) =>
  req("POST", "/auth/register", { username, email, password });

export const login = (email, password) =>
  req("POST", "/auth/login", { email, password });

export const forgotPassword = (email) =>
  req("POST", "/auth/forgot-password", { email });

export const resetPassword = (token, newPassword) =>
  req("POST", "/auth/reset-password", { token, new_password: newPassword });

export const getUser = (userID) =>
  req("GET", `/users/${userID}`);

export const getUserFriends = (userID) =>
  req("GET", `/users/${userID}/friends`);

export const searchUsers = (query, viewerID) =>
  req("GET", `/users/search?q=${encodeURIComponent(query)}&viewer_id=${encodeURIComponent(viewerID)}`);

// ─── Achievements ─────────────────────────────────────────────────────────────

export const getAllAchievements = () =>
  req("GET", "/achievements");

export const getUserAchievements = (userID) =>
  req("GET", `/users/${userID}/achievements`);

export const unlockAchievement = (userID, achievementID) =>
  req("POST", `/users/${userID}/achievements/${achievementID}`);

export const removeAchievement = (userID, achievementID) =>
  req("DELETE", `/users/${userID}/achievements/${achievementID}`);

// ─── Daily Goals ─────────────────────────────────────────────────────────────

export const getDailyGoals = (userID) =>
  req("GET", `/users/${userID}/daily-goals`);

export const completeGoal = (userID, goalIndex, templateID, xpReward) =>
  req("POST", `/users/${userID}/daily-goals/${goalIndex}`, { template_id: templateID, xp_reward: xpReward });

export const uncompleteGoal = (userID, goalIndex) =>
  req("DELETE", `/users/${userID}/daily-goals/${goalIndex}`);

// ─── Partnerships ─────────────────────────────────────────────────────────────

export const createPartnership = (userID, partnerID) =>
  req("POST", `/users/${userID}/partnerships`, { partner_id: partnerID });

export const getUserPartnerships = (userID) =>
  req("GET", `/users/${userID}/partnerships`);

export const respondPartnership = (userID, partnershipID, accept) =>
  req("PATCH", `/users/${userID}/partnerships/${partnershipID}`, { accept });

export const cancelPartnership = (userID, partnershipID) =>
  req("DELETE", `/users/${userID}/partnerships/${partnershipID}`);

export const partnershipCheckin = (userID, partnershipID) =>
  req("POST", `/users/${userID}/partnerships/${partnershipID}/checkin`);

export const savePartner = (userID, partnershipID) =>
  req("POST", `/users/${userID}/partnerships/${partnershipID}/save`);

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export const getLeaderboard = ({ sort = "xp", period = "all" } = {}) =>
  req("GET", `/leaderboard?sort=${sort}&period=${period}`);

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

export const createPomodoro = (userID, sessionType = "work", durationMinutes = 25) =>
  req("POST", `/users/${userID}/pomodoro`, {
    session_type: sessionType,
    duration_minutes: durationMinutes,
  });

export const getPomodoroToday = (userID) =>
  req("GET", `/users/${userID}/pomodoro/today`);

// ─── Progress ────────────────────────────────────────────────────────────────

export const getProgress = (userID) =>
  req("GET", `/users/${userID}/progress`);

// ─── AI ─────────────────────────────────────────────────────────────────────

export const aiChat = (messages, system, maxTokens = 900) =>
  req("POST", "/ai/chat", { messages, system, max_tokens: maxTokens });
