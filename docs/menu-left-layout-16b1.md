# Parte 16B.1 — layout do menu à esquerda

## Alterações

O título agora é desenhado com a fonte bitmap original em três linhas:
BOXING, QUIZ e ARCADE, a partir de X=30 / Y=35, em escala 3. O retângulo e
a moldura atrás do título foram removidos.

JOGAR e OPÇÕES ficam abaixo do título, alinhados à esquerda. A área das opções
começa em X=30 / Y=181; as letras aparecem em Y=190 e Y=230. São botões HTML
reais com rótulos bitmap, fundo transparente, sem bordas, caixa ou sombra.
A área central/direita fica livre para a arte. Não foram utilizadas artes,
personagens ou logotipos de FNAF.

O indicador de seleção usa chevrons pixelados « ». Ele acompanha a opção ao
passar o mouse ou receber foco. As setas para cima/baixo e Home/End mudam foco
e seleção; Tab, Enter e Espaço preservam o comportamento nativo dos botões.
O hover tem um aumento discreto de brilho. As palavras mantêm a posição ao
mover o indicador, sem deslocamento lateral dos botões.

O fundo continua usando `menu_background.png`, com carregamento assíncrono,
escala proporcional cover e recorte das bordas quando necessário. Sem arquivo,
continua usando o cenário padrão. O Canvas do fundo não recebe cliques.
O escurecimento global foi removido: apenas um gradiente da esquerda até
48% da largura ajuda a leitura, desaparecendo antes da região central/direita.

As posições são proporcionais à área lógica de 640×360 e continuam configuráveis
em `js/menuConfig.js`. O menu de configurações existente permanece funcional.
JOGAR conserva dificuldade, pergunta sobre tutorial, joinha, cutscene e luta;
o retorno ao lobby continua abrindo o menu principal.

## Personalizar a imagem

Coloque ou substitua o arquivo **assets/images/menu/menu_background.png** e
recarregue a página. Nenhuma imagem foi gerada ou baixada nesta revisão.
A imagem escolhida pelo usuário não é sobrescrita pelo jogo nem pelos testes.
Recomendação: PNG 16:9, como 1280×720 ou 1920×1080, com arte central/direita.
O guia atualizado `README_MENU.md` explica formatos, zoom e alinhamento.

## Arquivos modificados

- `js/mainMenu.js`: título, gradiente local e seleção por mouse/teclado.
- `js/menuConfig.js`: posições à esquerda e parâmetros do gradiente.
- `index.html`: dimensões dos rótulos dos botões.
- `css/style.css`: remoção do painel/molduras e aparência transparente das opções.
- `README_MENU.md`: documentação das novas constantes e do layout.
- `tests/menu.test.mjs`: geometria e limites da nova configuração.
- `tests/menuBrowserChecks.mjs`: alinhamento, ausência de caixas, seleção e fluxo.
- `tests/knockoutBrowser.mjs`: espera de navegação do teste com URL própria,
  evitando consultar o documento anterior ou um elemento ainda não criado;
  foco explícito da página, reaproveitamento da aba inicial, limite por comando
  do navegador e execução opcional `--menu-only`.
- Este relatório e artefatos de teste/capturas regenerados.

Não foram editados combate, perguntas, tempos de leitura, IA, animações, sprites,
tutorial, juiz, cutscene, nocaute ou cerimônia.

## Validação

`node --test tests/menu.test.mjs tests/lobbyDifficulty.test.mjs tests/tutorial.test.mjs`

**24 testes aprovados, nenhuma falha.** Incluem cover sem distorção em cinco
proporções, configuração e limites em 640×360, dificuldade, lobby, tutorial,
joinha e transição para a intro. Evidência: `tests/artifacts/part16b1-unit.txt`.

O teste do Chrome verifica os cenários sem imagem e com um PNG existente servido
somente pelo servidor de testes, sem criar/substituir a imagem personalizada.
Confere posições proporcionais, ausência de painel e caixas, seleção por mouse
e teclado, volume real, dificuldade, tutorial, joinha, intro e retorno ao menu.
Também executa as regressões existentes de perguntas, leitura e nocaute.

`node tests/knockoutBrowser.mjs` concluiu com **saída 0 e nenhum erro de execução**
em `tests/artifacts/part16b1-browser-checked.txt`. Além do menu, aprovou os 80
cenários de resposta/leitura, tutorial nas três dificuldades, joinha, intro,
20 cenários de nocaute a 30/60 FPS, dez previews, 36 verificações de hematomas
e 44 âncoras. O ajuste final do foco sem caixa foi verificado separadamente com
`node tests/knockoutBrowser.mjs --menu-only`, em `part16b1-menu-final.txt`.

Os relatórios de fluxo ficam em `tests/artifacts/menu-browser-results.json`,
`network-browser-results.json` e `complete-ko-browser-results.json`.
As capturas do menu são `menu-missing.png`, `menu-custom.png` e `menu-options.png`.
Foram inspecionadas visualmente as capturas com fundo padrão e personalizado.
O indicador de seleção substitui o contorno retangular de foco do navegador.

A suíte geral Node não foi reexecutada por esta alteração visual. As cinco falhas
preexistentes daquela suíte permanecem documentadas na Parte 16B.

Nenhuma etapa além da Parte 16B.1 foi iniciada.
