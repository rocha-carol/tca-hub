<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Instruções de contexto do projeto

- Usar como base oficial de análise, priorização e decisões de MVP os documentos conceituais do TCA Hub fornecidos pela usuária.
- Cruzar essa visão com a documentação local do repositório, especialmente `docs/project-context.md`, `docs/roadmap.md` e `docs/architecture.md`.
- Quando houver divergência entre visão do projeto, documentação e implementação, explicitar:
	- o que a visão do TCA Hub propõe;
	- o que já está implementado no sistema;
	- o que ainda precisa ser estruturado para o MVP.
- Considerar sempre os três perfis do produto nas análises e priorizações: estudante, orientador e coordenador.
- Priorizar fechamento e estruturação do MVP antes de sugerir expansão de escopo.

## Regras de continuidade segura

- Dar continuidade ao produto sem excluir ideias já implementadas, exceto quando houver conflito técnico real ou risco claro de inconsistência.
- Trabalhar com o máximo de cautela para não quebrar o código já estável.
- Priorizar reaproveitamento máximo do código, dos componentes, dos serviços e dos fluxos já existentes antes de criar novas estruturas.
- Evitar refatorações amplas em fase de fechamento de MVP.
- Em caso de melhoria visual, preservar o comportamento funcional existente.
- Em caso de dúvida entre reconstruir ou adaptar, preferir adaptar o que já existe.

## Protocolo obrigatório antes de implementar

Antes de qualquer implementação, analisar e explicitar:

1. qual é a etapa atual;
2. qual é o conceito pedagógico envolvido;
3. o que já existe no código relacionado a essa proposta;
4. o que falta;
5. qual é a ordem mais segura para implementar as melhorias;
6. qual melhoria deve ser feita primeiro no MVP;
7. quais arquivos provavelmente precisarão ser alterados;
8. quais arquivos não devem ser alterados;
9. quais riscos de quebra existem;
10. como validar a etapa com segurança.

## Checklist mestre de desenvolvimento e finalização do MVP

### 1. Estrutura geral do produto

- consolidar discurso, documentação e implementação real do MVP;
- congelar expansões fora do escopo principal;
- mover pendências não essenciais para `PENDENCIAS.local.md` quando indicado;
- manter claro o que entra e o que não entra na apresentação final.

### 2. Perfil estudante

- revisar home, jornada e navegação para manter foco em ação e clareza;
- validar fluxo de grupo, tema, jornada e escrita do projeto;
- fortalecer a leitura pedagógica das seções principais;
- revisar registros do processo, repertório, diário, preview e produto final;
- garantir que a proposta de intervenção apareça de forma clara no percurso.

### 3. Perfil orientador

- estruturar o dashboard com foco em prioridades e pendências reais;
- destacar melhor grupos que precisam de intervenção pedagógica;
- validar comentários, respostas, próximos passos, checklist, cronograma e encontros;
- revisar a clareza do fluxo de indicação de orientação e sua validação manual.

### 4. Perfil coordenador

- estruturar o dashboard como centro de decisão institucional;
- destacar grupos sem orientador, estudantes sem grupo e gargalos do processo;
- revisar carga de orientadores, vinculação manual e panorama por estágio;
- melhorar a separação entre visão geral e ação imediata.

### 5. Projeto do grupo como núcleo compartilhado

- consolidar seções, versões, autoria, comentários, dúvidas e respostas;
- revisar a visibilidade dos recursos pedagógicos avançados já implementados;
- escolher com cuidado quais recursos entram na demo principal;
- reforçar o valor pedagógico do projeto como processo, não apenas resultado.

### 6. Consistência de UX e navegação

- revisar coerência visual entre estudante, orientador e coordenador;
- padronizar hierarquia de cards, alertas, ações e estados vazios;
- reduzir ruído visual sem remover informações importantes;
- manter leitura rápida para demo curta.

### 7. Validação funcional

- testar os fluxos críticos dos três perfis;
- validar especialmente login, indicação, comentários, dúvidas, respostas, cronograma e produto final;
- testar upload e leitura de mídias do processo;
- garantir dados de demonstração consistentes e úteis para apresentação.

### 8. Repositório, documentação e entrega

- revisar mudanças locais ainda não commitadas;
- separar o que é essencial para o MVP;
- atualizar documentação mínima do estado real do produto;
- consolidar o estado final da entrega com segurança.

### 9. Preparação para apresentação

- definir roteiro da demo;
- definir pitch curto de problema, solução, diferenciais e impacto;
- escolher o fluxo principal da apresentação;
- ensaiar a navegação entre os perfis do sistema.

### 10. Itens que não devem puxar foco agora

- publicação pública completa dos projetos;
- portfólio institucional completo;
- integrações externas amplas;
- analytics avançado;
- refatorações grandes de arquitetura;
- novas funcionalidades fora do fluxo principal da demo.

## Plano de execução do MVP

### Etapa 1 — Consolidar escopo

1. revisar a etapa atual do checklist do MVP;
2. confirmar o que já está forte no estudante, orientador e coordenador;
3. identificar pontos soltos que impactam a demo;
4. congelar melhorias fora do escopo principal.

### Etapa 2 — Estruturar os três perfis

1. revisar o perfil estudante mantendo o que já está estável;
2. estruturar melhor o dashboard do orientador por prioridade de ação;
3. estruturar melhor o dashboard do coordenador por leitura institucional;
4. evitar mudanças desnecessárias em fluxos que já funcionam.

### Etapa 3 — Fortalecer o núcleo pedagógico

1. revisar se a proposta de intervenção está visível ao longo do percurso;
2. reforçar o valor dos registros, repertório, diário, preview e produto final;
3. garantir que os recursos pedagógicos avançados sejam compreensíveis na interface;
4. reaproveitar ao máximo componentes e serviços já existentes.

### Etapa 4 — Validar com segurança

1. testar os fluxos críticos dos três perfis;
2. validar os cenários mais importantes da demo;
3. revisar riscos de quebra antes de cada alteração;
4. preferir mudanças pequenas, testáveis e reversíveis.

### Etapa 5 — Fechar a entrega

1. revisar mudanças locais e consolidar o estado final do código;
2. atualizar a documentação mínima necessária;
3. preparar roteiro de apresentação e pitch;
4. finalizar o MVP sem remover ideias já implementadas e sem abrir novo escopo.
