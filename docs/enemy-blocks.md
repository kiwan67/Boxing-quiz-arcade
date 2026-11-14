# Bloqueios da IA — Parte 12B

`js/enemyDefense.js` centraliza a esquiva fácil de 15%, as chances condicionais
de bloqueio (Jab 5%, Direto 10%, Gancho 20%, Uppercut 30%) e a redução de 75%.
Os valores de produção não são alterados para testes. Não existe bloqueio forçado
ativo; os testes controlam `Math.random` somente no ambiente de teste.

`ai.js` resolve cada QTE correto uma vez: sorteia esquiva; se ela falhar,
sorteia bloqueio. O resultado exclusivo é `dodged`, `blocked` ou `hit`.
QTE errado ou expirado preserva `failed_qte` e o contra-ataque anterior.
Tipo, braço defensivo e multiplicador ficam registrados junto ao ataque.

`match.js` aplica dano uma única vez no impacto. Bloqueio multiplica o dano
base por 0,25, sem arredondar: 1,25 / 2,5 / 3,75 / 6,25 HP.
A mesma fonte de HP alimenta a HUD, que arredonda apenas pixels de preenchimento.
Golpes bloqueados podem vencer a luta; o encerramento cancela a reação.

O adversário usa `block_left`/`block_right`, levanta sua guarda no lado visual
do golpe e recua discretamente. Seu braço anatômico direito aparece à esquerda,
correspondendo ao ataque esquerdo do jogador. A guarda alcança o máximo no
impacto e retorna em 0,22 s, dentro da duração dos golpes atuais.
O feedback temporário mostra BLOQUEADO!. Não é executada também uma reação de hit.
O estado não idle impede ataque espontâneo durante o bloqueio; ele não gera
contra-ataque automático. Reinício limpa todos os campos da guarda.

Recargas por ações e cooldown geral de 2 s permanecem inalterados.
Bloqueio não devolve a tentativa consumida ao abrir o QTE.

Verificação: `node --test boxing-quiz/tests/*.test.mjs`. Há testes determinísticos
dos limites de probabilidade, dano decimal, exclusividade, dois braços, desenho
sem recorte em Canvas simulado, turnos, IA ofensiva, vitória e reinício.
Console e aparência em navegador real ainda requerem verificação manual.
