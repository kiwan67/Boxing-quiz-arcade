# Defesa e cálculo de dano — Parte 9

Após uma falha de ataque, a mensagem existente permanece por 0,9 s.
Ao iniciar a preparação do contra-ataque, o jogador entra em
`defense_direction_qte`, com 3,0 s. Clique esquerdo escolhe o lado visual
esquerdo; clique direito escolhe o direito, independentemente da posição
do cursor dentro do Canvas. O mesmo evento não responde à próxima pergunta.

`defenseSideForCounterArm` converte a anatomia frontal: braço anatômico
esquerdo do adversário exige defesa visual direita, e vice-versa.
Não há inversão nas animações ou nos controles de ataque.

A escolha, ou seu timeout, abre `defense_question_qte`, com enunciado vazio,
CERTO/ERRADO e limite de 10 s. O provedor de perguntas provisórias é o mesmo
do ataque; IDs e o campo `kind` distinguem ataque e defesa. As respostas
continuam alternadas por QTE. `DEBUG_QTE` em `questions.js` controla a dica.
O botão direito não responde à pergunta. A falta de direção registra erro
da primeira fase, sem impedir que a pergunta reduza parcialmente o dano.

`damage.js` exporta `calculateDefenseDamage(sideCorrect, questionCorrect,
baseDamage)`. O valor base está configurado inicialmente como 20 em
`defenseConfig.baseDamage`, no módulo `defense.js`.

| Lado | Pergunta | Percentual | Dano base 20 |
| --- | --- | --- | --- |
| Correto | Correta | 10% | 2 |
| Correto | Errada/timeout | 25% | 5 |
| Errado/timeout | Correta | 50% | 10 |
| Errado/timeout | Errada/timeout | 100% | 20 |

A função é pura e não altera vida. O resultado é calculado uma única vez
em `gameState.defense.result`. Após o evento único de impacto, ele recebe
`impactId`, `impactAt`, `impactRegistered: true` e é publicado também em
`gameState.defense.lastResult`. Este último preserva o último impacto enquanto
uma nova defesa começa. Desde a Parte 10, esse evento também aplica o dano
calculado à vida, uma única vez. Não há histórico ilimitado.

Enquanto os QTEs estiverem abertos, o contra-ataque permanece pendente e sua
preparação avança apenas até 0,12 s. Depois fica retida: extensão zero e nenhum
impacto. Após resolver a defesa, a animação retoma desse ponto. O relógio
registra o tempo de espera em `counterAttack.pausedDuration`, preservando os
horários lógicos de impacto e término. Quadros lentos podem atravessar as fases
sem duplicar o cálculo ou o evento. Tudo usa o loop e o deltaTime existentes.

A guarda lateral usa os clipes `block_left`/`block_right` já reservados.
O braço escolhido sobe até três pixels locais e desloca um pixel para fora,
com transição de 0,1 s. Os segmentos mantêm seus comprimentos. Após o impacto,
a guarda volta ao normal. Sem escolha, a guarda fica neutra.

A interface mostra DEFESA PERFEITA!, DEFESA PARCIAL! ou DEFESA FALHOU!,
mais o percentual calculado, por um intervalo breve. Nenhuma barra é alterada.
Cenário, HUD, cronômetro, socos e esquivas de 15% permanecem preservados.

Testes: `node --test boxing-quiz/tests/*.test.mjs` na raiz do workspace.
Os testes automatizados usam DOM/Canvas simulados. Abertura, cliques físicos,
naturalidade visual e console real ainda precisam de validação no navegador.
