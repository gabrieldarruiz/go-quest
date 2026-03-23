package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserProgress struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	TotalXP       int        `json:"total_xp"`
	CurrentLevel  int        `json:"current_level"`
	StreakDays    int        `json:"streak_days"`
	SaveBalance   int        `json:"save_balance"`
	SaveMilestone int        `json:"-"`
	LastVisitDate *time.Time `json:"last_visit_date,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Achievement struct {
	ID            string `json:"id"`
	LevelRequired int    `json:"level_required"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	XPReward      int    `json:"xp_reward"`
	Category      string `json:"category"`
	Icon          string `json:"icon"`
	SortOrder     int    `json:"sort_order"`
}

type UserAchievement struct {
	ID            uuid.UUID   `json:"id"`
	UserID        uuid.UUID   `json:"user_id"`
	AchievementID string      `json:"achievement_id"`
	UnlockedAt    time.Time   `json:"unlocked_at"`
	Achievement   Achievement `json:"achievement,omitempty"`
}

type DailyGoal struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	GoalDate    time.Time `json:"goal_date"`
	GoalIndex   int       `json:"goal_index"`
	CompletedAt time.Time `json:"completed_at"`
}

type PomodoroSession struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	StartedAt       time.Time `json:"started_at"`
	CompletedAt     time.Time `json:"completed_at"`
	DurationMinutes int       `json:"duration_minutes"`
	SessionType     string    `json:"session_type"`
}

type XPHistory struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	XPGained  int       `json:"xp_gained"`
	Source    string    `json:"source"`
	SourceID  *string   `json:"source_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type UserSummary struct {
	Username             string       `json:"username"`
	TotalXP              int          `json:"total_xp"`
	CurrentLevel         int          `json:"current_level"`
	StreakDays           int          `json:"streak_days"`
	SaveBalance          int          `json:"save_balance"`
	AchievementsUnlocked int          `json:"achievements_unlocked"`
	Progress             UserProgress `json:"progress"`
}

type GoalTemplate struct {
	ID         int    `json:"id"`
	Title      string `json:"title"`
	Desc       string `json:"description"`
	Category   string `json:"category"`
	MinLevel   int    `json:"min_level"`
	MaxLevel   int    `json:"max_level"`
	XPReward   int    `json:"xp_reward"`
	Difficulty int    `json:"difficulty"`
}

type DailyGoalFull struct {
	GoalIndex   int          `json:"goal_index"`
	Completed   bool         `json:"completed"`
	CompletedAt *time.Time   `json:"completed_at,omitempty"`
	Template    GoalTemplate `json:"template"`
}

type Partnership struct {
	ID             uuid.UUID  `json:"id"`
	RequesterID    uuid.UUID  `json:"requester_id"`
	RequesterName  string     `json:"requester_name"`
	PartnerID      uuid.UUID  `json:"partner_id"`
	PartnerName    string     `json:"partner_name"`
	Status         string     `json:"status"`
	StreakDays     int        `json:"streak_days"`
	LastBothDate   *time.Time `json:"last_both_date,omitempty"`
	SavesRemaining int        `json:"saves_remaining"`
	SavesResetDate *time.Time `json:"saves_reset_date,omitempty"`
	MySaveBalance  int        `json:"my_save_balance"`
	CreatedAt      time.Time  `json:"created_at"`
	MyCheckinToday bool       `json:"my_checkin_today"`
	PartnerCheckin bool       `json:"partner_checkin_today"`
}

type Friend struct {
	UserID                uuid.UUID  `json:"user_id"`
	Username              string     `json:"username"`
	FriendsSince          time.Time  `json:"friends_since"`
	SaveBalance           int        `json:"save_balance"`
	HasActivePartnership  bool       `json:"has_active_partnership"`
	PartnershipID         *uuid.UUID `json:"partnership_id,omitempty"`
	PartnershipStreakDays int        `json:"partnership_streak_days"`
}

type UserSearchResult struct {
	ID                uuid.UUID  `json:"id"`
	Username          string     `json:"username"`
	IsFriend          bool       `json:"is_friend"`
	PartnershipID     *uuid.UUID `json:"partnership_id,omitempty"`
	PartnershipStatus string     `json:"partnership_status,omitempty"`
}

type LeaderboardEntry struct {
	Rank                 int    `json:"rank"`
	Username             string `json:"username"`
	TotalXP              int    `json:"total_xp"`
	CurrentLevel         int    `json:"current_level"`
	StreakDays           int    `json:"streak_days"`
	AchievementsUnlocked int    `json:"achievements_unlocked"`
	WeeklyXP             int    `json:"weekly_xp"`
}
