# Parte 15A.15 — juiz instrutor e aprovação

Fala revisada na Parte 15A.16: [três bocas calmas e corpo fixo](tutorial-calm-speech.md).
O joinha descrito abaixo permanece inalterado; a descrição da fala original é histórica.

## Sprites e fala

Foram gerados dois atlas transparentes com a ferramenta integrada `image_gen`:

- `assets/sprites/tutorial/referee_tutorial_instructor.png`: seis poses completas,
  na ordem talk, explain, point, guard, finish e demonstrate.
- `assets/sprites/tutorial/referee_tutorial_approval.png`: seis frames completos,
  na ordem neutro amigável, preparação, joinha, aprovação com inclinação da cabeça,
  retorno e neutro amigável.

O idle reutiliza o juiz neutro existente. Os nomes `referee_tutorial_idle`,
`referee_tutorial_talk`, `referee_tutorial_explain`, `referee_tutorial_point`,
`referee_tutorial_guard`, `referee_tutorial_finish` e `referee_tutorial_thumbs_up`
identificam essas poses no controlador. `referee_tutorial_demonstrate` é a pose
adicional da página de golpes. Nenhuma arte do juiz no ringue foi substituída.

As páginas usam apresentação, demonstração, apontar, guarda e incentivo,
respectivamente. A pose da página alterna com o frame de boca aberta a cada
0,16 segundo. A sequência dura 1,5 s, incluindo o retorno ao idle nos últimos
0,15 s. Abrir uma página, avançar ou voltar reinicia esse único relógio, sem fila
de animações. Cabeça, braços e mãos fazem parte dos próprios bitmaps.

Os frames são extraídos dos atlas uma vez, mantendo eixo, chão e escala uniforme.
Pixels residuais de alpha baixo são descartados; os sprites não são achatados
nem têm membros rotacionados. O juiz permanece em seu painel. Não há voz nova.

## Joinha e transição

COMEÇAR LUTA na última página muda a apresentação para `approval`, ainda dentro
da fase protegida `lobby`. Não chama a intro imediatamente.

| Etapa | Duração |
| --- | --- |
| Neutro amigável | 0,20 s |
| Preparação do braço | 0,30 s |
| Formação do joinha | 0,20 s |
| Aprovação com joinha e aceno discreto | 0,85 s |
| Retorno do braço | 0,35 s |
| Neutro final | 0,20 s |

Total: **2,10 s**. Na aprovação, os dois frames de joinha alternam discretamente
para mostrar a cabeça aprovando. A pose de aprovação dura 0,85 s; o polegar já
fica visível durante a formação anterior.

`updateTutorial(realDelta)` avança o mesmo controlador que seleciona os frames.
Somente ao terminar a última etapa ele encerra a apresentação e chama
`beginMatchIntro()`, uma única vez. Não há timeout, espera bloqueante ou escala
de tempo zero. O loop continua atualizando e desenhando a animação.

Durante a aprovação, a lista de botões fica vazia e todas as ações de navegação,
incluindo Enter e Esc, são consumidas sem reiniciar ou abreviar o joinha. IA,
ataques, perguntas e relógio continuam protegidos pela fase `lobby`. A dificuldade
não muda. O identificador da partida cancela a apresentação se houver reinício.

PULAR TUTORIAL continua iniciando a cutscene diretamente, sem aprovação.
Nenhum código de animação do tutorial é executado dentro da cutscene original.

## Textos e mapeamento real

A página 3 mantém RESPONDA PARA ATACAR e contém integralmente os três parágrafos
solicitados sobre noções básicas de redes de computadores, conteúdos da Cisco
Networking Academy, acertos e perda da oportunidade ao errar. Não há alegação de
certificação ou aprovação oficial.

A página 4 contém os três parágrafos solicitados sobre direção do golpe e defesa
com mouse. Não manda clicar em botões de defesa na tela. O mapeamento mostrado é:

- Com o cursor na borda do ringue: mouse esquerdo seleciona o lado esquerdo.
- Mouse direito seleciona o lado direito.

Essa qualificação é necessária: em `input.js`, o clique esquerdo consulta primeiro
`defenseSideAt()`. Dentro de uma área clicável, ele seleciona o lado daquela área,
inclusive a direita; fora delas, seleciona esquerda. O direito seleciona direita.
Os lados são os do defensor/tela; `defenseSideForCounterArm()` já converte a
anatomia frontal do oponente. A lógica existente não foi modificada.

Os textos completos são quebrados em linhas de até 35 caracteres. As páginas 3
e 4 usam fonte na mesma escala 2, com espaçamento de 18 px, e botões mais abaixo.
O último texto termina antes dos botões, sem atravessar o painel do juiz.

## Arquivos desta revisão

- `js/tutorial.js`: textos, relógio de explicação, etapas da aprovação e bloqueio de ações.
- `js/tutorialView.js`: desenho dos frames e acomodação dos textos completos.
- `js/tutorialSprites.js` (novo): carregamento, recorte e desenho dos dois atlas.
- `js/main.js`: preload dos atlas e atualização do tutorial com delta real.
- Os dois PNGs de `assets/sprites/tutorial/` listados acima.
- `tests/tutorial.test.mjs`: conteúdo, mouse real, fala, joinha e transição.
- `tests/tutorialBrowserChecks.mjs`: validação e capturas no Chrome.
- Este documento, a atualização de `docs/quick-tutorial.md` e os artefatos regenerados.

Não foram alterados combate, golpes, IA, QTEs, Rush, Chain, nocaute, hematomas,
HUD, cutscene original, cerimônia ou animações do juiz no ringue.

## Testes realmente executados

`node --test tests/tutorial.test.mjs tests/lobbyDifficulty.test.mjs tests/punches.test.mjs tests/defenseDebugConsistency.test.mjs`

**42 passaram, nenhuma falha.** Incluem os gestos das cinco páginas, substituição
rápida, boca aberta/idle, textos completos, mapeamento da defesa, navegação,
repetição de cliques, cancelamento por reinício, dificuldade e joinha em 30/60 FPS.
A aprovação foi verificada por 0,85 s com tolerância de um quadro.

`node tests/knockoutBrowser.mjs`

**Passou, saída 0, sem erros de execução/console.** O helper do tutorial testa
seis caminhos (pular/concluir nas três dificuldades), as cinco páginas, boca e
retorno ao idle, os seis frames do joinha, bloqueio durante a aprovação, tempo
total de 2,1 s, intro começando em zero e primeiro golpe funcionando depois.
Também testa pular por Esc em cada página, sem executar joinha.

O mesmo processo executou a regressão existente: 20 combinações de nocaute a
30/60 FPS, dez previews F3, 44 âncoras, 36 verificações de hematomas, camadas da
plateia, cerimônias, reinício e retorno ao lobby. A suíte geral não foi reexecutada.

Evidências: `tests/artifacts/tutorial-browser-results.json`, `tutorial-page-*.png`,
`tutorial-talk-page-*.png`, `tutorial-approval-*.png` e `tutorial-original-intro.png`.
Foram inspecionadas visualmente as telas de redes, defesa, fala e aprovação.

## Prompts utilizados

Ferramenta integrada `image_gen`, `transparent_background: true` em ambas as
chamadas. Referência inicial: `assets/sprites/ceremony/referee-neutral.png`.
A segunda chamada também utilizou o atlas instrutor gerado como referência.
Os arquivos finais foram copiados para os caminhos do projeto listados acima.

### Atlas instrutor

Create a sprite atlas for this EXACT existing elderly arcade boxing referee. Preserve face identity, swept gray hair, black bow tie, black-and-white vertically striped referee shirt with chest pocket, black belt trousers black shoes, 16-bit detailed pixel art. Full body FRONT VIEW. CLEAN genuinely transparent background, no shadows, no labels no text. Exactly SIX equally sized columns ONE horizontal row with generous margins. All frames same anatomical scale, identical foot baseline and centerline, full silhouette contained in each column. Keep hand gestures SMALL close to torso so character is no wider than about half his standing height. 1: TALK mouth clearly open as speaking, friendly expressive eyebrows, small head inclination, one hand raised near chest. 2: EXPLAIN friendly mouth closed, small open-palm presentation with one forearm. 3: POINT one connected arm bent and index finger points towards viewer's right, mouth slightly open. 4: GUARD both connected forearms raised close to chest showing protection, mouth closed. 5: FINISH encouraging small clenched fist near chest, warm satisfied face, mouth closed. 6: DEMONSTRATE both hands open near chest making small instructor demonstration, mouth closed. All shoulders arms elbows wrists fingers anatomically connected. These must be custom hand-drawn complete poses, no rotating rectangle limbs, do not deform standing sprite. Keep the original referee's mature facial structure, not a new generic person.

### Atlas do joinha

Create the completion animation sprite atlas for EXACT reference elderly arcade boxing referee, full body FRONT VIEW. Same mature face swept gray hair black bow tie black-and-white striped shirt pocket black belt trousers shoes. Match reference detailed 16-bit pixel art. Six equally sized equally spaced columns ONE horizontal row, identical body scale foot baseline and body center, clean transparent background no labels shadows or text. Hands close to chest; keep pose width under half standing height. Frame 1 NEUTRAL friendly faint smile arms resting. Frame 2 PREPARATION: his right arm (viewer left) bends and raises, shoulder follows, hand near chest. Frame 3 THUMBS UP: connected forearm raised near chest, four fingers curled into fist and ONE LARGE unmistakable upright thumb, warm satisfied smile, other arm down. Draw the thumbnail and silhouette clearly, NOT an index finger pointing or an open palm. Frame 4 HOLD approval: same obvious thumbs up, slight approving head nod and smile, arm remains connected. Frame 5 RETURN: lowers bent arm halfway to waist, thumb relaxes. Frame 6 NEUTRAL: arms lowered friendly posture matching frame1. Every frame a complete hand-drawn anatomical pose. No floating hands, no extra arms/fingers, no rotated blocks, no emoji, no camera perspective changes. Keep identity proportions and palette exactly consistent across all six frames. This is an animation sheet, not a scene.
