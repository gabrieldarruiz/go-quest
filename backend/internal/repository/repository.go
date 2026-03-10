package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/darraos/go-quest-backend/internal/models"
)

type Repository struct {
	pool *pgxpool.Pool
}

var ErrInvalidResetToken = errors.New("invalid or expired reset token")

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func levelFromXP(totalXP int) int {
	switch {
	case totalXP < 200:
		return 1
	case totalXP < 500:
		return 2
	case totalXP < 900:
		return 3
	case totalXP < 1400:
		return 4
	case totalXP < 2100:
		return 5
	case totalXP < 3000:
		return 6
	case totalXP < 4200:
		return 7
	case totalXP < 5700:
		return 8
	case totalXP < 7500:
		return 9
	default:
		return 10
	}
}

func (r *Repository) recalcUserProgressFromAchievements(ctx context.Context, tx pgx.Tx, userID uuid.UUID) error {
	var totalXP int
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(a.xp_reward), 0)
		FROM user_achievements ua
		JOIN achievements a ON a.id = ua.achievement_id
		WHERE ua.user_id = $1
	`, userID).Scan(&totalXP); err != nil {
		return fmt.Errorf("sum achievements xp: %w", err)
	}

	currentLevel := levelFromXP(totalXP)
	if _, err := tx.Exec(ctx, `
		UPDATE user_progress
		SET total_xp = $2, current_level = $3
		WHERE user_id = $1
	`, userID, totalXP, currentLevel); err != nil {
		return fmt.Errorf("update user progress totals: %w", err)
	}

	return nil
}

// ─── Users ───────────────────────────────────────────────────────────────────

func (r *Repository) CreateUser(ctx context.Context, username, email, password string) (*models.User, error) {
	var u models.User
	err := r.pool.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash)
		VALUES ($1, $2, crypt($3, gen_salt('bf')))
		RETURNING id, username, email, created_at, updated_at
	`, username, email, password).Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	if _, err := r.pool.Exec(ctx, `
		INSERT INTO user_progress (user_id) VALUES ($1)
	`, u.ID); err != nil {
		return nil, fmt.Errorf("create user_progress: %w", err)
	}

	return &u, nil
}

func (r *Repository) GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var u models.User
	err := r.pool.QueryRow(ctx, `
		SELECT id, username, email, created_at, updated_at
		FROM users WHERE id = $1
	`, userID).Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &u, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	err := r.pool.QueryRow(ctx, `
		SELECT id, username, email, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &u, nil
}

func (r *Repository) AuthenticateUser(ctx context.Context, email, password string) (*models.User, error) {
	var u models.User
	err := r.pool.QueryRow(ctx, `
		SELECT id, username, email, created_at, updated_at
		FROM users
		WHERE email = $1
		  AND password_hash = crypt($2, password_hash)
	`, email, password).Scan(&u.ID, &u.Username, &u.Email, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("authenticate user: %w", err)
	}
	return &u, nil
}

func (r *Repository) CreatePasswordResetToken(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE password_reset_tokens
		SET used_at = NOW()
		WHERE user_id = $1 AND used_at IS NULL
	`, userID)
	if err != nil {
		return fmt.Errorf("invalidate previous reset tokens: %w", err)
	}

	_, err = r.pool.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	if err != nil {
		return fmt.Errorf("create password reset token: %w", err)
	}
	return nil
}

func (r *Repository) ResetPasswordByToken(ctx context.Context, tokenHash, newPassword string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var tokenID uuid.UUID
	var userID uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT id, user_id
		FROM password_reset_tokens
		WHERE token_hash = $1
		  AND used_at IS NULL
		  AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE
	`, tokenHash).Scan(&tokenID, &userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInvalidResetToken
		}
		return fmt.Errorf("load reset token: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE users
		SET password_hash = crypt($2, gen_salt('bf'))
		WHERE id = $1
	`, userID, newPassword); err != nil {
		return fmt.Errorf("update user password: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE password_reset_tokens
		SET used_at = NOW()
		WHERE id = $1
	`, tokenID); err != nil {
		return fmt.Errorf("mark reset token as used: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// ─── Progress ────────────────────────────────────────────────────────────────

func (r *Repository) GetProgress(ctx context.Context, userID uuid.UUID) (*models.UserProgress, error) {
	var p models.UserProgress
	err := r.pool.QueryRow(ctx, `
		SELECT id, user_id, total_xp, current_level, streak_days, last_visit_date, updated_at
		FROM user_progress WHERE user_id = $1
	`, userID).Scan(&p.ID, &p.UserID, &p.TotalXP, &p.CurrentLevel, &p.StreakDays, &p.LastVisitDate, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get progress: %w", err)
	}
	return &p, nil
}

func (r *Repository) GetUserSummary(ctx context.Context, userID uuid.UUID) (*models.UserSummary, error) {
	var s models.UserSummary
	err := r.pool.QueryRow(ctx, `
		SELECT u.username, up.total_xp, up.current_level, up.streak_days,
		       COUNT(ua.id) AS achievements_unlocked
		FROM users u
		JOIN user_progress up ON up.user_id = u.id
		LEFT JOIN user_achievements ua ON ua.user_id = u.id
		WHERE u.id = $1
		GROUP BY u.username, up.total_xp, up.current_level, up.streak_days
	`, userID).Scan(&s.Username, &s.TotalXP, &s.CurrentLevel, &s.StreakDays, &s.AchievementsUnlocked)
	if err != nil {
		return nil, fmt.Errorf("get summary: %w", err)
	}
	return &s, nil
}

func (r *Repository) AddXP(ctx context.Context, userID uuid.UUID, xp int, source, sourceID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `
		UPDATE user_progress
		SET total_xp = total_xp + $2,
		    current_level = CASE
		        WHEN total_xp + $2 < 200  THEN 1
		        WHEN total_xp + $2 < 500  THEN 2
		        WHEN total_xp + $2 < 900  THEN 3
		        WHEN total_xp + $2 < 1400 THEN 4
		        WHEN total_xp + $2 < 2100 THEN 5
		        WHEN total_xp + $2 < 3000 THEN 6
		        WHEN total_xp + $2 < 4200 THEN 7
		        WHEN total_xp + $2 < 5700 THEN 8
		        WHEN total_xp + $2 < 7500 THEN 9
		        ELSE 10
		    END
		WHERE user_id = $1
	`, userID, xp)
	if err != nil {
		return fmt.Errorf("update xp: %w", err)
	}

	var sid *string
	if sourceID != "" {
		sid = &sourceID
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO xp_history (user_id, xp_gained, source, source_id)
		VALUES ($1, $2, $3, $4)
	`, userID, xp, source, sid)
	if err != nil {
		return fmt.Errorf("insert xp_history: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *Repository) UpdateStreak(ctx context.Context, userID uuid.UUID) error {
	var lastVisit *time.Time
	err := r.pool.QueryRow(ctx, `SELECT last_visit_date FROM user_progress WHERE user_id = $1`, userID).Scan(&lastVisit)
	if err != nil {
		return err
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	newStreak := 1

	if lastVisit != nil {
		last := lastVisit.UTC().Truncate(24 * time.Hour)
		diff := today.Sub(last)
		switch {
		case diff == 0:
			return nil // already visited today
		case diff == 24*time.Hour:
			var current int
			r.pool.QueryRow(ctx, `SELECT streak_days FROM user_progress WHERE user_id = $1`, userID).Scan(&current)
			newStreak = current + 1
		}
	}

	_, err = r.pool.Exec(ctx, `
		UPDATE user_progress SET streak_days = $2, last_visit_date = $3 WHERE user_id = $1
	`, userID, newStreak, today)
	return err
}

// ─── Achievements ─────────────────────────────────────────────────────────────

func (r *Repository) GetAllAchievements(ctx context.Context) ([]models.Achievement, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, level_required, title, description, xp_reward, category, icon, sort_order
		FROM achievements ORDER BY sort_order, level_required
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByPos[models.Achievement])
}

func (r *Repository) GetUserAchievements(ctx context.Context, userID uuid.UUID) ([]models.UserAchievement, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT ua.id, ua.user_id, ua.achievement_id, ua.unlocked_at,
		       a.id, a.level_required, a.title, a.description, a.xp_reward, a.category, a.icon, a.sort_order
		FROM user_achievements ua
		JOIN achievements a ON a.id = ua.achievement_id
		WHERE ua.user_id = $1
		ORDER BY ua.unlocked_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.UserAchievement
	for rows.Next() {
		var ua models.UserAchievement
		if err := rows.Scan(
			&ua.ID, &ua.UserID, &ua.AchievementID, &ua.UnlockedAt,
			&ua.Achievement.ID, &ua.Achievement.LevelRequired, &ua.Achievement.Title,
			&ua.Achievement.Description, &ua.Achievement.XPReward, &ua.Achievement.Category,
			&ua.Achievement.Icon, &ua.Achievement.SortOrder,
		); err != nil {
			return nil, err
		}
		result = append(result, ua)
	}
	return result, rows.Err()
}

func (r *Repository) UnlockAchievement(ctx context.Context, userID uuid.UUID, achievementID string) (*models.Achievement, error) {
	var a models.Achievement
	err := r.pool.QueryRow(ctx, `
		SELECT id, level_required, title, description, xp_reward, category, icon, sort_order
		FROM achievements WHERE id = $1
	`, achievementID).Scan(&a.ID, &a.LevelRequired, &a.Title, &a.Description, &a.XPReward, &a.Category, &a.Icon, &a.SortOrder)
	if err != nil {
		return nil, fmt.Errorf("achievement not found: %w", err)
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		INSERT INTO user_achievements (user_id, achievement_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, achievement_id) DO NOTHING
	`, userID, achievementID)
	if err != nil {
		return nil, fmt.Errorf("unlock achievement: %w", err)
	}

	if tag.RowsAffected() == 1 {
		var sid *string
		sid = &achievementID
		if _, err := tx.Exec(ctx, `
			INSERT INTO xp_history (user_id, xp_gained, source, source_id)
			VALUES ($1, $2, $3, $4)
		`, userID, a.XPReward, "achievement", sid); err != nil {
			return nil, fmt.Errorf("insert xp_history: %w", err)
		}
	}

	if err := r.recalcUserProgressFromAchievements(ctx, tx, userID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &a, nil
}

func (r *Repository) RemoveAchievement(ctx context.Context, userID uuid.UUID, achievementID string) error {
	var exists int
	err := r.pool.QueryRow(ctx, `
		SELECT 1
		FROM achievements
		WHERE id = $1
	`, achievementID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("achievement not found: %w", err)
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		DELETE FROM user_achievements
		WHERE user_id = $1 AND achievement_id = $2
	`, userID, achievementID)
	if err != nil {
		return fmt.Errorf("remove achievement: %w", err)
	}

	if tag.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx, `
			DELETE FROM xp_history
			WHERE user_id = $1 AND source = 'achievement' AND source_id = $2
		`, userID, achievementID); err != nil {
			return fmt.Errorf("delete achievement xp history: %w", err)
		}
	}

	if err := r.recalcUserProgressFromAchievements(ctx, tx, userID); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

// ─── Daily Goals ─────────────────────────────────────────────────────────────

func (r *Repository) GetDailyGoals(ctx context.Context, userID uuid.UUID) ([]int, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT goal_index FROM daily_goals
		WHERE user_id = $1 AND goal_date = CURRENT_DATE
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var indices []int
	for rows.Next() {
		var idx int
		if err := rows.Scan(&idx); err != nil {
			return nil, err
		}
		indices = append(indices, idx)
	}
	return indices, rows.Err()
}

func (r *Repository) CompleteGoal(ctx context.Context, userID uuid.UUID, goalIndex int) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO daily_goals (user_id, goal_index)
		VALUES ($1, $2)
		ON CONFLICT (user_id, goal_date, goal_index) DO NOTHING
	`, userID, goalIndex)
	return err
}

func (r *Repository) UncompleteGoal(ctx context.Context, userID uuid.UUID, goalIndex int) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM daily_goals
		WHERE user_id = $1 AND goal_index = $2 AND goal_date = CURRENT_DATE
	`, userID, goalIndex)
	return err
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

func (r *Repository) CreatePomodoro(ctx context.Context, userID uuid.UUID, startedAt, completedAt time.Time, durationMinutes int, sessionType string) (*models.PomodoroSession, error) {
	var s models.PomodoroSession
	err := r.pool.QueryRow(ctx, `
		INSERT INTO pomodoro_sessions (user_id, started_at, completed_at, duration_minutes, session_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, started_at, completed_at, duration_minutes, session_type
	`, userID, startedAt, completedAt, durationMinutes, sessionType).Scan(
		&s.ID, &s.UserID, &s.StartedAt, &s.CompletedAt, &s.DurationMinutes, &s.SessionType,
	)
	return &s, err
}

func (r *Repository) GetPomodoroToday(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM pomodoro_sessions
		WHERE user_id = $1 AND started_at::date = CURRENT_DATE AND session_type = 'work'
	`, userID).Scan(&count)
	return count, err
}

// ─── XP History ──────────────────────────────────────────────────────────────

func (r *Repository) GetXPHistory(ctx context.Context, userID uuid.UUID) ([]models.XPHistory, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, xp_gained, source, source_id, created_at
		FROM xp_history WHERE user_id = $1
		ORDER BY created_at DESC LIMIT 100
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByPos[models.XPHistory])
}
