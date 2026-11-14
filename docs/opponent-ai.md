# IA e esquivas — Parte 7

`ai.js` não desenha nem carrega imagens. `playerCombat` continua sendo a
autoridade do ataque e `opponentCombat` é a autoridade da esquiva. O estado
visual em `characters.js` apenas traduz esses dados para os clipes existentes.

Após a validação correta do QTE, `startPunch` inicia o soco e pede uma decisão
à IA. Um sorteio `Math.random() < 0.15` decide a esquiva. Somente em caso de
esquiva, outro sorteio escolhe esquerda/direita uma única vez. Não há sorteios
por quadro, cadência fixa de esquivas ou tentativas após falhar o QTE.

Somente `easy` está ativo (`ACTIVE_DIFFICULTY`). A tabela contém ainda normal
35%, hard 55% e extreme 75% para uso futuro, sem seleção de dificuldade.
O estado central continua iniciado com `difficulty: "easy"`.

A esquiva começa junto da preparação do soco, leva 0,10 s para deslocar o
tronco, mantém o desvio por 0,12 s e retorna em 0,18 s. O pico visual do soco
ocorre em 0,16 s e fica dentro da permanência no desvio. A esquiva termina em
0,40 s, antes do término da recuperação do jogador em 0,42 s. Nenhum tempo
ou desenho de soco foi alterado.

Tronco, cabeça e guarda deslocam-se até oito pixels locais (16 na resolução
lógica); pés e calção permanecem fixos. A posição base no ringue não muda.
Durante o retorno `dodge_recovering`, o clipe visual mantém `dodge_left` ou
`dodge_right`, permitindo futuramente associar os mesmos estados a sprites.

`gameState.lastAttackResult` guarda `questionId`, `arm`, `outcome` (`hit`,
`dodged`, `failed_qte`), `dodgeDirection` e `qteOutcome`. O resultado é
decidido na liberação do ataque; o feedback de hit/esquiva só aparece no
momento previsto de impacto, por 0,75 s. Erros preservam a mensagem do QTE.
Não há dano, contra-ataques, golpes do adversário ou estatísticas acumuladas.

Os testes usam sorteios controlados para testar os limites e as duas direções.
A verificação de 1.000 amostras controla a distribuição de entrada; não exige
que uma sessão aleatória produza exatamente 15% de esquivas.

Executar `node --test boxing-quiz/tests/*.test.mjs` na raiz do workspace.
Os testes automatizados simulam Canvas/DOM. A naturalidade visual, os cliques
físicos e o console real ainda precisam de verificação no navegador.
