# Painel de depuração do combate

Pressione **F3** para ativar/fechar DEBUG MODE. O modo inicia desativado.
RECOLHER mantém apenas o cabeçalho; EXPANDIR restaura as opções.
O painel HTML é fixo sobre a interface, sem redimensionar o Canvas 640 × 360,
e permanece legível durante os efeitos visuais do Counter Rush.

## Revelações

- MOSTRAR LADO DO ATAQUE consulta `defense.expectedSide`, já convertido do
  braço anatômico inimigo para o lado visual que o jogador deve defender.
  Só mostra o lado durante os 3 segundos da escolha; fora disso, AGUARDANDO ATAQUE.
- MOSTRAR RESPOSTAS DOS QTES consulta `qte.question.correctAnswer`, para ataque,
  defesa ou Counter Rush. Não muda perguntas, não escolhe o lado e não responde.
- A revelação antiga por padrão no Canvas foi desativada (`DEBUG_QTE = false`).
  No jogo normal, nenhuma resposta interna aparece; a opção do painel só revela
  o conteúdo nele. Os testes antigos ativam o desenho de debug explicitamente.

## Forçar uma defesa perfeita

Clique FORÇAR PRÓXIMA DEFESA PERFEITA e aguarde um ataque válido do bot.
A opção se vincula ao identificador desse ataque, tanto espontâneo quanto
contra-ataque. Se armada durante uma defesa, vale para o próximo ataque iniciado.
Os QTEs continuam normais, com escolha de lado e pergunta: pode responder errado
ou deixar os tempos acabarem. Somente no impacto, o modo de teste usa a defesa
perfeita, calcula 10% da base daquele ataque e ignora um eventual erro natural.
Isso também respeita bônus de risco já registrados na base do ataque.

O sorteio original de precisão permanece registrado; o evento de impacto e o
resultado defensivo indicam a substituição de teste. Lado, banco de perguntas e
resposta efetivamente fornecida não são alterados. O painel registra o override.
Após recuperar, o fluxo normal abre o Counter Rush. A opção é consumida uma vez.

## Forçar o Counter Rush

Escolha NORMAL, FORÇAR ACERTO COMPLETO ou FORÇAR BLOQUEIO.
Somente o próximo Counter Rush cujo QTE for respondido corretamente consome a
opção. Acerto completo impede bloqueio; bloqueio força o resultado com dano de
25% do especial. Nenhuma opção permite esquiva no Counter Rush.
Janela expirada, QTE especial errado e ataques normais não consomem essa reserva.
Ao usá-la, o seletor retorna a NORMAL. Nenhuma probabilidade permanente é editada.

## Estados e segurança

Os valores de combate, golpe selecionado, turnos, cooldown, vidas, QTE e Counter
Rush são somente leitura. O painel acompanha o loop existente, sem criar timers
ou ataques. Com debug desativado, não monta snapshots nem escreve campos a cada
frame. F3 não pausa ou reinicia a luta. Fechar limpa reservas e revelações.

Reiniciar limpa reservas, alvo de defesa e registro de substituição, conservando
o painel aberto se já estava ativo. Fim de luta cancela reservas pendentes.
Desativar o debug antes do impacto cancela a defesa perfeita reservada. Decisões
já aplicadas não são desfeitas nem sorteadas novamente; os próximos eventos são
normais. A configuração antiga `enemyAccuracyDebug.forceOutcome` também é limpa
ao desativar, encerrar ou reiniciar, evitando que uma força manual anterior vaze.

## Cutscene e atordoamento

A cutscene de 3 segundos foi adicionada à sequência normal do Counter Rush.
O painel lê o estado COUNTER_RUSH_CUTSCENE, seu tempo restante e o próximo estado
COUNTER_RUSH_WINDOW. A defesa perfeita forçada percorre a mesma cutscene,
seguida do flash, antes de liberar a escolha do soco.
O atordoamento de 2 segundos ainda não existe nesta cópia. A reação visual de
impacto não é atordoamento; o painel continua marcando esse recurso como
NÃO IMPLEMENTADO e seu tempo como “—”. Ele não foi criado nesta correção visual.

## Arquivos e verificação

Criados: `js/debug.js`, `js/debugPanel.js`, `tests/debug.test.mjs`,
`tests/debugPanel.test.mjs` e este documento.
Integrações: `index.html`, `css/style.css`, `js/ai.js`, `js/counterAttack.js`,
`js/defense.js`, `js/match.js`, `js/main.js`, `js/restart.js`, `js/questions.js`.
Regressões ajustadas: `tests/combat.test.mjs`.

Executar `node --test boxing-quiz/tests/*.test.mjs`.
Os testes cobrem F3, expansão, revelações sem efeitos colaterais, defesa forçada
e Counter Rush, substituição de erro natural apenas no alvo, resultado especial
de uso único, probabilidades normais, risco, recargas e limpeza ao desativar ou
reiniciar. As regressões preservam flash, monocromático e resolução dos impactos.
DOM, teclado e Canvas são simulados. Aparência, F3 e console em navegador real
permanecem pendentes de conferência manual.
