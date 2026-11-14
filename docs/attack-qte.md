# QTE de ataque — Parte 6

O fluxo usa exclusivamente `gameState.playerCombat.state`:

`idle` → `attack_qte` → `punching_left`/`punching_right` → `recovering` → `idle`.
Erro ou tempo esgotado levam a `qte_failed`, com mensagem por 0,9 s, depois `idle`.

`questions.js` fornece somente dados de teste: identificador único, enunciado
vazio, alternativas CERTO/ERRADO, resposta correta alternada e limite de 10 s.
Para ocultar a indicação discreta da resposta, altere `DEBUG_QTE` para `false`.
O enunciado não é preenchido nesta etapa.

`qte.js` controla a pergunta, o braço pendente, a validação e o tempo restante.
`combat.js` aplica o resultado e libera exatamente um soco apenas após acerto.
`qteView.js` desenha a janela e define os retângulos dos botões; não valida
respostas nem altera o combate. O clique inicial termina após abrir a pergunta.
Os cliques seguintes são convertidos das coordenadas de tela para 640 × 360.

`gameState.qte.lastResult` preserva o último resultado com `questionId`, `arm`,
`outcome` (`correct`, `incorrect` ou `timeout`), resposta e tempo restante.
Não há histórico ilimitado, estatísticas, dano ou contra-ataques.
A pergunta e o ataque pendente são descartados ao resolver. IDs antigos,
respostas duplicadas e novos ataques durante a tentativa são ignorados.

O temporizador usa o `deltaTime` do loop existente, independente de `gameTime`.
Assim como as outras animações, pausa quando a aba fica oculta e retoma ao voltar.
Nenhum `setInterval`, `setTimeout` ou loop adicional foi criado.

Testes sem dependências externas:

```powershell
node --test boxing-quiz/tests/*.test.mjs
```

Os testes usam DOM/Canvas simulados; abertura, interação física e console
do navegador ainda precisam de validação no navegador.
