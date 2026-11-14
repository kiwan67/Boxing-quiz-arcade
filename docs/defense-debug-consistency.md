# Correção do debug defensivo

## Causa reproduzida

O lado informado pelo F3 já vinha de `gameState.defense.expectedSide`, o mesmo
valor comparado em `finishDirection`. A inconsistência estava no caminho de
entrada: `input.js` tratava qualquer botão esquerdo do mouse como defesa esquerda,
independentemente da posição. O botão DIREITA desenhado no Canvas não tinha
hit-test próprio. Clicar nele com o mouse esquerdo registrava `left`.
Com pergunta correta e lado esperado `right`, o resultado legítimo era 50% de
dano e ausência de Counter Rush. O rótulo ATAQUE DO BOT ainda tornava ambíguo
se o lado mostrado era o do atacante ou o do defensor.

O teste de regressão foi executado antes da correção: ESQUERDA passou; DIREITA
falhou com `selectedSide: left`, esperado `right`. Depois da correção, ambos
os caminhos passaram com 10% de dano e início da cutscene do Rush.

## Referenciais e fonte canônica

| Braço anatômico do bot (de frente) | Origem na tela | Lado do jogador/defesa | F3 |
| --- | --- | --- | --- |
| Esquerdo | Direita | `right` | DEFENDA: DIREITA |
| Direito | Esquerda | `left` | DEFENDA: ESQUERDA |

`beginDefense` faz a conversão uma única vez e guarda `defense.expectedSide`.
O F3 lê esse campo; a validação compara a escolha com ele. Não foi acrescentada
outra regra de conversão. As áreas desenhadas e o hit-test compartilham
`DEFENSE_BUTTONS`. O clique primário nos botões seleciona seu lado explícito.
Fora deles, os atalhos existentes de mouse esquerdo/direito permanecem válidos.
A conversão de coordenadas respeita a escala CSS do Canvas 640×360.

## Respostas e resultado persistente

O F3 continua lendo `qte.question.correctAnswer`. `answerQTE` avalia essa mesma
pergunta e salva a resposta correta/escolhida no resultado. `finishDefense`
agora retém esses valores, o multiplicador calculado e a precisão configurada.
O registro de impacto guarda dano efetivo, erro natural e defesa perfeita.
A ativação efetiva de Rush é marcada somente quando sua cutscene/transição
é realmente iniciada. A seção ÚLTIMA DEFESA formata esse registro, sem recalcular
acertos ou dano. Ele permanece até o próximo resultado defensivo ou reinício.

Em defesa perfeita forçada, as escolhas brutas são preservadas e a seção informa
a substituição de teste, distinguindo-as do resultado efetivo forçado.
Erro natural continua com esquiva automática, multiplicador final zero e sem
Rush. As proporções normais continuam em 10%, 25%, 50% e 100%.

## Validação

`tests/defenseDebugConsistency.test.mjs` usa eventos reais do listener de mouse
em Canvas simulado/escalonado para os dois braços. Cobre as quatro combinações,
atalhos, limites geométricos, defesa forçada, erro natural, resposta ativa/IDs,
spam, timeout após resposta válida, persistência, Slow Motion nas velocidades
1 / 0,5 / 0,25 / 0,1 e uma cadeia completa de quatro Rush.
`debugPanel.test.mjs` também verifica todos os campos da seção e sua limpeza
quando o debug é desligado ou a luta reiniciada.

Comando completo: `node --test tests/*.test.mjs`. DOM/Canvas e passagem do tempo
são simulados; essa execução não substitui inspeção em navegador real.

Arquivos: `js/input.js`, `js/defenseView.js`, `js/defense.js`,
`js/counterRush.js`, `js/debug.js`, `index.html`,
`tests/defenseDebugConsistency.test.mjs`, `tests/debug.test.mjs`,
`tests/debugPanel.test.mjs` e este documento.
Não foram alterados perguntas, probabilidades, durações ou multiplicadores.
