# Falas e saída triste do professor

A entrada existente foi preservada: `js/professorAnimation.js` não foi editado (SHA256 F33EFAC522791661732953577DC2BEAE5411237D6CDAB5140473BAAD712CF2ED). Nenhum sprite aprovado de entrada/caminhada nem a geometria foram alterados.

## Funcionamento

Os eventos existentes do easter egg disparam as falas de cinco e sete acertos. Defesa correta usa o resultado real da pergunta defensiva. Golpe forte exige impacto conectado com dano; sequência usa o CounterChain existente. Não há outra contagem de acertos.

Há somente um balão, com prioridades: decepção, entrada, aparecimento, golpes/sequência, defesa. Eventos importantes duram 3s, comuns 2,5s, decepção 2s. Falas comuns têm intervalo mínimo de 5s. O desenho usa texto pixelado, quebra automática, borda clara, fundo escuro e seta; acompanha a posição renderizada, inclusive a câmera. Evita HUD e região central dos lutadores. Durante perguntas e revisão da resposta, o balão fica oculto e seu relógio aguarda a cena ficar visível.

Erro ou timeout captura a pose atual antes que as flags originais removam o professor. A reação dura 2s, com descruzar dos braços, cabeça baixa e giro à direita. Depois, deslocamento de 18 pixels/s e ciclo independente de 4 frames/s. Atrás das cordas traseiras, caminha para fora do Canvas mantendo a profundidade existente. Dentro ou durante a entrada, aproxima-se do limite seguro e desaparece em 0,8s; quando não existe espaço, usa ocultação gradual no local, sem atravessar a lateral, inverter a subida ou saltar. A posição vertical permanece contínua. Pausa, perguntas e cutscene do Counter Rush congelam a apresentação. As regras originais impedem reaparecimento na mesma partida; nova partida restaura o estado.

## Arquivos

Criados: `js/professorEvents.js`, `js/professorPresentation.js`, `js/professorDialogueView.js`, `js/professorSadSprites.js`, `js/professorSadFrames.js`, `tests/professorPresentation.test.mjs`, `tests/helpers/png.mjs`, este relatório e os três arquivos de asset abaixo.

Novo asset: `assets/sprites/professor/professor_sad_exit_v1.png`, atlas RGBA 1774×887, oito poses (quatro de reação e quatro de caminhada). Criado com a ferramenta integrada image_gen usando os sprites aprovados como referência. Prompt completo: `assets/sprites/professor/PROMPT_SAD_EXIT.md`. Validador: `assets/sprites/professor/validate-sad-exit.mjs`. Nenhum arquivo de entrada foi substituído.

Integração modificada: `js/professorEasterEgg.js`, `js/professorView.js`, `js/main.js`, `js/match.js` (somente notificação de impacto), `js/render.js`, `js/debug.js`, `js/debugPanel.js`, `index.html` (somente controles de debug). Testes ajustados: `tests/professorEasterEgg.test.mjs`, `tests/professorView.test.mjs`, `tests/professorForcedDebug.test.mjs`, `tests/professorDebug.test.mjs`, `tests/combat.test.mjs`, `tests/professorBrowser.mjs`. Build atualizado em `dist` sem limpeza/exclusão dos arquivos existentes.

## Testar

Abrir F3 ou o acesso móvel existente. As três opções FORÇAR PROFESSOR foram preservadas. Há seis novos comandos: FALA — 5 ACERTOS, FALA — 7 ACERTOS, FALA — GOLPE FORTE, FALA — DEFESA CORRETA, FALA — SEQUÊNCIA, PROFESSOR — SAÍDA TRISTE. Após uma saída, selecionar novamente uma posição forçada para outro teste. Os comandos operam na apresentação de debug, sem modificar HP, acertos, dificuldade ou vitória. O painel informa fala, etapa, sprite, frame, posição, camada e opacidade.

## Verificação e limites

Verificação real no Google Chrome com capturas inspecionadas: balões, reação, caminhada, desaparecimento, interrupção durante a entrada, interface móvel 390×844, seis comandos via toque, ausência de erros de runtime, estado real inalterado pelo debug, pausa e Counter Rush. Emulação móvel não substitui teste em aparelho físico.

Testes automatizados cobrem eventos/prioridades, impactos reais, erro/timeout antes e depois do aparecimento, saída externa/interna/durante subida, bloqueio de reaparecimento, reinício, relógios independentes, limites dos balões e integridade da entrada. Validador PNG confirma oito poses distintas com transparência e margens. Build Vite concluído.

Suíte final: 444 testes, 441 aprovados e três falhas preexistentes em `tests/matchIntro.test.mjs`, que esperam voz/legendas da introdução, mas a implementação atual mantém esses campos desativados. Esse sistema não foi alterado nesta tarefa. A saída interna usa o desaparecimento discreto permitido pelo pedido, porque não há uma animação aprovada de descida nem espaço suficiente para uma travessia completa convincente.

Capturas do Chrome: [balões e saída](professor-dialogue-exit.png), [interface móvel](professor-dialogue-mobile.png), [saída externa e entrada interrompida](professor-interrupted-exits.png).
