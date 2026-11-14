# Áudios personalizados — Boxing Quiz Arcade

Nenhum áudio está incluído. Sem arquivos, o jogo permanece silencioso e funcional.
Não há síntese, voz ou dependência de serviços externos.

## Instalação
Coloque seus arquivos nas pastas abaixo, com os nomes exatos, e recarregue a página.
Use um servidor HTTP local (não abra o HTML com file://). Clique ou pressione uma
tecla para liberar o áudio do navegador. Arquivos novos exigem recarregamento,
pois falhas são memorizadas durante a sessão para impedir buscas repetidas.

## Pastas, arquivos e eventos
Todos os nomes abaixo terminam em `.mp3`.

| Pasta em assets/audio/ | Nomes | Evento |
|---|---|---|
| sfx/ | jab_swing, direct_swing, hook_swing, uppercut_swing | execução válida do golpe, de qualquer lutador |
| sfx/ | jab_hit, direct_hit, hook_hit, uppercut_hit | contato confirmado com dano, sem bloqueio |
| defense/ | block, dodge, perfect_defense | bloqueio, esquiva e defesa perfeita confirmados; perfeita tem prioridade |
| special/ | counter_rush_start, counter_rush_hit | início do especial e impacto confirmado |
| special/ | counter_chain_1, counter_chain_2, counter_chain_3, counter_chain_4, counter_chain_finish | estágio e término da cadeia |
| ui/ | menu_select, menu_confirm | selecionar dificuldade e iniciar |
| ui/ | qte_appear, qte_correct, qte_wrong, qte_timeout | pergunta e seu resultado único |
| ui/ | fight_start, victory, defeat | entrada no combate e resultado |
| crowd/ | crowd_ambient | ambiente em loop durante combate |
| crowd/ | crowd_clap, crowd_cheer, crowd_big_hit, crowd_counter_rush, crowd_victory | reações existentes da plateia |
| music/ | menu_theme, fight_theme, victory_theme, defeat_theme | música da cena, sem sobreposição |

Exemplo: `assets/audio/sfx/direct_hit.mp3`. Direto usa o identificador `direct`,
mesmo que internamente a mecânica se chame `straight`.

## Substituir e configurar
Troque o arquivo mantendo seu nome. Para outro formato, edite somente `path` em
`js/audioManifest.js`. MP3, WAV e OGG são aceitos conforme os codecs do navegador.
O manifesto configura `path`, `volume` (0–1), `category` (`effects`, `crowd`, `music`),
`loop` e `maxSimultaneous`. Os grupos iniciais geram entradas uniformes; para
personalizar uma entrada, acrescente ao final do manifesto, por exemplo:

```js
audioManifest.direct_hit.volume = 0.5;
audioManifest.direct_hit.path = 'assets/audio/sfx/meu_direto.ogg';
audioManifest.direct_hit.maxSimultaneous = 2;
```

## Volumes e reprodução
Configurações da arena: volume geral, efeitos, música, torcida e silenciar tudo.
Os controles vão de 0 a 1 (0%–100%). Zero desativa a categoria; as preferências
são salvas localmente quando o navegador permite. Cada arquivo tem ainda seu
volume próprio, multiplicado pelo geral e pela categoria.

API central em `js/audioManager.js`: `play(id)`, `playMusic(id)`, `stop(id)`,
`stopMusic()`, `pause()`, `resume()`, `stopAll()`, `load(id)` e `dispose()`.
Efeitos têm limite global de 8 vozes, torcida 3 e música 1, além do limite por ID.
Os arquivos são carregados sob demanda e reutilizados; nenhuma espera bloqueia a luta.

## Testar e diagnosticar
Instale primeiro um único som, recarregue, clique em iniciar e provoque seu evento.
Verifique volumes/mute, nome e maiúsculas do arquivo, URL no manifesto, codec,
resposta HTTP e permissão de áudio do navegador. Ausências podem aparecer uma vez
na aba Network como 404; não são reenviadas a cada frame nem geram exceções fatais.
No console, importe o gerenciador para consultar arquivos indisponíveis:

```js
const { audioManager } = await import('./js/audioManager.js');
audioManager.diagnostics();
```

A falta de som no pacote atual é esperada: todos os arquivos serão instalados
manualmente pelo desenvolvedor. Nenhum efeito ou música foi baixado ou gerado.
