# Contra-ataques — Parte 8

Somente erro e timeout do QTE de ataque agendam um contra-ataque.
`counterAttack.js` mantém a lógica sem Canvas ou dependência dos personagens.
`characters.js` traduz os estados para os clipes `counter_left` e
`counter_right` e compõe a animação geométrica provisória.

O feedback `qte_failed` existente permanece por 0,9 s. Depois, o adversário
percorre `counter_preparing` (0,12 s), `counter_attacking` (avanço de 0,12 s
e retorno de 0,16 s) e `counter_recovering` (0,15 s), totalizando 0,55 s.
A mensagem CONTRA-ATAQUE! dura essa sequência e desaparece ao final.

`opponentCombat.state` é a autoridade da fase do adversário. O jogador fica
em `counter_wait`, apenas um bloqueio de entrada, sem repetir os estados ou
os relógios do adversário. `opponentCombat.elapsed` controla todas as fases.
Não há temporizadores ou loops novos. Quadros longos preservam o tempo
excedente da mensagem de erro e produzem no máximo um impacto.

O braço é sorteado uma vez ao agendar: `Math.random() < 0.5` seleciona o
esquerdo anatômico, caso contrário o direito. Como o rival olha para a câmera,
o braço esquerdo é desenhado à direita da imagem e o direito à esquerda.
O braço não muda durante a sequência. Os segmentos geométricos mantêm os
comprimentos e a luva avança moderadamente para baixo na imagem, em direção
ao jogador. Tronco e ombro acompanham o gesto; a posição base não muda.

`gameState.counterAttack` contém `pending`, `side`, `questionId`, `startedAt`,
`finishedAt`, `impactResolved` e `lastImpact`. `isCounterActive()` consulta o
estado do adversário, sem um segundo indicador de atividade independente.
O ID do QTE impede reagendamento da mesma falha.

`onCounterImpact(callback)` assina o evento lógico e retorna uma função para
cancelar a assinatura. Em 0,24 s de animação, o evento entrega `{id, questionId,
side, at}` uma única vez; a mesma informação fica em `lastImpact`. O horário
usa segundos do relógio lógico `gameTime`. Em um quadro lento, o evento ainda
registra o instante previsto do impacto, mesmo que a animação já tenha acabado.
Nenhum assinante que aplique dano ou defesa foi implementado nesta etapa.

Acertos do jogador continuam liberando socos e a decisão de esquiva de 15%.
Esquivas nunca agendam contra-ataques. A IA de esquiva só atualiza estados
`dodge_*`, preservando o relógio e os estados dos contra-ataques.

Testes: `node --test boxing-quiz/tests/*.test.mjs`. Os testes usam DOM/Canvas
simulados. Naturalidade visual, cliques físicos e console real permanecem
pendentes de verificação no navegador.
