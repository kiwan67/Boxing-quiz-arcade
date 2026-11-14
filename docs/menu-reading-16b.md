# Parte 16B — leitura das respostas e menu personalizável

## Leitura do resultado

O QTE existente continua julgando a alternativa e registrando um único resultado.
Agora guarda esse resultado em `qte.pendingResult` e mantém o combate no estado
de QTE até terminar a leitura. A consequência de ataque/defesa é aplicada apenas
quando o controlador devolve o resultado pendente, uma única vez.

As durações ficam em `QTE_READING_SECONDS`, em `js/qte.js`:

| Resultado | Leitura |
| --- | --- |
| Correto | 2 segundos |
| Incorreto | 4 segundos |
| Tempo esgotado | 4 segundos |

Durante a leitura, `updateCombat` atualiza somente esse intervalo. O loop principal
mantém renderização, painel e controles de interface funcionando, mas não avança
o relógio da luta, IA, ataques, preparação, recuperação, defesa, Rush ou Chain.
O intervalo usa segundos reais, independentemente do slow motion do debug.
A pausa manual também segura o tempo de leitura; ocultar a aba mantém o tratamento
de tempo já existente. Não foram usados timeouts nem callbacks atrasados.

O cronômetro de resposta já está encerrado, não continua diminuindo e não pode
resolver a pergunta novamente. Cliques no Canvas são consumidos durante a leitura.
Novos socos, início manual do golpe e novos QTEs são bloqueados. Reiniciar remove
resultado pendente, feedback e histórico sem aplicar nada depois.

Ao terminar, o controlador chama as mesmas funções de consequência de ataque ou
defesa. Dano, recargas, tempos de resposta, janelas de Rush, regras de defesa
perfeita e sequência de quatro etapas da Chain permanecem como antes.
Os tempos de animação e a mensagem de falha do combate continuam sendo os originais
após a leitura; não são descontados dos 2/4 segundos.

## Painel de feedback

O painel ocupa a área de perguntas abaixo do HUD, em 640×360. Exibe:

- Resultado: RESPOSTA CORRETA!, RESPOSTA INCORRETA! ou TEMPO ESGOTADO!.
- Enunciado de referência e indicação da alternativa escolhida.
- As quatro alternativas, com a correta em verde e a escolhida errada em vermelho.
- Explicação completa em fonte bitmap de escala 2, com quebra automática.
- Contagem separada para a retomada do combate.

Todas as 20 explicações cabem em até três linhas no espaço disponível. O enunciado
de referência e os avisos secundários usam fonte menor; alternativas e explicação
mantêm escala 2. A consulta expansível da última resposta permanece disponível.
Durante a leitura, o filtro monocromático do Rush é suspenso visualmente para que
verde/vermelho continuem reconhecíveis; o efeito e seus relógios são preservados
e a apresentação normal retorna com o combate.

## Menu

O menu inicial usa uma área lógica de 640×360 com título em bitmap, painel central,
bordas quadradas em camadas e dois botões reais: JOGAR e OPÇÕES. Sem imagem própria,
reutiliza o cenário de ringue já existente no jogo. Não foi gerada ou baixada uma
imagem de fundo e nenhum arquivo escolhido pelo usuário foi substituído.

O esboço citado não foi recebido e não foi encontrado no projeto. Foi solicitada
essa referência e adotado o painel central descrito no pedido para continuar
o trabalho. O layout implementado não afirma reproduzir um desenho indisponível.

JOGAR abre a seleção existente de dificuldade. INICIAR LUTA continua abrindo a
pergunta sobre o tutorial; concluir suas páginas mantém joinha e cutscene antes
da luta. A dificuldade ganhou VOLTAR AO MENU. Retornar ao lobby após o resultado
agora apresenta o menu principal.

OPÇÕES move para o painel os próprios controles existentes de áudio/acessibilidade,
preservando seus listeners, valores e persistência. O volume geral foi exercitado
no navegador e altera o estado real de apresentação. Música, efeitos, torcida,
silenciar, flashes e tremor continuam ligados ao sistema existente. Há rolagem
interna e VOLTAR AO MENU. Ao sair, os controles retornam à sua posição no jogo.

SAIR foi omitido: uma página comum não pode fechar livremente a aba do navegador.

## Fundo e configuração

Arquivo opcional: **assets/images/menu/menu_background.png**.

O diretório foi criado e contém apenas `.gitkeep`. A imagem usa carregamento
assíncrono, independente do preload obrigatório de sprites. Enquanto falta ou
carrega, o menu e seus botões funcionam com o fundo padrão. Falha de imagem não
lança exceção nem impede iniciar o jogo.

`js/menuConfig.js` reúne caminho, zoom adicional, alinhamento horizontal/vertical,
intensidade da camada escura e posição/largura do painel. A escala é proporcional,
com preenchimento da área e recorte de bordas; o zoom mínimo mantém cobertura.

O guia **README_MENU.md** documenta caminho, nome, PNG/JPG/WebP, resoluções 16:9
recomendadas, substituição futura e todas as constantes.

## Arquivos

Código e apresentação:

- `js/qte.js`: constantes de leitura e entrega única do resultado pendente.
- `js/gameState.js`: estado pendente, limpo no reinício existente.
- `js/combat.js` e `js/defense.js`: espera e aplicação posterior pelas rotinas originais.
- `js/main.js`: leitura em tempo real com relógios do combate suspensos.
- `js/input.js`: bloqueio de cliques durante a leitura.
- `js/qteView.js`: alternativas destacadas e explicação completa.
- `js/counterRushEffects.js`: cores do feedback sem descartar o efeito de Rush.
- `js/menuConfig.js` e `js/mainMenu.js` (novos): configuração, imagem e menu.
- `js/lobby.js`: navegação menu/dificuldade/opções e retorno ao menu.
- `index.html` e `css/style.css`: controles, acessibilidade e estilo arcade.
- `assets/images/menu/.gitkeep`, `README_MENU.md` e este relatório (novos).

Testes:

- `tests/qteReading.test.mjs` e `tests/menu.test.mjs` (novos).
- `tests/menuBrowserChecks.mjs` (novo), `tests/questionsBrowserChecks.mjs`,
  `tests/tutorialBrowserChecks.mjs` e `tests/knockoutBrowser.mjs`.
- `tests/helpers/reading.mjs`, `combat.mjs`, `defenseApi.mjs` e `main.mjs` (novos),
  além de `helpers/fight.mjs` e `helpers/defense.mjs`.
- As suítes existentes que importavam combate/defesa/main passaram a usar esses
  adapters de teste: eles completam a leitura chamando o controlador de produção
  pelo tempo restante e depois verificam as mecânicas originais. Não há opção de
  produção para pular leitura. Os testes novos e o Chrome usam APIs reais sem
  completar a leitura automaticamente.
- `tests/combat.test.mjs` e `tests/defenseDebugConsistency.test.mjs` adaptam os
  helpers de cliques para os cenários antigos. O script de migração está em
  `tests/artifacts/migrate-reading-fixtures.mjs`.

Suítes com imports adaptados: `actionFlow`, `ai`, `animations`, `armPose`, `blocks`,
`ceremony`, `combat`, `cooldownOnly`, `counterAttack`, `counterChain`, `counterRush`,
`counterRushCutscene`, `counterRushEffects`, `debug`, `debugPanel`, `defense`,
`defenseDebugConsistency`, `enemyAccuracy`, `fluidCombat`, `knockout`,
`lobbyDifficulty`, `match`, `matchIntro`, `offensiveAI`, `punchControls`, `punches`,
`qte`, `questions`, `risk`, `turnRecovery` e `tutorial` (em `tests/*.test.mjs`).

Não foram alterados personagens, sprites, banco de perguntas, IA, danos, recargas,
animações de combate, tutorial, juiz, cutscene, nocaute, cerimônia ou hematomas.

## Verificação

Os testes novos de leitura usam as funções de produção e verificam acerto, erro,
timeout, congelamento do estado, bloqueio de novos ataques/respostas, aplicação
única, defesa, reinício, pausa manual e retomada de Rush/Chain. O tempo foi
exercitado em 30, 60 e 144 FPS. Também verificam dimensões dos elementos do painel,
as 20 explicações em fonte 2 e os destaques de cor.

Os testes de menu verificam a geometria cover para imagens 16:9, quadradas,
retrato e panorâmicas, sem alterar a proporção, além de zoom/alinhamento.

No Chrome, o servidor de testes simulou ausência do arquivo e depois serviu um
PNG já existente do projeto como imagem de teste, sem gravar ou substituir
`menu_background.png`. Foram verificados botões, limites em 640×360, opções,
volume real, dificuldade, tutorial, joinha, intro e retorno ao menu.

As perguntas foram exercitadas em 80 combinações (20×4 alternativas) por cliques
reais no Canvas. Para cada resposta, o teste mantém a leitura quase até o fim,
confere tempo da luta, IA, lutadores, HP, Rush e Chain congelados e então verifica
a retomada. Timeout e defesa também aguardam os respectivos 4/2 segundos.

Comandos e evidências finais:

- `node --test tests/*.test.mjs`: `tests/artifacts/part16b-unit-verified.txt`.
  **325/330 aprovados**, incluindo os **17 testes novos de leitura/menu**.
  As cinco falhas são as mesmas anteriores: duas de HUD/resultados em
  `combat.test.mjs` e três de legendas/voz em `matchIntro.test.mjs`.
- `node tests/knockoutBrowser.mjs`: verificações aprovadas sem erros de execução
  em `tests/artifacts/part16b-browser-options-verified.txt`, incluindo a restauração
  do estado aberto/fechado das opções. O encerramento do servidor/browser de
  testes também foi ajustado para liberar conexões persistentes no Windows;
  a última execução está em `tests/artifacts/part16b-browser-cleanup-verified.txt`,
  concluída com **saída 0 e nenhum erro de execução/console**. Inclui os dois
  cenários de fundo, 80 respostas com leitura, tutorial, joinha e intro, 20 cenários
  de nocaute, dez previews, 36 verificações de hematomas e 44 âncoras.
- Fluxos do menu: `tests/artifacts/menu-browser-results.json`.
- Perguntas e leitura: `tests/artifacts/network-browser-results.json`.
- Capturas: `menu-missing.png`, `menu-custom.png`, `network-feedback-correct.png`,
  `network-feedback-incorrect.png`, `network-feedback-timeout.png` e `network-net-*.png`.

As capturas do menu padrão, opções e leitura de resposta incorreta foram inspecionadas
visualmente. As cinco falhas anteriores de HUD/resultados e legendas/voz da intro
continuam documentadas em `docs/network-questions-16a.md` e em seus artefatos.

Esta revisão se limita à Parte 16B.
