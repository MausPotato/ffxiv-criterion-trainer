import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const arena = await readFile(new URL('../../src/components/lalaru/LalaRuSummonedDollsArena.vue', import.meta.url), 'utf8');
const view = await readFile(new URL('../../src/views/LalaRuSummonedDollsTrainerView.vue', import.meta.url), 'utf8');
const trainer = await readFile(
  new URL('../../src/composables/useLalaRuSummonedDollsTrainer.ts', import.meta.url),
  'utf8'
);

test('summoned dolls uses the existing party cards as an accessible single-role picker', () => {
  assert.match(view, /<button[\s\S]*?v-for="member in trainer\.scenario\.party"/);
  assert.match(view, /:aria-pressed="trainer\.selectedPlayerId\.value === member\.id"/);
  assert.match(view, /@click="trainer\.selectPlayer\(member\.id\)"/);
  assert.match(view, /:disabled="trainer\.started\.value"/);
  assert.doesNotMatch(view, /<select|role-picker|角色選擇/);
  assert.match(arena, /'selected-player': member\.id === selectedPlayerId/);
  assert.match(view, /:party-positions="trainer\.partyPositions\.value"/);
  assert.match(view, /@update-player-position="trainer\.setSelectedPlayerPosition"/);
});

test('summoned dolls distinguishes tutorial placement from battle-controlled YOU movement', () => {
  assert.match(view, /TrainerPracticeSettings/);
  assert.match(view, /TrainerSegmentedControl/);
  assert.match(view, /value: 'tutorial'/);
  assert.match(view, /value: 'battle'/);
  assert.match(trainer, /mode\.value === 'battle' && member\.id === selectedPlayerId\.value/);
  assert.match(trainer, /setMode\(nextMode: SummonedDollsTrainerMode\)/);
});

test('summoned dolls uses the shared camera controls and rotates one complete world layer', () => {
  assert.match(arena, /useLalaRuArenaInteraction/);
  assert.match(arena, /<TrainerCameraControls/);
  assert.match(arena, /:visible="currentEvent !== null"/);
  assert.match(arena, /@rotate="rotateCameraBy"/);
  assert.match(arena, /@reset="resetCamera"/);
  assert.match(arena, /class="dolls-arena"[\s\S]*?:style="\{\s*\.\.\.cameraStyle/);
  assert.match(arena, /\.dolls-arena[^}]*transform:\s*rotate\(var\(--camera-rotation\)\)/);
  assert.match(arena, /canRotateCamera: \(\) => props\.currentEvent !== null/);
  assert.doesNotMatch(arena, /emit\(['"](?:reroll|restart|resetScenario)/);
  assert.match(trainer, /function rerollScenario/);
  assert.match(trainer, /function restart\(\)[\s\S]*?rerollScenario\(\)/);
  assert.doesNotMatch(trainer, /resetCamera/);
});

test('summoned dolls exposes candidate cells and uses a configurable transition for synchronized shift', () => {
  assert.match(arena, /v-for="\(position, index\) in shiftCandidatePositions"/);
  assert.match(arena, /class="shift-candidate"/);
  assert.match(arena, /shift-transition-enabled/);
  assert.match(arena, /transition:\s*left var\(--shift-display-ms\)/);
  assert.match(trainer, /mode\.value === 'tutorial' \|\| member\.id !== selectedPlayerId\.value/);
  assert.match(trainer, /currentEventId\.value === 'shift-to-former-aoe'/);
});

test('magic burst renders four event-controlled world circles below actors', () => {
  assert.match(view, /:magic-burst-circles="trainer\.magicBurstCircles\.value"/);
  assert.match(arena, /v-for="circle in magicBurstCircles"/);
  assert.match(arena, /:style="circleStyle\(circle\)"/);
  assert.match(arena, /:data-source-id="circle\.sourceId"/);
  assert.match(arena, /:data-radius-confirmed="circle\.radiusConfirmed"/);
  assert.match(arena, /\.magic-burst-circle[^}]*z-index:\s*6/);
  assert.match(arena, /\.party-member[^}]*z-index:\s*12/);
  assert.match(arena, /phase-second-telegraph/);
  assert.match(arena, /\.magic-burst-circle\.phase-tracking:not\(\.manual-control\)[^}]*transition:/);
  assert.match(trainer, /capturedAtEventId: 'magic-burst-snapshot'/);
  assert.match(trainer, /positions: clonePartyPositions\(partyPositions\.value\)/);
});

test('enumeration renders two DPS-centered ranges and a compact resolved result', () => {
  assert.match(view, /:enumeration-circles="trainer\.enumerationCircles\.value"/);
  assert.match(view, /:enumeration-result="trainer\.enumerationResult\.value"/);
  assert.match(arena, /v-for="circle in enumerationCircles"/);
  assert.match(arena, /class="enumeration-circle"/);
  assert.match(arena, /enumerationResult\.groups\[circle\.sourceId\]/);
  assert.match(arena, /class="enumeration-result"/);
  assert.match(arena, /\.enumeration-circle[^}]*z-index:\s*7/);
  assert.match(arena, /\.party-member[^}]*z-index:\s*12/);
});

test('summoned dolls keeps actor text upright while the world and direction markers rotate', () => {
  assert.match(arena, /--counter-rotation.*-cameraRotation/);
  assert.match(arena, /\.actor-label[^}]*rotate\(var\(--counter-rotation\)\)/);
  assert.match(arena, /\.cardinal\.north[^}]*rotate\(var\(--counter-rotation\)\)/);
  assert.match(arena, /\.cardinal\.east[^}]*rotate\(var\(--counter-rotation\)\)/);
});

test('summoned dolls reserves responsive space around every side instead of clipping dolls', () => {
  assert.match(arena, /\.dolls-camera-viewport[^}]*width:\s*min\(80cqw, calc\(80cqh - 96px\)/);
  assert.match(arena, /\.dolls-camera-viewport[^}]*max-width:\s*80%/);
  assert.match(arena, /\.dolls-camera-viewport[^}]*aspect-ratio:\s*1/);
  assert.match(arena, /\.dolls-camera-viewport[^}]*overflow:\s*visible/);
  assert.match(arena, /\.dolls-arena\s*\{[^}]*overflow:\s*visible/);
  assert.doesNotMatch(view, /overflow-y:\s*hidden/);
});

test('summoned doll markers are compact, scale with the arena, and do not show lane numbers', () => {
  assert.match(arena, /\.doll[^}]*width:\s*6%/);
  assert.match(arena, /\.doll span[^}]*font-size:\s*clamp\(/);
  assert.doesNotMatch(arena, /<small>\{\{\s*doll\.localLane \+ 1\s*\}\}<\/small>/);
});

test('summoned dolls presents relative lanes from the current mechanism configuration', () => {
  assert.match(view, /scenario\.configuration\.dollLanes/);
  assert.match(view, /scenario\.configuration\.safeLanes/);
  assert.match(view, /\{\{ dollLaneLabel \}\}/);
  assert.match(view, /\{\{ safeLaneLabel \}\}/);
  assert.doesNotMatch(view, /<dd>1・3・5<\/dd>/);
  assert.doesNotMatch(view, /<dd>2・4<\/dd>/);
});

test('gale lines support both vertical and horizontal world sides inside the rotating arena', () => {
  assert.match(arena, /function lineAoeStyle/);
  assert.match(arena, /dollSide === 'north'/);
  assert.match(arena, /dollSide === 'south'/);
  assert.match(arena, /right: '0'.*bottom: 'auto'.*left: '0'.*height: '20%'/);
  assert.match(arena, /:style="lineAoeStyle\(doll\)"/);
});

test('floor rendering exposes source effects and distinct pattern and light-blast states', () => {
  assert.match(arena, /:data-floor-effects=/);
  assert.match(arena, /state-aoe-telegraph/);
  assert.match(arena, /state-pattern-step/);
  assert.match(arena, /state-pattern-danger/);
  assert.match(arena, /state-light-blast-lethal/);
  assert.match(arena, /state-movement-safe/);
});
