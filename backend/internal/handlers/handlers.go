package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/darraos/go-quest-backend/internal/repository"
)

type Handler struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Handler {
	return &Handler{repo: repo}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func parseUserID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, "userID"))
}

// ─── Users ───────────────────────────────────────────────────────────────────

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Username == "" || body.Email == "" {
		writeError(w, http.StatusBadRequest, "username and email are required")
		return
	}

	user, err := h.repo.CreateUser(r.Context(), body.Username, body.Email)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	summary, err := h.repo.GetUserSummary(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	if err := h.repo.UpdateStreak(r.Context(), userID); err != nil {
		// non-fatal
		_ = err
	}

	writeJSON(w, http.StatusOK, summary)
}

// ─── Progress ────────────────────────────────────────────────────────────────

func (h *Handler) GetProgress(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	progress, err := h.repo.GetProgress(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "progress not found")
		return
	}
	writeJSON(w, http.StatusOK, progress)
}

// ─── Achievements ─────────────────────────────────────────────────────────────

func (h *Handler) GetAllAchievements(w http.ResponseWriter, r *http.Request) {
	achievements, err := h.repo.GetAllAchievements(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, achievements)
}

func (h *Handler) GetUserAchievements(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	achievements, err := h.repo.GetUserAchievements(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, achievements)
}

func (h *Handler) UnlockAchievement(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	achievementID := chi.URLParam(r, "achievementID")
	if achievementID == "" {
		writeError(w, http.StatusBadRequest, "achievement id is required")
		return
	}

	achievement, err := h.repo.UnlockAchievement(r.Context(), userID, achievementID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, achievement)
}

// ─── Daily Goals ─────────────────────────────────────────────────────────────

func (h *Handler) GetDailyGoals(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	goals, err := h.repo.GetDailyGoals(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if goals == nil {
		goals = []int{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"completed": goals})
}

func (h *Handler) CompleteGoal(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	idx, err := strconv.Atoi(chi.URLParam(r, "goalIndex"))
	if err != nil || idx < 0 || idx > 4 {
		writeError(w, http.StatusBadRequest, "goal_index must be 0-4")
		return
	}

	if err := h.repo.CompleteGoal(r.Context(), userID, idx); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"goal_index": idx, "completed": true})
}

func (h *Handler) UncompleteGoal(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	idx, err := strconv.Atoi(chi.URLParam(r, "goalIndex"))
	if err != nil || idx < 0 || idx > 4 {
		writeError(w, http.StatusBadRequest, "goal_index must be 0-4")
		return
	}

	if err := h.repo.UncompleteGoal(r.Context(), userID, idx); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"goal_index": idx, "completed": false})
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

func (h *Handler) CreatePomodoro(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var body struct {
		StartedAt       time.Time `json:"started_at"`
		CompletedAt     time.Time `json:"completed_at"`
		DurationMinutes int       `json:"duration_minutes"`
		SessionType     string    `json:"session_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.SessionType == "" {
		body.SessionType = "work"
	}
	if body.DurationMinutes == 0 {
		body.DurationMinutes = 25
	}
	if body.StartedAt.IsZero() {
		body.StartedAt = time.Now().Add(-time.Duration(body.DurationMinutes) * time.Minute)
	}
	if body.CompletedAt.IsZero() {
		body.CompletedAt = time.Now()
	}

	session, err := h.repo.CreatePomodoro(r.Context(), userID, body.StartedAt, body.CompletedAt, body.DurationMinutes, body.SessionType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, session)
}

func (h *Handler) GetPomodoroToday(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	count, err := h.repo.GetPomodoroToday(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sessions_today": count})
}

// ─── XP History ──────────────────────────────────────────────────────────────

func (h *Handler) GetXPHistory(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	history, err := h.repo.GetXPHistory(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, history)
}
