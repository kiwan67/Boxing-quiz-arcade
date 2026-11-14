# Velocidade da simulação no debug

F3 oferece slider de 0.10× a 1.00× e atalhos 0.10 / 0.25 / 0.50 / 0.75 / 1.00.
O valor selecionado e o aviso SLOW MOTION ficam fora da área recolhível.
Entradas do mouse/teclado e controles do painel continuam sendo eventos normais.

`simulationClock.js` recebe timestamps do requestAnimationFrame e fornece deltas
reais em segundos, limitados a 0,1 segundo por quadro. O primeiro quadro após
inicialização, mudança de visibilidade ou reinício estabelece uma nova origem.
Não há fila de tempo acumulado para reproduzir após retornar à aba.

`main.update(realDelta)` converte uma única vez: `simulationDelta = realDelta *
gameSpeed`. Esse mesmo delta alimenta gameTime, combate, HUD e personagens.
Funções internas como updateCombat e updateQTE continuam recebendo segundos de
simulação, sem aplicar velocidade novamente. Chamadas diretas a update usadas
por testes não passam pelo limite de RAF, permitindo avanços determinísticos.

Todos os relógios de combate existentes já usavam deltaTime. Não foram
encontrados setTimeout, setInterval, Date.now ou performance.now controlando
mecânicas. O fluxo central abrange defesa, perguntas ofensivas e defensivas,
cutscene, flash, janela e QTE do Rush, transições da cadeia, atordoamento,
cooldown geral, intervalos da IA, animações, esquiva e efeitos de impacto.
As durações originais e as recargas por turnos permanecem intactas.

Trocar velocidade preserva pergunta, tempo de simulação restante e estado atual.
Desligar debug restaura 1.00×. Reiniciar também restaura 1.00× e limpa o timestamp
anterior, preservando o comportamento existente de abertura do painel.

Validação: `node --test tests/*.test.mjs`. Há testes da conversão e proteção do
relógio, controles reais do painel via eventos, integração de main.update com
QTEs e animações, troca durante pergunta, defesa, cutscene, flash, janela,
20 segundos reais para QTE especial em 0.25×, IA e cadeia completa em 0.10×,
incluindo dano, limite, recargas, cooldown e stun. DOM/Canvas e tempo são
simulados; inspeção visual e console em navegador real permanecem pendentes.
