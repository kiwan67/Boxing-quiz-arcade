# Professor v2 — proposta de arte, sem integração

## Arquivos de referência realmente usados

- `assets/images/menu/references/professor_ref_01.png` — rosto, cabelo cacheado curto, barba e colar.
- `assets/images/menu/references/professor_ref_02.png` — rosto com óculos retangulares e jaqueta acolchoada.
- `assets/sprites/bot/idle.png` e `assets/sprites/player/idle.png` — apenas estilo, contornos, contraste e proporções do jogo.

A spritesheet antiga não foi passada ao gerador como referência artística. Nenhuma fotografia, sprite antigo ou arquivo de lógica do jogo foi alterado.

## Entregáveis

- `professor_observando_v2.png`: quatro quadros de observação frontal, braços cruzados e respiração sutil.
- `professor_caminhando_lado_v2.png`: quatro poses de caminhada para a direita.
- `professor_caminhando_frente_v2.png`: quatro poses de caminhada frontal com cruz visível.

Todos são PNG RGBA de 1254 × 1254 px, com grade 2 × 2 e células uniformes de 627 × 627 px. A ordem é superior esquerda, superior direita, inferior esquerda, inferior direita. Os pixels originais da geração foram preservados; não foi feito recorte destrutivo nem remoção por cor que pudesse apagar roupa preta.

## Prévia

Abra `professor-preview-v2.html` na raiz do projeto, diretamente no navegador ou pelo servidor Vite. A página funciona sem importar o jogo e sem integrar os sprites ao combate. Mostra as três animações, quadro a quadro, fundos claro/escuro/quadriculado, ampliação do rosto e do colar, referências e comparação de tamanho com o BOT.

`preview-v2-data.js` contém somente metadados de células, eixos da cabeça e linha dos pés para estabilizar a apresentação. Os PNGs não são alterados pelo visualizador.

Para validar novamente, execute `node assets/sprites/professor/validate-v2.mjs`. Use `--write` apenas para recalcular os metadados da prévia.

## Ferramenta e limitações

Arte criada com a ferramenta integrada `image_gen`, com transparência solicitada explicitamente. Não foi usado CLI/API nem instaladas bibliotecas. Uma primeira tentativa da caminhada lateral produziu halo e a tentativa de extração deixou um resultado inválido; ambas foram descartadas, e o arquivo final foi recriado com fundo transparente.

São ciclos curtos de quatro quadros, gerados por IA. A semelhança facial é uma interpretação das fotografias, e a continuidade exata das pernas/braços e pequenas variações de volume entre poses precisam de avaliação humana na prévia. Não são formas geométricas apresentadas como arte. A aprovação artística deve preceder qualquer integração; os arquivos antigos e o jogo atual permanecem preservados.

## Prompts finais utilizados

### Observando

```text
Use case: stylized-concept. Create NEW original character sprite art from the photo identity references, not editing the game or its previous professor art. Asset: PROPOSED OBSERVING idle animation sheet for Boxing Quiz Arcade, real transparent RGBA background. Input 1 professor_ref_01.png: reference for adult man's facial structure, warm medium tan skin, short tightly curled black hair very close to scalp (NOT an afro), neatly trimmed beard/moustache and cross necklace. Input 2 professor_ref_02.png: reference for the same man's face with dark rectangular glasses and black horizontal-quilted puffer jacket. Input 3 bot/idle.png and Input 4 player/idle.png: STYLE ONLY, crisp 16-bit arcade pixel art, thick near-black pixel outlines, deliberate block clusters, high-contrast limited palette and hard stepped shadows. Do not copy fighter physique, costume or hair. The professor is an average-built adult with realistic modest proportions, head roughly one seventh of height, not chibi, not muscular, recognizable reference face. Outfit identical throughout: black quilted puffer jacket open at upper chest over a dark shirt, visible small silver cross pendant above crossed forearms, black straight trousers, light gray/white sneakers. Frontal full body facing camera, arms crossed at lower chest, calm alert expression, both feet visible. EXACT SHEET LAYOUT: 1024x1024, TWO columns and TWO rows, four 512x512 equal cells, no visible cell borders. Same full-body character in each cell centered on x=256 within each cell, soles on y=480 within each cell. Approximately 410 px character height within each cell, generous transparent margins. Four consecutive subtle breathing frames: neutral, slight inhale, full inhale, slight exhale; keep soles, facial anatomy, clothing design and scale fixed; changes at chest/shoulders only, no sliding or head enlargement. Authentic detailed 16-bit pixel sprite rendered with nearest-neighbor crisp square pixel clusters, no painted smoothing or vector shapes. No ring, ropes, poles, platform, text, titles, cell dividers, decorative elements, floor shadow, colored background or checkerboard drawn into the art. Background must actually be transparent. Recreate from scratch using photographs; no previous professor spritesheet is a reference.
```

### Caminhando de lado — versão final recriada

```text
Create a NEW four-frame pixel-art character walking animation on REAL TRANSPARENT BACKGROUND, matching exactly the professor in reference image 1. Use reference image 2 only for authentic arcade sprite shading and outlines. The scene consists ONLY of the four isolated characters and alpha=0 empty space. Absolutely no background lighting, vignette, ambient glow, colored haze, ground shadows, or gradients behind the sprites. Keep the entire person OPAQUE, including the black jacket, pants and hair. The black clothing is part of the character, NOT background. Subject: adult average-built man, normal human head-to-body proportions, short tight black curls close to scalp, dark rectangular glasses, trimmed beard and moustache, small silver cross on necklace, black quilted puffer jacket, black shirt and trousers, white/light gray sneakers. Every pose is a full-body SIDE PROFILE facing RIGHT. Four distinct poses form a smooth repeated walk: 1 left-leg forward/right-leg back contact with right arm forward; 2 left support/right leg bent passing with arms near torso; 3 right-leg forward/left-leg back contact with left arm forward; 4 right support/left leg bent passing with arms near torso. Natural adult walk, no exaggerated kicking or bulky muscles. Match the exact same character identity, outfit, palette and pixel resolution in all four frames. Technical composition: square 1024x1024, a two-by-two grid of equal 512x512 transparent cells, frame reading order top-left, top-right, bottom-left, bottom-right. Character standing height about 410px inside each cell, center torso at x=256, common soles baseline y=480. Generous transparent gutters, no frames overlap, do not cut off hair, hands, sneakers. 16-bit arcade pixel art built from hard square pixel clusters and stepped shadow colors, like reference 1, not smooth illustration. No text, borders, grid lines, ring, posts, ropes, platforms, floor, shadows, checkerboard or extra decorative elements. Retain only the four clean complete opaque character cutouts on genuine transparency.
```

### Caminhando de frente

```text
Create a NEW four-frame FRONT WALK TOWARD CAMERA pixel-art sprite animation sheet. Reference image 1 is the exact character design anchor (new observing professor), image 2 is the real face/glasses/puffer-jacket reference, image 3 is the arcade fighter STYLE reference ONLY. Preserve the professor's likeness from his real photo: short close-cropped black curls (not afro), dark rectangular glasses, neatly trimmed beard and moustache, warm tan skin, normal adult proportions with head about one seventh of body height, average build (no exaggerated muscles or chibi head). Exact same costume as reference 1 in all frames: black quilted puffer jacket open over dark T-shirt, silver necklace with a clearly readable cross pendant at upper chest, black straight trousers, light gray and white sneakers. Front face must look directly at the camera, level shoulders and eyes. Four distinct consecutive natural front-walk poses for a seamless loop: frame 1 left foot forward and right arm forward; frame 2 passing pose with one heel raised; frame 3 right foot forward and left arm forward; frame 4 opposite passing pose. Distinct alternating leg support, subtle arm swing, modest knee movement; keep the necklace visible throughout and do not cross arms when walking. Keep facial features, head shape, outfit, quilting, body scale and torso center fixed across all four frames. TECHNICAL LAYOUT: square 1024x1024 with a two-by-two grid of four equal 512x512 cells. Reading order top-left, top-right, bottom-left, bottom-right. Each figure about 410px high, torso centered at local x=256, common floor/sole baseline local y=480. Full body including hair, hands, and both shoes in each cell, large transparent gutters, no overlap. Detailed 16-bit arcade bitmap art, hard square pixel clusters, dark clean outlines, stepped color shadows matching reference 1 and the fighter, no smooth painting, no blur. The image consists ONLY of four opaque complete characters with genuine alpha=0 transparent empty space. KEEP black hair, beard, jacket and pants opaque. No text, no cell borders, no titles, no grid lines, no backgrounds, no gray cloudy glow, no lighting halo, no floor shadow, no checkerboard baked in, no ring, no ropes, no posts or platform. Do not refer to any old professor spritesheet.
```

