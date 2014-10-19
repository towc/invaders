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
            //name, width, height, padding, vx, vy, healthAdd
            ['beginners', 15, 2, 20, 1, 0.3, false],
            ['cheesy', 20, 3, 25, 1.2, 0.3, 2],
            ['unicorns', 10, 5, 15, 1, 0.3, 1],
            ['ducks', 20, 5, 15, 2, 0.3, 2],
            ['chuck norris', 20, 5, 15, 0.5, 0.3, 1],
            ['The Lemon', 30, 5, 15, 0.8, 0.5, 1]
        ];
        
        this.upgradables=['shootSpeed', 'bulletsCount', 'power', 'bulletSpeed', 'pierce', 'health', 'speed'];
        
        this.drawer = new Drawer(canvasId, this);
        this.sounds = new Sounds(this);
    }
    Game.prototype = {
        start: function(loop){
            
            this.player = new Player(this);
            
            this.invaders = [];
            this.bullets = [];
            this.upgrades = [];
            this.explosions = [];
            this.bombs = [];
            
            while(this.drawer.upgradesEl.firstChild) this.drawer.upgradesEl.removeChild(this.drawer.upgradesEl.firstChild);
            
            this.lastTick = Date.now();
            
            this.inWave = true;
            this.currWave = 0;
            
            this.running = loop;
            
            this.waveBombs = 3;
            this.waits = 0;
            
            this.tick();
        },
        tick: function(){
            
            var self = this;
            
            if(this.running) setTimeout(function(){window.requestAnimationFrame(self.tick.bind(self))}, self.waits * 30);
            else return;
            
            var currTick = Date.now();
            var elapsedTime = currTick-this.lastTick;
            
            elapsedTime -= this.waits * 30;
            
            if(elapsedTime > this.updateMs * 100) return this.pause();
            
            while(elapsedTime - this.updateMs > 0){
                elapsedTime -= this.updateMs;
                this.update();
            }
            this.render();
            
            this.waits = 0;
            
            this.lastTick = currTick - elapsedTime;
        },
        update: function(){
            this.player.update();
            
            if(this.invaders.length < 1 && this.inWave){
                if(this.currWave) this.upgrades.push(new Upgrade({pos: {x: game.ww/2, y: 0}}))
                
                this.inWave = false;
                
                this.drawer.genWave();
                
                var self = this;
                
                setTimeout(function(){self.genWave(self.currWave);}, 2000);
            }
            
            for(var i = 0; i < this.invaders.length; ++i){
                
                if(checkCollision(this.invaders[i], this.player)) this.gameOver('eaten alive')
                
                if(Math.random() < 0.0002 * this.invaders[i].health) this.invaders[i].shoot();
                
                
                this.invaders[i].update();
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
            
            for(var i = 0; i < this.explosions.length; ++i){
                this.explosions[i].update();
            }
            for(var i = 0; i < this.bombs.length; ++i){
                this.bombs[i].update();
            }
        },
        render:function(){
            this.drawer.draw();
        },
        genWave:function(ind){
            this.waveBombs = 3;
            
            var wave = this.waves[ind];
            var width = wave[1],
                height = wave[2],
                padding = wave[3],
                vx = wave[4],
                vy = wave[5],
                healthAdd = wave[6];
            
            var waveStart = padding * height,
                totWidth = width * padding;
            
            for(var i = 0; i < width; ++i){
                for(var j = 0; j < height; ++j){
                    
                    var invader=new Invader(this,
                                            10 + i * padding,                          //x
                                            j * padding - waveStart,                   //y
                                            vx, vy,                               //vx, vy
                                            healthAdd ? ((height - j) / healthAdd) | 0 + 1 : 1,         //health
                                            1, 1, 1);                                       //power, bulletCount, pierce
                    
                    this.invaders.push(invader);
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
        this.values = ['shoot', 'left', 'up', 'right', 'down', 'info', 'pause', 'toggleTrailing', 'toggleSound', 'shootBomb'];
        this.codes =  [32,      37,     38,   39,      40,     73,     80,      84,               76,            66];
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
                case 'toggleSound': game.sounds.toggle(); break;
                case 'shootBomb': game.player.throwBomb(); break;
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
        
        this.tilt = 0;
        
        this.imgs = {};
        this.imageSrcs = ['player', 'playerBullet', 'invaderBullet', 'heart', 'unfilledHeart', 'bomb'];
        
        var enemySprites = 5,
            explosionSprites = 2;
        
        for(var i = 0; i < enemySprites; ++i) this.imageSrcs.push('e' + i);
        for(var i = 0; i < explosionSprites; ++i) this.imageSrcs.push('explosion' + i);
        for(var i = 0; i < game.upgradables.length; ++i) this.imageSrcs.push('U' + game.upgradables[i]);
        
        this.ready = 0;
        
        for(var i = 0; i < this.imageSrcs.length; ++i){
            var str = this.imageSrcs[i];
            this.imgs[str] = new Image();
            this.imgs[str].src = 'images/' + str + '.png';
            
            this.imgs[str].onload = this.upReady;
        }
        
        this.waveEl = document.getElementById('wave');
        this.healthEl = document.getElementById('health');
        this.upgradesEl = document.getElementById('upgrades');
        
        this.waveNameEl = document.getElementById('waveName');
        this.gameOverEl = document.getElementById('gameOver');
        this.gameOverReasonEl = document.getElementById('gameOverReason');
        this.pauseEl = document.getElementById('pause');
        this.shockEl = document.getElementById('shock');
        this.soundEl = document.getElementById('sound');
        this.errorEl = document.getElementById('error');
        this.startingEl = document.getElementById('starting');
    };
    Drawer.prototype = {
        start: function(){
            for(var i = 0; i < game.player.max.health; ++i){
                var img = document.createElement('img');
                this.healthEl.appendChild(img);
            }
        },
        upReady: function(){
            ++game.drawer.ready;
            if(game.drawer.ready === game.drawer.imageSrcs.length){
                
                game.start(false);
                
                game.drawer.start();
            }
        },
        draw: function(){
            
            game.sounds.volume.gain.value = game.sounds.volumeEl.value*1;
            
            this.tilt = game.explosions.length * 2 * (Math.random() - 0.5 );
            
            this.ctx.fillStyle = 'rgba(0, 0, 0, '+(this.trailing ? '0.4' : '1')+')';
            this.ctx.fillRect(0, 0, game.ww, game.hh);
            
            this.ctx.translate(this.tilt, this.tilt);
            
            for(var i = 0; i < game.explosions.length; ++i){
                
                var expl = game.explosions[i];
                this.ctx.drawImage(this.imgs['explosion' + (expl.frame | 0)], expl.pos.x, expl.pos.y, expl.size, expl.size);
                
                
                if(expl.frame >= this.explosionSprites) game.explosions.splice(game.explosions.indexOf(expl), 1);
            }
            for(var i = 0; i < game.bombs.length; ++i){
                this.ctx.drawImage(this.imgs.bomb, game.bombs[i].pos.x, game.bombs[i].pos.y);
            }
            
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
            
            this.waveEl.textContent = game.currWave;
            
            if(this.healthEl.childNodes.length > 0) for(var i = 0; i < game.player.max.health; ++i){
                
                this.healthEl.childNodes[i].src = i < game.player.health ? this.imgs.heart.src : this.imgs.unfilledHeart.src;
            }
            
            this.ctx.translate(-this.tilt, -this.tilt);
        },
        fillScreen: function(color){
            if(color) this.shockEl.style.setProperty('background-color', color);
            this.shockEl.classList.add('display');
            
            var self = this;
            
            window.setTimeout(function(){self.shockEl.classList.remove('display')}, 50)
        },
        pause: function(){
            this.pauseEl.classList.add('display');
            
        },
        resume: function(){
            this.pauseEl.classList.remove('display');
            this.gameOverEl.classList.remove('display');
            this.startingEl.classList.remove('display');
            
            game.sounds.volumeEl.blur();
        },
        hurt: function(){
            this.fillScreen('red');
            
        },
        upgrade: function(){
            this.fillScreen('green');
            
        },
        gameOver: function(reason){
            this.gameOverEl.classList.add('display');
            this.gameOverReasonEl.textContent = reason;                
        },
        genWave: function(){
            this.waveNameEl.classList.add('display');
            this.waveNameEl.textContent = game.waves[game.currWave][0];
            
            var self = this;
            window.setTimeout(function(){self.waveNameEl.classList.remove('display')}, 3000);
        },
        error: function(text){
            this.errorEl.textContent = text;
            this.errorEl.classList.add('display');
            
            var self = this;
            
            setTimeout(function(){self.errorEl.classList.remove('display')}, 3000);
        }
    }
    function Sounds(game){
        
        this.ctx = new (window.AudioContext || window.webkitAudioContext);
        
        this.sounds = {};
        this.soundSrcs = ['enemyShoot0'];
        
        this.on = true;
        this.volume = this.ctx.createGain();
        this.volume.gain.value = 0.3;
        this.volume.connect(this.ctx.destination);
        
        this.volumeEl = document.getElementById('volume');
        
        this.shootCount = 4;
        this.explodeCount = 2;
        
        for(var i = 0; i < this.shootCount; ++i) this.soundSrcs.push('shoot' + i);
        for(var i = 0; i < this.explodeCount; ++i) this.soundSrcs.push('explosion' + i);
        
        function ret(request, num, self){
            return function(){
                
                self.sounds[self.soundSrcs[num]] = request.response;
                
                self.ctx.decodeAudioData(request.response, function(buffer) {
                
                    self.sounds[self.soundSrcs[num]] = buffer;
                });
            }
        }
        
        try{
            for(var i = 0; i < this.soundSrcs.length; ++i){

                var request = new XMLHttpRequest();
                request.open('GET', 'sounds/' + this.soundSrcs[i] + '.mp3', true);
                request.responseType = 'arraybuffer';

                request.onload = ret(request, i, this);

                request.send();

            }
        }catch(e){
            this.on = false;
            this.toggle = function(){};
        }
    }
    Sounds.prototype = {
        play: function(sound){
            if(!this.on) return;
            
            var sound = this.sounds[sound] || sound;
            var source = this.ctx.createBufferSource();
            source.buffer = sound;
            source.connect(this.volume);
            source.start(0);
        },
        toggle: function(){
            this.on = !this.on;
            
            game.drawer.soundEl.src = this.on ? 'soundOn.png' : 'soundOff.png';
            
            game.drawer.soundEl.classList.add('display');
            
            setTimeout(function(){game.drawer.soundEl.classList.remove('display');}, 2000)
        },
        playerShoot: function(){
            this.play('shoot'+((Math.random()*this.shootCount)|0));
        },
        enemyShoot: function(){
            this.play('enemyShoot0');
        },
        explode: function(){
            this.play('explosion'+((Math.random()*this.explodeCount)|0));
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
        this.shootSpeed = 7;
        
        this.speed=2;
        
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
                if(game.keys.shoot) this.shoot();
            }else this.shootTime -= this.shootSpeed;
        },
        shoot: function(){
                    
            var section = Math.PI / (this.bulletsCount + 1);
                    
            for(var i = 1; i <= this.bulletsCount; ++i) game.bullets.push(
                new Bullet(this, 0,
                           Math.cos(section * i) * this.bulletSpeed + Math.random()/2-0.25 + this.vel.x / 10,
                           Math.sin(Math.PI + section * i) * this.bulletSpeed + this.vel.y / 10,
                           this.power, this.pierce));
                
            this.pos.y += this.power * this.bulletsCount * this.bulletSpeed;
                
            this.shootTime = this.shootVel;
                    
            game.sounds.playerShoot();
        },
        throwBomb: function(){
            if(--game.waveBombs >= 0) this.game.bombs.push(new Bomb(this));  
            else game.drawer.error('only 3 bombs par wave!');
        }
    }
    function Invader(game, x, y, vx, vy, health, bulletCount, pierce, power){
        this.pos = new Vec(x, y);
        this.vel = new Vec(vx, vy);
        
        this.vx = vx; this.vy = vy;
        
        this.size = {w: 10, h: 10};
        
        this.vel.link(this.pos);
        
        this.health = health;
        
        this.bulletCount = bulletCount;
        this.pierce = pierce;
        this.power = power;
        
        this.gotHitBy=[];
    }
    Invader.prototype = {
        update: function(){
            if(this.health <= 0){
                game.waits += 1;
                game.explosions.push(new Explosion(this.pos.x - 5, this.pos.y - 5, 20, false));
                
                return game.invaders.splice(game.invaders.indexOf(this), 1);
            }
            if(this.pos.y > game.hh) game.gameOver('invaders be invading!');
            
            if(this.pos.x < 0 || this.pos.x + this.size.w > game.ww){
                this.vel.x *= -1;
            }
            
            this.vel.update();
        },
        shoot:function(){
            var section=Math.PI / (this.bulletCount + 1);
            for(var i = 1; i <= this.bulletCount; ++i){
                game.bullets.push(new Bullet(this, 1, Math.cos(section * i), Math.sin(section * i), this.power, this.pierce));
            }
            
            game.sounds.enemyShoot();
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
            
            if(this.pos.y > game.hh) this.remove();
        },
        use:function(){
            var img=document.createElement('img');
            img.src='images/U'+this.type+'.png';
            game.drawer.upgradesEl.appendChild(img);
            
            game.drawer.upgrade();
            
            this.remove();
        },
        remove: function(){
            
            game.upgrades.splice(game.upgrades.indexOf(this), 1);
        }
    }
    
    function Bullet(parent, isInvader, vx, vy, power, pierce){
        this.isInvader = isInvader;
        this.power = power;
        this.pierce = pierce;
        
        this.pos = new Vec(parent.pos.x + parent.size.w/2, parent.pos.y + parent.size.h/2);
        this.vel = new Vec(vx, vy);
        
        this.size = isInvader ? {w: 3, h: 5} : {w: 5, h: 7};
    
        this.vel.link(this.pos);
    }
    Bullet.prototype = {
        update: function(){
            if(this.pierce <= 0) return game.bullets.splice(game.bullets.indexOf(this), 1);
            
            this.vel.update();
            
            if(this.pos.outOfBoundings()) game.bullets.splice(game.bullets.indexOf(this), 1)
        }
    }
    function Bomb(parent){
        this.pos = new Vec(parent.pos.x, parent.pos.y);
        this.vel = new Vec(Math.random()/4-0.125, -parent.speed * 2);
        
        this.vel.link(this.pos);
        
        this.size = {w: 10, h: 10};
        
        this.time = 0;
        this.blowUpTime = 50;
    }
    Bomb.prototype = {
        update: function(){
            this.vel.update();
            this.time += 1;
            
            var self = this;
            
            //iterateArray(game.invaders, function(invader){
            //    if(checkCollision(self, invader)) self.explode();
            //})
            for(var i = 0; i < game.invaders.length; ++i){
                if(checkCollision(this, game.invaders[i])) this.explode();
            }
            
            if(this.time >= this.blowUpTime) this.explode();
        },
        explode: function(){
            game.explosions.push(new Explosion(this.pos.x, this.pos.y, 40, true));
            game.bombs.splice(game.bombs.indexOf(this), 1);
        }
    }
    function Explosion(x, y, size, hurtful){
        this.pos = new Vec(x, y);
        
        this.size = size;
        
        this.hurtful = hurtful;
        this.frame = 0;
        
        game.sounds.explode();
    }
    Explosion.prototype = {
        update: function(){
            this.frame += 0.1;
            
            if(this.hurtful)
                for(var invader = 0; invader < game.invaders.length; ++invader)
                    if(getDistance(this, game.invaders[invader]) <= this.size)
                        game.invaders[invader].health -= 1;
            
            if(this.frame > 2) game.explosions.splice(game.explosions.indexOf(this), 1);
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
        try{
            return !(b1.pos.x + b1.size.w < b2.pos.x ||
                     b1.pos.y + b1.size.h < b2.pos.y ||
                     b1.pos.y > b2.pos.y + b2.size.h ||
                     b1.pos.x > b2.pos.x + b2.size.w)
        }catch(e){
            return false;
        }
    }
    function iterateArray(arr, fn){
        for(var i = 0; i < arr.length; ++i) fn(arr[i], i);
    }
    function getDistance(b1, b2){
        return Math.sqrt((b2.pos.x - b1.pos.x) * (b2.pos.x - b1.pos.x)
                        +(b2.pos.y - b1.pos.y) * (b2.pos.y - b1.pos.y));
    }
})()