package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const gopherLeonPersona = `Você é o Gopher Léon, especialista em Go.
Tom: direto, técnico e pragmático. Sem enrolação.

Regras de conduta:
- Código limpo acima de tudo: clareza, manutenção e eficiência.
- Sempre priorize soluções idiomáticas em Go.
- Se faltar contexto, peça objetivamente o que falta antes de assumir.
- Explique trade-offs de forma curta e concreta.
- Se houver risco de bug/concorrência/performance, destaque sem rodeios.
- Evite jargão desnecessário e respostas genéricas.
- Responda em português (pt-BR), com no máximo 4 parágrafos.

Quando útil, inclua:
- passos acionáveis;
- exemplos curtos de código Go;
- checklist objetivo para execução.`

type aiChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type aiChatRequest struct {
	System      string          `json:"system"`
	Messages    []aiChatMessage `json:"messages"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
	Temperature float64         `json:"temperature,omitempty"`
}

type openAIChatRequest struct {
	Model       string          `json:"model"`
	Messages    []aiChatMessage `json:"messages"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
	Temperature float64         `json:"temperature,omitempty"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message aiChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (h *Handler) AIChat(w http.ResponseWriter, r *http.Request) {
	if h.openAIAPIKey == "" {
		writeError(w, http.StatusServiceUnavailable, "OpenAI is not configured")
		return
	}

	var body aiChatRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(body.Messages) == 0 {
		writeError(w, http.StatusBadRequest, "messages are required")
		return
	}
	if len(body.Messages) > 40 {
		writeError(w, http.StatusBadRequest, "too many messages")
		return
	}

	outbound := make([]aiChatMessage, 0, len(body.Messages)+1)
	systemPrompt := gopherLeonPersona
	if system := strings.TrimSpace(body.System); system != "" {
		systemPrompt = systemPrompt + "\n\nContexto adicional do app:\n" + system
	}
	outbound = append(outbound, aiChatMessage{Role: "system", Content: systemPrompt})
	for _, m := range body.Messages {
		role := strings.TrimSpace(strings.ToLower(m.Role))
		if role != "user" && role != "assistant" {
			continue
		}
		content := strings.TrimSpace(m.Content)
		if content == "" {
			continue
		}
		outbound = append(outbound, aiChatMessage{Role: role, Content: content})
	}
	if len(outbound) == 0 {
		writeError(w, http.StatusBadRequest, "no valid messages to send")
		return
	}

	reqBody := openAIChatRequest{
		Model:    h.openAIModel,
		Messages: outbound,
	}
	if body.MaxTokens > 0 {
		reqBody.MaxTokens = body.MaxTokens
	}
	if body.Temperature > 0 {
		reqBody.Temperature = body.Temperature
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to encode request")
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(payload))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create upstream request")
		return
	}
	req.Header.Set("Authorization", "Bearer "+h.openAIAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 45 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to call OpenAI")
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to read OpenAI response")
		return
	}

	var openAIResp openAIChatResponse
	if err := json.Unmarshal(respBody, &openAIResp); err != nil {
		writeError(w, http.StatusBadGateway, "invalid OpenAI response")
		return
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if openAIResp.Error != nil && openAIResp.Error.Message != "" {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("OpenAI error: %s", openAIResp.Error.Message))
			return
		}
		writeError(w, http.StatusBadGateway, "OpenAI request failed")
		return
	}

	if len(openAIResp.Choices) == 0 {
		writeError(w, http.StatusBadGateway, "OpenAI returned no choices")
		return
	}

	content := strings.TrimSpace(openAIResp.Choices[0].Message.Content)
	if content == "" {
		content = "Sem resposta."
	}
	writeJSON(w, http.StatusOK, map[string]any{"content": content})
}
