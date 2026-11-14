# Parte 12E — Counter Chain

Atualização: dano progressivo e recuperação ampliada agora seguem
[Combate fluido](fluid-combat.md). A descrição abaixo registra a etapa anterior.

Uma defesa perfeita, sem erro natural, inicia o Counter Rush com a cutscene
existente de 3 segundos e um único flash branco. O indicador mostra 1×.
Cada acerto integral permite uma recuperação breve de 0,22 segundo e uma
reação especial do adversário usando os QTEs normais de defesa.
Uma nova defesa perfeita abre a transição de 0,5 segundo, sem outra cutscene
ou flash, e disponibiliza o próximo Rush. O limite é quatro.

Cada golpe calcula seu dano base × 1,5, sem acumular multiplicadores.
O adversário não esquiva; bloqueio reduz o dano em 75% e encerra a sequência.
Erro ou timeout do QTE, janela perdida, defesa imperfeita e erro natural
também encerram. Erro natural preserva a esquiva automática do jogador.

Durante a sequência não há cooldown geral entre Rush, ataque normal ou IA
espontânea. Cada QTE de Rush iniciado consome exatamente um turno de ataque:
Jab 0, Direto 2, Gancho 3, Uppercut 5. Defesas, animações, transições e espera
não avançam recargas. A saída aplica cooldown geral de 2 segundos e descarta
o relógio espontâneo antigo, permitindo sortear um novo intervalo.

O repositório anterior não implementava atordoamento de 2 segundos (inclusive
o debug declarava sua ausência). Nesta etapa, o encerramento com acerto
integral do quarto Rush aplica 2 segundos de atordoamento e reação visual,
concomitantes ao cooldown. Bloqueio, falha e oportunidade perdida não geram
novo atordoamento. Nocaute cancela a sequência antes de agendar outra ação.

O estado `counterChain` guarda contador, fase, reação pendente, último
resultado e motivo da saída. Os estados de defesa existentes são reutilizados.
F3 mostra esses dados e permite forçar uma única reação especial sem erro
natural. O botão de defesa perfeita existente pode ser combinado com essa
opção. Desativar debug, terminar ou reiniciar limpa os resultados forçados.

Validação: `node --test tests/*.test.mjs`. A suíte específica
`tests/counterChain.test.mjs` cobre progressão de 1 a 4, limite, transições,
dano único, bloqueio, falhas, erro natural, debug, turnos e cancelamento por
vitória, derrota e reinício. As regressões de Rush foram atualizadas para
esperar recuperação e continuação após acerto integral.
Canvas e DOM são simulados nos testes; inspeção visual e console em navegador
real permanecem pendentes.
