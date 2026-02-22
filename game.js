
/* -------------------------------------------------------------------------- */
/*                                CONSTANTS & DATA                            */
/* -------------------------------------------------------------------------- */
const TILE_SIZE = 32;
const ROWS = 15; // 480 / 32
const COLS = 20; // 640 / 32
const STEP_TIME = 250; // ms to move one tile

// Keys
const KEYS = {
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    CONFIRM: 'z',
    CANCEL: 'x',
    ENTER: 'Enter',
    SPACE: ' '
};

// Types
const TYPE = {
    NORMAL: 'Normal',
    FIRE: 'Fire',
    WATER: 'Water',
    GRASS: 'Grass',
    ELECTRIC: 'Electric'
};

// Skill Database
const SKILLS = {
    tackle: { name: '몸통박치기', type: TYPE.NORMAL, power: 30, accuracy: 1.0 },
    scratch: { name: '할퀴기', type: TYPE.NORMAL, power: 35, accuracy: 1.0 },
    ember: { name: '불꽃세례', type: TYPE.FIRE, power: 40, accuracy: 1.0 },
    waterGun: { name: '물대포', type: TYPE.WATER, power: 40, accuracy: 1.0 },
    vineWhip: { name: '덩굴채찍', type: TYPE.GRASS, power: 45, accuracy: 0.95 },
    thunderShock: { name: '전기충격', type: TYPE.ELECTRIC, power: 40, accuracy: 1.0 },
    quickAttack: { name: '전광석화', type: TYPE.NORMAL, power: 40, accuracy: 1.0 },
};

// Pokemon Base Data
const POKEMON_DB = {
    charmander: {
        name: '파이리',
        type: TYPE.FIRE,
        maxHP: 39,
        attack: 52,
        defense: 43,
        speed: 65,
        skills: ['scratch', 'ember'],
        spriteKey: 'pokemon' // Using placeholder for now
    },
    squirtle: {
        name: '꼬부기',
        type: TYPE.WATER,
        maxHP: 44,
        attack: 48,
        defense: 65,
        speed: 43,
        skills: ['tackle', 'waterGun'],
        spriteKey: 'pokemon'
    },
    bulbasaur: {
        name: '이상해씨',
        type: TYPE.GRASS,
        maxHP: 45,
        attack: 49,
        defense: 49,
        speed: 45,
        skills: ['tackle', 'vineWhip'],
        spriteKey: 'pokemon'
    },
    pikachu: {
        name: '피카츄',
        type: TYPE.ELECTRIC,
        maxHP: 35,
        attack: 55,
        defense: 40,
        speed: 90,
        skills: ['quickAttack', 'thunderShock'],
        spriteKey: 'pokemon2'
    }
};

// Type Effectiveness Chart
function getTypeMultiplier(attackType, defenderType) {
    if (attackType === TYPE.FIRE) {
        if (defenderType === TYPE.GRASS) return 2.0;
        if (defenderType === TYPE.WATER) return 0.5;
        if (defenderType === TYPE.FIRE) return 0.5;
    }
    if (attackType === TYPE.WATER) {
        if (defenderType === TYPE.FIRE) return 2.0;
        if (defenderType === TYPE.GRASS) return 0.5;
        if (defenderType === TYPE.WATER) return 0.5;
    }
    if (attackType === TYPE.GRASS) {
        if (defenderType === TYPE.WATER) return 2.0;
        if (defenderType === TYPE.FIRE) return 0.5;
        if (defenderType === TYPE.GRASS) return 0.5;
    }
    if (attackType === TYPE.ELECTRIC) {
        if (defenderType === TYPE.WATER) return 2.0;
        if (defenderType === TYPE.GRASS) return 0.5;
        if (defenderType === TYPE.ELECTRIC) return 0.5;
    }
    return 1.0;
}

/* -------------------------------------------------------------------------- */
/*                                   CLASSES                                  */
/* -------------------------------------------------------------------------- */

class InputManager {
    constructor() {
        this.keys = {};
        this.downKeys = {}; // Keys pressed this frame
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.downKeys[e.key] = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    isDown(key) { return this.keys[key]; }
    
    // Check if key was just pressed (for menus)
    isJustPressed(key) { 
        if (this.downKeys[key]) {
            this.downKeys[key] = false; // Consume
            return true;
        }
        return false;
    }

    reset() { this.downKeys = {}; }
}

class Pokemon {
    constructor(speciesId, level) {
        const data = POKEMON_DB[speciesId];
        this.id = speciesId;
        this.name = data.name;
        this.type = data.type;
        this.level = level;
        this.exp = 0;
        this.expToNext = level * 100;
        
        // Stats Scaling (Simplified)
        const scale = 1 + (level - 1) * 0.1;
        this.maxHP = Math.floor(data.maxHP * scale);
        this.currentHP = this.maxHP;
        this.attack = Math.floor(data.attack * scale);
        this.defense = Math.floor(data.defense * scale);
        this.speed = Math.floor(data.speed * scale);
        
        this.skills = data.skills.map(s => SKILLS[s]);
        this.spriteKey = data.spriteKey;
    }

    heal() {
        this.currentHP = this.maxHP;
    }

    takeDamage(amount) {
        this.currentHP = Math.max(0, this.currentHP - amount);
    }
    
    gainExp(amount) {
        this.exp += amount;
        if (this.exp >= this.expToNext) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.exp -= this.expToNext;
        this.expToNext = this.level * 100;
        
        // Recalculate stats
        const data = POKEMON_DB[this.id];
        const scale = 1 + (this.level - 1) * 0.1;
        
        const oldMaxHP = this.maxHP;
        this.maxHP = Math.floor(data.maxHP * scale);
        this.currentHP += (this.maxHP - oldMaxHP); // Heal the difference
        
        this.attack = Math.floor(data.attack * scale);
        this.defense = Math.floor(data.defense * scale);
        this.speed = Math.floor(data.speed * scale);
        
        return true; // Leveled up
    }
}

class Trainer {
    constructor(x, y, spriteImage) {
        this.x = x; // Grid X
        this.y = y; // Grid Y
        this.pixelX = x * TILE_SIZE;
        this.pixelY = y * TILE_SIZE;
        this.direction = 0; // 0: Down, 1: Left, 2: Right, 3: Up
        this.isMoving = false;
        this.moveProgress = 0; // 0 to 1
        this.startX = x;
        this.startY = y;
        this.targetX = x;
        this.targetY = y;
        
        this.sprite = spriteImage;
        this.frame = 0; // 0, 1, 2 (1 is idle)
        this.animTimer = 0;

        // Party
        this.party = [new Pokemon('charmander', 5)]; // Starter
        this.inventory = { potion: 3, pokeball: 5 };
    }

    update(dt, input, map) {
        if (this.isMoving) {
            this.moveProgress += dt / STEP_TIME;
            
            // Animation
            this.animTimer += dt;
            if (this.animTimer > 80) {
                this.frame = (this.frame + 1) % 4; // 0-1-2-1 loop logic usually, but 4 frames: 0,1,2,3?
                // Sheet has 3 cols. Let's cycle 0 -> 1 -> 2 -> 1
                this.animTimer = 0;
            }

            if (this.moveProgress >= 1) {
                this.isMoving = false;
                this.x = this.targetX;
                this.y = this.targetY;
                this.pixelX = this.x * TILE_SIZE;
                this.pixelY = this.y * TILE_SIZE;
                this.moveProgress = 0;
                this.frame = 1; // Idle frame (middle column usually)
                
                // Trigger events on tile arrival
                game.onStepComplete(this.x, this.y);
            } else {
                // Interpolate
                this.pixelX = this.startX * TILE_SIZE + (this.targetX - this.startX) * TILE_SIZE * this.moveProgress;
                this.pixelY = this.startY * TILE_SIZE + (this.targetY - this.startY) * TILE_SIZE * this.moveProgress;
            }
        } else {
            // Check Input
            let dx = 0;
            let dy = 0;
            let moved = false;
            let newDir = this.direction;

            if (input.isDown(KEYS.UP)) { dy = -1; newDir = 3; moved = true; }
            else if (input.isDown(KEYS.DOWN)) { dy = 1; newDir = 0; moved = true; }
            else if (input.isDown(KEYS.LEFT)) { dx = -1; newDir = 1; moved = true; }
            else if (input.isDown(KEYS.RIGHT)) { dx = 1; newDir = 2; moved = true; }

            if (moved) {
                this.direction = newDir;
                const nextX = this.x + dx;
                const nextY = this.y + dy;

                if (!map.isSolid(nextX, nextY)) {
                    this.isMoving = true;
                    this.startX = this.x;
                    this.startY = this.y;
                    this.targetX = nextX;
                    this.targetY = nextY;
                }
            } else {
                this.frame = 1; // Idle
            }
        }
    }

    draw(ctx) {
        // Trainer.png
        // Assumed Layout: 4 cols (Frames), 4 rows (Directions)
        // Col: 0, 1, 2, 3
        // Row: 0 (Down), 1 (Left), 2 (Right), 3 (Up)
        
        let col = 0;
        if (this.isMoving) {
            col = this.frame % 4;
        } else {
            col = 0; // Idle frame (First column usually)
        }

        const srcX = col * 32;
        const srcY = this.direction * 48;
        
        // Draw centered on tile.
        // Tile is 32x32. Sprite is 32x48.
        ctx.drawImage(this.sprite, srcX, srcY, 32, 48, this.pixelX, this.pixelY - 16, 32, 48);
    }
}

class MapSystem {
    constructor() {
        // 0: Grass, 1: Wall, 2: Water, 3: Door, 4: Floor
        // Simple 20x15 map
        this.width = COLS;
        this.height = ROWS;
        this.tiles = [];
        this.currentMapId = 'overworld';
        
        this.loadMap('overworld');
    }

    loadMap(id) {
        this.currentMapId = id;
        this.tiles = [];
        if (id === 'overworld') {
            for (let y = 0; y < this.height; y++) {
                const row = [];
                for (let x = 0; x < this.width; x++) {
                    // Borders
                    if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
                        row.push(1); // Wall
                    } 
                    // Pokemon Center Building (roughly)
                    else if (x >= 8 && x <= 12 && y >= 3 && y <= 5) {
                        row.push(1);
                    }
                    // Door
                    else if (x === 10 && y === 5) {
                        row[row.length - 1] = 3; // Overwrite wall
                    }
                    // Lake
                    else if (x > 14 && y > 8) {
                        row.push(2);
                    }
                    // Grass Patches
                    else if ((x % 2 === 0 && y % 2 === 0) || (x > 3 && x < 7 && y > 8)) {
                        row.push(0); // Grass
                    }
                    else {
                        row.push(4); // Dirt/Floor
                    }
                }
                this.tiles.push(row);
            }
            // Fix door accessibility - actually door needs to be walkable to trigger event
            // or we make the tile IN FRONT of the door the trigger?
            // Requirement: "Walking into the door tile"
            this.tiles[5][10] = 3; 
        } else if (id === 'center') {
            // Small room
            for (let y = 0; y < this.height; y++) {
                const row = [];
                for (let x = 0; x < this.width; x++) {
                    if (x < 6 || x > 14 || y < 4 || y > 10) row.push(1); // Black void/walls
                    else row.push(4); // Floor
                }
                this.tiles.push(row);
            }
            // Exit
            this.tiles[10][10] = 3; 
            // Nurse (Not a tile, handled in drawing/collision separately or just implied)
            // Let's make tile 5 special interaction
            this.tiles[5][10] = 5; // Nurse desk
        }
    }

    isSolid(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
        const t = this.tiles[y][x];
        return t === 1 || t === 2 || t === 5; // 1 Wall, 2 Water, 5 Nurse Desk
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 1;
        return this.tiles[y][x];
    }

    draw(ctx) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                let color = '#333';
                if (tile === 0) color = '#4caf50'; // Grass
                else if (tile === 1) color = '#5d4037'; // Wall/Tree
                else if (tile === 2) color = '#2196f3'; // Water
                else if (tile === 3) color = '#f44336'; // Door
                else if (tile === 4) color = '#8d6e63'; // Floor/Dirt
                else if (tile === 5) color = '#e91e63'; // Nurse Desk

                ctx.fillStyle = color;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                // Add texture details
                if (tile === 0) { // Grass tuft
                    ctx.fillStyle = '#388e3c';
                    ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, 4, 4);
                    ctx.fillRect(x * TILE_SIZE + 20, y * TILE_SIZE + 20, 4, 4);
                }
            }
        }
        
        // Draw Nurse if in center
        if (this.currentMapId === 'center') {
            ctx.fillStyle = 'pink';
            ctx.fillRect(10 * TILE_SIZE + 8, 4 * TILE_SIZE + 8, 16, 16);
        }
    }
}

class BattleSystem {
    constructor(player, enemyPokemon, onComplete) {
        this.player = player;
        this.playerPokemon = player.party[0];
        this.enemyPokemon = enemyPokemon;
        this.onComplete = onComplete;
        this.turn = 'player'; // player, enemy
        this.state = 'start'; // start, menu, move_select, animation, end
        
        this.ui = {
            container: document.getElementById('battle-ui'),
            enemyName: document.getElementById('enemy-name'),
            enemyLevel: document.getElementById('enemy-level'),
            enemyHpBar: document.getElementById('enemy-hp-bar'),
            playerName: document.getElementById('player-name'),
            playerLevel: document.getElementById('player-level'),
            playerHpBar: document.getElementById('player-hp-bar'),
            playerHpCurrent: document.getElementById('player-hp-current'),
            playerHpMax: document.getElementById('player-hp-max'),
            message: document.getElementById('battle-message'),
            menu: document.getElementById('battle-menu'),
            moveMenu: document.getElementById('move-menu'),
            moveGrid: document.getElementById('move-grid'),
            playerSprite: document.getElementById('player-sprite'),
            enemySprite: document.getElementById('enemy-sprite')
        };
        
        this.bindEvents();
    }

    start() {
        this.ui.container.classList.remove('hidden');
        
        // Set Sprites
        // Using background-image for easy containment
        // Assuming spriteKey corresponds to asset name in game.assets, but we have them loaded as objects.
        // We'll just use the src string for CSS.
        
        const getSpriteSrc = (key) => {
            if (key === 'pokemon') return 'Pokemon.png';
            if (key === 'pokemon2') return 'Pokemon2.png';
            return 'Pokemon.png';
        };

        // Init Sprites with assumed 4-frame strip
        const playerSrc = getSpriteSrc(this.playerPokemon.spriteKey);
        const enemySrc = getSpriteSrc(this.enemyPokemon.spriteKey);

        this.setupSprite(this.ui.playerSprite, playerSrc);
        this.setupSprite(this.ui.enemySprite, enemySrc);

        this.updateUI();
        this.log(`야생의 ${this.enemyPokemon.name}(이)가 나타났다!`);
        
        setTimeout(() => {
            this.state = 'menu';
            this.log(`${this.playerPokemon.name}은(는) 무엇을 할까?`);
            this.ui.menu.classList.remove('hidden');
            this.ui.moveMenu.classList.add('hidden');
        }, 2000);
    }
    
    setupSprite(element, src) {
        element.style.backgroundImage = `url('${src}')`;
        // Assuming standard RPG sprite sheet: 4 columns, 4 rows
        // We want to show 1 frame (1/4 width, 1/4 height)
        element.style.backgroundSize = '400% 400%'; 
        element.style.backgroundPosition = '0% 0%';
    }

    update(dt) {
        // Animate Sprites
        this.animTimer = (this.animTimer || 0) + dt;
        if (this.animTimer > 200) { // 200ms per frame
            this.frame = (this.frame || 0) + 1;
            this.animTimer = 0;
            
            // Cycle 0 -> 1 -> 2 -> 3
            const currentFrame = this.frame % 4;
            
            // Calculate X position percentage
            // For N frames, the positions are 0%, 100/(N-1) * 1, ..., 100%
            // For 4 frames: 0%, 33.33%, 66.66%, 100%
            const pos = currentFrame * (100 / 3);
            
            // Y position 0% (Top row)
            this.ui.playerSprite.style.backgroundPosition = `${pos}% 0%`;
            // Flip enemy sprite horizontally if needed? usually enemy faces left.
            // If sprite sheet is standard, they face down/left/right/up.
            // Let's assume Row 1 (Left) for Enemy or just default 0.
            this.ui.enemySprite.style.backgroundPosition = `${pos}% 0%`; 
        }
    }

    bindEvents() {
        // We will handle clicks manually or via keyboard in the main loop
        // But for simplicity in this prototype, we'll use click listeners
        document.querySelectorAll('#battle-menu button').forEach(btn => {
            btn.onclick = () => this.handleMenuAction(btn.dataset.action);
        });
        document.getElementById('cancel-move').onclick = () => {
            this.ui.moveMenu.classList.add('hidden');
            this.ui.menu.classList.remove('hidden');
            this.state = 'menu';
        };
    }

    handleMenuAction(action) {
        if (this.state !== 'menu') return;

        if (action === 'fight') {
            this.state = 'move_select';
            this.ui.menu.classList.add('hidden');
            this.ui.moveMenu.classList.remove('hidden');
            this.renderMoves();
        } else if (action === 'run') {
            this.log('성공적으로 도망쳤다!');
            setTimeout(() => this.endBattle(false), 1000);
        } else if (action === 'bag') {
            if (this.player.inventory.potion > 0) {
                this.player.inventory.potion--;
                const oldHp = this.playerPokemon.currentHP;
                this.playerPokemon.currentHP = Math.min(this.playerPokemon.maxHP, this.playerPokemon.currentHP + 20);
                this.log(`상처약을 사용했다! 체력이 ${this.playerPokemon.currentHP - oldHp} 회복되었다.`);
                this.updateUI();
                setTimeout(() => this.enemyTurn(), 1500);
            } else {
                this.log('상처약이 없다!');
                setTimeout(() => {
                    this.state = 'menu';
                    this.log(`${this.playerPokemon.name}은(는) 무엇을 할까?`);
                }, 1000);
            }
        }
    }

    renderMoves() {
        this.ui.moveGrid.innerHTML = '';
        this.playerPokemon.skills.forEach(skill => {
            const btn = document.createElement('button');
            btn.innerText = skill.name;
            btn.onclick = () => this.executeMove(skill, this.playerPokemon, this.enemyPokemon);
            this.ui.moveGrid.appendChild(btn);
        });
    }

    executeMove(skill, attacker, defender) {
        this.state = 'animation';
        this.ui.moveMenu.classList.add('hidden');
        this.ui.menu.classList.add('hidden');

        // Damage Formula
        const typeMult = getTypeMultiplier(skill.type, defender.type);
        const random = 0.85 + Math.random() * 0.15;
        let damage = Math.floor(((2 * attacker.level / 5 + 2) * skill.power * attacker.attack / defender.defense / 50 + 2) * typeMult * random);
        
        if (damage < 1) damage = 1;

        this.log(`${attacker.name}의 ${skill.name}!`);
        
        setTimeout(() => {
            if (typeMult > 1) this.log("효과는 굉장했다!");
            if (typeMult < 1) this.log("효과가 별로인 듯하다...");
            
            defender.takeDamage(damage);
            this.updateUI();

            setTimeout(() => {
                if (defender.currentHP <= 0) {
                    this.handleFaint(defender);
                } else {
                    if (attacker === this.playerPokemon) {
                        this.enemyTurn();
                    } else {
                        this.state = 'menu';
                        this.ui.menu.classList.remove('hidden');
                        this.log(`${this.playerPokemon.name}은(는) 무엇을 할까?`);
                    }
                }
            }, 1500);
        }, 1000);
    }

    enemyTurn() {
        const skills = this.enemyPokemon.skills;
        const skill = skills[Math.floor(Math.random() * skills.length)];
        this.executeMove(skill, this.enemyPokemon, this.playerPokemon);
    }

    handleFaint(pokemon) {
        this.log(`${pokemon.name}(은)는 쓰러졌다!`);
        setTimeout(() => {
            if (pokemon === this.enemyPokemon) {
                // Victory
                const expGain = Math.floor(pokemon.level * 10); // Simplified
                this.playerPokemon.gainExp(expGain);
                this.log(`승리했다! ${expGain} 경험치를 얻었다.`);
                setTimeout(() => this.endBattle(true), 2000);
            } else {
                this.log(`눈앞이 깜깜해졌다...`);
                setTimeout(() => {
                    this.playerPokemon.heal(); // Mercy heal
                    this.endBattle(false);
                }, 2000);
            }
        }, 1000);
    }

    updateUI() {
        // Enemy
        this.ui.enemyName.innerText = this.enemyPokemon.name;
        this.ui.enemyLevel.innerText = this.enemyPokemon.level;
        const enemyPct = (this.enemyPokemon.currentHP / this.enemyPokemon.maxHP) * 100;
        this.ui.enemyHpBar.style.width = enemyPct + '%';
        this.updateHpColor(this.ui.enemyHpBar, enemyPct);

        // Player
        this.ui.playerName.innerText = this.playerPokemon.name;
        this.ui.playerLevel.innerText = this.playerPokemon.level;
        const playerPct = (this.playerPokemon.currentHP / this.playerPokemon.maxHP) * 100;
        this.ui.playerHpBar.style.width = playerPct + '%';
        this.ui.playerHpCurrent.innerText = this.playerPokemon.currentHP;
        this.ui.playerHpMax.innerText = this.playerPokemon.maxHP;
        this.updateHpColor(this.ui.playerHpBar, playerPct);
    }

    updateHpColor(element, pct) {
        element.classList.remove('low', 'critical');
        if (pct < 20) element.classList.add('critical');
        else if (pct < 50) element.classList.add('low');
    }

    log(text) {
        this.ui.message.innerText = text;
    }

    endBattle(won) {
        this.ui.container.classList.add('hidden');
        this.onComplete(won);
    }
}

/* -------------------------------------------------------------------------- */
/*                                 MAIN GAME                                  */
/* -------------------------------------------------------------------------- */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputManager();
        this.map = new MapSystem();
        this.state = 'start_screen'; // start_screen, overworld, battle, dialogue
        
        // Assets
        this.assets = {};
        this.loaded = false;

        this.lastTime = 0;
        
        // Audio
        this.audio = {
            main: new Audio('main.mp3'),
            center: new Audio('center.mp3')
        };
        this.audio.main.loop = true;
        this.audio.center.loop = true;
        this.currentTrack = null;
    }

    async init() {
        // Load Images
        const loadImage = (src) => new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });

        const [trainerImg, pokemonImg, pokemon2Img] = await Promise.all([
            loadImage('Trainer.png'),
            loadImage('Pokemon.png'),
            loadImage('Pokemon2.png')
        ]);

        this.assets.trainer = trainerImg;
        this.assets.pokemon = pokemonImg;
        this.assets.pokemon2 = pokemon2Img;
        
        // Preload Audio (Optimization)
        this.audio.main.load();
        this.audio.center.load();

        this.trainer = new Trainer(10, 10, this.assets.trainer);
        this.loaded = true;

        // Input Listener for Start Screen
        window.addEventListener('keydown', (e) => {
            if (this.state === 'start_screen' && e.code === 'Space') {
                document.getElementById('start-screen').classList.add('hidden');
                this.state = 'overworld';
                this.playAudio('main');
            }
        });

        // Resize Listener
        window.addEventListener('resize', () => this.resize());
        this.resize(); // Initial resize

        requestAnimationFrame(t => this.loop(t));
    }
    
    resize() {
        const container = document.getElementById('game-container');
        const scale = Math.min(window.innerWidth / 640, window.innerHeight / 480);
        container.style.transform = `scale(${scale})`;
    }

    playAudio(track) {
        if (this.currentTrack) {
            this.audio[this.currentTrack].pause();
            this.audio[this.currentTrack].currentTime = 0;
        }
        this.currentTrack = track;
        const playPromise = this.audio[track].play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.log("Audio play failed (user interaction needed or loading)", e);
            });
        }
    }

    onStepComplete(x, y) {
        const tile = this.map.getTile(x, y);
        
        // Door / Transition
        if (tile === 3) {
            if (this.map.currentMapId === 'overworld') {
                this.map.loadMap('center');
                this.trainer.x = 10; this.trainer.y = 10; // Entrance of center
                this.trainer.targetX = 10; this.trainer.targetY = 10;
                this.trainer.pixelX = 10 * TILE_SIZE; this.trainer.pixelY = 10 * TILE_SIZE;
                this.trainer.direction = 3; // Face up
                this.playAudio('center');
            } else {
                this.map.loadMap('overworld');
                this.trainer.x = 10; this.trainer.y = 6; // Outside door
                this.trainer.targetX = 10; this.trainer.targetY = 6;
                this.trainer.pixelX = 10 * TILE_SIZE; this.trainer.pixelY = 6 * TILE_SIZE;
                this.trainer.direction = 0; // Face down
                this.playAudio('main');
            }
        }

        // Nurse Interaction Check (if facing nurse)
        // If we just moved, we are not interacting. Interaction key needed.
        // But for "Walking into door tile", that was auto.
        // Grass Encounter
        if (tile === 0 && Math.random() < 0.1) {
            this.startBattle();
        }
    }

    checkInteraction() {
        if (this.state !== 'overworld') return;

        const dx = [0, -1, 1, 0][this.trainer.direction];
        const dy = [1, 0, 0, -1][this.trainer.direction];
        const targetX = this.trainer.x + dx;
        const targetY = this.trainer.y + dy;

        // Nurse interaction
        if (this.map.currentMapId === 'center' && this.map.getTile(targetX, targetY) === 5) {
            this.showDialogue("포켓몬 센터에 오신 것을 환영합니다! 포켓몬을 모두 치료했습니다.");
            this.trainer.party.forEach(p => p.heal());
            this.playAudio('center'); // Just to ensure it keeps playing or restarts
        }
    }

    showDialogue(text) {
        this.state = 'dialogue';
        const box = document.getElementById('dialogue-box');
        const p = document.getElementById('dialogue-text');
        box.classList.remove('hidden');
        p.innerText = text;
        this.dialogueTimer = 0;
    }

    startBattle() {
        this.state = 'battle';
        this.input.reset();
        
        const wildPokemon = Math.random() > 0.5 ? new Pokemon('squirtle', 3) : new Pokemon('bulbasaur', 3);
        this.battleSystem = new BattleSystem(this.trainer, wildPokemon, (won) => {
            this.state = 'overworld';
            this.battleSystem = null;
        });
        this.battleSystem.start();
    }

    loop(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.loaded) {
            this.update(dt);
            this.draw();
        }

        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (this.state === 'overworld') {
            this.trainer.update(dt, this.input, this.map);
            
            if (this.input.isJustPressed(KEYS.SPACE) || this.input.isJustPressed(KEYS.CONFIRM)) {
                this.checkInteraction();
            }
        }
        else if (this.state === 'dialogue') {
            this.dialogueTimer += dt;
            if (this.dialogueTimer > 300) {
                if (this.input.isJustPressed(KEYS.SPACE) || this.input.isJustPressed(KEYS.CONFIRM)) {
                    document.getElementById('dialogue-box').classList.add('hidden');
                    this.state = 'overworld';
                }
            }
        }
        else if (this.state === 'battle' && this.battleSystem) {
            this.battleSystem.update(dt);
        }
        // Battle updates happen via event listeners mostly, but we could drive animations here
    }

    draw() {
        // Clear
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'start_screen') return;

        // Camera logic (Keep player centered)
        // Canvas 640x480. Center is 320, 240.
        // Offset = Center - PlayerPx
        let camX = 320 - this.trainer.pixelX - 16;
        let camY = 240 - this.trainer.pixelY - 24;

        // Clamp Camera (Optional, but good)
        const mapW = this.map.width * TILE_SIZE;
        const mapH = this.map.height * TILE_SIZE;
        // camX = Math.min(0, Math.max(camX, 640 - mapW));
        // camY = Math.min(0, Math.max(camY, 480 - mapH));
        // Note: For small maps, clamping might center the map incorrectly if map < canvas.
        // Since map is small (20x15 = 640x480), it fits exactly.
        if (mapW <= 640) camX = (640 - mapW) / 2;
        if (mapH <= 480) camY = (480 - mapH) / 2;

        this.ctx.save();
        this.ctx.translate(Math.floor(camX), Math.floor(camY));

        this.map.draw(this.ctx);
        this.trainer.draw(this.ctx);

        this.ctx.restore();
    }
}

// Start Game
const game = new Game();
game.init();
