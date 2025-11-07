/* -------------------------
  Utilities
------------------------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b=0)=>a===b? a : Math.floor(Math.random()*(b-a+1))+a;
const nowStr=()=>new Date().toLocaleString();
const el=(id)=>document.getElementById(id);

const BASE_STAT_CAP = 1200;

function getEntityTier(entity){
  // entity: opponent object or null for player
  if(!entity) return (state.statTier || 1);
  return (entity.tier || 1);
}
function getStatCapForEntity(entity){
  return BASE_STAT_CAP * getEntityTier(entity);
}
function getEffectiveStatCapForPlayer(p) {
  const base = (BASE_STAT_CAP || 1200) * (state.statTier || 1);
  let countMaxed = 0;
  if (!p || !p.stats) return base;
  for (const k of Object.keys(p.stats)) {
    if (p.stats[k] >= base) countMaxed++;
  }
  return base - (countMaxed * 200);
}

function gutsToMinSpeed(guts) {
  const g = Math.max(100, Math.min(1200, Number(guts) || 100));
  return 11.1 + (g - 100) * 0.0025;
}

function _getWitsScale() {
  try {
    const w = (state && state.stats && typeof state.stats.Wits === 'number') ? state.stats.Wits : 100;
    return Math.max(0, Math.min(1, (w - 100) / (1200 - 100)));
  } catch (e) { return 0; }
}
function _witsDurationBonus() { return _getWitsScale() * 3; }
function _witsEffectMult() { return 1 + _getWitsScale() * 0.2; }

function _applyWitsScalingToMod(mod) {
  if(!mod) return;
  const mult = _witsEffectMult();
  if(mod.ms) mod.ms = mod.ms * mult;
  if(mod.ac) mod.ac = mod.ac * mult;
  if(mod.regen) mod.regen = mod.regen * mult;
  if(mod.regenPerTick) mod.regenPerTick = mod.regenPerTick * mult;
  if(mod.dmult) mod.dmult = mod.dmult * mult;
  if(mod.expires) {
    try {
      mod.expires = mod.expires + _witsDurationBonus();
    } catch(e) {}
  }
}

function applyAbilityChanceModifiers(baseChance, racer){
  if(typeof baseChance !== 'number' || !racer) return baseChance;
  let mult = 1;
  try{
    if(racer._mods){
      if(racer._mods.Concentrate && typeof racer._mods.Concentrate.chanceMultiplier === 'number'){
        mult *= racer._mods.Concentrate.chanceMultiplier;
      }
      if(racer._mods.Focus && typeof racer._mods.Focus.chanceMultiplier === 'number'){
        mult *= racer._mods.Focus.chanceMultiplier;
      }
    }
  }catch(e){ console.warn("applyAbilityChanceModifiers err", e); }
  return baseChance * mult;
}

function computeLateStartDelayWithModifiers(origDelay, racer){
  if(typeof origDelay !== 'number' || !racer) return origDelay;
  let mult = 1;
  try{
    if(racer._mods){
      if(racer._mods.Concentrate && typeof racer._mods.Concentrate.lateStartDelayMultiplier === 'number'){
        mult *= racer._mods.Concentrate.lateStartDelayMultiplier;
      }
      if(racer._mods.Focus && typeof racer._mods.Focus.lateStartDelayMultiplier === 'number'){
        mult *= racer._mods.Focus.lateStartDelayMultiplier;
      }
    }
  }catch(e){ console.warn("computeLateStartDelayWithModifiers err", e); }
  const out = Math.max(0, Math.round(origDelay * mult));
  return out;
}

/* -------------------------
  Races & Opponents (full data)
------------------------- */
const RACES = [
  // Debut
  { id: "Debut Race", grade: "Debut", track: "Dirt", distance: 1000, direction: "Right", rewardFame: 500, oneTime: true },

  // G3
  { id: "Silk Road Stakes", grade: "G3", track: "Turf", distance: 1200, direction: "Right", rewardFame: 650 },
  { id: "Sekiya Kinen", grade: "G3", track: "Turf", distance: 1600, direction: "Left", rewardFame: 750 },
  { id: "Unicorn Stakes", grade: "G3", track: "Dirt", distance: 1600, direction: "Left", rewardFame: 700 },
  { id: "Procyon Stakes", grade: "G3", track: "Dirt", distance: 1400, direction: "Left", rewardFame: 600 },
  { id: "Keisei Hai Autumn Handicap", grade: "G3", track: "Turf", distance: 1600, direction: "Right", rewardFame: 750 },
  { id: "Diamond Stakes", grade: "G3", track: "Turf", distance: 3400, direction: "Left", rewardFame: 2000 },
  { id: "Sirius Stakes", grade: "G3", track: "Dirt", distance: 2000, direction: "Right", rewardFame: 1000 },
  { id: "Miyako Stakes", grade: "G3", track: "Dirt", distance: 1800, direction: "Right", rewardFame: 800 },
  { id: "Hankyu Hai", grade: "G3", track: "Turf", distance: 1400, direction: "Right", rewardFame: 750 },
  { id: "Heian Stakes", grade: "G3", track: "Dirt", distance: 1900, direction: "Right", rewardFame: 900 },

  // G2
  { id: "Keio Hai Junior Stakes", grade: "G2", track: "Turf", distance: 1400, direction: "Left", rewardFame: 4000 },
  { id: "Keio Hai Cup", grade: "G2", track: "Turf", distance: 1600, direction: "Left", rewardFame: 6000 },
  { id: "Tokai Stakes", grade: "G2", track: "Dirt", distance: 1800, direction: "Left", rewardFame: 5000 },
  { id: "Mile Championship Nambu Hai", grade: "G2", track: "Dirt", distance: 1600, direction: "Left", rewardFame: 4000 },
  { id: "Kyoto Daishoten", grade: "G2", track: "Turf", distance: 2400, direction: "Right", rewardFame: 8500 },
  { id: "Centaur Stakes", grade: "G2", track: "Turf", distance: 1200, direction: "Right", rewardFame: 4000 },
  { id: "Kinko Sho", grade: "G2", track: "Turf", distance: 2000, direction: "Left", rewardFame: 7500 },

  // G1
  { id: "Champions Cup", grade: "G1", track: "Dirt", distance: 1800, direction: "Left", rewardFame: 10000, mustBeFirstG1: true },
  { id: "Arima Kinen", grade: "G1", track: "Turf", distance: 2500, direction: "Right", rewardFame: 15000 },
  { id: "Tenno Sho", grade: "G1", track: "Turf", distance: 3200, direction: "Right", rewardFame: 20000 },
  { id: "Sprinters Stakes", grade: "G1", track: "Turf", distance: 1200, direction: "Right", rewardFame: 10000 },
  { id: "Tokyo Daishoten", grade: "G1", track: "Dirt", distance: 2000, direction: "Right", rewardFame: 12000 },

  // Finale
  // URA Finale Path
  { id: "URA Finale - Qualifiers", grade: "Finale", track: "Turf", distance: 1400, direction: "Right", rewardFame: 20000, finalePath: "URA Finale", sequence: 1 },
  { id: "URA Finale - Semi-Finals", grade: "Finale", track: "Dirt", distance: 2000, direction: "Right", rewardFame: 25000, finalePath: "URA Finale", sequence: 2 },
  { id: "URA Finale - Finals", grade: "Finale", track: "Turf", distance: 2500, direction: "Right", rewardFame: 30000, finalePath: "URA Finale", sequence: 3 },

  // Triple Crown Finale Path
  { id: "Satsuki Sho", grade: "Finale", track: "Turf", distance: 2000, direction: "Right", rewardFame: 25000, finalePath: "Triple Crown Finale", sequence: 1 },
  { id: "Tokyo Yushun", grade: "Finale", track: "Turf", distance: 2400, direction: "Left", rewardFame: 25000, finalePath: "Triple Crown Finale", sequence: 2 },
  { id: "Kikuka Sho", grade: "Finale", track: "Turf", distance: 3000, direction: "Right", rewardFame: 25000, finalePath: "Triple Crown Finale", sequence: 3 },

  // Mongol Derby Finale Path
  { id: "Mongol Derby", grade: "Finale", track: "Dirt", distance: 1000000, direction: "Right", rewardFame: 250000, finalePath: "Mongol Derby", sequence: 1 }
];

const OPPONENTS = {
  "Gold Ship": {
	Debut:{minSpeed:12.02,maxSpeed:14.31,acc:3,stamina:150,regen:1},
	G3:{minSpeed:12.28,maxSpeed:15.42,acc:4,stamina:170,regen:1.2},
	G2:{minSpeed:12.54,maxSpeed:16.99,acc:5,stamina:250,regen:1.9},
	G1:{minSpeed:12.8,maxSpeed:18.55,acc:4.5,stamina:400,regen:1.6},
	Finale:{minSpeed:13.06,maxSpeed:19.55,acc:5,stamina:420,regen:1.7},
  },
  "Mejiro McQueen": {
	Debut:{minSpeed:12.29,maxSpeed:13.92,acc:3,stamina:160,regen:1.4},
	G3:{minSpeed:12.55,maxSpeed:15.2,acc:3.5,stamina:250,regen:1.4},
	G2:{minSpeed:12.82,maxSpeed:16.09,acc:4,stamina:320,regen:1.5},
	G1:{minSpeed:13.08,maxSpeed:17.88,acc:4.5,stamina:500,regen:1.7},
	Finale:{minSpeed:13.35,maxSpeed:18.88,acc:5,stamina:510,regen:1.8},
  },
  "Tokai Teio": {
	Debut:{minSpeed:12.18,maxSpeed:14.31,acc:3.5,stamina:145,regen:1.4},
	G3:{minSpeed:12.44,maxSpeed:15.42,acc:4,stamina:200,regen:1.6},
	G2:{minSpeed:12.7,maxSpeed:16.76,acc:4.5,stamina:260,regen:1.8},
	G1:{minSpeed:12.96,maxSpeed:18.78,acc:4.6,stamina:420,regen:1.8},
	Finale:{minSpeed:13.23,maxSpeed:19.78,acc:5,stamina:430,regen:1.9},
  },
  "Kitasan Black": {
	Debut:{minSpeed:12.12,maxSpeed:14.31,acc:3.6,stamina:150,regen:1.3},
	G3:{minSpeed:12.38,maxSpeed:15.42,acc:4.15,stamina:220,regen:1.4},
	G2:{minSpeed:12.64,maxSpeed:16.54,acc:4.55,stamina:290,regen:1.6},
	G1:{minSpeed:12.9,maxSpeed:18.55,acc:4.75,stamina:440,regen:1.6},
	Finale:{minSpeed:13.16,maxSpeed:19.55,acc:5.1,stamina:450,regen:1.7},
  },
  "Satono Diamond": {
	Debut:{minSpeed:12.09,maxSpeed:13.96,acc:3,stamina:155,regen:1.4},
	G3:{minSpeed:12.35,maxSpeed:15.33,acc:3.5,stamina:230,regen:1.4},
	G2:{minSpeed:12.61,maxSpeed:16.54,acc:3.75,stamina:315,regen:1.4},
	G1:{minSpeed:12.87,maxSpeed:18.55,acc:4.25,stamina:450,regen:1.4},
	Finale:{minSpeed:13.13,maxSpeed:19.55,acc:4.75,stamina:465,regen:1.5},
  },
  "Grass Wonder": {
	Debut:{minSpeed:11.99,maxSpeed:14.31,acc:3.25,stamina:145,regen:1},
	G3:{minSpeed:12.25,maxSpeed:15.65,acc:3.75,stamina:220,regen:1.1},
	G2:{minSpeed:12.51,maxSpeed:16.32,acc:4.25,stamina:300,regen:1.4},
	G1:{minSpeed:12.77,maxSpeed:18.33,acc:4.5,stamina:430,regen:1.5},
	Finale:{minSpeed:13.03,maxSpeed:19.33,acc:5,stamina:440,regen:1.6},
  },
  "Haru Urara": {
	Debut:{minSpeed:12.12,maxSpeed:13.41,acc:3,stamina:140,regen:0.9},
	G3:{minSpeed:12.38,maxSpeed:14.08,acc:3.1,stamina:170,regen:0.9},
	G2:{minSpeed:12.64,maxSpeed:14.98,acc:3.2,stamina:200,regen:1.2},
	G1:{minSpeed:12.9,maxSpeed:16.09,acc:3.5,stamina:300,regen:1.4},
	Finale:{minSpeed:13.16,maxSpeed:17.1,acc:3.6,stamina:360,regen:1.5},
  },
  "Oguri Cap": {
	Debut:{minSpeed:12.1,maxSpeed:14.31,acc:3.75,stamina:155,regen:1},
	G3:{minSpeed:12.36,maxSpeed:15.56,acc:4.5,stamina:230,regen:1.33},
	G2:{minSpeed:12.62,maxSpeed:16.81,acc:4.5,stamina:290,regen:1.42},
	G1:{minSpeed:12.88,maxSpeed:18.64,acc:5,stamina:420,regen:1.65},
	Finale:{minSpeed:13.14,maxSpeed:19.64,acc:5.25,stamina:440,regen:1.75},
  },
  "Tamamo Cross": {
	Debut:{minSpeed:12.09,maxSpeed:14.75,acc:3.5,stamina:145,regen:1},
	G3:{minSpeed:12.35,maxSpeed:15.83,acc:4,stamina:230,regen:1.3},
	G2:{minSpeed:12.61,maxSpeed:17.2,acc:4,stamina:290,regen:1.4},
	G1:{minSpeed:12.87,maxSpeed:18.78,acc:4.5,stamina:420,regen:1.5},
	Finale:{minSpeed:13.13,maxSpeed:19.78,acc:5,stamina:430,regen:1.6},
  },
  "Sakura Bakushin O": {
	Debut:{minSpeed:12.11,maxSpeed:14.75,acc:3.75,stamina:150,regen:1.05},
	G3:{minSpeed:12.37,maxSpeed:15.83,acc:4.4,stamina:220,regen:1.35},
	G2:{minSpeed:12.63,maxSpeed:16.99,acc:4.5,stamina:280,regen:1.45},
	G1:{minSpeed:12.89,maxSpeed:18.87,acc:4.8,stamina:400,regen:1.55},
	Finale:{minSpeed:13.15,maxSpeed:19.87,acc:5.1,stamina:420,regen:1.65},
  },
  "Special Week": {
	Debut:{minSpeed:12.16,maxSpeed:14.31,acc:3.25,stamina:155,regen:1.4},
	G3:{minSpeed:12.42,maxSpeed:15.42,acc:3.75,stamina:230,regen:1.4},
	G2:{minSpeed:12.68,maxSpeed:16.54,acc:4.25,stamina:300,regen:1.5},
	G1:{minSpeed:12.94,maxSpeed:18.51,acc:4.6,stamina:430,regen:1.7},
	Finale:{minSpeed:13.2,maxSpeed:19.51,acc:5,stamina:450,regen:1.8},
  },
  "Symboli Rudolf": {
	Debut:{minSpeed:12.22,maxSpeed:14.75,acc:6,stamina:155,regen:1.1},
	G3:{minSpeed:12.48,maxSpeed:15.7,acc:4,stamina:240,regen:1.2},
	G2:{minSpeed:12.74,maxSpeed:16.89,acc:4.5,stamina:320,regen:1.5},
	G1:{minSpeed:13.01,maxSpeed:18.7,acc:5,stamina:480,regen:1.7},
	Finale:{minSpeed:13.27,maxSpeed:19.7,acc:5.25,stamina:500,regen:1.8},
  },
  "Rice Shower": {
	Debut:{minSpeed:12.28,maxSpeed:13.64,acc:3,stamina:157,regen:1.5},
	G3:{minSpeed:12.54,maxSpeed:14.98,acc:4,stamina:230,regen:1.7},
	G2:{minSpeed:12.81,maxSpeed:16.28,acc:4.25,stamina:310,regen:1.8},
	G1:{minSpeed:13.07,maxSpeed:17.88,acc:4.5,stamina:490,regen:1.9},
	Finale:{minSpeed:13.34,maxSpeed:18.88,acc:5,stamina:500,regen:2.0},
  },
  "Agnes Tachyon": {
	Debut:{minSpeed:12.04,maxSpeed:14.31,acc:3.75,stamina:155,regen:1},
	G3:{minSpeed:12.3,maxSpeed:15.47,acc:4,stamina:240,regen:1.2},
	G2:{minSpeed:12.56,maxSpeed:16.99,acc:4.5,stamina:310,regen:1.4},
	G1:{minSpeed:12.82,maxSpeed:18.78,acc:4.8,stamina:450,regen:1.5},
	Finale:{minSpeed:13.08,maxSpeed:19.78,acc:5.2,stamina:460,regen:1.6},
  },
  "Silence Suzuka": {
	Debut:{minSpeed:12.26,maxSpeed:14.53,acc:3,stamina:150,regen:1},
	G3:{minSpeed:12.52,maxSpeed:15.87,acc:3.5,stamina:220,regen:1.1},
	G2:{minSpeed:12.79,maxSpeed:16.54,acc:4,stamina:300,regen:1.4},
	G1:{minSpeed:13.05,maxSpeed:18.55,acc:4.25,stamina:430,regen:1.5},
	Finale:{minSpeed:13.32,maxSpeed:19.55,acc:4.75,stamina:440,regen:1.6},
  },
  "King Halo": {
	Debut:{minSpeed:11.98,maxSpeed:14.75,acc:3,stamina:145,regen:1},
	G3:{minSpeed:12.24,maxSpeed:15.92,acc:3.5,stamina:180,regen:1.1},
	G2:{minSpeed:12.5,maxSpeed:17.2,acc:3.75,stamina:210,regen:1.2},
	G1:{minSpeed:12.76,maxSpeed:19.22,acc:4,stamina:350,regen:1.2},
	Finale:{minSpeed:13.02,maxSpeed:20.1,acc:4.5,stamina:370,regen:1.3},
  },
  "T.M. Opera O": {
	Debut:{minSpeed:12.28,maxSpeed:14.31,acc:3,stamina:160,regen:1},
	G3:{minSpeed:12.54,maxSpeed:15.42,acc:4,stamina:210,regen:1.2},
	G2:{minSpeed:12.81,maxSpeed:17.13,acc:4,stamina:300,regen:1.3},
	G1:{minSpeed:13.07,maxSpeed:18.87,acc:4.25,stamina:480,regen:1.5},
	Finale:{minSpeed:13.34,maxSpeed:19.87,acc:5.1,stamina:490,regen:1.6},
  },
  "Mihono Bourbon": {
	Debut:{minSpeed:12.28,maxSpeed:14.26,acc:3.75,stamina:155,regen:1},
	G3:{minSpeed:12.54,maxSpeed:15.87,acc:3.75,stamina:225,regen:1.2},
	G2:{minSpeed:12.81,maxSpeed:16.89,acc:4,stamina:315,regen:1.3},
	G1:{minSpeed:13.07,maxSpeed:18.55,acc:4.25,stamina:450,regen:1.4},
	Finale:{minSpeed:13.34,maxSpeed:19.55,acc:4.75,stamina:460,regen:1.5},
  },
  "Super Creek": {
	Debut:{minSpeed:12.26,maxSpeed:14.31,acc:3.75,stamina:150,regen:1.2},
	G3:{minSpeed:12.52,maxSpeed:15.65,acc:4.5,stamina:220,regen:1.4},
	G2:{minSpeed:12.79,maxSpeed:16.89,acc:4.5,stamina:320,regen:1.4},
	G1:{minSpeed:13.05,maxSpeed:18.46,acc:4.75,stamina:400,regen:1.6},
	Finale:{minSpeed:13.32,maxSpeed:19.46,acc:5,stamina:425,regen:1.7},
  },
  "Winning Ticket": {
	Debut:{minSpeed:11.99,maxSpeed:14.08,acc:3.5,stamina:150,regen:1},
	G3:{minSpeed:12.25,maxSpeed:15.42,acc:4,stamina:240,regen:1.1},
	G2:{minSpeed:12.51,maxSpeed:16.54,acc:4.5,stamina:320,regen:1.1},
	G1:{minSpeed:12.77,maxSpeed:18.33,acc:4.6,stamina:440,regen:1.2},
	Finale:{minSpeed:13.03,maxSpeed:19.33,acc:4.9,stamina:470,regen:1.3},
  },
  "Hishi Amazon": {
	Debut:{minSpeed:12.08,maxSpeed:14.31,acc:3.25,stamina:145,regen:0.9},
	G3:{minSpeed:12.34,maxSpeed:15.83,acc:3.75,stamina:230,regen:1},
	G2:{minSpeed:12.6,maxSpeed:16.99,acc:4.4,stamina:310,regen:1},
	G1:{minSpeed:12.86,maxSpeed:18.78,acc:4.5,stamina:390,regen:1.1},
	Finale:{minSpeed:13.12,maxSpeed:19.78,acc:5,stamina:400,regen:1.2},
  },
  "Still In Love": {
	Debut:{minSpeed:12.16,maxSpeed:14.08,acc:3.5,stamina:152,regen:1},
	G3:{minSpeed:12.42,maxSpeed:15.65,acc:4,stamina:240,regen:1.1},
	G2:{minSpeed:12.68,maxSpeed:16.76,acc:4.25,stamina:360,regen:1.1},
	G1:{minSpeed:12.94,maxSpeed:18.33,acc:4.55,stamina:450,regen:1.3},
	Finale:{minSpeed:13.2,maxSpeed:19.33,acc:4.85,stamina:460,regen:1.4},
  },
  "Stay Gold": {
	Debut:{minSpeed:12.29,maxSpeed:14.22,acc:3.5,stamina:150,regen:1.4},
	G3:{minSpeed:12.55,maxSpeed:15.2,acc:3.75,stamina:230,regen:1.6},
	G2:{minSpeed:12.82,maxSpeed:17.08,acc:4,stamina:280,regen:1.8},
	G1:{minSpeed:13,maxSpeed:18.42,acc:4.25,stamina:390,regen:1.9},
	Finale:{minSpeed:13.35,maxSpeed:19.42,acc:4.75,stamina:400,regen:2.0},
  },
  "Orfevre": {
	Debut:{minSpeed:11.97,maxSpeed:14.75,acc:3.25,stamina:155,regen:0.6},
	G3:{minSpeed:12.23,maxSpeed:15.65,acc:3.75,stamina:250,regen:0.8},
	G2:{minSpeed:12.49,maxSpeed:17.13,acc:4.25,stamina:350,regen:1},
	G1:{minSpeed:12.75,maxSpeed:18.78,acc:4.5,stamina:420,regen:1.1},
	Finale:{minSpeed:13,maxSpeed:19.78,acc:5,stamina:450,regen:1.2},
  },
  "Maruzensky":{
	Debut: {minSpeed:12.26,maxSpeed:14.75,acc:4,stamina:140,regen:1},
	G3: {minSpeed:12.52,maxSpeed:15.87,acc:4.25,stamina:180,regen:1.1},
	G2: {minSpeed:12.79,maxSpeed:17.08,acc:4.5,stamina:220,regen:1.1},
	G1: {minSpeed:13.05,maxSpeed:19.01,acc:4.5,stamina:320,regen:1.3},
	Finale:{minSpeed:13.32,maxSpeed:20,acc:5,stamina:350,regen:1.4},
  },
  "Daiwa Scarlet":{
	Debut: {minSpeed:12.21,maxSpeed:14.75,acc:3.25,stamina:155,regen:1.2},
	G3: {minSpeed:12.47,maxSpeed:15.42,acc:3.5,stamina:240,regen:1.4},
	G2: {minSpeed:12.73,maxSpeed:16.76,acc:3.75,stamina:320,regen:1.5},
	G1: {minSpeed:13,maxSpeed:18.55,acc:4,stamina:420,regen:1.7},
	Finale:{minSpeed:13.26,maxSpeed:19.56,acc:4.5,stamina:440,regen:1.8},
  },
  "Vodka":{
	Debut: {minSpeed:12,maxSpeed:14.31,acc:3.5,stamina:145,regen:0.9},
	G3: {minSpeed:12.26,maxSpeed:15.65,acc:3.75,stamina:220,regen:1},
	G2: {minSpeed:12.52,maxSpeed:16.99,acc:4.25,stamina:300,regen:1},
	G1: {minSpeed:12.78,maxSpeed:18.78,acc:4.5,stamina:390,regen:1.1},
	Finale:{minSpeed:13.04,maxSpeed:19.78,acc:5,stamina:400,regen:1.2},
  },
  "Matikanetannhauser":{
	Debut: {minSpeed:12.14,maxSpeed:14.31,acc:3.45,stamina:150,regen:1.1},
	G3: {minSpeed:12.4,maxSpeed:15.42,acc:3.75,stamina:220,regen:1.2},
	G2: {minSpeed:12.66,maxSpeed:16.54,acc:4.05,stamina:300,regen:1.3},
	G1: {minSpeed:12.92,maxSpeed:18.7,acc:4.3,stamina:400,regen:1.4},
	Finale:{minSpeed:13.18,maxSpeed:19.7,acc:4.8,stamina:430,regen:1.5},
  },
  "Meisho Doto":{
	Debut: {minSpeed:12.22,maxSpeed:14.08,acc:3.25,stamina:155,regen:1},
	G3: {minSpeed:12.48,maxSpeed:15.42,acc:3.5,stamina:240,regen:1.1},
	G2: {minSpeed:12.74,maxSpeed:16.54,acc:4,stamina:320,regen:1.3},
	G1: {minSpeed:13.01,maxSpeed:18.33,acc:4.25,stamina:460,regen:1.5},
	Finale:{minSpeed:13.27,maxSpeed:19.34,acc:4.75,stamina:480,regen:1.6},
  },
  "Taiki Shuttle":{
	Debut: {minSpeed:12.19,maxSpeed:14.53,acc:4.25,stamina:140,regen:1.1},
	G3: {minSpeed:12.45,maxSpeed:15.65,acc:4.5,stamina:180,regen:1.1},
	G2: {minSpeed:12.71,maxSpeed:17.16,acc:4.75,stamina:250,regen:1.2},
	G1: {minSpeed:12.97,maxSpeed:19.05,acc:5,stamina:300,regen:1.2},
	Finale:{minSpeed:13.24,maxSpeed:20.01,acc:5.25,stamina:320,regen:1.3},
  },
  "Biwa Hayahide":{
	Debut: {minSpeed:12.19,maxSpeed:14.31,acc:3.5,stamina:155,regen:1.2},
	G3: {minSpeed:12.45,maxSpeed:15.2,acc:3.75,stamina:250,regen:1.2},
	G2: {minSpeed:12.71,maxSpeed:16.76,acc:4,stamina:310,regen:1.3},
	G1: {minSpeed:12.97,maxSpeed:18.61,acc:4,stamina:430,regen:1.4},
	Finale:{minSpeed:13.24,maxSpeed:19.61,acc:4.55,stamina:445,regen:1.5},
  },
  "Air Shakur":{
	Debut: {minSpeed:11.94,maxSpeed:14.75,acc:3.25,stamina:155,regen:0.6},
	G3: {minSpeed:12.2,maxSpeed:15.65,acc:3.6,stamina:240,regen:0.8},
	G2: {minSpeed:12.46,maxSpeed:16.99,acc:4,stamina:300,regen:0.9},
	G1: {minSpeed:12.71,maxSpeed:18.78,acc:4.2,stamina:410,regen:1},
	Finale:{minSpeed:12.97,maxSpeed:19.78,acc:4.65,stamina:420,regen:1.1},
  },
  "Seiun Sky":{
	Debut: {minSpeed:12.09,maxSpeed:14.59,acc:3.5,stamina:160,regen:1},
	G3: {minSpeed:12.35,maxSpeed:15.56,acc:3.75,stamina:250,regen:1.1},
	G2: {minSpeed:12.61,maxSpeed:16.76,acc:4,stamina:320,regen:1.2},
	G1: {minSpeed:12.87,maxSpeed:18.55,acc:4.25,stamina:440,regen:1.3},
	Finale:{minSpeed:13.13,maxSpeed:19.56,acc:4.25,stamina:450,regen:1.4},
  },
  "Fenomeno":{
	Debut: {minSpeed:12.25,maxSpeed:13.8,acc:3.25,stamina:160,regen:1.4},
	G3: {minSpeed:12.51,maxSpeed:15.3,acc:3.5,stamina:250,regen:1.6},
	G2: {minSpeed:12.78,maxSpeed:16.33,acc:3.75,stamina:320,regen:1.7},
	G1: {minSpeed:13.04,maxSpeed:18.05,acc:4,stamina:480,regen:1.8},
	Finale:{minSpeed:13.3,maxSpeed:19,acc:4.25,stamina:500,regen:1.85},
  },
  //UMA LEGENDS
  "Man o' War": {
	Debut:{minSpeed:12.28,maxSpeed:14.55,acc:3.75,stamina:155,regen:1.2},
	G3:{minSpeed:12.54,maxSpeed:15.6,acc:4,stamina:230,regen:1.3},
	G2:{minSpeed:12.81,maxSpeed:17.2,acc:4.25,stamina:320,regen:1.4},
	G1:{minSpeed:13.07,maxSpeed:19,acc:4.5,stamina:480,regen:1.5},
	Finale:{minSpeed:13.34,maxSpeed:19.22,acc:4.75,stamina:500, regen:1.6},
  },
  "KINCSEM": {
	Debut:{minSpeed:12.34,maxSpeed:14.31,acc:4,stamina:160,regen:1.2},
	G3:{minSpeed:12.6,maxSpeed:15.55,acc:4.25,stamina:250,regen:1.4},
	G2:{minSpeed:12.87,maxSpeed:16.2,acc:4.5,stamina:360,regen:1.7},
	G1:{minSpeed:13.13,maxSpeed:18.72,acc:4.75,stamina:500,regen:1.9},
	Finale:{minSpeed:13.4,maxSpeed:19.02,acc:5.1,stamina:510, regen:2.0},
  },
  "Secretariat": {
	Debut:{minSpeed:12.29,maxSpeed:14.51,acc:4,stamina:145,regen:1.4},
	G3:{minSpeed:12.55,maxSpeed:15.85,acc:4.2,stamina:200,regen:1.5},
	G2:{minSpeed:12.82,maxSpeed:17.25,acc:4.5,stamina:300,regen:1.6},
	G1:{minSpeed:13.08,maxSpeed:19.22,acc:4.75,stamina:450,regen:1.7},
	Finale:{minSpeed:13.35,maxSpeed:20.22,acc:5.25,stamina:480, regen:1.8},
  },
};

const OPPONENTS_THAT_CAN_BE_RUSHED = [
  "Gold Ship",
  "Mejiro McQueen",
  "Tokai Teio",
  "Kitasan Black",
  "Satono Diamond",
  "Grass Wonder",
  "Haru Urara",
  "Oguri Cap",
  "Tamamo Cross",
  "Sakura Bakushin O",
  "Special Week",
  "Symboli Rudolf",
  "Rice Shower",
  "Agnes Tachyon",
  "Silence Suzuka",
  "King Halo",
  "T.M. Opera O",
  "Mihono Bourbon",
  "Super Creek",
  "Winning Ticket",
  "Hishi Amazon",
  "Still In Love",
  "Stay Gold",
  "Orfevre",
  "Maruzensky",
  "Daiwa Scarlet",
  "Vodka",
  "Matikanetannhauser",
  "Meisho Doto",
  "Taiki Shuttle",
  "Biwa Hayahide",
  "Air Shakur",
  "Seiun Sky",
];

function findRacerByName(rs, name){
  return (rs.field||[]).find(x => (x.name||"").toString().toLowerCase() === (name||"").toString().toLowerCase());
}

const OPPONENT_SPECIALS = {
  "Oguri Cap": {
    id: "Triumphant Pulse",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Triumph) return;
      const ms = r.maxSpeed * 0.10;
      const ac = r.acc * 0.05;
      r._mods = r._mods || {};
      r._mods.Triumph = { ms, ac, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac;
      addLog(`<div class="warn">${r.name} has activated Triumphant Pulse!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Triumph){ r.maxSpeed -= r._mods.Triumph.ms; r.acc -= r._mods.Triumph.ac; delete r._mods.Triumph; } }, 10000);
    }
  },
  "Tamamo Cross": {
    id: "White Lightning",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.WhiteLightning) return;
      const ac = r.acc * 0.10;
      const ms = r.maxSpeed * 0.05;
      r._mods = r._mods || {};
      r._mods.WhiteLightning = { ac, ms, expires: rs.time + 10 };
      r.acc += ac; r.maxSpeed += ms;
      addLog(`<div class="warn">${r.name} has activated White Lightning!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.WhiteLightning){ r.acc -= r._mods.WhiteLightning.ac; r.maxSpeed -= r._mods.WhiteLightning.ms; delete r._mods.WhiteLightning; } }, 10000);
    }
  },
  "Symboli Rudolf": {
    id: "Behold Thine Emperor's Divine Might!",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Rudolf) return;
      r._mods = r._mods || {};
      r._mods.Rudolf = { noDrain: true, expires: rs.time + 10 };
      r.stamina = r.staminaMax;
      addLog(`<div class="warn">${r.name} has activated Behold Thine Emperor's Divine Might!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Rudolf){ delete r._mods.Rudolf; } }, 10000);
    }
  },
  "Still In Love": {
    id: "Blinding Love",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.BlindingLove) return;
      r._mods = r._mods || {};
      r._mods.BlindingLove = { appliedTo: [], expires: rs.time + 15 };
      // reduce others' maxSpeed by 5%
      for(const other of rs.field){
        if(other === r) continue;
        other._mods = other._mods || {};
        if(!other._mods.BlindedByStill){
          const ms = other.maxSpeed * 0.05;
          other._mods.BlindedByStill = { ms };
          other.maxSpeed = Math.max(11.1, other.maxSpeed - ms);
          r._mods.BlindingLove.appliedTo.push(other);
        }
      }
      addLog(`<div class="warn">${r.name} has activated Blinding Love!</div>`);
      setTimeout(()=>{ // revert
        if(r._mods && r._mods.BlindingLove){
          for(const oth of r._mods.BlindingLove.appliedTo || []){
            if(oth._mods && oth._mods.BlindedByStill){
              oth.maxSpeed += oth._mods.BlindedByStill.ms;
              delete oth._mods.BlindedByStill;
            }
          }
          delete r._mods.BlindingLove;
        }
      }, 15000);
    }
  },
  "Agnes Tachyon": {
    id: "U=MA^2",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Agnes) return;
      r._mods = r._mods || {};
      const ticks = 3; const intervalMs = 5000;
      r._mods.Agnes = { intervals: [], expires: rs.time + 15 };
      let cnt = 0;
      const iv = setInterval(()=>{
        if(!r._mods || !r._mods.Agnes) { clearInterval(iv); return; }
        const ms = r.maxSpeed * 0.05;
        r.maxSpeed += ms;
        r.speed += ms;
        (r._mods.Agnes.intervals || []).push(ms);
        cnt++;
        if(cnt >= ticks){ clearInterval(iv); }
      }, intervalMs);
      r._mods.Agnes.intervalId = iv;
      addLog(`<div class="warn">${r.name} has activated U=MA^2!</div>`);
      setTimeout(()=>{
        if(r._mods && r._mods.Agnes){
          const arr = r._mods.Agnes.intervals || [];
          const total = arr.reduce((a,b)=>a+b,0);
          r.maxSpeed = Math.max(11.1, r.maxSpeed - total);
          delete r._mods.Agnes;
        }
      }, 15000 + 100);
    }
  },
  "Kitasan Black": {
    id: "Shout Of Victory",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Kitasan) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.08;
      const ac = r.acc * 0.08;
      r._mods.Kitasan = { ms, ac, expires: rs.time + 8 };
      r.maxSpeed += ms; r.acc += ac;
      addLog(`<div class="warn">${r.name} has activated Shout Of Victory!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Kitasan){ r.maxSpeed -= r._mods.Kitasan.ms; r.acc -= r._mods.Kitasan.ac; delete r._mods.Kitasan; } }, 8000);
    }
  },
  "Sakura Bakushin O": {
    id: "Class Rep + Speed = Bakushin!",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Sakura) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.25;
      r._mods.Sakura = { ms, expires: rs.time + 5 };
      r.maxSpeed += ms;
      addLog(`<div class="warn">${r.name} has activated Class Rep + Speed = Bakushin!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Sakura){ r.maxSpeed -= r._mods.Sakura.ms; delete r._mods.Sakura; } }, 5000);
    }
  },
  "Rice Shower": {
    id: "Blue Rose Closer",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.RiceShower) return;
      r._mods = r._mods || {};
      const remaining = Math.max(0, rs.race.distance - r.pos);
      const units = Math.floor((rs.race.distance - r.pos) / 100);
      const pct = 0.02 * units;
      const ms = r.maxSpeed * pct;
      r._mods.RiceShower = { ms, expires: rs.time + 5 };
      r.maxSpeed += ms;
      addLog(`<div class="warn">${r.name} has activated Blue Rose Closer!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.RiceShower){ r.maxSpeed -= r._mods.RiceShower.ms; delete r._mods.RiceShower; } }, 5000);
    }
  },
  "Tokai Teio": {
    id: "Tokai Teio Sky Jump",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Tokai) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.10;
      r._mods.Tokai = { ms, expires: rs.time + 8 };
      r.maxSpeed += ms;
      addLog(`<div class="warn">${r.name} has activated Tokai Teio Sky Jump!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Tokai){ r.maxSpeed -= r._mods.Tokai.ms; delete r._mods.Tokai; } }, 8000);
    }
  },
  "Mihono Bourbon": {
    id: "G00 1st. F∞;",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Mihino) return;
      r._mods = r._mods || {};
      const ac = r.acc * 0.50;
      const regen = (r.regenPerTick || 0.1) * 0.50;
      r._mods.Mihino = { ac, regen, expires: rs.time + 10 };
      r.acc += ac; r.regenPerTick = (r.regenPerTick || 0.1) + regen;
      addLog(`<div class="warn">${r.name} has activated G00 1st. F∞;!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Mihino){ r.acc -= r._mods.Mihino.ac; r.regenPerTick = Math.max(0, r.regenPerTick - r._mods.Mihino.regen); delete r._mods.Mihino; } }, 10000);
    }
  },
  "Haru Urara": {
    id: "Super Duper Climax",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Mihino) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.10;
      const regen = (r.regenPerTick || 0.1) * 0.50;
      r._mods.Mihino = { ms, regen, expires: rs.time + 10 };
      r.maxSpeed += ms; r.regenPerTick = (r.regenPerTick || 0.1) + regen;
      addLog(`<div class="warn">${r.name} has activated Super Duper Climax!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Mihino){ r.maxSpeed -= r._mods.Mihino.ms; r.regenPerTick = Math.max(0, r.regenPerTick - r._mods.Mihino.regen); delete r._mods.Mihino; } }, 10000);
    }
  },
  "Mejiro McQueen": {
    id: "The Duty Of Dignity Calls",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Mejiro) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.10;
      const ac = r.acc * 1.00;
      const regen = (r.regenPerTick || 0.1) * 1.00;
      r._mods.Mejiro = { ms, ac, regen, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac; r.regenPerTick = (r.regenPerTick || 0.1) + regen;
      addLog(`<div class="warn">${r.name} has activated The Duty Of Dignity Calls!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Mejiro){ r.maxSpeed -= r._mods.Mejiro.ms; r.acc -= r._mods.Mejiro.ac; r.regenPerTick = Math.max(0, r.regenPerTick - r._mods.Mejiro.regen); delete r._mods.Mejiro; } }, 10000);
    }
  },
  "Gold Ship": {
    id: "Anchors Aweigh!",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.GoldShip) return;
      r._mods = r._mods || {};
      // 50/50 chance to +50% ms or -20% ms for 6s
      if(Math.random() < 0.5){
        const ms = r.maxSpeed * 0.67;
        r._mods.GoldShip = { ms, sign: 1, expires: rs.time + 6 };
        r.maxSpeed += ms;
        addLog(`<div class="warn">${r.name} has activated Anchors Aweigh!</div>`);
      } else {
        const ms = r.maxSpeed * 0.25;
        r._mods.GoldShip = { ms, sign: -1, expires: rs.time + 6 };
        r.maxSpeed = Math.max(11.1, r.maxSpeed - ms);
        addLog(`<div class="warn">${r.name} has activated Anchors Aweigh!</div>`);
      }
      setTimeout(()=>{ if(r._mods && r._mods.GoldShip){ if(r._mods.GoldShip.sign === 1) r.maxSpeed = Math.max(11.1, r.maxSpeed - r._mods.GoldShip.ms); else r.maxSpeed += r._mods.GoldShip.ms; delete r._mods.GoldShip; } }, 6000);
    }
  },
  "Super Creek": {
    id: "Swinging Maestro",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.SuperCreek) return;
      if(!r.reachedMiddle) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.12;
      const ac = r.acc * 0.12;
      r._mods.SuperCreek = { ms, ac, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac;
      addLog(`<div class="warn">${r.name} has activated Swinging Maestro!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.SuperCreek){ r.maxSpeed -= r._mods.SuperCreek.ms; r.acc -= r._mods.SuperCreek.ac; delete r._mods.SuperCreek; } }, 10000);
    }
  },
  "Maruzensky": {
    id: "Red Shift",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Maruzensky) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.20;
      r._mods.Maruzensky = { ms, expires: rs.time + 5 };
      r.maxSpeed += ms;
      addLog(`<div class="warn">${r.name} has activated Red Shift!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Maruzensky){ r.maxSpeed -= r._mods.Maruzensky.ms; delete r._mods.Maruzensky; } }, 5000);
    }
  },
  "Daiwa Scarlet": {
    id: "Red Ace",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      // only when Vodka in same race
      const vodka = findRacerByName(rs, "Vodka");
      if(!vodka) return;
      if(r._mods && r._mods.Daiwa) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.15;
      r._mods.Daiwa = { ms, expires: rs.time + 10 };
      r.maxSpeed += ms;
      addLog(`<div class="warn">${r.name} has activated Red Ace!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Daiwa){ r.maxSpeed -= r._mods.Daiwa.ms; delete r._mods.Daiwa; } }, 10000);
    }
  },
  "Vodka": {
    id: "Xceleration",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      // only when Daiwa Scarlet in same race
      const dair = findRacerByName(rs, "Daiwa Scarlet");
      if(!dair) return;
      if(r._mods && r._mods.Vodka) return;
      r._mods = r._mods || {};
      const ac = r.acc * 0.25;
      const regen = (r.regenPerTick || 0.1) * 0.25;
      r._mods.Vodka = { ac, regen, expires: rs.time + 15 };
      r.acc += ac; r.regenPerTick = (r.regenPerTick || 0.1) + regen;
      addLog(`<div class="warn">${r.name} has activated Xceleration!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Vodka){ r.acc -= r._mods.Vodka.ac; r.regenPerTick = Math.max(0, r.regenPerTick - r._mods.Vodka.regen); delete r._mods.Vodka; } }, 15000);
    }
  },
  "Special Week": {
    id: "Shooting Star",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.SpecialWeek) return;
      r._mods = r._mods || {};
      // +2% max speed for every 150 meters closer to finish (applied once) for 5s
      const units = Math.floor((rs.race.distance - r.pos) / 150);
      const pct = 0.02 * units;
      const ms = r.maxSpeed * pct;
      r._mods.SpecialWeek = { ms, expires: rs.time + 5 };
      r.maxSpeed += ms;
      addLog(`<div class="warn">${r.name} has activated Shooting Star!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.SpecialWeek){ r.maxSpeed -= r._mods.SpecialWeek.ms; delete r._mods.SpecialWeek; } }, 5000);
    }
  },
  "T.M. Opera O": {
    id: "This Dance Is for Vittoria!",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.TMOpera) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.05;
      const ac = r.acc * 0.05;
      r._mods.TMOpera = { ms, ac, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac;
      addLog(`<div class="warn">${r.name} has activated This Dance Is for Vittoria!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.TMOpera){ r.maxSpeed -= r._mods.TMOpera.ms; r.acc -= r._mods.TMOpera.ac; delete r._mods.TMOpera; } }, 10000);
    }
  },
  "Fenomeno": {
    id: "Target Acquired!",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Fenomeno) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.1;
      r._mods.Fenomeno = { ms, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac;
      addLog(`<div class="warn">${r.name} has activated This Dance Is for Vittoria!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Fenomeno){ r.maxSpeed -= r._mods.Fenomeno.ms; r.acc -= r._mods.Fenomeno.ac; delete r._mods.Fenomeno; } }, 10000);
    }
  },
  "Fenomeno": {
    id: "Target Acquired!",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Fenomeno) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.1;
      r._mods.Fenomeno = { ms, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac;
      addLog(`<div class="warn">${r.name} has activated This Dance Is for Vittoria!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Fenomeno){ r.maxSpeed -= r._mods.Fenomeno.ms; r.acc -= r._mods.Fenomeno.ac; delete r._mods.Fenomeno; } }, 10000);
    }
  },
  "Man o' War": {
    id: "The Greatest Stands Above All",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Secretariat) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.1;
      const ac = r.acc * 0.1;
	  r.stamina = r.staminaMax;
      r._mods.Secretariat = { ms, ac, noDrain: true, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac;
      addLog(`<div class="warn">${r.name} has activated The Greatest Stands Above All!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Secretariat){ r.maxSpeed -= r._mods.Secretariat.ms; r.acc -= r._mods.Secretariat.ac; delete r._mods.Secretariat; } }, 10000);
    }
  },
  "KINCSEM": {
    id: "Winning Is My Middle Name!",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Secretariat) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.33;
      const regen = (r.regenPerTick || 0.1) * 0.5;
      r._mods.Secretariat = { ms, regen, expires: rs.time + 10 };
      r.maxSpeed += ms; r.regenPerTick = (r.regenPerTick || 0.1) + regen;
      addLog(`<div class="warn">${r.name} has activated Winning Is My Middle Name!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Secretariat){ r.maxSpeed -= r._mods.Secretariat.ms; r.regenPerTick = Math.max(0, r.regenPerTick - r._mods.Secretariat.regen); delete r._mods.Secretariat; } }, 10000);
    }
  },
  "Secretariat": {
    id: "The Greatest Stands Above All",
    chance: 0.002, minPct: 40,
    activate: (r, rs) => {
      if(r._mods && r._mods.Secretariat) return;
      r._mods = r._mods || {};
      const ms = r.maxSpeed * 0.2;
      const ac = r.acc * 0.2;
      const regen = (r.regenPerTick || 0.1) * 0.25;
      r._mods.Secretariat = { ms, ac, regen, expires: rs.time + 10 };
      r.maxSpeed += ms; r.acc += ac; r.regenPerTick = (r.regenPerTick || 0.1) + regen;
      addLog(`<div class="warn">${r.name} has activated The Greatest Stands Above All!</div>`);
      setTimeout(()=>{ if(r._mods && r._mods.Secretariat){ r.maxSpeed -= r._mods.Secretariat.ms; r.acc -= r._mods.Secretariat.ac; r.regenPerTick = Math.max(0, r.regenPerTick - r._mods.Secretariat.regen); delete r._mods.Secretariat; } }, 10000);
    }
  },
};

const DRY_RUNNERS = [
  "Mejiro McQueen","Satono Diamond","Grass Wonder","Sakura Bakushin O","Silence Suzuka",
  "King Halo","Hishi Amazon","Still In Love","Stay Gold","Daiwa Scarlet","Vodka",
  "Matikanetannhauser","Meisho Doto","Air Shakur","Seiun Sky","Fenomeno","Secretariat"
];

const WET_RUNNERS = [
  "Gold Ship","Haru Urara","Agnes Tachyon","T.M. Opera O","Mihono Bourbon","KINCSEM"
];

const VERSATILE_RUNNERS = [
  "Tokai Teio","Kitasan Black","Oguri Cap","Tamamo Cross","Special Week",
  "Symboli Rudolf","Rice Shower","Super Creek","Winning Ticket","Orfevre",
  "Maruzensky","Taiki Shuttle","Biwa Hayahide","Man o' War"
];

/* -------------------------
  Default Player State
------------------------- */
const DEFAULT_PLAYER = {
  name: "Player",
  stats: {Speed:100,Stamina:100,Power:100,Guts:100,Wits:100},
  energy:100,
  fame:0,
  sp:0,
  racesDone:0,
  wins:0,
  losses:0,
  abilities:{unlockedPassives:[],unlockedActives:[],unlockedUniques:[],equippedPassives:[],equippedUnique: null,equippedActive:null},
  training:{counts:{Speed:0,Stamina:0,Power:0,Guts:0,Wits:0},levels:{Speed:1,Stamina:1,Power:1,Guts:1,Wits:1},totalTrains:0,locked:false,daysUntilRace:30,lockRaceCount:null},
  completed:{},
  highestTitle: "None",
};

let state = loadState() || JSON.parse(JSON.stringify(DEFAULT_PLAYER));
if(!state.name) state.name = DEFAULT_PLAYER.name;
if(!state.training) state.training = DEFAULT_PLAYER.training;
if(!state.abilities) state.abilities = DEFAULT_PLAYER.abilities;

/* -------------------------
  Abilities (passives + actives) - structured
  - Passives have condition, apply, remove
  - Actives have fn handlers in useActiveById
------------------------- */
const PASSIVE_CONFLICT_GROUPS = [
  ["Dirty Runner", "Turf Runner"],
  ["Sunny Days", "Cloudy Days", "Rainy Days"],
  ["Firm Conditions", "Wet Conditions"],
  ["Focus", "Concentration"],
  ["Left-Handed", "Right-Handed"],
];

const ABILITIES = {
  passives: [
    {id:"Dirty Runner", cost:50, desc: "Increase performance on Dirt tracks.",
      condition:(rs,p)=> rs.race.track === "Dirt",
      apply:(r,rs)=>{ r._mods = r._mods||{}; if(!r._mods.DirtyRunner){ r._mods.DirtyRunner = r.maxSpeed*0.05; r.maxSpeed += r._mods.DirtyRunner; } },
      remove:(r)=>{ if(r._mods && r._mods.DirtyRunner){ r.maxSpeed -= r._mods.DirtyRunner; delete r._mods.DirtyRunner; } }
    },
	{id:"Turf Runner", cost:80, desc: "Increase performance on Turf tracks.",
      condition:(rs,p)=> rs.race.track === "Turf",
      apply:(r,rs)=>{ r._mods = r._mods||{}; if(!r._mods.TurfRunner){ r._mods.TurfRunner = r.maxSpeed*0.05; r.maxSpeed += r._mods.TurfRunner; } },
      remove:(r)=>{ if(r._mods && r._mods.TurfRunner){ r.maxSpeed -= r._mods.TurfRunner; delete r._mods.TurfRunner; } }
    },
    {id:"Lucky Seven", cost:100, desc: "Good things will happen if placed in bracket 7.",
      condition:(rs,p)=> p.number===7,
      apply:(r,rs)=>{ r._mods = r._mods||{}; if(!r._mods.LuckySeven){ r._mods.LuckySeven = {ms:r.maxSpeed*0.05,ac:r.acc*0.05}; r.maxSpeed += r._mods.LuckySeven.ms; r.acc += r._mods.LuckySeven.ac; } },
      remove:(r)=>{ if(r._mods && r._mods.LuckySeven){ r.maxSpeed -= r._mods.LuckySeven.ms; r.acc -= r._mods.LuckySeven.ac; delete r._mods.LuckySeven; } }
    },
	{id: "Sunny Days", cost: 50, desc: "Increase performance in Sunny weather.",
	  condition: (rs,p) => { if (!rs||!p) return false; return true; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.SunnyDaysActive) { if (!rs || rs.weather !== "Sunny") { if (typeof r._mods.SunnyDays.prev === "number") r.maxSpeed = r._mods.SunnyDays.prev; delete r._mods.SunnyDaysActive; delete r._mods.SunnyDays; } return; } r._mods.SunnyDaysActive = true; r._mods.SunnyDays = r._mods.SunnyDays || {}; r._mods.SunnyDays.prev = r.maxSpeed || 0; if (rs && rs.weather === "Sunny") r.maxSpeed = (r.maxSpeed || 0) * 1.08; else r.maxSpeed = (r.maxSpeed || 0) * 0.92; },
	  remove: (r) => { if (!r._mods || !r._mods.SunnyDays) return; if (typeof r._mods.SunnyDays.prev === "number") r.maxSpeed = r._mods.SunnyDays.prev; delete r._mods.SunnyDays; delete r._mods.SunnyDaysActive; }
	},
	{id: "Cloudy Days", cost: 50, desc: "Increase performance in Cloudy weather.",
	  condition: (rs,p) => { if (!rs||!p) return false; return true; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.CloudyDaysActive) { if (!rs || rs.weather !== "Cloudy") { if (typeof r._mods.CloudyDays.prev === "number") r.maxSpeed = r._mods.CloudyDays.prev; if (typeof r._mods.CloudyDays.prevAcc === "number") r.acc = r._mods.CloudyDays.prevAcc; delete r._mods.CloudyDaysActive; delete r._mods.CloudyDays; } return; } r._mods.CloudyDaysActive = true; r._mods.CloudyDays = r._mods.CloudyDays || {}; r._mods.CloudyDays.prev = r.maxSpeed || 0; r._mods.CloudyDays.prevAcc = r.acc || 0; if (rs && rs.weather === "Cloudy") { if (rs.track === "Good" && r._mods && r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') { r.maxSpeed = (r._mods._prev.maxSpeed || 0) * 1.05; } else { r.maxSpeed = (r.maxSpeed || 0) * 1.05; } } else { r.maxSpeed = (r.maxSpeed || 0) * 0.95; } },
	  remove: (r) => { if (!r._mods || !r._mods.CloudyDays) return; if (typeof r._mods.CloudyDays.prev === "number") r.maxSpeed = r._mods.CloudyDays.prev; if (typeof r._mods.CloudyDays.prevAcc === "number") r.acc = r._mods.CloudyDays.prevAcc; delete r._mods.CloudyDays; delete r._mods.CloudyDaysActive; }
	},
	{id: "Rainy Days", cost: 50, desc: "Increase performance in Rainy weather.",
	  condition: (rs,p) => { if (!rs||!p) return false; return true; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.RainyDaysActive) { if (!rs || rs.weather !== "Rainy") { if (typeof r._mods.RainyDays.prev === "number") r.maxSpeed = r._mods.RainyDays.prev; if (typeof r._mods.RainyDays.prevAcc === "number") r.acc = r._mods.RainyDays.prevAcc; delete r._mods.RainyDaysActive; delete r._mods.RainyDays; } return; } r._mods.RainyDaysActive = true; r._mods.RainyDays = r._mods.RainyDays || {}; r._mods.RainyDays.prev = r.maxSpeed || 0; r._mods.RainyDays.prevAcc = r.acc || 0; if (rs && rs.weather === "Rainy") { if (rs.track === "Wet" && r._mods && r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') { r.maxSpeed = (r._mods._prev.maxSpeed || 0) * 1.05; r.acc = (r._mods._prev.acc || 0); } else { r.maxSpeed = (r.maxSpeed || 0) * 1.05; } } else { r.maxSpeed = (r.maxSpeed || 0) * 0.95; } },
	  remove: (r) => { if (!r._mods || !r._mods.RainyDays) return; if (typeof r._mods.RainyDays.prev === "number") r.maxSpeed = r._mods.RainyDays.prev; if (typeof r._mods.RainyDays.prevAcc === "number") r.acc = r._mods.RainyDays.prevAcc; delete r._mods.RainyDays; delete r._mods.RainyDaysActive; }
	},
	{id: "Firm Conditions", cost: 100, desc: "Increase performance in firm tracks.",
	  condition: (rs,p) => { if (!rs||!p) return false; return rs.track === "Firm"; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.FirmConditionsActive) return; r._mods.FirmConditionsActive = true; r._mods.FirmConditions = r._mods.FirmConditions || {}; r._mods.FirmConditions.prev = r.maxSpeed || 0; r.maxSpeed = (r.maxSpeed || 0) * 1.05; },
	  remove: (r) => { if (!r._mods || !r._mods.FirmConditions) return; if (typeof r._mods.FirmConditions.prev === "number") r.maxSpeed = r._mods.FirmConditions.prev; delete r._mods.FirmConditions; delete r._mods.FirmConditionsActive; }
	},
	{id: "Wet Conditions", cost: 100, desc: "Increase performance in softer tracks.",
	  condition: (rs,p) => { if (!rs||!p) return false; return rs.track === "Good" || rs.track === "Wet"; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.WetConditionsActive) return; r._mods.WetConditionsActive = true; r._mods.WetConditions = r._mods.WetConditions || {}; r._mods.WetConditions.prev = r.maxSpeed || 0; r.maxSpeed = (r.maxSpeed || 0) * 1.10; },
	  remove: (r) => { if (!r._mods || !r._mods.WetConditions) return; if (typeof r._mods.WetConditions.prev === "number") r.maxSpeed = r._mods.WetConditions.prev; delete r._mods.WetConditions; delete r._mods.WetConditionsActive; }
	},
	{id: "Focus", cost: 100, desc: "Increase timing, keep calm, and decrease time lost to Late Starts.",
	  condition: (rs, p) => !!p,
	  apply: (r, rs) => { r._mods = r._mods || {}; if(!r._mods.Focus){ r._mods.Focus = { chanceMultiplier: 0.5, lateStartDelayMultiplier: 0.5 }; } else { r._mods.Focus.chanceMultiplier = 0.5; r._mods.Focus.lateStartDelayMultiplier = 0.5; } },
      remove: (r, rs) => { if(r && r._mods && r._mods.Focus) try{ delete r._mods.Focus; }catch(e){} }
	},
	{id: "Concentrate", cost: 200, desc: "Maximize timing and stay out of pressure.",
	  condition: (rs, p) => !!p,
	  apply: (r, rs) => { r._mods = r._mods || {}; if(!r._mods.Concentrate){ r._mods.Concentrate = { chanceMultiplier: 0.0, lateStartDelayMultiplier: 0.0 }; } else { r._mods.Concentrate.chanceMultiplier = 0.0; r._mods.Concentrate.lateStartDelayMultiplier = 0.0; } },
	  remove: (r, rs) => { if(r && r._mods && r._mods.Concentrate) try{ delete r._mods.Concentrate; }catch(e){} }
	},
	{id: "Preferred Position", cost: 150, desc: "Gain a boost in performance if you're in a preferred position.",
	  condition: (rs, p) => { if (!rs || !p) { return false; let progress = null; } if (typeof rs.progress === "number") { progress = rs.progress; } else if (typeof rs.race === "object" && typeof p.pos === "number" && rs.race.distance > 0) { progress = p.pos / rs.race.distance; } if (progress === null || progress < 0.5) { return false; const uq = (state && state.abilities && state.abilities.equippedUnique) ? state.abilities.equippedUnique : null; } if (!uq) { return false; const rank = getCurrentRank(rs, p); const total = (rs.field || []).length || 1; } if (uq === "Front Runner") { return rank >= 1 && rank <= 3; } if (uq === "Pace Chaser") { const threshold = Math.ceil(total / 2); return rank <= threshold; } if (uq === "Late Surger") { const threshold = Math.ceil(total / 2); return rank > threshold; } if (uq === "End Closer") { const threshold = Math.ceil(total * 0.75); return rank > threshold; } return false; },
	  apply: (r, rs) => { r._mods = r._mods || {}; if (r._mods.PreferredPosition) return; const ms = (r.minSpeed || 0) * 0.05; const mS = (r.maxSpeed || 0) * 0.05; const ac = (r.acc || 0) * 0.05; const regen = (r.regenPerTick || 0.1) * 0.05; r._mods.PreferredPosition = { ms, ac, regen }; r.minSpeed = (r.minSpeed || 0) + ms; r.maxSpeed = (r.maxSpeed || 0) + mS; r.acc = (r.acc || 0) + ac; r.regenPerTick = (r.regenPerTick || 0) + regen; },
	  remove: (r) => { if (!r._mods || !r._mods.PreferredPosition) return; const m = r._mods.PreferredPosition; if (typeof m.ms === "number" && typeof r.minSpeed === "number") r.minSpeed = Math.max(0, r.minSpeed - m.ms); if (typeof m.mS === "number" && typeof r.maxSpeed === "number") r.maxSpeed = Math.max(0, r.maxSpeed - m.mS); if (typeof m.ac === "number" && typeof r.acc === "number") r.acc = Math.max(0, r.acc - m.ac); if (typeof m.regen === "number" && typeof r.regenPerTick === "number") r.regenPerTick = Math.max(0, r.regenPerTick - m.regen); delete r._mods.PreferredPosition; }
	},
	{id: "Left-Handed", cost: 80, desc: "Increase performance in left-handed tracks.",
	  condition: (rs, p) => !!rs && rs.race && rs.race.direction === "Left",
	  apply: (r, rs) => { r._mods = r._mods || {}; if (!r._mods.LeftHanded) { r._mods.LeftHanded = { min: (r.minSpeed || 0) * 0.05, max: (r.maxSpeed || 0) * 0.05 }; r.minSpeed = (r.minSpeed || 0) + r._mods.LeftHanded.min; r.maxSpeed = (r.maxSpeed || 0) + r._mods.LeftHanded.max; } },
	  remove: (r) => { if (r._mods && r._mods.LeftHanded) { r.minSpeed = Math.max(0, (r.minSpeed || 0) - (r._mods.LeftHanded.min || 0)); r.maxSpeed = Math.max(0, (r.maxSpeed || 0) - (r._mods.LeftHanded.max || 0)); delete r._mods.LeftHanded; } }
	},
	{id: "Right-Handed", cost: 80, desc: "Increase performance in right-handed tracks.",
	  condition: (rs, p) => !!rs && rs.race && rs.race.direction === "Right",
	  apply: (r, rs) => { r._mods = r._mods || {}; if (!r._mods.RightHanded) { r._mods.RightHanded = { min: (r.minSpeed || 0) * 0.05, max: (r.maxSpeed || 0) * 0.05 }; r.minSpeed = (r.minSpeed || 0) + r._mods.RightHanded.min; r.maxSpeed = (r.maxSpeed || 0) + r._mods.RightHanded.max; } },
	  remove: (r) => { if (r._mods && r._mods.RightHanded) { r.minSpeed = Math.max(0, (r.minSpeed || 0) - (r._mods.RightHanded.min || 0)); r.maxSpeed = Math.max(0, (r.maxSpeed || 0) - (r._mods.RightHanded.max || 0)); delete r._mods.RightHanded; } }
	},
    {id:"Confidence", cost:100, desc: "Regenerate stamina when in a good position.",
      condition:(rs,p)=> { const rank = getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank<=3 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.ConfidenceUsed) { const __st = (r.staminaMax * 0.5) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.ConfidenceUsed = true; } },
      remove:(r)=>{}
    },
    {id:"Iron Will", cost:100, desc: "Gather enough willpower to regenerate a moderate amount of stamina.",
      condition:(rs,p)=> { const rank=getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank>3 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.IronWillUsed){ const __st = (r.staminaMax * 0.6) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.IronWillUsed=true; } },
      remove:(r)=>{}
    },
    {id:"Breath of Fresh Air", cost:100, desc: "Calm down mid-race to regenerate stamina.",
      condition:(rs,p)=> { const rank = getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank<=3 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.BreathUsed){ const __st = (r.staminaMax * 0.4) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.BreathUsed=true; } },
      remove:(r)=>{}
    },
	{id:"Cool Down", cost:200, desc: "Calm down mid-race to regenerate a moderate amount of stamina.",
      condition:(rs,p)=> false,
      apply:(r,rs)=>{},
      remove:(r)=>{}
    },
	{id:"Patience Is Key", cost:100, desc: "Increase performance if current performance as not changed.",
      condition:(rs,p)=> { const rank = getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank>2 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.Patience){ r._mods.Patience = {ms:r.maxSpeed*0.05,ac:r.acc*0.05}; r.maxSpeed += r._mods.Patience.ms; r.acc += r._mods.Patience.ac; } },
      remove:(r)=>{ if(r._mods && r._mods.Patience){ r.maxSpeed -= r._mods.Patience.ms; r.acc -= r._mods.Patience.ac; delete r._mods.Patience; } }
    },
    {id:"Unchanging", cost:100, desc: "Regenerate stamina if current performance has not changed.",
      condition:(rs,p)=> { const pct=(p.pos/rs.race.distance)*100; return (p.startRank === getCurrentRank(rs,p)) && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.UnchangingUsed){ const __st = (r.staminaMax * 0.5) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.UnchangingUsed=true; } },
      remove:(r)=>{}
    },
	{id:"Competitive", cost:100, desc: "Greatly increase velocity when competing against an opponent.",
      condition:(rs,p)=> { let near = 0; for(const o of rs.field) if(o!==p && Math.abs(o.pos - p.pos)/Math.max(1, rs.race.distance) <= 0.03) near++; return near >= 2; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.Competitive){ r._mods.Competitive = {ms:r.maxSpeed*0.10,expires: rs.time + 5}; r.maxSpeed += r._mods.Competitive.ms; } },
      remove:(r)=>{ if(r._mods && r._mods.Competitive){ r.maxSpeed -= r._mods.Competitive.ms; delete r._mods.Competitive; } }
    },
    {id: "Oh No You Don’t!", cost: 100, desc: "Increase performance when competing against an opponent.",
	  condition: (rs,p) => false,
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.OhNoYouDontActive) return; let progress = null; if (typeof rs.progress === 'number') progress = rs.progress; else if (typeof rs.distance === 'number' && typeof r.distance === 'number' && rs.distance > 0) progress = r.distance / rs.distance; if (progress === null || progress < 0.5) return; const amount = 0.10; r._mods.OhNoYouDontActive = true; r._mods.OhNoYouDont = r._mods.OhNoYouDont || {}; r._mods.OhNoYouDont.prevMaxSpeed = r.maxSpeed || 0; r._mods.OhNoYouDont.amount = amount; r.maxSpeed = (r.maxSpeed || 0) * (1 + amount); try { r._mods.OhNoYouDont.expires = (rs.time !== undefined) ? (rs.time + 5) : (Date.now()/1000 + 5); } catch(e) { r._mods.OhNoYouDont.expires = Date.now()/1000 + 5; }
	  },
	  remove: (r) => { if (!r._mods || !r._mods.OhNoYouDont) return; if (typeof r._mods.OhNoYouDont.prevMaxSpeed === 'number') r.maxSpeed = r._mods.OhNoYouDont.prevMaxSpeed; delete r._mods.OhNoYouDont; delete r._mods.OhNoYouDontActive;
	  }
	},
	{id: "It’s On!", cost: 100, desc: "Regenerate stamina when competing against an opponent.",
	  condition: (rs,p) => false,
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.ItsOnUsed) return; let progress = null; if (typeof rs.progress === 'number') progress = rs.progress; else if (typeof rs.distance === 'number' && typeof r.distance === 'number' && rs.distance > 0) progress = r.distance / rs.distance; if (progress === null || progress < 0.5) return; const amount = 0.60; const addStamina = (r.staminaMax || 0) * amount; r.stamina = clamp((r.stamina || 0) + addStamina, 0, r.staminaMax || ((r.stamina || 0) + addStamina)); r._mods.ItsOnUsed = true; },
	  remove: (r) => { if (!r._mods) return; delete r._mods.ItsOnUsed; }
	},
    {id:"I Understand It Now", cost:150, desc: "Read your opponents and mimic their actions for far greater performance",
      condition:(rs,p)=> { const rank=getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return (rank===2||rank===3) && pct>=26; },
      apply:(r,rs)=>{ const sorted = [...rs.field].sort((a,b)=>b.pos-a.pos); const rank = getCurrentRank(rs,r); const ahead = sorted[rank-2]; if(ahead && !r._mods.CopySpeed){ r._mods.CopySpeed={acc:r.acc,ms:r.maxSpeed}; r.acc = ahead.acc; r.maxSpeed = ahead.maxSpeed; } },
      remove:(r)=>{ if(r._mods && r._mods.CopySpeed){ r.acc = r._mods.CopySpeed.acc; r.maxSpeed = r._mods.CopySpeed.ms; delete r._mods.CopySpeed; } }
    },
    {id:"Aura", cost:150, desc: "Intimidate opponents to hinder them mid-race.",
      condition:(rs,p)=> { const rank=getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank>=6 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.Aura){ r._mods.Aura={ms:r.maxSpeed*0.5,ac:r.acc*0.5,expires:rs.time+5}; r.maxSpeed += r._mods.Aura.ms; r.acc += r._mods.Aura.ac; } },
      remove:(r)=>{ if(r._mods && r._mods.Aura){ r.maxSpeed -= r._mods.Aura.ms; r.acc -= r._mods.Aura.ac; delete r._mods.Aura; } },
    }
  ],
  uniques: [
    {id: "End Closer", cost: 50, desc: "Conserve energy for a powerful burst in the final stretch.",
      condition: (rs, p) => !!rs && !!p,
      apply: (r, rs) => { r._mods = r._mods || {}; if(!r._mods.EndCloser) r._mods.EndCloser = { prevMax: r.maxSpeed, prevAcc: r.acc, prevRegen: r.regenPerTick }; const baseMax = (r._mods && r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') ? r._mods._prev.maxSpeed : r._mods.EndCloser.prevMax || r.maxSpeed; const baseAcc = (r._mods && r._mods._prev && typeof r._mods._prev.acc === 'number') ? r._mods._prev.acc : r._mods.EndCloser.prevAcc || r.acc; const pct = ((r.pos || 0) / (rs.race.distance || 1)) * 100; if(pct < 90){ r.maxSpeed = (baseMax || 0) * 0.96; r.acc = (baseAcc || 0) * 0.96; r._mods.EndCloser.dmult = 0.95; } else { r.maxSpeed = (baseMax || 0) * 1.15; r.acc = (baseAcc || 0) * 1.20; r._mods.EndCloser.dmult = 0.67; } },
      remove: (r) => { if(!r._mods || !r._mods.EndCloser) { return; } if(typeof r._mods.EndCloser.prevMax === 'number') { r.maxSpeed = r._mods.EndCloser.prevMax; } if(typeof r._mods.EndCloser.prevAcc === 'number') { r.acc = r._mods.EndCloser.prevAcc; } if(typeof r._mods.EndCloser.prevRegen === 'number') { r.regenPerTick = r._mods.EndCloser.prevRegen; } delete r._mods.EndCloser; } },
    {id: "Late Surger", cost: 50, desc: "Conserve energy for boost in performance in the second half of the race.",
      condition: (rs, p) => !!rs && !!p,
      apply: (r, rs) => { r._mods = r._mods || {}; if(!r._mods.LateSurger) { r._mods.LateSurger = { prevMax: r.maxSpeed, prevAcc: r.acc }; } const baseMax = (r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') ? r._mods._prev.maxSpeed : r._mods.LateSurger.prevMax || r.maxSpeed; const baseAcc = (r._mods._prev && typeof r._mods._prev.acc === 'number') ? r._mods._prev.acc : r._mods.LateSurger.prevAcc || r.acc; const pct = ((r.pos || 0) / (rs.race.distance || 1)) * 100; if(pct >= 75){ r.maxSpeed = (baseMax || 0) * 1.08; r.acc = (baseAcc || 0) * 1.08; } else { if(r._mods.LateSurger && r._mods.LateSurger._inactive) { /* noop */ } } },
      remove: (r) => { if(!r._mods || !r._mods.LateSurger) { return; } if(typeof r._mods.LateSurger.prevMax === 'number') { r.maxSpeed = r._mods.LateSurger.prevMax; } if(typeof r._mods.LateSurger.prevAcc === 'number') { r.acc = r._mods.LateSurger.prevAcc; } delete r._mods.LateSurger; }
    },
    {id: "Pace Chaser", cost: 50, desc: "Keeps you nice and steady for the whole race.",
      condition: (rs,p) => !!rs && !!p,
      apply: (r, rs) => { r._mods = r._mods || {}; if(!r._mods.PaceChaser) { r._mods.PaceChaser = { prevMax: r.maxSpeed, prevAcc: r.acc }; } const baseMax = (r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') ? r._mods._prev.maxSpeed : r._mods.PaceChaser.prevMax || r.maxSpeed; const baseAcc = (r._mods._prev && typeof r._mods._prev.acc === 'number') ? r._mods._prev.acc : r._mods.PaceChaser.prevAcc || r.acc; const pct = ((r.pos || 0) / (rs.race.distance || 1)) * 100; if(pct >= 75){ r.maxSpeed = (baseMax || 0) * 1.05; r.acc = (baseAcc || 0) * 1.05; } else if(pct >= 25){ r.maxSpeed = (baseMax || 0) * 1.02; r.acc = (baseAcc || 0) * 1.02; } },
      remove: (r) => { if(!r._mods || !r._mods.PaceChaser) return; if(typeof r._mods.PaceChaser.prevMax === 'number') r.maxSpeed = r._mods.PaceChaser.prevMax; if(typeof r._mods.PaceChaser.prevAcc === 'number') r.acc = r._mods.PaceChaser.prevAcc; delete r._mods.PaceChaser; }
    },
    {id: "Front Runner", cost: 50, desc: "Put in maximum effort to keep the lead for the whole race.",
      condition: (rs,p) => !!rs && !!p,
      apply: (r, rs) => { r._mods = r._mods || {}; if(!r._mods.FrontRunner) { r._mods.FrontRunner = { prevMax: r.maxSpeed, prevAcc: r.acc, dm: 1.05 }; } const baseMax = (r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') ? r._mods._prev.maxSpeed : r._mods.FrontRunner.prevMax || r.maxSpeed; const baseAcc = (r._mods._prev && typeof r._mods._prev.acc === 'number') ? r._mods._prev.acc : r._mods.FrontRunner.prevAcc || r.acc; r.maxSpeed = (baseMax || 0) * 1.05; r.acc = (baseAcc || 0) * 1.05; r._mods.FrontRunner.dmult = 1.05; },
      remove: (r) => { if(!r._mods || !r._mods.FrontRunner) { return; } if(typeof r._mods.FrontRunner.prevMax === 'number') { r.maxSpeed = r._mods.FrontRunner.prevMax; } if(typeof r._mods.FrontRunner.prevAcc === 'number') { r.acc = r._mods.FrontRunner.prevAcc; } delete r._mods.FrontRunner; }
    }
  ],
  actives: [
    {id:"Plus Ultra!", cost:150, desc: "Push past your limits and go beyond, Plus Ultra!", fn:"plusUltra"},
    {id:"No… Not Yet!", cost:150, desc: "With sheer willpower, regenerate majority of stamina for one last push.", fn:"regen70"},
    {id:"I Am Not Giving Up Now!", cost:200, desc: "If position is terrible, with sheer willpower, increase performance greatly for one last push.", fn:"comeback"},
    {id:"Plan B", cost:150, desc: "If position is bad, switch up your strategy and increase performance greatly.", fn:"planB"},
    {id:"Triumphant Pulse", cost:200, desc: "Break through the pack and charge in a powerful burst of speed and power.", fn:"triumph"},
	{id:"Red Shift", cost:200, desc: "Shift gears and overtake opponents in a great increase of power.", fn:"redshift"},
	{id:"Swinging Maestro", cost:200, desc: "Regenerate stamina and greatly increase performance during the turning point.", fn:"swing"},
    {id:"Must Go Even Further Beyond!", cost:200, desc: "Maintain your position and increase performance if 1st place.", fn:"furtherBeyond"},
    {id:"Gotcha!", cost:150, desc: "Play tag with forefront umas, tag them to gain an increase in performance.", fn:"gotcha"}
  ]
};

/* -------------------------
  Helpers for titles (sticky) & compute
------------------------- */
function computeTitle(fame){
  if(fame >= 250000) return "Legend";
  if(fame >= 100000) return "Star";
  if(fame >= 70000) return "Platinum";
  if(fame >= 50000) return "Gold";
  if(fame >= 20000) return "Silver";
  if(fame >= 5000) return "Bronze";
  if(fame >= 250) return "Beginner";
  return "None";
}

function updateTitle(){
  state.highestTitle = state.highestTitle || computeTitle(0);
  const current = computeTitle(state.fame);
  const order = ["None","Bronze","Silver","Gold","Star","Legend"];
  if(order.indexOf(current) > order.indexOf(state.highestTitle)){
    state.highestTitle = current;
  }
  const title = state.highestTitle || "None";
  const elTitle = el("playerTitle");
  elTitle.textContent = title;
  // map to CSS variants
  const map = {
    "None": "title-badge--none",
	"Beginner": "title-badge--beginner",
    "Bronze": "title-badge--bronze",
    "Silver": "title-badge--silver",
    "Gold": "title-badge--gold",
	"Platinum": "title-badge--platinum",
    "Star": "title-badge--star",
    "Legend": "title-badge--legend"
  };
  // ensure base class stays
  elTitle.className = "title-badge " + (map[title] || "");
}

/* -------------------------
  Persistence
------------------------- */
function saveState(){ localStorage.setItem("uma_state_v1", JSON.stringify(state)); const lastSavedEl = el("lastSaved"); if (lastSavedEl) lastSavedEl.textContent = nowStr(); }
function loadState(){ try{ const raw = localStorage.getItem("uma_state_v1"); return raw ? JSON.parse(raw) : null; }catch(e){return null;} }

/* -------------------------
  UI: populate races with gating logic
------------------------- */
function populateRaces(){
  const sel = el("raceSelect"); sel.innerHTML = "";
  for(const r of RACES){
    let disabled = false;
    if(r.oneTime && state.completed && state.completed[r.id]) disabled = true;
    if(r.grade === "G3" && !(state.completed && state.completed["Debut Race"])) disabled = true;
    if(r.grade === "G2" && !(state.completed && RACES.filter(x=>x.grade==="G3").every(rr=>state.completed && state.completed[rr.id]))) disabled = true;
    if(r.grade === "G1" && !(state.completed && RACES.filter(x=>x.grade==="G2").every(rr=>state.completed && state.completed[rr.id]))) disabled = true;
    if(r.grade === "Finale" && (state.g1RacesRun||0)<3) disabled = true;
    const opt = document.createElement("option");
    opt.value = r.id;
	let dist = "";
	if (r.distance <= 1400 && r.grade !== "Debut") {
	  dist = " (Sprint)";
	} else if (r.distance > 1400 && r.distance <= 1600) {
	  dist = " (Mile)";
	} else if (r.distance > 1600 && r.distance <= 2000) {
	  dist = " (Medium)";
	} else if (r.distance > 2000 && r.distance <= 5000) {
	  dist = " (Long)"; 
	} else if (r.distance > 5000) {
	  dist = " (Very Long)";
	} else {
	  dist = ""
	}
    opt.textContent = `${r.id} [${r.grade}] - Track: ${r.track} - Direction: ${r.direction || 'Right'} -  Distance: ${r.distance}m${dist} ${disabled? "(Locked)" : ""}`;
	opt.style.border="1px solid black";
    if(disabled) opt.disabled = true;
    sel.appendChild(opt);
  }
}

/* -------------------------
  Render player UI (stats bars, energy)
------------------------- */
function refreshPlayerUI(){
  try {
    // small helpers
    const getEl = (id) => {
      try { return el(id); } catch(e){ return null; }
    };
    const setText = (id, txt) => { const e = getEl(id); if(e) e.textContent = txt; };
    const setValue = (id, v) => { const e = getEl(id); if(e) e.value = v; };

    // defensive state defaults
    state = state || {};
    state.stats = state.stats || {};
    state.training = state.training || {};
    state.abilities = state.abilities || { equippedPassives: [], equippedActive: null, unlockedActives: [] };

    // ensure custom cursor doesn't block pointer events (fix for hover issues)
    try {
      const cc = document.querySelector(".uma-cursor");
      if(cc) cc.style.pointerEvents = "none";
    } catch(e){ /* ignore */ }

    // basic top-line UI
    setValue("playerName", state.name || "");
    setText("energyVal", Math.round(state.energy || 0));
    const eb = getEl("energyBar");
    if(eb) eb.style.width = clamp(Number(state.energy) || 0, 0, 100) + "%";
    setText("fame", Math.round(state.fame || 0));
    setText("sp", Math.round(state.sp || 0));
    setText("racesDone", state.racesDone || 0);

    const totalTrains = state.training.totalTrains || 0;
    setText("trainCount", totalTrains);
    const DAYS_REQUIRED = 30;
    const daysLeft = Math.max(0, DAYS_REQUIRED - totalTrains);

    const daysUntilEl = getEl("daysUntilRace") || getEl("trainCount2");
    if(daysUntilEl){
      daysUntilEl.textContent = (daysLeft > 0) ? `Days until next Race: ${daysLeft}` : `It's Race Day!`;
    }

    // abilities/stats header
    setText("passiveCount", (state.abilities.equippedPassives && state.abilities.equippedPassives.length) ? state.abilities.equippedPassives.length : 0);
    setText("activeEquip", state.abilities.equippedActive || "—");
    setText("winLoss", `${state.wins||0}-${state.losses||0}`);
    if(typeof updateTitle === "function") try{ updateTitle(); }catch(e){ console.warn("updateTitle error", e); }

    // Stats grid (if present)
    const grid = getEl("statsGrid");
    if(grid) {
      grid.innerHTML = "";
    }

    // helper for rank & color
    function statRankAndColor(val){
      val = Number.isFinite(val) ? val : 0;
      if(val >= 1200) return {rank:"U", color:"#4B0076"};
      if(val >= 1100) return {rank:"SS+", color:"#D4AF37"};
      if(val >= 1000) return {rank:"SS", color:"#D4AF37"};
      if(val >= 900) return {rank:"S+", color:"#D4AF37"};
      if(val >= 800) return {rank:"S", color:"#D4AF37"};
      if(val >= 750) return {rank:"A+", color:"#FF3333"};
      if(val >= 700) return {rank:"A", color:"#FF3333"};
      if(val >= 650) return {rank:"B+", color:"#FF66B2"};
      if(val >= 600) return {rank:"B", color:"#FF66B2"};
      if(val >= 550) return {rank:"C+", color:"#28A745"};
      if(val >= 500) return {rank:"C", color:"#28A745"};
      if(val >= 450) return {rank:"D+", color:"#6EC0FF"};
      if(val >= 400) return {rank:"D", color:"#6EC0FF"};
      if(val >= 350) return {rank:"E+", color:"#CDA7FF"};
      if(val >= 300) return {rank:"E", color:"#CDA7FF"};
      if(val >= 250) return {rank:"F+", color:"#6e6e6e"};
      if(val >= 200) return {rank:"F", color:"#6e6e6e"};
      if(val >= 150) return {rank:"G+", color:"#808080"};
      return {rank:"G", color:"#808080"};
    }

    const STAT_DESCS = {
      "Speed": "Increases top speed and velocity — allowing you to outspeed opponents.",
      "Stamina": "Increases max stamina — allowing you to go at max speed for longer durations.",
      "Power": "Increases acceleration — allowing you to recover and reach your top speed faster.",
      "Guts": "Increases stamina regeneration and decreases speed penalty — allowing you to keep your position in control, recover and accelerate back to top speed much faster.",
      "Wits": "Increases ability effectiveness and duration, timing, and helps keep you at ease."
    };

    // tooltip functions (defined once)
    function showFailTooltipForHost(host, statName){
      if(!host) return;
      try{
        const info = (typeof getTrainingChanceAndMultiplier === "function") ? getTrainingChanceAndMultiplier(state.energy || 0) : {};
        let fail = typeof info.fail === "number" ? info.fail : 0;
        if(fail > 1) fail = 1;
        const pctFail = Math.round(Math.min(Math.max(fail * 100, 0), 100));

        // gradient/color selection
        let gradient = "linear-gradient(180deg,#00bbff 0%, #006eff 67%)";
        let innerTailColor = "#006eff";
        if(pctFail > 45){
          gradient = "linear-gradient(180deg,#ff3b3b 0%, #8B0000 67%)";
          innerTailColor = "#8B0000";
        } else if(pctFail > 20){
          gradient = "linear-gradient(180deg,#FFDB58 0%, #FF8C00 67%)";
          innerTailColor = "#FF8C00";
        }

        const showFailTop = !!(host && host.classList && host.classList.contains('chip'));

        let tip = host.querySelector(".fail-tooltip");
        if(!tip){
          tip = document.createElement("div");
          tip.className = "fail-tooltip";
          tip.innerHTML = `
            <div class="fail-top"></div>
            <div class="stat-block">
              <div class="stat-title"></div>
              <div class="stat-desc"></div>
            </div>
            <div class="fail-tail-border"></div>
            <div class="fail-tail"></div>
          `;
          Object.assign(tip.style, {
            display: "none",
            position: "absolute",
            left: "50%",
            top: "calc(100% + 8px)",
            transform: "translateX(-50%)",
            width: "150px",
            background: gradient,
            color: "#fff",
            padding: "8px 10px",
            fontSize: "13px",
            fontWeight: "700",
            pointerEvents: "none",
            zIndex: "9999",
            borderRadius: "8px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            border: "1.8px solid #ffffff",
            textAlign: "center"
          });

          const ft = tip.querySelector(".fail-top");
          if(ft) Object.assign(ft.style, { color: "#fff", fontWeight: "800", fontSize: "12px", marginBottom: "6px", display: "block", lineHeight: "1" });

          const st = tip.querySelector(".stat-title");
          if(st) Object.assign(st.style, { color: "#fff", fontWeight: "800", fontSize: "13px", marginBottom: "4px" });

          const sd = tip.querySelector(".stat-desc");
          if(sd) Object.assign(sd.style, { color: "#fff", fontWeight: "600", fontSize: "12px", lineHeight: "1.2", opacity: "0.98" });

          const tailBorder = tip.querySelector(".fail-tail-border");
          if(tailBorder) Object.assign(tailBorder.style, {
            position: "absolute",
            left: "calc(50% - 9px)",
            top: "-10px",
            width: "0",
            height: "0",
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderBottom: "10px solid #ffffff",
            pointerEvents: "none",
            zIndex: "10000"
          });

          const tail = tip.querySelector(".fail-tail");
          if(tail) Object.assign(tail.style, {
            position: "absolute",
            left: "calc(50% - 7px)",
            top: "-8px",
            width: "0",
            height: "0",
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            pointerEvents: "none",
            zIndex: "10001"
          });

          if(!host.style.position) host.style.position = "relative";
          host.appendChild(tip);
        }

        // update visuals
        tip.style.background = gradient;
        const innerTail = tip.querySelector(".fail-tail");
        if(innerTail) innerTail.style.borderBottom = "8px solid " + innerTailColor;

        const ftEl = tip.querySelector(".fail-top");
        const titleEl = tip.querySelector(".stat-title");
        const descEl = tip.querySelector(".stat-desc");

        if(ftEl){
          if(showFailTop){
            ftEl.textContent = `Failure: ${pctFail}%`;
            ftEl.style.display = 'block';
          } else {
            if(titleEl) titleEl.textContent = statName || "";
            ftEl.style.display = 'none';
          }
        }
        if(descEl) descEl.textContent = STAT_DESCS[statName] || "";

        tip.style.display = "block";
        tip.style.opacity = "1";
      }catch(err){
        console.warn("showFailTooltipForHost error", err);
      }
    }

    function hideFailTooltipForHost(host){
      if(!host) return;
      const tip = host.querySelector(".fail-tooltip");
      if(tip) tip.style.display = "none";
    }

    // Build stat blocks if grid exists
    if(grid){
      const keys = ["Speed","Stamina","Power","Guts","Wits"];
      for(const k of keys){
        const rawVal = (state.stats && typeof state.stats[k] !== 'undefined') ? state.stats[k] : 0;
        const val = Number(rawVal) || 0;
        const pct = Math.round(val / 12); // 1200 -> 100
        const {rank, color} = statRankAndColor(val);

        const d = document.createElement("div");
        d.className = "stat";
        d.style.position = "relative";
        d.innerHTML = `
          <div class="statName" style="display:flex;justify-content:space-between">
            <b class="statsName" style="color:${color}">&nbsp;${k}</b>
            <span class="small muted" style="color:${color}"><span style="font-weight:bold;margin-left:7px;color:${color}">[${rank}]</span></span>
          </div>
          <div class="value">Value: <b>${val.toFixed(2)} / 1200</b></div>
          <div class="bar"><i class="fill" style="width:${clamp(pct,0,100)}%"></i></div>
          <div class="facilityLevel" style="margin-top:6px">Training Facility Level: ${ (state.training.levels && state.training.levels[k]) ? state.training.levels[k] : 1 }</div>
        `;

        // remove existing listeners to avoid duplicates
        if(d._failTipEnter) d.removeEventListener("mouseenter", d._failTipEnter);
        if(d._failTipLeave) d.removeEventListener("mouseleave", d._failTipLeave);

        d._failTipEnter = function(){ showFailTooltipForHost(d, k); };
        d._failTipLeave = function(){ hideFailTooltipForHost(d); };

        d.addEventListener("mouseenter", d._failTipEnter);
        d.addEventListener("mouseleave", d._failTipLeave);

        grid.appendChild(d);
      }
    }

    // Attach hover tooltip behavior to training stat buttons (chips)
    // small timeout remains to allow training panel to render; safe if not present
    setTimeout(()=>{
      try{
        const chips = document.querySelectorAll("#trainingPanel .chip[data-stat]");
        chips.forEach(ch => {
          if(!ch) return;
          if(!ch.style.position) ch.style.position = "relative";

          // remove previous handlers if present
          if(ch._failTipEnter) ch.removeEventListener("mouseenter", ch._failTipEnter);
          if(ch._failTipLeave) ch.removeEventListener("mouseleave", ch._failTipLeave);

          const statName = ch.dataset.stat;
          ch._failTipEnter = function(){ showFailTooltipForHost(ch, statName); };
          ch._failTipLeave = function(){ hideFailTooltipForHost(ch); };

          ch.addEventListener("mouseenter", ch._failTipEnter);
          ch.addEventListener("mouseleave", ch._failTipLeave);
        });
      }catch(e){ console.warn("chip tooltip attach error", e); }
    }, 6);

    // train button lock + style (guarded)
    const doTrainBtn = getEl("doTrainBtn");
    const trainLocked = !!(state.training && state.training.locked) && (state.racesDone <= (state.training.lockRaceCount || -1));
    if(doTrainBtn) {
      doTrainBtn.disabled = trainLocked;
      doTrainBtn.style.padding ="6px 8px";
      doTrainBtn.style.borderRadius="6px";
      doTrainBtn.style.background="linear-gradient(180deg,#40ff00 20%,#29a600 80%,#40ff00 100%)";
      doTrainBtn.style.cursor="pointer";
      doTrainBtn.style.border="1.6px solid white";
      doTrainBtn.style.fontWeight="bold";
    }

    // training chips enable/disable
    const chipsList = document.querySelectorAll("#trainingPanel .chip");
    if(chipsList && chipsList.forEach){
      chipsList.forEach(ch=>{
        const stat = ch.dataset.stat;
        const isMaxed = (Number(state.stats && state.stats[stat]) || 0) >= getEffectiveStatCapForPlayer(state);
        if(trainLocked || isMaxed){
          ch.classList.add("disabled");
          ch.disabled = true;
        } else {
          ch.classList.remove("disabled");
          ch.disabled = false;
        }
      });
    }

    // final render calls (safe if functions exist)
    try{ if(typeof populateRaces === "function") populateRaces(); }catch(e){ console.warn("populateRaces error", e); }
    try{ if(typeof renderAbilitiesShop === "function") renderAbilitiesShop(); }catch(e){ console.warn("renderAbilitiesShop error", e); }
    try{ if(typeof renderEquipped === "function") renderEquipped(); }catch(e){ console.warn("renderEquipped error", e); }
    try{ if(typeof renderLeaderboard === "function") renderLeaderboard(); }catch(e){ console.warn("renderLeaderboard error", e); }

  } catch(err){
    // Failsafe so UI doesn't crash the game if something unexpected happens
    console.error("refreshPlayerUI fatal error:", err);
  }
}

/* -------------------------
  Abilities UI
------------------------- */
function renderAbilitiesShop(){
  const wrap = el("abilitiesShop"); wrap.innerHTML = "";
  wrap.style.background="#ffffff";
  wrap.style.border="1.7px solid #fcba03";
  wrap.style.borderRadius="8px";

  // PASSIVES
  for(const p of ABILITIES.passives){
    const unlocked = (state.abilities.unlockedPassives||[]).includes(p.id);
    const isEquipped = (state.abilities.equippedPassives||[]).includes(p.id);
    const row = document.createElement("div");
    row.style.padding="6px"; row.style.background="#ffffff"; row.style.border = "1.7px solid #fcba03"; row.style.color ="#fcba03";
    row.innerHTML = `<div style="display:flex;justify-content:space-between">
      <div>
        <b>${p.id}</b>
        <div class="identification">Passive</div>
        <div class="ability-desc">${p.desc || ''}</div>
      </div>
      <div style="text-align:right">
        ${p.cost} SP<br>
        ${unlocked? `<button class="smallBtn" data-equip="${p.id}">${isEquipped? 'Unequip' : 'Equip'}</button>` : `<button class="smallBtnBuy" data-buy="${p.id}">Buy</button>`}
      </div>
    </div>`;
    wrap.appendChild(row);
  }

  // separator
  const hr = document.createElement("hr");
  hr.style.height = "3px"; hr.style.width = "110%"; hr.style.background = "#fcba03";
  wrap.appendChild(hr);

  // ACTIVES
  for(const a of ABILITIES.actives){
    const unlocked = (state.abilities.unlockedActives||[]).includes(a.id);
    const isEquipped = state.abilities.equippedActive === a.id;
    const row = document.createElement("div");
    row.style.padding="6px"; row.style.background="#ffffff"; row.style.border = "1.7px solid #fcba03"; row.style.color ="#fcba03";
    row.innerHTML = `<div style="display:flex;justify-content:space-between">
      <div>
        <b>${a.id}</b>
        <div class="identification">Active</div>
        <div class="ability-desc">${a.desc || ''}</div>
      </div>
      <div style="text-align:right">
        ${a.cost} SP<br>
        ${unlocked? `<button class="smallBtn" data-equip-active="${a.id}">${isEquipped? 'Unequip' : 'Equip'}</button>` : `<button class="smallBtnBuy" data-buy-active="${a.id}">Buy</button>`}
      </div>
    </div>`;
    wrap.appendChild(row);
  }

  // UNIQUE SKILLS group (gold outline)
  if(ABILITIES.uniques && ABILITIES.uniques.length){
    const sep2 = document.createElement("hr");
    sep2.style.height = "3px"; sep2.style.width = "110%"; sep2.style.background = "#D4AF37";
    wrap.appendChild(sep2);

    for(const u of ABILITIES.uniques){
      const unlocked = (state.abilities.unlockedUniques||[]).includes(u.id);
      const isEquipped = state.abilities.equippedUnique === u.id;
      const row = document.createElement("div");
      row.className = unlocked ? "ability-unique" : "";
      row.style.padding="6px"; row.style.background="#ffffff"; row.style.border = "1.7px solid #fcba03"; row.style.color ="#fcba03";
      row.innerHTML = `<div style="display:flex;justify-content:space-between">
        <div>
          <b>${u.id}</b>
          <div class="identification">Unique</div>
          <div class="ability-desc">${u.desc || ''}</div>
        </div>
        <div style="text-align:right">
          ${u.cost} SP<br>
          ${unlocked? `<button class="smallBtn" data-equip-unique="${u.id}">${isEquipped? 'Unequip' : 'Equip'}</button>` : `<button class="smallBtnBuy" data-buy-unique="${u.id}">Buy</button>`}
        </div>
      </div>`;
      wrap.appendChild(row);
    }
  }

  // LISTENERS (passives / actives existing handlers)
  wrap.querySelectorAll("button[data-buy]").forEach(b=>b.addEventListener("click", ()=>{
    const id=b.dataset.buy; const item=ABILITIES.passives.find(x=>x.id===id);
    if(!item) return;
    if(state.sp < item.cost){ alert("Not enough SP"); return; }
    state.sp -= item.cost; state.abilities.unlockedPassives.push(id); saveState(); refreshPlayerUI();
  }));

  wrap.querySelectorAll("button[data-equip]").forEach(b=>b.addEventListener("click", ()=>{
	const id = b.dataset.equip;
	if (!id) return;

	if (state.abilities.equippedPassives.includes(id)) {
      // unequip
      state.abilities.equippedPassives = state.abilities.equippedPassives.filter(x=>x!==id);
	} else {
      // limit check
      if (state.abilities.equippedPassives.length >= 6) { alert("Max 6 passives"); return; }

      // conflict check: see PASSIVE_CONFLICT_GROUPS
      const conflicts = PASSIVE_CONFLICT_GROUPS
      .filter(g => g.includes(id))
      .flatMap(g => g.filter(x => x !== id && state.abilities.equippedPassives.includes(x)));

	  if (conflicts.length) {
		alert(`Cannot equip "${id}" while the following passive(s) are equipped: ${conflicts.join(', ')}.`);
		return;
      }

      // no conflict -> equip
      state.abilities.equippedPassives.push(id);
	}
  saveState(); refreshPlayerUI();
  }));

  wrap.querySelectorAll("button[data-buy-active]").forEach(b=>b.addEventListener("click", ()=>{
    const id=b.dataset.buyActive; const item=ABILITIES.actives.find(x=>x.id===id);
    if(!item) return;
    if(state.sp < item.cost){ alert("Not enough SP"); return; }
    state.sp -= item.cost; state.abilities.unlockedActives.push(id); saveState(); refreshPlayerUI();
  }));

  wrap.querySelectorAll("button[data-equip-active]").forEach(b=>b.addEventListener("click", ()=>{
    const id=b.dataset.equipActive;
    if(state.abilities.equippedActive === id) state.abilities.equippedActive = null;
    else state.abilities.equippedActive = id;
    saveState(); refreshPlayerUI();
  }));

  // UNIQUE listeners
  wrap.querySelectorAll("button[data-buy-unique]").forEach(b=>b.addEventListener("click", ()=>{
    const id=b.dataset.buyUnique; const item=(ABILITIES.uniques||[]).find(x=>x.id===id);
    if(!item) return;
    if(state.sp < item.cost){ alert("Not enough SP"); return; }
    state.sp -= item.cost; state.abilities.unlockedUniques = state.abilities.unlockedUniques || [];
    state.abilities.unlockedUniques.push(id); saveState(); refreshPlayerUI();
  }));

  wrap.querySelectorAll("button[data-equip-unique]").forEach(b=>b.addEventListener("click", ()=>{
    const id=b.dataset.equipUnique;
    if(state.abilities.equippedUnique === id){
      state.abilities.equippedUnique = null;
    } else {
      // Unequip any other unique (only one allowed)
      state.abilities.equippedUnique = id;
    }
    saveState(); refreshPlayerUI();
  }));
}

/* -------------------------
  Render equipped list
------------------------- */
function renderEquipped(){
  const pe = el("passivesEquip"); pe.innerHTML = "";
  for(const id of state.abilities.equippedPassives){
    const d = document.createElement("div"); d.className = "ability"; d.textContent = id; pe.appendChild(d); d.style.textAlign = "center";
  }
  
  const uqEl = el("uniqueEquip");
  if(uqEl){
	if(state.abilities && state.abilities.equippedUnique){
      uqEl.textContent = state.abilities.equippedUnique;
      uqEl.className = "uniqueSkill";
	} else {
      uqEl.textContent = '—';
      uqEl.className = 'small muted';
	}
  }

  const ae = el("activeEquip");
  ae.innerHTML = "";
  if(state.abilities.equippedActive){
    const d = document.createElement("div");
    d.className = "activeAbility";
	d.style.width = "190px";
	d.style.textAlign = "center";
    d.textContent = state.abilities.equippedActive;
    ae.appendChild(d);
  } else {
    ae.textContent = "—";
  }

  const ab = el("activeButtonWrap"); if(ab) ab.innerHTML = "";
  if(state.abilities.equippedActive){
    const btn = document.createElement("button");
    btn.textContent = "Use Active: " + state.abilities.equippedActive;
    ab.style.background="linear-gradient(135deg,#eeff00,#fcba03)";
    ab.style.color="#ffffff";
    ab.style.border="1.7px solid #ffffff";
    ab.style.borderRadius="8px";
	ab.style.fontWeight="500";
	ab.style.width="54.3%";
    btn.addEventListener("click", ()=> useActiveById(state.abilities.equippedActive));
    if(ab) ab.appendChild(btn);
  }
}

/* -------------------------
  Leaderboard
------------------------- */
function addLeaderboardRecord(rec){
  const list = JSON.parse(localStorage.getItem("uma_leaderboard_v1")||"[]");
  list.unshift(rec);
  while(list.length>100) list.pop();
  localStorage.setItem("uma_leaderboard_v1", JSON.stringify(list));
  renderLeaderboard();
}
function loadLeaderboard(){ return JSON.parse(localStorage.getItem("uma_leaderboard_v1")||"[]"); }
function renderLeaderboard(){
  const wrap = el("leaderboard"); wrap.innerHTML = "";
  const list = loadLeaderboard();
  if(list.length===0){ wrap.innerHTML = "<div class='small muted'>No records yet.</div>"; return; }
  for(const r of list){
    const wins = r.wins||0; const losses = r.losses||0;
    const stats = r.stats || {};
    const statsStr = `Speed: ${Math.round(stats.Speed||0)} • Stamina: ${Math.round(stats.Stamina||0)} • Power: ${Math.round(stats.Power||0)} • Guts: ${Math.round(stats.Guts||0)} • Wits: ${Math.round(stats.Wits||0)}`;
    const div = document.createElement("div"); div.style.padding="8px"; div.style.borderBottom="1px solid rgba(255,255,255,0.03)";
    div.innerHTML = `<div style="display:flex;justify-content:space-between"><b>${r.name}</b><span class="small muted">${r.title||computeTitle(r.fame)}</span></div>
      <div class="small muted">${statsStr}</div>
      <div class="small muted">Fame: ${Math.round(r.fame)} • Win-Loss: ${wins}-${losses}</div>
      <div class="small muted">${new Date(r.timestamp).toLocaleString()}</div>`;
    wrap.appendChild(div);
  }
}

/* -------------------------
  Training logic
------------------------- */
function trainingGainsFor(stat){ const simple = 9 + state.stats[stat]*0.01; return simple + ((state.training.levels[stat]||1)-1)*6; }
function getTrainingChanceAndMultiplier(energy){ if(energy>70) return {fail:0,mul:1}; if(energy>50) return {fail:0.01,mul:1}; if(energy>30) return {fail:0.02,mul:1.1}; if(energy>25) return {fail:0.10,mul:1.2}; if(energy>10) return {fail:0.22,mul:3}; if(energy>1.33) return {fail:0.49,mul:1.5}; return {fail:1,mul:1}; }
function pickOtherStat(skip){ const opts=["Speed","Stamina","Power","Guts","Wits"].filter(s=>s!==skip); return opts[rand(0,opts.length-1)]; }

function doTraining(stat){
  if(!stat) return;

  // Block training during an active race
  if(typeof raceState !== "undefined" && raceState && raceState.running){
    addLog("Cannot train during a race.");
    return;
  }
  const initialEnergy = state.energy;
  const pvals = derivePlayerValues(state.stats);
  const player = { isPlayer:true, name: state.name };

  const {fail, mul} = getTrainingChanceAndMultiplier(state.energy);
  const gainBase = trainingGainsFor(stat);
  const gain = gainBase * mul;
  const roll = Math.random();
  const failed = roll < fail || state.energy <= 0;

  if(state.training.totalTrains >= 30){
    state.training.locked = true;
    state.training.lockRaceCount = state.racesDone;
    alert(`It's Race Day. No time to train!`);
    addLog("<span class='warn'>It's Race Day. No time to train!</span>");
  }
  // Prevent training a stat that's already at cap
  if((state.stats[stat]||0) >= getEffectiveStatCapForPlayer(state)){
    addLog(`<span class="warn">You can no longer train ${stat} any further.</span>`);
    alert(`You can no longer train ${stat} any further.`);
    return;
  } else {
  if(state.training.locked){
    const lockCount = state.training.lockRaceCount || -1;
    if(state.racesDone <= lockCount){
      alert(`It's Race Day. No time to train!`);
      addLog("<span class='warn'>It's Race Day. No time to train!</span>");
      return;
    }
  } else {
    if(failed){
	  const amt = [0.85, 0.9, 0.95, 1];
      const random = Math.floor(Math.random() * amt.length);
      const loss = amt[random];
      state.stats[stat] = clamp((state.stats[stat]||0) - (gain * loss), 0, getEffectiveStatCapForPlayer(state));
      addLog(`<span class="warn">${player.name}'s ${stat} training failed. Lost ${gain.toFixed(2)} ${stat}.</span>`);
    } else {
	  if (stat !== "Wits") {
		state.stats[stat] = clamp((state.stats[stat]||0) + gain, 0, getEffectiveStatCapForPlayer(state));
	  } else {
		state.stats[stat] = clamp((state.stats[stat]||0) + (gain*0.6), 0, getEffectiveStatCapForPlayer(state));
	  }

      // small chance for extra other stat
      if(Math.random() < 0.05){
        const other = pickOtherStat(stat);
        const g = Math.max(0.01, (state.stats[other]||0) * 0.05);
        state.stats[other] = clamp((state.stats[other]||0) + g, 0, getEffectiveStatCapForPlayer(state));
        addLog(`<div class="ok">${player.name} also gained an extra ${g.toFixed(2)} ${other}!</div>`);
      }

      // stat-specific side gains (clamped)
      if(stat === "Speed"){
        let g1 = 2 + ((((state.training.levels["Speed"]||1)-1)*2) + ((state.stats["Guts"]||0)*0.01));
        state.stats["Guts"] = clamp((state.stats["Guts"]||0) + g1, 0, getEffectiveStatCapForPlayer(state));
        addLog(`<div class="ok">${player.name} also gained an extra ${g1.toFixed(2)} Guts!</div>`);
        let g2 = 2 + (((state.training.levels["Speed"]||1)-1)*1 + ((state.stats["Wits"]||0)*0.01));
        state.stats["Wits"] = clamp((state.stats["Wits"]||0) + g2, 0, getEffectiveStatCapForPlayer(state));
        addLog(`<div class="ok">${player.name} also gained an extra ${g2.toFixed(2)} Wits!</div>`);
      }
      if(stat === "Stamina"){
        let g = 5 + (((state.training.levels["Stamina"]||1)-1)*4 + ((state.stats["Power"]||0)*0.01));
        state.stats["Power"] = clamp((state.stats["Power"]||0) + g, 0, getEffectiveStatCapForPlayer(state));
        addLog(`<div class="ok">${player.name} also gained an extra ${g.toFixed(2)} Power!</div>`);
      }
      if(stat === "Power"){
        let g = 4 + (((state.training.levels["Power"]||1)-1)*3 + ((state.stats["Speed"]||0)*0.01));
        state.stats["Speed"] = clamp((state.stats["Speed"]||0) + g, 0, getEffectiveStatCapForPlayer(state));
        addLog(`<div class="ok">${player.name} also gained an extra ${g.toFixed(2)} Speed!</div>`);
        let g2 = 2 + ((((state.training.levels["Power"]||1)-1)*2) + ((state.stats["Guts"]||0)*0.01));
        state.stats["Guts"] = clamp((state.stats["Guts"]||0) + g2, 0, getEffectiveStatCapForPlayer(state));
        addLog(`<div class="ok">${player.name} also gained an extra ${g2.toFixed(2)} Guts!</div>`);
      }
      if(stat === "Guts"){
        let g = 5 + (((state.training.levels["Guts"]||1)-1)*4 + ((state.stats["Stamina"]||0)*0.01));
        state.stats["Stamina"] = clamp((state.stats["Stamina"]||0) + g, 0, getEffectiveStatCapForPlayer(state));
        addLog(`<div class="ok">${player.name} also gained an extra ${g.toFixed(2)} Stamina!</div>`);
      }
      if(stat === "Wits"){
        state.energy = clamp(initialEnergy + 12, 0, 100);
        let sp = 5 + (((state.training.levels["Wits"]||1)-1)*3);
        state.sp = (state.sp||0) + sp;
        addLog(`<div class="ok">${player.name} also gained ${sp} SP!</div>`);
      } else {
        state.energy = clamp(initialEnergy - 12, 0, 100);
      }

      addLog(`<div class="ok">${player.name}'s ${stat} training was a success! Gained ${gain.toFixed(2)} ${stat}</div>`);

      // training counts and leveling
      state.training.counts[stat] = (state.training.counts[stat]||0) + 1;
      if(state.training.counts[stat] % 15 === 0 && (state.training.levels[stat]||1) < 5){
        state.training.levels[stat] = (state.training.levels[stat]||1) + 1;
        addLog(`<div class="ok">${stat} Training Facility's level has increased to ${state.training.levels[stat]}!</div>`);
      }
    }
    state.training.totalTrains = (state.training.totalTrains||0) + 1;
  }
  }

  saveState();
  refreshPlayerUI();
}

/* -------------------------
  Race engine
------------------------- */
let raceState = null;
let raceTickHandle = null;
let commentaryHandle = null;

function derivePlayerValues(stats){
  const maxSpeed = Math.max(11.1, 13.4 + (stats.Speed - 100)*0.0065);
  const staminaMax = 140 + (stats.Stamina - 100)*0.355;
  const acc = 3 + (stats.Power - 100)*0.002125;
  const regenPerTick = 0.06 + (stats.Guts - 100)*0.00015;
  const gutsVal = stats.guts ?? stats.Guts ?? stats.GUTS ?? 100;
  const minSpeed = gutsToMinSpeed(gutsVal);
  return {maxSpeed, staminaMax, acc, regenPerTick, minSpeed};
}

function makeOpponent(name, grade){
  const g = (OPPONENTS[name] && OPPONENTS[name][grade]) ? OPPONENTS[name][grade] : { minSpeed: 11.1, maxSpeed:13.4, acc:6, stamina:140, regen:1 };
  const special = OPPONENT_SPECIALS[name] || null;
  const canBeRushed = OPPONENTS_THAT_CAN_BE_RUSHED.includes(name);
  return {
    name,
    number: null,
    baseMaxSpeed: g.maxSpeed,
    baseAcc: g.acc,
    staminaMax: g.stamina,
    regenPerTick: (g.regen || 0.6) / 10,
    maxSpeed: g.maxSpeed,
	minSpeed: g.minSpeed,
	acc: g.acc,
    speed: 0,
    pos: 0,
    stamina: g.stamina,
    finished: false,
    finalPlace: null,
    exhausted: false,
    reachedMiddle: false,
    startRank: null,
    _mods: {},
    lastAbilityUsed: 0,
    tier: 1,
    special: special,
    canBeRushed: canBeRushed
  };
}

function applyWeatherToRace(rs) {
  if (!rs) return;
  const r = Math.random();
  if (r < 0.5) rs.weather = "Sunny";
  else if (r < 0.75) rs.weather = "Cloudy";
  else rs.weather = "Rainy";
  
  if (rs.weather === "Sunny") { rs.track = "Firm"; addLog(`<span id="ok">Looks like it's a sunny day today!</span>`); }
  else if (rs.weather === "Cloudy") { rs.track = "Good"; addLog(`<span id="warn">Looks like it's a cloudy day today!</span>`); }
  else { rs.track = "Wet"; addLog(`<span id="warn">Looks like it's a rainy day today!</span>`); }

  const track = rs.track;
  const weather = rs.weather;

  let baseSpeedMult = 1;
  let baseAccMult = 1;
  if (track === "Firm") { baseSpeedMult = 1; baseAccMult = 1; }
  if (track === "Good") { baseSpeedMult = 0.95; baseAccMult = 1; }
  if (track === "Wet")  { baseSpeedMult = 0.90; baseAccMult = 0.6; }

  for (const racer of (rs.field || [])) {
    racer._mods = racer._mods || {};
    racer._mods._prev = racer._mods._prev || {};
    if (typeof racer._mods._prev.maxSpeed === 'undefined') racer._mods._prev.maxSpeed = racer.maxSpeed || 0;
    if (typeof racer._mods._prev.acc === 'undefined') racer._mods._prev.acc = racer.acc || 0;

    racer.weatherType = racer.weatherType || (
      DRY_RUNNERS.includes(racer.name) ? "dry" :
      WET_RUNNERS.includes(racer.name) ? "wet" :
      VERSATILE_RUNNERS.includes(racer.name) ? "versatile" : "dry"
    );

    let trackSpeedMult = 1;
    let trackAccMult = 1;

    if (track === "Good") {
      if (racer.weatherType === "dry" || racer.weatherType === "versatile") trackSpeedMult = 1;
      else trackSpeedMult = baseSpeedMult;
      trackAccMult = 1;
    } else if (track === "Wet") {
      if (racer.weatherType === "wet" || racer.weatherType === "versatile") trackSpeedMult = 1;
      else trackSpeedMult = baseSpeedMult;
      if (racer.weatherType === "wet" || racer.weatherType === "versatile") trackAccMult = 1;
      else trackAccMult = baseAccMult;
    } else {
      trackSpeedMult = baseSpeedMult;
      trackAccMult = baseAccMult;
    }

    racer._mods.trackSpeedMult = trackSpeedMult;
    racer._mods.trackAccMult  = trackAccMult;

    racer.maxSpeed = (racer._mods._prev.maxSpeed || 0) * (racer._mods.trackSpeedMult || 1);
    racer.acc      = (racer._mods._prev.acc || 0) * (racer._mods.trackAccMult || 1);

    if (weather === "Sunny" && racer.weatherType === "dry") {
      racer.maxSpeed = (racer.maxSpeed || 0) * 1.05;
      racer._mods._dryBonus = true;
    }
    if (weather === "Rainy" && racer.weatherType === "wet") {
      racer.maxSpeed = (racer.maxSpeed || 0) * 1.05;
      racer._mods._wetBonus = true;
    }
  }

  let tint = document.getElementById('uma-weather-tint');
  if (!tint) {
    tint = document.createElement('div');
    tint.id = 'uma-weather-tint';
    tint.style.position = 'fixed';
    tint.style.left = '0';
    tint.style.top = '0';
    tint.style.width = '100%';
    tint.style.height = '100%';
    tint.style.background = '#000';
    tint.style.opacity = '0';
    tint.style.pointerEvents = 'none';
    tint.style.zIndex = '2147483600';
    tint.style.transition = 'opacity 0.25s linear';
    document.body.appendChild(tint);
  }

  let video = document.getElementById('uma-weather-video');
  if (!video) {
    video = document.createElement('video');
    video.id = 'uma-weather-video';
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.position = 'fixed';
    video.style.left = '0';
    video.style.top = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '2147483599';
    video.style.opacity = '0.33';
    const src = document.createElement('source');
    src.src = 'rain_overlay.mp4';
    src.type = 'video/mp4';
    video.appendChild(src);
    document.body.appendChild(video);
    video.play().catch(()=>{});
  }

  if (weather === 'Cloudy') {
    tint.style.opacity = '0.2';
    video.style.display = 'none';
    try { video.pause(); } catch(e){}
  } else if (weather === 'Rainy') {
    tint.style.opacity = '0.08';
    video.style.display = '';
    try { video.play().catch(()=>{}); } catch(e){}
  } else {
    tint.style.opacity = '0';
    try { video.pause(); } catch(e){}
    video.style.display = 'none';
  }
}

function clearWeatherEffects(){
  try{
    // 1) Fade out & remove tint element if present
    const tint = document.getElementById('uma-weather-tint');
    if(tint){
      try{ tint.style.opacity = '0'; }catch(e){}
      // remove after transition (safe fallback)
      setTimeout(()=>{
        try{ if(tint.parentNode) tint.parentNode.removeChild(tint); }catch(e){}
      }, 260);
    }

    // 2) Stop, unload, and remove the weather video element if present
    const vid = document.getElementById('uma-weather-video');
    if(vid){
      try{ vid.pause(); }catch(e){}
      try{ vid.removeAttribute('src'); }catch(e){}
      // remove any <source> children
      try{
        while(vid.firstChild) vid.removeChild(vid.firstChild);
      }catch(e){}
      // reload to fully clear buffers (some browsers)
      try{ if(typeof vid.load === 'function') vid.load(); }catch(e){}
      // finally remove it from DOM
      try{ if(vid.parentNode) vid.parentNode.removeChild(vid); }catch(e){}
    }

    // 3) Remove any body classes that start with "weather-" (defensive)
    try{
      const body = document.body;
      if(body && body.classList && body.classList.length){
        const toRemove = [];
        body.classList.forEach(c=>{
          if(typeof c === 'string' && c.indexOf('weather-') === 0) toRemove.push(c);
        });
        toRemove.forEach(c=> body.classList.remove(c));
      }
    }catch(e){}

    // 4) Defensive style cleanup for common containers that might have tints applied inline
    ['#game', '.battlefield', '#raceContainer', '.race-area', 'main'].forEach(sel=>{
      try{
        const el = document.querySelector(sel);
        if(el && el.style){
          el.style.backgroundBlendMode = '';
          el.style.backgroundImage = '';
          el.style.filter = '';
          el.style.transition = '';
        }
      }catch(e){}
    });

    // 5) clear any lightweight global handles (defensive)
    try{ if(window._weatherInterval){ clearInterval(window._weatherInterval); window._weatherInterval = null; } }catch(e){}
    try{ if(window._weatherTimeout){ clearTimeout(window._weatherTimeout); window._weatherTimeout = null; } }catch(e){}

    // 6) clear raceState weather flag so later logic doesn't think weather still applies
    try{ if(raceState) raceState.weather = null; }catch(e){}
  }catch(err){
    console.warn("clearWeatherEffects error:", err);
  }
}

function prepareRace(selectedRaceId){
  const race = (RACES || []).find(r=>r.id === selectedRaceId) || (RACES && RACES[0]);
  if(!race){
    addLog("No race found to prepare.");
    return;
  }
  
  if(race.grade === "Finale" && (!state.finale || !state.finale.chosenPath)){
  if((state.g1RacesRun||0) < 3){
    alert(`${r.name} is not ready.`);
    return;
  }
  const choices = Object.keys(RACES.Finale || {});
  let promptMsg = "Input the corresponding number to the Career Finale you wish to race in:\n";
  choices.forEach((c,i)=> promptMsg += `${i+1}: ${c}\n`);
  const pick = prompt(promptMsg, "1");
  const idx = Math.max(0, Math.min(choices.length-1, parseInt(pick,10)-1));
  const chosen = choices[idx];
  if(!chosen) { alert("No valid path chosen."); return; }
  state.finale = state.finale || {};
  state.finale.chosenPath = chosen;
  state.finale.progressIndex = 0;
  saveState();
  addLog(`<div class="ok">Career Finale Path: ${chosen}. ${r.name} must now run these races in order. Prepare yourself.</div>`);
  const allowed = (RACES.Finale[chosen]||[])[0];
  if(allowed && allowed.name !== race.name){
    alert(`Career Finale: ${chosen}. Your first race is The ${allowed.name}.`);
    return;
  }
}

  let fieldCount = 16;
  const rid = (race.id||"").toString().toLowerCase();
  const rgrade = (race.grade||"").toString().toLowerCase();
  if(rid === "debut" || rgrade === "debut") fieldCount = 8;
  else if(rid === "g1" || rgrade === "g1" || (race.name && race.name.toLowerCase().includes("g1"))) fieldCount = 18;
  else fieldCount = 16;

  // Build the player's runtime racer object using your derivePlayerValues (keeps behaviour)
  const pvals = (typeof derivePlayerValues === "function") ? derivePlayerValues(state.stats) : { minSpeed: 11.1, maxSpeed:13.4, acc:0.6, staminaMax:140, regenPerTick:0.1 };
  const player = {
    isPlayer: true,
    name: state.name || "Player",
    number: null,
    baseMaxSpeed: pvals.maxSpeed,
    baseAcc: pvals.acc,
    staminaMax: pvals.staminaMax,
    regenPerTick: pvals.regenPerTick,
    maxSpeed: pvals.maxSpeed,
	minSpeed: pvals.minSpeed,
    acc: pvals.acc,
    speed: 0,
    pos: 0,
    stamina: pvals.staminaMax,
    finished: false,
    finalPlace: null,
    exhausted: false,
    reachedMiddle: false,
    reachedLate: false,
    startRank: null,
    _mods: {},
    activeBuffs: []
  };

  // Create the field array and push the player first
  const field = [ player ];

  // Grab opponent names and request opponents via your makeOpponent function
  const oppNames = Object.keys(OPPONENTS).sort(()=>Math.random()-0.5);

  for(let i=0; i < fieldCount - 1; i++){
    // call your implemented makeOpponent exactly as before
    const name = oppNames[i % oppNames.length]; // wrap if needed but still uses your keys
    const op = makeOpponent(name, race.grade === "Debut" ? "Debut" : race.grade);
    // If makeOpponent returns null/undefined, throw a clear error so you can fix the opponent data/signature
    if(!op){
      const err = `prepareRace: makeOpponent returned null for name='${name}', slot=${i}, race.id='${race.id}', race.grade='${race.grade}'.`;
      console.error(err);
      throw new Error(err);
    }
    // Normalize minimal runtime props (keeps your opponent object but ensures commonly used fields exist)
    op.isPlayer = false;
    op.finished = !!op.finished;
    op.pos = op.pos || 0;
    op.speed = op.speed || 0;
    op._mods = op._mods || {};
    op.reachedMiddle = !!op.reachedMiddle;
    op.reachedLate = !!op.reachedLate;
    op.activeBuffs = op.activeBuffs || [];
    op.maxSpeed = op.maxSpeed || op.baseMaxSpeed || 1;
    op.acc = op.acc || op.baseAcc || 0.1;
    op.stamina = (typeof op.stamina === "number") ? op.stamina : (op.staminaMax || 100);
    op.staminaMax = op.staminaMax || op.stamina || 100;
    op.regenPerTick = op.regenPerTick || 0.1;

    field.push(op);
  }

  // Shuffle/assign numbers 1..fieldCount
  const nums = Array.from({length:fieldCount}, (_,i)=>i+1);
  for(let i = nums.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = nums[i]; nums[i] = nums[j]; nums[j] = tmp;
  }
  field.forEach((f, idx) => {
    f.number = nums[idx];
    f.startRank = idx + 1;
  });

  // Finally set up the raceState with the complete field
  raceState = { race, field, time:0, finishedCount:0, nextFinishPlace:1, running:false };

  renderRacersList(raceState.field, race.distance);
  renderRaceInfo(race);
  el("commentary").innerHTML = "";
  applyWeatherToRace(raceState);
  addLog(`Prepared race: ${race.id}`);
  if(el("enterRaceBtn")) el("enterRaceBtn").style.display = "none";
}

function renderRaceInfo(r){
  let dist = "";
  if (r.distance < 1400 && r.grade !== "Debut") dist = " (Sprint)";
  else if (r.distance >= 1400 && r.distance <= 1600) dist = " (Mile)";
  else if (r.distance > 1600 && r.distance <= 2000) dist = " (Medium)";
  else if (r.distance > 2000 && r.distance <= 5000) dist = " (Long)";
  else if (r.distance > 5000) dist = " (Very Long)";

  el("raceInfo").innerHTML = `<b>${r.id}</b><div class="small muted">${r.grade} • Track: ${r.track} • Direction: ${r.direction || 'Right'} • Distance: ${r.distance}m${dist} • Fans Watching: ${r.rewardFame}</div>`;
}

function renderRacersList(field, raceDistance){
  const wrap = el("racersList"); wrap.innerHTML = "";
  for(const r of field){
    const idTag = r.isPlayer ? "PLAYER" : r.name.replace(/\s+/g,"_");
    const div = document.createElement("div"); div.className = "raceline"; div.id = "rline_"+idTag;
    // markers every 200m
    let markersHTML = "";
    if(raceDistance){
      for(let m=200; m<raceDistance; m+=200){
        const left = (m / raceDistance) * 100;
        markersHTML += `<div class="progress-marker" style="left:${left}%;"></div>`;
      }
      markersHTML += `<div class="progress-marker finish" style="left:100%"></div>`;
    }
    div.innerHTML = `
      <div style="width:46px;text-align:center"><b>#${r.number}</b></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between"><div><b>${r.name}</b>${r.isPlayer? ' <span style="color:#00e1ff">YOU</span>':''}</div><div class="small muted" id="rpos_${idTag}">Position: 0</div></div>
        <div class="small muted">Speed: <span id="rspd_${idTag}">0</span> m/s • Stamina: <span id="rst_${idTag}">${Math.round(r.stamina)}</span>/<span id="rmaxst_${idTag}">${Math.round(r.staminaMax)}</span></div>
        <div class="progress-wrap" style="margin-top:6px">
          <div class="progress-track" id="track_${idTag}">
            <div class="area-early" id="area_early_${idTag}"></div>
            <div class="area-middle" id="area_middle_${idTag}"></div>
            <div class="area-late" id="area_late_${idTag}"></div>
            <div class="progress-fill" id="progress_fill_${idTag}" style="width:0%"></div>
            ${markersHTML}
            <div class="progress-label" style="left:0%">0m</div>
            <div class="progress-label" style="left:100%">Finish</div>
          </div>
        </div>
      </div>`;
    wrap.appendChild(div);
    // set area sizes by raceDistance
    const earlyEl = document.getElementById("area_early_"+idTag);
    const midEl = document.getElementById("area_middle_"+idTag);
    const lateEl = document.getElementById("area_late_"+idTag);
    if(earlyEl && midEl && lateEl){
      const ePct = 25;
      const mPct = 49;
      const lPct = 26;
      earlyEl.style.width = ePct + "%";
      earlyEl.style.left = "0%";
      midEl.style.width = mPct + "%";
      midEl.style.left = ePct + "%";
      lateEl.style.width = lPct + "%";
      lateEl.style.left = (ePct + mPct) + "%";
    }
  }
}

/* apply passives (player only) */
function evaluatePassivesEachTick(){
  if(!raceState) return;
  const player = raceState.field.find(f=>f.isPlayer);
  if(!player) return;

  for(const pid of state.abilities.equippedPassives || []){
    const def = ABILITIES.passives.find(x=>x.id === pid);
    if(!def) continue;
    try{
      const cond = (typeof def.condition === 'function') ? def.condition(raceState, player) : false;
      if(cond){
        def.apply(player, raceState);
      } else {
        if(typeof def.remove === 'function') def.remove(player, raceState);
      }
    }catch(e){ console.warn("ability error", e); }
  }

  const uqId = state.abilities.equippedUnique;
  if(uqId){
    const udef = (ABILITIES.uniques || []).find(x=>x.id === uqId);
    if(udef){
      try{
        const ucond = (typeof udef.condition === 'function') ? udef.condition(raceState, player) : true;
        if(ucond){
          udef.apply(player, raceState);
        } else {
          if(typeof udef.remove === 'function') udef.remove(player, raceState);
        }
      }catch(e){ console.warn("unique ability error", e); }
    }
  } else {
    try {
      const uniqKeys = ['EndCloser','LateSurger','PaceChaser','FrontRunner'];
      if(player._mods){
        for(const k of uniqKeys){
          if(player._mods[k] && typeof player._mods[k] !== 'function'){
            const def = (ABILITIES.uniques || []).find(x=>x.id && x.id.replace(/\s+/g,'') === k.replace(/\s+/g,''));
          }
        }
      }
    } catch(e){}
  }

  for (const k in player._mods) {
	const mod = player._mods[k];
	if (mod && mod.expires && raceState.time >= mod.expires) {
      const nameMap = {
		Aura:"Aura", Competitive:"Competitive", Rushed:"Rushed", LateStart:"LateStart",
		LowEnergyAcc:"LowEnergyAcc", SpecialActivated:"SpecialActivated", SpecialActivatedOnce:"SpecialActivatedOnce",
		Further:"Further", Gotcha:"Gotcha", CopySpeed:"CopySpeed", CloudyDays:"CloudyDays",
		RainyDays:"RainyDays", FirmConditions:"FirmConditions", RainyDaysActive:"RainyDaysActive",
		CloudyDaysActive:"CloudyDaysActive", _prev:"_prev", EndCloser:"EndCloser",
		LateSurger:"LateSurger", PaceChaser:"PaceChaser", FrontRunner:"FrontRunner"
      };
	  const id = nameMap[k] || k;

      const def = (ABILITIES.passives.find(x => x.id === id) || (ABILITIES.uniques && ABILITIES.uniques.find(x => x.id === id)));
      if (def && def.remove) def.remove(player, raceState);

      if (mod.onExpire) mod.onExpire(player, raceState);

      delete player._mods[k];
	}
  }
}

/* helper for current rank, uses finalPlace locking */
function getCurrentRank(rs, racer){
  if(racer.finished && typeof racer.finalPlace === 'number') return racer.finalPlace;
  // dynamic sort among non-finished by pos
  const live = [...rs.field].filter(x=>!x.finished).sort((a,b)=>b.pos - a.pos);
  if(racer.finished) return 1e6; // won't reach
  return live.findIndex(x=>x===racer) + 1;
}

/* race tick: physics, stamina, middle detection, finish lock */
function startRace(){
  if(!raceState) { alert("No race prepared."); return; }
  if(raceState.running) return;

  raceState.running = true; raceState.time = 0; raceState.finishedCount = 0; raceState.nextFinishPlace = 1;
  // reset crew 25
  for(const r of raceState.field){
    r.speed = 0; r.pos = 0; r.stamina = r.staminaMax; r.finished = false; r.finalPlace = null;
    r.exhausted = false; r.reachedMiddle = false; r._mods = {}; r.activeBuffs = []; r.startRank = r.startRank || 1;
  }
  
  // Constants for new features
  const LOW_ENERGY_THRESHOLD = 30;
  const LATE_START_CHANCE = (function(){ const base=0.05; const scale=_getWitsScale(); return base * (1 - scale); })();
  const LATESTARTCHANCE = applyAbilityChanceModifiers(LATE_START_CHANCE, raceState);
  const LATE_START_DELAY = 0.5;
  const LATESTARTDELAY = computeLateStartDelayWithModifiers(LATE_START_DELAY, raceState)
  
  state.playerAbilityLastUsed = state.playerAbilityLastUsed || 0;
  state.playerAbilityLastUsedRace = null;
  for(const r of raceState.field || []){
  r.lastAbilityUsed = 0;
  if(r._mods) delete r._mods.SpecialActivatedOnce;
										}
  const player = raceState.field.find(f=>f.isPlayer);
  
  // NEW: assign late-starts (5% chance) for EVERY racer, and apply low-energy penalty to player if needed
  // Note: raceState.time is 0 here (race just started), so startsAt = 0.5
  for(const r of raceState.field){
    // 5% Late Start chance for every racer
    if(Math.random() < LATESTARTCHANCE){
      // mark with a LateStart mod; we'll check this in raceTick to block acceleration until startsAt
      r._mods = r._mods || {};
      r._mods.LateStart = { startsAt: raceState.time + LATE_START_DELAY };
      if(raceState.isPlayer) {
		addLog(`<div class="warn">${r.name} had a late start!</div>`);
	  } else {
		addLog(`<div>${r.name} had a late start!</div>`);
	  }
    }
  }

  if(player){
    if(typeof state !== "undefined" && typeof state.energy === "number" && state.energy <= LOW_ENERGY_THRESHOLD){
      player._mods = player._mods || {};
      // reduce acceleration by 5% for the whole race
      const acPenalty = player.acc * 0.05;
      player._mods.LowEnergyAcc = { acPenalty: acPenalty, note: "lowEnergy" };
      player.acc = Math.max(0, player.acc - acPenalty);
      // optional log to show effect
      addLog(`<div class="warn">${player.name} looks a little exhausted there... it seems they didn't get much rest before the race.</div>`);
    }
  }

  renderRacersList(raceState.field, raceState.race.distance); // redraw UI
  addLog(`Race started: ${raceState.race.id}`);
  
  try{ AudioManager.playRaceMusicFor(raceState.race); }catch(e){ console.warn("AudioManager race play failed", e); }
  
  raceTickHandle = setInterval(()=>raceTick(0.01), 10);
  commentaryHandle = setInterval(()=>raceCommentaryTick(), rand(500,1500));
}

function raceTick(dt){
  if(!raceState || !raceState.running) return;
  raceState.time += dt;
  evaluatePassivesEachTick();

  const len = raceState.race.distance;

  // constants for new features
  const BASE_DRAIN_PER_TICK = 0.1;
  const PLAYER_RUSH_CHANCE = (function(){ const base = 0.0001; const scale = _getWitsScale(); return base * (1 - scale); })();
  const RUSH_CHANCE = applyAbilityChanceModifiers(PLAYER_RUSH_CHANCE, raceState);
  const RUSH_MS_MULT = 0.08;
  const RUSH_DURATION = 5;

  for(const r of raceState.field){
    if(r.finished) continue;

    let curMax = r.maxSpeed || r.baseMaxSpeed;
    curMax = Math.max((r.minSpeed || 11.1), curMax);

    // Handle LateStart: if racer has LateStart and current time < startsAt, they don't accelerate
    const late = r._mods && r._mods.LateStart;
    const isLateBlocked = late && (raceState.time < late.startsAt);

    // acceleration allowed only when not exhausted AND not late-blocked
    if(r.exhausted){
      if(r.speed > (r.minSpeed || 11.1)) r.speed = (r.minSpeed || 11.1);
    } else {
      if(isLateBlocked){
        r.speed = Math.max(0, r.speed * 0); // effectively 0
      } else {
        if(r.speed < curMax) {
          r.speed += (r.acc || r.baseAcc) * dt;
          if(r.speed > curMax) r.speed = curMax;
        } else if(r.speed > curMax) {
          r.speed -= (r.acc || r.baseAcc) * dt * 0.6;
          if(r.speed < curMax) r.speed = curMax;
        }
      }
    }

    if(!r.finished && (r.isPlayer || r.canBeRushed) && !(r._mods && r._mods.Rushed)){
      if(Math.random() < RUSH_CHANCE){
        r._mods = r._mods || {};
        const ms = r.maxSpeed * RUSH_MS_MULT;
        r._mods.Rushed = { ms: ms, dmult: 4, expires: raceState.time + RUSH_DURATION };
        r.maxSpeed += ms;
        if(r.isPlayer) addLog(`<div class="warn">Looks like ${r.name} feels a bit RUSHED there!</div>`);
        else addLog(`<div>Looks like ${r.name}'s a little RUSHED there!</div>`);
        setTimeout(()=>{ if(r._mods && r._mods.Rushed){ r.maxSpeed -= r._mods.Rushed.ms; delete r._mods.Rushed; } }, RUSH_DURATION*1000);
      }
    }

    if(!r.isPlayer && r.special && !(r._mods && r._mods.SpecialActivated)){
      const pctNow = (r.pos / len) * 100;
      if(pctNow >= (r.special.minPct || 40)){
        if(Math.random() < ((r.special.chance || 0.002) && r.stamina > 0)){
          r._mods = r._mods || {};
          r._mods.SpecialActivated = true;
          try{
            r.special.activate(r, raceState);
          }catch(e){ console.warn("Opponent special activation error", e); }
        }
      }
    }

    // stamina drain/regain
    if(r.speed >= curMax){
	  let mult = 1;
	  if(r._mods){
		for(const mk in r._mods){
		try {
          if(r._mods[mk] && typeof r._mods[mk].dmult === 'number') mult *= r._mods[mk].dmult;
		} catch(e){}
      }
	}
	r.stamina -= (BASE_DRAIN_PER_TICK * mult);
	} else {
	  r.stamina += (r.regenPerTick || 0.1);
	}
    r.stamina = clamp(r.stamina, 0, r.staminaMax);

    // exhaustion handling
    if(r.stamina <= 0 && !r.exhausted){
      r.exhausted = true;
      r.speed = Math.min(r.speed, (r.minSpeed || 11.1));
	  if(r.isPlayer) {
		addLog(`<div class="warn">Oh and it looks like ${r.name} has ran out of stamina!<div>`);
	  } else {
		addLog(`Oh and it looks like ${r.name} has ran out of stamina!`);
	  }
      // Cool Down passive when hitting 0: if player has it
      if(r.isPlayer && state.abilities.equippedPassives.includes("Cool Down")){
        r.stamina = clamp(r.stamina + r.staminaMax*0.4, 0, r.staminaMax);
      }
    }

    // if exhausted, regen until full, then recover
    if(r.exhausted){
      r.stamina += (r.regenPerTick || 0.1);
      if(r.stamina >= r.staminaMax - 1e-6){
        r.stamina = r.staminaMax; r.exhausted = false; addLog(`${r.name} accelerates once more!`);
      }
    }

    // advance
    r.pos += r.speed * dt;

    const pct = (r.pos / len) * 100;
    if(!r.reachedMiddle && pct >= 25){
      r.reachedMiddle = true;
      addCommentary(`${r.name} has reached the turning point!`);
    }
    if(!r.reachedLate && pct >= 75){
      r.reachedLate = true;
      addCommentary(`${r.name} has reached the final stretch!`);
    }

    // finish crossing: lock in immediately when pos >= len
    if(r.pos >= len && !r.finished){
      r.finished = true;
      r.finalPlace = raceState.nextFinishPlace++;
      r.pos = len;
      r.speed = 0;
      addLog(`${r.name} crossed the finish line at place ${r.finalPlace}!`);
    }
  }

  // update UI (unchanged)
  const sorted = [...raceState.field].sort((a,b)=>{
    // finished ones ordered by finalPlace ascending
    if(a.finished && b.finished) return (a.finalPlace||0) - (b.finalPlace||0);
    if(a.finished && !b.finished) return -1;
    if(!a.finished && b.finished) return 1;
    return b.pos - a.pos;
  });

  sorted.forEach((r,i)=>{
    const idTag = r.isPlayer ? "PLAYER" : r.name.replace(/\s+/g,"_");
    const speedEl = document.getElementById("rspd_"+idTag);
    const stEl = document.getElementById("rst_"+idTag);
    const posEl = document.getElementById("rpos_"+idTag);
    const fillEl = document.getElementById("progress_fill_"+idTag);
    if(speedEl) speedEl.textContent = r.speed.toFixed(2);
    if(stEl) stEl.textContent = r.stamina.toFixed(1);
    if(posEl) {
      if(r.finished && typeof r.finalPlace === "number") posEl.textContent = `FIN ${r.finalPlace}`;
      else posEl.textContent = `pos: ${i+1} (${Math.min(9999,Math.round(r.pos))}m)`;
    }
    if(fillEl) fillEl.style.width = clamp((r.pos / raceState.race.distance) * 100, 0, 100) + "%";
  });

  el("raceTime").textContent = raceState.time.toFixed(2) + "s";

  // if all finished
  if(raceState.field.every(r=>r.finished)){
    endRace();
  }
}

/* commentary tick — random but accurate-ish statements */
function raceCommentaryTick(){
  if(!raceState || !raceState.running) return;
  const alive = raceState.field.filter(r=>!r.finished);
  if(alive.length === 0) return;
  const focus = raceState.field[rand(0, raceState.field.length-1)];
  let msg = "";
  if(focus.finished){
    msg = `${focus.name} crossed the line at place ${focus.finalPlace}.`;
  } else if(focus.exhausted){
    msg = `${focus.name} ran out of stamina!`;
  } else {
    const rank = getCurrentRank(raceState, focus);
    if(rank === 1){
      const second = raceState.field.filter(f=>!f.finished).sort((a,b)=>b.pos-a.pos)[1];
      const gap = second ? Math.round(focus.pos - second.pos) : 0;
      msg = `${focus.name} is leading by ${gap}m.`;
    } else if(rank <= 3) msg = `${focus.name} is holding position in top ${rank}.`;
    else msg = `${focus.name} is trying to catch up (pos ${rank}).`;
  }
  addCommentary(msg);
}

function clearAllAbilityEffects(){
  try{
    if(!raceState) {
      // still clear player trackers if possible
      if(state){
        state.playerAbilityLastUsed = null;
        state.playerAbilityLastUsedRace = null;
        saveState();
        try{ refreshPlayerUI(); }catch(e){}
      }
      return;
    }

    // 1) Ensure equipped passive removals are run for player
    try{
      const player = (raceState.field||[]).find(f=>f.isPlayer);
      if(player && state && state.abilities && Array.isArray(state.abilities.equippedPassives)){
        for(const pid of state.abilities.equippedPassives){
          try{
            const def = ABILITIES.passives.find(x=>x.id === pid);
            if(def && typeof def.remove === 'function') def.remove(player, raceState);
          }catch(e){ /* ignore per-passive errors */ }
        }
      }
    }catch(e){ /* ignore */ }

    // 2) Walk every racer and undo any _mods present
    (raceState.field || []).forEach(r => {
      if(!r || !r._mods) return;
      for(const k of Object.keys(r._mods)){
        const mod = r._mods[k];
        if(!mod) continue;
        try{
          // clear interval/timeout handles created by mods
          if(mod.intervalId) {
            try{ clearInterval(mod.intervalId); }catch(e){}
          }
          if(mod.timeoutId) {
            try{ clearTimeout(mod.timeoutId); }catch(e){}
          }

          // conservative reversal of common additive effects
          if(typeof mod.ms === 'number' && typeof r.maxSpeed === 'number'){
            r.maxSpeed = Math.max(0, (r.maxSpeed || 0) - mod.ms);
          }
          if(typeof mod.ac === 'number' && typeof r.acc === 'number'){
            r.acc = Math.max(0, (r.acc || 0) - mod.ac);
          }
          if(typeof mod.regen === 'number' && typeof r.regenPerTick === 'number'){
            r.regenPerTick = Math.max(0, (r.regenPerTick || 0) - mod.regen);
          }
          if(typeof mod.regenPerTick === 'number' && typeof r.regenPerTick === 'number'){
            r.regenPerTick = Math.max(0, (r.regenPerTick || 0) - mod.regenPerTick);
          }

          // if a mod stored prev values, prefer restoring them after cleaning
        }catch(e){ /* ignore individual mod errors */ }
      }

      // restore an explicit _prev snapshot if present (this resets core values)
      try{
        if(r._mods && r._mods._prev){
          const prev = r._mods._prev;
          if(typeof prev.maxSpeed !== 'undefined') r.maxSpeed = prev.maxSpeed;
          if(typeof prev.acc !== 'undefined') r.acc = prev.acc;
          if(typeof prev.regenPerTick !== 'undefined') r.regenPerTick = prev.regenPerTick;
        }
      }catch(e){}

      // final cleanup
      try{
        r._mods = {};
        r.activeBuffs = [];
        r.lastAbilityUsed = 0;
      }catch(e){}
    });

    // 3) Reset player active usage trackers (so next race is fresh)
    try{
      if(state){
        state.playerAbilityLastUsed = null;
        state.playerAbilityLastUsedRace = null;
      }
    }catch(e){}
	
	try{
	  const uId = (state && state.abilities && state.abilities.equippedUnique) ? state.abilities.equippedUnique : null;
	  if(uId && player){
		const udef = (ABILITIES.uniques || []).find(x=>x.id === uId);
		if(udef && typeof udef.remove === 'function') udef.remove(player, raceState);
	  }
	}catch(e){ /* ignore */ }

    // persist UI/state
    try{ saveState(); }catch(e){}
    try{ refreshPlayerUI(); }catch(e){}
  }catch(err){
    console.warn("clearAllAbilityEffects failed:", err);
  }
}
//ability thingy
const abBtn = _getAbilityButtonForId();

function endRace(){
  try{ clearAllAbilityEffects(); } catch(e){ console.warn("clearAllAbilityEffects failed at race finish", e); }
  if(raceTickHandle){ clearInterval(raceTickHandle); raceTickHandle = null; }
  if(commentaryHandle){ clearInterval(commentaryHandle); commentaryHandle = null; }
  if(!raceState) return;
  raceState.running = false;
  let amt = 0;
  
  const anyFinished = raceState.field && raceState.field.some(r => r.finished);
  if((raceState.time === 0 || typeof raceState.time === "undefined") && !anyFinished){
    addLog("Race aborted before start. No results recorded.");
    // restore Enter Race button so user can re-enter
    if(el("enterRaceBtn")) el("enterRaceBtn").style.display = "";
    // clear the prepared race state fully so UI / logic is clean
    raceState = null;
    return;
  }

  addLog("Race ended. Processing results...");
  const player = raceState.field.find(f=>f.isPlayer);
  const place = (player && typeof player.finalPlace === "number") ? player.finalPlace : null;
  const baseFame = raceState.race ? (raceState.race.rewardFame || 0) : 0;
  const baseSP = 50;
  const statGains = [];
  let spGain = 0;

  // count this race as done
  state.racesDone = (state.racesDone || 0) + 1;

  const STAT_KEYS = ["Speed","Stamina","Power","Guts","Wits"];
  function pickStatForGain(alreadyPicked){
    const candidates = STAT_KEYS.filter(x => !(alreadyPicked||[]).includes(x) && (state.stats[x]||0) < getEffectiveStatCapForPlayer(state));
    if(candidates.length === 0){
      const fallback = STAT_KEYS.filter(x => !(alreadyPicked||[]).includes(x));
      if(fallback.length > 0) return fallback[rand(0, fallback.length-1)];
      return STAT_KEYS[rand(0, STAT_KEYS.length-1)];
    }
    return candidates[rand(0, candidates.length-1)];
  }

  if(place === 1){
    state.fame = (state.fame || 0) + baseFame;
	spGain = (state.sp||0) + baseSP;
    const picked = [];
    for(let i=0;i<5;i++){
      const statKey = pickStatForGain(picked);
      picked.push(statKey);
      const base = state.stats[statKey] || 0;
      const after = clamp(base * 1.05, 0, getEffectiveStatCapForPlayer(state));
      const amount = after - base;
      state.stats[statKey] = after;
      statGains.push({ stat: statKey, amount });
    }
    var gainsHtml = "";
    if (Array.isArray(statGains) && statGains.length>0) {
      gainsHtml = statGains.map(g => `Gained ${(g.amount||0).toFixed(2)} ${g.stat}`).join("<br>");
    }
    state.sp += spGain;
    state.wins = (state.wins||0) + 1;
    addLog(`<b class="ok">Congratulations! ${player.name} won 1st place!<br>Earned ${state.fame} Fame<br>Earned ${spGain} SP<br>${gainsHtml}</b>`);
  } else if(place === 2){
    state.fame = (state.fame || 0) + Math.round(baseFame * 0.75);
	state.losses = (state.losses||0) + 1;
    spGain = (state.sp||0) + (baseSP * 0.5);
    const picked = [];
    for(let i=0;i<4;i++){
      const statKey = pickStatForGain(picked);
      picked.push(statKey);
      const base = state.stats[statKey] || 0;
      const after = clamp(base * 1.03, 0, getEffectiveStatCapForPlayer(state));
      const amount = after - base;
      state.stats[statKey] = after;
      statGains.push({ stat: statKey, amount });
    }
    var gainsHtml = "";
    if (Array.isArray(statGains) && statGains.length>0) {
      gainsHtml = statGains.map(g => `Gained ${(g.amount||0).toFixed(2)} ${g.stat}`).join("<br>");
    }
	state.sp += spGain;
    addLog(`<b class="ok">${player.name} finished 2nd place! Nice!<br>Earned ${state.fame} Fame<br>Earned ${spGain} SP<br>${gainsHtml}</b>`);
  } else if(place === 3){
    state.fame = (state.fame || 0) + Math.round(baseFame * 0.5);
	state.losses = (state.losses||0) + 1;
    spGain = (state.sp||0) + (baseSP * 0.2);
    const picked = [];
    for(let i=0;i<3;i++){
      const statKey = pickStatForGain(picked);
      picked.push(statKey);
      const base = state.stats[statKey] || 0;
      const after = clamp(base * 1.03, 0, getEffectiveStatCapForPlayer(state));
      const amount = after - base;
      state.stats[statKey] = after;
      statGains.push({ stat: statKey, amount });
    }
    var gainsHtml = "";
    if (Array.isArray(statGains) && statGains.length>0) {
      gainsHtml = statGains.map(g => `Gained ${(g.amount||0).toFixed(2)} ${g.stat}`).join("<br>");
    }
	state.sp += spGain;
    addLog(`<b class="ok">${player.name} won 3rd place! Good job!<br>Earned ${state.fame} Fame<br>Earned ${spGain} SP<br>${gainsHtml}<br></b>`);
  } else if(typeof place === 'number' && place > 3 && place <= 8) {
    state.losses = (state.losses||0) + 1;
	spGain = (state.sp||0) + (baseSP * 0.2);
    const picked = [];
    for(let i=0;i<2;i++){
      const statKey = pickStatForGain(picked);
      picked.push(statKey);
      const base = state.stats[statKey] || 0;
      const after = clamp(base * 1.03, 0, getEffectiveStatCapForPlayer(state));
      const amount = after - base;
      state.stats[statKey] = after;
      statGains.push({ stat: statKey, amount });
    }
    var gainsHtml = "";
    if (Array.isArray(statGains) && statGains.length>0) {
      gainsHtml = statGains.map(g => `Gained ${(g.amount||0).toFixed(2)} ${g.stat}`).join("<br>");
    }
	state.sp += spGain;
    addLog(`<span class="warn">${player.name} finished ${place}th place.<br>Earned ${spGain} SP<br>${gainsHtml}</span>`);
  } else if (typeof place === 'number' && place > 8 && place <= 12) {
	state.fame = (state.fame || 0) - 50;
	spGain = (state.sp||0) + (baseSP * 0.1);
	state.losses = (state.losses||0) + 1;
    const picked = [];
    for(let i=0;i<2;i++){
      const statKey = pickStatForGain(picked);
      picked.push(statKey);
      const base = state.stats[statKey] || 0;
      const after = clamp(base * 1.02, 0, getEffectiveStatCapForPlayer(state));
      const amount = after - base;
      state.stats[statKey] = after;
      statGains.push({ stat: statKey, amount });
    }
    var gainsHtml = "";
    if (Array.isArray(statGains) && statGains.length>0) {
      gainsHtml = statGains.map(g => `Gained ${(g.amount||0).toFixed(2)} ${g.stat}`).join("<br>");
    }
	state.sp += spGain;
    addLog(`<span class="warn">${player.name} finished ${place}th place.<br>Lost 50 Fame<br>Earned ${spGain} SP<br>${gainsHtml}</span>`);
  } else {
    if(typeof place === 'number'){
      state.fame = (state.fame || 0) - 100;
	  spGain = (state.sp||0) + (baseSP * 0.1);
      state.losses = (state.losses||0) + 1;
	  state.sp += spGain;
      addLog(`<span class="warn">${player.name} finished ${place}th place. Better luck next time...<br>Lost 100 Fame<br>Earned ${spGain} SP</span>`);
    } else {
      addLog(`<span class="warn">Race ended but finish place not found for the player.</span>`);
    }
  }
  
  if(raceState.race && raceState.race.grade === "Finale" && state.finale && state.finale.chosenPath){
  const path = state.finale.chosenPath;
  const idx = state.finale.progressIndex || 0;
  const pathArr = RACES.Finale[path] || [];
  if(pathArr[idx] && pathArr[idx].name === raceState.race.name){
    state.finale.progressIndex = idx + 1;
    saveState();
    if(state.finale.progressIndex >= pathArr.length){
      addLog(`<b class="ok">You have completed the ${path}! ${player.name} has officially ended their career and will be moved to retirement!</b>`);
      retireNow();
    } else {
      const next = pathArr[state.finale.progressIndex];
      addLog(`<div class="ok">Next ${path} race unlocked! ${next.name}</div>`);
    }
  }
}

  // fame floor
  state.fame = Math.max(0, Math.round(state.fame || 0));

  if(raceState.race && raceState.race.grade === "Debut"){
    if(!state.completed) state.completed = {};
    if(raceState.race.id) state.completed[raceState.race.id] = true;
    state.completed["Debut Race"] = true;
    addLog(`<span class='ok'>${player.name}'s Debut Race has ended. Good luck on their career!</span>`);
  }

  // Save a snapshot to leaderboard safely (no syntax errors)
  if(!state.history) state.history = [];
  state.history.push({
    name: state.name || "Unnamed",
    raceId: raceState.race ? raceState.race.id : "unknown",
    place: place,
    fame: Math.round(state.fame || 0),
    wins: state.wins || 0,
    losses: state.losses || 0,
    stats: JSON.parse(JSON.stringify(state.stats || {})),
    timestamp: new Date().toISOString()
  });
  
  state.training.daysUntilRace += 30;
  state.training.daysUntilRace = 30;
  state.training.lockRaceCount -= 30;
  state.training.lockRaceCount = 0;
  state.training.lockRaceCount = null;
  state.training.totalTrains -= 30;
  state.training.totalTrains = 0;
  state.training.locked = false;
  addLog("<span class='ok'>Prepare for your next race!</span>");
  
  if(raceState && raceState.field){
    for(const r of raceState.field){
      if(r._mods){
        for(const k in r._mods){
          if(r._mods[k] && r._mods[k].intervalId) try{ clearInterval(r._mods[k].intervalId); }catch(e){}
        }
      }
    }
  }

  saveState();
  refreshPlayerUI();
  try{ clearWeatherEffects(); }catch(e){}
  try{ AudioManager.stopRaceAndResumeTitle(); }catch(e){ console.warn("AudioManager resume failed", e); }
  abBtn.dataset.disabled = false;
  // show Enter Race again
  if(el("enterRaceBtn")) el("enterRaceBtn").style.display = "";
}

function haveWonAllRaceNames(listOfRaceNames){
  state.raceWins = state.raceWins || {};
  for(const rn of listOfRaceNames){
    if(!(state.raceWins[rn] && state.raceWins[rn] > 0)) return false;
  }
  return true;
}

function canEnterRace(race){
  if(!race) return false;
  // Finale path enforcement
  if(state.finale && state.finale.chosenPath){
    const path = state.finale.chosenPath;
    const pathArr = RACES.Finale[path] || [];
    const idx = state.finale.progressIndex || 0;
    const allowed = pathArr[idx];
    if(!allowed) return false;
    return allowed.name === race.name;
  }

  if(race.grade === "G2"){
    const g3Names = (RACES.G3 || []).map(x => x.name);
    return haveWonAllRaceNames(g3Names);
  }
  if(race.grade === "G1"){
    const g2Names = (RACES.G2 || []).map(x => x.name);
    return haveWonAllRaceNames(g2Names);
  }
  if(race.grade === "G3") return true;
  if(race.grade === "Finale"){
    if((state.g1RacesRun||0) < 3) return false;
    if(!state.finale || !state.finale.chosenPath) return true;
  }
  return true;
}

/* -------------------------
  Abilities: Active usage
------------------------- */
function _getAbilityButtonForId(id){
  // Prefer explicit data attribute
  let sel = document.querySelector(`[data-ability-id="${id}"]`);
  if(sel) return sel;
  // common fallback id convention: ability-btn-<id>
  sel = document.getElementById(`ability-btn-${id}`);
  if(sel) return sel;
  // fallback: first .ability-btn that matches equipped active button (non-ideal)
  sel = document.querySelector(`.ability-btn`);
  return sel;
}

function setAbilityButtonDisabled(id, disabled){
  const btn = _getAbilityButtonForId(id);
  if(!btn) return;
  if(disabled){
    btn.classList.add('disabled');
    btn.setAttribute('aria-disabled','true');
    btn.dataset.disabled = '1';
    btn.style.pointerEvents = 'auto';
  } else {
    btn.classList.remove('disabled');
    btn.removeAttribute('aria-disabled');
    delete btn.dataset.disabled;
    btn.style.pointerEvents = '';
  }
}

function useActiveById(id){
  if(!raceState || !raceState.running){ addLog("Active ability can only be used during a race."); return; }

  const a = ABILITIES.actives.find(x=>x.id===id);
  const nowTs = Date.now()/1000;
  const curRaceName = raceState && raceState.race && raceState.race.name;
  const inMongolDerby = curRaceName === "Mongol Derby";

  // If button already visually marked disabled, show the correct message and return
  if(abBtn && abBtn.dataset && abBtn.dataset.disabled){
    // If Mongol Derby, show remaining cooldown if any; otherwise show exhausted
    if(inMongolDerby){
      const last = state.playerAbilityLastUsed || 0;
      const elapsed = nowTs - last;
      const remain = Math.max(0, Math.ceil(60 - elapsed));
      addLog(`<span class="warn">Ability on Cooldown: ${remain}s left.</span>`);
    } else {
      addLog(`<span class="warn">You're too exhausted to do that again.</span>`);
    }
    return;
  }

  // Immediately mark button visually disabled so other near-simultaneous inputs hit the early-return above.
  // (We will re-enable it later depending on race/type).
  setAbilityButtonDisabled(id, true);

  // Now run the usual cooldown/race checks (defensive)
  if(!inMongolDerby){
    if(state.playerAbilityLastUsedRace && state.playerAbilityLastUsedRace === curRaceName){
      addLog(`<span class="warn">You're too exhausted to do that again.</span>`);
      // button stays disabled for the race (that's desired behavior)
      return;
    }
  } else {
    if(state.playerAbilityLastUsed && (nowTs - state.playerAbilityLastUsed) < 60){
      const remain = Math.ceil(60 - (nowTs - state.playerAbilityLastUsed));
      addLog(`<span class="warn">Ability on Cooldown: ${remain}s left.</span>`);
      return;
    }
  }

  // Mark usage immediately (prevents races between near-simultaneous calls)
  state.playerAbilityLastUsed = nowTs;
  state.playerAbilityLastUsedRace = curRaceName;
  try{ saveState(); }catch(e){}

  if(!a){ addLog("No such active."); return; }
  if(state.sp < 2){ addLog(`<span class="warn">Not enough SP</span>`); return; }

  // consume cost
  state.sp -= 2;

  const player = (raceState.field||[]).find(f=>f.isPlayer);
  if(!player){ addLog("No player found."); return; }
  player._mods = player._mods || {};

  // Unique mod slot per active id (guarantees idempotence)
  const modKey = "__active_" + id;

  // revert helper
  function revertModForPlayer(p, key){
    if(!p || !p._mods || !p._mods[key]) return;
    const mod = p._mods[key];
    try{ if(mod.timeoutId) clearTimeout(mod.timeoutId); }catch(e){}
    try{ if(mod.intervalId) clearInterval(mod.intervalId); }catch(e){}
    try{
      if(typeof mod.ms === 'number' && typeof p.maxSpeed === 'number'){ p.maxSpeed = Math.max(0, (p.maxSpeed||0) - mod.ms); }
      if(typeof mod.ac === 'number' && typeof p.acc === 'number'){ p.acc = Math.max(0, (p.acc||0) - mod.ac); }
    }catch(e){ console.warn("revertMod error", e); }
    try{ delete p._mods[key]; }catch(e){}
  }

  if(player._mods[modKey]){
    if(!inMongolDerby){
      addLog(`<span class="warn">You're too exhausted to do that again.</span>`);
      return;
    } else {
      revertModForPlayer(player, modKey);
    }
  }

  if(!player) return;
  
  if(a.fn === "plusUltra"){
    const ms = player.maxSpeed * 0.10; const ac = player.acc * 0.10;
    player._mods.PlusUltra = {ms,ac,expires: raceState.time + 9};
	try{ _applyWitsScalingToMod(r._mods.PlusUltra); }catch(e){}
    player.maxSpeed += ms; player.acc += ac;
	const delayMs = Math.max(0, Math.round((player._mods.PlusUltra.expires - raceState.time) * 1000));
    setTimeout(()=>{ if(player._mods && player._mods.PlusUltra){ player.maxSpeed -= player._mods.PlusUltra.ms; player.acc -= player._mods.PlusUltra.ac; delete player._mods.PlusUltra; } }, 9000);
    addLog(`<span id="ok">Plus Ultra! Activated.</span>`);
  } else if(a.fn === "regen70"){
    const __st = (r.staminaMax * 0.7) * _witsEffectMult();
	r.stamina = clamp(r.stamina + __st, 0, r.staminaMax);
    addLog(`<span id="ok">No... Not Yet! Activated.</span>`);
  } else if(a.fn === "comeback"){
    const rank = getCurrentRank(raceState, player);
    const back = Math.max(0, rank - 1);
    const mult = 0.05 * (1 + back);
    const ms = player.maxSpeed * mult; const ac = player.acc * mult;
    player._mods.Comeback = {ms,ac,expires: raceState.time + 4};
	try{ _applyWitsScalingToMod(r._mods.Comeback); }catch(e){}
    player.maxSpeed += ms; player.acc += ac;
	const delayMs = Math.max(0, Math.round((player._mods.Comeback.expires - raceState.time) * 1000));
    setTimeout(()=>{ if(player._mods && player._mods.Comeback){ player.maxSpeed -= player._mods.Comeback.ms; player.acc -= player._mods.Comeback.ac; delete player._mods.Comeback; } }, 4000);
    addLog(`<span id="ok">I Am Not Giving Up Now! Activated.</span>`);
  } else if(a.fn === "planB"){
    const rank = getCurrentRank(raceState, player);
    if(rank >= 4){
      const __st = (r.staminaMax * 0.5) * _witsEffectMult();
	  r.stamina = clamp(r.stamina + __st, 0, r.staminaMax);
      const ac = player.acc * 0.05;
      player._mods.PlanB = {ac,expires: raceState.time + 9};
	  try{ _applyWitsScalingToMod(r._mods.PlanB); }catch(e){}
      player.acc += ac;
	  const delayMs = Math.max(0, Math.round((player._mods.PlanB.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.PlanB){ player.acc -= player._mods.PlanB.ac; delete player._mods.PlanB; } }, 9000);
      addLog(`<span id="ok">Plan B Activated.</span>`);
    } else addLog("Plan B Activated.");
  } else if(a.fn === "triumph"){
    const ms = player.maxSpeed * 0.1;
	const ac = player.acc * 0.05;
    player._mods.Triumph = {ms,expires: raceState.time + 9};
	try{ _applyWitsScalingToMod(r._mods.Triumph); }catch(e){}
    player.maxSpeed += ms;
	player.acc += ac;
	const delayMs = Math.max(0, Math.round((player._mods.Triumph.expires - raceState.time) * 1000));
    setTimeout(()=>{ if(player._mods && player._mods.Triumph){ player.maxSpeed -= player._mods.Triumph.ms; delete player._mods.Triumph; } }, 9000);
    addLog(`<span id="ok">Triumphant Pulse Activated!.</span>`);
  } else if(a.fn === "redshift"){
      const ms = player.maxSpeed * 0.20;
      player._mods.redshift = { ms, expires: raceState.time + 5 };
	  try{ _applyWitsScalingToMod(r._mods.redshift); }catch(e){}
      player.maxSpeed += ms;
      addLog(`<div class="ok">Red Shift Activated!</div>`);
	  const delayMs = Math.max(0, Math.round((player._mods.redshift.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.redshift){ player.maxSpeed -= player._mods.redshift.ms; delete player._mods.redshift; } }, 5000);
  } else if(a.fn === "swing"){
      if(!player.reachedMiddle) return;
      const ms = player.maxSpeed * 0.12;
      const ac = player.acc * 0.12;
	  const __st = (r.staminaMax * 0.5) * _witsEffectMult();
	  r.stamina = clamp(r.stamina + __st, 0, r.staminaMax);
      player._mods.swing = { ms, ac, expires: raceState.time + 9 };
	  try{ _applyWitsScalingToMod(r._mods.swing); }catch(e){}
      player.maxSpeed += ms; player.acc += ac;
      addLog(`<div class="ok">Swinging Maestro Activated!</div>`);
	  const delayMs = Math.max(0, Math.round((player._mods.swing.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.swing){ player.maxSpeed -= player._mods.swing.ms; player.acc -= player._mods.swing.ac; delete player._mods.swing; } }, 9000);
  } else if(a.fn === "furtherBeyond"){
    const rank = getCurrentRank(raceState, player);
    if(rank === 1){
      const __st = (r.staminaMax * 0.1) * _witsEffectMult();
	  r.stamina = clamp(r.stamina + __st, 0, r.staminaMax);
      const ms = player.maxSpeed * 0.05; const ac = player.acc * 0.05;
      player._mods.Further = {ms,ac,expires: raceState.time + 4};
	  try{ _applyWitsScalingToMod(r._mods.Further); }catch(e){}
      player.maxSpeed += ms; player.acc += ac;
	  const delayMs = Math.max(0, Math.round((player._mods.Further.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.Further){ player.maxSpeed -= player._mods.Further.ms; player.acc -= player._mods.Further.ac; delete player._mods.Further; } }, 4000);
      addLog(`<span id="ok">Must Go Even Further Beyond! Activated.</span>`);
    } else addLog(`<span id="ok">Must Go Even Further Beyond! But nothing happened...</span>`);
  } else if(a.fn === "gotcha"){
    const rank = getCurrentRank(raceState, player);
    if(rank === 2 || rank === 3){
      const ms = player.maxSpeed * 0.10; const ac = player.acc * 0.10;
      player._mods.Gotcha = {ms,ac,expires: raceState.time + 9};
	  try{ _applyWitsScalingToMod(r._mods.Gotcha); }catch(e){}
      player.maxSpeed += ms; player.acc += ac;
	  const delayMs = Math.max(0, Math.round((player._mods.Gotcha.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.Gotcha){ player.maxSpeed -= player._mods.Gotcha.ms; player.acc -= player._mods.Gotcha.ac; delete player._mods.Gotcha; } }, 9000);
      addLog(`<span id="ok">Gotcha! Activated.</span>`);
    } else addLog(`<span id="ok">Gotcha! But nothing happened...</span>`);
  }
  
  try{ saveState(); }catch(e){}
  try{ refreshPlayerUI(); }catch(e){}
  
  raceState.playerAbilityInProgress = false;
  return true;
  
  if(inMongolDerby){
    setTimeout(()=>{
      setAbilityButtonDisabled(id, false);
    }, 60000);
  }
}

/* -------------------------
  Retire & Reset
------------------------- */
function retireNow(){
  const player = raceState.field.find(f=>f.isPlayer);
  if(!confirm("Are you sure you wish to retire your umamusume?")) return;
  addLeaderboardRecord({
    name: state.name,
    title: state.highestTitle || computeTitle(state.fame),
    stats: {...state.stats},
    fame: state.fame,
    wins: state.wins || 0,
    losses: state.losses || 0,
    timestamp: new Date().toISOString()
  });
  const backup = state.name;
  state = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
  state.name = backup + " (New)";
  saveState(); refreshPlayerUI(); renderLeaderboard();
  addLog(`${player.name} has been retired, their records will be kept in history.`);
}

function resetAllProgress(){
  try{ clearAllAbilityEffects(); }catch(e){}
  try{ clearWeatherEffects(); }catch(e){}
  if(!confirm("Reset ALL progress and leaderboard? This cannot be undone.")) return;
  localStorage.removeItem("uma_state_v1"); localStorage.removeItem("uma_leaderboard_v1");
  state = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
  saveState(); renderLeaderboard(); refreshPlayerUI();
  addLog("All progress and leaderboard cleared.");
  window.location.reload();
}

/* -------------------------
  Logging helpers
------------------------- */
function addLog(txt){ const c = el("commentary"); const d=document.createElement("div"); d.className="log-entry"; d.innerHTML = `<small class="small muted">${nowStr()}</small><div>${txt}</div>`; c.prepend(d); }
function addCommentary(txt){ const c = el("commentary"); const d=document.createElement("div"); d.className="log-entry"; d.innerHTML = `<div>${txt}</div>`; c.prepend(d); }

/* -------------------------
  UI bindings & init
------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{

  // wire UI
  el("playerName").addEventListener("input", e=>{ state.name = e.target.value; saveState(); refreshPlayerUI(); });

  const _trainBtn = el("trainBtn"); if(_trainBtn) _trainBtn.addEventListener("click", ()=> window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}));
  el("manualSaveBtn").addEventListener("click", ()=>{ saveState(); alert("Saved!"); });
  el("manualSaveBtn").style.padding ="6px 8px";
  el("manualSaveBtn").style.borderRadius="6px";
  el("manualSaveBtn").style.background="linear-gradient(180deg,#40ff00 20%,#29a600 80%,#40ff00 100%)";
  el("manualSaveBtn").style.cursor="pointer";
  el("manualSaveBtn").style.border="1.6px solid white";
  el("manualSaveBtn").style.fontWeight="bold";
  el("restBtn").addEventListener("click", ()=>{
	if(state.training.totalTrains >= 25){
      state.training.locked = true;
      state.training.lockRaceCount = state.racesDone;
      alert(`It's Race Day. No time to rest!`);
      addLog("<span class='warn'>It's Race Day. No time to rest!</span>");
	} else {
      const values = [36, 37, 38, 39, 40, 41, 42];
      const randomIndex = Math.floor(Math.random() * values.length);
      const randomValue = values[randomIndex];
      if(state.energy >= 100){
		for(const k in state.stats) state.stats[k] = clamp(state.stats[k] * 0.95, 0, 1200);
		addLog(`${state.name} has become too lazy! Lost 5% on all stats.`);
      } else {
		state.energy = clamp(state.energy + randomValue, 0, 100);
		addLog(`${state.name} has rested well! Recovered ${randomValue}% Energy.`);
      }
	  state.training.totalTrains = (state.training.totalTrains||0) + 1;
      saveState(); refreshPlayerUI();
	}
  });
  el("restBtn").style.padding ="6px 8px";
  el("restBtn").style.borderRadius="6px";
  el("restBtn").style.background="linear-gradient(180deg,#40ff00 20%,#29a600 80%,#40ff00 100%)";
  el("restBtn").style.cursor="pointer";
  el("restBtn").style.border="1.6px solid white";
  el("restBtn").style.fontWeight="bold";

  // training chips & button
  document.querySelectorAll("#trainingPanel .chip").forEach(ch=>ch.addEventListener("click", ()=>{
    document.querySelectorAll("#trainingPanel .chip").forEach(c=>c.classList.remove("active"));
    ch.classList.add("active");
  }));
  el("doTrainBtn").addEventListener("click", ()=>{ const a=document.querySelector("#trainingPanel .chip.active"); if(!a){ alert("Pick a stat to train"); return; } doTraining(a.dataset.stat); });

  // races
  populateRaces();
  el("enterRaceBtn").addEventListener("click", ()=>{ const r = el("raceSelect").value; if(!r) return; prepareRace(r); });
  el("startRaceBtn").addEventListener("click", ()=> startRace());
  el("stopRaceBtn").addEventListener("click", ()=> stopRace());
  
  function stopRace() {
	if(!raceState || !raceState.running) return;
	try{ clearAllAbilityEffects(); }catch(e){}
	try{ clearWeatherEffects(); }catch(e){}
	try{ AudioManager.stopRaceAndResumeTitle(); }catch(e){ console.warn("AudioManager resume failed", e); }
	
	if(raceTickHandle) {
	  clearInterval(raceTickHandle);
	  raceTickHandle=null;
	}
  
	if(commentaryHandle) {
	  clearInterval(commentaryHandle);
	  commentaryHandle=null;
	}
  
	if(raceState) raceState.running=false;
	addLog(`<span class='warn'>Race forced to stop. All participating umamusume will not be rewarded nor penalized.`);
  
	el("enterRaceBtn").style.display = ""; 
  
	clearInterval(raceState.interval);
	raceState.interval = null;
	raceState.finished = false;
	raceState.tick = 0;
  
	for (const r of raceState.field){
	  r.progress = 0;
	  r.finished = false;
	  r.stamina = r.staminaMax;
	}
  
	state.losses = (state.losses||0) + 1;
	saveState();
	refreshPlayerUI();
  }

  // retire & reset all
  el("retireBtn").addEventListener("click", ()=> retireNow());
  el("resetAllBtn").addEventListener("click", ()=> resetAllProgress());

  // active hotkey
  document.addEventListener("keydown", (e)=>{ if(e.key.toLowerCase()==="e"){ if(state.abilities.equippedActive) useActiveById(state.abilities.equippedActive); } });

  // initial render
  renderAbilitiesShop();
  renderEquipped();
  renderLeaderboard();
  refreshPlayerUI();

  // autosave
  setInterval(()=>{ saveState(); }, 10000);
});

/* -------------------------
  load & default final
------------------------- */
function loadDefaults(){
  if(!state) state = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
}

const AudioManager = (function(){
  const playlist = ['gacha.mp3','main.mp3','tracen.mp3','tracen2.mp3','support.mp3','campaign1.mp3','campaign2.mp3','summer.mp3','trainer.mp3'];
  const raceMap = {
    'Debut': 'debut.mp3',
    'G3': 'g3.mp3',
    'G2': 'g2.mp3',
    'G1': 'g1.mp3',
	'Finale': 'finals.mp3',
  };
  const TARGET_VOLUME = 0.7;
  let currentAudio = null;
  let isPlaylist = false;
  let playlistIndex = 0;
  let playlistRunning = false;

  function safePauseAndClear(){
    try{
      if(currentAudio){
        currentAudio.pause();
        currentAudio.src = "";
      }
    }catch(e){}
    currentAudio = null;
    isPlaylist = false;
  }

  function fadeIn(audio, duration = 2000, target = TARGET_VOLUME){
    try{
      audio.volume = 0;
      const stepMs = 100;
      const steps = Math.max(1, Math.floor(duration / stepMs));
      let i = 0;
      const iv = setInterval(()=>{
        i++;
        audio.volume = Math.min(target, (i/steps) * target);
        if(i >= steps) { clearInterval(iv); audio.volume = target; }
      }, stepMs);
    }catch(e){}
  }

  function playFile(src, opts = { loop:false, volume: TARGET_VOLUME }){
    safePauseAndClear();
    const a = new Audio(src);
    a.preload = 'auto';
    a.loop = !!opts.loop;
    a.volume = (typeof opts.volume === 'number') ? opts.volume : TARGET_VOLUME;
    a.play().catch(()=>{ /* play may be blocked until user interacts; it's okay */ });
    currentAudio = a;
    return a;
  }

  // recursive/iterative playlist playback
  function playPlaylistAt(index, initialFade = true){
    playlistRunning = true;
    playlistIndex = index % playlist.length;
    const src = playlist[playlistIndex];
    const a = playFile(src, { loop: false, volume: 0 });
    isPlaylist = true;
    // fade in only on first song when requested
    if(initialFade) fadeIn(a, 2000, TARGET_VOLUME);
    else a.volume = TARGET_VOLUME;

    // when ended, advance and play next (wrap)
    a.onended = function(){
      if(!playlistRunning) return;
      playlistIndex = (playlistIndex + 1) % playlist.length;
      playPlaylistAt(playlistIndex, false);
    };
  }

  function startTitlePlaylist(){
    // start playlist at random start index, fade-in the first track
    if(playlistRunning) return;
    const randIdx = Math.floor(Math.random() * playlist.length);
    playPlaylistAt(randIdx, true);
  }

  function stopPlaylist(){
    playlistRunning = false;
    safePauseAndClear();
  }

  function playRaceMusicFor(raceObj){
	// stop any playlist or previous audio
	stopPlaylist();
	playlistRunning = false;
	isPlaylist = false;

	const grade = (raceObj && (raceObj.grade || raceObj.id)) || '';
	let key = ('' + grade).toString();

	if(!raceMap[key]){
      const g = (raceObj && raceObj.id) ? (''+raceObj.id).toLowerCase() : '';
      if(g.includes('debut')) key = 'Debut';
      else if(g.includes('g1')) key = 'G1';
      else if(g.includes('g2')) key = 'G2';
      else if(g.includes('g3')) key = 'G3';
	}

	const track = raceMap[key] || raceMap['G3'];
	const a = playFile(track, { loop: true, volume: TARGET_VOLUME }); // ✅ force loop
	currentAudio = a;
  }

  function stopRaceAndResumeTitle(){
    // stop current race audio (if any) and start/resume playlist
    safePauseAndClear();
    // start playlist fresh (the specification wants cycle after first chosen song; we'll restart playlist cycle)
    startTitlePlaylist();
  }

  function stopAll(){
    playlistRunning = false;
    safePauseAndClear();
  }

  return {
    startTitlePlaylist,
    stopPlaylist,
    playRaceMusicFor,
    stopRaceAndResumeTitle,
    stopAll
  };
})();

(function(){
  if (window.__uma_title_inited) return;
  window.__uma_title_inited = true;

  function qs(id){ return document.getElementById(id); }
  function onReady(fn){ if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn);else fn(); }

  onReady(function(){
    const ts = qs('titleScreen');
    if(!ts) return;
    const black = qs('ts_black');
    const blocker = qs('ts_blocker');
    const video = qs('ts_video');
    const playWrap = qs('ts_playWrap');
    const playBtn = qs('ts_playbtn');
    const playWhite = qs('ts_playWhite');
    const clickText = qs('ts_clickText');

    ts.style.display = 'block';
    playWrap.setAttribute('aria-hidden','true');
    ts.dataset.phase = 'intro';

    function startVideoPhase(){
	  if (ts.dataset.phase !== 'intro') return;
	  ts.dataset.phase = 'video';
	  black.classList.add('fade-out');
	  black.innerHTML = `Please wait 10-20 seconds trust`;
	  video.classList.add('visible');
	  
	  let chosen = 'umapyoi.mp4';
	  let fadeMs = 140000;
	  let playBtnMs = 1240;

	  try {
		  const r = Math.random();

		  if (r > 0.80) {
		    chosen = 'legend.mp4';
		    fadeMs = 102500;
		    playBtnMs = 19000;
		  } else if (r > 0.60) {
			chosen = 'meni.mp4';
		    fadeMs = 144000;
		    playBtnMs = 1390;
		  } else if (r > 0.40) {
			chosen = 'makedebut.mp4';
		    fadeMs = 142500;
		    playBtnMs = 1200;
		  } else if (r > 0.21) {
			chosen = 'tracenondo.mp4';
		    fadeMs = 145000;
		    playBtnMs = 2450;
		  } else if (r > 0.20) {
			chosen = 'gorushiondo.mp4';
		    fadeMs = 145000;
		    playBtnMs = 145000;
		  } else {
			chosen = 'umapyoi.mp4';
		    fadeMs = 140000;
		    playBtnMs = 1240;
		  }

		  const srcEl = video.querySelector('source');
		  if (srcEl) {
		  srcEl.src = chosen;
		  video.load();
		  } else {
		  video.src = chosen;
		  }

		  video.muted = false;
		  video.play().catch(()=>{});
	  } catch(e) {
		  console.warn('video play failed', e);
	  }

	  clickText.style.transition = 'opacity .4s ease';
	  clickText.style.opacity = '0';

	  window.__uma_ts_play_timeout = setTimeout(showPlayButton, playBtnMs);
	  window.__uma_ts_fade_timeout = setTimeout(triggerFadeToGame, fadeMs);
	}

    function showPlayButton(){
      playWrap.setAttribute('aria-hidden','false');
      playBtn.style.pointerEvents='auto';
	  video.style.pointerEvents='none';
      playBtn.classList.add('ts-visible');
      playWhite.classList.remove('ts-white-fade');
      playWhite.style.opacity='1';
      requestAnimationFrame(()=>{
        setTimeout(()=>playWhite.classList.add('ts-white-fade'),40);
        playBtn.classList.add('ts-hover');
      });
    }

    function triggerFadeToGame(){
	  if(ts.dataset.phase==='ended')return;
	  ts.dataset.phase='ended';
	  clearTimeout(window.__uma_ts_play_timeout);
	  ts.classList.add('fade-to-black');
	  blocker.classList.add('fade-out');
	  try{video.pause();}catch(e){}
	  // start title playlist BGM (random start, fade-in)
	  try{ AudioManager.startTitlePlaylist(); }catch(e){ console.warn("AudioManager start failed", e); }
	  setTimeout(()=>{
		ts.style.display='none';
		try{video.removeAttribute('src');video.load();}catch(e){}
	  },900);
	}

    ts.addEventListener('click',ev=>{
      if(ev.target===playBtn||ev.target.closest('#ts_playWrap'))return;
      if(ts.dataset.phase==='intro')startVideoPhase();
    });
    playBtn.addEventListener('click',ev=>{
      ev.stopPropagation();
      triggerFadeToGame();
    });
    document.addEventListener('keydown',ev=>{
      if(ev.key==='Enter'||ev.key===' '){
        if(ts.dataset.phase==='intro'){startVideoPhase();ev.preventDefault();}
      }
    });
  });
})();

try{
  window.__pressSound = new Audio('press.wav');
  window.__pressSound.volume = 0.6;
  document.addEventListener('click', (e)=>{
    try{
      // play press sound for any click
      window.__pressSound.currentTime = 0;
      window.__pressSound.play().catch(()=>{});
    }catch(err){}
  }, {capture: true});
}catch(err){ console.warn('press sound init failed', err); }

window.addEventListener('DOMContentLoaded', () => {
  (function(){
  const basePath = (() => {
    const p = location.pathname;
    return p.includes('/') ? p.replace(/\/[^/]*$/, '/') : './';
  })();
  const CURSOR_IMG = basePath + 'cursor.png';

  const STYLE_ID = 'uma-force-hide-native-cursor-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.type = 'text/css';
    s.innerHTML = `
html, body, * , *::before, *::after {
  cursor: none !important;
}

.uma-cursor {
  position: fixed;
  left: 0;
  top: 0;
  width: 3em;
  height: 2em;
  background: no-repeat center/contain;
  background-image: url("${CURSOR_IMG}");
  pointer-events: none;
  transform: translate(-50%, -50%) scale(1);
  transition: transform 0.08s linear, opacity 0.08s linear;
  z-index: 2147483647;
  will-change: transform, left, top;
  opacity: 1;
}

/* modifier classes when hovering special cursor types (pointer, text, grab, etc.) */
.uma-cursor--pointer { transform: translate(-50%, -50%) scale(1); }
.uma-cursor--text    { transform: translate(-50%, -50%) scale(1); }
.uma-cursor--grab    { transform: translate(-50%, -50%) scale(1); }
    `;
    document.head.appendChild(s);
  }

  // create visible custom cursor element
  let cursorEl = document.querySelector('.uma-cursor');
  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.className = 'uma-cursor';
    document.body.appendChild(cursorEl);
  }

  // For pointer motion we use pointer events + RAF for smoothness & perf
  let targetX = -9999, targetY = -9999;
  let rafId = null;
  function rafLoop() {
    // direct set left/top (transform already handles centering)
    cursorEl.style.left = targetX + 'px';
    cursorEl.style.top  = targetY + 'px';
    rafId = null;
  }

  function scheduleUpdate() {
    if (rafId === null) rafId = requestAnimationFrame(rafLoop);
  }

  // Determine the computed cursor value for the element under the pointer
  function getCursorTypeAt(x, y) {
    // elementFromPoint is unaffected by cursor:none and should return element
    const el = document.elementFromPoint(x, y);
    if (!el) return 'auto';
    try {
      const cs = window.getComputedStyle(el);
      return cs && cs.cursor ? cs.cursor : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  // Map computed cursor string to our modifier classes (basic mapping)
  function applyCursorClassForComputed(cursorStr) {
    // Normalize and detect common tokens
    if (!cursorStr) cursorStr = 'auto';
    cursorStr = String(cursorStr).toLowerCase();

    // Remove any url(...) parts to focus on keyword tokens
    cursorStr = cursorStr.replace(/url\([^\)]+\)/g, '').trim();

    // remove commas and split tokens (some browsers return "pointer, auto")
    const tokens = cursorStr.split(',').map(t => t.trim());

    // helper check
    function hasToken(tokList) {
      return tokens.some(t => tokList.some(k => t.includes(k)));
    }

    // Clear all modifier classes first
    cursorEl.classList.remove('uma-cursor--pointer', 'uma-cursor--text', 'uma-cursor--grab');

    if (hasToken(['pointer'])) {
      cursorEl.classList.add('uma-cursor--pointer');
    } else if (hasToken(['text', 'ibeam'])) {
      cursorEl.classList.add('uma-cursor--text');
    } else if (hasToken(['grab', 'grabbing'])) {
      cursorEl.classList.add('uma-cursor--grab');
    } else {
      // default: no modifier class
    }
  }

  // pointermove handler
  function onPointerMove(e) {
    // prefer clientX/Y (works for pen/mouse/touch-like pointer events)
    const x = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
    const y = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
    targetX = x+6.5;
    targetY = y + 11.5;
    scheduleUpdate();

    // detect computed cursor of element under pointer and apply class
    const computedCursor = getCursorTypeAt(x, y);
    applyCursorClassForComputed(computedCursor);
  }

  // Mouse (pointer events preferred if available)
  if (window.PointerEvent) {
    document.addEventListener('pointermove', onPointerMove, { passive: true });
  } else {
    document.addEventListener('mousemove', onPointerMove, { passive: true });
    document.addEventListener('touchmove', onPointerMove, { passive: true });
  }

  function detectTouchOnlyAndHideCursor() {
    const mq = window.matchMedia('(pointer: coarse) and (hover: none)');
    if (mq.matches) {
      cursorEl.style.display = 'none';
    } else {
      cursorEl.style.display = '';
    }
  }
  detectTouchOnlyAndHideCursor();
  window.addEventListener('resize', detectTouchOnlyAndHideCursor);
})();
});

const CLICK_LIFETIME_MS = 330;
  function spawnClickEffect(x, y) {
    const d = document.createElement('div');
    d.className = 'uma-click-effect';
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    document.body.appendChild(d);
    setTimeout(() => {
      if (d.parentNode) d.parentNode.removeChild(d);
    }, CLICK_LIFETIME_MS);
  }

  document.addEventListener('mousedown', function(ev) {
    if (ev.button !== 0) return;
    spawnClickEffect(ev.clientX-3, ev.clientY-12.5);
  }, { passive: true });

  document.addEventListener('touchstart', function(ev) {
    const t = ev.touches && ev.touches[0];
    if (!t) return;
    spawnClickEffect(t.clientX, t.clientY);
  }, { passive: true });