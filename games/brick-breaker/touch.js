function attachG49Controls(game){
 const runner=game.runner,canvas=runner.canvas;
 document.getElementById('instructions').addEventListener('click',()=>{if(game.is('menu'))game.play();});
 canvas.style.touchAction='none';
 const place=e=>{const b=canvas.getBoundingClientRect();game.paddle.place((e.clientX-b.left)*canvas.width/b.width-game.paddle.w/2);};
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;canvas.setPointerCapture(e.pointerId);place(e);if(game.is('menu'))game.play();});
 canvas.addEventListener('pointermove',e=>{if(canvas.hasPointerCapture(e.pointerId))place(e);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)runner.stop();else runner.start();});
}

Game.ready(function(){window.g49Game=Game.start("canvas",Breakout);attachG49Controls(window.g49Game);});
