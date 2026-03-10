package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/darraos/go-quest-backend/internal/db"
	"github.com/darraos/go-quest-backend/internal/handlers"
	"github.com/darraos/go-quest-backend/internal/repository"
)

func main() {
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	pool, err := db.Connect(databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(databaseURL, "./migrations"); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	if err := db.SeedAchievements(context.Background(), pool); err != nil {
		log.Printf("warning: failed to seed achievements: %v", err)
	}

	repo := repository.New(pool)
	h := handlers.New(
		repo,
		os.Getenv("RESEND_API_KEY"),
		os.Getenv("RESEND_FROM_EMAIL"),
		os.Getenv("APP_BASE_URL"),
	)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", h.CreateUser)
			r.Post("/login", h.Login)
			r.Post("/forgot-password", h.ForgotPassword)
			r.Post("/reset-password", h.ResetPassword)
		})

		r.Route("/users", func(r chi.Router) {
			r.Post("/", h.CreateUser)
			r.Route("/{userID}", func(r chi.Router) {
				r.Get("/", h.GetUser)
				r.Get("/progress", h.GetProgress)
				r.Get("/achievements", h.GetUserAchievements)
				r.Post("/achievements/{achievementID}", h.UnlockAchievement)
				r.Delete("/achievements/{achievementID}", h.RemoveAchievement)
				r.Get("/daily-goals", h.GetDailyGoals)
				r.Post("/daily-goals/{goalIndex}", h.CompleteGoal)
				r.Delete("/daily-goals/{goalIndex}", h.UncompleteGoal)
				r.Post("/pomodoro", h.CreatePomodoro)
				r.Get("/pomodoro/today", h.GetPomodoroToday)
				r.Get("/xp-history", h.GetXPHistory)
			})
		})

		r.Get("/achievements", h.GetAllAchievements)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("GO_QUEST backend running on :%s\n", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
