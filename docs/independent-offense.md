# IA ofensiva independente — Parte 11B

`offensiveAIConfig.enabled` agora inicia como `true`. A implementação preparada
anteriormente é reutilizada, sem novo combate, tipo de golpe ou QTE defensivo.

`ENEMY_ATTACK_INTERVAL_MIN = 4.0` e `ENEMY_ATTACK_INTERVAL_MAX = 7.0`, em `ai.js`,
definem o sorteio. O primeiro update de uma luta sorteia o intervalo e passa
a consumi-lo por deltaTime, sem depender de cliques ou erros do jogador.
Os nomes anteriores `AI_ATTACK_INTERVAL_MIN/MAX` continuam como aliases.

Ao vencer, a oportunidade aguarda um estado seguro: jogador em idle ou
countdown, rival em idle, sem QTE, golpe, esquiva, reação ou ataque pendente.
Não há fila de ataques. Pausa e encerramento impedem a atualização e o início.

`beginSpontaneousAttack` reutiliza a escolha aleatória de braço, preparação,
defesa lateral de 3 s, pergunta de 10 s, cálculo defensivo, impacto único e
recuperação. A origem é registrada como `spontaneous`; falhas do jogador
continuam usando `qte_failure`. As duas origens não se sobrepõem.

Um ataque durante o countdown suspende seu valor. Após concluir toda a defesa,
o jogador recebe um novo período completo de 2 s. A reação a um golpe recebido
bloqueia oportunidades até terminar; ela não força um contra-ataque.

Durante a sequência inimiga o relógio ofensivo fica suspenso e sem oportunidade
acumulada. No primeiro update disponível após a recuperação, sorteia-se um
novo intervalo completo. Reinício descarta a geração anterior e volta a sortear;
vitória/derrota cancelam pendências e param o relógio. Danos, vidas e esquiva
de 15% permanecem iguais.

`tests/offensiveAI.test.mjs` verifica a ativação padrão e a espera sem cliques.
As suítes de fluxo e integração exercitam prioridade, defesa, cooldown, dano,
reinício e fim da luta. A suíte histórica `cooldownOnly` desativa a ofensiva
explicitamente apenas para isolar a regressão da Parte 11A.

Executar `node --test boxing-quiz/tests/*.test.mjs`. Os testes usam DOM/Canvas
simulados. Interação real e console do navegador continuam pendentes.
