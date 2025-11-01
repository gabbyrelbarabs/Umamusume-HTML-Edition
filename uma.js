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

/* -------------------------
  Races & Opponents (full data)
------------------------- */
const RACES = [
  // Debut
  { id: "Debut Race", grade: "Debut", track: "Dirt", distance: 1000, rewardFame: 500, oneTime: true },

  // G3
  { id: "Silk Road Stakes", grade: "G3", track: "Turf", distance: 1200, rewardFame: 650 },
  { id: "Sekiya Kinen", grade: "G3", track: "Turf", distance: 1600, rewardFame: 750 },
  { id: "Unicorn Stakes", grade: "G3", track: "Dirt", distance: 1600, rewardFame: 700 },
  { id: "Procyon Stakes", grade: "G3", track: "Dirt", distance: 1400, rewardFame: 600 },
  { id: "Keisei Hai Autumn Handicap", grade: "G3", track: "Turf", distance: 1600, rewardFame: 750 },
  { id: "Diamond Stakes", grade: "G3", track: "Turf", distance: 3400, rewardFame: 2000 },
  { id: "Sirius Stakes", grade: "G3", track: "Dirt", distance: 2000, rewardFame: 1000 },
  { id: "Miyako Stakes", grade: "G3", track: "Dirt", distance: 1800, rewardFame: 800 },
  { id: "Hankyu Hai", grade: "G3", track: "Turf", distance: 1400, rewardFame: 750 },
  { id: "Heian Stakes", grade: "G3", track: "Dirt", distance: 1900, rewardFame: 900 },

  // G2
  { id: "Keio Hai Junior Stakes", grade: "G2", track: "Turf", distance: 1400, rewardFame: 4000 },
  { id: "Keio Hai Cup", grade: "G2", track: "Turf", distance: 1600, rewardFame: 6000 },
  { id: "Tokai Stakes", grade: "G2", track: "Dirt", distance: 1800, rewardFame: 5000 },
  { id: "Mile Championship Nambu Hai", grade: "G2", track: "Dirt", distance: 1600, rewardFame: 4000 },
  { id: "Kyoto Daishoten", grade: "G2", track: "Turf", distance: 2400, rewardFame: 8500 },
  { id: "Centaur Stakes", grade: "G2", track: "Turf", distance: 1200, rewardFame: 4000 },
  { id: "Kinko Sho", grade: "G2", track: "Turf", distance: 2000, rewardFame: 7500 },

  // G1
  { id: "Champions Cup", grade: "G1", track: "Dirt", distance: 1800, rewardFame: 10000, mustBeFirstG1: true },
  { id: "Arima Kinen", grade: "G1", track: "Turf", distance: 2500, rewardFame: 15000 },
  { id: "Tenno Sho", grade: "G1", track: "Turf", distance: 2400, rewardFame: 15000 },
  { id: "Sprinters Stakes", grade: "G1", track: "Turf", distance: 1200, rewardFame: 10000 },
  { id: "Tokyo Daishoten", grade: "G1", track: "Dirt", distance: 2000, rewardFame: 12000 },

  // Finale
  // URA Finale Path
  { id: "URA Finale - Qualifiers", grade: "Finale", track: "Turf", distance: 1400, rewardFame: 20000, finalePath: "URA Finale", sequence: 1 },
  { id: "URA Finale - Semi-Finals", grade: "Finale", track: "Dirt", distance: 2000, rewardFame: 25000, finalePath: "URA Finale", sequence: 2 },
  { id: "URA Finale - Finals", grade: "Finale", track: "Turf", distance: 2500, rewardFame: 30000, finalePath: "URA Finale", sequence: 3 },

  // Triple Crown Finale Path
  { id: "Satsuki Sho", grade: "Finale", track: "Turf", distance: 2000, rewardFame: 25000, finalePath: "Triple Crown Finale", sequence: 1 },
  { id: "Tokyo Yushun", grade: "Finale", track: "Turf", distance: 2400, rewardFame: 25000, finalePath: "Triple Crown Finale", sequence: 2 },
  { id: "Kikuka Sho", grade: "Finale", track: "Turf", distance: 3000, rewardFame: 25000, finalePath: "Triple Crown Finale", sequence: 3 },

  // Mongol Derby Finale Path
  { id: "Mongol Derby", grade: "Finale", track: "Dirt", distance: 1000000, rewardFame: 250000, finalePath: "Mongol Derby", sequence: 1 }
];

const OPPONENTS = {
  "Gold Ship": {
	Debut:{minSpeed:12.02,maxSpeed:14.31,acc:6,stamina:150,regen:1},
	G3:{minSpeed:12.28,maxSpeed:15.42,acc:8,stamina:170,regen:1.2},
	G2:{minSpeed:12.54,maxSpeed:16.99,acc:10,stamina:250,regen:1.9},
	G1:{minSpeed:12.8,maxSpeed:18.55,acc:9,stamina:400,regen:1.6},
	Finale:{minSpeed:13.06,maxSpeed:19.55,acc:10,stamina:420,regen:1.7},
  },
  "Mejiro McQueen": {
	Debut:{minSpeed:12.29,maxSpeed:13.92,acc:6,stamina:160,regen:1.4},
	G3:{minSpeed:12.55,maxSpeed:15.2,acc:7,stamina:250,regen:1.4},
	G2:{minSpeed:12.82,maxSpeed:16.09,acc:8,stamina:320,regen:1.5},
	G1:{minSpeed:13.08,maxSpeed:17.88,acc:9,stamina:500,regen:1.7},
	Finale:{minSpeed:13.35,maxSpeed:18.88,acc:10,stamina:510,regen:1.8},
  },
  "Tokai Teio": {
	Debut:{minSpeed:12.18,maxSpeed:14.31,acc:7,stamina:145,regen:1.4},
	G3:{minSpeed:12.44,maxSpeed:15.42,acc:8,stamina:200,regen:1.6},
	G2:{minSpeed:12.7,maxSpeed:16.76,acc:9,stamina:260,regen:1.8},
	G1:{minSpeed:12.96,maxSpeed:18.78,acc:9.2,stamina:420,regen:1.8},
	Finale:{minSpeed:13.23,maxSpeed:19.78,acc:10,stamina:430,regen:1.9},
  },
  "Kitasan Black": {
	Debut:{minSpeed:12.12,maxSpeed:14.31,acc:7.2,stamina:150,regen:1.3},
	G3:{minSpeed:12.38,maxSpeed:15.42,acc:8.3,stamina:220,regen:1.4},
	G2:{minSpeed:12.64,maxSpeed:16.54,acc:9.1,stamina:290,regen:1.6},
	G1:{minSpeed:12.9,maxSpeed:18.55,acc:9.5,stamina:440,regen:1.6},
	Finale:{minSpeed:13.16,maxSpeed:19.55,acc:10.2,stamina:450,regen:1.7},
  },
  "Satono Diamond": {
	Debut:{minSpeed:12.09,maxSpeed:13.96,acc:6,stamina:155,regen:1.4},
	G3:{minSpeed:12.35,maxSpeed:15.33,acc:7,stamina:230,regen:1.4},
	G2:{minSpeed:12.61,maxSpeed:16.54,acc:7.5,stamina:315,regen:1.4},
	G1:{minSpeed:12.87,maxSpeed:18.55,acc:8.5,stamina:450,regen:1.4},
	Finale:{minSpeed:13.13,maxSpeed:19.55,acc:9.5,stamina:465,regen:1.5},
  },
  "Grass Wonder": {
	Debut:{minSpeed:11.99,maxSpeed:14.31,acc:6.5,stamina:145,regen:1},
	G3:{minSpeed:12.25,maxSpeed:15.65,acc:7.5,stamina:220,regen:1.1},
	G2:{minSpeed:12.51,maxSpeed:16.32,acc:8.5,stamina:300,regen:1.4},
	G1:{minSpeed:12.77,maxSpeed:18.33,acc:9.0,stamina:430,regen:1.5},
	Finale:{minSpeed:13.03,maxSpeed:19.33,acc:10,stamina:440,regen:1.6},
  },
  "Haru Urara": {
	Debut:{minSpeed:12.12,maxSpeed:13.41,acc:6,stamina:140,regen:0.9},
	G3:{minSpeed:12.38,maxSpeed:14.08,acc:6,stamina:170,regen:0.9},
	G2:{minSpeed:12.64,maxSpeed:14.98,acc:6,stamina:200,regen:1.2},
	G1:{minSpeed:12.9,maxSpeed:16.09,acc:6,stamina:300,regen:1.4},
	Finale:{minSpeed:13.16,maxSpeed:17.1,acc:7,stamina:360,regen:1.5},
  },
  "Oguri Cap": {
	Debut:{minSpeed:12.1,maxSpeed:14.31,acc:7.5,stamina:155,regen:1},
	G3:{minSpeed:12.36,maxSpeed:15.56,acc:9,stamina:230,regen:1.33},
	G2:{minSpeed:12.62,maxSpeed:16.81,acc:9,stamina:290,regen:1.42},
	G1:{minSpeed:12.88,maxSpeed:18.64,acc:10,stamina:420,regen:1.65},
	Finale:{minSpeed:13.14,maxSpeed:19.64,acc:10.5,stamina:440,regen:1.75},
  },
  "Tamamo Cross": {
	Debut:{minSpeed:12.09,maxSpeed:14.75,acc:7,stamina:145,regen:1},
	G3:{minSpeed:12.35,maxSpeed:15.83,acc:8,stamina:230,regen:1.3},
	G2:{minSpeed:12.61,maxSpeed:17.2,acc:8,stamina:290,regen:1.4},
	G1:{minSpeed:12.87,maxSpeed:18.78,acc:9,stamina:420,regen:1.5},
	Finale:{minSpeed:13.13,maxSpeed:19.78,acc:10,stamina:430,regen:1.6},
  },
  "Sakura Bakushin O": {
	Debut:{minSpeed:12.11,maxSpeed:14.75,acc:7.5,stamina:150,regen:1.05},
	G3:{minSpeed:12.37,maxSpeed:15.83,acc:8.8,stamina:220,regen:1.35},
	G2:{minSpeed:12.63,maxSpeed:16.99,acc:9,stamina:280,regen:1.45},
	G1:{minSpeed:12.89,maxSpeed:18.87,acc:9.6,stamina:400,regen:1.55},
	Finale:{minSpeed:13.15,maxSpeed:19.87,acc:10.2,stamina:420,regen:1.65},
  },
  "Special Week": {
	Debut:{minSpeed:12.16,maxSpeed:14.31,acc:6.5,stamina:155,regen:1.4},
	G3:{minSpeed:12.42,maxSpeed:15.42,acc:7.5,stamina:230,regen:1.4},
	G2:{minSpeed:12.68,maxSpeed:16.54,acc:8.5,stamina:300,regen:1.5},
	G1:{minSpeed:12.94,maxSpeed:18.51,acc:9.2,stamina:430,regen:1.7},
	Finale:{minSpeed:13.2,maxSpeed:19.51,acc:10,stamina:450,regen:1.8},
  },
  "Symboli Rudolf": {
	Debut:{minSpeed:12.22,maxSpeed:14.75,acc:7,stamina:155,regen:1.1},
	G3:{minSpeed:12.48,maxSpeed:15.7,acc:8,stamina:240,regen:1.2},
	G2:{minSpeed:12.74,maxSpeed:16.89,acc:9,stamina:320,regen:1.5},
	G1:{minSpeed:13.01,maxSpeed:18.7,acc:10,stamina:480,regen:1.7},
	Finale:{minSpeed:13.27,maxSpeed:19.7,acc:10.5,stamina:500,regen:1.8},
  },
  "Rice Shower": {
	Debut:{minSpeed:12.28,maxSpeed:13.64,acc:6,stamina:157,regen:1.5},
	G3:{minSpeed:12.54,maxSpeed:14.98,acc:8,stamina:230,regen:1.7},
	G2:{minSpeed:12.81,maxSpeed:16.28,acc:8.5,stamina:310,regen:1.8},
	G1:{minSpeed:13.07,maxSpeed:17.88,acc:9,stamina:490,regen:1.9},
	Finale:{minSpeed:13.34,maxSpeed:18.88,acc:10,stamina:500,regen:2.0},
  },
  "Agnes Tachyon": {
	Debut:{minSpeed:12.04,maxSpeed:14.31,acc:7.5,stamina:155,regen:1},
	G3:{minSpeed:12.3,maxSpeed:15.47,acc:8,stamina:240,regen:1.2},
	G2:{minSpeed:12.56,maxSpeed:16.99,acc:9,stamina:310,regen:1.4},
	G1:{minSpeed:12.82,maxSpeed:18.78,acc:9.6,stamina:450,regen:1.5},
	Finale:{minSpeed:13.08,maxSpeed:19.78,acc:10.4,stamina:460,regen:1.6},
  },
  "Silence Suzuka": {
	Debut:{minSpeed:12.26,maxSpeed:14.53,acc:6,stamina:150,regen:1},
	G3:{minSpeed:12.52,maxSpeed:15.87,acc:7,stamina:220,regen:1.1},
	G2:{minSpeed:12.79,maxSpeed:16.54,acc:8,stamina:300,regen:1.4},
	G1:{minSpeed:13.05,maxSpeed:18.55,acc:8.5,stamina:430,regen:1.5},
	Finale:{minSpeed:13.32,maxSpeed:19.55,acc:9.5,stamina:440,regen:1.6},
  },
  "King Halo": {
	Debut:{minSpeed:11.98,maxSpeed:14.75,acc:6,stamina:145,regen:1},
	G3:{minSpeed:12.24,maxSpeed:15.92,acc:7,stamina:180,regen:1.1},
	G2:{minSpeed:12.5,maxSpeed:17.2,acc:7.5,stamina:210,regen:1.2},
	G1:{minSpeed:12.76,maxSpeed:19.22,acc:8,stamina:350,regen:1.2},
	Finale:{minSpeed:13.02,maxSpeed:20.1,acc:9,stamina:370,regen:1.3},
  },
  "T.M. Opera O": {
	Debut:{minSpeed:12.28,maxSpeed:14.31,acc:6,stamina:160,regen:1},
	G3:{minSpeed:12.54,maxSpeed:15.42,acc:8,stamina:210,regen:1.2},
	G2:{minSpeed:12.81,maxSpeed:17.13,acc:8,stamina:300,regen:1.3},
	G1:{minSpeed:13.07,maxSpeed:18.87,acc:9.5,stamina:480,regen:1.5},
	Finale:{minSpeed:13.34,maxSpeed:19.87,acc:10.2,stamina:490,regen:1.6},
  },
  "Mihono Bourbon": {
	Debut:{minSpeed:12.28,maxSpeed:14.26,acc:7.5,stamina:155,regen:1},
	G3:{minSpeed:12.54,maxSpeed:15.87,acc:7.5,stamina:225,regen:1.2},
	G2:{minSpeed:12.81,maxSpeed:16.89,acc:8,stamina:315,regen:1.3},
	G1:{minSpeed:13.07,maxSpeed:18.55,acc:8.5,stamina:450,regen:1.4},
	Finale:{minSpeed:13.34,maxSpeed:19.55,acc:9.5,stamina:460,regen:1.5},
  },
  "Super Creek": {
	Debut:{minSpeed:12.26,maxSpeed:14.31,acc:7.5,stamina:150,regen:1.2},
	G3:{minSpeed:12.52,maxSpeed:15.65,acc:9,stamina:220,regen:1.4},
	G2:{minSpeed:12.79,maxSpeed:16.89,acc:9,stamina:320,regen:1.4},
	G1:{minSpeed:13.05,maxSpeed:18.46,acc:9.5,stamina:400,regen:1.6},
	Finale:{minSpeed:13.32,maxSpeed:19.46,acc:10,stamina:425,regen:1.7},
  },
  "Winning Ticket": {
	Debut:{minSpeed:11.99,maxSpeed:14.08,acc:7,stamina:150,regen:1},
	G3:{minSpeed:12.25,maxSpeed:15.42,acc:8,stamina:240,regen:1.1},
	G2:{minSpeed:12.51,maxSpeed:16.54,acc:9,stamina:320,regen:1.1},
	G1:{minSpeed:12.77,maxSpeed:18.33,acc:9.2,stamina:440,regen:1.2},
	Finale:{minSpeed:13.03,maxSpeed:19.33,acc:9.8,stamina:470,regen:1.3},
  },
  "Hishi Amazon": {
	Debut:{minSpeed:12.08,maxSpeed:14.31,acc:6.5,stamina:145,regen:0.9},
	G3:{minSpeed:12.34,maxSpeed:15.83,acc:7.5,stamina:230,regen:1},
	G2:{minSpeed:12.6,maxSpeed:16.99,acc:8.8,stamina:310,regen:1},
	G1:{minSpeed:12.86,maxSpeed:18.78,acc:9,stamina:390,regen:1.1},
	Finale:{minSpeed:13.12,maxSpeed:19.78,acc:10,stamina:400,regen:1.2},
  },
  "Still In Love": {
	Debut:{minSpeed:12.16,maxSpeed:14.08,acc:7,stamina:152,regen:1},
	G3:{minSpeed:12.42,maxSpeed:15.65,acc:8,stamina:240,regen:1.1},
	G2:{minSpeed:12.68,maxSpeed:16.76,acc:8.5,stamina:360,regen:1.1},
	G1:{minSpeed:12.94,maxSpeed:18.33,acc:9.1,stamina:450,regen:1.3},
	Finale:{minSpeed:13.2,maxSpeed:19.33,acc:9.7,stamina:460,regen:1.4},
  },
  "Stay Gold": {
	Debut:{minSpeed:12.29,maxSpeed:14.22,acc:7,stamina:150,regen:1.4},
	G3:{minSpeed:12.55,maxSpeed:15.2,acc:7.5,stamina:230,regen:1.6},
	G2:{minSpeed:12.82,maxSpeed:17.08,acc:8,stamina:280,regen:1.8},
	G1:{minSpeed:13,maxSpeed:18.42,acc:8.5,stamina:390,regen:1.9},
	Finale:{minSpeed:13.35,maxSpeed:19.42,acc:9.5,stamina:400,regen:2.0},
  },
  "Orfevre": {
	Debut:{minSpeed:11.97,maxSpeed:14.75,acc:6.5,stamina:155,regen:0.6},
	G3:{minSpeed:12.23,maxSpeed:15.65,acc:7.5,stamina:250,regen:0.8},
	G2:{minSpeed:12.49,maxSpeed:17.13,acc:8.5,stamina:350,regen:1},
	G1:{minSpeed:12.75,maxSpeed:18.78,acc:9,stamina:420,regen:1.1},
	Finale:{minSpeed:13,maxSpeed:19.78,acc:10,stamina:450,regen:1.2},
  },
  "Maruzensky":{
	Debut: {minSpeed:12.26,maxSpeed:14.75,acc:8,stamina:140,regen:1},
	G3: {minSpeed:12.52,maxSpeed:15.87,acc:8.5,stamina:180,regen:1.1},
	G2: {minSpeed:12.79,maxSpeed:17.08,acc:9,stamina:220,regen:1.1},
	G1: {minSpeed:13.05,maxSpeed:19.01,acc:9,stamina:320,regen:1.3},
	Finale:{minSpeed:13.32,maxSpeed:20,acc:10,stamina:350,regen:1.4},
  },
  "Daiwa Scarlet":{
	Debut: {minSpeed:12.21,maxSpeed:14.75,acc:6.5,stamina:155,regen:1.2},
	G3: {minSpeed:12.47,maxSpeed:15.42,acc:7,stamina:240,regen:1.4},
	G2: {minSpeed:12.73,maxSpeed:16.76,acc:7.5,stamina:320,regen:1.5},
	G1: {minSpeed:13,maxSpeed:18.55,acc:8,stamina:420,regen:1.7},
	Finale:{minSpeed:13.26,maxSpeed:19.56,acc:9,stamina:440,regen:1.8},
  },
  "Vodka":{
	Debut: {minSpeed:12,maxSpeed:14.31,acc:7,stamina:145,regen:0.9},
	G3: {minSpeed:12.26,maxSpeed:15.65,acc:7.5,stamina:220,regen:1},
	G2: {minSpeed:12.52,maxSpeed:16.99,acc:8.5,stamina:300,regen:1},
	G1: {minSpeed:12.78,maxSpeed:18.78,acc:9,stamina:390,regen:1.1},
	Finale:{minSpeed:13.04,maxSpeed:19.78,acc:10,stamina:400,regen:1.2},
  },
  "Matikanetannhauser":{
	Debut: {minSpeed:12.14,maxSpeed:14.31,acc:6.9,stamina:150,regen:1.1},
	G3: {minSpeed:12.4,maxSpeed:15.42,acc:7.5,stamina:220,regen:1.2},
	G2: {minSpeed:12.66,maxSpeed:16.54,acc:8.1,stamina:300,regen:1.3},
	G1: {minSpeed:12.92,maxSpeed:18.7,acc:8.6,stamina:400,regen:1.4},
	Finale:{minSpeed:13.18,maxSpeed:19.7,acc:9.6,stamina:430,regen:1.5},
  },
  "Meisho Doto":{
	Debut: {minSpeed:12.22,maxSpeed:14.08,acc:6.5,stamina:155,regen:1},
	G3: {minSpeed:12.48,maxSpeed:15.42,acc:7,stamina:240,regen:1.1},
	G2: {minSpeed:12.74,maxSpeed:16.54,acc:8,stamina:320,regen:1.3},
	G1: {minSpeed:13.01,maxSpeed:18.33,acc:8.5,stamina:460,regen:1.5},
	Finale:{minSpeed:13.27,maxSpeed:19.34,acc:9.5,stamina:480,regen:1.6},
  },
  "Taiki Shuttle":{
	Debut: {minSpeed:12.19,maxSpeed:14.53,acc:8.5,stamina:140,regen:1.1},
	G3: {minSpeed:12.45,maxSpeed:15.65,acc:9,stamina:180,regen:1.1},
	G2: {minSpeed:12.71,maxSpeed:17.16,acc:9.5,stamina:250,regen:1.2},
	G1: {minSpeed:12.97,maxSpeed:19.05,acc:10,stamina:300,regen:1.2},
	Finale:{minSpeed:13.24,maxSpeed:20.01,acc:10.5,stamina:320,regen:1.3},
  },
  "Biwa Hayahide":{
	Debut: {minSpeed:12.19,maxSpeed:14.31,acc:7,stamina:155,regen:1.2},
	G3: {minSpeed:12.45,maxSpeed:15.2,acc:7.5,stamina:250,regen:1.2},
	G2: {minSpeed:12.71,maxSpeed:16.76,acc:8,stamina:310,regen:1.3},
	G1: {minSpeed:12.97,maxSpeed:18.61,acc:8,stamina:430,regen:1.4},
	Finale:{minSpeed:13.24,maxSpeed:19.61,acc:9,stamina:445,regen:1.5},
  },
  "Air Shakur":{
	Debut: {minSpeed:11.94,maxSpeed:14.75,acc:6.5,stamina:155,regen:0.6},
	G3: {minSpeed:12.2,maxSpeed:15.65,acc:7.2,stamina:240,regen:0.8},
	G2: {minSpeed:12.46,maxSpeed:16.99,acc:8,stamina:300,regen:0.9},
	G1: {minSpeed:12.71,maxSpeed:18.78,acc:8.3,stamina:410,regen:1},
	Finale:{minSpeed:12.97,maxSpeed:19.78,acc:9.3,stamina:420,regen:1.1},
  },
  "Seiun Sky":{
	Debut: {minSpeed:12.09,maxSpeed:14.59,acc:7,stamina:160,regen:1},
	G3: {minSpeed:12.35,maxSpeed:15.56,acc:7.5,stamina:250,regen:1.1},
	G2: {minSpeed:12.61,maxSpeed:16.76,acc:8,stamina:320,regen:1.2},
	G1: {minSpeed:12.87,maxSpeed:18.55,acc:8.5,stamina:440,regen:1.3},
	Finale:{minSpeed:13.13,maxSpeed:19.56,acc:9.5,stamina:450,regen:1.4},
  },
  "Fenomeno":{
	Debut: {minSpeed:12.25,maxSpeed:13.8,acc:6.5,stamina:160,regen:1.4},
	G3: {minSpeed:12.51,maxSpeed:15.3,acc:7,stamina:250,regen:1.6},
	G2: {minSpeed:12.78,maxSpeed:16.33,acc:7.5,stamina:320,regen:1.7},
	G1: {minSpeed:13.04,maxSpeed:18.05,acc:8,stamina:480,regen:1.8},
	Finale:{minSpeed:13.3,maxSpeed:19,acc:8.5,stamina:500,regen:1.85},
  },
  //UMA LEGENDS
  "Man o' War": {
	Debut:{minSpeed:12.28,maxSpeed:14.55,acc:7.5,stamina:155,regen:1.2},
	G3:{minSpeed:12.54,maxSpeed:15.6,acc:8,stamina:230,regen:1.3},
	G2:{minSpeed:12.81,maxSpeed:17.2,acc:8.5,stamina:320,regen:1.4},
	G1:{minSpeed:13.07,maxSpeed:19,acc:9,stamina:480,regen:1.5},
	Finale:{minSpeed:13.34,maxSpeed:19.22,acc:9.5,stamina:500, regen:1.6},
  },
  "KINCSEM": {
	Debut:{minSpeed:12.34,maxSpeed:14.31,acc:8,stamina:160,regen:1.2},
	G3:{minSpeed:12.6,maxSpeed:15.55,acc:8.5,stamina:250,regen:1.4},
	G2:{minSpeed:12.87,maxSpeed:16.2,acc:9,stamina:360,regen:1.7},
	G1:{minSpeed:13.13,maxSpeed:18.72,acc:9.5,stamina:500,regen:1.9},
	Finale:{minSpeed:13.4,maxSpeed:19.02,acc:10.2,stamina:510, regen:2.0},
  },
  "Secretariat": {
	Debut:{minSpeed:12.29,maxSpeed:14.51,acc:8,stamina:145,regen:1.4},
	G3:{minSpeed:12.55,maxSpeed:15.85,acc:8,stamina:200,regen:1.5},
	G2:{minSpeed:12.82,maxSpeed:17.25,acc:9,stamina:300,regen:1.6},
	G1:{minSpeed:13.08,maxSpeed:19.22,acc:9.5,stamina:450,regen:1.7},
	Finale:{minSpeed:13.35,maxSpeed:20.22,acc:10.5,stamina:480, regen:1.8},
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
  "Mihino Bourbon": {
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
  "Gold Ship","Haru Urara","Agnes Tachyon","T.M. Opera O","Mihino Bourbon","KINCSEM"
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
  abilities:{unlockedPassives:[],unlockedActives:[],equippedPassives:[],equippedActive:null},
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
const ABILITIES = {
  passives: [
    {id:"Dirty Runner", cost:50,
      condition:(rs,p)=> rs.race.track === "Dirt",
      apply:(r,rs)=>{ r._mods = r._mods||{}; if(!r._mods.DirtyRunner){ r._mods.DirtyRunner = r.maxSpeed*0.05; r.maxSpeed += r._mods.DirtyRunner; } },
      remove:(r)=>{ if(r._mods && r._mods.DirtyRunner){ r.maxSpeed -= r._mods.DirtyRunner; delete r._mods.DirtyRunner; } }
    },
	{id:"Turf Runner", cost:80,
      condition:(rs,p)=> rs.race.track === "Turf",
      apply:(r,rs)=>{ r._mods = r._mods||{}; if(!r._mods.TurfRunner){ r._mods.TurfRunner = r.maxSpeed*0.05; r.maxSpeed += r._mods.TurfRunner; } },
      remove:(r)=>{ if(r._mods && r._mods.TurfRunner){ r.maxSpeed -= r._mods.TurfRunner; delete r._mods.TurfRunner; } }
    },
    {id:"Lucky Seven", cost:100,
      condition:(rs,p)=> p.number===7,
      apply:(r,rs)=>{ r._mods = r._mods||{}; if(!r._mods.LuckySeven){ r._mods.LuckySeven = {ms:r.maxSpeed*0.05,ac:r.acc*0.05}; r.maxSpeed += r._mods.LuckySeven.ms; r.acc += r._mods.LuckySeven.ac; } },
      remove:(r)=>{ if(r._mods && r._mods.LuckySeven){ r.maxSpeed -= r._mods.LuckySeven.ms; r.acc -= r._mods.LuckySeven.ac; delete r._mods.LuckySeven; } }
    },
	{id: "Sunny Days", cost: 50,
	  condition: (rs,p) => { if (!rs||!p) return false; return true; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.SunnyDaysActive) { if (!rs || rs.weather !== "Sunny") { if (typeof r._mods.SunnyDays.prev === "number") r.maxSpeed = r._mods.SunnyDays.prev; delete r._mods.SunnyDaysActive; delete r._mods.SunnyDays; } return; } r._mods.SunnyDaysActive = true; r._mods.SunnyDays = r._mods.SunnyDays || {}; r._mods.SunnyDays.prev = r.maxSpeed || 0; if (rs && rs.weather === "Sunny") r.maxSpeed = (r.maxSpeed || 0) * 1.08; else r.maxSpeed = (r.maxSpeed || 0) * 0.92; },
	  remove: (r) => { if (!r._mods || !r._mods.SunnyDays) return; if (typeof r._mods.SunnyDays.prev === "number") r.maxSpeed = r._mods.SunnyDays.prev; delete r._mods.SunnyDays; delete r._mods.SunnyDaysActive; }
	},
	{id: "Cloudy Days", cost: 50,
	  condition: (rs,p) => { if (!rs||!p) return false; return true; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.CloudyDaysActive) { if (!rs || rs.weather !== "Cloudy") { if (typeof r._mods.CloudyDays.prev === "number") r.maxSpeed = r._mods.CloudyDays.prev; if (typeof r._mods.CloudyDays.prevAcc === "number") r.acc = r._mods.CloudyDays.prevAcc; delete r._mods.CloudyDaysActive; delete r._mods.CloudyDays; } return; } r._mods.CloudyDaysActive = true; r._mods.CloudyDays = r._mods.CloudyDays || {}; r._mods.CloudyDays.prev = r.maxSpeed || 0; r._mods.CloudyDays.prevAcc = r.acc || 0; if (rs && rs.weather === "Cloudy") { if (rs.track === "Good" && r._mods && r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') { r.maxSpeed = (r._mods._prev.maxSpeed || 0) * 1.05; } else { r.maxSpeed = (r.maxSpeed || 0) * 1.05; } } else { r.maxSpeed = (r.maxSpeed || 0) * 0.95; } },
	  remove: (r) => { if (!r._mods || !r._mods.CloudyDays) return; if (typeof r._mods.CloudyDays.prev === "number") r.maxSpeed = r._mods.CloudyDays.prev; if (typeof r._mods.CloudyDays.prevAcc === "number") r.acc = r._mods.CloudyDays.prevAcc; delete r._mods.CloudyDays; delete r._mods.CloudyDaysActive; }
	},
	{id: "Rainy Days", cost: 50,
	  condition: (rs,p) => { if (!rs||!p) return false; return true; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.RainyDaysActive) { if (!rs || rs.weather !== "Rainy") { if (typeof r._mods.RainyDays.prev === "number") r.maxSpeed = r._mods.RainyDays.prev; if (typeof r._mods.RainyDays.prevAcc === "number") r.acc = r._mods.RainyDays.prevAcc; delete r._mods.RainyDaysActive; delete r._mods.RainyDays; } return; } r._mods.RainyDaysActive = true; r._mods.RainyDays = r._mods.RainyDays || {}; r._mods.RainyDays.prev = r.maxSpeed || 0; r._mods.RainyDays.prevAcc = r.acc || 0; if (rs && rs.weather === "Rainy") { if (rs.track === "Wet" && r._mods && r._mods._prev && typeof r._mods._prev.maxSpeed === 'number') { r.maxSpeed = (r._mods._prev.maxSpeed || 0) * 1.05; r.acc = (r._mods._prev.acc || 0); } else { r.maxSpeed = (r.maxSpeed || 0) * 1.05; } } else { r.maxSpeed = (r.maxSpeed || 0) * 0.95; } },
	  remove: (r) => { if (!r._mods || !r._mods.RainyDays) return; if (typeof r._mods.RainyDays.prev === "number") r.maxSpeed = r._mods.RainyDays.prev; if (typeof r._mods.RainyDays.prevAcc === "number") r.acc = r._mods.RainyDays.prevAcc; delete r._mods.RainyDays; delete r._mods.RainyDaysActive; }
	},
	{id: "Firm Conditions", cost: 100,
	  condition: (rs,p) => { if (!rs||!p) return false; return rs.track === "Firm"; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.FirmConditionsActive) return; r._mods.FirmConditionsActive = true; r._mods.FirmConditions = r._mods.FirmConditions || {}; r._mods.FirmConditions.prev = r.maxSpeed || 0; r.maxSpeed = (r.maxSpeed || 0) * 1.05; },
	  remove: (r) => { if (!r._mods || !r._mods.FirmConditions) return; if (typeof r._mods.FirmConditions.prev === "number") r.maxSpeed = r._mods.FirmConditions.prev; delete r._mods.FirmConditions; delete r._mods.FirmConditionsActive; }
	},
	{id: "Wet Conditions", cost: 100,
	  condition: (rs,p) => { if (!rs||!p) return false; return rs.track === "Good" || rs.track === "Wet"; },
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.WetConditionsActive) return; r._mods.WetConditionsActive = true; r._mods.WetConditions = r._mods.WetConditions || {}; r._mods.WetConditions.prev = r.maxSpeed || 0; r.maxSpeed = (r.maxSpeed || 0) * 1.10; },
	  remove: (r) => { if (!r._mods || !r._mods.WetConditions) return; if (typeof r._mods.WetConditions.prev === "number") r.maxSpeed = r._mods.WetConditions.prev; delete r._mods.WetConditions; delete r._mods.WetConditionsActive; }
	},
    {id:"Competitive", cost:100,
      condition:(rs,p)=> { let near = 0; for(const o of rs.field) if(o!==p && Math.abs(o.pos - p.pos)/Math.max(1, rs.race.distance) <= 0.03) near++; return near >= 2; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.Competitive){ r._mods.Competitive = {ms:r.maxSpeed*0.10,expires: rs.time + 5}; r.maxSpeed += r._mods.Competitive.ms; } },
      remove:(r)=>{ if(r._mods && r._mods.Competitive){ r.maxSpeed -= r._mods.Competitive.ms; delete r._mods.Competitive; } }
    },
    {id:"Patience Is Key", cost:100,
      condition:(rs,p)=> { const rank = getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank>2 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.Patience){ r._mods.Patience = {ms:r.maxSpeed*0.05,ac:r.acc*0.05}; r.maxSpeed += r._mods.Patience.ms; r.acc += r._mods.Patience.ac; } },
      remove:(r)=>{ if(r._mods && r._mods.Patience){ r.maxSpeed -= r._mods.Patience.ms; r.acc -= r._mods.Patience.ac; delete r._mods.Patience; } }
    },
    {id:"Confidence", cost:100,
      condition:(rs,p)=> { const rank = getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank<=3 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.ConfidenceUsed) { const __st = (r.staminaMax * 0.5) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.ConfidenceUsed = true; } },
      remove:(r)=>{}
    },
    {id:"Iron Will", cost:100,
      condition:(rs,p)=> { const rank=getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank>3 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.IronWillUsed){ const __st = (r.staminaMax * 0.6) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.IronWillUsed=true; } },
      remove:(r)=>{}
    },
    {id:"Cool Down", cost:100,
      condition:(rs,p)=> false,
      apply:(r,rs)=>{},
      remove:(r)=>{}
    },
    {id:"Breath of Fresh Air", cost:100,
      condition:(rs,p)=> { const rank = getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank<=3 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.BreathUsed){ const __st = (r.staminaMax * 0.4) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.BreathUsed=true; } },
      remove:(r)=>{}
    },
    {id:"Unchanging", cost:100,
      condition:(rs,p)=> { const pct=(p.pos/rs.race.distance)*100; return (p.startRank === getCurrentRank(rs,p)) && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.UnchangingUsed){ const __st = (r.staminaMax * 0.5) * _witsEffectMult(); r.stamina = clamp(r.stamina + __st, 0, r.staminaMax); r._mods.UnchangingUsed=true; } },
      remove:(r)=>{}
    },
    {id: "Oh No You Don’t!", cost: 100,
	  condition: (rs,p) => false,
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.OhNoYouDontActive) return; let progress = null; if (typeof rs.progress === 'number') progress = rs.progress; else if (typeof rs.distance === 'number' && typeof r.distance === 'number' && rs.distance > 0) progress = r.distance / rs.distance; if (progress === null || progress < 0.5) return; const amount = 0.10; r._mods.OhNoYouDontActive = true; r._mods.OhNoYouDont = r._mods.OhNoYouDont || {}; r._mods.OhNoYouDont.prevMaxSpeed = r.maxSpeed || 0; r._mods.OhNoYouDont.amount = amount; r.maxSpeed = (r.maxSpeed || 0) * (1 + amount); try { r._mods.OhNoYouDont.expires = (rs.time !== undefined) ? (rs.time + 5) : (Date.now()/1000 + 5); } catch(e) { r._mods.OhNoYouDont.expires = Date.now()/1000 + 5; }
	  },
	  remove: (r) => { if (!r._mods || !r._mods.OhNoYouDont) return; if (typeof r._mods.OhNoYouDont.prevMaxSpeed === 'number') r.maxSpeed = r._mods.OhNoYouDont.prevMaxSpeed; delete r._mods.OhNoYouDont; delete r._mods.OhNoYouDontActive;
	  }
	},
	{id: "It’s On!", cost: 100,
	  condition: (rs,p) => false,
	  apply: (r,rs) => { r._mods = r._mods || {}; if (r._mods.ItsOnUsed) return; let progress = null; if (typeof rs.progress === 'number') progress = rs.progress; else if (typeof rs.distance === 'number' && typeof r.distance === 'number' && rs.distance > 0) progress = r.distance / rs.distance; if (progress === null || progress < 0.5) return; const amount = 0.60; const addStamina = (r.staminaMax || 0) * amount; r.stamina = clamp((r.stamina || 0) + addStamina, 0, r.staminaMax || ((r.stamina || 0) + addStamina)); r._mods.ItsOnUsed = true;
	  },
	  remove: (r) => { if (!r._mods) return; delete r._mods.ItsOnUsed;
	  }
	},
    {id:"I Understand It Now", cost:150,
      condition:(rs,p)=> { const rank=getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return (rank===2||rank===3) && pct>=26; },
      apply:(r,rs)=>{
        const sorted = [...rs.field].sort((a,b)=>b.pos-a.pos);
        const rank = getCurrentRank(rs,r);
        const ahead = sorted[rank-2];
        if(ahead && !r._mods.CopySpeed){ r._mods.CopySpeed={acc:r.acc,ms:r.maxSpeed}; r.acc = ahead.acc; r.maxSpeed = ahead.maxSpeed; }
      },
      remove:(r)=>{ if(r._mods && r._mods.CopySpeed){ r.acc = r._mods.CopySpeed.acc; r.maxSpeed = r._mods.CopySpeed.ms; delete r._mods.CopySpeed; } }
    },
    {id:"Aura", cost:150,
      condition:(rs,p)=> { const rank=getCurrentRank(rs,p); const pct=(p.pos/rs.race.distance)*100; return rank>=6 && pct>=26; },
      apply:(r,rs)=>{ r._mods=r._mods||{}; if(!r._mods.Aura){ r._mods.Aura={ms:r.maxSpeed*0.5,ac:r.acc*0.5,expires:rs.time+5}; r.maxSpeed += r._mods.Aura.ms; r.acc += r._mods.Aura.ac; } },
      remove:(r)=>{ if(r._mods && r._mods.Aura){ r.maxSpeed -= r._mods.Aura.ms; r.acc -= r._mods.Aura.ac; delete r._mods.Aura; } },
    }
  ],
  actives: [
    {id:"Plus Ultra!", cost:150, fn:"plusUltra"},
    {id:"No… Not Yet!", cost:150, fn:"regen70"},
    {id:"I Am Not Giving Up Now!", cost:200, fn:"comeback"},
    {id:"Plan B", cost:150, fn:"planB"},
    {id:"Triumphant Pulse", cost:200, fn:"triumph"},
	{id:"Red Shift", cost:200, fn:"redshift"},
	{id:"Swinging Maestro", cost:200, fn:"swing"},
    {id:"Must Go Even Further Beyond!", cost:200, fn:"furtherBeyond"},
    {id:"Gotcha!", cost:150, fn:"gotcha"}
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
    opt.textContent = `${r.id} [${r.grade}] - Track: ${r.track} -  Distance: ${r.distance}m${dist} ${disabled? "(Locked)" : ""}`;
	opt.style.border="1px solid black";
    if(disabled) opt.disabled = true;
    sel.appendChild(opt);
  }
}

/* -------------------------
  Render player UI (stats bars, energy)
------------------------- */
function refreshPlayerUI(){
  // ensure custom cursor doesn't block pointer events (fix for hover issues)
  try {
    const cc = document.querySelector(".uma-cursor");
    if(cc) cc.style.pointerEvents = "none";
  } catch(e){}

  el("playerName").value = state.name;
  el("energyVal").textContent = Math.round(state.energy);
  el("energyBar").style.width = clamp(state.energy,0,100) + "%";
  el("fame").textContent = Math.round(state.fame);
  el("sp").textContent = Math.round(state.sp);
  el("racesDone").textContent = state.racesDone || 0;
  
  const totalTrains = state.training.totalTrains || 0;
  el("trainCount").textContent = totalTrains;
  const DAYS_REQUIRED = 30;
  const daysLeft = Math.max(0, DAYS_REQUIRED - totalTrains);
  
  if(el("daysUntilRace")){
    if (daysLeft > 0) {
      el("daysUntilRace").textContent = `Days until next Race: ${daysLeft}`;
    } else {
      el("daysUntilRace").textContent = `It's Race Day!`;
    }
  } else {
    if (daysLeft > 0) {
      if(el("trainCount2")) el("trainCount2").textContent = `Days until next Race: ${daysLeft}`;
    } else {
      if(el("trainCount2")) el("trainCount2").textContent = `It's Race Day!`;
    }
  }
  
  el("passiveCount").textContent = state.abilities.equippedPassives.length || 0;
  el("activeEquip").textContent = state.abilities.equippedActive || "—";
  el("winLoss").textContent = `${state.wins||0}-${state.losses||0}`;
  updateTitle();

  // Stats grid
  const grid = el("statsGrid"); if(!grid) return;
  grid.innerHTML = "";
  // helper for rank & color
  function statRankAndColor(val){
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

  // stat descriptions (short)
  const STAT_DESCS = {
    "Speed": "Increases top speed and velocity — allowing you to outspeed opponents.",
    "Stamina": "Increases max stamina — allowing you to go at max speed for longer durations.",
    "Power": "Increases acceleration — allowing you to recover and reach your top speed faster.",
    "Guts": "Increases stamina regeneration and decreases speed penalty — allowing you to keep your position in control, recover and accelerate back to top speed much faster.",
    "Wits": "Increases ability effectiveness and duration, timing, and helps keep you at ease."
  };

function showFailTooltipForHost(host, statName){
  try{
    const info = getTrainingChanceAndMultiplier(state.energy || 0) || {};
    let fail = typeof info.fail === "number" ? info.fail : 0;
    if(fail > 1) fail = 1;
    const pctFail = Math.round(Math.min(Math.max(fail * 100, 0), 100));

    // determine gradient + inner tail color based on fail %
    let gradient = "linear-gradient(180deg,#00bbff 0%, #006eff 67%)";
    let innerTailColor = "#006eff";
    if(pctFail > 45){
      gradient = "linear-gradient(180deg,#ff3b3b 0%, #8B0000 67%)";
      innerTailColor = "#8B0000";
    } else if(pctFail > 20){
      gradient = "linear-gradient(180deg,#FFDB58 0%, #FF8C00 67%)";
      innerTailColor = "#FF8C00";
    }

    // determine whether we should show the big "Failure: X%" line
    const showFailTop = !!(host && host.classList && host.classList.contains('chip'));

    let tip = host.querySelector(".fail-tooltip");
    if(!tip){
      // chat bubble container (below the host)
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

      // core bubble styles: width = 150% of host, capped
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

      // fail-top (shows failure % prominently, above stat info)
      const ft = tip.querySelector(".fail-top");
      Object.assign(ft.style, {
        color: "#fff",
        fontWeight: "800",
        fontSize: "12px",
        marginBottom: "6px",
        display: "block",
        lineHeight: "1"
      });

      // stat block title
      const st = tip.querySelector(".stat-title");
      Object.assign(st.style, {
        color: "#fff",
        fontWeight: "800",
        fontSize: "13px",
        marginBottom: "4px"
      });

      // stat description
      const sd = tip.querySelector(".stat-desc");
      Object.assign(sd.style, {
        color: "#fff",
        fontWeight: "600",
        fontSize: "12px",
        lineHeight: "1.2",
        opacity: "0.98"
      });

      // tail border (white)
      const tailBorder = tip.querySelector(".fail-tail-border");
      Object.assign(tailBorder.style, {
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

      // inner tail (will be set below to match gradient)
      const tail = tip.querySelector(".fail-tail");
      Object.assign(tail.style, {
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

      // ensure host has positioning context
      if(!host.style.position) host.style.position = "relative";
      host.appendChild(tip);
    }

    // update gradient & tail color even if tooltip already exists
    tip.style.background = gradient;
    const innerTail = tip.querySelector(".fail-tail");
    if(innerTail){
      innerTail.style.borderBottom = "8px solid " + innerTailColor;
    }

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
  } catch(err){
    console.warn("showFailTooltipForHost error", err);
  }
}
  function hideFailTooltipForHost(host){
    const tip = host.querySelector(".fail-tooltip");
    if(tip) tip.style.display = "none";
  }

  for(const k of ["Speed","Stamina","Power","Guts","Wits"]){
    const val = state.stats[k] || 0;
    const pct = Math.round(val / 12); // 1200 -> 100
    const {rank, color} = statRankAndColor(val);
    const d = document.createElement("div"); d.className = "stat";
    d.innerHTML = `
      <div class="statName" style="display:flex;justify-content:space-between">
        <b class="statsName" style="color:${color}">&nbsp;${k}</b>
        <span class="small muted" style="color:${color}"><span style="font-weight:bold;margin-left:7px;color:${color}">[${rank}]</span></span>
      </div>
      <div class="value">Value: <b>${val.toFixed(2)} / 1200</b></div>
      <div class="bar"><i class="fill" style="width:${clamp(pct,0,100)}%"></i></div>
      <div class="facilityLevel" style="margin-top:6px">Training Facility Level: ${state.training.levels[k]||1}</div>
    `;

    // ensure positioning context for tooltip
    if(!d.style.position) d.style.position = "relative";

    // attach hover to the stat block (mouseenter/mouseleave)
    d.addEventListener("mouseenter", e => showFailTooltipForHost(d, k));
    d.addEventListener("mouseleave", e => hideFailTooltipForHost(d));

    grid.appendChild(d);
  }
  
  // ALSO: attach hover tooltip behavior to training stat buttons (chips)
  setTimeout(()=>{ // small timeout ensures trainingPanel exists & is rendered
    try{
      const chips = document.querySelectorAll("#trainingPanel .chip[data-stat]");
      chips.forEach(ch => {
        // ensure positioning context on the chip
        if(!ch.style.position) ch.style.position = "relative";
        // avoid duplicating listeners by removing earlier ones (safe)
        ch.removeEventListener("mouseenter", ch._failTipEnter || (()=>{}));
        ch.removeEventListener("mouseleave", ch._failTipLeave || (()=>{}));

        const statName = ch.dataset.stat;
        ch._failTipEnter = function(){ showFailTooltipForHost(ch, statName); };
        ch._failTipLeave = function(){ hideFailTooltipForHost(ch); };

        ch.addEventListener("mouseenter", ch._failTipEnter);
        ch.addEventListener("mouseleave", ch._failTipLeave);
      });
    }catch(e){
      console.warn("chip tooltip attach error", e);
    }
  }, 6);

  const trainLocked = !!(state.training && state.training.locked) && (state.racesDone <= (state.training.lockRaceCount || -1));
  if(el("doTrainBtn")) el("doTrainBtn").disabled = trainLocked;
  el("doTrainBtn").style.padding ="6px 8px";
  el("doTrainBtn").style.borderRadius="6px";
  el("doTrainBtn").style.background="linear-gradient(180deg,#40ff00 20%,#29a600 80%,#40ff00 100%)";
  el("doTrainBtn").style.cursor="pointer";
  el("doTrainBtn").style.border="1.6px solid white";
  el("doTrainBtn").style.fontWeight="bold";

  document.querySelectorAll("#trainingPanel .chip").forEach(ch=>{
    const stat = ch.dataset.stat;
    const isMaxed = (state.stats[stat] || 0) >= getEffectiveStatCapForPlayer(state);
    if(trainLocked || isMaxed){
      ch.classList.add("disabled");
      ch.disabled = true;
    } else {
      ch.classList.remove("disabled");
      ch.disabled = false;
    }
  });

  populateRaces();
  renderAbilitiesShop();
  renderEquipped();
  renderLeaderboard();
}

/* -------------------------
  Abilities UI
------------------------- */
function renderAbilitiesShop(){
  const wrap = el("abilitiesShop"); wrap.innerHTML = "";
  wrap.style.background="#ffffff";
  wrap.style.border="1.7px solid #fcba03";
  wrap.style.borderRadius="8px";
  for(const p of ABILITIES.passives){
    const unlocked = state.abilities.unlockedPassives.includes(p.id);
    const isEquipped = state.abilities.equippedPassives.includes(p.id);
    const row = document.createElement("div"); row.style.padding="6px"; row.style.background="#ffffff"; row.style.border = "1.7px solid #fcba03"; row.style.color ="#fcba03";
    row.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${p.id}</b><div class="identification">Passive</div></div>
      <div style="text-align:right">${p.cost} SP<br>${unlocked? `<button class="smallBtn" data-equip="${p.id}">${isEquipped? 'Unequip' : 'Equip'}</button>` : `<button class="smallBtnBuy" data-buy="${p.id}">Buy</button>`}</div></div>`;
    wrap.appendChild(row);
  }
  const hr = document.createElement("hr");
  hr.style.height = "3px";
  hr.style.width = "110%";
  hr.style.background = "#fcba03";
  wrap.appendChild(hr);
  for(const a of ABILITIES.actives){
    const unlocked = state.abilities.unlockedActives.includes(a.id);
    const isEquipped = state.abilities.equippedActive === a.id;
    const row = document.createElement("div"); row.style.padding="6px"; row.style.background="#ffffff"; row.style.border = "1.7px solid #fcba03"; row.style.color ="#fcba03";
    row.innerHTML = `<div style="display:flex;justify-content:space-between"><div><b>${a.id}</b><div class="identification">Active</div></div>
      <div style="text-align:right">${a.cost} SP<br>${unlocked? `<button class="smallBtn" data-equip-active="${a.id}">${isEquipped? 'Unequip' : 'Equip'}</button>` : `<button class="smallBtnBuy" data-buy-active="${a.id}">Buy</button>`}</div></div>`;
    wrap.appendChild(row);
  }

  // listeners
  wrap.querySelectorAll("button[data-buy]").forEach(b=>b.addEventListener("click", ()=>{
    const id=b.dataset.buy; const item=ABILITIES.passives.find(x=>x.id===id);
    if(!item) return;
    if(state.sp < item.cost){ alert("Not enough SP"); return; }
    state.sp -= item.cost; state.abilities.unlockedPassives.push(id); saveState(); refreshPlayerUI();
  }));
  wrap.querySelectorAll("button[data-equip]").forEach(b=>b.addEventListener("click", ()=>{
    const id=b.dataset.equip;
    if(state.abilities.equippedPassives.includes(id)) state.abilities.equippedPassives = state.abilities.equippedPassives.filter(x=>x!==id);
    else {
      if(state.abilities.equippedPassives.length >= 6){ alert("Max 6 passives"); return; }
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
}

/* -------------------------
  Render equipped list
------------------------- */
function renderEquipped(){
  const pe = el("passivesEquip"); pe.innerHTML = "";
  for(const id of state.abilities.equippedPassives){
    const d = document.createElement("div"); d.className = "ability"; d.textContent = id; pe.appendChild(d);
  }

  const ae = el("activeEquip");
  ae.innerHTML = "";
  if(state.abilities.equippedActive){
    const d = document.createElement("div");
    d.className = "activeAbility";
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
  const acc = 6 + (stats.Power - 100)*0.00425;
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
      VERSATILE_RUNNERS.includes(racer.name) ? "versatile" : null
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

  el("raceInfo").innerHTML = `<b>${r.id}</b><div class="small muted">${r.grade} • Track: ${r.track} • Distance: ${r.distance}m${dist} • Fans Watching: ${r.rewardFame}</div>`;
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
      const mPct = 49; // 26-74 -> 49
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
  for(const pid of state.abilities.equippedPassives){
    const def = ABILITIES.passives.find(x=>x.id === pid);
    if(!def) continue;
    try{
      const cond = def.condition(raceState, player);
      if(cond){
        def.apply(player, raceState);
        // mark applied - def implementations set _mods
      } else {
        def.remove(player, raceState);
      }
    }catch(e){ console.warn("ability error", e); }
  }
  // cleanup timed modifiers
  if(player._mods){
    for(const k in player._mods){
      if(player._mods[k] && player._mods[k].expires && raceState.time >= player._mods[k].expires){
        const nameMap = {Aura:"Aura", Competitive:"Competitive", /* etc */};
        if(k === "Competitive" || k === "Aura"){
          const def = ABILITIES.passives.find(x=>x.id === (k==="Competitive" ? "Competitive" : "Aura"));
          if(def) def.remove(player, raceState);
        }
      }
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

  // Constants for new features
  const LOW_ENERGY_THRESHOLD = 30;
  const LATE_START_CHANCE = (function(){ const base=0.05; const scale=_getWitsScale(); return base * (1 - scale); })();
  const LATE_START_DELAY = 0.5;

  raceState.running = true; raceState.time = 0; raceState.finishedCount = 0; raceState.nextFinishPlace = 1;
  // reset crew 25
  for(const r of raceState.field){
    r.speed = 0; r.pos = 0; r.stamina = r.staminaMax; r.finished = false; r.finalPlace = null;
    r.exhausted = false; r.reachedMiddle = false; r._mods = {}; r.activeBuffs = []; r.startRank = r.startRank || 1;
  }
  
  state.playerAbilityLastUsed = state.playerAbilityLastUsed || 0;
  state.playerAbilityLastUsedRace = null;
  for(const r of raceState.field || []){
  r.lastAbilityUsed = 0;
  if(r._mods) delete r._mods.SpecialActivatedOnce;
										}

  // NEW: assign late-starts (5% chance) for EVERY racer, and apply low-energy penalty to player if needed
  // Note: raceState.time is 0 here (race just started), so startsAt = 0.5
  for(const r of raceState.field){
    // 5% Late Start chance for every racer
    if(Math.random() < LATE_START_CHANCE){
      // mark with a LateStart mod; we'll check this in raceTick to block acceleration until startsAt
      r._mods = r._mods || {};
      r._mods.LateStart = { startsAt: raceState.time + LATE_START_DELAY };
      // warn/log (user wanted id="warn")
      addLog(`<div id="warn">${r.name} had a late start!</div>`);
    }
  }

  // Low-energy acceleration penalty (player only) — if player's energy is low at race start
  const player = raceState.field.find(f=>f.isPlayer);
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
  
  raceTickHandle = setInterval(()=>raceTick(0.005), 10);
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
      if(Math.random() < PLAYER_RUSH_CHANCE){
        r._mods = r._mods || {};
        const ms = r.maxSpeed * RUSH_MS_MULT;
        r._mods.Rushed = { ms: ms, dmult: 4, expires: raceState.time + RUSH_DURATION };
        r.maxSpeed += ms;
        if(r.isPlayer) addLog(`<div class="warn">Looks like ${r.name} feels a bit RUSHED there!</div>`);
        else addLog(`<div class="warn">Looks like ${r.name}'s a little RUSHED there!</div>`);
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
    if(r.speed >= curMax * 0.98){
      let mult = 1;
      if(r._mods && r._mods.Rushed && r._mods.Rushed.dmult) mult *= r._mods.Rushed.dmult;
      r.stamina -= (BASE_DRAIN_PER_TICK * mult);
    } else {
      r.stamina += (r.regenPerTick || r.regenPerTick || 0.1);
    }
    r.stamina = clamp(r.stamina, 0, r.staminaMax);

    // exhaustion handling
    if(r.stamina <= 0 && !r.exhausted){
      r.exhausted = true;
      r.speed = Math.min(r.speed, (r.minSpeed || 11.1));
      addLog(`Oh and it looks like ${r.name} has ran out of stamina!`);
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

function endRace(){
  // stop timers
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
	state.sp = (state.sp||0) + baseSP;
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
    state.sp = (state.sp||0) + 50;
    state.wins = (state.wins||0) + 1;
    addLog(`<b class="ok">Congratulations! ${player.name} won 1st place!<br>Earned ${state.fame} Fame<br>Earned ${state.sp} SP<br>${gainsHtml}</b>`);
  } else if(place === 2){
    state.fame = (state.fame || 0) + Math.round(baseFame * 0.75);
	state.losses = (state.losses||0) + 1;
    state.sp = (state.sp||0) + (baseSP * 0.5);
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
    state.sp = (state.sp||0) + 25;
    addLog(`<b class="ok">${player.name} finished 2nd place! Nice!<br>Earned ${state.fame} Fame<br>Earned ${state.sp} SP<br>${gainsHtml}</b>`);
  } else if(place === 3){
    state.fame = (state.fame || 0) + Math.round(baseFame * 0.5);
	state.losses = (state.losses||0) + 1;
    state.sp = (state.sp||0) + (baseSP * 0.2);
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
    state.sp = (state.sp||0) + 10;
    addLog(`<b class="ok">${player.name} won 3rd place! Good job!<br>Earned ${state.fame} Fame<br>Earned ${state.sp} SP<br>${gainsHtml}<br></b>`);
  } else if(typeof place === 'number' && place > 3 && place <= 8) {
    state.losses = (state.losses||0) + 1;
	state.sp = (state.sp||0) + (baseSP * 0.2);
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
    addLog(`<span class="warn">${player.name} finished ${place}th place.<br>Earned ${state.sp} SP<br>${gainsHtml}</span>`);
  } else if (typeof place === 'number' && place > 8 && place <= 12) {
	state.fame = (state.fame || 0) - 50;
	state.sp = (state.sp||0) + (baseSP * 0.1);
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
    addLog(`<span class="warn">${player.name} finished ${place}th place.<br>Lost 50 Fame<br>Earned ${state.sp} SP<br>${gainsHtml}</span>`);
  } else {
    if(typeof place === 'number'){
      state.fame = (state.fame || 0) - 100;
	  state.sp = (state.sp||0) + (baseSP * 0.1);
      state.losses = (state.losses||0) + 1;
      addLog(`<span class="warn">${player.name} finished ${place}th place. Better luck next time...<br>Lost 100 Fame<br>Earned ${state.sp} SP</span>`);
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
  
  try{ AudioManager.stopRaceAndResumeTitle(); }catch(e){ console.warn("AudioManager resume failed", e); }

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
function useActiveById(id){
  if(!raceState || !raceState.running){ addLog("Active ability can only be used during a race."); return; }
  const a = ABILITIES.actives.find(x=>x.id===id);
  const nowTs = Date.now()/1000;
  const curRaceName = raceState && raceState.race && raceState.race.name;
  const inMongolDerby = curRaceName === "Mongol Derby";

  if(!inMongolDerby){
	if(state.playerAbilityLastUsedRace && state.playerAbilityLastUsedRace === curRaceName){
		addLog(`<span class="warn">You're too exhausted to do that again...</span>`);
    return;
	}
  } else {
  if(state.playerAbilityLastUsed && (nowTs - state.playerAbilityLastUsed) < 60){
    const remain = Math.ceil(60 - (nowTs - state.playerAbilityLastUsed));
	  addLog(`<span class="warn">Ability on Cooldown: ${remain}s left.</span>`);
	return;
  }
}

state.playerAbilityLastUsed = Date.now()/1000;
state.playerAbilityLastUsedRace = curRaceName;
saveState();

  if(!a) return;
  if(state.sp < a.cost){ addLog("Not enough SP"); return; }
  state.sp -= a.cost;
  const player = raceState.field.find(f=>f.isPlayer);
  if(!player) return;
  // Implement each active's primary effect
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
      player._mods.redshift = { ms, expires: rs.time + 5 };
	  try{ _applyWitsScalingToMod(r._mods.redshift); }catch(e){}
      player.maxSpeed += ms;
      addLog(`<div class="warn">Red Shift Activated!</div>`);
	  const delayMs = Math.max(0, Math.round((player._mods.redshift.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.redshift){ player.maxSpeed -= player._mods.redshift.ms; delete player._mods.redshift; } }, 5000);
    addLog(`<span id="ok">Red Shift Activated!.</span>`);
  } else if(a.fn === "swing"){
      if(!player.reachedMiddle) return;
      const ms = player.maxSpeed * 0.12;
      const ac = player.acc * 0.12;
      player._mods.swing = { ms, ac, expires: rs.time + 9 };
	  try{ _applyWitsScalingToMod(r._mods.swing); }catch(e){}
      player.maxSpeed += ms; player.acc += ac;
      addLog(`<div class="ok">Swinging Maestro Activated!</div>`);
	  const delayMs = Math.max(0, Math.round((player._mods.swing.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.swing){ player.maxSpeed -= player._mods.swing.ms; player.acc -= player._mods.swing.ac; delete player._mods.swing; } }, 9000);
  } else if(a.fn === "furtherBeyond"){
    const rank = getCurrentRank(raceState, player);
    if(rank === 1){
      const __st = (r.staminaMax * 0.05) * _witsEffectMult();
	  r.stamina = clamp(r.stamina + __st, 0, r.staminaMax);
      const ms = player.maxSpeed * 0.05; const ac = player.acc * 0.05;
      player._mods.Further = {ms,ac,expires: raceState.time + 4};
	  try{ _applyWitsScalingToMod(r._mods.Further); }catch(e){}
      player.maxSpeed += ms; player.acc += ac;
	  const delayMs = Math.max(0, Math.round((player._mods.Further.expires - raceState.time) * 1000));
      setTimeout(()=>{ if(player._mods && player._mods.Further){ player.maxSpeed -= player._mods.Further.ms; player.acc -= player._mods.Further.ac; delete player._mods.Further; } }, 4000);
      addLog(`<span id="ok">Must Go Even Further Beyond! Activated.</span>`);
    } else addLog(`<span id="ok">Must Go Even Further Beyond! Activated.</span>`);
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
    } else addLog(`<span id="ok">Gotcha! Activated.</span>`);
  }
  saveState(); refreshPlayerUI();
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
  el("stopRaceBtn").addEventListener("click", ()=> { if(raceTickHandle){ clearInterval(raceTickHandle); raceTickHandle=null;} if(commentaryHandle){clearInterval(commentaryHandle);commentaryHandle=null;} if(raceState) raceState.running=false; addLog("Race stopped."); el("enterRaceBtn").style.display = ""; });
  el("resetRaceBtn").onclick = resetRace;

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

function resetRace(){
  if (!raceState) return;
  clearInterval(raceState.interval);
  raceState.interval = null;
  raceState.running = false;
  raceState.finished = false;
  raceState.tick = 0;
  for (const r of raceState.field){
    r.progress = 0;
    r.finished = false;
    r.stamina = r.staminaMax;
  }
  state.losses = (state.losses||0) + 1;
  updateRaceUI();
}

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
		    playBtnMs = 1330;
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

  // optional: hide the custom cursor on mobile small screens (touch-only)
  function detectTouchOnlyAndHideCursor() {
    // if device has no fine pointer, hide the custom cursor (touch UX)
    const mq = window.matchMedia('(pointer: coarse) and (hover: none)');
    if (mq.matches) {
      // hide native cursor is already set, but hide custom cursor element
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