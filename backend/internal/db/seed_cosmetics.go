package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type cosmeticSeed struct {
	id         string
	name       string
	slot       string
	rarity     string
	priceCoins *int
	unlockType string
	unlockRef  *string
	sortOrder  int
}

var cosmeticItems = []cosmeticSeed{
	// ── Skins (cores das pelúcias) — todas liberadas por padrão ───────────────
	{"skin_azul", "Azul Clássico", "skin", "common", nil, "default", nil, 1},
	{"skin_aqua", "Aqua", "skin", "common", nil, "default", nil, 2},
	{"skin_cinza", "Cinza", "skin", "common", nil, "default", nil, 3},
	{"skin_roxo", "Roxo", "skin", "common", nil, "default", nil, 4},
	{"skin_marinho", "Azul Royal", "skin", "common", nil, "default", nil, 5},
	{"skin_rosa", "Rosa", "skin", "common", nil, "default", nil, 6},
	{"skin_amarelo", "Amarelo Claro", "skin", "common", nil, "default", nil, 7},
	{"skin_mostarda", "Mostarda", "skin", "common", nil, "default", nil, 8},
	{"skin_verde", "Verde Claro", "skin", "common", nil, "default", nil, 9},
	{"skin_musgo", "Verde Musgo", "skin", "common", nil, "default", nil, 10},

	// ── Look original (arte do Aseprite) — liberado por padrão ────────────────
	{"hat_beanie_black", "Gorro Preto", "hat", "common", nil, "default", nil, 20},
	{"glasses_round_black", "Óculos Redondo", "glasses", "common", nil, "default", nil, 21},
	{"outfit_coat_black", "Casaco Trench", "outfit", "common", nil, "default", nil, 22},
}

// SeedCosmetics insere/atualiza o catálogo de cosméticos (idempotente).
func SeedCosmetics(ctx context.Context, pool *pgxpool.Pool) error {
	for _, c := range cosmeticItems {
		_, err := pool.Exec(ctx, `
			INSERT INTO cosmetic_items (id, name, slot, rarity, price_coins, unlock_type, unlock_ref, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (id) DO UPDATE
			SET name = EXCLUDED.name,
			    slot = EXCLUDED.slot,
			    rarity = EXCLUDED.rarity,
			    price_coins = EXCLUDED.price_coins,
			    unlock_type = EXCLUDED.unlock_type,
			    unlock_ref = EXCLUDED.unlock_ref,
			    sort_order = EXCLUDED.sort_order
		`, c.id, c.name, c.slot, c.rarity, c.priceCoins, c.unlockType, c.unlockRef, c.sortOrder)
		if err != nil {
			return fmt.Errorf("seed cosmetic %s: %w", c.id, err)
		}
	}
	return nil
}
