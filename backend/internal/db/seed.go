package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type achievementSeed struct {
	id            string
	levelRequired int
	title         string
	description   string
	xpReward      int
	category      string
	icon          string
	sortOrder     int
}

var achievements = []achievementSeed{
	// LVL 1 — Absolute Zero
	{"env_setup", 1, "Ambiente Pronto", "Go instalado, GOPATH configurado, VSCode/Neovim com extensão Go", 30, "basics", "◈", 1},
	{"hello_world", 1, "Hello, Gopher", "Rodou seu primeiro programa Go no terminal", 20, "basics", "◉", 2},
	{"go_tour", 1, "Tour Completo", "Completou o tour.golang.org inteiro", 80, "basics", "⬡", 3},
	{"first_module", 1, "Módulo Criado", "Criou um módulo com go mod init e entendeu o go.mod", 50, "basics", "▣", 4},
	{"read_docs", 1, "Leitor de Docs", "Leu a documentação oficial em pkg.go.dev", 20, "basics", "◎", 5},

	// LVL 2 — Iniciante
	{"variables", 2, "Declarações", "Dominou var, :=, const e os tipos básicos", 40, "basics", "⟁", 6},
	{"control_flow", 2, "Fluxo Controlado", "Usou if, for, switch e defer", 50, "basics", "⇌", 7},
	{"functions", 2, "Funcional", "Criou funções com múltiplos retornos e variádicas", 60, "basics", "⚠", 8},
	{"slices_maps", 2, "Coleções", "Dominou slices, arrays e maps na prática", 70, "basics", "✦", 9},
	{"pointers", 2, "Ponteiros", "Entendeu ponteiros e quando usá-los em Go", 80, "basics", "⊕", 10},

	// LVL 3 — Construtor
	{"structs", 3, "Arquiteto de Structs", "Criou structs com métodos e entendeu embedding", 80, "intermediate", "◬", 11},
	{"interfaces", 3, "Contratualista", "Implementou interfaces e entendeu duck typing", 100, "intermediate", "▤", 12},
	{"packages", 3, "Empacotador", "Criou pacotes reutilizáveis e entendeu exported/unexported", 70, "intermediate", "◈", 13},
	{"error_type", 3, "Errors são Valores", "Criou tipos de erro customizados com errors.New e fmt.Errorf", 90, "intermediate", "◉", 14},
	{"stringer", 3, "Stringer", "Implementou a interface fmt.Stringer nos seus tipos", 60, "intermediate", "⬡", 15},

	// LVL 4 — Desenvolvedor
	{"testing", 4, "Testador", "Escreveu testes com go test, subtests e table-driven tests", 100, "intermediate", "▣", 16},
	{"benchmarks", 4, "Benchmark", "Criou benchmarks com testing.B e analisou resultados", 80, "intermediate", "◎", 17},
	{"cobra_cli", 4, "CLI Gopher", "Construiu uma CLI com cobra ou flag package", 110, "intermediate", "⟁", 18},
	{"govet_lint", 4, "Código Limpo", "Usou go vet, golangci-lint e corrigiu todos os warnings", 70, "intermediate", "⇌", 19},
	{"go_generate", 4, "Gerador", "Usou go generate para automatizar código", 60, "intermediate", "⚠", 20},

	// LVL 5 — Praticante
	{"http_server", 5, "Servidor Online", "Criou um servidor HTTP com net/http ou Gin/Chi", 100, "intermediate", "✦", 21},
	{"json_api", 5, "API Builder", "Construiu uma REST API com encoding/json completa", 120, "intermediate", "⊕", 22},
	{"database", 5, "Persistência", "Integrou banco de dados com database/sql ou GORM", 130, "intermediate", "◬", 23},
	{"middleware", 5, "Middleware", "Implementou middleware de auth, logging e CORS", 90, "intermediate", "▤", 24},
	{"sqlc_migrate", 5, "Migrations", "Usou sqlc ou golang-migrate para gerenciar schema", 110, "intermediate", "◈", 25},

	// LVL 6 — Engenheiro
	{"goroutines", 6, "Concorrente", "Lançou goroutines e entendeu o modelo de concorrência Go", 120, "advanced", "◉", 26},
	{"channels", 6, "Mensageiro", "Usou channels para comunicação entre goroutines", 130, "advanced", "⬡", 27},
	{"select", 6, "Seletor", "Usou select para multiplexar channels com timeout", 110, "advanced", "▣", 28},
	{"sync_pkg", 6, "Sincronizador", "Usou sync.Mutex, sync.WaitGroup e sync.Once corretamente", 140, "advanced", "◎", 29},
	{"race_detector", 6, "Race Free", "Rodou go test -race e eliminou todas as race conditions", 150, "advanced", "⟁", 30},
	{"worker_pool", 6, "Worker Pool", "Implementou um worker pool funcional com goroutines", 150, "advanced", "⇌", 31},

	// LVL 7 — Arquiteto
	{"clean_arch", 7, "Clean Architecture", "Organizou um projeto com camadas domain/usecase/infra", 180, "advanced", "⚠", 32},
	{"di_pattern", 7, "Injeção de Dependência", "Implementou DI manual ou com wire/dig", 150, "advanced", "✦", 33},
	{"repo_pattern", 7, "Repository Pattern", "Separou lógica de acesso a dados em repositórios", 130, "advanced", "⊕", 34},
	{"solid_go", 7, "SOLID em Go", "Aplicou princípios SOLID de forma idiomática em Go", 160, "advanced", "◬", 35},
	{"idiomatic", 7, "Gopher Idiomático", "Revisou código seguindo Effective Go e Go Proverbs", 140, "advanced", "▤", 36},

	// LVL 8 — Sênior
	{"profiling", 8, "Profiler", "Usou pprof para identificar e corrigir gargalos de CPU/memória", 200, "advanced", "◈", 37},
	{"tracing", 8, "Tracing", "Implementou distributed tracing com OpenTelemetry", 190, "advanced", "◉", 38},
	{"metrics", 8, "Métricas", "Expôs métricas com Prometheus e criou dashboards Grafana", 180, "advanced", "⬡", 39},
	{"memory_opt", 8, "Memory Master", "Otimizou alocações, entendeu GC e reduziu heap pressure", 210, "advanced", "▣", 40},
	{"air_hot", 8, "Dev Experience", "Configurou air para hot reload e ambiente de dev produtivo", 120, "advanced", "◎", 41},

	// LVL 9 — Staff
	{"grpc", 9, "gRPC Master", "Construiu um serviço gRPC com protobuf e streaming", 250, "advanced", "⟁", 42},
	{"microservices", 9, "Microsserviços", "Decompôs um monolito em serviços comunicantes", 280, "advanced", "⇌", 43},
	{"message_queue", 9, "Mensageria", "Integrou RabbitMQ ou Kafka em um serviço Go", 240, "advanced", "⚠", 44},
	{"distributed", 9, "Sistemas Distribuídos", "Implementou circuit breaker, retry e graceful shutdown", 260, "advanced", "✦", 45},
	{"docker_k8s", 9, "Cloud Native", "Containerizou e deployou serviços Go no Kubernetes", 220, "advanced", "⊕", 46},

	// LVL 10 — Especialista
	{"oss_contrib", 10, "Open Source", "Teve um PR aceito em um projeto Go relevante", 400, "advanced", "◬", 47},
	{"own_lib", 10, "Autor de Biblioteca", "Publicou uma biblioteca Go usada por outras pessoas", 350, "advanced", "▤", 48},
	{"tech_talk", 10, "Palestrante", "Apresentou sobre Go em meetup, conf ou artigo técnico", 300, "advanced", "◈", 49},
	{"read_stdlib", 10, "Leitor de Stdlib", "Leu e entendeu o código-fonte de pacotes da stdlib", 250, "advanced", "◉", 50},
	{"mentor", 10, "Mentor", "Ajudou outros devs a aprenderem Go ativamente", 200, "advanced", "⬡", 51},
}

func SeedAchievements(ctx context.Context, pool *pgxpool.Pool) error {
	for _, a := range achievements {
		_, err := pool.Exec(ctx, `
			INSERT INTO achievements (id, level_required, title, description, xp_reward, category, icon, sort_order)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (id) DO NOTHING
		`, a.id, a.levelRequired, a.title, a.description, a.xpReward, a.category, a.icon, a.sortOrder)
		if err != nil {
			return fmt.Errorf("seed achievement %s: %w", a.id, err)
		}
	}
	return nil
}
