package handlers

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/darraos/go-quest-backend/internal/models"
	"github.com/darraos/go-quest-backend/internal/repository"
)

type Handler struct {
	repo            *repository.Repository
	resendAPIKey    string
	resendFromEmail string
	appBaseURL      string
	openAIAPIKey    string
	openAIModel     string
}

func New(repo *repository.Repository, resendAPIKey, resendFromEmail, appBaseURL, openAIAPIKey, openAIModel string) *Handler {
	if appBaseURL == "" {
		appBaseURL = "http://localhost:5173"
	}
	if openAIModel == "" {
		openAIModel = "gpt-4o-mini"
	}
	return &Handler{
		repo:            repo,
		resendAPIKey:    resendAPIKey,
		resendFromEmail: resendFromEmail,
		appBaseURL:      strings.TrimRight(appBaseURL, "/"),
		openAIAPIKey:    openAIAPIKey,
		openAIModel:     openAIModel,
	}
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

func secureToken(size int) (string, error) {
	b := make([]byte, size)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (h *Handler) sendPasswordResetEmail(toEmail, resetURL string) error {
	if h.resendAPIKey == "" || h.resendFromEmail == "" {
		return fmt.Errorf("resend is not configured (RESEND_API_KEY or RESEND_FROM_EMAIL missing)")
	}

	body := map[string]any{
		"from":    h.resendFromEmail,
		"to":      []string{toEmail},
		"subject": "Recuperacao de senha - GO_QUEST",
		"html": fmt.Sprintf(
			`<p>Recebemos um pedido para redefinir sua senha no GO_QUEST.</p><p><a href="%s">Clique aqui para redefinir sua senha</a></p><p>Este link expira em 30 minutos.</p>`,
			resetURL,
		),
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+h.resendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("resend returned status %d", resp.StatusCode)
	}
	return nil
}

// ─── Users ───────────────────────────────────────────────────────────────────

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	body.Username = strings.TrimSpace(body.Username)
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Username == "" || body.Email == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "username, email and password are required")
		return
	}
	if len(body.Password) < 6 {
		writeError(w, http.StatusBadRequest, "password must have at least 6 characters")
		return
	}

	user, err := h.repo.CreateUser(r.Context(), body.Username, body.Email, body.Password)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Email == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := h.repo.AuthenticateUser(r.Context(), body.Email, body.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	summary, err := h.repo.GetUserSummary(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load user summary")
		return
	}

	if err := h.repo.UpdateStreak(r.Context(), user.ID); err != nil {
		_ = err
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user_id":               user.ID,
		"username":              summary.Username,
		"total_xp":              summary.TotalXP,
		"current_level":         summary.CurrentLevel,
		"streak_days":           summary.StreakDays,
		"achievements_unlocked": summary.AchievementsUnlocked,
	})
}

func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(body.Email))
	if email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}

	// Always return success-like response to avoid account enumeration.
	const genericMessage = "if the email exists, a reset link has been sent"
	user, err := h.repo.GetUserByEmail(r.Context(), email)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]string{"message": genericMessage})
		return
	}

	token, err := secureToken(32)
	if err != nil {
		log.Printf("failed to generate reset token: %v", err)
		writeJSON(w, http.StatusOK, map[string]string{"message": genericMessage})
		return
	}

	tokenHash := hashToken(token)
	expiresAt := time.Now().Add(30 * time.Minute)
	if err := h.repo.CreatePasswordResetToken(r.Context(), user.ID, tokenHash, expiresAt); err != nil {
		log.Printf("failed to persist reset token for user %s: %v", user.ID, err)
		writeJSON(w, http.StatusOK, map[string]string{"message": genericMessage})
		return
	}

	resetURL := fmt.Sprintf("%s/#/reset-password?token=%s", h.appBaseURL, url.QueryEscape(token))
	if err := h.sendPasswordResetEmail(user.Email, resetURL); err != nil {
		log.Printf("failed to send reset email to %s: %v", user.Email, err)
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": genericMessage})
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	token := strings.TrimSpace(body.Token)
	if token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}
	if len(body.NewPassword) < 6 {
		writeError(w, http.StatusBadRequest, "password must have at least 6 characters")
		return
	}

	if err := h.repo.ResetPasswordByToken(r.Context(), hashToken(token), body.NewPassword); err != nil {
		if err == repository.ErrInvalidResetToken {
			writeError(w, http.StatusBadRequest, "invalid or expired token")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to reset password")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated successfully"})
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

func (h *Handler) RemoveAchievement(w http.ResponseWriter, r *http.Request) {
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

	if err := h.repo.RemoveAchievement(r.Context(), userID, achievementID); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"achievement_id": achievementID,
		"completed":      false,
	})
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
	writeJSON(w, http.StatusOK, map[string]any{"goals": goals})
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

	var body struct {
		TemplateID int `json:"template_id"`
		XPReward   int `json:"xp_reward"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	if err := h.repo.CompleteGoal(r.Context(), userID, idx, body.TemplateID, body.XPReward); err != nil {
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

// ─── Partnerships ─────────────────────────────────────────────────────────────

func (h *Handler) CreatePartnership(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var body struct {
		PartnerID string `json:"partner_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	partnerID, err := uuid.Parse(body.PartnerID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid partner_id")
		return
	}
	if partnerID == userID {
		writeError(w, http.StatusBadRequest, "cannot partner with yourself")
		return
	}

	p, err := h.repo.CreatePartnership(r.Context(), userID, partnerID)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

func (h *Handler) GetUserPartnerships(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	partnerships, err := h.repo.GetUserPartnerships(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if partnerships == nil {
		partnerships = []models.Partnership{}
	}
	writeJSON(w, http.StatusOK, partnerships)
}

func (h *Handler) GetPartnership(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	partnershipID, err := uuid.Parse(chi.URLParam(r, "partnershipID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid partnership id")
		return
	}

	p, err := h.repo.GetPartnership(r.Context(), partnershipID, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) RespondPartnership(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	partnershipID, err := uuid.Parse(chi.URLParam(r, "partnershipID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid partnership id")
		return
	}

	var body struct {
		Accept bool `json:"accept"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	p, err := h.repo.RespondPartnership(r.Context(), partnershipID, userID, body.Accept)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) CancelPartnership(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	partnershipID, err := uuid.Parse(chi.URLParam(r, "partnershipID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid partnership id")
		return
	}

	if err := h.repo.CancelPartnership(r.Context(), partnershipID, userID); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"cancelled": true})
}

func (h *Handler) PartnershipCheckin(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	partnershipID, err := uuid.Parse(chi.URLParam(r, "partnershipID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid partnership id")
		return
	}

	p, err := h.repo.PartnershipCheckin(r.Context(), partnershipID, userID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (h *Handler) SavePartner(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	partnershipID, err := uuid.Parse(chi.URLParam(r, "partnershipID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid partnership id")
		return
	}

	p, err := h.repo.SavePartner(r.Context(), partnershipID, userID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, p)
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

func (h *Handler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	sortBy := r.URL.Query().Get("sort")
	if sortBy == "" {
		sortBy = "xp"
	}

	entries, err := h.repo.GetLeaderboard(r.Context(), sortBy)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if entries == nil {
		entries = []models.LeaderboardEntry{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"leaderboard": entries})
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
