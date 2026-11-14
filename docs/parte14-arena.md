# Parte 14 — relatório de implementação e validação

Status: implementação parcial. A Parte 14B não está concluída. A Parte 15 não foi iniciada.

## PARTE 14A

- Arquibancada: movimentos individuais e por pequenos grupos, palmas, braços erguidos e ondas por setores, acionadas por dano confirmado, Rush, Chain e atordoamento.
- Flashes: assentos fixos na plateia; três slots reutilizados; duração de 80–150 ms; frequência irregular, maior em momentos especiais. Sorteio próprio, sem consumir a aleatoriedade do combate.
- Configurações: flashes normais, reduzidos ou desativados; opção para desativar tremor; volumes separados para efeitos, torcida e voz; persistência local quando disponível.
- Iluminação: holofotes e brilhos discretos animados, desenhados antes dos lutadores e da interface.
- Ringue: preservados e reutilizados piso texturizado, cordas detalhadas, cantos, iluminação central e sombras da Parte 13E.

## PARTE 14B

- Estado `match_intro` após iniciar pelo lobby ou pedir revanche. Introdução de 14,5 segundos, com seis cenas e transições de câmera.
- Durante a introdução, cronômetro, ataques, dano, perguntas, cooldowns e IA ficam bloqueados. O sequenciador usa o loop e o tempo de simulação, sem intervalos próprios.
- Enter e botão PULAR INTRO encerram a sequência, cancelam fala e efeitos transitórios e restauram o combate uma única vez.
- Sprites detalhados existentes são reutilizados. O novo recorte `referee-walk-transparent.png` foi gerado a partir do sprite local de caminhada, removendo o fundo claro, e salvo sem substituir o original.
- Caminhada, gesto de braços, cabeça e boca possuem implementação visual; o juiz secundário tem posição compartilhada entre introdução e combate.
- O sistema de voz usa Web Speech com voz local em português, quando disponível. Não foram incluídos arquivos gravados de fala. A síntese de voz é provisória e varia por plataforma.

### Bloqueio atual

Foram observadas gravações simultâneas em `matchIntro.js`, `matchIntroView.js`, `refereeView.js` e arquivos relacionados, fora das alterações desta execução. Após a restauração das falas exigidas, `matchIntro.js` voltou a devolver `subtitle: ''` e `speaking: false` e deixou de chamar `speakReferee`.

Por isso, voz e legendas NÃO funcionam no estado final observado e a Parte 14B NÃO foi aprovada. Os testes mantêm as expectativas originais para detectar essa regressão, em vez de ocultá-la. É necessário estabilizar a edição compartilhada e reconciliar essas alterações antes de concluir.

## PARTE 14C

- Murmúrio sintetizado com um buffer de ruído reutilizado e filtro leve; aplausos e reações por evento, com limite de fontes simultâneas.
- Sino original sintetizado com três osciladores; nenhum efeito comercial foi copiado.
- Volumes independentes de efeitos, torcida e voz, com suporte a volume zero.
- Voz cancelada ao reiniciar ou pular; ambiente silenciado no lobby, na pausa e com a página oculta.
- Reações visuais e sonoras ligadas a eventos reais, preservando as regras do Rush, Chain, atordoamento e resultado.
- Cerimônia existente preservada, com eventos de torcida no anúncio do vencedor.
- Legibilidade: interface desenhada depois dos efeitos; enquadramento base do combate preservado.

## Testes realmente executados

- Todas as suítes `tests/*.test.mjs`: última execução registrou **251 testes; 248 passaram e 3 falharam**. Ver `tests/artifacts/part14-tests.log`.
- As três falhas estão em `tests/matchIntro.test.mjs`: cena/legendas, voz sincronizada e fallback de legendas sem voz. Correspondem à remoção concorrente das chamadas de voz e das legendas.
- Suítes de arena viva, áudio, cerimônia, lobby, Rush e Chain: execução dedicada de **47 testes passou**. Ver `tests/artifacts/part14-validation.log`.
- Integração de combate e introdução: houve execução de **35 testes com sucesso** antes das remoções concorrentes. Não representa aprovação do código posteriormente alterado.
- Testes novos cobrem três dificuldades, bloqueios da introdução, controles de pular, Slow Motion, ausência de timers do sequenciador, 30/60/144 FPS simulados, limites de desenho, frequências dos flashes e limites de fontes de áudio.
- A voz foi testada com API simulada. Não foi feita aprovação auditiva humana de uma voz real.
- `node tests/browserVisual.mjs` foi executado no Chrome real. Uma execução completa gerou capturas das seis cenas, dos dois resultados, dos menus e da arena, sem erros de execução. Também verificou Enter e PULAR INTRO.
- Essa execução mediu 600 quadros a 640×360: média de 5,27 ms, p95 de 4,30 ms e pico de 185,4 ms. São tempos do teste de renderização, não prova de FPS estável nem comparação de regressão com a versão anterior.
- A execução visual posterior, com verificação adicional dos sprites do juiz e das legendas, falhou. Ver `tests/artifacts/part14-browser.log`. Foram adicionadas referências concorrentes a outro sprite (`referee-signal`), e a validação visual final precisa ser reconciliada e repetida.
- Capturas intermediárias estão em `tests/artifacts/intro-*.png`, `arena-rest.png`, `arena-impact.png`, `player-*.png` e `bot-*.png`. Elas não aprovam automaticamente revisões posteriores dos arquivos.

## Arquivos afetados pela integração

Interface:

- `index.html`
- `css/style.css`

Arena e apresentação:

- `js/arenaLife.js`
- `js/arenaAudio.js`
- `js/presentationSettings.js`
- `js/matchIntro.js`
- `js/matchIntroView.js`
- `js/refereeView.js`
- `js/refereeBackground.js` — encontrado nas edições simultâneas e integrado
- `js/visibleSpriteBounds.js` — encontrado nas edições simultâneas e integrado
- `js/scenery.js`
- `js/arenaEffects.js`
- `js/audio.js`
- `js/ceremony.js`
- `js/fighterSprites.js`
- `js/render.js`
- `js/main.js`

Estado, entradas e proteção antes do combate:

- `js/gameState.js`
- `js/lobby.js`
- `js/restart.js`
- `js/input.js`
- `js/punchControls.js`
- `js/punches.js`
- `js/combat.js`
- `js/match.js`
- `js/qte.js`
- `js/defense.js`
- `js/ai.js`
- `js/counterAttack.js`
- `js/counterRush.js`
- `js/counterRushEffects.js`

Esses pontos de combate receberam proteções para `match_intro` e integração de apresentação; os valores de dano, cooldown, perguntas e regras das sequências não foram reescritos.

Testes e relatório:

- `tests/arenaLife.test.mjs`
- `tests/arenaAudio.test.mjs`
- `tests/matchIntro.test.mjs`
- `tests/combat.test.mjs`
- `tests/lobbyDifficulty.test.mjs`
- `tests/ceremony.test.mjs`
- `tests/browserVisual.mjs`
- `docs/parte14-arena.md`

Imagem criada nesta execução:

- `assets/sprites/ceremony/referee-walk-transparent.png`

Outros sprites locais encontrados durante a integração, sem substituição dos originais: `bot-relaxed.png`, `referee-walk.png` e `referee-signal.png`.

## Pendências de conclusão

1. Estabilizar as edições simultâneas e restaurar/reconciliar voz e legendas conforme a especificação vigente.
2. Repetir a regressão completa e o teste do Chrome sobre a mesma revisão estável.
3. Aprovar visualmente os gestos e a posição do juiz após as últimas alterações concorrentes.
4. Ouvir e ajustar o áudio em navegador com saída de som; manter fallback textual em sistemas sem voz local.
5. Investigar picos de renderização e medir fluidez real, sem declarar 60 FPS estáveis a partir da média.
