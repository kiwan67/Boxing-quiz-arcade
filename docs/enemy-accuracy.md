# Precisão inimiga e esquiva automática

`js/enemyAccuracy.js` define ENEMY_ACCURACY = 0.80 e deriva
ENEMY_MISS_CHANCE = 1 - ENEMY_ACCURACY. O registro de um ataque inimigo válido
em `counterAttack.js` sorteia o braço e uma única decisão de precisão.
`counterAttack.naturalMiss` permanece fixo até a resolução. Ataques espontâneos
e contra-ataques por erro ou timeout compartilham este caminho.

Os QTEs continuam obrigatórios: direção por 3 s e pergunta por 10 s.
Escolha, resposta e timeouts são registrados normalmente. A interface não mostra
a precisão antes do impacto. O cálculo defensivo educacional permanece intacto.
No impacto, `defense.js` verifica primeiro naturalMiss: se verdadeiro, preserva
o dano defensivo calculado em `defenseDamage`, registra dano e percentual zero
e inicia a esquiva. Não há reação de hit. Caso contrário, permanecem os danos
de 2, 5, 10 e 20 HP. O evento e a aplicação de dano mantêm proteção de duplicidade.

`autoDodge.js` atualiza a esquiva com deltaTime no loop existente: avanço de
0,04 s, permanência de 0,08 s e retorno de 0,16 s. A duração de 0,28 s cabe
nos 0,31 s restantes da animação inimiga após o impacto. Braço esquerdo inimigo
chega pela direita visual, então o jogador sai para a esquerda; o outro lado
usa a variação espelhada. O modelo conserva proporções e posição permanente.
Os estados defensivos existentes continuam bloqueando novos ataques/QTEs;
ao concluir a recuperação, o cooldown geral de 2 s segue normalmente.

Recargas individuais por turnos não são alteradas por defesa ou esquiva.
Fim de luta limpa a esquiva e cancela ações; reinício limpa resultado, pose
e temporizadores. Não foram criados loops ou temporizadores independentes.

## Depuração

`enemyAccuracyDebug.forceOutcome` inicia em null (produção). No desenvolvimento,
"miss" força erro natural e "normal" força a resolução defensiva normal.
Alterar essa opção depois de registrar um ataque não modifica seu resultado.
Os testes restauram null; a precisão de produção permanece em 80%.

## Testes

`node --test boxing-quiz/tests/*.test.mjs` cobre limites da probabilidade,
QTEs obrigatórios, falhas e timeouts sem dano, ambos os lados e origens,
danos normais, exclusividade com hit, proteção de duplicidade, recargas,
pausa, quadros lentos, encerramento e reinício. Canvas e DOM simulados
verificam o desenho sem recortes. Console e aparência em navegador real
continuam pendentes de verificação manual.
