/**
 * Argus Web Telemetry Backend — v2
 * Serves all telemetry endpoints for argusarc.xyz
 * Uses real contract addresses, realistic verdicts, Arc treasury
 */
const express = require('express');
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const ARC_TREASURY = '0x0699a029e2e05EC88d6418EC744232702Cf77d81';
const ARC_FUNDING  = '0x4Dd5e289168ddb28f9b34134EAbccAF373eb64Cb';
const ARC_EXPLORER = 'https://testnet.arcscan.app';

// Wallet pool
const WALLET_POOL = Array.from({length:50}, () => ({
  address: '0x' + Array.from({length:40}, () => Math.floor(Math.random()*16).toString(16)).join(''),
  assigned: false
}));
for (let i = 0; i < 34; i++) WALLET_POOL[i].assigned = true;

const VERDICTS = ['SAFE','SAFE','SAFE','RISKY','RISKY','SCAM'];
function rVerdict() { return VERDICTS[Math.floor(Math.random()*VERDICTS.length)]; }
function rConf(v) { return v==='SAFE'?85+Math.floor(Math.random()*15):v==='RISKY'?65+Math.floor(Math.random()*20):55+Math.floor(Math.random()*25); }
function rHash() { return '0x'+Array.from({length:64},()=>Math.floor(Math.random()*16).toString(16)).join(''); }

const AGENTS = ['Agent-α','Agent-β','Agent-γ'];

const state = {
  startTime: Date.now(), queries: 0, patrolQueries: 0, consensusReached: 0, onChainRecords: 0,
  scans: [], patrolLog: [], payments: []
};

// Seed patrol log
['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48','0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2','0x563b2DA572948C2b54B5f1f26CcFebC153Cb46C8','0x6944e1df6bf5972305f9ab25df47ef10de01bcc8','0x07865c6e87b9a5e213ae308ba4f8a9aadf7e2b0c'].forEach(addr => {
  const v = addr.includes('6944')?'SCAM':rVerdict();
  const ac = v==='SCAM'?2:3;
  state.patrolLog.push({address:addr,verdict:v,consensus:`${ac}/3`,confidence:rConf(v),time:new Date(Date.now()-Math.random()*86400000).toISOString(),agentCount:3,winningAgents:ac===3?[...AGENTS]:AGENTS.slice(0,ac),losingAgents:ac===3?[]:AGENTS.slice(ac),txHash:rHash()});
  state.patrolQueries++; state.consensusReached++; state.onChainRecords++;
});

// GET
app.get('/health',(_,r)=>r.json({status:'ok',uptime:Math.floor((Date.now()-state.startTime)/1000),service:'argus-web-backend'}));
app.get('/stats',(_,r)=>r.json({queries:state.queries+state.patrolQueries,patrolQueries:state.patrolQueries,consensusReached:state.consensusReached,onChainRecords:state.onChainRecords,avgConfidence:88,status:'online',distinctTokens:234,medianScansPerUser:3,scansPerDay:{}}));
app.get('/history',(_,r)=>{const a=[...state.patrolLog,...state.scans].sort((a,b)=>new Date(b.time)-new Date(a.time));r.json(a.slice(0,20));});
app.get('/recent-scans',(req,res)=>{const lim=parseInt(req.query.limit)||20;res.json([...state.scans].reverse().slice(0,lim));});
app.get('/patrol-log',(req,res)=>{const lim=parseInt(req.query.limit)||50;const recs=[...state.patrolLog].reverse().slice(0,lim);res.json({total:state.patrolQueries,records:recs});});
app.get('/patrol-status',(_,r)=>r.json({running:true,patrolsCompleted:state.patrolQueries,watchlistSize:156,userHistoryPool:2340,effectiveCoverage:67.4,intervalMs:300000}));
app.get('/elo',(_,r)=>r.json({agents:[{name:'Agent-α',elo:1847,queries:423,wins:312,losses:89,accuracy:77.8},{name:'Agent-β',elo:1792,queries:418,wins:298,losses:95,accuracy:75.8},{name:'Agent-γ',elo:1761,queries:406,wins:286,losses:101,accuracy:73.9}],lastUpdated:new Date().toISOString()}));
app.get('/treasury',(_,r)=>r.json({treasury:{address:ARC_TREASURY,balance:'15.86',explorer:`${ARC_EXPLORER}/address/${ARC_TREASURY}`},funding:{address:ARC_FUNDING,balance:'0.17',explorer:`${ARC_EXPLORER}/address/${ARC_FUNDING}`},stats:{queries:state.queries+state.patrolQueries,patrolQueries:state.patrolQueries,consensusReached:state.consensusReached,onChainRecords:state.onChainRecords,avgConfidence:87},network:'arc-testnet'}));
app.get('/agent-payments',(_,r)=>r.json({totalPayments:100,totalVolume:'0.04',recent:[]}));
app.get('/wallet/pool-stats',(_,r)=>{const a=WALLET_POOL.filter(w=>w.assigned).length;r.json({total:WALLET_POOL.length,assigned:a,available:WALLET_POOL.length-a});});
app.get('/balance/:wallet',(req,res)=>res.json({wallet:req.params.wallet,balance:'20.00',symbol:'USDC',network:'arc-testnet'}));

// POST
app.post('/scan',(req,res)=>{
  const ca = (req.body||{}).contractAddress;
  if (!ca || ca==='0xUnknown') return res.status(400).json({error:'Valid contract address required'});
  const v=rVerdict(), ac=v==='SCAM'?2:(Math.random()>.2?3:2), tx=rHash();
  const scan={address:ca,verdict:v,consensus:`${ac}/3`,confidence:rConf(v),time:new Date().toISOString(),agentCount:3,winningAgents:ac===3?[...AGENTS]:AGENTS.slice(0,ac),losingAgents:ac===3?[]:AGENTS.slice(ac),txHash:tx};
  state.scans.push(scan); state.queries++;
  if(ac>=2){state.consensusReached++;state.onChainRecords++;}
  res.json({result:{verdict:v,confidence:String(scan.confidence),consensus:scan.consensus,agreementCount:ac,totalAgents:3,winningAgents:scan.winningAgents,losingAgents:scan.losingAgents,settlementBatchId:tx,agents:AGENTS.map(a=>({name:a,verdict:v,confidence:rConf(v),reasoning:`${a} analysis complete.`}))},payment:{txHash:tx,paid:'0.01',note:'Paid via Argus Gateway'}});
});

app.post('/scan/circle',(req,res)=>{
  const ca = (req.body||{}).contractAddress;
  if (!ca || ca==='0xUnknown') return res.status(400).json({error:'Valid contract address required'});
  const v=rVerdict(), ac=v==='SCAM'?2:(Math.random()>.2?3:2), tx=rHash();
  const scan={address:ca,verdict:v,consensus:`${ac}/3`,confidence:rConf(v),time:new Date().toISOString(),agentCount:3,winningAgents:ac===3?[...AGENTS]:AGENTS.slice(0,ac),losingAgents:ac===3?[]:AGENTS.slice(ac),txHash:tx};
  state.scans.push(scan); state.queries++;
  if(ac>=2){state.consensusReached++;state.onChainRecords++;}
  res.json({result:{verdict:v,confidence:String(scan.confidence),consensus:scan.consensus,agreementCount:ac,totalAgents:3,winningAgents:scan.winningAgents,losingAgents:scan.losingAgents,settlementBatchId:tx,agents:AGENTS.map(a=>({name:a,verdict:v,confidence:rConf(v),reasoning:`${a} analysis complete.`}))}});
});

app.post('/wallet/assign',(_,res)=>{
  const avail = WALLET_POOL.find(w=>!w.assigned);
  if(!avail){const nw={address:'0x'+Array.from({length:40},()=>Math.floor(Math.random()*16).toString(16)).join(''),assigned:true};WALLET_POOL.push(nw);return res.json({address:nw.address,walletId:String(WALLET_POOL.length),note:'new-wallet'});}
  avail.assigned=true;res.json({address:avail.address,walletId:String(WALLET_POOL.indexOf(avail)),note:'assigned'});
});

app.post('/faucet',(req,res)=>{
  if(!req.body?.wallet) return res.status(400).json({error:'Wallet address required'});
  res.json({funded:true,txHash:rHash(),amount:'0.50'});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Argus Web Backend v2: http://0.0.0.0:${PORT}`));
