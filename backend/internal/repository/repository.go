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

// GetDailyGoals returns the 5 goal templates assigned to the user today,
// each with their completion status. Selection is deterministic via a seed
// derived from userID + current date, so the same user always sees the same
// 5 goals within a day but different goals on different days.
func (r *Repository) GetDailyGoals(ctx context.Context, userID uuid.UUID) ([]models.DailyGoalFull, error) {
	// 1. Get user level
	var level int
	if err := r.pool.QueryRow(ctx, `
		SELECT current_level FROM user_progress WHERE user_id = $1
	`, userID).Scan(&level); err != nil {
		return nil, fmt.Errorf("get user level: %w", err)
	}

	// 2. Fetch eligible templates for this level
	rows, err := r.pool.Query(ctx, `
		SELECT id, title, description, category, min_level, max_level, xp_reward, difficulty
		FROM goal_templates
		WHERE min_level <= $1 AND max_level >= $1
		ORDER BY id
	`, level)
	if err != nil {
		return nil, fmt.Errorf("fetch goal templates: %w", err)
	}
	defer rows.Close()

	var templates []models.GoalTemplate
	for rows.Next() {
		var t models.GoalTemplate
		if err := rows.Scan(&t.ID, &t.Title, &t.Desc, &t.Category, &t.MinLevel, &t.MaxLevel, &t.XPReward, &t.Difficulty); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(templates) == 0 {
		return []models.DailyGoalFull{}, nil
	}

	// 3. Deterministic selection: seed = hash(userID bytes + yyyymmdd)
	today := time.Now().UTC().Format("20060102")
	seedInput := userID.String() + today
	h := fnv32(seedInput)

	count := 5
	if len(templates) < count {
		count = len(templates)
	}

	// Fisher-Yates with seeded LCG to pick `count` distinct indices
	selected := pickN(templates, count, h)

	// 4. Fetch which indices are completed today
	compRows, err := r.pool.Query(ctx, `
		SELECT goal_index, template_id, completed_at
		FROM daily_goals
		WHERE user_id = $1 AND goal_date = CURRENT_DATE
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch completions: %w", err)
	}
	defer compRows.Close()

	type completionInfo struct {
		templateID  *int
		completedAt time.Time
	}
	completions := make(map[int]completionInfo)
	for compRows.Next() {
		var idx int
		var tmplID *int
		var completedAt time.Time
		if err := compRows.Scan(&idx, &tmplID, &completedAt); err != nil {
			return nil, err
		}
		completions[idx] = completionInfo{tmplID, completedAt}
	}
	if err := compRows.Err(); err != nil {
		return nil, err
	}

	// 5. Build response
	result := make([]models.DailyGoalFull, count)
	for i, tmpl := range selected {
		info, done := completions[i]
		g := models.DailyGoalFull{
			GoalIndex: i,
			Completed: done,
			Template:  tmpl,
		}
		if done {
			g.CompletedAt = &info.completedAt
		}
		result[i] = g
	}
	return result, nil
}

func fnv32(s string) uint32 {
	var h uint32 = 2166136261
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 16777619
	}
	return h
}

// pickN selects n distinct templates from the slice using a seeded shuffle.
func pickN(templates []models.GoalTemplate, n int, seed uint32) []models.GoalTemplate {
	indices := make([]int, len(templates))
	for i := range indices {
		indices[i] = i
	}
	lcg := seed
	for i := len(indices) - 1; i > 0; i-- {
		lcg = lcg*1664525 + 1013904223
		j := int(lcg>>16) % (i + 1)
		indices[i], indices[j] = indices[j], indices[i]
	}
	out := make([]models.GoalTemplate, n)
	for i := 0; i < n; i++ {
		out[i] = templates[indices[i]]
	}
	return out
}

func (r *Repository) CompleteGoal(ctx context.Context, userID uuid.UUID, goalIndex int, templateID int, xpReward int) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		INSERT INTO daily_goals (user_id, goal_index, template_id, xp_reward)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, goal_date, goal_index) DO NOTHING
	`, userID, goalIndex, templateID, xpReward)
	if err != nil {
		return fmt.Errorf("complete goal: %w", err)
	}

	if tag.RowsAffected() == 1 && xpReward > 0 {
		sourceID := fmt.Sprintf("daily_goal_%d_%s", goalIndex, time.Now().UTC().Format("20060102"))
		if _, err := tx.Exec(ctx, `
			INSERT INTO xp_history (user_id, xp_gained, source, source_id)
			VALUES ($1, $2, 'daily_goal', $3)
		`, userID, xpReward, sourceID); err != nil {
			return fmt.Errorf("insert xp_history: %w", err)
		}

		if _, err := tx.Exec(ctx, `
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
		`, userID, xpReward); err != nil {
			return fmt.Errorf("update xp: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) UncompleteGoal(ctx context.Context, userID uuid.UUID, goalIndex int) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var xpReward int
	var goalDate time.Time
	err = tx.QueryRow(ctx, `
		DELETE FROM daily_goals
		WHERE user_id = $1 AND goal_index = $2 AND goal_date = CURRENT_DATE
		RETURNING xp_reward, goal_date
	`, userID, goalIndex).Scan(&xpReward, &goalDate)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return tx.Commit(ctx) // already not completed
		}
		return fmt.Errorf("uncomplete goal: %w", err)
	}

	if xpReward > 0 {
		sourceID := fmt.Sprintf("daily_goal_%d_%s", goalIndex, goalDate.UTC().Format("20060102"))
		if _, err := tx.Exec(ctx, `
			DELETE FROM xp_history
			WHERE user_id = $1 AND source = 'daily_goal' AND source_id = $2
		`, userID, sourceID); err != nil {
			return fmt.Errorf("delete xp_history: %w", err)
		}
		if _, err := tx.Exec(ctx, `
			UPDATE user_progress
			SET total_xp = GREATEST(0, total_xp - $2),
			    current_level = CASE
			        WHEN GREATEST(0, total_xp - $2) < 200  THEN 1
			        WHEN GREATEST(0, total_xp - $2) < 500  THEN 2
			        WHEN GREATEST(0, total_xp - $2) < 900  THEN 3
			        WHEN GREATEST(0, total_xp - $2) < 1400 THEN 4
			        WHEN GREATEST(0, total_xp - $2) < 2100 THEN 5
			        WHEN GREATEST(0, total_xp - $2) < 3000 THEN 6
			        WHEN GREATEST(0, total_xp - $2) < 4200 THEN 7
			        WHEN GREATEST(0, total_xp - $2) < 5700 THEN 8
			        WHEN GREATEST(0, total_xp - $2) < 7500 THEN 9
			        ELSE 10
			    END
			WHERE user_id = $1
		`, userID, xpReward); err != nil {
			return fmt.Errorf("revert xp: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// ─── Partnerships ─────────────────────────────────────────────────────────────

var ErrPartnershipNotFound = errors.New("partnership not found")
var ErrPartnershipNotActive = errors.New("partnership is not active")
var ErrAlreadyPartnered = errors.New("partnership already exists between these users")
var ErrNoSavesRemaining = errors.New("no saves remaining this week")

func (r *Repository) CreatePartnership(ctx context.Context, requesterID, partnerID uuid.UUID) (*models.Partnership, error) {
	var p models.Partnership
	err := r.pool.QueryRow(ctx, `
		INSERT INTO streak_partnerships (requester_id, partner_id)
		VALUES ($1, $2)
		RETURNING id, requester_id, partner_id, status, streak_days, last_both_date, saves_remaining, saves_reset_date, created_at
	`, requesterID, partnerID).Scan(
		&p.ID, &p.RequesterID, &p.PartnerID, &p.Status, &p.StreakDays,
		&p.LastBothDate, &p.SavesRemaining, &p.SavesResetDate, &p.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create partnership: %w", err)
	}
	if err := r.enrichPartnership(ctx, &p, requesterID); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetPartnership(ctx context.Context, partnershipID, callerID uuid.UUID) (*models.Partnership, error) {
	var p models.Partnership
	err := r.pool.QueryRow(ctx, `
		SELECT id, requester_id, partner_id, status, streak_days, last_both_date, saves_remaining, saves_reset_date, created_at
		FROM streak_partnerships
		WHERE id = $1 AND (requester_id = $2 OR partner_id = $2)
	`, partnershipID, callerID).Scan(
		&p.ID, &p.RequesterID, &p.PartnerID, &p.Status, &p.StreakDays,
		&p.LastBothDate, &p.SavesRemaining, &p.SavesResetDate, &p.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPartnershipNotFound
		}
		return nil, fmt.Errorf("get partnership: %w", err)
	}
	if err := r.enrichPartnership(ctx, &p, callerID); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetUserPartnerships(ctx context.Context, userID uuid.UUID) ([]models.Partnership, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, requester_id, partner_id, status, streak_days, last_both_date, saves_remaining, saves_reset_date, created_at
		FROM streak_partnerships
		WHERE (requester_id = $1 OR partner_id = $1)
		  AND status IN ('pending', 'active')
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list partnerships: %w", err)
	}
	defer rows.Close()

	var result []models.Partnership
	for rows.Next() {
		var p models.Partnership
		if err := rows.Scan(
			&p.ID, &p.RequesterID, &p.PartnerID, &p.Status, &p.StreakDays,
			&p.LastBothDate, &p.SavesRemaining, &p.SavesResetDate, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		if err := r.enrichPartnership(ctx, &p, userID); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (r *Repository) RespondPartnership(ctx context.Context, partnershipID, partnerID uuid.UUID, accept bool) (*models.Partnership, error) {
	newStatus := "rejected"
	if accept {
		newStatus = "active"
	}
	var p models.Partnership
	err := r.pool.QueryRow(ctx, `
		UPDATE streak_partnerships
		SET status = $3
		WHERE id = $1 AND partner_id = $2 AND status = 'pending'
		RETURNING id, requester_id, partner_id, status, streak_days, last_both_date, saves_remaining, saves_reset_date, created_at
	`, partnershipID, partnerID, newStatus).Scan(
		&p.ID, &p.RequesterID, &p.PartnerID, &p.Status, &p.StreakDays,
		&p.LastBothDate, &p.SavesRemaining, &p.SavesResetDate, &p.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPartnershipNotFound
		}
		return nil, fmt.Errorf("respond partnership: %w", err)
	}
	if err := r.enrichPartnership(ctx, &p, partnerID); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) CancelPartnership(ctx context.Context, partnershipID, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE streak_partnerships
		SET status = 'cancelled'
		WHERE id = $1 AND (requester_id = $2 OR partner_id = $2)
		  AND status IN ('pending', 'active')
	`, partnershipID, userID)
	if err != nil {
		return fmt.Errorf("cancel partnership: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPartnershipNotFound
	}
	return nil
}

// PartnershipCheckin marks today's activity for the user in the partnership.
// If both partners have checked in today, streak_days is incremented.
// If a day was missed (last_both_date < yesterday), streak resets to 0.
func (r *Repository) PartnershipCheckin(ctx context.Context, partnershipID, userID uuid.UUID) (*models.Partnership, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock and load partnership
	var p models.Partnership
	err = tx.QueryRow(ctx, `
		SELECT id, requester_id, partner_id, status, streak_days, last_both_date, saves_remaining, saves_reset_date, created_at
		FROM streak_partnerships
		WHERE id = $1 AND (requester_id = $2 OR partner_id = $2)
		FOR UPDATE
	`, partnershipID, userID).Scan(
		&p.ID, &p.RequesterID, &p.PartnerID, &p.Status, &p.StreakDays,
		&p.LastBothDate, &p.SavesRemaining, &p.SavesResetDate, &p.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPartnershipNotFound
		}
		return nil, fmt.Errorf("load partnership: %w", err)
	}
	if p.Status != "active" {
		return nil, ErrPartnershipNotActive
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)

	// Insert checkin (idempotent)
	if _, err := tx.Exec(ctx, `
		INSERT INTO partnership_daily (partnership_id, user_id, activity_date)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, partnershipID, userID, today); err != nil {
		return nil, fmt.Errorf("insert checkin: %w", err)
	}

	// Check if partner also checked in today
	var partnerCheckin bool
	partnerID := p.PartnerID
	if userID == p.PartnerID {
		partnerID = p.RequesterID
	}
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM partnership_daily
			WHERE partnership_id = $1 AND user_id = $2 AND activity_date = $3
		)
	`, partnershipID, partnerID, today).Scan(&partnerCheckin); err != nil {
		return nil, fmt.Errorf("check partner checkin: %w", err)
	}

	if partnerCheckin {
		// Both checked in today — check for streak continuity
		newStreak := 1
		if p.LastBothDate != nil {
			yesterday := today.Add(-24 * time.Hour)
			last := p.LastBothDate.UTC().Truncate(24 * time.Hour)
			if last.Equal(yesterday) {
				newStreak = p.StreakDays + 1
			} else if last.Equal(today) {
				// Already counted today
				newStreak = p.StreakDays
			}
		}
		if _, err := tx.Exec(ctx, `
			UPDATE streak_partnerships
			SET streak_days = $2, last_both_date = $3
			WHERE id = $1
		`, partnershipID, newStreak, today); err != nil {
			return nil, fmt.Errorf("update partnership streak: %w", err)
		}
		p.StreakDays = newStreak
		p.LastBothDate = &today
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	if err := r.enrichPartnership(ctx, &p, userID); err != nil {
		return nil, err
	}
	return &p, nil
}

// SavePartner lets the current user "save" the partnership streak when the
// partner missed a day. Limited to saves_remaining (reset weekly).
func (r *Repository) SavePartner(ctx context.Context, partnershipID, userID uuid.UUID) (*models.Partnership, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var p models.Partnership
	err = tx.QueryRow(ctx, `
		SELECT id, requester_id, partner_id, status, streak_days, last_both_date, saves_remaining, saves_reset_date, created_at
		FROM streak_partnerships
		WHERE id = $1 AND (requester_id = $2 OR partner_id = $2)
		FOR UPDATE
	`, partnershipID, userID).Scan(
		&p.ID, &p.RequesterID, &p.PartnerID, &p.Status, &p.StreakDays,
		&p.LastBothDate, &p.SavesRemaining, &p.SavesResetDate, &p.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPartnershipNotFound
		}
		return nil, fmt.Errorf("load partnership: %w", err)
	}
	if p.Status != "active" {
		return nil, ErrPartnershipNotActive
	}

	// Reset saves weekly
	today := time.Now().UTC().Truncate(24 * time.Hour)
	if p.SavesResetDate == nil || today.Sub(p.SavesResetDate.UTC()) >= 7*24*time.Hour {
		p.SavesRemaining = 1
	}

	if p.SavesRemaining <= 0 {
		return nil, ErrNoSavesRemaining
	}

	// Determine partner
	partnerID := p.PartnerID
	if userID == p.PartnerID {
		partnerID = p.RequesterID
	}

	// Insert save as a fake checkin for the partner yesterday
	yesterday := today.Add(-24 * time.Hour)
	if _, err := tx.Exec(ctx, `
		INSERT INTO partnership_daily (partnership_id, user_id, activity_date)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, partnershipID, partnerID, yesterday); err != nil {
		return nil, fmt.Errorf("insert save checkin: %w", err)
	}

	// Also ensure caller has yesterday's checkin (they used the save)
	if _, err := tx.Exec(ctx, `
		INSERT INTO partnership_daily (partnership_id, user_id, activity_date)
		VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, partnershipID, userID, yesterday); err != nil {
		return nil, fmt.Errorf("insert save self checkin: %w", err)
	}

	nextReset := today.Add(7 * 24 * time.Hour)
	if _, err := tx.Exec(ctx, `
		UPDATE streak_partnerships
		SET saves_remaining = saves_remaining - 1,
		    saves_reset_date = $2,
		    last_both_date = GREATEST(COALESCE(last_both_date, $3), $3)
		WHERE id = $1
	`, partnershipID, nextReset, yesterday); err != nil {
		return nil, fmt.Errorf("update saves: %w", err)
	}
	p.SavesRemaining--

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	if err := r.enrichPartnership(ctx, &p, userID); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) enrichPartnership(ctx context.Context, p *models.Partnership, callerID uuid.UUID) error {
	// Load usernames
	err := r.pool.QueryRow(ctx, `SELECT username FROM users WHERE id = $1`, p.RequesterID).Scan(&p.RequesterName)
	if err != nil {
		return fmt.Errorf("load requester name: %w", err)
	}
	err = r.pool.QueryRow(ctx, `SELECT username FROM users WHERE id = $1`, p.PartnerID).Scan(&p.PartnerName)
	if err != nil {
		return fmt.Errorf("load partner name: %w", err)
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)

	// Caller checkin today
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM partnership_daily
			WHERE partnership_id = $1 AND user_id = $2 AND activity_date = $3
		)
	`, p.ID, callerID, today).Scan(&p.MyCheckinToday); err != nil {
		return fmt.Errorf("load my checkin: %w", err)
	}

	// Partner checkin today
	partnerID := p.PartnerID
	if callerID == p.PartnerID {
		partnerID = p.RequesterID
	}
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM partnership_daily
			WHERE partnership_id = $1 AND user_id = $2 AND activity_date = $3
		)
	`, p.ID, partnerID, today).Scan(&p.PartnerCheckin); err != nil {
		return fmt.Errorf("load partner checkin: %w", err)
	}

	return nil
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

func (r *Repository) GetLeaderboard(ctx context.Context, sortBy string) ([]models.LeaderboardEntry, error) {
	orderClause := "up.total_xp DESC, up.streak_days DESC"
	switch sortBy {
	case "streak":
		orderClause = "up.streak_days DESC, up.total_xp DESC"
	case "level":
		orderClause = "up.current_level DESC, up.total_xp DESC"
	}

	query := fmt.Sprintf(`
		SELECT
			RANK() OVER (ORDER BY %s) AS rank,
			u.username,
			up.total_xp,
			up.current_level,
			up.streak_days,
			COUNT(ua.id) AS achievements_unlocked
		FROM users u
		JOIN user_progress up ON up.user_id = u.id
		LEFT JOIN user_achievements ua ON ua.user_id = u.id
		GROUP BY u.username, up.total_xp, up.current_level, up.streak_days
		ORDER BY %s
		LIMIT 10
	`, orderClause, orderClause)

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("get leaderboard: %w", err)
	}
	defer rows.Close()

	var result []models.LeaderboardEntry
	for rows.Next() {
		var e models.LeaderboardEntry
		if err := rows.Scan(&e.Rank, &e.Username, &e.TotalXP, &e.CurrentLevel, &e.StreakDays, &e.AchievementsUnlocked); err != nil {
			return nil, err
		}
		result = append(result, e)
	}
	return result, rows.Err()
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
