# CLAUDE.md — App fitness (treino + medidas + progresso)

Leia o `PLANO_APP.md` antes de qualquer trabalho: ele tem o escopo, o modelo de dados, as telas e o roadmap. Os dados iniciais do plano de treino estão em `Treino_Hipertrofia.xlsx`.

## Projeto

App para registrar treinos de musculação e acompanhar a mudança física (peso, medidas corporais, cargas) com gráficos e estatísticas, gamificado como RPG. Uso no celular, na academia. Publicado como web app estático para o dono e alguns amigos (Android e iPhone).

**Escopo fechado:** dados 100% locais no aparelho de cada pessoa, sem login, sem backend, sem sincronização entre aparelhos, sem venda. Distribuição só como site estático gratuito (o host entrega o código; nenhum dado sai do aparelho). Não adicionar serviços de nuvem, contas, analytics ou telemetria.

**Outras pessoas usam o app:** nada pessoal no código (perfil e medidas vêm da tela de boas-vindas); toda mudança de dados precisa de migração Dexie versionada com teste; nunca recarregar o app sozinho (o aviso de versão nova pergunta).

## Stack

- React + TypeScript (Vite), Tailwind CSS
- IndexedDB via Dexie (dados locais, offline-first)
- Recharts para gráficos
- vite-plugin-pwa (instalável no celular)
- Vitest para testes

## Estrutura de pastas

```
src/
  db/           # esquema Dexie e acesso a dados (única camada que fala com o IndexedDB)
  domain/       # tipos e cálculos puros (volume, 1RM, média móvel, IMC...) — sem React
  features/     # telas por área: today, workout, history, progress, measurements, plan, settings
  components/   # componentes de UI reutilizáveis
  seed/         # dados iniciais do plano
scripts/        # utilitários (ex.: gerar seed a partir do .xlsx)
```

## Convenções

- **Mobile-first.** Projete para tela de ~380px primeiro; alvos de toque grandes (mín. 44px).
- **Cálculos em `domain/` como funções puras, com testes.** Nada de lógica de estatística dentro de componentes.
- **Acesso a dados só por `db/`.** Componentes não importam Dexie diretamente; isso mantém o armazenamento isolado e fácil de testar ou trocar.
- **Unidades:** kg e cm, armazenados como números; datas como ISO (`YYYY-MM-DD`) para medidas e ISO completo para sessões.
- **Idioma da interface:** português do Brasil. Código e nomes de variáveis em inglês.
- **Offline primeiro:** nada deve depender de internet para registrar um treino.
- Mudanças pequenas e verificáveis: uma fase do roadmap por vez.

## Comandos

```
npm install        # instalar dependências
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run test       # testes (Vitest)
npm run lint       # lint
npm run seed       # regenera src/seed/plan.generated.ts a partir do .xlsx
npm run icons      # regenera os ícones PNG (iPhone/Android) a partir de public/icon.svg
npm run celular    # build + servidor na rede local (porta 4173) para o Android
```

O celular é **Android** (Chrome), usando o app instalado a partir de `http://<IP do PC>:4173` com a flag
`unsafely-treat-insecure-origin-as-secure`. Não mudar a porta 4173: os dados do celular estão presos a essa origem.
Mudou o plano-semente? Suba `SEED_VERSION` no script; `ensureSeeded` troca o plano sem tocar em treinos e medidas,
exceto se `profile.planCustomized` (plano editado no app via `src/db/planEdit.ts`): aí a planilha nunca sobrescreve.
Dias removidos do plano são arquivados (`archived`), nunca apagados, para o histórico manter o nome.

## Definição de pronto (para cada entrega)

1. Testes passando (`npm run test`) e build sem erros.
2. Testado no tamanho de tela de celular.
3. Funciona offline depois da primeira carga.
4. Dados persistem ao recarregar a página.

## Cuidados

- Não apagar nem sobrescrever dados do usuário em migrações; criar migração versionada no Dexie.
- **Os dados só existem no celular.** Perder o armazenamento do navegador significa perder tudo. Por isso:
  - pedir armazenamento persistente (`navigator.storage.persist()`) na primeira abertura;
  - manter exportar/importar JSON sempre funcionando, com teste do ciclo exportar → importar;
  - lembrar o usuário de fazer backup se passar mais de 2 semanas sem exportar.
- % de gordura e massa magra são estimativas: mostrar como tendência, com aviso discreto.

## Gamificação (RPG da Forja)

- Regras em `src/domain/game.ts` (XP, curva de níveis, patentes, conquistas, atributos, missões), com testes.
- **Recordes em duas trilhas** (`setScore`/`bestScores`/`beatsRecord` em `domain/calc.ts`): série com carga pelo 1RM
  estimado; sem carga (peso do corpo, prancha) pelas repetições/segundos. Use sempre essas funções, nunca `epley1RM` direto.
  Aquecimento (`isWarmup`) não conta para XP, volume nem recorde.
- **Agenda:** `profile.schedule` "weekly" (padrão, dia da semana) ou "rotation" (sequência A→B→C; a ordem é a dos
  dias da semana, e reordenar troca o dia entre vizinhos). `daysPerWeek` dá a meta de treinos por semana nos dois casos.
- **Treino de hoje** = `buildWorkout` (`domain/session.ts`): plano + `session.swaps` (troca só hoje) + `extraExercises`
  + exercícios com séries fora da lista. Campos novos opcionais: ausentes = comportamento antigo (sem migração).
- **XP é sempre derivado do histórico** (treinos, séries, medidas). Não persistir XP/nível no banco: assim apagar/editar
  treino recalcula tudo e o backup continua sendo só dados brutos. Mudar as regras reajusta o nível de todo mundo.
- Mascote: ferreiro em pixel art da primeira versão (48×44, com bigorna e chão) em `src/components/sprites/art/smith.ts`,
  escolhido pelo dono depois de testar um 16 bits e um arcade desenhado à mão (estão no histórico do git, commit 97c33b6).
  Patente 0–4 muda proporções e equipamento; `frame` 0 = martelo erguido, 1 = martelada (2 quadros animados por CSS em `index.css`);
  `hammer: false` = ficha de medidas (de pé, recorte FICHA_W×FICHA_H, sem bigorna).
  Personalização por troca de paleta (`art/palette.ts`); careca/sem barba/orc mudam o desenho. `measureAnchors` dá os
  pontos do corpo da ficha de medidas (há teste garantindo que caem sobre o corpo).
- Laboratório de sprites (só em dev): `#/lab/sprites`.
- Visual: fonte Pixelify Sans (títulos/números), paleta de forja em `src/index.css`, classes `.frame`/`.frame-gold`.