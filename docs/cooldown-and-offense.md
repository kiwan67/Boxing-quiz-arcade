# Countdown e IA ofensiva independente — Parte 11

Escopo atual: [Parte 11B](independent-offense.md). O agendamento ofensivo está
ativo por padrão, junto da recuperação de 2 segundos implementada na Parte 11A.

`cooldown.js` define `PLAYER_ACTION_COOLDOWN = 2.0`. Ao terminar completamente
o soco do jogador ou a recuperação do adversário, o jogador entra em
`action_cooldown`. Cliques não abrem ataques nem reiniciam o contador.
Falhas no QTE passam primeiro por mensagem, defesa e recuperação do adversário;
só então iniciam os dois segundos. Os tempos excedentes de um quadro lento
são contabilizados depois do término da animação, sem valores negativos.

`cooldownView.js` mostra RECUPERANDO..., segundos e progresso, em um painel
temporário no canto inferior esquerdo, sem redesenhar a HUD. Ao terminar,
mostra LUTAR! por 0,5 s. As poses permanecem em repouso durante o countdown.

`ai.js` define `AI_ATTACK_INTERVAL_MIN = 4.0` e `AI_ATTACK_INTERVAL_MAX = 7.0`.
Um único sorteio define cada intervalo. O relógio representa uma oportunidade:
quando vence, fica em zero enquanto o combate estiver ocupado, sem acumular
golpes. Depois de uma sequência defensiva/ofensiva do adversário, o próximo
intervalo é sorteado novamente. O relógio fica suspenso nessa sequência.

A IA pode iniciar um ataque apenas com jogador em idle ou countdown,
adversário em idle, sem QTE, pendência ou reação de impacto. Acertar perguntas
não desativa essa IA; receber um golpe também não força um contra-ataque.
O sorteio de esquiva de 15% permanece separado e inalterado.

Ataques espontâneos usam `beginSpontaneousAttack`, em `counterAttack.js`,
reaproveitando preparação, escolha aleatória do braço, defesa de 3 s,
pergunta de 10 s, impacto único, cálculo de dano e recuperação existentes.
`counterAttack.source` distingue `spontaneous` de `qte_failure`. IDs únicos
incluem a geração da luta e uma sequência. Não há outro QTE defensivo.

Se um ataque espontâneo começar durante o countdown, a mudança para o estado
defensivo suspende o valor restante. Ao concluir toda a defesa, o contador
recomeça com dois segundos completos. O estado de defesa sempre prevalece.

`updateCombat` organiza a atualização: encerramento da luta, relógio de
oportunidades, sequência de combate/defesa, cooldown e decisão segura da IA.
Uma decisão ofensiva nunca consome o mesmo deltaTime no QTE recém-aberto.
Só existe o requestAnimationFrame anterior; nenhum timer independente foi criado.

Vitória/derrota limpam countdown e relógio ofensivo. Reinício restaura ambos,
sem novos listeners ou loops. Vida, dano, tipos de soco e perguntas mantêm
os valores anteriores. Nenhuma mecânica posterior foi implementada.

Testes: `node --test boxing-quiz/tests/*.test.mjs`. A suíte `actionFlow` testa
os novos fluxos com os relógios reais. Regressões anteriores posicionam a
próxima oportunidade ofensiva longe para isolar golpes/QTEs, e resolvem o
cooldown antes de iniciar a próxima ação. DOM e Canvas são simulados;
naturalidade visual, interação física e console precisam de conferência no navegador.
