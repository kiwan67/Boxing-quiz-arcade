# Combate fluido, dificuldade lógica e recuperação

## Ataques

`commonAttackCount` pertence à luta e avança somente em uma tentativa comum
aceita. Jab, Direto e Gancho alternam: índices ímpares sem pergunta, pares com
QTE de 10 segundos. Uppercut sempre usa QTE e não altera esse contador.
Ataques diretos possuem identificadores de impacto próprios, sem gerar pergunta
ou consumir a sequência do banco provisório. Usam a mesma animação, esquiva,
bloqueio, dano e cooldown de 2 segundos. Cada tentativa aceita continua avançando
as recargas individuais por turnos, com ou sem QTE.

## Counter Chain

O limite continua em quatro. `chainRules.js` associa as etapas a EASY, MEDIUM,
HARD e EXPERT. A etapa e a pergunta de Rush recebem metadados; nenhuma seleção
por dificuldade foi acrescentada. `questions.js` permanece intacto, com as mesmas
perguntas provisórias e alternativas CERTO/ERRADO.

O dano de cada Rush é calculado novamente a partir da base original:
`baseDamage * (1 + 0.5 * etapa)`. Os multiplicadores são 1,5 / 2 / 2,5 / 3.
Bloqueio aplica 25% desse dano e encerra a cadeia; não há sorteio de esquiva.
Cada QTE especial aceito continua consumindo um turno, sem afetar o contador comum.

## Atordoamento

A espera existente foi verificada: a animação do golpe termina antes de começar
o cooldown geral de 2 segundos. Essa ordem foi mantida. `stun.js` inicia uma
recuperação única com `total = 2 + adicional`, sem manter em paralelo outro
countdown de cooldown. O cooldown normal continua sendo 2 segundos nos demais
encerramentos.

Para encerramentos elegíveis com Rush integral, as durações adicionais por etapa
são 2 / 3 / 4 / 5 segundos, resultando em totais 4 / 5 / 6 / 7. O fluxo normal
continua após acertos nas primeiras três etapas e encerra no quarto; não foi
acrescentado um comando para abandonar uma cadeia bem-sucedida antes do limite.
Os tempos das etapas anteriores estão preparados no encerramento reutilizável.
Bloqueio, QTE errado, janela perdida ou reação defensiva sem continuação não
aplicam atordoamento do Rush. Não há stun completo entre etapas.

Uma defesa com lado e pergunta incorretos (inclusive expiração), com dano real
recebido e sem erro natural, marca um adicional de 2 segundos. Após completar
a animação inimiga, a mesma recuperação é iniciada para o jogador: total 4 s.
Identificador de impacto e marcador de aplicação impedem repetição.
Defesa parcial/perfeita, erro natural e nocaute não iniciam esse stun.

Durante a recuperação ambos os lados ficam impedidos de iniciar ataques/QTEs
ou novas defesas; a IA descarta o intervalo anterior e recebe novo agendamento
quando o combate é liberado. Pausa e Slow Motion operam pelo delta de simulação.
Reinício e nocaute cancelam a recuperação e o áudio pendente.

## Visual e áudio

`stunView.js` desenha três estrelas em órbita sobre as coordenadas reais da
cabeça, considerando posição do tronco, recuo, respiração e escala da perspectiva.
O personagem oscila levemente, baixa a guarda e exibe ATORDOADO! durante toda a
recuperação, incluindo os 2 segundos base. Nenhum sprite definitivo foi criado.

`audio.js` usa Web Audio: um oscilador triangular em três notas (880/660/440 Hz),
envelope de baixo volume e duração de 0,34 s. Toca uma vez por início de stun,
sem repetição durante a recuperação. O navegador exige interação para liberar
áudio; ausência/bloqueio de AudioContext não interrompe o jogo.

## Debug e validação

F3 preserva controles e velocidade. Acrescenta contador comum, próxima pergunta,
dificuldade e multiplicador da etapa, origem, duração adicional, total e restante
da recuperação. A resposta continua vindo da pergunta ativa real.

Executar `node --test tests/*.test.mjs`. As regressões de QTE anteriores usam
`requestQTEPunch` apenas na preparação de cenários que isolam perguntas; o ciclo
alternado real é exercitado sem esse helper em `fluidCombat.test.mjs` e por
eventos de mouse em `combat.test.mjs`. A suíte cobre também dano por golpe/etapa,
limite, falhas, precisão, turnos, Slow Motion, duplicações, resultado da luta,
desenho e áudio com mocks. Resultado final: 186 testes aprovados, sem falhas.
A tentativa de checagem em Chrome real não concluiu neste ambiente: houve falha
na inicialização da GPU e ausência de resposta do protocolo de depuração.
Inspeção visual, audição e console em navegador real permanecem pendentes.

## Arquivos

Novos módulos: `js/chainRules.js`, `js/stun.js`, `js/stunView.js`, `js/audio.js`.
Integração: `js/gameState.js`, `js/combat.js`, `js/qte.js`, `js/ai.js`,
`js/counterRush.js`, `js/counterAttack.js`, `js/defense.js`, `js/match.js`,
`js/characters.js`, `js/cooldownView.js`, `js/main.js`, `js/debug.js`, `index.html`.
Testes novos: `fluidCombat.test.mjs`, `stunAudio.test.mjs`.
Regressões adaptadas: `actionFlow`, `ai`, `animations`, `armPose`, `blocks`,
`combat`, `cooldownOnly`, `counterAttack`, `counterChain`, `counterRush`,
`counterRushCutscene`, `counterRushEffects`, `debug`, `debugPanel`, `defense`,
`enemyAccuracy`, `match`, `offensiveAI`, `punchControls`, `punches`, `qte`,
`risk`, `turnRecovery` e `tests/helpers/fight.mjs`.
