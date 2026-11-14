# Recuperação entre ações — Parte 11A

Registro da etapa anterior. Na [Parte 11B](independent-offense.md), a ofensiva
passou a estar ativa por padrão, preservando este countdown.

O escopo ativo é somente recuperação: `offensiveAIConfig.enabled` inicia
como `false` em `ai.js`. A integração ofensiva que já existia fica inativa;
não há ataques espontâneos nesta versão. Contra-ataques por falha continuam.

`cooldown.js` mantém `PLAYER_ACTION_COOLDOWN = 2.0` e o estado
`action_cooldown`. Ele começa após o término do soco ou da sequência inteira
de contra-ataque, incluindo os dois QTEs defensivos, impacto e recuperação.
Cliques não reiniciam o relógio nem abrem novos ataques.

`cooldownView.js` mostra RECUPERANDO..., segundos e progresso, seguido de
LUTAR! por 0,5 s. O timer usa deltaTime, nunca fica negativo e não altera
o loop ou a HUD. Pausa explícita (`phase: "paused"`) e aba oculta não
consomem o countdown. Vitória/derrota limpam o contador e a mensagem.
Reiniciar restaura idle, vida e relógios e permite atacar imediatamente.

A mudança para um estado defensivo suspende naturalmente o contador;
ao final dessa sequência, inicia-se um novo período completo de dois segundos.
Esse ponto de integração continua disponível, sem ativar a IA da Parte 11B.

O teste `cooldownOnly` verifica o comportamento padrão, incluindo ausência
de ataques espontâneos. Os testes de integração ofensiva anteriores usam
opt-in explícito apenas dentro das suítes e restauram a configuração ao sair.

Executar `node --test boxing-quiz/tests/*.test.mjs`. Testes usam DOM/Canvas
simulados. Interação física, aparência no navegador e console real precisam
de validação manual.
