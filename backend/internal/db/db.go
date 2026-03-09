package db

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	maxOpen, _ := strconv.Atoi(os.Getenv("DB_MAX_OPEN_CONNS"))
	if maxOpen == 0 {
		maxOpen = 25
	}
	maxIdle, _ := strconv.Atoi(os.Getenv("DB_MAX_IDLE_CONNS"))
	if maxIdle == 0 {
		maxIdle = 10
	}
	lifetime := os.Getenv("DB_CONN_MAX_LIFETIME")
	if lifetime == "" {
		lifetime = "5m"
	}
	dur, _ := time.ParseDuration(lifetime)
	if dur == 0 {
		dur = 5 * time.Minute
	}

	cfg.MaxConns = int32(maxOpen)
	cfg.MinConns = int32(maxIdle)
	cfg.MaxConnLifetime = dur

	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}

	return pool, nil
}
