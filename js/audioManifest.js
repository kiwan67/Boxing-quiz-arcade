// Optional local files. Paths resolve from the project root; no sound is bundled.
export const audioManifest = {};
const groups = {
 sfx: 'jab_swing jab_hit direct_swing direct_hit hook_swing hook_hit uppercut_swing uppercut_hit',
 defense: 'block dodge perfect_defense',
 special: 'counter_rush_start counter_rush_hit counter_chain_1 counter_chain_2 counter_chain_3 counter_chain_4 counter_chain_finish',
 ui: 'menu_select menu_confirm qte_appear qte_correct qte_wrong qte_timeout fight_start victory defeat',
 crowd: 'crowd_ambient crowd_clap crowd_cheer crowd_big_hit crowd_counter_rush crowd_victory',
 music: 'menu_theme fight_theme victory_theme defeat_theme'
};
for (const [folder, names] of Object.entries(groups)) for (const id of names.split(' ')) {
 audioManifest[id] = { path:`assets/audio/${folder}/${id}.mp3`, volume: .7,
 category: folder==='music'?'music':folder==='crowd'?'crowd':'effects',
 loop: folder==='music'||id==='crowd_ambient', maxSimultaneous: folder==='music'||id==='crowd_ambient'?1:3 };
}
