# Proposta isolada de entrada lateral

Abra `/docs/professor-side-entry-preview/index.html` no servidor local do projeto.
Use **FORÇAR PROFESSOR — 7 ACERTOS**, reproduzir, o controle de tempo e os botões
para inspecionar cada um dos oito PNGs existentes.

Esta proposta não é importada pelo jogo e não altera seus arquivos de sprites,
clipes, âncoras, duração, combate, menu ou Counter Rush. O debug real fornece o
relógio e a seleção de frames; somente o posicionamento é substituído na prévia.

O enquadramento proposto tem 760 × 362 pixels de mundo, em vez de 640 × 360.
O cenário original é desenhado uma vez nas coordenadas originais. A margem
externa revelada tem o fundo escuro existente, sem cenário adicional criado.
Na proposta, o corpo desce por fora do poste e sobe na lateral abaixo dele.
O pé elevado se apoia na borda lateral; o último frame deixa o corpo inteiro
dentro. A caminhada interna primeiro se afasta do poste e depois vai à posição
final. As camadas não precisam mascarar nenhuma passagem pelas cordas.

Aplicar essa proposta à partida exige decidir o novo enquadramento da arena.
Ela não foi aplicada automaticamente porque o pedido exige explicar a
limitação de perspectiva antes de alterações adicionais.

Verificações sem bibliotecas adicionais:

```text
node --test tests/professorSidePreview.test.mjs
```

O teste de navegador existente também aceita `BOXING_SIDE_PREVIEW=1` e
`BOXING_BROWSER` apontando para um Chromium instalado. Ele captura os oito
frames, verifica os arquivos usados e executa a prévia em viewport móvel.
Essa verificação se refere à proposta isolada, não a uma correção já aplicada
na partida.
