;(function(){
    
    'use strict';
    
    var game;
    
    window.addEventListener('load', function(){
        game = new Game('c');
        window.game = game;
        
        game.keys.press.bind(game.keys);
        window.addEventListener('keydown', game.keys.press.bind(game.keys));
        window.addEventListener('keyup', game.keys.unPress.bind(game.keys));                   
    });
    
    
    function Game(canvasId){
        this.ww = 500;
        this.hh = 600;
        
        this.keys = new Keys();
        
        this.updateMs = 8;
        
        this.waves = [
            {
                width: 8,
                height: 3,
                padding: 20,
                vx: 1,
                vy: 0.5
            },{
                width: 8,
                height: 4,
                padding: 30,
                vx: 0.8,
                vy: 0.5
            },{
                width: 10,
                height: 5,
                padding: 15,
                vx: 0.5,
                vy: 0.3
            },{
                width: 20,
                height: 5,
                padding: 15,
                vx: 0.3,
                vy: 0.1
            },{
                width: 20,
                height: 5,
                padding: 15,
                vx: 0.5,
                vy: 0.3
            },{
                width: 30,
                height: 5,
                padding: 15,
                vx: 0.8,
                vy: 0.5
            }
        ];
        
        this.upgradables=['shootSpeed', 'bulletsCount', 'power', 'bulletSpeed', 'pierce', 'health', 'speed'];
        
        this.drawer = new Drawer(canvasId, this);
    }
    Game.prototype = {
        start: function(loop){
            
            this.player = new Player(this);
            
            this.invaders = [];
            this.bullets = [];
            this.upgrades = [];
            
            while(this.drawer.upgrades.firstChild) this.drawer.upgrades.removeChild(this.drawer.upgrades.firstChild);
            
            this.lastTick = Date.now();
            
            this.inWave = false;
            this.currWave = 0;
            
            this.running = loop;
            
            this.tick();
        },
        tick: function(){
            if(this.running) window.requestAnimationFrame(this.tick.bind(this));
            else return;
            var currTick = Date.now();
            var elapsedTime = currTick-this.lastTick;
            
            if(elapsedTime > this.updateMs * 100) return this.pause();
            
            while(elapsedTime - this.updateMs > 0){
                elapsedTime -= this.updateMs;
                this.update();
            }
            this.render();
            
            this.lastTick = currTick - elapsedTime;
        },
        update: function(){
            this.player.update();
            
            if(this.invaders.length < 1){
                if(this.currWave) this.upgrades.push(new Upgrade({pos: {x: game.ww/2, y: 0}}))
                
                this.genWave(this.currWave);
            }
            
            for(var i = 0; i < this.invaders.length; ++i){
                this.invaders[i].update();
                
                if(checkCollision(this.invaders[i], this.player)) this.gameOver('eaten alive')
                
                if(Math.random() < 0.0005) this.invaders[i].shoot();
            }
            
            for(var i = 0; i < this.bullets.length; ++i){
                this.bullets[i].update();
            }
            
            for(var i = 0; i < this.bullets.length; ++i){
                for(var j = 0; j < this.invaders.length; ++j){
                    
                    if(!this.bullets[i].isInvader &&
                      checkCollision(this.invaders[j], this.bullets[i]) &&
                      this.invaders[j].gotHitBy.indexOf(this.bullets[i]) === -1 && this.invaders[j].health){ //check if the invader was not already hit by that bullet
                        
                        --this.bullets[i].pierce;
                        this.invaders[j].health -= this.bullets[i].power;
                        this.invaders[j].gotHitBy.push(this.bullets[i]);
                        
                        if(Math.random() < 0.01) this.upgrades.push(new Upgrade(this.invaders[j]))
                    }
                }
                if(this.bullets[i].isInvader && checkCollision(this.player, this.bullets[i]) && this.player.gotHitBy.indexOf(this.bullets[i]) === -1){
                    
                    --this.bullets[i].pierce;
                    this.player.health -= this.bullets[i].power;
                    this.player.gotHitBy = [];
                    
                    this.drawer.hurt();
                }
            }
            
            for(var i = 0; i < this.upgrades.length; ++i){
                this.upgrades[i].update();
                if(checkCollision(this.upgrades[i], this.player) && this.player[this.upgrades[i].type] + 1 <= this.player.max[this.upgrades[i].type]){
                    this.player[this.upgrades[i].type] += 1;
                    this.upgrades[i].use();
                }
            }
        },
        render:function(){
            this.drawer.draw();
        },
        genWave:function(ind){
            var wave = this.waves[ind];
            
            var waveStart = wave.padding * wave.height,
                totWidth = wave.width * wave.padding;
            
            for(var i = 0; i < wave.width; ++i){
                for(var j = 0; j < wave.height; ++j){
                    
                    var invader=new Invader(this,
                                            10 + i * wave.padding,                          //x
                                            j * wave.padding - waveStart,                   //y
                                            wave.vx, wave.vy,                               //vx, vy
                                            this.ww - totWidth - 20, 20, wave.height - j,   //invertX and Y
                                            1, 1, 1);                                       //power, bulletCount, pierce
                    
                    this.invaders.push(invader);
                    invader.pos.x += invader.invertX - 1;
                    invader.patrolX = invader.invertX - 1;
                }
            }
            
            this.inWave = true;
            if(this.currWave < this.waves.length) this.currWave = ind + 1;
        },
        pause: function(){
            this.running = false;
            this.drawer.pause();
            return false;
        },
        resume: function(){
            this.running = true;
            this.lastTick = Date.now();
            this.drawer.resume();
            this.tick();
        },
        gameOver: function(reason){
            this.drawer.gameOver(reason);
            
            this.start(false);
        }
    }
    
    function Keys(){
        this.values = ['shoot', 'left', 'up', 'right', 'down', 'info', 'pause', 'toggleTrailing'];
        this.codes =  [32, 37, 38, 39, 40, 73, 80, 84];
        this.binds = {}
        
        this.controls = document.getElementById('controls');
        this.controlsOn=false;
        
        this.start();
    }
    Keys.prototype = {
        start: function(){
            for(var i = 0; i < this.values.length; ++i){
                this.binds[this.codes[i]] = this.values[i];
                
                //just boring ugly DOM API, don't bother to read
                /*var p = document.createElement('p');
                
                var span = document.createElement('span');
                span.textContent = this.values[i];
                
                var inp = document.createElement('input');
                inp.id=i;
                inp.value=String.fromCharCode(this.values[i]);
                
                p.appendChild(span);
                p.appendChild(inp);
                this.controls.appendChild(p);*/
            }
        },
        openInfo: function(){
            this.controls.classList.add('display');
            this.controlsOn = true;
        },
        closeInfo: function(){
            this.controls.classList.remove('display');
            this.controlsOn = false;
        },
        rebind: function(){
            //if not paused
            if(game.running){
                
                game.pause();
                
                this.openInfo();
                
            //if paused    
            }else{
                
                //if already open
                if(this.controlsOn){
                    
                    this.closeInfo();
                    
                    game.resume();
                
                //if not already open
                }else{
                    
                    this.openInfo();
                }
            }
        },
        unPress: function(key){
            var value = this.binds[key.keyCode];
            this[value] = false;
        },
        press:function(key){
            var value = this.binds[key.keyCode];
            this[value] = true;
            
            switch(value){
                case 'pause': game.running ? game.pause() : game.resume(); break;
                case 'info' : this.rebind(); break;
                case 'toggleTrailing' : game.drawer.trailing = !game.drawer.trailing; break;
            }
        }
    }
    
    function Drawer(canvasId, game){
        this.canvas = document.getElementById(canvasId);
        this.canvas.width = game.ww;
        this.canvas.height = game.hh;
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.font = '14px Verdana';
        this.trailing = true;
        
        this.imgs = {};
        this.imageSrcs = ['player', 'playerBullet', 'invaderBullet', 'heart', 'unfilledHeart'];
        
        for(var i = 0; i < 5; ++i) this.imageSrcs.push('e' + i);
        for(var i = 0; i < game.upgradables.length; ++i) this.imageSrcs.push('U' + game.upgradables[i]);
        
        this.ready = 0;
        
        for(var i = 0; i < this.imageSrcs.length; ++i){
            var str = this.imageSrcs[i];
            this.imgs[str] = new Image();
            this.imgs[str].src = str + '.png';
            
            this.imgs[str].onload = this.upReady;
        }
        
        this.wave = document.getElementById('wave');
        this.health = document.getElementById('health');
        this.upgrades = document.getElementById('upgrades');
    };
    Drawer.prototype = {
        start: function(){
            for(var i = 0; i < game.player.max.health; ++i){
                var img = document.createElement('img');
                this.health.appendChild(img);
            }
        },
        upReady: function(){
            ++game.drawer.ready;
            if(game.drawer.ready === game.drawer.imageSrcs.length){
                
                game.start(true);
                
                game.drawer.start();
            }
        },
        draw: function(){
            this.ctx.fillStyle = 'rgba(0, 0, 0, '+(this.trailing ? '0.4' : '1')+')';
            this.ctx.fillRect(0, 0, game.ww, game.hh);
            
            for(var i = 0; i < game.invaders.length; ++i){
                //this.ctx.fillStyle=this.colors[game.invaders[i].health%this.colors.length];
                //this.ctx.fillRect(game.invaders[i].pos.x, game.invaders[i].pos.y, game.invaders[i].size.w, game.invaders[i].size.h);
                if(game.invaders[i].health>0) this.ctx.drawImage(this.imgs['e' + (game.invaders[i].health-1)], game.invaders[i].pos.x|0, game.invaders[i].pos.y|0);
            }
            
            for(var i = 0; i < game.upgrades.length; ++i){
                /*//temporary, gonna use pics latah
                
                this.ctx.fillStyle='lime';
                this.ctx.fillText(game.upgrades[i].type, game.upgrades[i].pos.x, game.upgrades[i].pos.y);
                
                this.ctx.fillStyle='green';
                this.ctx.fillRect(game.upgrades[i].pos.x, game.upgrades[i].pos.y, game.upgrades[i].size.w, game.upgrades[i].size.h);*/
                
                this.ctx.drawImage(this.imgs['U'+game.upgrades[i].type], game.upgrades[i].pos.x, game.upgrades[i].pos.y);
            }
            
            this.ctx.fillStyle='white';
            
            //this.ctx.fillRect(game.player.pos.x, game.player.pos.y, game.player.size.w, game.player.size.h);
            this.ctx.drawImage(this.imgs.player, game.player.pos.x|0, game.player.pos.y|0);
            
            for(var i = 0; i < game.bullets.length; ++i){
                //this.ctx.fillRect(game.bullets[i].pos.x, game.bullets[i].pos.y, game.bullets[i].size.w, game.bullets[i].size.h);
                this.ctx.drawImage(game.bullets[i].isInvader ? this.imgs.invaderBullet : this.imgs.playerBullet, game.bullets[i].pos.x|0, game.bullets[i].pos.y|0);
            }
            
            this.wave.textContent = game.currWave;
            
            if(this.health.childNodes.length > 0) for(var i = 0; i < game.player.max.health; ++i){
                
                this.health.childNodes[i].src = i < game.player.health ? this.imgs.heart.src : this.imgs.unfilledHeart.src;
            }
        },
        fillScreen: function(color){
            if(color) this.ctx.fillStyle=color;
            this.ctx.fillRect(0, 0, game.ww, game.hh);
        },
        pause: function(){
            this.fillScreen('rgba(10, 40, 10, 0.4)');
            
            this.ctx.fillStyle = 'white';
            
            this.ctx.font = '12px Verdana';
            this.ctx.fillText('P to resume, I for info', game.ww/2 - this.ctx.measureText('P to resume, I for info').width/2, game.hh/2 + 5);
            
            this.ctx.font = '14px Verdana';
            this.ctx.fillText('Paused', game.ww/2 - this.ctx.measureText('Paused').width/2, game.hh/2 - 20);
        },
        resume: function(){
            this.fillScreen('black');
        },
        hurt: function(){
            this.fillScreen('rgba(255, 0, 0, 0.8)');
        },
        upgrade: function(){
            this.fillScreen('rgba(0, 255, 0, 0.3)');
        },
        gameOver: function(reason){
            this.fillScreen('rgba(127, 0, 0, 0.5)');
            
            this.ctx.font = '20px Verdana';
            var gameOverWidth = this.ctx.measureText('Game Over!').width;
            
            this.ctx.font = '13px Verdana';
            var reasonWidth = this.ctx.measureText(reason).width;
            
            var width = Math.max(gameOverWidth, reasonWidth);
            
            this.ctx.fillRect(game.ww/2 - width/2 - 20, game.hh/2 - 30, width + 40, 60);
            
            this.ctx.fillStyle='white';
            
            this.ctx.font='20px Verdana';
            this.ctx.fillText('Game Over!', game.ww/2 - gameOverWidth/2, game.hh/2 - 5);
            
            this.ctx.font='13px Verdana';
            this.ctx.fillText(reason, game.ww/2 - reasonWidth/2, game.hh/2 + 15);
            
            this.ctx.font='14px Verdana';                  
        }
    }
    
    function Player(game){
        this.game = game;
        
        this.pos = new Vec(game.ww / 2, game.hh - 20);
        this.vel = new Vec(0, 0);
        this.acc = new Vec(0, 0);
        
        this.size = {w: 20, h: 20};
        
        this.acc.link(this.vel.link(this.pos));
        
        this.shootTime = 0;
        this.shootVel = 100;
        this.shootSpeed = 1.2;
        
        this.speed=1.2;
        
        this.bulletsCount = 1;
        this.power = 1;
        this.pierce = 1;
        this.bulletSpeed = 2;
        
        this.health = 3;
        this.gotHitBy = [];
        
        this.max = {
            shootSpeed: this.shootVel,
            health: 5,
            speed: 5,
            bulletsCount: 9,
            power: 5,
            pierce: 10,
            bulletSpeed: 10,
            
        }
    }
    Player.prototype = {
        update: function(){
            if(this.health <= 0) game.gameOver('took a bullet to the heart');
            
            this.vel.x = game.keys.left ? -this.speed : game.keys.right ? this.speed : 0;
            this.vel.y = game.keys.up   ? -this.speed : game.keys.down  ? this.speed : 0;
            
            this.acc.update();
            
            if(this.pos.x < 0)                    {this.vel.x *= -1; this.pos.x = 0;}
            if(this.pos.x + this.size.w > game.ww){this.vel.x *= -1; this.pos.x = game.ww - this.size.w;}
            if(this.pos.y < 0)                    {this.vel.y *= -1; this.pos.y = 0;}
            if(this.pos.y + this.size.w > game.hh){this.vel.y *= -1; this.pos.y = game.hh - this.size.h;}
            
            if(this.shootTime <= 0){
                if(game.keys.shoot){
                    var section = Math.PI / (this.bulletsCount + 1);
                    for(var i = 1; i <= this.bulletsCount; ++i) game.bullets.push(new Bullet(this, 0, Math.cos(section * i) * this.bulletSpeed, Math.sin(Math.PI + section * i) * this.bulletSpeed, this.power, this.pierce));
                    this.shootTime = this.shootVel;
                }
            }else this.shootTime -= this.shootSpeed;
        }
    }
    function Invader(game, x, y, vx, vy, invertX, invertY, health, bulletCount, pierce, power){
        this.pos = new Vec(x, y);
        this.vel = new Vec(vx, 0);
        
        this.vx = vx; this.vy = vy;
        
        this.size = {w: 10, h: 10};
        
        this.vel.link(this.pos);
        
        this.patrolX = 0;
        this.patrolY = 0;
        this.invertX = invertX;
        this.invertY = invertY;
        
        this.dir = 1;
        this.health = health;
        
        this.bulletCount = bulletCount;
        this.pierce = pierce;
        this.power = power;
        
        this.gotHitBy=[];
    }
    Invader.prototype = {
        update: function(){
            if(this.health <= 0) return game.invaders.splice(game.invaders.indexOf(this), 1);
            if(this.pos.y > game.hh) game.gameOver('invaders be invading!');
            
            this.patrolX += this.vel.x;
            this.patrolY += this.vel.y;
            
            if(this.patrolX >= this.invertX || this.patrolX < 0){
                this.vel.x = 0;
                this.vel.y = this.vy;
            }
            if(this.patrolY >= this.invertY){
                this.dir *= -1;
                this.vel.x = this.dir * this.vx;
                this.vel.y = 0;
                this.patrolY = 0;
            }
            
            this.vel.update();
        },
        shoot:function(){
            var section=Math.PI / (this.bulletCount + 1);
            for(var i = 1; i <= this.bulletCount; ++i){
                game.bullets.push(new Bullet(this, 1, Math.cos(section * i), Math.sin(section * i), this.power, this.pierce));
            }
        }
    }
    function Upgrade(parent){
        this.type = game.upgradables[(Math.random() * game.upgradables.length) |0];
        
        this.pos = new Vec(parent.pos.x, parent.pos.y);
        this.vel = new Vec(0, 1);
        
        this.size = {w: 15, h: 15};
        
        this.vel.link(this.pos);
    }
    Upgrade.prototype = {
        update:function(){
            this.vel.update();
            
            if(this.pos.y > game.hh) this.use();
        },
        use:function(){
            var img=document.createElement('img');
            img.src='U'+this.type+'.png';
            game.drawer.upgrades.appendChild(img);
            
            game.drawer.upgrade();
            
            game.upgrades.splice(game.upgrades.indexOf(this), 1);
        }
    }
    
    function Bullet(parent, isInvader, vx, vy, power, pierce){
        this.isInvader = isInvader;
        this.power = power;
        this.pierce = pierce;
        
        this.pos = new Vec(parent.pos.x + parent.size.w/2, parent.pos.y + parent.size.h/2);
        this.vel = new Vec(vx, vy);
        
        this.size = {w: 3, h: 5};
        
        this.vel.link(this.pos);
    }
    Bullet.prototype = {
        update: function(){
            if(this.pierce <= 0) return game.bullets.splice(game.bullets.indexOf(this), 1);
            
            this.vel.update();
            
            if(this.pos.outOfBoundings()) game.bullets.splice(game.bullets.indexOf(this), 1)
        }
    }
    
    function Vec(x, y){
        this.x = ((x * 100) |0) /100;
        this.y = ((y * 100) |0) /100;
        
        this.links = [];
    }
    Vec.prototype = {
        updateVec: function(v2){
            v2.x += this.x;
            v2.y += this.y;
        },
        link: function(vec){
            this.links.push(vec);
            return this;
        },
        outOfBoundings: function(){
            if(this.x < 0 || this.x > game.ww) return 'x';
            if(this.y < 0 || this.y > game.hh) return 'y';
            return false;
        },
        update:function(){
            for(var i = 0; i < this.links.length; ++i){
                this.updateVec(this.links[i]);
                this.links[i].update();
            }
        }
    }
    function checkBoundings(b){
        if(b.pos.x < 0 || b.pos.x + b.size.w > game.ww) return 'x';
        if(b.pos.y < 0 || b.pos.y + b.size.h > game.hh) return 'y';
        return false;
    }
    function checkCollision(b1, b2){
        return !(b1.pos.x + b1.size.w < b2.pos.x ||
                 b1.pos.y + b1.size.h < b2.pos.y ||
                 b1.pos.y > b2.pos.y + b2.size.h ||
                 b1.pos.x > b2.pos.x + b2.size.w)
    }
})()