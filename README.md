# TCA Hub

MVP funcional, desenvolvido para demonstrar o potencial da solução no enfrentamento de um problema educacional real e servir como base para futuras evoluções da plataforma.

O projeto consiste em uma plataforma web voltada ao apoio do desenvolvimento do Trabalho de Conclusão Autoral (TCA) e de outros projetos educacionais investigativos em escolas públicas.

---

## Visão geral

O **TCA Hub** foi concebido para enfrentar um problema recorrente no contexto escolar: projetos autorais costumam ter grande potencial formativo, mas o processo de desenvolvimento frequentemente fica disperso entre anotações, documentos isolados, encontros pontuais e pouca visibilidade pedagógica.

A aplicação organiza esse percurso em um ambiente digital estruturado, permitindo:

- cadastro institucional de estudantes e orientadores;
- criação e acompanhamento de grupos;
- indicação e aceite de orientadores;
- desenvolvimento do projeto em seções;
- comentários e dúvidas por etapa;
- acompanhamento por estudante, orientador e coordenação;
- cronograma e checklist de atividades;
- orientação guiada por IA simulada;
- aprendizagem dinamizada e mediada;
- acompanhamento mais próximo da evolução da aprendizagem;
- visualização consolidada do projeto final.

---

## Principais funcionalidades do MVP

- autenticação com perfis `student`, `advisor` e `coordinator`;
- cadastro e importação de estudantes e orientadores;
- criação de grupos por estudantes e coordenação;
- fluxo de preferência, indicação e resposta de orientadores;
- controle de capacidade de orientação;
- estruturação do projeto TCA por seções;
- comentários pedagógicos e dúvidas por seção;
- checklist, cronograma e navegação por workspace do grupo;
- preview do projeto com exportação e visualização final;
- dashboards específicos por papel.

---

## Perfis do sistema

### Estudante

Responsável por desenvolver o projeto, montar grupo, registrar a jornada e interagir com orientações pedagógicas.

### Orientador

Responsável por acompanhar grupos, registrar comentários, responder solicitações de orientação e orientar o avanço do projeto.

### Coordenação

Responsável pela visão institucional do processo, distribuição de orientadores, monitoramento de grupos e gestão operacional.

---

## Tecnologias utilizadas

### Frontend e servidor web

- **Next.js** (App Router)
- **React**
- **TypeScript**

### Estilo e interface

- **Tailwind CSS**
- CSS global customizado para identidade visual do projeto

### Backend e dados

- **Supabase**
- **PostgreSQL**
- **Supabase Auth**

### Organização do código

- `src/app/` → rotas, páginas e layouts
- `src/components/` → componentes de interface
- `src/services/` → regras de negócio e acesso a dados
- `src/types/` → contratos tipados
- `src/lib/` → utilitários e integrações
- `database/` → scripts SQL de evolução local
- `docs/` → documentação do projeto

---

## Como executar localmente

### Pré-requisitos

- Node.js 18+ (recomendado)
- npm
- projeto Supabase configurado

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Criar um arquivo `.env.local` na raiz do projeto com as credenciais do Supabase.

Exemplo:

```env
NEXT_PUBLIC_SUPABASE_URL=cole_aqui_a_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=cole_aqui_a_chave_anon
```

> Observação: dependendo do ambiente local e do fluxo de autenticação, outras variáveis podem existir no projeto. As duas acima são a base para conexão cliente com o Supabase.

### Executar em desenvolvimento

```bash
npm run dev
```

Aplicação disponível em:

```text
http://localhost:3000
```

### Gerar build de produção

```bash
npm run build
```

---

## Banco de dados e scripts SQL

O projeto utiliza scripts SQL locais armazenados em `database/` para evolução do banco.

Esses scripts são executados manualmente no **Supabase SQL Editor**, conforme necessidade de cada etapa do desenvolvimento.

Exemplos de scripts relevantes já utilizados no projeto:

- `001_create_groups_table.sql`
- `003_create_advisors_table.sql`
- `009_add_advisor_indication_flow.sql`
- `010_create_group_project_sections.sql`
- `011_create_project_section_comments.sql`
- `012_create_project_section_questions.sql`
- `013_create_project_section_question_answers.sql`
- `014_create_group_project_section_next_steps.sql`

---

## Arquitetura do sistema

O TCA Hub segue uma arquitetura em camadas, buscando separar interface, regras de negócio e persistência.

### Diagrama simplificado

```text
Interface (Next.js / React)
	|
	v
Server Actions / Rotas App Router
	|
	v
Camada de Serviços (src/services)
	|
	v
Supabase (PostgreSQL + Auth)
```

### Princípios arquiteturais

- páginas e layouts cuidam da experiência de navegação;
- componentes concentram a interface reutilizável;
- serviços concentram regras de negócio e acesso ao banco;
- tipos mantêm consistência entre camadas;
- utilitários encapsulam integrações e comportamentos compartilhados.

---

## Estrutura funcional da aplicação

### Autenticação e perfis

- login e cadastro com Supabase Auth;
- sincronização com `profiles`;
- especialização por papéis institucionais.

### Gestão institucional

- CRUD de estudantes;
- CRUD de orientadores;
- importação de registros por CSV.

### Grupos

- criação de grupos;
- vínculo de integrantes;
- acompanhamento por perfil;
- organização por tema e status.

### Fluxo de orientação

- definição de preferências de orientadores;
- indicação automática por ordem;
- aceite ou recusa da orientação;
- recalculo de disponibilidade.

### Projeto TCA

- estrutura do projeto em seções;
- comentários pedagógicos por seção;
- dúvidas e respostas vinculadas;
- próximos passos;
- cronograma e checklist;
- preview do trabalho final.

---

## Rotas principais

### Públicas

- `/` → página inicial pública / apresentação do projeto
- `/auth/login` → login
- `/auth/signup` → cadastro

### Estudante

- `/student`
- `/student/jornada`
- `/student/groups/status`
- `/student/groups/create`
- `/student/groups/[id]/advisor-indication`

### Orientador

- `/advisor/dashboard`

### Coordenação

- `/coordinator/dashboard`
- `/groups`
- `/students`
- `/advisors`

### Grupo / projeto

- `/groups/[id]`
- `/groups/[id]/project`
- `/groups/[id]/comments`
- `/groups/[id]/questions`
- `/groups/[id]/timeline`
- `/groups/[id]/checklist`
- `/groups/[id]/project/preview`

---

## Estado atual do MVP

O projeto já possui o núcleo funcional principal implementado e está em fase de consolidação da experiência pedagógica e amadurecimento do MVP.

Focos atuais:

- tornar o processo investigativo mais visível;
- melhorar a experiência por perfil;
- fortalecer a leitura pedagógica do percurso;
- consolidar funcionalidades de acompanhamento e apresentação.

---

## Relatório do Projeto

### Objetivo do relatório

Documentar o processo de desenvolvimento da solução e facilitar uma avaliação detalhada, tanto do ponto de vista técnico quanto pedagógico.

### 1. Resumo Executivo

O **TCA Hub** é uma plataforma digital voltada ao acompanhamento do Trabalho de Conclusão Autoral em escolas públicas. Seu objetivo é organizar o desenvolvimento de projetos investigativos, dar mais clareza ao percurso dos estudantes, ampliar a capacidade de acompanhamento dos orientadores e oferecer à coordenação uma visão institucional mais estruturada do processo.

O impacto esperado é pedagógico e organizacional: melhorar a continuidade do trabalho, fortalecer a autoria estudantil, reduzir a fragmentação do acompanhamento e tornar o percurso do projeto mais visível e significativo.

### 2. Problema Identificado

Professores e equipes escolares enfrentam dificuldades recorrentes no acompanhamento de projetos autorais porque o processo costuma ocorrer de forma dispersa. Muitas vezes, o que existe é apenas a entrega final, sem boa documentação das etapas intermediárias, das dúvidas, das intervenções pedagógicas e da evolução do grupo.

Esse cenário gera problemas como:

- pouca visibilidade do percurso investigativo;
- dificuldade para acompanhar vários grupos ao mesmo tempo;
- baixa integração entre estudante, orientador e coordenação;
- fragilidade na documentação pedagógica do processo;
- concentração excessiva de atenção apenas no produto final.

A justificativa para resolver esse problema está no potencial formativo do TCA: quando o processo é visível e organizado, a aprendizagem investigativa ganha mais clareza, continuidade e intencionalidade pedagógica.

### 3. Descrição da Solução

O TCA Hub funciona como um ambiente digital de organização e acompanhamento do projeto TCA.

A solução permite:

- cadastrar estudantes e orientadores;
- formar grupos;
- registrar preferências e indicações de orientação;
- acompanhar o desenvolvimento do projeto por seções;
- registrar comentários, dúvidas e próximos passos;
- visualizar o progresso por diferentes perfis;
- consolidar o projeto em uma visualização final.

Assim, a aplicação atende ao problema ao transformar um processo antes fragmentado em uma jornada acompanhável, registrada e pedagogicamente mediada.

### 4. Processo de Desenvolvimento

O desenvolvimento foi conduzido de forma incremental, respeitando etapas progressivas do MVP.

Estratégias utilizadas ao longo do processo:

- levantamento do problema pedagógico;
- organização de ideias e priorização de escopo;
- definição dos papéis do sistema;
- prototipação de fluxos essenciais;
- implementação por etapas pequenas e testáveis;
- validação contínua com foco em funcionalidade visível;
- refinamento gradual da experiência do usuário.

Na prática, o trabalho se aproximou de uma lógica de:

- **brainstorming** para definição das necessidades do contexto escolar;
- **prototipação funcional** para materializar rapidamente o MVP;
- **iteração incremental** para ajustar visual, fluxo e regras de negócio;
- **validação pedagógica** para manter coerência com o objetivo do projeto.

### 5. Detalhes Técnicos

#### Tecnologias utilizadas

- **TypeScript** como linguagem principal;
- **Next.js** para frontend e estrutura de aplicação web;
- **React** para composição da interface;
- **Tailwind CSS** para estilização;
- **Supabase** para autenticação e banco de dados;
- **PostgreSQL** como base relacional.

#### Arquitetura do sistema

Arquitetura simplificada:

```text
Usuário
  -> Interface Web (Next.js / React)
  -> Rotas e Server Actions
  -> Serviços de negócio (src/services)
  -> Supabase Auth + PostgreSQL
```

Separação principal:

- `src/app/` → interface e navegação
- `src/components/` → componentes reutilizáveis
- `src/services/` → lógica de negócio
- `src/types/` → modelagem tipada
- `src/lib/` → integrações e utilitários

### 6. Links Úteis

- **Repositório de código:** https://github.com/rocha-carol/tca-hub.git
- **Documentação de contexto do projeto:** `docs/project-context.md`
- **Documentação de arquitetura:** `docs/architecture.md`
- **Roadmap do projeto:** `docs/roadmap.md`
- **Protótipos visuais:** adicionar link do Figma, Miro ou ferramenta equivalente quando disponível
- **Documentos adicionais relevantes:** pasta `docs/` do repositório

### 7. Aprendizados e Próximos Passos

#### Aprendizados

Ao longo do desenvolvimento,  aprendizagens importante amadureceram:

- a clareza pedagógica do problema é tão importante quanto a implementação técnica;
- um MVP funcional precisa priorizar fluxos essenciais antes de expansões amplas;
- separar os papéis do sistema melhora muito a consistência da experiência;
- documentar regras de negócio facilita evolução e manutenção;
- testes incrementais reduzem regressões em um projeto com múltiplos perfis e fluxos.

#### Próximos passos

Possibilidades de evolução futura:

- ampliar o módulo de respostas às dúvidas;
- fortalecer notificações internas;
- expandir o histórico de versões do projeto;
- evoluir indicadores de autoria;
- integrar recursos de feedback pedagógico com IA;
- refinar segurança, policies e validações no Supabase;
- amadurecer a arquitetura com limpeza de código legado e modularização adicional.

---

## Documentação complementar

Para entender melhor o contexto e a arquitetura do projeto, consultar:

- `docs/project-context.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/AGENTS.md`

---

## Repositório

- **Owner:** `rocha-carol`
- **Repositório:** `tca-hub`

---

## Observações finais

Este README foi estruturado para servir simultaneamente como:

- documentação técnica inicial da aplicação;
- visão funcional do MVP;
- relatório de apoio para avaliação do projeto.
