# Forja

Registro de treinos de musculação com cara de RPG: cada treino rende XP para o seu ferreiro, que sobe de nível,
ganha conquistas e fica mais forte (Aprendiz → Ferreiro → Ferreiro de Aço → Mestre Ferreiro → Lenda da Forja).

- Registro rápido de séries, com os valores da última vez já preenchidos, timer de descanso e recordes.
- Peso, medidas corporais, gráficos de evolução e estatísticas.
- Plano editável, com modelos prontos (5 dias, superior/inferior, empurrar/puxar/pernas, corpo inteiro ou do zero).
- **Sem conta e sem servidor:** os dados ficam só no aparelho de cada pessoa (IndexedDB). Exportar/importar JSON para backup.
- Funciona offline e instala como app no Android e no iPhone (PWA).

## Usar

Abra o endereço publicado no celular e siga a tela de boas-vindas:

- **Android (Chrome):** menu ⋮ → **Instalar app**.
- **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**. Use sempre pelo ícone: no iPhone, sites que não
  estão na tela de início podem ter os dados apagados depois de alguns dias sem uso.

Faça backup de vez em quando em **Ajustes → Exportar** e guarde no Google Drive ou iCloud. Trocar de celular ou limpar
os dados do navegador apaga tudo; o backup traz de volta (**Importar**, ou "Já uso a Forja" na boas-vindas).

## Desenvolvimento

React + TypeScript (Vite), Tailwind, Dexie (IndexedDB), Recharts, vite-plugin-pwa, Vitest.

```
npm install
npm run dev      # http://localhost:5173 (também na rede local)
npm run test     # testes (Vitest)
npm run lint
npm run build    # build de produção em dist/
```

- `npm run seed` regenera o modelo "Hipertrofia 5 dias" a partir de uma planilha local (`Treino_Hipertrofia.xlsx`, fora do
  repositório). Os outros modelos ficam em `src/seed/templates.ts`.
- Regras do RPG (XP, níveis, conquistas): `src/domain/game.ts`. O mascote é pixel art gerada em
  `src/components/sprites/smith.ts`.

## Publicação

Cada `git push` na `main` roda os testes e publica no GitHub Pages (`.github/workflows/deploy.yml`). O build usa
`BASE_PATH=/<nome-do-repositório>/`. Os usuários recebem um aviso "Tem versão nova" e atualizam com um toque.
