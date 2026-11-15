# Prévia da subida do professor

Abra `index.html` diretamente no navegador, ou sirva o projeto com o Vite já
instalado e acesse `/assets/sprites/professor/subida_preview_v1/index.html`.
Não é necessário instalar bibliotecas.

- Reproduzir / pausar, anterior, próximo e recomeçar.
- Oito miniaturas selecionáveis, número do quadro e descrição da pose.
- Velocidade de 1 a 6 quadros/s e repetição opcional (desligada inicialmente).
- Fundo quadriculado, claro ou escuro para verificar transparência e contornos.
- Teclado: espaço e setas. Os mesmos botões funcionam por toque.

Os oito PNGs são imagens inteiras separadas, sem títulos, cordas, poste ou
cenário. Foram gerados com a ferramenta imagegen integrada, usando os sprites
aprovados `professor_caminhando_lado_v2.png` e `professor_observando_v2.png`
como referências. A prévia desenha cada arquivo proporcionalmente, com
suavização desligada, sem mover artificialmente o personagem.

Os oito arquivos estão integrados ao jogo por `js/professorClimbFrames.js`.
A página de prévia continua independente: não simula o ringue nem altera a
partida. As âncoras e os pontos de apoio usados no jogo ficam no módulo JavaScript.

Verificações locais:

```text
node assets/sprites/professor/subida_preview_v1/validate.mjs
node --test assets/sprites/professor/subida_preview_v1/preview.test.mjs
```

O primeiro comando lê os PNGs e verifica oito arquivos distintos, canal alfa
real e margens transparentes envolvendo o personagem completo. O segundo testa
carregamento, pausa, avanço manual, miniaturas e término da reprodução com DOM
simulado; não equivale a uma inspeção em navegador ou celular físico.
