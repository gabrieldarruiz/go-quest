package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/darraos/go-quest-backend/internal/models"
)

var ErrItemNotOwned = errors.New("item not owned or does not exist")
var ErrItemWrongSlot = errors.New("item does not fit this slot")

const defaultSkin = "skin_azul"

// GetCosmeticItems retorna o catálogo completo de cosméticos.
func (r *Repository) GetCosmeticItems(ctx context.Context) ([]models.CosmeticItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, slot, rarity, price_coins, unlock_type, unlock_ref, sort_order
		FROM cosmetic_items
		ORDER BY sort_order, id
	`)
	if err != nil {
		return nil, fmt.Errorf("get cosmetic items: %w", err)
	}
	defer rows.Close()

	var items []models.CosmeticItem
	for rows.Next() {
		var it models.CosmeticItem
		if err := rows.Scan(&it.ID, &it.Name, &it.Slot, &it.Rarity, &it.PriceCoins, &it.UnlockType, &it.UnlockRef, &it.SortOrder); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

// ownedItemIDs lista tudo que o usuário pode equipar: itens default + inventário próprio.
func (r *Repository) ownedItemIDs(ctx context.Context, userID uuid.UUID) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id FROM cosmetic_items WHERE unlock_type = 'default'
		UNION
		SELECT item_id FROM user_cosmetics WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get owned items: %w", err)
	}
	defer rows.Close()

	owned := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		owned = append(owned, id)
	}
	return owned, rows.Err()
}

// GetUserAvatar retorna o avatar equipado + itens possuídos. Sem linha em
// user_avatar, devolve o visual padrão (sem criar a linha).
func (r *Repository) GetUserAvatar(ctx context.Context, userID uuid.UUID) (*models.AvatarResponse, error) {
	av := models.UserAvatar{Skin: defaultSkin}
	err := r.pool.QueryRow(ctx, `
		SELECT skin, hat, glasses, outfit
		FROM user_avatar
		WHERE user_id = $1
	`, userID).Scan(&av.Skin, &av.Hat, &av.Glasses, &av.Outfit)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get user avatar: %w", err)
	}

	owned, err := r.ownedItemIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &models.AvatarResponse{Equipped: av, Owned: owned}, nil
}

// validateEquip confere se o item existe, é do slot esperado e pertence ao usuário.
func (r *Repository) validateEquip(ctx context.Context, userID uuid.UUID, itemID, wantSlot string) error {
	var slot string
	var owned bool
	err := r.pool.QueryRow(ctx, `
		SELECT ci.slot,
		       ci.unlock_type = 'default' OR EXISTS (
		           SELECT 1 FROM user_cosmetics uc WHERE uc.user_id = $1 AND uc.item_id = ci.id
		       )
		FROM cosmetic_items ci
		WHERE ci.id = $2
	`, userID, itemID).Scan(&slot, &owned)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrItemNotOwned
		}
		return fmt.Errorf("validate equip: %w", err)
	}
	if slot != wantSlot {
		return ErrItemWrongSlot
	}
	if !owned {
		return ErrItemNotOwned
	}
	return nil
}

// UpdateUserAvatar valida e persiste o conjunto equipado (upsert).
func (r *Repository) UpdateUserAvatar(ctx context.Context, userID uuid.UUID, av models.UserAvatar) (*models.AvatarResponse, error) {
	if av.Skin == "" {
		av.Skin = defaultSkin
	}
	if err := r.validateEquip(ctx, userID, av.Skin, "skin"); err != nil {
		return nil, err
	}
	optional := map[string]*string{"hat": av.Hat, "glasses": av.Glasses, "outfit": av.Outfit}
	for slot, itemID := range optional {
		if itemID == nil || *itemID == "" {
			continue
		}
		if err := r.validateEquip(ctx, userID, *itemID, slot); err != nil {
			return nil, err
		}
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_avatar (user_id, skin, hat, glasses, outfit)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE
		SET skin = EXCLUDED.skin,
		    hat = EXCLUDED.hat,
		    glasses = EXCLUDED.glasses,
		    outfit = EXCLUDED.outfit
	`, userID, av.Skin, av.Hat, av.Glasses, av.Outfit)
	if err != nil {
		return nil, fmt.Errorf("update user avatar: %w", err)
	}

	return r.GetUserAvatar(ctx, userID)
}
