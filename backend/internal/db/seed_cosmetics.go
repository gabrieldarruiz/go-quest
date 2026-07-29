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
	// ── Skins em pares claro/escuro — todas liberadas por padrão ──────────────
	{"skin_azul", "Azul Claro", "skin", "common", nil, "default", nil, 1},
	{"skin_marinho", "Azul Royal", "skin", "common", nil, "default", nil, 2},
	{"skin_aqua", "Aqua Claro", "skin", "common", nil, "default", nil, 3},
	{"skin_aqua_escuro", "Aqua Escuro", "skin", "common", nil, "default", nil, 4},
	{"skin_cinza", "Cinza Claro", "skin", "common", nil, "default", nil, 5},
	{"skin_cinza_escuro", "Cinza Escuro", "skin", "common", nil, "default", nil, 6},
	{"skin_roxo", "Roxo Claro", "skin", "common", nil, "default", nil, 7},
	{"skin_roxo_escuro", "Roxo Escuro", "skin", "common", nil, "default", nil, 8},
	{"skin_rosa", "Rosa Claro", "skin", "common", nil, "default", nil, 9},
	{"skin_rosa_escuro", "Rosa Escuro", "skin", "common", nil, "default", nil, 10},
	{"skin_amarelo", "Amarelo Claro", "skin", "common", nil, "default", nil, 11},
	{"skin_mostarda", "Mostarda", "skin", "common", nil, "default", nil, 12},
	{"skin_verde", "Verde Claro", "skin", "common", nil, "default", nil, 13},
	{"skin_musgo", "Verde Musgo", "skin", "common", nil, "default", nil, 14},
	{"skin_marrom", "Marrom Claro", "skin", "common", nil, "default", nil, 15},
	{"skin_marrom_escuro", "Marrom Escuro", "skin", "common", nil, "default", nil, 16},

	// ── Look original (arte do Aseprite) — liberado por padrão ────────────────
	{"hat_beanie_black", "Gorro Preto", "hat", "common", nil, "default", nil, 20},
	{"glasses_round_black", "Óculos Redondo", "glasses", "common", nil, "default", nil, 21},
	{"outfit_coat_black", "Casaco Trench", "outfit", "common", nil, "default", nil, 22},

	// ── Looks inspirados em animes ────────────────────────────────────────────
	{"hat_goku", "Cabelo Saiyajin", "hat", "epic", nil, "default", nil, 23},
	{"outfit_goku", "Gi Laranja", "outfit", "epic", nil, "default", nil, 24},
	{"hat_straw", "Chapéu de Palha", "hat", "epic", nil, "default", nil, 25},
	{"outfit_luffy", "Colete do Pirata", "outfit", "epic", nil, "default", nil, 26},
	{"hat_naruto", "Bandana Ninja", "hat", "epic", nil, "default", nil, 27},
	{"outfit_naruto", "Jaqueta Ninja", "outfit", "epic", nil, "default", nil, 28},
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
