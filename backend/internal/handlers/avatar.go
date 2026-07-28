package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/darraos/go-quest-backend/internal/models"
	"github.com/darraos/go-quest-backend/internal/repository"
)

// GET /api/cosmetics — catálogo completo
func (h *Handler) GetCosmetics(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.GetCosmeticItems(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get cosmetics")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// GET /api/users/{userID}/avatar — equipado + inventário
func (h *Handler) GetAvatar(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	resp, err := h.repo.GetUserAvatar(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get avatar")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

// PUT /api/users/{userID}/avatar — equipa/desequipa (null remove o item do slot)
func (h *Handler) UpdateAvatar(w http.ResponseWriter, r *http.Request) {
	userID, err := parseUserID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var body models.UserAvatar
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.repo.UpdateUserAvatar(r.Context(), userID, body)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrItemNotOwned):
			writeError(w, http.StatusForbidden, "voce ainda nao possui este item")
		case errors.Is(err, repository.ErrItemWrongSlot):
			writeError(w, http.StatusBadRequest, "item nao serve neste slot")
		default:
			writeError(w, http.StatusInternalServerError, "failed to update avatar")
		}
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
