# Risco dos golpes fortes — Parte 12C

`js/risk.js` centraliza os bônus: Jab 0%, Direto 10%, Gancho 25%, Uppercut 50%.
O resultado validado do QTE ofensivo registra o bônus antes de enfileirar o
contra-ataque. Tanto erro quanto timeout contam. O tipo é o registrado no QTE,
independentemente de mudanças de seleção. Acerto, esquiva ou bloqueio do bot
após acerto, seleção e tentativas impedidas não criam risco.

`gameState.pendingRiskBonus` guarda somente o maior bônus, sem soma e limitado
ao máximo configurado de 50%. Quando `beginCounterAttack` aceita o início da
preparação, o ataque guarda `riskBonus` e `baseDamage` e o pendente volta a zero.
A mesma função atende contra-ataques e ataques espontâneos. Reentradas rejeitadas
não consomem nem substituem o bônus do ataque já iniciado.

A defesa usa a base registrada: 20 × (1 + bônus), ou 20 / 22 / 25 / 30 HP.
Só depois aplica os multiplicadores defensivos de 10%, 25%, 50% e 100%.
Com Uppercut falho, isso resulta em 3 / 7,5 / 15 / 30 HP, sem arredondamento.
A precisão da IA não muda: erro natural causa esquiva automática e dano zero,
mas o risco continua consumido. Não existe novo sorteio no impacto.

O rodapé livre da HUD exibe VULNERÁVEL +N% apenas enquanto o bônus está pendente.
O indicador desaparece ao iniciar o ataque, inclusive antes do QTE defensivo.
Não modifica as barras de vida, os retratos ou o layout principal.

Fim de luta limpa risco pendente e o bônus/base do ataque. Reinício restaura
os valores iniciais. O dano base permanente do bot continua 20; recargas por
turnos, Jab sem recarga e cooldown geral de 2 s permanecem inalterados.

## Testes

`node --test boxing-quiz/tests/*.test.mjs` inclui casos determinísticos de
todos os bônus, erros e timeouts, não acumulação, consumo único, espontâneos,
snapshot de dano, quatro reduções defensivas, erro natural, recargas, HUD,
vitória, derrota e reinício. As regressões da tabela defensiva sem risco
iniciam seus contra-ataques com Jab; a suíte de risco cobre os golpes fortes.
DOM e Canvas são simulados; console e aparência em navegador real precisam
de verificação manual. Nenhuma opção extra de debug foi necessária.
