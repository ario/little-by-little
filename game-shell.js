const frame=document.getElementById('game-frame'),choices=document.getElementById('game-choices'),error=document.getElementById('game-error');
const games={'light-tiles':'Light Tiles','brick-breaker':'Brick Breaker'};
const local=false;
function show(){const id=location.hash.slice(1);frame.removeAttribute('src');frame.hidden=!games[id];choices.hidden=!!games[id];document.getElementById('game-name').textContent=games[id]||'Play time!';if(games[id])frame.src=`games/${id}/index.html`;}
async function command(path,body){error.textContent='';try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error('Could not open that. Please try again.');}catch(e){error.textContent=e.message;}}
document.getElementById('games-back').onclick=()=>{location.hash='';};
document.getElementById('apps-back').onclick=()=>local?command('/api/game/menu',{}):location.assign('./');
for(const b of document.querySelectorAll('[data-game]'))b.onclick=()=>{if(b.dataset.game==='sky-hopper'){if(local)command('/api/game/open',{game:'sky-hopper'});else location.assign('https://ario.github.io/sky-hopper/');}else location.hash=b.dataset.game;};
addEventListener('hashchange',show);show();
