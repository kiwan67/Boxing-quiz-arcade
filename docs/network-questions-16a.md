# Parte 16A — 20 perguntas de Redes de Computadores

## Banco e conteúdo

`js/questions.js` substitui a fábrica provisória por **20 perguntas**, todas
exclusivamente de Redes de Computadores. Cada registro contém ID estável,
categoria, enunciado, quatro opções, `correctIndex` (0–3) e explicação curta.
Os textos e o gabarito fornecidos foram preservados no banco original.

Gabarito conferido antes do embaralhamento:

| ID | Categoria | Correta | Conteúdo correto |
| --- | --- | --- | --- |
| net-01 | Modelo OSI | C | Rede |
| net-02 | Modelo OSI | D | 7 |
| net-03 | TCP/IP | B | TCP |
| net-04 | IPv4 | B | 32 bits |
| net-05 | IPv6 | D | 128 bits |
| net-06 | Máscara de sub-rede | C | 255.255.255.0 |
| net-07 | Endereçamento | B | 192.168.1.10 |
| net-08 | DNS | B | Resolver nomes de domínio em endereços IP |
| net-09 | DHCP | C | DHCP |
| net-10 | HTTPS | B | TLS para proteger a comunicação |
| net-11 | HTTP | C | Porta TCP 80 |
| net-12 | Switch | A | Switch |
| net-13 | Roteador | B | Interligar redes e encaminhar pacotes |
| net-14 | Endereço MAC | C | 48 bits |
| net-15 | ARP | A | Resolver IPv4 em endereço MAC |
| net-16 | NAT | B | Traduzir endereços IP |
| net-17 | Wi-Fi | A | IEEE 802.11 |
| net-18 | Diagnóstico | B | ping |
| net-19 | Segurança | A | Filtrar tráfego conforme regras |
| net-20 | Topologias | C | Estrela |

A revisão técnica utilizou fontes primárias: [modelo OSI e roteamento, Cisco](https://www.cisco.com/c/dam/en/us/products/collateral/switches/catalyst-2950-series-switches/prod_white_paper0900aecd8013313e.pdf),
[TCP, RFC 9293](https://www.rfc-editor.org/info/rfc9293/),
[IPv4, RFC 791](https://www.rfc-editor.org/info/rfc791/),
[IPv6, RFC 8200](https://www.rfc-editor.org/info/rfc8200/),
[endereçamento privado, RFC 1918](https://datatracker.ietf.org/doc/rfc1918/),
[DNS, RFC 1034](https://www.rfc-editor.org/info/rfc1034/),
[DHCP, RFC 2131](https://www.rfc-editor.org/info/rfc2131/),
[HTTP/HTTPS, RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html),
[ARP e endereços Ethernet de 48 bits, RFC 826](https://datatracker.ietf.org/doc/rfc826/),
[roteamento e switch de camada 2, Cisco](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-routing.html),
[Wi-Fi, IEEE 802.11](https://www.ieee802.org/11/abt80211.html),
[ping e firewall, NIST SP 800-41](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-41r1.pdf)
e [topologias, Cisco](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-network-topology.html).
O prefixo /24 corresponde a 24 bits 1 seguidos de oito bits 0, resultando em
255.255.255.0. As explicações correspondem às respostas do quadro acima.

## Seleção sem repetição

Ataque, defesa, Uppercut e Counter Rush/Chain compartilham uma única lista
embaralhada por partida em `gameState.questionBank`. A seleção usa Fisher–Yates,
consome cada ID uma vez por ciclo e registra ciclo, sequência, ID e contexto
no histórico. Após as 20, embaralha um novo ciclo. Se o primeiro ID coincidir
com o último anterior, troca os dois primeiros, evitando repetição na fronteira.

As quatro opções também são embaralhadas por exibição. O índice correto é
recalculado junto com as opções e os botões continuam representando A–D.
Assim, a distribuição desigual de letras do gabarito original não torna uma
letra favorecida na apresentação. O ID do conteúdo é `bankId`; o ID da tentativa
inclui contexto, partida e sequência, impedindo aceitar cliques de QTEs antigos.

O sorteio utiliza `crypto.getRandomValues` quando disponível, separado dos
sorteios de IA; há fallback para `Math.random`. Reiniciar limpa a lista restante,
IDs usados, ciclos, respostas, feedback e seleção de debug.

## Validação e julgamento

`validateQuestionBank` verifica lista, campos obrigatórios, IDs únicos,
quatro opções distintas e não vazias e um único índice inteiro entre 0 e 3.
O banco é validado no carregamento. Itens inválidos geram `console.warn` e são
ignorados. Se um banco externo estiver inteiramente inválido, a seleção utiliza
uma questão conhecida e válida de redes, sem interromper a partida.

A validação estrutural não pretende provar a correção técnica do texto:
o gabarito foi revisado separadamente e é verificado contra as 20 respostas
esperadas nos testes.

O QTE existente identifica a tentativa ativa e a alternativa A–D, compara com
o gabarito derivado do índice e registra exatamente um resultado, incluindo
opções exibidas, alternativa escolhida, índice correto e explicação.
IDs antigos, alternativas inválidas, respostas duplicadas e respostas após
o limite são rejeitados. Uma tentativa com tempo já esgotado resolve como timeout.
Pausa, lobby e intro não aceitam respostas. Os resultados continuam passando
pelas funções originais de ataque e defesa.

## Interface e feedback

O painel mantém fonte bitmap arcade em escala 2 nos enunciados e alternativas,
com acentos em português, quebra de linhas e quatro botões usando a mesma
geometria no desenho e no hit-test. As 20 questões cabem em 640×360; o temporizador
e suas durações foram mantidos. O painel começa abaixo do HUD e é desenhado
após os indicadores de combate para que Counter Chain não cubra a alternativa D.

O resultado aparece por 0,9 segundo, sem criar espera ou bloquear comandos:
“RESPOSTA CORRETA!”, “RESPOSTA INCORRETA!” ou “TEMPO ESGOTADO!”. A alternativa
correta é indicada em verde; no erro, a escolhida aparece em vermelho.
Quando cabe, a explicação aparece no próprio aviso em fonte secundária.
O combate continua usando seus tempos e transições anteriores.

Um único bloco expansível abaixo do jogo conserva a última resposta e a
explicação completa para consulta. Seu resumo também usa verde/vermelho e fica
fora do filtro visual do Canvas, mantendo as cores durante os efeitos de Rush.
Ele é limpo ao reiniciar. Não foi criado outro sistema de perguntas.

## F3

O painel informa o total carregado, prepara a próxima pergunta aleatória ou
por ID (`net-01` a `net-20`) e permite simular acerto, erro ou timeout do QTE ativo.
A opção existente de revelar a resposta correta foi mantida.

Preparar uma questão não abre QTE, não consome perguntas e não altera a fase
do combate. IDs já utilizados aguardam o próximo ciclo. As simulações chamam
as funções normais de submissão/atualização; o timeout avança o QTE pelo tempo
restante, como no loop. Fechar F3 cancela a seleção pendente de teste.

## Arquivos alterados e criados

Código do jogo:

- `js/questions.js`: banco, validação e seleção compartilhada.
- `js/qte.js`: consumo do banco, registro e bloqueio de respostas expiradas.
- `js/gameState.js`: histórico por partida e tempo do feedback.
- `js/combat.js`: decremento visual do feedback, sem mudar regras de combate.
- `js/qteView.js`: quatro alternativas, layout, feedback e consulta posterior.
- `js/render.js`: perguntas acima dos indicadores do combate.
- `js/main.js`: atualização da consulta da última resposta.
- `js/debugQuestions.js` (novo): ferramentas de perguntas para F3.
- `js/debugPanel.js` e `js/debug.js`: bindings e limpeza da seleção de teste.
- `index.html` e `css/style.css`: consulta e controles de debug.

Testes:

- `tests/questions.test.mjs` e `tests/questionsBrowserChecks.mjs` (novos).
- `tests/knockoutBrowser.mjs`: integração das verificações de perguntas no Chrome.
- `tests/fluidCombat.test.mjs`: banco real nas quatro etapas da Chain.
- Fixtures antes dependentes de CERTO/ERRADO migradas para escolher uma opção
  incorreta do QTE ativo: `actionFlow`, `ai`, `combat`, `cooldownOnly`,
  `counterAttack`, `counterRush`, `counterRushCutscene`, `counterRushEffects`,
  `debug`, `debugPanel`, `defense`, `enemyAccuracy`, `match`, `offensiveAI`,
  `punches`, `qte`, `risk` e `turnRecovery` (todos em `tests/*.test.mjs`).
- Expectativas de conteúdo provisório e coordenadas antigas foram adaptadas
  nos testes de QTE, defesa, golpes, combate e Chain.
- Este relatório e os artefatos `tests/artifacts/part16a-*`, `network-*` e
  capturas de regressão atualizadas. O script de migração das fixtures está
  em `tests/artifacts/migrate-network-test-fixtures.mjs`.

Tutorial e sua explicação sobre redes/Cisco foram preservados. Não foram
alterados dano, recargas, tempos de ataque ou resposta, perfis de IA, defesa
perfeita, multiplicadores, contra-ataques, cutscene, nocaute ou cerimônia.

## Testes realmente executados

1. `node --test tests/questions.test.mjs`: **9/9 aprovados**. Conferência das 20
   respostas, validação/fallback, 100 ciclos (2.000 seleções), 4.000 seleções para
   verificar distribuição de letras, 80 julgamentos, duplicidade/timeout/pausa,
   dimensões, feedback, consulta, reinício e ferramentas F3.
2. `node --test tests/combat.test.mjs tests/qte.test.mjs tests/fluidCombat.test.mjs tests/defense.test.mjs tests/punches.test.mjs tests/questions.test.mjs`:
   **69/71 aprovados**; duas falhas preexistentes de HUD/resultados.
3. `node --test tests/*.test.mjs`: resultado final **308/313 aprovados**.
   As cinco falhas restantes são as mesmas registradas antes desta etapa:
   duas em `combat.test.mjs` (HUD e apresentação dos resultados) e três em
   `matchIntro.test.mjs` (legendas/voz). Evidência anterior em
   `tutorial-speech-baseline-results.txt`; resultado atual em
   `part16a-unit-final.txt`. Não foram corrigidas fora do escopo.
4. Após o último ajuste de limpeza do F3:
   `node --test tests/questions.test.mjs tests/debug.test.mjs tests/debugPanel.test.mjs`:
   **28/28 aprovados**, em `part16a-debug-final.txt`.
5. `node tests/knockoutBrowser.mjs`: **saída 0**, repetido após os ajustes finais,
   sem erros de execução/console. Em Chrome real: 20 questões, 80 respostas por
   cliques escalonados, bloqueio de duplicidade, feedback, explicação acessível,
   timeout e resposta tardia, QTE defensivo e reinício. Todos os enunciados e
   opções foram capturados; relatórios em `network-browser-results.json` e
   `part16a-browser-final.txt`.

A mesma execução no Chrome aprovou os seis caminhos do tutorial nas três
dificuldades, cinco páginas, fala, joinha, início da cutscene e primeiro golpe;
também 20 cenários de nocaute a 30/60 FPS, dez previews, 36 verificações de
hematomas, 44 âncoras e regressões de arena/cerimônia/lobby.

Foram inspecionadas visualmente as capturas `network-net-08.png` (inclui a opção
longa de DNS) e `network-feedback-incorrect.png`. As outras 19 perguntas têm
capturas `network-net-01.png` a `network-net-20.png`; também há capturas de
acerto, timeout e defesa. A geometria de todas foi verificada automaticamente.

Não houve novas falhas na suíte final em relação às cinco já conhecidas.
A implementação fica limitada à Parte 16A.
