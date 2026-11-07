(() => {
  const canvas = document.getElementById('world');
  const W = 1000, H = 560;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const species = [
    {id:'ember',name:'Emberling',kind:'Cinder dragon',emoji:'🐲',color:'#cb7758',wing:'#e8a26b',accent:'#f2ce83',rarity:'COMMON',bio:'A bright-hearted little spark with a talent for warming cold mornings.'},
    {id:'moss',name:'Mosswing',kind:'Grove dragon',emoji:'🐉',color:'#77966c',wing:'#aec295',accent:'#d9c878',rarity:'UNCOMMON',bio:'A gentle forest keeper whose wings carry the scent of rain and pine.'},
    {id:'glimmer',name:'Glimmerfin',kind:'River dragon',emoji:'🐲',color:'#7195a0',wing:'#a9c7c0',accent:'#e3d28d',rarity:'RARE',bio:'A shy creek-dancer, said to follow the moonlit bends of the river.'},
    {id:'frost',name:'Frosthorn',kind:'Mountain dragon',emoji:'🐉',color:'#8a8ca8',wing:'#b7bdd3',accent:'#e6d7b3',rarity:'RARE',bio:'A quiet highland wanderer with a heart softer than fresh snow.'},
    {id:'sun',name:'Sunscale',kind:'Dawn dragon',emoji:'🐲',color:'#d2a256',wing:'#e8c984',accent:'#f4e3a9',rarity:'LEGENDARY',bio:'A radiant wanderer glimpsed only where day first touches the hills.'}
  ];
  const forage = [
    {x:215,y:265,type:'bloom',name:'Meadow blooms',color:'#d5a25e',taken:false},
    {x:795,y:345,type:'bloom',name:'Meadow blooms',color:'#c87975',taken:false},
    {x:480,y:125,type:'bloom',name:'Meadow blooms',color:'#d4b768',taken:false},
    {x:880,y:188,type:'wood',name:'Fallen branches',color:'#8c6844',taken:false},
    {x:115,y:425,type:'stone',name:'Mossy stones',color:'#929b87',taken:false},
    {x:680,y:470,type:'bloom',name:'Meadow blooms',color:'#ba83a1',taken:false}
  ];
  const wild = [
    {species:'ember',x:600,y:310,trust:0}, {species:'moss',x:340,y:230,trust:0},
    {species:'glimmer',x:760,y:205,trust:0}, {species:'frost',x:440,y:430,trust:0}
  ];
  const castles=[
    {id:'greenstead',name:'Greenstead Hall',style:'timber',unlock:'Your first home',costW:0,costS:0},
    {id:'stonewatch',name:'Stonewatch Keep',style:'stone',unlock:'Build a cottage',costW:10,costS:12,needs:'cottage'},
    {id:'moonspire',name:'Moonspire Castle',style:'moon',unlock:'Bond with 3 dragons',costW:18,costS:18,needs:'dragons'},
    {id:'wildflower',name:'Wildflower Court',style:'garden',unlock:'Build a stable',costW:14,costS:8,needs:'stable'},
    {id:'groundup',name:'Founders’ Keep',style:'custom',unlock:'Build a forge',costW:0,costS:0,needs:'forge'}
  ];
  const defaultCharacter={name:'Alder',design:'wayfarer',skin:'#d7ae8c',hair:'#503b34',eyes:'#536d69',outfit:'#6e8462',cloak:'#405c4b',boots:'#544437',accent:'#d6bd78',cheeks:'#c77873',flower:'#d88c9d',hairStyle:'Waves',accessory:'hood',glasses:false};
  const initial = {player:{x:500,y:330},character:{...defaultCharacter},owned:[],companion:null,berries:3,wood:8,stone:5,nets:2,sigils:2,dragonProgress:{},forageCount:0,buildings:[],castle:'greenstead',homes:['greenstead'],castleLevel:0,armor:[],equipped:null,furniture:[],placedFurniture:[],rewarded:[],day:1};
  let state;
  try { state = {...initial,...JSON.parse(localStorage.getItem('mythwyld-save')||'{}')}; state.player={...initial.player,...(state.player||{})}; state.character={...defaultCharacter,...(state.character||{})}; }
  catch { state={...initial,player:{...initial.player},character:{...defaultCharacter}}; }
  ['owned','buildings','armor','furniture','placedFurniture','rewarded','homes'].forEach(key=>{if(!Array.isArray(state[key]))state[key]=initial[key].slice()});
  state.homes=Array.from(new Set(['greenstead',...(state.homes||[]),...(state.castle&&state.castle!=='greenstead'?[state.castle]:[])]));
  state.castleLevel=Number.isFinite(state.castleLevel)?state.castleLevel:0;
  wild.forEach(d=>Object.assign(d,state.dragonProgress?.[d.species]||{}));
  for(let i=wild.length-1;i>=0;i--)if(state.owned.includes(wild[i].species))wild.splice(i,1);
  const keys = new Set(); let zoom=1, buildChoice=null, toastTimer, lastTime=0, sound=false, netCast=null;
  let pointerTarget=null;
  function save(){state.dragonProgress=Object.fromEntries(wild.map(d=>[d.species,{trust:d.trust,caught:!!d.caught}]));localStorage.setItem('mythwyld-save',JSON.stringify(state)); updateUI();}
  function toast(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500)}
  function getSpecies(id){return species.find(s=>s.id===id)}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
  function nearestDragon(){return wild.filter(d=>!state.owned.includes(d.species)).sort((a,b)=>distance(a,state.player)-distance(b,state.player))[0]}
  function closeForage(){return forage.filter(f=>!f.taken).sort((a,b)=>distance(a,state.player)-distance(b,state.player))[0]}
  function updateUI(){
    document.getElementById('berry-count').textContent=state.berries;
    document.getElementById('wood-count').textContent=state.wood;
    document.getElementById('stone-count').textContent=state.stone;
    document.getElementById('sigil-count').textContent=state.sigils;
    document.getElementById('net-count').textContent=state.nets;
    document.getElementById('dragon-count').textContent=state.owned.length;
    document.getElementById('day-count').textContent=String(state.day).padStart(2,'0');
    const avatar=document.getElementById('character-button');if(avatar)avatar.textContent=(state.character?.name||'A').trim().charAt(0).toUpperCase()||'A';
    state.sigils=Number.isFinite(state.sigils)?state.sigils:2;state.nets=Number.isFinite(state.nets)?state.nets:2;state.castle=state.castle||'greenstead';state.castleLevel=state.castleLevel||0;state.furniture=state.furniture||[];state.placedFurniture=state.placedFurniture||[];
    document.getElementById('castle-name').textContent=castles.find(c=>c.id===state.castle)?.name||'Greenstead Hall';
    const companion=getSpecies(state.companion);
    const art=document.getElementById('companion-art');
    art.textContent=companion?companion.emoji:'🐉'; art.classList.toggle('bob',!!companion);
    document.getElementById('companion-name').textContent=companion?companion.name:'No companion yet';
    document.getElementById('companion-subtitle').textContent=companion?companion.kind+' · Your kindred':'Your first dragon is out there.';
    document.getElementById('companion-rarity').textContent=companion?companion.rarity:'WILD';
    document.getElementById('companion-caption').textContent=companion?'Your bond grows every day':'A bond is waiting to begin';
    const dragon=nearestDragon(), nearD=dragon&&distance(dragon,state.player)<80, node=closeForage(), nearF=node&&distance(node,state.player)<57;
    const btn=document.getElementById('interact-label'), note=document.getElementById('button-note'), bond=document.getElementById('bond-wrap');
    if(buildChoice){btn.textContent='Place '+buildChoice.name;note.textContent='Tap an open spot on the meadow';}
    else if(nearD&&netCast?.dragon===dragon){btn.textContent='Casting capture net…';note.textContent='Hold steady while the net flies';}
    else if(nearD&&!dragon.caught){btn.textContent='Cast capture net';note.textContent=state.nets>0?`${state.nets} woven ${state.nets===1?'net':'nets'} ready · capture gently`:'No nets left · weave one in the Armory';}
    else if(nearD){btn.textContent=dragon.trust>=2?'Welcome your kindred':'Offer a wild berry';note.textContent=dragon.trust>=2?'Your new friend is ready to join you':'A captured dragon trusts you with each treat';}
    else if(nearF){btn.textContent=node.type==='bloom'?'Gather meadow blooms':'Gather '+node.name.toLowerCase();note.textContent='A little forage for your pack';}
    else {btn.textContent='Explore the meadow';note.textContent=dragon?'Walk close to a wild dragon to cast your net':'Wander the meadow to find wild dragons';}
    bond.style.display=nearD?'block':'none';
    if(nearD){document.getElementById('bond-label').textContent=dragon.caught?'TRUST':'CAPTURE';document.getElementById('bond-text').textContent=dragon.caught?(dragon.trust>=2?'Ready to bond':`${dragon.trust} of 2 treats`):'A safe catch, then earn its trust';document.getElementById('bond-fill').style.width=dragon.caught?Math.min(100,dragon.trust/2*100)+'%':'0%';}
    updateQuest(); renderDiscoveries();
  }
  function updateQuest(){
    const dragon=state.owned.length>0, gathered=state.forageCount>=3, cottage=state.buildings.some(b=>b.id==='cottage');
    const steps=[dragon,gathered,cottage];
    ['step-dragon','step-forage','step-build'].forEach((id,i)=>{const el=document.getElementById(id);el.classList.toggle('done',steps[i]);el.textContent=steps[i]?'✓':String(i+1)});
    const done=steps.filter(Boolean).length;document.getElementById('quest-progress').textContent=`${done} / 3 complete`;document.getElementById('quest-bar').style.width=(done/3*100)+'%';
    if(dragon&&!state.rewarded.includes('dragon')){state.rewarded.push('dragon');state.berries+=3;toast('Kindred found! +3 wild berries');}
    if(gathered&&!state.rewarded.includes('forage')){state.rewarded.push('forage');state.wood+=6;toast('Foraging done! +6 timber');}
    if(cottage&&!state.rewarded.includes('cottage')){state.rewarded.push('cottage');if(!state.armor.includes('mantle'))state.armor.push('mantle');toast('Your first haven! Forest mantle unlocked');}
    localStorage.setItem('mythwyld-save',JSON.stringify(state));
  }
  function renderDiscoveries(){
    const el=document.getElementById('discovery-strip');
    el.innerHTML=species.slice(0,4).map(s=>`<div class="discovery-card ${state.owned.includes(s.id)?'owned':''}"><div class="discovery-art">${s.emoji}</div><div class="discovery-copy"><b>${s.name}</b><small>${s.kind}</small></div><span class="discovery-state">${state.owned.includes(s.id)?'✦ KINDRED':'UNDISCOVERED'}</span></div>`).join('');
  }
  function interact(){
    if(buildChoice){toast('Choose an open spot in the meadow');return;}
    const dragon=nearestDragon();
    if(dragon&&distance(dragon,state.player)<80){
      if(netCast?.dragon===dragon){toast('Your capture net is still settling');return;}
      if(!dragon.caught){
        if(state.nets<1){toast('No nets left. Weave a new one in the Armory with 2 timber and 1 stone.');return;}
        state.nets--;dragon.caught=true;netCast={dragon,started:performance.now(),origin:{...state.player}};
        toast(`${getSpecies(dragon.species).name} is safely caught! Offer berries to earn its trust.`);save();return;
      }
      if(state.berries<1){toast('You need a wild berry to offer. Forage among the flowers.');return;}
      state.berries--; dragon.trust++;
      if(dragon.trust>=2){const s=getSpecies(dragon.species);state.owned.push(s.id);state.companion=state.companion||s.id;wild.splice(wild.indexOf(dragon),1);toast(`${s.name} trusts you. A new kindred!`);}
      else toast(`${getSpecies(dragon.species).name} accepts your treat. Trust is growing…`);
      save();return;
    }
    const node=closeForage();
    if(node&&distance(node,state.player)<57){
      node.taken=true;
      if(node.type==='bloom'){state.berries+=2;state.forageCount++;toast('Gathered meadow blooms · +2 berries');}
      else if(node.type==='wood'){state.wood+=3;toast('Gathered fallen branches · +3 timber');}
      else {state.stone+=2;toast('Found mossy stones · +2 stone');}
      save();return;
    }
    toast('Wander closer to a dragon or a forage patch');
  }
  function movePlayer(dx,dy,dt){
    const speed=170*dt;let x=0,y=0;
    if(keys.has('ArrowUp')||keys.has('w')||keys.has('W')||keys.has('up'))y--;
    if(keys.has('ArrowDown')||keys.has('s')||keys.has('S')||keys.has('down'))y++;
    if(keys.has('ArrowLeft')||keys.has('a')||keys.has('A')||keys.has('left'))x--;
    if(keys.has('ArrowRight')||keys.has('d')||keys.has('D')||keys.has('right'))x++;
    if(pointerTarget){const tx=pointerTarget.x-state.player.x,ty=pointerTarget.y-state.player.y,dist=Math.hypot(tx,ty);if(dist<8)pointerTarget=null;else{x+=tx/dist;y+=ty/dist;}}
    const mag=Math.hypot(x,y);if(mag){state.player.x=Math.max(50,Math.min(W-50,state.player.x+x/mag*speed));state.player.y=Math.max(80,Math.min(H-40,state.player.y+y/mag*speed));}
  }
  function roundedRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
  function drawBackground(){
    const ground=ctx.createLinearGradient(0,0,0,H);ground.addColorStop(0,'#9eb28b');ground.addColorStop(.42,'#91a879');ground.addColorStop(1,'#718c65');ctx.fillStyle=ground;ctx.fillRect(0,0,W,H);
    // Layers of hazy hills add depth behind the meadow.
    let hill=ctx.createLinearGradient(0,80,0,235);hill.addColorStop(0,'#66866d');hill.addColorStop(.48,'#7f9975');hill.addColorStop(1,'#91a77e00');ctx.fillStyle=hill;ctx.beginPath();ctx.moveTo(0,130);ctx.quadraticCurveTo(120,77,230,131);ctx.quadraticCurveTo(355,62,480,125);ctx.quadraticCurveTo(620,62,743,128);ctx.quadraticCurveTo(870,77,1000,132);ctx.lineTo(1000,235);ctx.lineTo(0,235);ctx.fill();
    // Broad, irregular sunlit clearing blends into the surrounding grass.
    const clearing=ctx.createRadialGradient(500,290,80,500,290,620);clearing.addColorStop(0,'#b2c18b88');clearing.addColorStop(.72,'#a6b98166');clearing.addColorStop(1,'#849b6c00');ctx.fillStyle=clearing;ctx.beginPath();ctx.ellipse(500,300,590,420,-.04,0,Math.PI*2);ctx.fill();
    // Winding, worn earth trail with shaded edges.
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#8c8a68';ctx.lineWidth=55;ctx.beginPath();ctx.moveTo(-45,500);ctx.bezierCurveTo(175,450,190,355,349,364);ctx.bezierCurveTo(482,372,500,498,680,478);ctx.bezierCurveTo(836,458,815,326,1040,324);ctx.stroke();
    const path=ctx.createLinearGradient(0,340,0,505);path.addColorStop(0,'#c7bd98');path.addColorStop(.5,'#d0c6a0');path.addColorStop(1,'#b7ae88');ctx.strokeStyle=path;ctx.lineWidth=47;ctx.beginPath();ctx.moveTo(-45,500);ctx.bezierCurveTo(175,450,190,355,349,364);ctx.bezierCurveTo(482,372,500,498,680,478);ctx.bezierCurveTo(836,458,815,326,1040,324);ctx.stroke();
    ctx.strokeStyle='#e2d7b1';ctx.lineWidth=1.5;ctx.setLineDash([3,8]);ctx.beginPath();ctx.moveTo(-45,500);ctx.bezierCurveTo(175,450,190,355,349,364);ctx.bezierCurveTo(482,372,500,498,680,478);ctx.bezierCurveTo(836,458,815,326,1040,324);ctx.stroke();ctx.setLineDash([]);
    // Shallow creek: dark banks, translucent water and broken highlights.
    ctx.fillStyle='#657f70';ctx.beginPath();ctx.moveTo(890,0);ctx.bezierCurveTo(840,72,920,91,868,151);ctx.bezierCurveTo(832,195,920,225,886,267);ctx.lineTo(1000,267);ctx.lineTo(1000,0);ctx.fill();
    const water=ctx.createLinearGradient(850,0,1000,100);water.addColorStop(0,'#86aaa0');water.addColorStop(.5,'#719a96');water.addColorStop(1,'#a0b7a0');ctx.fillStyle=water;ctx.beginPath();ctx.moveTo(897,0);ctx.bezierCurveTo(851,70,930,94,878,151);ctx.bezierCurveTo(843,197,929,225,895,267);ctx.lineTo(1000,267);ctx.lineTo(1000,0);ctx.fill();
    ctx.strokeStyle='#c4d2b7aa';ctx.lineWidth=2;for(let i=0;i<8;i++){const x=892+(i%3)*26,y=22+i*28;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+9,y-3,x+17,y+1);ctx.stroke();}
    // Thousands of tiny, fixed grass strokes create a tactile natural surface.
    for(let i=0;i<410;i++){const x=(i*137+31)%W,y=(i*83+17)%H;if((x>860&&y<267)||((x>350&&x<700)&&y>350&&y<510))continue;const tone=i%5;ctx.strokeStyle=tone===0?'#dce0b344':tone===1?'#526f4d38':'#eff0d022';ctx.lineWidth=tone===0?1.2:.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-1+(i%3),y-2-(i%4));ctx.stroke();}
    // Tree line and layered canopies frame the traversable meadow.
    const trees=[[45,105,1.2],[132,80,.92],[245,100,.88],[370,75,1.05],[536,83,.93],[675,93,1.2],[790,82,.94],[962,90,1.24],[60,198,.8],[148,159,.62],[830,147,.7],[961,202,.9],[35,326,.78],[955,394,.95],[90,519,1.1],[265,517,.78],[557,534,.9],[833,516,1.12],[946,502,.8],[165,280,.53],[933,310,.65]];
    trees.forEach(([x,y,s],i)=>drawTree(x,y,s,i));
    // Natural grass tufts and tiny flowers, deliberately scattered.
    for(let i=0;i<95;i++){const x=(i*271+92)%W,y=(i*149+197)%H;if(x>170&&x<850&&y>120&&y<490){const c=i%4;ctx.strokeStyle=c===0?'#71875d99':c===1?'#e5e0b899':'#536e4c66';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y-4-(i%3));ctx.moveTo(x,y);ctx.lineTo(x+2,y-3);ctx.stroke();if(c===0){ctx.fillStyle='#e4d59a';ctx.beginPath();ctx.arc(x+1,y-5,1.3,0,Math.PI*2);ctx.fill();}}}
  }
  function drawTree(x,y,s,i){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ctx.fillStyle='#4e5e43';ctx.beginPath();ctx.ellipse(1,14,9,4,0,0,Math.PI*2);ctx.fill();
    const bark=ctx.createLinearGradient(-5,0,5,0);bark.addColorStop(0,'#594e39');bark.addColorStop(.45,'#897451');bark.addColorStop(1,'#493f31');ctx.fillStyle=bark;ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(-3,-8);ctx.lineTo(-7,-15);ctx.lineTo(-4,-13);ctx.lineTo(0,-5);ctx.lineTo(5,-16);ctx.lineTo(4,-7);ctx.lineTo(6,9);ctx.closePath();ctx.fill();
    const colors=i%3===0?['#405f49','#537956','#759364']:i%3===1?['#496b4d','#628352','#829967']:['#446448','#587c50','#79915c'];
    const crown=ctx.createRadialGradient(-7,-22,2,0,-8,34);crown.addColorStop(0,colors[2]);crown.addColorStop(.58,colors[1]);crown.addColorStop(1,colors[0]);ctx.fillStyle=crown;ctx.beginPath();
    const rim=[];for(let n=0;n<20;n++){const a=n*Math.PI/10,r=21+((n*7+i*11)%9)-4;rim.push([Math.cos(a)*r,-9+Math.sin(a)*r*.77]);}
    rim.forEach(([px,py],n)=>{const next=rim[(n+1)%rim.length],mx=(px+next[0])/2,my=(py+next[1])/2;if(n===0)ctx.moveTo(mx,my);ctx.quadraticCurveTo(px,py,mx,my);});ctx.closePath();ctx.fill();
    const blobs=[[-10,-2,12],[-1,-10,14],[11,-4,12],[-8,-15,10],[6,-19,11],[0,2,10]];
    blobs.forEach(([bx,by,r],j)=>{const leaf=ctx.createRadialGradient(bx-r*.35,by-r*.45,1,bx,by,r*1.35);leaf.addColorStop(0,j%2?'#91a775':colors[2]);leaf.addColorStop(.42,colors[1]);leaf.addColorStop(1,colors[0]);ctx.fillStyle=leaf;ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fill();});
    // flecks of sunlight and leaf texture
    for(let n=0;n<9;n++){const a=n*2.4+i*.7,rx=Math.cos(a)*(7+(n%3)*3),ry=-9+Math.sin(a)*9;ctx.fillStyle=n%2?'#a1b47a66':'#314f3e44';ctx.beginPath();ctx.ellipse(rx,ry,1.8,1, a*.3,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function drawDragon(x,y,speciesId,scale=1){
    const s=getSpecies(speciesId);ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.fillStyle='#26352645';ctx.beginPath();ctx.ellipse(0,15,27,7,0,0,Math.PI*2);ctx.fill();
    const hide=ctx.createLinearGradient(-18,-16,18,14);hide.addColorStop(0,s.wing);hide.addColorStop(.38,s.color);hide.addColorStop(1,'#344537');
    // tapered tail with a small spade tip
    ctx.strokeStyle=hide;ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,3);ctx.bezierCurveTo(-30,12,-34,-6,-43,-4);ctx.stroke();ctx.fillStyle=s.accent;ctx.beginPath();ctx.moveTo(-42,-4);ctx.lineTo(-48,-9);ctx.lineTo(-48,0);ctx.closePath();ctx.fill();
    // far wing: jointed spars and translucent membrane
    ctx.fillStyle=s.wing+'cc';ctx.strokeStyle=s.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,-6);ctx.quadraticCurveTo(-15,-27,-34,-34);ctx.quadraticCurveTo(-31,-22,-36,-13);ctx.quadraticCurveTo(-27,-16,-23,-5);ctx.quadraticCurveTo(-15,-9,-10,3);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=s.color+'bb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-10,1);ctx.lineTo(-34,-33);ctx.moveTo(-14,-3);ctx.lineTo(-35,-14);ctx.moveTo(-21,-5);ctx.lineTo(-34,-23);ctx.stroke();
    // body, with softly modeled highlights
    ctx.fillStyle=hide;ctx.beginPath();ctx.ellipse(-1,1,21,13,-.1,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=s.accent+'88';ctx.lineWidth=1;for(let r=0;r<3;r++)for(let c=0;c<5;c++){const sx=-12+c*5,sy=-5+r*4;if((sx+1)*(sx+1)/400+(sy-1)*(sy-1)/169<.83){ctx.beginPath();ctx.arc(sx,sy,2.4,.15,2.65);ctx.stroke();}}
    // plated belly
    const belly=ctx.createLinearGradient(0,1,0,14);belly.addColorStop(0,s.accent);belly.addColorStop(1,'#8e7753');ctx.fillStyle=belly;ctx.beginPath();ctx.ellipse(3,7,11,6,.1,0,Math.PI);ctx.fill();ctx.strokeStyle='#725f48aa';ctx.lineWidth=.8;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-3+i*5,8);ctx.quadraticCurveTo(2+i*3,10,7+i*2,8);ctx.stroke();}
    // curved neck and expressive, horned head
    ctx.strokeStyle=hide;ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(9,-1);ctx.quadraticCurveTo(15,-13,16,-19);ctx.stroke();ctx.fillStyle=hide;ctx.beginPath();ctx.ellipse(20,-19,12,9,-.15,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(27,-18);ctx.quadraticCurveTo(34,-17,38,-13);ctx.lineTo(26,-10);ctx.closePath();ctx.fill();
    // brow, nostril, horn detail
    ctx.fillStyle=s.accent;ctx.beginPath();ctx.moveTo(15,-26);ctx.quadraticCurveTo(12,-34,12,-37);ctx.quadraticCurveTo(19,-31,21,-25);ctx.moveTo(24,-25);ctx.quadraticCurveTo(29,-33,31,-34);ctx.lineTo(29,-23);ctx.closePath();ctx.fill();
    ctx.fillStyle=s.wing;for(let i=0;i<4;i++){let px=-13+i*7;ctx.beginPath();ctx.moveTo(px,-8);ctx.lineTo(px+2,-16-(i%2)*3);ctx.lineTo(px+7,-7);ctx.closePath();ctx.fill();}
    // near wing adds a layered silhouette
    ctx.fillStyle=s.wing+'bb';ctx.strokeStyle=s.color;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-2,-5);ctx.quadraticCurveTo(-10,-23,-25,-27);ctx.quadraticCurveTo(-21,-15,-28,-8);ctx.quadraticCurveTo(-17,-11,-11,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=s.color+'99';ctx.beginPath();ctx.moveTo(-8,1);ctx.lineTo(-25,-26);ctx.moveTo(-15,-4);ctx.lineTo(-27,-9);ctx.stroke();
    // sturdy little legs and claws
    ctx.strokeStyle=hide;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-10,9);ctx.lineTo(-12,16);ctx.lineTo(-16,17);ctx.moveTo(8,9);ctx.lineTo(10,16);ctx.lineTo(14,17);ctx.stroke();ctx.strokeStyle=s.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-16,17);ctx.lineTo(-18,17);ctx.moveTo(14,17);ctx.lineTo(16,17);ctx.stroke();
    ctx.fillStyle='#241f1a';ctx.beginPath();ctx.ellipse(22,-21,1.7,1.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f3df9c';ctx.beginPath();ctx.arc(22,-21, .55,0,Math.PI*2);ctx.fill();ctx.fillStyle='#342c21';ctx.beginPath();ctx.arc(34,-15,1,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function drawPlayer(){
    const p=state.player,c=state.character||defaultCharacter;ctx.fillStyle='#24362832';ctx.beginPath();ctx.ellipse(p.x,p.y+13,14,5,0,0,Math.PI*2);ctx.fill();
    if(state.companion){drawDragon(p.x-28,p.y+2,state.companion,.55);}
    // Colors selected in Character Studio carry into the meadow avatar.
    ctx.fillStyle=c.boots;ctx.fillRect(p.x-6,p.y+6,5,8);ctx.fillRect(p.x+2,p.y+6,5,8);
    ctx.fillStyle=state.armor.includes('mantle')?'#657e61':c.cloak;ctx.beginPath();ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x-11,p.y+8);ctx.quadraticCurveTo(p.x,p.y+14,p.x+11,p.y+8);ctx.lineTo(p.x+5,p.y-10);ctx.closePath();ctx.fill();
    ctx.fillStyle=c.skin;ctx.beginPath();ctx.arc(p.x,p.y-12,7,0,Math.PI*2);ctx.fill();ctx.fillStyle=c.hair;ctx.beginPath();ctx.arc(p.x,p.y-15,7,Math.PI,Math.PI*2);ctx.lineTo(p.x+6,p.y-11);ctx.lineTo(p.x-6,p.y-11);ctx.fill();
    if(c.accessory==='horns'){ctx.fillStyle=c.accent;ctx.beginPath();ctx.moveTo(p.x-5,p.y-19);ctx.lineTo(p.x-8,p.y-25);ctx.lineTo(p.x-1,p.y-19);ctx.moveTo(p.x+5,p.y-19);ctx.lineTo(p.x+8,p.y-25);ctx.lineTo(p.x+1,p.y-19);ctx.fill();}
    else if(c.accessory==='circlet'||c.accessory==='flower crown'||c.accessory==='leaf crown'){ctx.fillStyle=c.accent;ctx.fillRect(p.x-6,p.y-20,12,2);}
    ctx.fillStyle=c.eyes;ctx.beginPath();ctx.arc(p.x+2,p.y-12,1,0,Math.PI*2);ctx.fill();
  }
  function drawForage(f){if(f.taken)return;ctx.save();ctx.translate(f.x,f.y);ctx.fillStyle='#33422a22';ctx.beginPath();ctx.ellipse(0,5,13,4,0,0,Math.PI*2);ctx.fill();if(f.type==='bloom'){for(let i=0;i<5;i++){ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(Math.cos(i*1.25)*4,Math.sin(i*1.25)*4,3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#e8cc72';ctx.beginPath();ctx.arc(0,0,2.4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#61734c';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(0,10);ctx.stroke();}else if(f.type==='wood'){ctx.strokeStyle=f.color;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-9,2);ctx.lineTo(7,-2);ctx.moveTo(-3,4);ctx.lineTo(10,1);ctx.stroke();}else{ctx.fillStyle=f.color;ctx.beginPath();ctx.ellipse(-4,1,5,3,-.4,0,Math.PI*2);ctx.ellipse(3,0,5,4,.3,0,Math.PI*2);ctx.fill();}ctx.restore();}
  function drawBuilding(b){ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='#3b3e2d38';ctx.beginPath();ctx.ellipse(0,19,43,12,0,0,Math.PI*2);ctx.fill();if(b.id==='cottage'){ctx.fillStyle='#b89c6d';ctx.fillRect(-31,-7,62,29);ctx.fillStyle='#725b44';ctx.beginPath();ctx.moveTo(-39,-6);ctx.lineTo(0,-39);ctx.lineTo(39,-6);ctx.closePath();ctx.fill();ctx.fillStyle='#e4cf9c';ctx.fillRect(-6,4,13,18);ctx.fillStyle='#8c7655';ctx.fillRect(-24,0,12,10);ctx.fillRect(12,0,12,10);ctx.strokeStyle='#d8c090';ctx.lineWidth=2;ctx.strokeRect(-24,0,12,10);ctx.strokeRect(12,0,12,10);}else if(b.id==='stable'){ctx.fillStyle='#9e8259';ctx.fillRect(-38,-5,76,28);ctx.fillStyle='#73583e';ctx.beginPath();ctx.moveTo(-43,-5);ctx.lineTo(-28,-28);ctx.lineTo(29,-28);ctx.lineTo(43,-5);ctx.closePath();ctx.fill();ctx.fillStyle='#e2d3ac';ctx.fillRect(-10,7,20,16);ctx.strokeStyle='#705638';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(0,23);ctx.stroke();}else{ctx.fillStyle='#83795f';ctx.fillRect(-26,-4,52,27);ctx.fillStyle='#5e5e4d';ctx.beginPath();ctx.moveTo(-32,-4);ctx.lineTo(0,-24);ctx.lineTo(32,-4);ctx.closePath();ctx.fill();ctx.fillStyle='#d18c56';ctx.beginPath();ctx.arc(0,12,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.arc(0,12,4,0,Math.PI*2);ctx.fill();}ctx.restore();}
  function drawHome(){
    const home=castles.find(c=>c.id===state.castle)||castles[0],x=105,y=270,level=home.id==='groundup'?Math.max(1,state.castleLevel):home.id==='greenstead'?1:2;
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#31402d55';ctx.beginPath();ctx.ellipse(0,20,45,11,0,0,Math.PI*2);ctx.fill();
    const wall=home.style==='stone'||home.style==='moon'?'#9c9b88':home.style==='garden'?'#c2af7d':'#b99b6a',roof=home.style==='moon'?'#53657a':home.style==='garden'?'#647c58':home.style==='stone'?'#686b64':'#765b42';
    if(home.style==='custom'&&state.castleLevel===1){ctx.fillStyle='#a89269';ctx.fillRect(-28,8,56,8);ctx.strokeStyle='#e2d2a6';ctx.lineWidth=2;ctx.strokeRect(-28,8,56,8);}
    else{ctx.fillStyle=wall;ctx.fillRect(-31,-12,62,31);ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(-39,-11);ctx.lineTo(0,-39);ctx.lineTo(39,-11);ctx.closePath();ctx.fill();ctx.fillStyle='#e1ca91';ctx.fillRect(-6,4,12,15);ctx.fillStyle='#60705a';ctx.fillRect(-23,-5,10,9);ctx.fillRect(13,-5,10,9);}
    if(level>1){ctx.fillStyle=wall;ctx.fillRect(-38,-31,13,39);ctx.fillRect(25,-31,13,39);ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(-40,-31);ctx.lineTo(-31,-48);ctx.lineTo(-23,-31);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(23,-31);ctx.lineTo(31,-48);ctx.lineTo(40,-31);ctx.closePath();ctx.fill();ctx.fillStyle='#e3ca89';ctx.fillRect(-34,-20,4,7);ctx.fillRect(29,-20,4,7);}
    if(home.style==='moon'){ctx.fillStyle='#d8cfaa';ctx.beginPath();ctx.arc(0,-31,6,0,Math.PI*2);ctx.fill();}
    if(home.style==='garden'){ctx.fillStyle='#d9b2a1';ctx.beginPath();ctx.arc(-35,-4,8,0,Math.PI*2);ctx.arc(36,-4,8,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function drawNet(x,y,r,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.strokeStyle='#f5ecd0';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,0,r,r*.48,-.18,0,Math.PI*2);ctx.stroke();for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*r/3,-r*.43);ctx.lineTo(i*r/3,r*.43);ctx.stroke();}for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-r*.96,i*r*.16);ctx.lineTo(r*.96,i*r*.16);ctx.stroke();}ctx.restore();}
  function drawWorld(){
    ctx.save();ctx.clearRect(0,0,W,H);ctx.scale(zoom,zoom);const offX=(W-W/zoom)/2,offY=(H-H/zoom)/2;ctx.translate(-offX,-offY);drawBackground();
    forage.forEach(drawForage);state.buildings.forEach(drawBuilding);
    const d=nearestDragon();wild.forEach((w,i)=>{const bob=Math.sin(Date.now()/460+i*2)*2;drawDragon(w.x,w.y+bob,w.species,.83);if(w.caught)drawNet(w.x,w.y+bob,23,.9);if(w===d&&distance(w,state.player)<120){ctx.fillStyle='#fff9e6';roundedRect(ctx,w.x-4,w.y-42,8,4,2);ctx.fill();ctx.fillStyle='#89a273';roundedRect(ctx,w.x-4,w.y-42,8*(w.caught?w.trust/2:0),4,2);ctx.fill();}});
    if(netCast){const progress=Math.min(1,(performance.now()-netCast.started)/520),x=netCast.origin.x+(netCast.dragon.x-netCast.origin.x)*progress,y=netCast.origin.y-12+(netCast.dragon.y-netCast.origin.y+12)*progress;drawNet(x,y,10+progress*16,1-progress*.25);}
    drawPlayer();
    if(pointerTarget){ctx.strokeStyle='#f9f1d8aa';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(pointerTarget.x,pointerTarget.y,8+Math.sin(Date.now()/120)*2,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  function frame(ts){const now=performance.now(),dt=Math.min(.04,(ts-lastTime)/1000||0);lastTime=ts;if(netCast&&now-netCast.started>520){netCast=null;updateUI();}if(dt){movePlayer(0,0,dt);drawWorld();}requestAnimationFrame(frame)}
  function canvasPoint(e){const r=canvas.getBoundingClientRect();let x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;const ox=(W-W/zoom)/2,oy=(H-H/zoom)/2;return{x:x/zoom+ox,y:y/zoom+oy};}
  function placeBuilding(point){const b=buildChoice;if(!b)return;if(state.wood<b.wood||state.stone<b.stone){toast('Not enough materials');return;}state.wood-=b.wood;state.stone-=b.stone;state.buildings.push({id:b.id,x:point.x,y:point.y});buildChoice=null;document.getElementById('build-banner').hidden=true;save();toast(`${b.name} raised! A little more like home.`);}
  canvas.addEventListener('pointerdown',e=>{const p=canvasPoint(e);if(buildChoice){placeBuilding(p);return;}const near=[...wild,...forage.filter(f=>!f.taken)].find(o=>distance(o,p)<24);if(near){pointerTarget=null;if(distance(state.player,near)<57){interact();}else{pointerTarget={x:near.x,y:near.y};toast('Moving closer…');}}else{pointerTarget=p;}});
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='e'||e.key==='E'){interact();return;}if(e.key==='Escape'&&buildChoice){buildChoice=null;document.getElementById('build-banner').hidden=true;updateUI();return;}keys.add(e.key);});
  window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('.joystick button').forEach(button=>{const down=e=>{e.preventDefault();keys.add(button.dataset.dir);button.setPointerCapture?.(e.pointerId)};const up=e=>{e.preventDefault();keys.delete(button.dataset.dir)};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);});
  document.getElementById('interact-button').addEventListener('click',interact);
  document.getElementById('zoom-in').onclick=()=>zoom=Math.min(1.35,zoom+.1);document.getElementById('zoom-out').onclick=()=>zoom=Math.max(.85,zoom-.1);
  document.getElementById('cancel-build').onclick=()=>{buildChoice=null;document.getElementById('build-banner').hidden=true;updateUI()};
  function modal(title,eyebrow,html){document.getElementById('modal-title').textContent=title;document.getElementById('modal-eyebrow').textContent=eyebrow;document.getElementById('modal-content').innerHTML=html;document.getElementById('modal-backdrop').hidden=false;}
  function closeModal(){document.getElementById('modal-backdrop').hidden=true}
  document.getElementById('modal-close').onclick=closeModal;document.getElementById('modal-backdrop').addEventListener('click',e=>{if(e.target.id==='modal-backdrop')closeModal()});
  const characterPresets=[
    {id:'wayfarer',name:'Wayfarer',outfit:'#6e8462',cloak:'#405c4b',accent:'#d6bd78',accessory:'hood'},
    {id:'groveguard',name:'Groveguard',outfit:'#55745b',cloak:'#344c3c',accent:'#d9c878',accessory:'leaf crown'},
    {id:'starweaver',name:'Starweaver',outfit:'#625a83',cloak:'#413f61',accent:'#d6bd78',accessory:'circlet'},
    {id:'emberkin',name:'Emberkin',outfit:'#a85f49',cloak:'#6c413b',accent:'#e5af67',accessory:'horns'},
    {id:'tidecaller',name:'Tidecaller',outfit:'#4f7d88',cloak:'#365d69',accent:'#d5c28a',accessory:'shell pin'},
    {id:'moonranger',name:'Moonranger',outfit:'#64728d',cloak:'#414c6b',accent:'#d9d3a5',accessory:'circlet'},
    {id:'sunward',name:'Sunward',outfit:'#b58a48',cloak:'#72563b',accent:'#f1d18a',accessory:'horns'},
    {id:'wildflower',name:'Wildflower',outfit:'#9a6685',cloak:'#684b68',accent:'#e7b0aa',accessory:'flower crown'}
  ];
  function refreshCharacterPreview(){const preview=document.getElementById('character-preview');if(preview&&window.mountCharacterPreview)window.mountCharacterPreview(preview,state.character);}
  function openCharacterStudio(){
    const c=state.character||defaultCharacter;
    modal('Character Studio','YOUR ADVENTURER',`<div class="character-studio"><div class="character-preview-wrap"><canvas id="character-preview" aria-label="Rotating 3D character preview; drag to rotate"></canvas><span class="preview-tip">DRAG TO TURN</span></div><div class="character-editor"><label class="character-name">Adventurer name<input id="character-name" maxlength="18" value="${String(c.name||'').replace(/[&<>"']/g,'')}" placeholder="Name your adventurer"></label><div class="editor-label">CHOOSE A SILHOUETTE</div><div class="design-grid">${characterPresets.map(p=>`<button class="design-chip ${c.design===p.id?'selected':''}" data-design="${p.id}" style="--swatch:${p.outfit}" aria-pressed="${c.design===p.id}"><i></i>${p.name}</button>`).join('')}</div><div class="editor-label">MAKE IT YOURS</div><div class="color-grid">${[['skin','Skin'],['hair','Hair'],['eyes','Eyes'],['outfit','Clothes'],['cloak','Cloak'],['boots','Boots'],['accent','Details']].map(([key,label])=>`<label class="color-choice">${label}<input type="color" data-color="${key}" value="${/^#[0-9a-f]{6}$/i.test(c[key]||'')?c[key]:'#6e8462'}"></label>`).join('')}</div><div class="select-grid"><label>Hair style<select id="character-hair">${['Waves','Curly','Long braid','Short'].map(x=>`<option ${c.hairStyle===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Headwear<select id="character-accessory">${['hood','circlet','horns','flower crown','leaf crown','shell pin'].map(x=>`<option ${c.accessory===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label class="toggle-choice"><input id="character-glasses" type="checkbox" ${c.glasses?'checked':''}> Round spectacles</label><p class="studio-note">Your look is saved on this device. Cosmetics are just for style—no gameplay stats.</p></div></div>`);
    refreshCharacterPreview();
    const commit=()=>{state.character={...state.character};save();refreshCharacterPreview();};
    document.querySelectorAll('[data-color]').forEach(input=>input.addEventListener('input',()=>{state.character[input.dataset.color]=input.value;commit()}));
    document.querySelectorAll('[data-design]').forEach(button=>button.onclick=()=>{const preset=characterPresets.find(p=>p.id===button.dataset.design);state.character={...state.character,...preset};save();openCharacterStudio();});
    document.getElementById('character-name').addEventListener('input',e=>{state.character.name=e.target.value.slice(0,18);save()});
    document.getElementById('character-hair').onchange=e=>{state.character.hairStyle=e.target.value;commit()};
    document.getElementById('character-accessory').onchange=e=>{state.character.accessory=e.target.value;commit()};
    document.getElementById('character-glasses').onchange=e=>{state.character.glasses=e.target.checked;commit()};
  }
  document.getElementById('character-button').addEventListener('click',openCharacterStudio);
  function openBestiary(){modal('The bestiary','FIELD NOTES',`<div class="modal-grid">${species.map(s=>`<article class="modal-dragon"><div class="discovery-art">${s.emoji}</div><div><b>${s.name}</b><small>${s.kind} · ${s.rarity.toLowerCase()}</small><p style="font-size:9px;line-height:1.45;margin:6px 0 0">${s.bio}</p></div><span class="owned-tag">${state.owned.includes(s.id)?'KINDRED':'WILD'}</span></article>`).join('')}</div>`)}
  const builds=[{id:'cottage',name:'Meadow cottage',icon:'⌂',desc:'A warm little home for long adventures.',wood:6,stone:3},{id:'stable',name:'Dragon stable',icon:'♞',desc:'A roomy roost for your growing kindred.',wood:5,stone:4},{id:'forge',name:'Wayfarer forge',icon:'⚒',desc:'Craft sturdy gear from found materials.',wood:4,stone:5}];
  function openBuilds(){modal('Shape your homestead','BUILDING PLANS',`<p class="guide-content" style="margin-top:-8px">Choose a structure, then tap a clearing on your meadow to place it.</p><div class="build-list">${builds.map(b=>`<div class="build-item"><div class="build-icon">${b.icon}</div><div><b>${b.name}</b><small>${b.desc}<br>▰ ${b.wood} timber &nbsp; ◆ ${b.stone} stone</small></div><button data-build="${b.id}" ${state.wood<b.wood||state.stone<b.stone?'disabled':''}>Place</button></div>`).join('')}</div>`);document.querySelectorAll('[data-build]').forEach(btn=>btn.onclick=()=>{buildChoice=builds.find(b=>b.id===btn.dataset.build);closeModal();document.getElementById('build-banner').hidden=false;updateUI();toast(`Choose a clearing for your ${buildChoice.name.toLowerCase()}`)});}
  const gachaItems=[
    {id:'suncrest',name:'Suncrest circlet',type:'Armor',icon:'👑',rarity:'Rare'},
    {id:'mosscloak',name:'Mossweave mantle',type:'Armor',icon:'🧥',rarity:'Common'},
    {id:'starlit',name:'Starlit mail',type:'Armor',icon:'🛡️',rarity:'Epic'},
    {id:'rosechair',name:'Rosewood throne',type:'Furniture',icon:'🪑',rarity:'Rare'},
    {id:'lantern',name:'Moon-glass lantern',type:'Furniture',icon:'🏮',rarity:'Common'},
    {id:'fountain',name:'Whispering fountain',type:'Furniture',icon:'⛲',rarity:'Epic'},
    {id:'banner',name:'Dragonkeeper banner',type:'Furniture',icon:'🎏',rarity:'Common'},
    {id:'hearth',name:'Everwarm hearth',type:'Furniture',icon:'🔥',rarity:'Rare'}
  ];
  function drawGacha(){
    const owned=new Set([...state.armor,...state.furniture]), unseen=gachaItems.filter(i=>!owned.has(i.id));
    if(!unseen.length)return null;
    const roll=Math.random()*100,rarity=roll<10?'Epic':roll<40?'Rare':'Common';
    const tier=unseen.filter(i=>i.rarity===rarity),pool=tier.length?tier:unseen;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  function openSanctum(){
    const collected=new Set([...state.armor,...state.furniture]),complete=gachaItems.every(i=>collected.has(i.id));
    modal('The keepsake sanctum','ARMOR & FURNISHINGS',`<p class="guide-content" style="margin-top:-8px">Spend keepsake sigils for random cosmetic items. Finds are permanent and have no combat stats. Duplicate keepsakes are never drawn.</p><div class="gacha-banner"><span>✧</span><div><b>One keepsake draw</b><small>60% Common · 30% Rare · 10% Epic · ${collected.size}/${gachaItems.length} found</small></div><button id="draw-keep" ${state.sigils<1||complete?'disabled':''}>${complete?'Collection complete':'Draw · 1 ✧'}</button></div><div class="collection-grid">${gachaItems.map(i=>{const owned=collected.has(i.id);return `<article class="collection-item ${owned?'collected':''}"><span class="collection-icon">${owned?i.icon:'?'}</span><b>${owned?i.name:'Unfound keepsake'}</b><small>${owned?`${i.rarity} · ${i.type}`:'???'}</small></article>`}).join('')}</div>`);
    document.getElementById('draw-keep').onclick=()=>{if(state.sigils<1||complete)return;const item=drawGacha();if(!item){toast('Every keepsake has been found');return;}state.sigils--; (item.type==='Armor'?state.armor:state.furniture).push(item.id);save();toast(`${item.rarity} keepsake found: ${item.name}!`);openSanctum();};
  }
  const armors=[{id:'mantle',name:'Forest mantle',icon:'🧥',desc:'A soft cloak, woven for the first keepers.',wood:3,stone:0,needs:'Quest reward',unlock:true},{id:'scale',name:'Bronze scale mail',icon:'🛡️',desc:'Light dragon-scale links reinforce your resolve.',wood:2,stone:6,needs:'Needs a wayfarer forge',unlock:false},{id:'moon',name:'Moonveil circlet',icon:'👑',desc:'A moon-silver circlet that catches the starlight.',wood:0,stone:4,needs:'Needs a wayfarer forge',unlock:false}];
  function openArmory(){modal('The wayfarer’s armory','ARMOR & RELICS',`<p class="guide-content" style="margin-top:-8px">Collect armor from adventures, weave nets, or visit the Keepsake Sanctum for randomized armor and furnishings.</p><div class="gacha-banner"><span>◌</span><div><b>Woven capture net</b><small>${state.nets} ready · Costs 2 timber &amp; 1 stone</small></div><button id="craft-net" ${state.wood<2||state.stone<1?'disabled':''}>Weave</button></div><div class="gacha-banner"><span>✧</span><div><b>Keepsake Sanctum</b><small>Draw armor and furniture with sigils (${state.sigils} available)</small></div><button id="open-sanctum">Visit</button></div><div class="armory-list">${armors.map(a=>{let crafted=state.armor.includes(a.id),forge=state.buildings.some(b=>b.id==='forge'),unlocked=(a.id==='mantle'?state.rewarded.includes('cottage'):forge)||crafted,afford=state.wood>=a.wood&&state.stone>=a.stone;return `<div class="armor-item"><div class="armor-icon">${a.icon}</div><div><b>${a.name}</b><small>${crafted?'Collected · '+a.desc:(unlocked?a.desc:a.needs)}${a.id==='mantle'&&!crafted?' · Quest reward':''}${unlocked&&!crafted?`<br>▰ ${a.wood} timber &nbsp; ◆ ${a.stone} stone`:''}</small></div><button data-armor="${a.id}" ${(!unlocked||(!crafted&&!afford))?'disabled':''}>${crafted?(state.equipped===a.id?'Equipped':'Equip'):'Craft'}</button></div>`}).join('')}</div>`);document.getElementById('craft-net').onclick=()=>{if(state.wood<2||state.stone<1)return;state.wood-=2;state.stone--;state.nets++;save();toast('Capture net woven · ready for a gentle catch');openArmory();};document.getElementById('open-sanctum').onclick=openSanctum;document.querySelectorAll('[data-armor]').forEach(btn=>btn.onclick=()=>{const a=armors.find(x=>x.id===btn.dataset.armor);if(state.armor.includes(a.id)){state.equipped=a.id;toast(`${a.name} equipped`);}else if(a.unlock&&!state.rewarded.includes('cottage')){toast('Complete your first-haven quest to unlock this');return;}else{state.wood-=a.wood;state.stone-=a.stone;state.armor.push(a.id);state.equipped=a.id;toast(`${a.name} crafted and equipped`);}save();openArmory();});}
  function castleRequirement(c){if(!c.needs)return true;if(c.needs==='cottage')return state.buildings.some(b=>b.id==='cottage');if(c.needs==='stable')return state.buildings.some(b=>b.id==='stable');if(c.needs==='forge')return state.buildings.some(b=>b.id==='forge');if(c.needs==='dragons')return state.owned.length>=3;return false;}
  function openHomes(){
    const stages=[{name:'Foundation',wood:8,stone:6},{name:'Great hall',wood:10,stone:8},{name:'Watchtowers',wood:12,stone:12}];
    modal('Choose your hearth','HOMES OF THE GREENWOLD',`<p class="guide-content" style="margin-top:-8px">Your meadow remains your adventure ground. Homes are permanent keepsakes—unlock them, then choose which one feels like home.</p><div class="home-grid">${castles.map(c=>{
      const owned=state.homes.includes(c.id),met=castleRequirement(c),current=state.castle===c.id;let action='Make home',disabled=false,detail=c.unlock;
      if(c.id==='greenstead'){action=current?'Current home':'Make home';}
      else if(c.id==='groundup'){
        const level=state.castleLevel,stage=stages[level];detail=met?(stage?`From the ground up · Next: ${stage.name} · ${stage.wood} timber / ${stage.stone} stone`:'Founders’ Keep complete · all three stages raised'):c.unlock;
        action=stage?(level===0?'Lay foundation':`Build ${stage.name}`):'Keep complete';disabled=!met||!stage||state.wood<stage.wood||state.stone<stage.stone;
        if(owned&&level>=3)action=current?'Current home':'Make home',disabled=false;
      }else if(!owned){detail=met?`${c.unlock} · ${c.costW} timber / ${c.costS} stone`:c.unlock;action=`Unlock · ${c.costW}▰ ${c.costS}◆`;disabled=!met||state.wood<c.costW||state.stone<c.costS;}
      else action=current?'Current home':'Make home';
      const style=c.style==='custom'&&state.castleLevel?` · ${state.castleLevel}/3 stages`:'';
      return `<article class="home-card ${current?'home-current':''} ${owned?'home-owned':''}"><div class="home-emblem">${c.style==='stone'?'♜':c.style==='moon'?'☾':c.style==='garden'?'❀':c.style==='custom'?'⌂':'⌂'}</div><div class="home-copy"><b>${c.name}</b><small>${detail}${style}</small></div><button data-home="${c.id}" ${disabled?'disabled':''}>${action}</button></article>`;
    }).join('')}</div>`);
    document.querySelectorAll('[data-home]').forEach(btn=>btn.onclick=()=>{
      const c=castles.find(item=>item.id===btn.dataset.home);if(!c)return;
      if(c.id==='groundup'&&state.castleLevel<3){const stage=stages[state.castleLevel];if(!castleRequirement(c)||state.wood<stage.wood||state.stone<stage.stone){toast('Build a forge and gather the materials first');return;}state.wood-=stage.wood;state.stone-=stage.stone;state.castleLevel++;if(!state.homes.includes(c.id)){state.homes.push(c.id);state.castle=c.id;}toast(`Founders’ Keep: ${stage.name.toLowerCase()} complete`);}
      else if(!state.homes.includes(c.id)){if(!castleRequirement(c)||state.wood<c.costW||state.stone<c.costS){toast('Meet the home’s requirements and gather its materials first');return;}state.wood-=c.costW;state.stone-=c.costS;state.homes.push(c.id);state.castle=c.id;toast(`${c.name} is now yours for good`);}
      else{state.castle=c.id;toast(`${c.name} is now your home`);}
      save();openHomes();
    });
  }
  function openGuide(){modal('A field guide','FIRST STEPS',`<div class="guide-content"><p><strong>Wander</strong> the meadow with WASD, arrow keys, or the touch pad. Tap any spot to walk there. Zoom in for a closer look.</p><p><strong>Make a friend.</strong> Walk near a wild dragon and press <strong>E</strong> or the green button to cast a woven net, then offer two berries to earn its trust. Nets cost 2 timber and 1 stone in the Armory.</p><p><strong>Forage.</strong> Flower patches give two berries. Fallen branches and mossy stones provide building materials. Tap a patch, then get close and interact.</p><p><strong>Build.</strong> Open Building plans below, choose a structure, then tap an open spot in your meadow. A cottage completes your first-haven quest and unlocks the Forest mantle.</p><p><strong>Make a home.</strong> Unlock castles from the Homes menu. Founders’ Keep can be raised stage by stage after you build a forge.</p><p><strong>Keep collecting.</strong> Find every dragon, build a stable for your companions, and raise a forge to craft more armor.</p></div>`)}
  document.querySelectorAll('.nav-item').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n===btn));if(btn.dataset.view==='home')closeModal();if(btn.dataset.view==='bestiary')openBestiary();if(btn.dataset.view==='armory')openArmory();});
  document.querySelector('[data-open="bestiary"]').onclick=openBestiary;document.getElementById('guide-button').onclick=openGuide;document.getElementById('build-button').onclick=openBuilds;document.getElementById('homes-button').onclick=openHomes;
  document.getElementById('sound-toggle').onclick=e=>{sound=!sound;e.currentTarget.querySelector('span').textContent=sound?'Sound on':'Sound off';toast(sound?'The meadow hums in a gentle breeze':'Ambient sound off');};
  updateUI();
  // Small building affordance tucked into the map on long-press / double click.
  canvas.addEventListener('dblclick',e=>{if(!buildChoice)openBuilds()});
  requestAnimationFrame(frame);
})();
