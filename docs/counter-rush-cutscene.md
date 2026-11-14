# Cutscene do Counter Rush

## Causa encontrada

A versão anterior não tinha estado, temporizador ou renderização de cutscene.
`updateCounterAttack` chamava diretamente a abertura da janela após uma defesa
perfeita. O debug utilizava esse mesmo fluxo: não havia uma cutscene para exibir.

## Sequência corrigida

1. Defesa perfeita e recuperação do adversário.
2. `counter_rush_cutscene`: exatamente 3 s, pelo deltaTime do loop existente.
3. `counter_rush_flash`: 120 ms por padrão, respeitando a opção de acessibilidade.
4. `counter_rush_window`: 2,5 s completos para escolher o braço.
5. `counter_rush_qte`: 5 s completos para responder.
6. Resolução especial e cooldown geral de 2 s.

O tempo atravessa as fases sem contagem duplicada, inclusive em quadros lentos.
Janela e QTE não avançam durante a cutscene ou o flash. Desativar o flash não
encurta os 3 s da cutscene. Os controles de ataque e a IA permanecem bloqueados
durante a introdução; não há dano, novos QTEs nem consumo de turnos nesse período.

## Apresentação Canvas 2D

`counterRushCutscene.js` calcula um enquadramento visual a partir do tempo real:

- 0–1 s: zoom suave de 1× a 1,12×, fundo escurecendo e barras cinematográficas.
- 1–2 s: zoom até 1,18×, destaque no jogador e guarda preparando o golpe,
  com OPORTUNIDADE DE CONTRA-ATAQUE.
- 2–3 s: zoom até 1,28× e COUNTER RUSH! crescendo discretamente.

O renderer aplica translate/scale somente ao cenário e lutadores, dentro de
save/restore. HUD e textos cinematográficos são desenhados na resolução original.
A guarda é um deslocamento visual temporário; posições e escalas de layout
permanecem intactas. Ao entrar no flash, o enquadramento original já está
restaurado. O filtro monocromático só começa após o flash.

Não há imagens novas, novos canvases, leitura de pixels ou outro loop.
Pausa congela o relógio. Vitória, derrota e reinício cancelam a introdução;
o contexto é restaurado a cada renderização, sem transformações acumuladas.

## Debug

A defesa perfeita forçada chega ao mesmo estado de cutscene. O painel mostra
COUNTER_RUSH_CUTSCENE, tempo restante e próximo estado COUNTER_RUSH_WINDOW.
O debug não abre a janela nem reduz a cutscene. O atordoamento de 2 s continua
ausente nesta cópia, portanto seu funcionamento não pôde ser verificado.
Nenhuma mecânica nova de atordoamento foi implementada.

## Arquivos

Criados: `js/counterRushCutscene.js`, `tests/counterRushCutscene.test.mjs` e este
documento. Integrados: `js/counterRush.js`, `js/gameState.js`, `js/counterAttack.js`,
`js/combat.js`, `js/counterRushEffects.js`, `js/match.js`, `js/render.js`,
`js/characters.js`, `js/debug.js` e `index.html`.

Regressões atualizadas: `tests/helpers/fight.mjs`, `tests/counterRush.test.mjs`,
`tests/counterRushEffects.test.mjs`, `tests/turnRecovery.test.mjs`,
`tests/debug.test.mjs`, `tests/debugPanel.test.mjs` e `tests/combat.test.mjs`.
Documentação existente: `docs/counter-rush.md`, `docs/debug-panel.md`.

## Verificação

`node --test boxing-quiz/tests/*.test.mjs` testa defesa real e forçada, duração
exata, ordem cutscene/flash/janela/QTE, 30/60/144 FPS e quadros lentos, bloqueio
dos controles/IA, recargas, ausência de dano durante a introdução, pausa e reinício.
O renderer simulado verifica zoom aplicado à cena, barras, texto real em pixels,
preparação da guarda, identidade do contexto restaurada e dano especial após a
sequência completa. Aparência e console em navegador real permanecem pendentes.
