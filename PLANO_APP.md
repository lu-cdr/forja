# Plano do app fitness — treino, medidas e progresso

Documento de planejamento para construir o app com o Claude Code. A ideia é começar pequeno (um MVP que você usa já na próxima semana de treino) e evoluir por fases.

## 1. Objetivo

Registrar treinos de forma rápida na academia e acompanhar a evolução física ao longo do tempo (cargas, volume, peso e medidas), com gráficos e estatísticas que mostrem se o ganho de massa magra está acontecendo.

**Usuário:** uma pessoa só (você), usando apenas no celular. Sem login, sem servidor, sem custo, sem distribuição nem venda por enquanto.

**Decisões já tomadas:**
- Uso só no celular, uma única instalação.
- Dados 100% locais, guardados no aparelho. Nada vai para a nuvem.
- Sem contas, sem sincronização entre aparelhos e sem publicação em loja de apps.

**Contexto do treino:** divisão de terça a sábado, ~50 min por treino, foco em hipertrofia, com fase de readaptação nas semanas 1 a 3 (ver `Treino_Hipertrofia.xlsx`).

## 2. Princípios

1. **Registrar uma série em poucos toques.** Se for chato, você para de usar. O app abre direto no treino do dia.
2. **Funcionar offline.** Academia costuma ter sinal ruim. Os dados ficam no aparelho primeiro.
3. **Mostrar o que importa:** progressão de carga e tendência de peso, não números soltos.
4. **Dados seus e exportáveis.** Como tudo fica só no celular, o backup é a única proteção contra perda de dados (trocar de aparelho, limpar dados do navegador). Exportar/importar JSON entra já no MVP, com um lembrete periódico de backup.

## 3. Funcionalidades

### MVP (fase 1 e 2)
- **Treino do dia:** abre o treino do dia da semana com a lista de exercícios, séries e repetições alvo.
- **Registro de séries:** para cada série, carga (kg) e repetições. Preenche automaticamente com os valores da última vez.
- **Timer de descanso:** inicia ao concluir uma série, usando o descanso definido para o exercício.
- **Histórico:** lista de treinos feitos e detalhe de cada um.
- **Medidas corporais:** peso, % de gordura (opcional), cintura, abdômen, quadril, peito, braços, coxas e panturrilha, com data.
- **Gráficos:** evolução de peso e de cada medida; evolução de carga por exercício.

### Fase 3 em diante
- **Estatísticas:** recordes pessoais, volume semanal por grupo muscular, frequência e sequência de treinos.
- **Fases do plano:** semanas 1–3 (readaptação) e 4+ com séries diferentes, mais semana de deload.
- **Sugestão de progressão:** quando bater o topo das repetições em todas as séries, sugerir aumentar a carga.
- **Fotos de progresso** (guardadas no aparelho).
- **Editar o plano:** trocar exercícios, séries e dias.
- **Lembrete de backup:** avisar se faz mais de 2 semanas sem exportar os dados.

## 4. Estatísticas e cálculos

| Métrica | Como calcular |
|---|---|
| Volume de uma série | carga × repetições |
| Volume semanal por grupo | soma do volume das séries dos exercícios de cada grupo na semana |
| 1RM estimado | fórmula de Epley: carga × (1 + reps / 30) |
| Recorde pessoal (PR) | maior 1RM estimado ou maior carga por exercício |
| Tendência de peso | média móvel de 7 dias (suaviza a oscilação diária) |
| Ritmo de ganho | variação da média móvel por semana; referência de ganho magro: ~0,25 a 0,5% do peso corporal por semana |
| IMC | peso / altura² |
| Massa magra estimada | peso × (1 − % de gordura), só se o % de gordura for informado; vale como tendência, não como valor exato |
| Variação de medidas | diferença para a primeira medição e para a anterior |
| Aderência | treinos feitos ÷ treinos planejados na semana |

Observação: % de gordura por balança ou adipômetro tem margem de erro. Use sempre a mesma forma de medir e olhe a tendência.

## 5. Telas

1. **Hoje:** treino do dia, botão "Iniciar", resumo da semana.
2. **Treino ativo:** exercício atual, séries, campos de carga e reps, timer de descanso, botão "Concluir treino".
3. **Histórico:** calendário/lista de treinos; toque para ver os detalhes.
4. **Progresso:** gráficos de carga por exercício, volume semanal, peso e medidas, com seletor de período.
5. **Medidas:** formulário de nova medição e linha do tempo.
6. **Plano:** dias, exercícios, séries e repetições (editável na fase 3).
7. **Ajustes:** perfil (altura, peso inicial), unidades, exportar/importar dados.

## 6. Modelo de dados

```
Profile            id, heightCm, birthDate, startWeightKg, goal
Exercise           id, name, muscleGroup, equipment, isCompound
PlanDay            id, weekday (2..6), name            -- "Peito + tríceps"
PlanExercise       id, planDayId, exerciseId, order, setsPhase1, setsPhase2,
                   repMin, repMax, restSeconds
WorkoutSession     id, planDayId, date, startedAt, finishedAt, notes
SetLog             id, sessionId, exerciseId, setNumber, weightKg, reps, rpe?, isWarmup
BodyMeasurement    id, date, weightKg, bodyFatPct?, waistCm?, abdomenCm?, hipCm?,
                   chestCm?, armRCm?, armLCm?, thighRCm?, thighLCm?, calfCm?, notes?
ProgressPhoto      id, date, blob, angle              -- fase 3
```

Os dados iniciais (exercícios e plano) vêm do `Treino_Hipertrofia.xlsx`: um script de seed cria `PlanDay`, `PlanExercise` e `Exercise` a partir dele.

## 7. Stack sugerida

**Web app instalável no celular (PWA), com dados locais.** Roda no navegador do celular, funciona offline e não exige loja de apps.

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | React + TypeScript com Vite | Rápido de iniciar, o Claude Code domina bem |
| Estilo | Tailwind CSS | Interface mobile-first sem muito CSS |
| Dados locais | IndexedDB com Dexie | Armazenamento offline robusto, com consultas simples |
| Gráficos | Recharts | Simples e suficiente para linhas e barras |
| PWA | vite-plugin-pwa | Instalável na tela inicial e com cache offline |
| Testes | Vitest | Principalmente para os cálculos de estatística |
| Hospedagem | Vercel, Netlify ou GitHub Pages (plano gratuito) | Só serve os arquivos do app; os dados nunca saem do celular |

**Como instalar no celular, sem distribuir:**
- O app é só um conjunto de arquivos estáticos. Hospedar num serviço gratuito dá um link que você abre no celular e instala na tela inicial ("Adicionar à tela de início"). Não há banco de dados nem servidor seu: o link serve apenas o código, e seus treinos e medidas ficam só no aparelho. Não é preciso divulgar o link.
- Alternativa sem hospedar: rodar no computador e abrir pelo Wi-Fi. Funciona para testar, mas a instalação como app e o modo offline exigem endereço seguro (HTTPS), então para o uso do dia a dia a hospedagem estática é mais prática.

**Cuidados com dados locais no celular:**
- **Instalar na tela inicial** (iPhone: Safari → Compartilhar → Adicionar à Tela de Início). No iPhone, sites usados só pelo navegador podem ter o armazenamento apagado depois de uns dias sem uso; app instalado na tela inicial é mais seguro.
- **Pedir armazenamento persistente** (`navigator.storage.persist()`) na primeira abertura, para o navegador não limpar os dados por falta de espaço.
- **Não limpar dados do navegador** e **exportar o backup JSON** com frequência (por exemplo, todo sábado depois do treino). Salvar o arquivo no Google Drive ou no iCloud.

**Alternativa:** se mais tarde quiser app nativo, dá para migrar para React Native/Expo reaproveitando a lógica de cálculo. Por isso os cálculos ficam isolados em `domain/` (ver CLAUDE.md).

## 8. Roadmap

| Fase | Entrega | Resultado |
|---|---|---|
| 0 | Projeto criado, PWA vazia publicada, seed do plano | Abre no celular |
| 1 | Treino do dia + registro de séries + timer + histórico | Já dá para treinar usando o app |
| 2 | Medidas corporais + gráficos de peso/medidas/carga | Acompanha a mudança física |
| 3 | Estatísticas (PRs, volume, aderência), fases do plano, editar plano | Insights e controle |
| 4 | Fotos de progresso e lembrete de backup | Registro visual e segurança dos dados |

Exportar/importar JSON entra na Fase 1 (junto com o primeiro registro de treino), porque os dados só existem no celular.

## 9. Como conduzir no Claude Code

1. Crie uma pasta (`fitapp`), coloque nela este arquivo, o `CLAUDE.md` e o `Treino_Hipertrofia.xlsx`, e abra o Claude Code dentro dela.
2. Peça uma fase por vez, sempre com um critério de "pronto". Sugestões de prompt:

**Fase 0**
> Leia o CLAUDE.md e o PLANO_APP.md. Crie o projeto com Vite + React + TypeScript + Tailwind, configure como PWA e prepare a estrutura de pastas descrita. Depois escreva um script de seed que leia o Treino_Hipertrofia.xlsx e gere os dados iniciais do plano. Rode o app e confirme que abre.

**Fase 1**
> Implemente as telas Hoje e Treino ativo conforme o PLANO_APP.md: abrir o treino do dia da semana, registrar carga e reps por série (preenchendo com os valores da última sessão), timer de descanso e salvar a sessão no IndexedDB. Peça armazenamento persistente (`navigator.storage.persist()`) na primeira abertura. Adicione exportar e importar todos os dados em JSON na tela de Ajustes. Escreva testes para a lógica de dados, incluindo o ciclo exportar → importar.

**Fase 2**
> Implemente a tela de Medidas e a tela de Progresso com gráficos de peso (com média móvel de 7 dias), cada medida e carga por exercício. Use dados de exemplo para eu ver os gráficos funcionando antes de ter histórico real.

**Fase 3**
> Implemente as estatísticas da seção 4 do PLANO_APP.md em funções puras com testes (Vitest), e as telas que as mostram. Implemente também a edição do plano (trocar exercícios, séries e dias) e a troca automática de fase (semanas 1–3 e semana 4 em diante).

3. Depois de cada fase: rodar os testes, abrir no celular, usar de verdade num treino e anotar o que atrapalhou. O uso real vale mais do que qualquer planejamento.

## 10. Decisões em aberto

**Já definido:** uso só no celular, dados locais, sem sincronização, sem login, sem distribuição. Idioma português e unidades kg/cm.

**Ainda em aberto:**
- **Qual celular?** iPhone ou Android. Muda detalhes da instalação e do armazenamento local (ver seção 7).
- **Onde guardar o backup:** Google Drive, iCloud ou outro lugar de sua preferência.
- **Aparência:** quer um visual próprio (cores, estilo)? Dá para desenhar as telas antes de implementar.
- **Registrar RPE** (esforço percebido) nas séries, ou manter o registro simples (só carga e reps)?

## 11. Publicar como web app para amigos (planejado em 03/10/2026)

**Ideia central:** continuar sem servidor nem contas. O site só entrega o código; cada pessoa tem os próprios dados no próprio celular.
Publicar num host estático com HTTPS resolve de uma vez: instalação de verdade (Android e iPhone), modo offline sem a flag
do Chrome e atualização automática para todos.

**Hospedagem recomendada:** GitHub (repositório) + Cloudflare Pages, gratuito, com deploy automático a cada `git push` e
endereço `https://<nome>.pages.dev`. Alternativa equivalente: Netlify. Domínio próprio é opcional.

**O que precisa mudar antes de compartilhar (Fase A, no app):**
1. **Primeira abertura (onboarding):** hoje o app nasce com os dados do dono (perfil, data de início, pesagem inicial
   e o seu plano). Para outra pessoa: tela de boas-vindas pedindo altura, peso e data de início, e a escolha do plano.
2. **Modelos de plano:** "Hipertrofia Ter–Sáb" (o seu, sem dados pessoais), mais 2 ou 3 modelos comuns (ex.: Full body 3×,
   Superior/Inferior 4×) e "Montar do zero". A edição de plano já existe.
3. **Guia de instalação na tela:** Android (Chrome → Instalar app) e iPhone (Safari → Compartilhar → Adicionar à Tela de
   Início), com aviso de backup. No iPhone, sem instalar, o Safari pode apagar os dados após dias sem uso.
4. **Aviso de nova versão** ("Atualizar agora") e **página Sobre**: privacidade (nada sai do aparelho) e aviso de saúde
   (o app não substitui orientação profissional).
5. **Mais cuidado com migrações:** um erro agora afetaria os dados dos amigos. Toda mudança de esquema com migração Dexie
   versionada e teste com dados reais (como a v2 do retrato do plano).
6. Atualizar o escopo no `CLAUDE.md` ("sem distribuição" passa a "distribuição gratuita para amigos, sem backend").

**Publicar (Fase B):** `git init`, repositório no GitHub, conectar ao Cloudflare Pages (build `npm run build`, pasta `dist`),
testar o link num Android e num iPhone.

**Migrar os seus dados (Fase C), atenção:** o endereço novo é outra "origem", e o navegador NÃO leva os dados do
endereço local antigo (`http://<IP do PC>:4173`) para lá. Passo a passo: no app atual, Ajustes → Exportar → no app publicado, Ajustes → Importar →
conferir histórico e nível → só então aposentar o servidor local.

**Convidar (Fase D):** mandar o link e um mini guia (instalar, fazer backup no Drive/iCloud).

**Limites que continuam (e tudo bem):** sem sincronização entre aparelhos (trocar de celular = backup e importação); sem
ranking entre amigos (exigiria servidor). Ideia sem servidor para o lado social: botão "Compartilhar meu ferreiro" que gera
uma imagem com nível, patente e conquistas para mandar no WhatsApp.

**Custo:** R$ 0 (domínio próprio opcional, cerca de R$ 40/ano para `.com.br`).
