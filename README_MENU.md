# Personalizar o menu

Coloque suas imagens em **assets/images/menu/**, com os nomes:

- `menu_background_01.png`
- `menu_background_02.png`
- `menu_background_03.png`
- `menu_background_04.png`
- `menu_background_05.png`

O arquivo antigo `menu_background.png` também é aceito: aparece por último
na lista padrão. Se for o único arquivo disponível, permanece fixo.
Arquivos ausentes ou inválidos são ignorados. Sem imagens válidas, o menu
mantém o cenário padrão do jogo. Nenhuma imagem é baixada ou gerada.

As imagens são pré-carregadas uma vez e apresentadas na ordem da lista,
independentemente da ordem de conclusão dos carregamentos. Depois da última,
o carrossel volta à primeira. Cada imagem fica **5 segundos parada**, seguidos
de **1 segundo de crossfade** para a próxima (6 segundos entre inícios de fades).
O título, o gradiente e os botões permanecem fixos e não recebem fade.

Recomenda-se **1280×720**. A resolução interna continua em **640×360**.
O preenchimento é proporcional (`cover`), sem distorção; imagens de outras
proporções têm as bordas recortadas. Mantenha elementos importantes no centro.

Edite apenas a lista `backgroundImages` em **js/menuConfig.js** para adicionar,
remover ou reordenar arquivos. Os caminhos são relativos à pasta `js/`.
Também é possível usar JPG ou WebP com a extensão real do arquivo; renomear
uma extensão não converte o formato. Recarregue a página após alterações.

| Configuração em MENU_CONFIG | Função |
| --- | --- |
| backgroundImages | Lista ordenada de imagens; inclui os cinco nomes numerados e o arquivo antigo |
| backgroundPath | Caminho antigo preservado para compatibilidade; a lista usada pelo carrossel é backgroundImages |
| imageDisplaySeconds | Tempo parado por imagem; padrão 5 segundos |
| imageFadeSeconds | Duração do crossfade; padrão 1 segundo |
| imageScale | Zoom adicional sobre cover; mínimo 1 |
| imagePositionX / imagePositionY | Alinhamento: 0 início, 0.5 centro, 1 fim |
| leftShadeOpacity | Intensidade do gradiente esquerdo; padrão 0.65 |
| leftShadeWidth | Fração da largura com gradiente; padrão 0.48 |
| titleX / titleY | Posição do título; padrão 30 / 35 |
| titleScale / titleLineHeight | Escala bitmap e distância entre linhas; padrão 3 / 34 |
| optionsX / optionsY | Posição dos botões; padrão 30 / 181 |
| optionsWidth | Largura dos botões; padrão 174 |
| optionHeight / optionGap | Altura e intervalo; padrão 32 / 8 |

O carrossel usa o loop já existente do jogo, sem timers próprios. A atualização
para quando o menu está oculto, na dificuldade, no tutorial e durante a luta.
Ao voltar ao menu, a primeira imagem reaparece com seu tempo completo.
Enquanto a aba está oculta, o carrossel também fica parado.

O layout mantém BOXING / QUIZ / ARCADE à esquerda, com JOGAR e OPÇÕES abaixo,
sem painel central ou cartões. O indicador « » acompanha mouse e foco.
Tab, Enter e Espaço mantêm os controles dos botões HTML; as setas para cima e
baixo também mudam a seleção. JOGAR abre a dificuldade existente; OPÇÕES
reutiliza os controles de áudio e acessibilidade. Tutorial e início da luta
mantêm o mesmo fluxo. Para sair do jogo, use os controles do navegador.
