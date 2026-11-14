# Parte 15A.16 — fala calma do juiz

## Causa identificada

O controlador anterior alternava a cada 0,16 s entre a pose própria da página
e o frame genérico de fala. Essas imagens tinham mãos, sobrancelhas, inclinação
e expressão diferentes. Assim, para movimentar a boca, o jogo também trocava o
corpo inteiro cerca de 6,25 vezes por segundo. A boca genérica era muito aberta.

## Correção

Cada página mantém sua pose existente durante toda a fala: apresentação,
demonstração, apontar, guarda ou incentivo. Somente a arte da região da boca
varia entre três estados: fechada, ligeiramente aberta e moderadamente aberta.

Os intervalos são 0,24 / 0,26 / 0,23 / 0,26 / 0,24 / 0,27 segundo, seguindo a
sequência fechada → ligeira → moderada → ligeira → fechada → ligeira. Ao chegar
a 1,5 s, a boca para e o juiz retorna ao idle neutro. Isso corresponde a cerca
de quatro mudanças por segundo, com pequenas variações, independente do FPS.
Foi usada tolerância numérica de 1e-9 no término para evitar um quadro extra
de fala por arredondamento em 60 FPS.

Abrir, avançar ou voltar a uma página continua zerando o único relógio existente.
Não há filas ou animações sobrepostas. Os pés, tronco e gesto da página não
oscilam durante a fala. Não há rotação do personagem nem desenho de boca com
retângulos na tela.

## Sprites

Novo arquivo: `assets/sprites/tutorial/referee_tutorial_speech_variants.png`,
gerado com a ferramenta integrada `image_gen` a partir do atlas instrutor atual.
Contém três estados de boca para as poses de referência.

No preload, somente a arte da boca desse arquivo é integrada às cinco poses
originais, com recorte anatômico de bordas em degraus. São preparadas 15 imagens
completas em cache. Todos os demais pixels vêm da pose original. A transparência
original é mantida inclusive na região editada. O jogo desenha cada variante
como um sprite completo, sem boca ou mão solta sobre o personagem.

O atlas instrutor original não foi sobrescrito. Seu frame genérico de boca muito
aberta não é mais usado para animar a fala. Cabeça, olhos, roupa e membros das
cinco poses continuam usando a arte original.

O atlas e o controlador de aprovação não foram alterados. O joinha permanece
com 2,1 s e hold de 0,85 s, antes da intro. O ramo de aprovação é verificado antes
do ramo de fala, de modo que a fala não possa substituir seus frames.

SHA-256 do atlas de aprovação, igual antes/depois:
`e592ddf8d165910b09158460e18025fa883784027dfdedb722893e431830f2c6`.

## Arquivos desta revisão

- `js/tutorial.js`: seleção de boca em ritmo calmo, pose fixa e término em 1,5 s.
- `js/tutorialSprites.js`: preparação e desenho das variantes com corpo preservado.
- `assets/sprites/tutorial/referee_tutorial_speech_variants.png`: nova arte facial.
- `tests/tutorial.test.mjs`: ritmo em 30/60 FPS, estabilidade, navegação e regressões.
- `tests/tutorialBrowserChecks.mjs`: comparação de pixels e capturas das três bocas.
- Este documento, referência em `docs/tutorial-instructor.md` e artefatos regenerados.

Textos, controles, perguntas, combate, IA, QTEs, cutscene, nocaute, resultados,
animações do juiz no ringue e joinha foram preservados.

## Testes realmente executados

`node --test tests/tutorial.test.mjs tests/lobbyDifficulty.test.mjs`

Resultado final: **22 passaram, nenhuma falha**. Inclui as três bocas, intervalos
de 0,2 a 0,3 s observados em 30/60 FPS, término em 1,5 s, pose fixa, avanço rápido,
voltar/pular, preservação dos textos e controles, joinha, dificuldade, reinício
e retorno ao lobby.

`node tests/knockoutBrowser.mjs`

**Passou, saída 0, sem erros de execução/console.** O helper do tutorial verificou
as 15 variantes em pixels reais do Chrome contra o atlas instrutor original:
dimensões e alpha preservados; nenhum pixel visível modificado fora da região
da boca. Também confirmou que os três estados são diferentes em cada pose.

Foram exercitados os seis caminhos do tutorial (pular/concluir nas três
dificuldades), as cinco páginas, boca ligeira/moderada, retorno ao neutro,
joinha antes da intro, dificuldade preservada e primeiro ataque após a intro.
Os testes existentes do mesmo processo também passaram: 20 combinações de
nocaute a 30/60 FPS, dez previews F3, 44 âncoras, 36 verificações de hematomas,
camadas da arena, cerimônias, reinício e lobby. A suíte geral não foi reexecutada.

Capturas inspecionadas: `tests/artifacts/tutorial-page-1.png`,
`tutorial-talk-page-1.png`, `tutorial-moderate-page-1.png` e
`tutorial-moderate-page-3.png`. Relatório de pixels e fluxos:
`tests/artifacts/tutorial-browser-results.json`.

## Prompt utilizado

Ferramenta integrada `image_gen`, com `transparent_background: true`.
Referência: `assets/sprites/tutorial/referee_tutorial_instructor.png`.
O arquivo final foi salvo no caminho do projeto descrito acima. Somente sua
região facial é consumida, preservando integralmente os demais pixels originais.

Edit this existing pixel-art referee animation sheet to produce CALM MOUTH VARIANTS ONLY. Output an atlas with EXACTLY SIX columns and THREE rows. Each row repeats the EXACT six existing full-body poses in the reference, in the same order and with identical head size, eye positions, brows, hair, neck, torso, arms, hands, legs, feet, proportions, colors, stripe pattern and center/baseline. Only the lips and inside of the mouth may differ. Row 1: all six faces mouth CLOSED, gentle composed expression. Row 2: all six faces mouth SLIGHTLY OPEN, small narrow gap between relaxed lips. Row 3: all six faces mouth MODERATELY OPEN, modest calm speech opening, never a big grin or shouting, no exaggerated teeth or jaw drop. Each cell identical size with generous padding, no cropping. Match original detailed 16-bit pixel art and warm skin palette exactly. CLEAN actual transparent background, no shadows, no text or labels. Do not animate or tilt heads or eyes, do not resize any body part. This is a surgical correction of mouth artwork, not a redesign of the referee. Preserve the same six poses, repeat them across the three rows. All limbs remain connected.
