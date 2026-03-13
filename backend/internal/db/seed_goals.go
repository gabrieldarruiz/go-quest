package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type goalTemplateSeed struct {
	title      string
	desc       string
	category   string
	minLevel   int
	maxLevel   int
	xpReward   int
	difficulty int // 1=easy 2=medium 3=hard
}

var goalTemplates = []goalTemplateSeed{
	// ── Nível 1-2: Fundamentos absolutos ─────────────────────────────────────

	// pomodoro / estudo focado
	{"Sessão Pomodoro", "Complete 1 sessão pomodoro de 25 minutos estudando Go", "pomodoro", 1, 2, 15, 1},
	{"Dois Pomodoros", "Complete 2 sessões pomodoro hoje", "pomodoro", 1, 2, 25, 2},
	{"Bloco de Foco", "Complete 3 sessões pomodoro em sequência sem pausas longas", "pomodoro", 1, 2, 35, 2},
	{"Maratona Iniciante", "Complete 4 sessões pomodoro em um único dia", "pomodoro", 1, 2, 45, 3},

	// leitura / docs
	{"Leia a Tour", "Leia pelo menos 1 seção do tour.golang.org hoje", "study", 1, 2, 10, 1},
	{"Documentação Oficial", "Leia a documentação de um pacote da stdlib em pkg.go.dev", "study", 1, 2, 15, 1},
	{"Effective Go", "Leia um trecho do Effective Go (effectivego.io)", "study", 1, 2, 15, 1},
	{"Go Blog", "Leia um artigo do blog oficial blog.golang.org", "study", 1, 2, 20, 1},
	{"Go Proverbs", "Leia e reflita sobre todos os Go Proverbs", "study", 1, 2, 15, 1},

	// prática básica
	{"Hello, World!", "Escreva e rode um programa Go do zero hoje", "practice", 1, 2, 10, 1},
	{"Variáveis Hoje", "Declare pelo menos 5 variáveis usando var e := no mesmo arquivo", "practice", 1, 2, 15, 1},
	{"Funções Simples", "Escreva 3 funções com múltiplos retornos", "practice", 1, 2, 20, 2},
	{"For é o Rei", "Use o for em todas as suas formas: clássico, while-style e range", "practice", 1, 2, 20, 2},
	{"Switch Elegante", "Substitua uma cadeia de if/else por um switch em Go", "practice", 1, 2, 15, 1},
	{"Slice & Map", "Crie um slice e um map, popule e itere sobre ambos", "practice", 1, 2, 20, 2},
	{"Defer Hoje", "Use defer em pelo menos 2 funções diferentes", "practice", 1, 2, 15, 1},
	{"Ponteiros Básicos", "Escreva código que use ponteiros para modificar valores", "practice", 1, 2, 20, 2},

	// revisão
	{"Revisão Rápida", "Revise anotações ou código escrito nos últimos 3 dias", "review", 1, 2, 10, 1},
	{"Explica pra Você", "Escreva com suas palavras o que é uma goroutine (mesmo sem usar)", "review", 1, 2, 15, 1},

	// ── Nível 2-4: Construtor ─────────────────────────────────────────────────

	// pomodoro
	{"Três Pomodoros", "Complete 3 sessões pomodoro focadas em código Go", "pomodoro", 2, 4, 35, 2},
	{"Cinco Pomodoros", "Complete 5 pomodoros em um único dia", "pomodoro", 2, 4, 60, 3},
	{"Pomodoro de Revisão", "Use um pomodoro inteiro apenas para revisar código antigo", "pomodoro", 2, 4, 20, 1},

	// structs e interfaces
	{"Struct do Dia", "Modele um problema real usando uma struct com pelo menos 5 campos", "practice", 2, 4, 25, 2},
	{"Métodos na Struct", "Adicione pelo menos 3 métodos a uma struct existente", "practice", 2, 4, 25, 2},
	{"Embedding", "Use embedding de struct para compor tipos em Go", "practice", 2, 4, 30, 2},
	{"Interface Simples", "Defina e implemente uma interface com pelo menos 2 métodos", "practice", 2, 4, 30, 2},
	{"Stringer Próprio", "Implemente fmt.Stringer em um tipo seu", "practice", 2, 4, 20, 1},
	{"Duck Typing", "Escreva uma função que aceite uma interface e teste com 2 tipos diferentes", "practice", 2, 4, 35, 2},

	// packages e módulos
	{"Novo Pacote", "Crie um pacote interno com pelo menos 3 funções exportadas", "practice", 2, 4, 30, 2},
	{"Separar Responsabilidades", "Refatore um arquivo grande dividindo em 2 pacotes", "practice", 3, 4, 35, 2},
	{"go mod tidy", "Rode go mod tidy e entenda o que mudou no go.sum", "practice", 2, 4, 15, 1},

	// tratamento de erros
	{"Erros Explícitos", "Substitua 3 panics por retornos de error em código seu", "practice", 2, 4, 25, 2},
	{"Erro Customizado", "Crie um tipo de erro customizado com campos úteis", "practice", 3, 4, 30, 2},
	{"errors.Is/As", "Use errors.Is ou errors.As em pelo menos 1 caso prático", "practice", 3, 4, 25, 2},
	{"Wrap de Erros", "Use fmt.Errorf com %w para criar cadeias de erro", "practice", 3, 4, 20, 1},

	// testes
	{"Primeiro Teste", "Escreva pelo menos 1 teste com go test hoje", "practice", 2, 4, 25, 1},
	{"Table-Driven Test", "Converta um teste simples para table-driven test", "practice", 3, 4, 30, 2},
	{"Cobertura", "Rode go test -cover e identifique código não testado", "practice", 3, 4, 25, 2},
	{"Subtest", "Use t.Run para criar subtests dentro de um teste existente", "practice", 3, 4, 25, 2},
	{"Benchmark Simples", "Escreva 1 benchmark com testing.B", "practice", 4, 4, 35, 2},

	// ferramentas
	{"go vet", "Rode go vet no projeto e corrija todos os warnings", "practice", 2, 4, 20, 1},
	{"gofmt", "Rode gofmt -w . e entenda cada diferença de formatação", "practice", 2, 4, 10, 1},
	{"golangci-lint", "Configure e rode golangci-lint no projeto", "practice", 3, 4, 25, 2},

	// revisão e estudo
	{"Releitura de Código", "Releia código escrito há mais de 1 semana e melhore algo", "review", 2, 4, 20, 1},
	{"Código de Outro", "Leia o código-fonte de uma lib Go popular no GitHub", "study", 2, 4, 25, 2},
	{"Go Spec", "Leia uma seção da Go Specification oficial", "study", 3, 4, 20, 2},
	{"Exemplo Prático", "Siga um exemplo do Go by Example (gobyexample.com)", "study", 2, 4, 15, 1},

	// ── Nível 4-6: Desenvolvedor / Praticante ────────────────────────────────

	// pomodoro avançado
	{"Foco Profundo", "Complete 4 pomodoros em um projeto real de Go", "pomodoro", 4, 6, 50, 2},
	{"Dia de Sprint", "Complete 6 pomodoros hoje", "pomodoro", 4, 6, 80, 3},
	{"Pomodoro de Arquitetura", "Use um pomodoro para planejar/desenhar a arquitetura de um projeto", "pomodoro", 4, 6, 30, 1},

	// HTTP e APIs
	{"Handler Novo", "Implemente um novo handler HTTP com validação de input", "practice", 4, 6, 35, 2},
	{"Middleware Próprio", "Escreva um middleware de logging ou autenticação", "practice", 5, 6, 40, 2},
	{"API REST", "Implemente um CRUD completo de um recurso via REST", "practice", 5, 6, 60, 3},
	{"JSON Mastery", "Use json.Encoder/Decoder com tipos customizados e tags", "practice", 4, 6, 30, 2},
	{"Contexto HTTP", "Use context para cancelar uma requisição com timeout", "practice", 5, 6, 35, 2},
	{"Query Params", "Parse e valide query parameters em um handler", "practice", 4, 6, 25, 1},

	// banco de dados
	{"Query Parametrizada", "Escreva uma query SQL parametrizada com pgx ou database/sql", "practice", 4, 6, 30, 2},
	{"Transaction", "Implemente uma transação de banco com rollback em caso de erro", "practice", 5, 6, 45, 3},
	{"Migration Nova", "Escreva e rode uma nova migration no projeto", "practice", 5, 6, 35, 2},
	{"N+1 Detectado", "Identifique e corrija um problema N+1 em queries", "challenge", 5, 6, 50, 3},

	// concorrência básica
	{"Primeira Goroutine", "Lance uma goroutine que processe dados em paralelo", "practice", 5, 6, 35, 2},
	{"Channel Básico", "Use um channel para sincronizar 2 goroutines", "practice", 5, 6, 40, 2},
	{"WaitGroup", "Use sync.WaitGroup para aguardar múltiplas goroutines", "practice", 5, 6, 40, 2},
	{"Select Statement", "Use select com pelo menos 3 cases incluindo timeout", "practice", 6, 6, 45, 3},
	{"Fan-out Pattern", "Implemente fan-out: 1 produtor, múltiplos consumidores", "practice", 6, 6, 55, 3},

	// qualidade
	{"Refatoração", "Refatore uma função longa em funções menores com nomes claros", "review", 4, 6, 25, 2},
	{"Comentários Úteis", "Adicione godoc em todas as funções exportadas de um pacote", "practice", 4, 6, 20, 1},
	{"Sem Magic Numbers", "Substitua todos os números mágicos por constantes nomeadas", "review", 4, 6, 20, 1},

	// estudo avançado
	{"Interface Composition", "Estude e use composição de interfaces em um exemplo real", "study", 4, 6, 30, 2},
	{"Concorrência na Docs", "Leia o capítulo de concorrência do Go Tour completamente", "study", 5, 6, 25, 2},
	{"Generics Intro", "Leia e entenda um exemplo simples de generics em Go 1.18+", "study", 5, 6, 30, 2},
	{"net/http Internals", "Explore o código-fonte do pacote net/http no GitHub", "study", 5, 6, 35, 2},

	// ── Nível 6-8: Engenheiro / Arquiteto ────────────────────────────────────

	// pomodoro sênior
	{"Deep Work", "Complete 5 pomodoros em trabalho profundo de arquitetura", "pomodoro", 6, 8, 65, 2},
	{"Sprint Dia Inteiro", "Complete 8 pomodoros hoje em projeto Go", "pomodoro", 6, 8, 100, 3},
	{"Pomodoro de Review", "Use um pomodoro para revisar um PR ou código de terceiros", "pomodoro", 6, 8, 35, 1},

	// concorrência avançada
	{"Mutex Correto", "Use sync.Mutex para proteger estado compartilhado sem deadlock", "practice", 6, 8, 45, 2},
	{"Race Condition Fix", "Rode go test -race e corrija todas as race conditions encontradas", "challenge", 6, 8, 60, 3},
	{"Worker Pool", "Implemente um worker pool com N workers e job queue via channel", "practice", 6, 8, 65, 3},
	{"Pipeline Pattern", "Implemente o pipeline pattern com channels e goroutines", "practice", 7, 8, 65, 3},
	{"Context Propagation", "Propague context corretamente por toda uma cadeia de chamadas", "practice", 6, 8, 45, 2},
	{"Semáforo com Channel", "Implemente um semáforo de controle de concorrência via channel buffered", "challenge", 7, 8, 55, 3},

	// arquitetura
	{"Clean Arch Layer", "Implemente ou refatore uma camada seguindo Clean Architecture", "practice", 7, 8, 55, 3},
	{"Interface Segregation", "Quebre uma interface grande em interfaces menores e coesas", "practice", 7, 8, 45, 2},
	{"Dependency Injection", "Injete dependências por parâmetro em vez de variáveis globais", "practice", 7, 8, 50, 2},
	{"Repository Pattern", "Extraia acesso a dados para uma camada de repositório testável", "practice", 7, 8, 55, 3},
	{"Error Handling Strategy", "Defina e implemente uma estratégia consistente de erros no projeto", "practice", 7, 8, 45, 2},

	// observabilidade
	{"Logs Estruturados", "Substitua fmt.Println por logs estruturados (slog ou zerolog)", "practice", 6, 8, 40, 2},
	{"Métricas Prometheus", "Adicione pelo menos 2 métricas Prometheus ao serviço", "practice", 7, 8, 55, 3},
	{"Health Check", "Implemente endpoint /healthz com verificação de dependências", "practice", 6, 8, 35, 2},
	{"pprof Setup", "Configure pprof no servidor e capture um profile de CPU", "practice", 8, 8, 60, 3},
	{"Trace Manual", "Adicione spans manuais de OpenTelemetry em um fluxo crítico", "practice", 8, 8, 65, 3},

	// performance
	{"Benchmark Comparativo", "Escreva benchmarks comparando 2 implementações diferentes", "challenge", 7, 8, 55, 3},
	{"Alocações Zero", "Use go tool pprof para reduzir alocações em um hot path", "challenge", 8, 8, 70, 3},
	{"Sync Pool", "Use sync.Pool para reutilizar objetos em um trecho de alta frequência", "challenge", 8, 8, 65, 3},
	{"String Builder", "Substitua concatenações de string por strings.Builder", "practice", 6, 8, 30, 1},

	// estudo avançado
	{"Go Scheduler", "Estude como funciona o scheduler M:N do Go runtime", "study", 6, 8, 40, 2},
	{"GC Tuning", "Leia sobre garbage collection em Go e GOGC/GOMEMLIMIT", "study", 7, 8, 35, 2},
	{"escape analysis", "Rode go build -gcflags='-m' e entenda o que escapa para heap", "study", 7, 8, 40, 3},
	{"Leia código stdlib", "Leia o código-fonte completo de um pacote pequeno da stdlib", "study", 7, 8, 45, 2},

	// ── Nível 8-10: Sênior / Staff / Especialista ────────────────────────────

	// pomodoro expert
	{"Bloco Expert", "Complete 6 pomodoros em trabalho de alto impacto", "pomodoro", 8, 10, 80, 2},
	{"Maratona Expert", "Complete 10 pomodoros hoje", "pomodoro", 8, 10, 120, 3},
	{"Pomodoro de Mentoria", "Use um pomodoro para revisar e comentar código de outro dev", "pomodoro", 8, 10, 45, 1},

	// sistemas distribuídos
	{"Circuit Breaker", "Implemente ou integre um circuit breaker em chamadas externas", "challenge", 8, 10, 80, 3},
	{"Retry com Backoff", "Implemente retry exponencial com jitter em chamadas de rede", "challenge", 8, 10, 70, 3},
	{"Graceful Shutdown", "Implemente graceful shutdown completo com context e os.Signal", "practice", 8, 10, 65, 3},
	{"Rate Limiter", "Implemente rate limiting via token bucket ou sliding window", "challenge", 9, 10, 80, 3},
	{"Idempotent Handler", "Garanta idempotência em um endpoint crítico com deduplication key", "challenge", 9, 10, 75, 3},

	// gRPC e protobuf
	{"Primeiro .proto", "Defina um serviço gRPC em protobuf e gere o código Go", "practice", 8, 10, 65, 2},
	{"gRPC Handler", "Implemente um handler gRPC unário com tratamento de erros", "practice", 9, 10, 70, 3},
	{"gRPC Streaming", "Implemente streaming server-side em um serviço gRPC", "challenge", 9, 10, 85, 3},
	{"Interceptor gRPC", "Escreva um interceptor de logging ou auth para gRPC", "practice", 9, 10, 70, 3},

	// mensageria
	{"Publicar Evento", "Publique um evento em fila (RabbitMQ, Kafka ou NATS)", "practice", 8, 10, 65, 2},
	{"Consumer Resiliente", "Implemente um consumer com DLQ e retry automático", "challenge", 9, 10, 80, 3},
	{"Outbox Pattern", "Implemente o outbox pattern para garantia de entrega de eventos", "challenge", 10, 10, 90, 3},

	// open source e comunidade
	{"Issue Identificada", "Encontre e documente um bug ou melhoria em um projeto Go OSS", "challenge", 8, 10, 60, 2},
	{"PR Aberto", "Abra um pull request em um projeto Go open source", "challenge", 9, 10, 100, 3},
	{"Artigo Técnico", "Escreva um artigo ou post técnico sobre algo que aprendeu em Go", "challenge", 9, 10, 90, 3},
	{"Code Review", "Faça code review detalhado em um PR de colega focando em Go idiomático", "review", 8, 10, 55, 2},
	{"Talk Preparado", "Prepare slides/demo para uma talk técnica sobre Go", "challenge", 9, 10, 100, 3},

	// liderança técnica
	{"ADR Escrito", "Escreva um Architecture Decision Record para uma decisão técnica", "review", 9, 10, 70, 2},
	{"Pair Programming", "Faça pelo menos 2h de pair programming em código Go", "practice", 8, 10, 60, 2},
	{"Mentoria Ativa", "Ajude um colega a resolver um problema de Go explicando o raciocínio", "review", 9, 10, 65, 2},
	{"Runbook", "Escreva um runbook de operação para um serviço Go em produção", "review", 9, 10, 60, 2},

	// desafios extras cross-level
	{"LeetCode em Go", "Resolva 1 problema de algoritmo no LeetCode usando Go", "challenge", 2, 6, 35, 2},
	{"LeetCode Médio", "Resolva 1 problema médio de algoritmo no LeetCode em Go", "challenge", 4, 8, 50, 3},
	{"LeetCode Difícil", "Resolva 1 problema difícil no LeetCode em Go", "challenge", 7, 10, 80, 3},
	{"Projeto 30min", "Construa algo útil do zero em Go em no máximo 30 minutos", "challenge", 3, 7, 45, 2},
	{"Sem Stack Overflow", "Complete uma tarefa de programação Go sem usar Stack Overflow", "challenge", 2, 5, 30, 2},
	{"Leia um RFC", "Leia um RFC relacionado a protocolo que seu serviço Go utiliza", "study", 5, 10, 40, 2},
	{"Contribua com Docs", "Melhore a documentação de um pacote Go interno ou OSS", "practice", 4, 9, 35, 1},
	{"Profile em Produção", "Capture e analise um profile de um serviço Go em produção", "challenge", 8, 10, 75, 3},
	{"Feature Flag", "Implemente feature flags em um serviço Go sem lib externa", "practice", 6, 9, 55, 2},
	{"Cache Layer", "Implemente uma camada de cache com TTL usando sync.Map ou Redis", "practice", 5, 8, 55, 2},
	{"Zero Downtime Deploy", "Configure e valide um deploy zero-downtime para um serviço Go", "challenge", 8, 10, 80, 3},
	{"Dependency Audit", "Audite todas as dependências do go.mod e remova as desnecessárias", "review", 3, 7, 25, 1},
	{"Changelog Atualizado", "Atualize o CHANGELOG do projeto com as mudanças recentes", "review", 4, 8, 20, 1},
	{"Revisão de Segurança", "Identifique e corrija pelo menos 1 vulnerabilidade de segurança no código", "challenge", 6, 10, 65, 3},
}

func SeedGoalTemplates(ctx context.Context, pool *pgxpool.Pool) error {
	for _, t := range goalTemplates {
		_, err := pool.Exec(ctx, `
			INSERT INTO goal_templates (title, description, category, min_level, max_level, xp_reward, difficulty)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT DO NOTHING
		`, t.title, t.desc, t.category, t.minLevel, t.maxLevel, t.xpReward, t.difficulty)
		if err != nil {
			return fmt.Errorf("seed goal template %q: %w", t.title, err)
		}
	}
	return nil
}
