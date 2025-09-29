function rand(max) { return Math.floor(Math.random() * max); }
//shuffle array 
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Maze generator (grid of width x height)
function Maze(width, height) {
    this.width = width;
    this.height = height;
    const map = [];

    for (let y = 0; y < height; y++) {
        map[y] = [];
        for (let x = 0; x < width; x++) {
            map[y][x] = { n: false, s: false, e: false, w: false, visited: false, prior: null };
        }
    }

    function carve() {
        const dirs = ['n','s','e','w'];
        const mod = { n:[0,-1,'s'], s:[0,1,'n'], e:[1,0,'w'], w:[-1,0,'e'] };
        let pos = { x:0, y:0 };
        map[pos.y][pos.x].visited = true;
        let stack = [pos];

        while (stack.length) {
            const cur = stack[stack.length-1];
            const options = [];
            for (const d of dirs) {
                const nx = cur.x + mod[d][0];
                const ny = cur.y + mod[d][1];
                if (nx >=0 && nx < width && ny >=0 && ny < height && !map[ny][nx].visited) options.push(d);
            }
            if (options.length === 0) {
                stack.pop();
            } else {
                const d = options[rand(options.length)];
                const nx = cur.x + mod[d][0];
                const ny = cur.y + mod[d][1];
                map[cur.y][cur.x][d] = true;
                map[ny][nx][mod[d][2]] = true;
                map[ny][nx].visited = true;
                map[ny][nx].prior = cur;
                stack.push({ x: nx, y: ny });
            }
        }
    }

    carve();

    // start and end in opposite corners
    this.start = { x: 0, y: 0 };
    this.end = { x: width - 1, y: height - 1 };

    this.map = function(){ return map; };
    this.startCoord = function(){ return this.start; };
    this.endCoord = function(){ return this.end; };
}

function DrawMaze(maze, ctx, cellSize, endSprite){
    const map = maze.map();
    ctx.lineWidth = Math.max(2, cellSize / 40);

    function drawWalls(){
        ctx.strokeStyle = '#000';
        for (let y=0;y<map.length;y++){
            for (let x=0;x<map[y].length;x++){
                const cell = map[y][x];
                const px = x*cellSize, py = y*cellSize;
                if (!cell.n){ ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+cellSize,py); ctx.stroke(); }
                if (!cell.s){ ctx.beginPath(); ctx.moveTo(px,py+cellSize); ctx.lineTo(px+cellSize,py+cellSize); ctx.stroke(); }
                if (!cell.e){ ctx.beginPath(); ctx.moveTo(px+cellSize,py); ctx.lineTo(px+cellSize,py+cellSize); ctx.stroke(); }
                if (!cell.w){ ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,py+cellSize); ctx.stroke(); }
            }
        }
    }

    function drawEnd(){
        const coord = maze.endCoord();
        if (endSprite){
            const pad = 1;
            const px = coord.x*cellSize + pad;
            const py = coord.y*cellSize + pad;
            const w = cellSize - pad*2;
            const h = cellSize - pad*2;
            ctx.drawImage(endSprite, 0,0, endSprite.width, endSprite.height, px, py, w, h);
        }
    }

    this.redrawMaze = function(size){
        // clear and redraw end + walls
        ctx.clearRect(0,0, size*map.length, size*map.length);
        drawEnd();
        drawWalls();
    };

    // initial draw
    drawEnd();
    drawWalls();

    this.drawWalls = drawWalls;
}

function Player(maze, canvas, cellSize, onComplete, sprite){
    const ctx = canvas.getContext('2d');
    const map = maze.map();
    let pos = { x: maze.start.x, y: maze.start.y };
    let moves = 0;
    const pad = 1;

    function drawAt(cell){
        // draw sprite inside single cell with 1px padding
        const px = cell.x*cellSize + pad;
        const py = cell.y*cellSize + pad;
        const w = cellSize - pad*2;
        const h = cellSize - pad*2;
        if (sprite){ ctx.drawImage(sprite, 0,0, sprite.width, sprite.height, px, py, w, h); }
        else { ctx.beginPath(); ctx.fillStyle='yellow'; ctx.arc(px + w/2, py + h/2, Math.max(2, Math.min(w,h)/2 - 2), 0, Math.PI*2); ctx.fill(); }
    }

    function clearAt(cell){
    // clear the entire cell to avoid sprite remnants and keep strict cell alignment
    const px = cell.x * cellSize;
    const py = cell.y * cellSize;
    ctx.clearRect(px, py, cellSize, cellSize);
    }

    function tryMove(dx,dy){
        const cell = map[pos.y][pos.x];
        // check direction allowed
        if (dx === -1 && cell.w) { moveTo(pos.x-1,pos.y); }
        if (dx === 1 && cell.e) { moveTo(pos.x+1,pos.y); }
        if (dy === -1 && cell.n) { moveTo(pos.x,pos.y-1); }
        if (dy === 1 && cell.s) { moveTo(pos.x,pos.y+1); }
    }

    function moveTo(nx,ny){
    // clear previous full cell, update position, then redraw appropriately
    clearAt(pos);
    pos = { x: nx, y: ny };
    // draw player at new position
    drawAt(pos);
        moves++;
        // redraw walls on top
        if (typeof draw !== 'undefined' && draw && typeof draw.drawWalls === 'function') draw.drawWalls();
        if (pos.x === maze.end.x && pos.y === maze.end.y){ onComplete(moves); unbind(); }
    }

    function onKey(e){
        switch(e.keyCode){
            case 37: tryMove(-1,0); break; // left
            case 38: tryMove(0,-1); break; // up
            case 39: tryMove(1,0); break; // right
            case 40: tryMove(0,1); break; // down
        }
    }

    function bind(){ window.addEventListener('keydown', onKey); }
    function unbind(){ window.removeEventListener('keydown', onKey); }

    // touch swipe
    try { $('#view').swipe({ swipe:function(e,dir){ switch(dir){ case 'left': tryMove(-1,0); break; case 'right': tryMove(1,0); break; case 'up': tryMove(0,-1); break; case 'down': tryMove(0,1); break; } }, threshold:0 }); } catch(e){}

    // initial draw
    drawAt(pos);
    bind();

    this.unbindKeyDown = unbind;
    this.redrawPlayer = function(_cellSize){ cellSize = _cellSize; drawAt(pos); };
}

// globals
var mazeCanvas = document.getElementById('mazeCanvas');
var ctx = mazeCanvas.getContext('2d');
var sprite = new Image();
var finishSprite = new Image();
var maze, draw, player;
var difficulty = 16;
var cellSize = 32;

function sizeCanvasToView(){
    const view = document.getElementById('view');
    const vw = Math.max(0, view.clientWidth);
    const vh = Math.max(0, view.clientHeight);
    const smaller = Math.min(vw, vh);
    const size = Math.max(100, Math.floor(smaller * 0.95));
    mazeCanvas.width = size;
    mazeCanvas.height = size;
    mazeCanvas.style.width = size + 'px';
    mazeCanvas.style.height = size + 'px';
    cellSize = Math.floor(size / difficulty);
}

window.onload = function(){
    sizeCanvasToView();
    // start the maze immediately so missing/slow images don't block display
    makeMaze();

    // load images and cause a redraw when they arrive
    sprite.onload = function(){
        if (draw && typeof draw.redrawMaze === 'function') draw.redrawMaze(cellSize);
        if (player && typeof player.redrawPlayer === 'function') player.redrawPlayer(cellSize);
    };
    finishSprite.onload = function(){
        if (draw && typeof draw.redrawMaze === 'function') draw.redrawMaze(cellSize);
        if (player && typeof player.redrawPlayer === 'function') player.redrawPlayer(cellSize);
    };

    sprite.src = './pixil-frame-0.png';
    finishSprite.src = './tired.png';
};

window.onresize = function(){ sizeCanvasToView(); if(maze){ draw.redrawMaze(cellSize); if(player) player.redrawPlayer(cellSize); } };

function makeMaze(){
    if(player){ player.unbindKeyDown(); player = null; }
    maze = new Maze(difficulty, difficulty);
    draw = new DrawMaze(maze, ctx, cellSize, finishSprite);
    player = new Player(maze, mazeCanvas, cellSize, displayVictoryMess, sprite);
    document.getElementById('mazeContainer').style.opacity = '1';
}

function restartMaze(){ if(typeof makeMaze === 'function') makeMaze(); }

function displayVictoryMess(moves){ document.getElementById('moves').textContent = 'You moved ' + moves + ' steps.'; document.getElementById('Message-Container').style.visibility = 'visible'; }

