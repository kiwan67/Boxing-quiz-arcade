# Recargas por ações — Parte 12A

`js/punchTypes.js` centraliza dano, `cooldownActions`, dificuldade e perfil visual.
Direto é a seleção inicial.

| Golpe | Dano | Recarga |
| --- | --- | --- |
| Jab | 5 HP | 0 ações |
| Direto | 10 HP | 2 ações |
| Gancho | 15 HP | 3 ações |
| Uppercut | 25 HP | 5 ações |

`js/punches.js` mantém contadores inteiros em `gameState.punches.cooldowns`.
Uma tentativa válida verifica primeiro a disponibilidade do golpe, reduz em
uma ação as recargas dos outros golpes e atribui a recarga completa ao utilizado.
Tipo e braço ficam registrados no QTE. Erro, timeout e esquiva não devolvem a ação.
Jab permanece em zero, inclusive após repetidos usos. Ele permite recuperar
os demais golpes sem depender de outro golpe forte disponível. Bloqueios também
consomem a tentativa normalmente. A resolução do QTE não avança turnos de novo.

Esperar, selecionar botões, clicar quando bloqueado, defender ou receber ataques
da IA não reduz recargas. Não existe atualização desses contadores por deltaTime.
O cooldown geral continua temporal: 2 segundos após a sequência completa,
com prioridade para a defesa, sem reduzir recargas individuais.

Os botões abaixo do Canvas mantêm seleção, dano e barra de disponibilidade.
O status mostra PRONTO, 1 TURNO ou N TURNOS. Selecionar um golpe em recarga
é permitido, mas executá-lo não é. Reiniciar zera as recargas e seleciona Direto.
Disponibilidade é consultada em `isPunchReady(type)` tanto pelo combate quanto
pela interface, usando exclusivamente o contador atual. A seleção não armazena
disponibilidade. `onPunchCooldownChange` sincroniza todos os botões imediatamente
após cada atualização válida; a sincronização por frame continua funcionando.
Jab mostra PRONTO e progresso de 100%, sem divisão pela recarga zero.
Luta encerrada bloqueia ataques e conserva os contadores.
Animações, danos, QTEs, defesa e IA mantêm o comportamento anterior.

## Recuperação garantida pelo Jab

Antes, Jab tinha recarga de 1 ação: Uppercut → Gancho → Direto → Jab
deixava todos os golpes bloqueados. Essa configuração foi corrigida:
Jab não entra em recarga individual, preservando apenas o intervalo geral.
Cinco Jabs após Uppercut produzem 5 → 4 → 3 → 2 → 1 → 0.
Dois Jabs recuperam Direto e três recuperam Gancho. Esperar não recupera turnos.

## Verificação

Executar `node --test boxing-quiz/tests/*.test.mjs`.
As suítes de golpes e interface verificam as regras por ações usando o estado
real. O helper de regressões históricas limpa a recarga selecionada entre casos
de combate isolados; ele não é usado pelos testes dedicados de recarga.
`tests/turnRecovery.test.mjs` executa as sequências completas de Jabs e defesas
com o estado real, sem limpar contadores para avançar o combate.
DOM e Canvas são simulados. Aparência, cliques e console em navegador real
precisam de conferência manual.
