# Vida, dano e resultado — Parte 10

O estado central continua sendo a única fonte de vida: `playerHealth` e
`enemyHealth`, entre 0 e 100 HP. Os valores provisórios estão em `match.js`:
`PLAYER_BASE_DAMAGE = 10` e `ENEMY_BASE_DAMAGE = 20`.

O jogador só aplica dano depois de acertar a pergunta e da decisão de esquiva.
Em 0,16 s de animação, o pico do soco, o resultado `hit` retira 10 HP; `dodged`
retira zero. O resultado recebe `impactResolved` e `damageApplied`.

No contra-ataque, `registerDefenseImpact` utiliza o dano já calculado pela
função da Parte 9: 2, 5, 10 ou 20 HP. Nenhum dano é aplicado durante os QTEs.
O ID do impacto e a marca de resolução impedem repetição, inclusive em quadros
lentos. A vida é limitada antes/depois da aplicação e nunca fica negativa.

`DEFENSE_DIRECTION_TIME = 3.0`, em `defense.js`, controla o contador e a barra
da direção. Os QTEs de pergunta de ataque e defesa continuam com 10 segundos.

A HUD mantém o layout: as barras amarelas leem diretamente a vida real.
Um rastro vermelho breve mostra a perda anterior e desaparece usando deltaTime;
ele é apenas visual. O cronômetro usa `gameTime`, para no encerramento e volta
a 00:00 ao reiniciar. A aba oculta continua pausando os relógios como antes.

As reações de impacto duram até 0,22 s, com deslocamentos pequenos do tronco
e da cabeça. Pés, calção e posições base não mudam. Não há escala dos membros.
O clipe visual `hit` não modifica os estados lógicos de combate.

Quando um HP chega a zero, `checkMatchEnd()` registra `victory` ou `defeat`,
cancela QTEs e pendências e bloqueia novos comandos/decisões. `matchView.js`
desenha o resultado sobre o cenário, com JOGAR NOVAMENTE. A derrota tem
prioridade se ambos os HP forem alterados externamente para zero.

`restartFight()` restaura o estado, poses e rastros sem recarregar a página,
recriar caches, adicionar listeners ou iniciar outro loop. A identidade do
objeto central é preservada; cada luta recebe um `matchId` novo. IDs de
perguntas incluem essa geração, evitando aceitar respostas antigas depois
do reinício. Resultados, relógios e impactos anteriores são descartados.

A chance de esquiva permanece 15%; contra-ataques continuam ocorrendo somente
após falhas do QTE de ataque. Nenhuma mecânica das Partes 11/12 foi adicionada.

Testes: `node --test boxing-quiz/tests/*.test.mjs`, na raiz do workspace.
DOM/Canvas são simulados. Inspeção do jogo completo, cliques físicos,
naturalidade das reações e console real precisam de validação no navegador.
