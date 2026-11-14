# Counter Rush — Parte 12D

Uma defesa abre a oportunidade somente depois do impacto e da recuperação do
adversário: lado correto, resposta correta, impacto registrado e ataque inimigo
sem erro natural. O dano defensivo de 10% continua sendo aplicado. O identificador
da defesa impede uma segunda oportunidade pela mesma sequência.

`counterRush.js` centraliza cutscene de 3 s, janela de 2,5 s, QTE de 5 s e multiplicador 1,5.
A sequência começa em `counter_rush_cutscene`, passa por `counter_rush_flash`,
e só então libera `counter_rush_window`, `counter_rush_qte` e
`counter_rush_resolution`, em `playerCombat.state`. Não há outro loop de animação.
Durante a cutscene e o flash, o contador da janela permanece em zero e nenhum
QTE especial é aberto. Ver `counter-rush-cutscene.md` para a renderização e os testes.

Na janela, o mouse escolhe o braço: esquerdo na esquerda visual, direito na
direita. O golpe vem da seleção atual e precisa estar disponível. É possível
selecionar outro botão, sem consumir turnos. Somente iniciar o QTE especial
consome uma tentativa: diminui outros contadores uma vez, aplica a recarga do
golpe escolhido e mantém Jab em zero. Janela expirada não consome tentativa.

O QTE reutiliza as alternativas, validação, debug e fábrica provisória existentes.
O enunciado de teste é CERTO OU ERRADO?, com resposta provisória alternada,
sem banco educacional definitivo. Tipo e braço ficam registrados até o fim.
Acertar libera o soco; erro ou timeout apenas perde a oportunidade. O caminho
especial não cria risco nem novo contra-ataque inimigo.

A resolução especial pula completamente a esquiva: sorteia apenas bloqueio.
Ataques normais continuam com esquiva de 15% e a ordem anterior. O dano base do
golpe é multiplicado uma única vez por 1,5: 7,5 / 15 / 22,5 / 37,5 HP.
O bloqueio mantém suas chances de 5% / 10% / 20% / 30% e conserva somente 25%
do dano: 1,875 / 3,75 / 5,625 / 9,375 HP. Se não bloquear, o golpe acerta. O impacto
mantém seu registro único; tipos e danos normais não são modificados.

## Flash e monocromático

`js/counterRushEffects.js` controla um flash branco único de 120 ms após a cutscene
e antes da janela, com opacidade inicial de 60% e redução gradual. A configuração
`counterRushEffectsConfig` permite reduzir `flashOpacity`, alterar `flashDuration`
ou desativar `flashEnabled`; o indicador textual continua disponível.
Depois do flash, um único filtro CSS `grayscale(1)` é aplicado ao Canvas inteiro.
Assim, cenário, público, personagens, perguntas e relógios ficam monocromáticos,
preservando o contraste entre fundos escuros e textos claros. Os botões HTML
externos ao Canvas não são filtrados. O efeito acompanha janela, QTE e resolução
até concluir o golpe; não se aplica ao cooldown nem a ações comuns.

Não há leitura/escrita de pixels por frame nem novos canvases, loops ou timers.
O filtro anterior é preservado e nunca se concatena novamente por frame.
Falha, expiração, conclusão, vitória/derrota e reinício restauram o filtro
original. O reinício e o encerramento fazem essa limpeza imediatamente.
Pausa congela o flash. Não há transição CSS pendente após o encerramento.

O golpe geométrico conserva comprimentos e tempos, com maior movimento discreto
do tronco. A reação existente do adversário e um brilho pixelado breve marcam o
impacto. Janela, QTE e feedback usam camadas temporárias, sem redesenhar a HUD.

O cooldown geral fica suspenso durante o especial. Após concluir, errar ou deixar
passar a janela, começa um novo intervalo de 2 s. O relógio ofensivo da IA é
reagendado e não acumula ataques durante a introdução ou os estados especiais. Vitória/derrota cancela
o especial; reinício limpa identificador, perguntas e temporizadores.

## Arquivos

Criados: `js/counterRush.js`, `js/counterRushView.js`,
`tests/counterRush.test.mjs` e este documento.

Integração: `js/gameState.js`, `js/qte.js`, `js/questions.js`,
`js/counterAttack.js`, `js/combat.js`, `js/ai.js`, `js/input.js`,
`js/qteView.js`, `js/match.js`, `js/render.js`, `js/characters.js`,
`js/hud.js`, `js/attackFeedback.js`.
O ajuste visual acrescenta `js/counterRushEffects.js` e
`tests/counterRushEffects.test.mjs`, com integração adicional nos módulos
de ciclo de vida já listados.

Regressões ajustadas: `tests/helpers/fight.mjs`, `tests/actionFlow.test.mjs`,
`tests/cooldownOnly.test.mjs`, `tests/offensiveAI.test.mjs`,
`tests/risk.test.mjs`, `tests/punches.test.mjs`, `tests/turnRecovery.test.mjs`
e `tests/combat.test.mjs`. As regressões anteriores deixam a janela expirar
antes de conferir o cooldown; a suíte nova usa o fluxo completo, sem esse helper.

## Testes

`node --test boxing-quiz/tests/*.test.mjs` verifica ativação exclusiva, duas
direções, quatro golpes, janela e QTE exatos, falhas, ausência de risco,
bloqueio especial e esquiva normal, turnos, cooldown, exclusão de ataques simultâneos, pausa,
quadros lentos, impacto único, vitória, derrota, reinício e dano normal restaurado.
O teste de mouse também verifica o clique inicial isolado, desenho sem recortes,
flash único, filtro no renderer, alternativas visíveis e limpeza do CSS.
Os testes de efeitos cobrem 120 ms, redução/desativação, restauração em cada saída,
filtros prévios e ausência de atribuições CSS repetidas quando o estado não muda.
DOM e Canvas são simulados: aparência e console em navegador real permanecem
pendentes de conferência manual, assim como uma medição de FPS em navegador real.
