# Contrato de animação dos personagens

`combat.js` continua responsável pelos comandos, bloqueios e tempos do soco.
Não importa Canvas, personagens, imagens ou clipes. Não depende do término
de uma animação visual para liberar o próximo comando.

`animations.js` traduz os estados de combate para nomes visuais estáveis:
`punching_left` → `punch_left`, `punching_right` → `punch_right`;
`idle` e `recovering` usam a guarda `idle`. Recuperar continua bloqueando ataques.

Cada personagem tem seus próprios clipes `idle`, `punch_left`, `punch_right`,
`dodge_left`, `dodge_right`, `block_left`, `block_right` e `hit`.
Esquivas, bloqueios e impactos são apenas entradas reservadas; nenhuma dessas
ações foi implementada ou ativada.

O contrato visual expõe `animationState`, `animationTime` (segundos),
`animationSpeed` (multiplicador por personagem) e `animations` (clipes).
Cada clipe tem `speed`, `loop`, `framesPerSecond`, `spriteSheet` e `frames`.
A velocidade efetiva multiplica a velocidade do personagem pela do clipe.
O valor padrão 1 preserva a animação atual. A velocidade de `idle` já controla
a respiração; o relógio dos outros clipes está preparado para o futuro playback.
O soco geométrico continua seguindo a extensão e os tempos atuais do combate.

Para spritesheets futuros, `spriteSheet` poderá referenciar o PNG carregado
e `frames` conter os recortes `{x, y, width, height}`. Hoje ambos são `null`:
não há carregamento de imagens, seleção de quadros ou implementação de sprites.
O renderizador poderá selecionar quadros com `animationTime` e `framesPerSecond`,
respeitando `loop`, sem modificar comandos ou regras de combate.

O ponto de substituição é a composição geométrica em `characters.js`.
As funções públicas `drawPlayer`/`drawOpponent` e as camadas de `render.js`
podem permanecer, preservando posição, escala, transparência e HUD.

A geometria provisória dos braços do jogador fica em `armPose.js`: segmentos
de 12 e 14 pixels lógicos, ligados por cotovelo, com espessuras constantes.
A trajetória do punho respeita o alcance da articulação; o desenho apenas
arredonda as posições para a grade de pixels. Não há escala independente
dos membros. A torção simulada do tronco desloca a parte superior em até
dois pixels, mantendo o calção e a posição no ringue fixos.

Os tempos atuais são definidos em `combat.js`: preparação de 0,06 s,
avanço de 0,10 s, retorno de 0,14 s e recuperação de 0,12 s (total 0,42 s).
