# Parte 15A.11 — nocaute completo e derrota frontal

O controlador existente mantém `knockout_cinematic` por 4,80 s: impacto (0,75), desequilíbrio (0,70), joelhos (1,05), continuação da queda (0,90), pausa no chão (1,00) e escurecimento (0,40). Usa delta real e desacelera apenas as fases iniciais. A câmera fica estável durante a pausa. Não há escala zero, espera por evento externo ou outra máquina de estados.

Antes, a duração terminava nos frames ajoelhados, sem uma continuação até o chão. Agora a fase só muda para vitória/derrota depois de chão, pausa e fade. `updateCeremony` também rejeita chamadas fora de vitória/derrota. O resultado continua registrado no golpe decisivo e os controles de combate ficam bloqueados. Título e botões seguem os tempos existentes da cerimônia.

O escurecimento encobre o reposicionamento e a mudança de perspectiva. A cerimônia começa no tempo zero, com o mesmo juiz, vencedor e contato das mãos. O derrotado aparece ajoelhado de frente, inclusive o jogador. A perspectiva de combate permanece inalterada. A guarda do jogador vencedor perde opacidade durante a queda do rival, deixando o corpo caído visível sem deslocar o derrotado.

## Arte e expressões

Foram preservados os sete frames atuais de cada atlas ajoelhado. Foram criados:

- `assets/sprites/knockout/player_ko_ground.png`: quatro poses traseiras.
- `assets/sprites/knockout/bot_ko_ground.png`: quatro poses do rival.

As células são identificadas no código como `player/opponent_ko_kneel_to_fall`, `*_ko_falling`, `*_ko_ground_idle` e `*_ko_ground_idle_breath`. Há perda do apoio dos ombros/braços, descida do tronco e corpo de bruços. Cada atlas mantém eixo e chão comuns. Uma escala uniforme calculada pela pose ajoelhada compatibiliza a anatomia entre atlas. Não há rotação, achatamento ou deslocamento lateral do corpo para simular a queda.

Em `assets/sprites/ceremony/`, para os prefixos `player` e `opponent`, foram criados seis PNGs por personagem:

- `*_result_defeated_front.png`
- `*_result_sad.png`
- `*_result_frustrated.png`
- `*_result_exhausted.png`
- `*_result_sad_idle.png`
- `*_result_sad_idle_breath.png`

Os dois `*_result_atlas.png` preservam a arte gerada de origem. O jogador mantém cabelo preto, luvas vermelhas e shorts azuis/turquesa; o rival mantém cabelo vermelho, luvas verdes e shorts roxos/dourados. Sobrancelhas, olhos e boca são desenhados em cada sprite. A apresentação passa por exaustão, frustração e tristeza, mantendo tristeza com respiração no menu. Só o derrotado usa essas poses.

Geração pela ferramenta integrada `image_gen`, com transparência e referências locais. Prompts e referências: [knockout-art-prompts.md](knockout-art-prompts.md). `tests/prepareResultSprites.ps1` apenas recorta as seis células com enquadramento comum e alpha, sem deformar poses.

O estado compartilhado `wear` não é reiniciado na transição. As variantes de `bruisedSprite` usam os mesmos níveis de hematomas e regiões apropriadas para a anatomia frontal ajoelhada e caída. Apenas pixels de pele recebem pigmento; a silhueta e o alpha são preservados.

## F3

Alvo e golpe continuam independentes. O seletor Trecho oferece sequência completa, joelhos, queda final, chão, transição e cerimônia completa. Os atalhos avançam o controlador real. A cerimônia completa começa do início, preservando o gesto do juiz. O seletor de expressão oferece automático, tristeza, frustração e exaustão e afeta apenas o derrotado. O reinício invalida o preview.

Uppercut — simulação Rush/Chain continua sendo um uppercut existente com metadados de teste; não foi criado ataque novo.

## Arquivos modificados

Produção: `index.html`, `js/knockout.js`, `js/knockoutSprites.js`, `js/knockoutView.js`, `js/ceremony.js`, `js/debugPanel.js`, `js/fighterWear.js`, os 16 PNGs descritos e os documentos desta revisão.

Testes novos: `tests/knockoutComplete.test.mjs`, `tests/prepareResultSprites.ps1`.

Testes atualizados: `knockoutBrowser.mjs`, `knockoutKneeling.test.mjs`, `knockout.test.mjs`, `ceremony.test.mjs`, `debugPanel.test.mjs`. Esperas fixas antigas de KO foram substituídas por `KO_DURATION` em `animations`, `combat`, `counterChain`, `counterRush`, `enemyAccuracy`, `fluidCombat`, `lobbyDifficulty`, `match`, `risk` e no utilitário `browserVisual.mjs`.

Os módulos de mecânica, HUD, introdução, áudio e arte do juiz não foram alterados.

## Validação executada

- Suíte geral Node: 288 testes; 283 passaram e 5 falharam.
- Seleção de nocaute, cerimônia, F3, desgaste, partida, Chain, Rush, golpes, defesa e IA: 96 testes passaram.
- Duas falhas em `combat.test.mjs` esperam preenchimento de HP `#efbe3b`; a HUD preservada usa `#e8c75e` e barra invertida. Três falhas em `matchIntro.test.mjs` esperam voz/legendas; o módulo preservado retorna legenda vazia e não inicia fala. Esses sistemas não foram alterados para satisfazer expectativas antigas.
- O navegador testa 20 combinações de alvo/golpe/30–60 FPS e dez seleções de trecho do F3. O RAF automático é desativado e o teste fornece deltas controlados: verifica independência de delta, não desempenho físico do equipamento.
- O teste verifica pausa no chão, bloqueio de resultados antecipados, vencedor, retorno ao lobby, reinício e expressões. Também verifica 44 âncoras e os três níveis de hematomas nas 12 poses frontais.
- Evidências: `tests/artifacts/complete-ko-browser-results.json`, capturas `complete-*` e `expression-*`. O relatório é gravado apenas após todas as asserções do navegador passarem.
- Inspeção visual das capturas de chão e expressões, incluindo jogador de frente e juiz levantando o braço do vencedor.
