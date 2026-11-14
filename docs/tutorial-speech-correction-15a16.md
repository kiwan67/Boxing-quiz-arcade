# Parte 15A.16 — revisão da integração da boca

## Causa encontrada nesta revisão

O projeto já continha o controlador de fala calma: pose fixa por página,
três estados, intervalos de 0,23–0,27 segundo e encerramento em 1,5 segundo.
Não foi necessário reconstruir o juiz, o tutorial ou seu controlador.

A composição dos sprites ainda copiava uma região de pele do atlas auxiliar
com bordas abruptas e iluminação diferente. Isso podia destacar o recorte
sobre o rosto. Além disso, a segunda linha do atlas tinha a boca praticamente
fechada, deixando pouco clara a diferença entre fechada e ligeiramente aberta.

## Ajuste realizado

Em `js/tutorialSprites.js`, as variantes agora são integradas com uma máscara
oval de transição suave. Os pixels na borda ficam iguais aos originais.
A correção de cor usa a pele do entorno e fica limitada a oito níveis por canal,
evitando clarear excessivamente os lábios. O estado ligeiramente aberto usa
a arte existente da boca aberta com abertura vertical reduzida, preparada no
carregamento e incorporada ao sprite completo.

Foram ajustadas as 15 variantes em memória: fechada, ligeiramente aberta e
moderadamente aberta nas poses explain, demonstrate, point, guard e finish
(índices 1, 5, 2, 3 e 4). São usados os PNGs existentes
`referee_tutorial_instructor.png` e `referee_tutorial_speech_variants.png`.
Nenhum PNG foi sobrescrito ou gerado nesta revisão.

O desenho continua usando um único sprite completo por quadro. Dimensões,
alpha, olhos, cabeça e todos os pixels fora da região da boca são preservados.
Pés, tronco e braços não oscilam. Não há partes flutuantes.

O controlador mantém cerca de quatro mudanças de boca por segundo e retorna
ao neutro em 1,5 segundo. Navegar entre páginas reinicia seu único relógio.
O joinha mantém prioridade, seis frames, duração total de 2,1 segundos e
aprovação sustentada por 0,85 segundo antes da cutscene original.

Textos, controles e demais sistemas do jogo não foram editados.

## Verificação executada

- `node --test tests/tutorial.test.mjs tests/lobbyDifficulty.test.mjs`:
  **22 aprovados**, nenhuma falha. Inclui velocidade em 30/60 FPS, término,
  navegação rápida, interrupção, joinha, reinício e transição para a intro.
- `node tests/knockoutBrowser.mjs`: **saída 0**, sem erros de execução/console,
  repetido após o ajuste final. Confere 15 variantes em pixels reais,
  dimensões e alpha constantes, olhos/corpo inalterados, bordas sem recorte
  retangular e estados distintos. Exercita as cinco páginas, pular/concluir
  nas três dificuldades, joinha e primeiro ataque após a cutscene.
  A regressão visual existente também passou: 20 cenários de nocaute,
  dez previews, 36 verificações de hematomas e 44 de âncoras, além da arena,
  cerimônia e retorno ao lobby.
- `node --test tests/*.test.mjs`: **299 aprovados de 304**, com cinco falhas:
  duas em `combat.test.mjs` (HUD e apresentação de resultados) e três em
  `matchIntro.test.mjs` (legendas/voz). As mesmas cinco falhas, com as mesmas
  asserções, foram reproduzidas usando a composição anterior da boca.
  São problemas preexistentes; não foram alterados nesta etapa.

A comparação anterior usa um loader que restaura somente a composição antiga,
sem modificar os arquivos do jogo:

`node --experimental-loader ./tests/artifacts/tutorial-speech-baseline-loader.mjs --test tests/combat.test.mjs tests/matchIntro.test.mjs`

Resultado: 31 aprovados de 36 e as mesmas cinco falhas. Evidência em
`tests/artifacts/tutorial-speech-baseline-results.txt`.

Foram inspecionadas visualmente as três expressões nas cinco poses em
`tests/artifacts/tutorial-speech-faces.png`. O relatório de pixels e fluxo está
em `tests/artifacts/tutorial-browser-results.json`; as capturas de páginas,
fala, joinha e intro foram atualizadas pelo teste do Chrome.

Esta revisão termina na Parte 15A.16.
