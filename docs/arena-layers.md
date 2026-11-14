# Parte 15A.13 — plateia atrás do ringue

## Causa e correção

`createScenery()` colocava arquibancadas, piso, cordas traseiras e postes no mesmo
canvas. Combate, introdução, nocaute e cerimônia desenhavam esse cache e, depois,
chamavam `drawAudienceMotion()`. Assim, partes dos NPCs animados cobriam cordas,
conectores e postes que já estavam pintados no fundo.

As funções existentes `drawRearStructures()` e `drawRearRopes()` agora preparam
um segundo cache transparente. `drawArenaScene()` compõe:

1. Fundo, luz estática, arquibancadas, espectadores estáticos e piso existente.
2. Espectadores animados, com as mesmas posições, cores, ritmos e reações.
3. Cordas traseiras, postes, proteções e conectores existentes.
4. Os renderizadores continuam com suas luzes, sombras, lutadores, juiz,
   efeitos, HUD e interfaces, na mesma ordem anterior.

O piso começa abaixo da plateia e sua composição estática foi preservada.
O projeto atual desenha três cordas traseiras entre os dois postes; não há
uma função separada para cordas laterais ou dianteiras. As diagonais do piso
continuam sendo bordas do tablado. Nenhuma corda foi criada ou deslocada para
a frente dos personagens. A camada corrigida precede os atores, preservando
as sobreposições aprovadas, inclusive o juiz levantando o braço do vencedor.

Não foi necessário clipping adicional: os pixels dos espectadores animados
permanecem acima de y=163, enquanto o piso começa em y=184. Foram verificados
saltos, palmas, braços levantados e reação coletiva. Nenhum NPC foi removido,
reposicionado ou redimensionado. Não há retângulo opaco escondendo espectadores.
O cache transparente contém somente a arte original das estruturas.

O custo por quadro é um `drawImage` adicional; as estruturas continuam sendo
desenhadas uma única vez ao construir o cenário. Não há alocação de canvas no
loop de animação.

## Arquivos

- `js/scenery.js`: separação do cache traseiro e composição compartilhada.
- `js/render.js`: composição corrigida no combate e Counter Rush.
- `js/knockoutView.js`: composição corrigida no nocaute.
- `js/ceremony.js`: somente a chamada de composição do cenário foi trocada;
  escalas (incluindo o jogador derrotado em 176 px), posições e expressões intactas.
- `js/matchIntroView.js`: usa a mesma composição, sem alterar personagens/câmera.
- `tests/arenaLayers.test.mjs`: ordem, reutilização de cache e limites da plateia.
- `tests/arenaLayerBrowserChecks.mjs`: reprodução antiga e verificações de pixels reais.
- `tests/knockoutBrowser.mjs`: executa os novos checks no Chrome existente.
- `tests/combat.test.mjs`: fixtures atualizadas para os cinco caches, incluindo
  a nova camada traseira; mesmas verificações de alpha, posições e transformação.
- Este documento e os artefatos regenerados em `tests/artifacts/`.

Nenhum sprite, regra de combate, expressão, áudio, botão, texto ou módulo HUD foi alterado.

## Testes realmente executados

`node --test tests/arenaLayers.test.mjs tests/arenaEffects.test.mjs tests/arenaLife.test.mjs tests/ceremony.test.mjs tests/knockoutComplete.test.mjs`

Resultado: **35 passaram**. Inclui 480 combinações de movimento/energia para
os limites das arquibancadas e preserva os 48 espectadores animados cadastrados.

`node --test tests/combat.test.mjs`

Resultado final: **24 passaram, 2 falharam**. As duas falhas são as expectativas
antigas de preenchimento de HP `#efbe3b` já registradas na Parte 15A.11; a HUD
preservada usa `#e8c75e`. Não foram alteradas para mascarar o resultado.

`node tests/knockoutBrowser.mjs`

Resultado: **passou, saída 0, sem erros de execução/console**. Foram verificadas:

- 540 amostras da plateia, com deltas de 30 e 60 FPS e três intensidades.
- 19.513 pixels das estruturas protegidos por amostra: nenhum coberto por NPCs
  com a ordem corrigida. A ordem antiga reproduziu a sobreposição.
- Movimento da plateia visível nas 540 amostras; nenhum pixel invade a área abaixo de y=163.
- Combate, dois nocautes e duas cerimônias: desenho dos atores após a camada
  traseira, mesmas imagens/coordenadas/escalas e pixels de HUD/piso/botões preservados.
- As 20 combinações de alvo/golpe/FPS, dez previews do F3, 44 âncoras e 36
  verificações de hematomas já existentes no teste de navegador também passaram.

Evidências: `tests/artifacts/arena-layers-browser-results.json`,
`arena-layers-before.png`, `arena-layers-after.png`, `arena-layers-combat.png`,
`arena-layers-knockout-*.png` e `arena-layers-ceremony-*.png`.
As imagens antes/depois, combate e cerimônia de derrota foram inspecionadas.
