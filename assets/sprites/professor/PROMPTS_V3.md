Supplemental asset: `professor_actions_v3.png` (1254 × 1254, real RGBA).
Created with the built-in imagegen tool, using the approved observing v2 PNG as
the character reference. Original PNGs were neither edited nor deleted.
Only the selected cleanup result was copied into the project.

Final cleanup prompt:

Production cleanup of this EXACT 16 frame 4x4 professor supplemental animation sheet. Preserve all sixteen poses, exact character identity and pixel art, attire, cross necklace and glasses. Fix layout rigorously: 4 equally spaced columns and 4 equally spaced rows, ONE full character completely contained inside each cell, ALL feet with at least 20px transparent padding below them, head at least 15px padding, at least 15px padding on each side. Entire bottom row shoes must be complete, not cut by image edge. No pixels, color specks or shadows in the transparent gutters. Remove red/green fringe around the silhouette; clean pixel outline with true transparent alpha. Same pixel size/scale in all cells. Row1 idle all four feet positions and shoes IDENTICAL, chest breath only very subtle, frame3 blink closed eyes, frame4 tiny head glance. Rows2–4 keep existing transition release arms/turn, bend/step between imaginary ropes, straighten. No scenery/ropes/posts. Crisp true transparent background. Do not replace with generic art.

Validation: `node assets/sprites/professor/validate-actions.mjs`.
`--write` rebuilds only the measured JS crop metadata, never the PNG pixels.
Generated cells use alternating 313/314 pixel boundaries, not assumed 512px cells.
All idle soles share the measured local baseline y=295. Pose scale stays constant
through bends and raised legs; standing reference height is 275 source pixels.
