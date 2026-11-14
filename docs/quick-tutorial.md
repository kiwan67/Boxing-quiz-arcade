# Parte 15A.14 — tutorial rápido

Atualizado na Parte 15A.15: [juiz instrutor, textos completos e joinha](tutorial-instructor.md).
O documento vinculado descreve a implementação e validação atuais.

## Fluxo

O botão INICIAR LUTA do lobby mantém a dificuldade, reinicia os estados da
partida e abre PRONTO PARA LUTAR?. VER TUTORIAL abre cinco páginas; PULAR
TUTORIAL, disponível na pergunta e nas cinco páginas, chama a cutscene original.
Na última página, COMEÇAR LUTA executa o joinha de 2,1 s e só então chama `beginMatchIntro()`.
Cada nova entrada pelo lobby pergunta novamente. A revanche mantém seu fluxo
anterior, iniciando diretamente a cutscene.

O tutorial tem estado privado de apresentação, associado ao `matchId`, dentro
da fase protegida `lobby`. Isso reutiliza os bloqueios existentes de IA, golpes,
QTEs e relógio, sem mudar as regras desses sistemas. O lobby fica oculto e o
Canvas mostra o tutorial. A cutscene não começa por trás da interface. Reiniciar
a partida invalida a apresentação antiga pelo identificador da partida.

Os botões seguem a conversão existente entre coordenadas do mouse e Canvas
640×360. Há navegação opcional por Enter, setas esquerda/direita e Esc para pular.
Enter no último botão inicia a cutscene sem também acionar o atalho de pular intro.
Não foram adicionados atalhos de ataque.

## Conteúdo confirmado no código

Referências: `input.js`, `punchControls.js`, `punchTypes.js`, `punches.js`,
`combat.js`, `defense.js`, `counterRush.js` e `chainRules.js`.

- Selecionar Jab, Direto, Gancho ou Uppercut nos botões abaixo do ringue;
  clicar no Canvas com o botão esquerdo/direito executa o braço correspondente.
- Danos base confirmados: Jab 5, Direto 10, Gancho 15 e Uppercut 25.
  As linhas de dano e recarga leem diretamente `PUNCH_TYPES`.
- Jab não tem recarga; Direto, Gancho e Uppercut recarregam após 2, 3 e 5
  tentativas válidas com outros golpes. Esperar não reduz a recarga.
- Golpes comuns alternam uma tentativa sem pergunta e outra com pergunta;
  Uppercut sempre exige pergunta. As respostas são CERTO e ERRADO.
- Na defesa, escolher ESQUERDA/DIREITA e responder a pergunta são etapas distintas.
  Acertar ambas reduz 90% do dano e pode abrir Counter Rush; não concede invulnerabilidade.
- Rush usa uma janela especial e pergunta. A Chain pode chegar a quatro etapas,
  exigindo boas respostas e nova defesa perfeita para continuar.

Esses detalhes ajustaram as explicações genéricas do pedido para corresponder
ao combate real. Nenhum dano, temporizador, QTE, pergunta, regra de defesa,
recarga, IA ou especial foi modificado.

## Visual

Interface no Canvas 640×360, fonte bitmap e paleta existentes, texto principal
em escala 2 e botões grandes. As páginas 3 e 4 acomodam o texto completo com
espaçamento de 18 px. O juiz usa os atlas instrutores da Parte 15A.15 e o idle
neutro existente, em painel próprio, sem cobrir o texto. Não há voz nova,
dependências ou arena de treinamento. Pontuação sem glifo na fonte foi
substituída; os acentos portugueses usam a mesma grade pixel art.

## Arquivos

- Novos: `js/tutorial.js` (páginas, estado e navegação), `js/tutorialView.js` (Canvas).
- Alterados: `js/lobby.js`, `js/input.js`, `js/main.js`, `js/render.js`.
- Testes novos: `tests/tutorial.test.mjs`, `tests/tutorialBrowserChecks.mjs`.
- Testes atualizados: `tests/lobbyDifficulty.test.mjs`, `tests/matchIntro.test.mjs`,
  `tests/knockoutBrowser.mjs`.
- Este documento e evidências regeneradas em `tests/artifacts/`.

O módulo da cutscene `js/matchIntro.js`, os módulos de combate, sprites e áudio
foram preservados.

## Testes executados

`node --test tests/tutorial.test.mjs tests/lobbyDifficulty.test.mjs tests/offensiveAI.test.mjs tests/punches.test.mjs tests/counterRush.test.mjs tests/counterChain.test.mjs`

**51 passaram.** Cobrem conteúdo, páginas, navegação, mouse escalonado, teclado,
saída para a cutscene, dificuldade, proteção do combate, reinício, retorno ao
lobby e regressões de IA, golpes, Rush e Chain.

`node --test tests/matchIntro.test.mjs tests/ceremony.test.mjs tests/knockoutComplete.test.mjs`

**23 passaram e 3 falharam.** Persistem as três expectativas antigas de
voz/legendas da introdução já registradas na Parte 15A.11. A cutscene preservada
retorna legendas vazias e não inicia essas falas. Os testes de entrada nas três
dificuldades, duração, botão/Enter para pular, cerimônia e nocaute passaram.

`node --test tests/tutorial.test.mjs tests/lobbyDifficulty.test.mjs`

Reexecutado após o ajuste final de pontuação para a fonte bitmap: **14 passaram**.

`node tests/knockoutBrowser.mjs`

Validação no Chrome com mouse/teclado e Canvas reais: seis caminhos (pular ou
concluir em cada dificuldade), cinco testes de Esc nas páginas, botões de voltar,
cinco páginas, relógio e IA parados, dificuldade preservada, cutscene começando
em zero e terminando naturalmente, e primeiro golpe funcionando após a introdução.
Também executa a regressão existente de 20 combinações de nocaute a 30/60 FPS,
cerimônias, reinício e retorno ao lobby, além dos checks de camadas e hematomas.
Resultado: todas as verificações passaram, sem erros de execução ou console.

Relatório: `tests/artifacts/tutorial-browser-results.json`.
Capturas: `tutorial-prompt.png`, `tutorial-page-1.png` até `tutorial-page-5.png`
e `tutorial-original-intro.png`. As telas foram inspecionadas visualmente.
