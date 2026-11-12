// Direct-message protection. It limits unsolicited inbound DMs without hiding basic commands.
const db = require('../lib/db');
const { brandedReply, usageGuide } = require('../lib/brand');
const { isPrimaryOwner } = require('../lib/permissions');
const recent = new Map();
const flags = ['antidm','antidmlink','antidmspam','antidmflood','antidmunknown'];
function ownerOnly(ctx) { return isPrimaryOwner(ctx.sender) ? null : brandedReply('ACCESS DENIED',['⛔ Access Denied — Owner Only.']); }
function toggle(name,label) {
  return { category:'anti', usage:'.'+name+' on|off', example:'.'+name+' on', async run(ctx) {
    const denied=ownerOnly(ctx); if(denied)return denied;
    const value=String(ctx.args[0]||'').toLowerCase();
    if(value!=='on'&&value!=='off')return usageGuide(name,'.'+name+' on|off','.'+name+' on');
    db.set('settings','dm:'+name,value==='on');
    return brandedReply(label,[label+' is now '+value.toUpperCase()+'.']);
  }};
}
function checkDirectMessage(ctx) {
  if(ctx.isGroup || isPrimaryOwner(ctx.sender)) return false;
  if(!db.get('settings','dm:antidm',false)) return false;
  const text=String(ctx.rawText||'');
  // Keep basic command access available in private chat.
  if(text.startsWith('.') && /^\.(menu|help|ping|alive|uptime|owner|channel|vv)(\s|$)/i.test(text)) return false;
  if(db.get('settings','dm:antidmunknown',false)) return true;
  if(db.get('settings','dm:antidmlink',false) && /https?:\/\/|www\./i.test(text)) return true;
  const now=Date.now(), key=ctx.sender;
  const state=recent.get(key)||{times:[],lastText:'',repeat:0};
  state.times=state.times.filter(t=>now-t<10000);state.times.push(now);
  if(text && text===state.lastText)state.repeat+=1;else state.repeat=0;
  state.lastText=text;recent.set(key,state);
  if(db.get('settings','dm:antidmspam',false)&&state.repeat>=2)return true;
  if(db.get('settings','dm:antidmflood',false)&&state.times.length>6)return true;
  return false;
}
const commands={
 antidm:toggle('antidm','ANTI-DM SHIELD'),
 antidmlink:toggle('antidmlink','ANTI-DM LINKS'),
 antidmspam:toggle('antidmspam','ANTI-DM REPEATED MESSAGES'),
 antidmflood:toggle('antidmflood','ANTI-DM FLOOD'),
 antidmunknown:toggle('antidmunknown','ANTI-DM UNKNOWN SENDERS'),
 vv:{category:'tools',usage:'.vv',example:'.vv',async run(){return brandedReply('VIEW-ONCE PRIVACY',['View-once media is designed to remain temporary. This bot does not bypass or secretly retain it.']);}}
};
module.exports = { ...commands };
Object.defineProperty(module.exports, 'checkDirectMessage', { value: checkDirectMessage, enumerable: false });
