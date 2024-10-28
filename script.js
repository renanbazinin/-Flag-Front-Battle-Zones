const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const autoAttackButton = document.getElementById('autoAttackButton');
const pauseButton = document.getElementById('pauseButton');
const mainMenuButton = document.getElementById('mainMenuButton');
const createUnitButton = document.getElementById('createUnitButton');
const buildFarmButton = document.getElementById('buildFarmButton');
const goldDisplay = document.getElementById('goldDisplay');

const mainMenu = document.getElementById('mainMenu');
const easyButton = document.getElementById('easyButton');
const normalButton = document.getElementById('normalButton');
const hardButton = document.getElementById('hardButton');
const continueButton = document.getElementById('continueButton');
const actionButtons = document.getElementById('actionButtons');
const bottomUI = document.getElementById('bottomUI');
const topUI = document.getElementById('topUI');

let stats = {
    actions: 0,
    startTime: Date.now(),
    unitsCreated: 0,
    unitsLost: 0,
    unitsKilled: 0,
    resourcesGathered: 0,
    apm: 0,
    // Add more stats as needed
};


const idleSprite = new Image();
idleSprite.src = 'res/idle_sprite.png'; // Replace with your actual sprite sheet

const movingSprite = new Image();
movingSprite.src = 'res/moving_sprite.png';

const engagingSprite = new Image();
engagingSprite.src = 'res/engaging_sprite.png';



function resizeCanvas() {
    const bottomUIHeight = document.getElementById('bottomUI').offsetHeight;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - bottomUIHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let gameObjects = [];
let playerUnits = [];
let enemyUnits = [];
let buildings = [];
let selectedUnit = null;
let playerGold = 100;
let enemyGold = 100;
let playerGoldPerSecond = 0;
let enemyGoldPerSecond = 0;
let lastResourceUpdate = Date.now();
let lastAIUpdate = Date.now();
let playerFlagCarrier = null;
let enemyFlagCarrier = null;
let moveIndicators = [];
let placingBuilding = false;
let buildingToPlace = null;
let unitIDCounter = 1;
let maxUnits = 9; 
let recycledUnitIDs = [];
let gamePaused = false;
let autoAttackEnabled = true;
let gameStarted = false;
let difficulty = 'easy'; // 'easy', 'normal', 'hard'
let savedGameState = null;
this.previousSelectedState = false; 






function startGame() {
    // Remove the end game screen if it exists
    const endGameScreen = document.getElementById('endGameScreen');
    if (endGameScreen) {
        document.body.removeChild(endGameScreen);
    }

    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
    document.getElementById('topUI').style.display = 'block';
    document.getElementById('bottomUI').style.display = 'flex';

    // Initialize or resume game
    if (!gameStarted || !savedGameState) {
        initGame();
    } else {
        gamePaused = false;
        gameLoop();
    }
    gameStarted = true;
    resizeCanvas();
}



document.getElementById('easyButton').addEventListener('click', startGame);
document.getElementById('normalButton').addEventListener('click', startGame);
document.getElementById('hardButton').addEventListener('click', startGame);

continueButton.addEventListener('click', () => {
    //if (savedGameState) {
     //   loadGame(savedGameState);
    //}
    if (savedGameState) {
        startGame();
    }
});

// Classes
class Unit {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type; // 'melee', 'range', 'flagCarrier'
        this.player = player; // 'player' or 'enemy'
        this.target = null;
        this.destination = null;
        this.speed = 1.5;
        this.radius = 18;
        this.health = 100;
        this.attackDamage = 10;
        this.attackRange = 50;
        this.color = this.player === 'player' ? 'blue' : 'red';
        this.mode = 'idle'; // 'idle', 'moving', 'engaging', 'retreating'
        this.previousMode = null; // To remember previous mode
        this.id = this.assignID();

        if (this.type === 'flagCarrier') {
            this.color = 'yellow';
            this.attackDamage = 0;
            this.attackRange = 0;
            this.speed = 1;
        }

        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.width = `${this.radius * 2}px`;
        this.element.style.height = `${this.radius * 2}px`;
        this.element.style.transform = 'translate(-50%, -50%)';
        this.element.style.pointerEvents = 'none';
        this.element.style.zIndex = 2;
        
        this.imageElement = document.createElement('img');
        this.updateImageSource();
        this.imageElement.style.width = '100%';
        this.imageElement.style.height = '100%';
        this.imageElement.style.position = 'absolute';
        this.imageElement.style.top = '0';
        this.imageElement.style.left = '0';
        this.imageElement.style.zIndex = '1'; // Set lower z-index
        
        this.element.appendChild(this.imageElement); // Append image first
        
        if (this.player === 'player') {
            // Create the ID label for player units
            this.idLabel = document.createElement('span');
            this.idLabel.style.position = 'absolute';
            this.idLabel.style.top = '60%';    // Adjust as needed
            this.idLabel.style.left = '45%';   // Adjust as needed
            this.idLabel.style.transform = 'translate(-50%, -50%)';
            this.idLabel.style.color = 'white';
            this.idLabel.style.font = 'bold 20px Arial';
            this.idLabel.style.textShadow = '2px 2px 4px #000';
            this.idLabel.style.zIndex = '2'; // Set higher z-index
            this.idLabel.style.pointerEvents = 'none'; // Prevent blocking clicks
            this.idLabel.textContent = this.id !== null ? this.id : '';
            this.element.appendChild(this.idLabel); // Append idLabel after image
        }
        
        // Append the container to the body
        document.body.appendChild(this.element);
;

        gameObjects.push(this);
        if (this.player === 'player') {
            playerUnits.push(this);
            if (this.type === 'flagCarrier') {
                playerFlagCarrier = this;
            }
        } else {
            enemyUnits.push(this);
            if (this.type === 'flagCarrier') {
                enemyFlagCarrier = this;
            }
        }
    }
    updateImageSource() {
        if (this.mode === 'idle') {
            this.imageElement.src = 'res/realIdle-bg.png';
        } else if (this.mode === 'moving' || this.mode === 'retreating') {
            this.imageElement.src = 'res/idleswingHalf.gif';
        } else if (this.mode === 'engaging') {
            this.imageElement.src = 'res/idleswing200.gif';
        } else {
            this.imageElement.src = 'res/realIdle-bg.png';
        }
    
        // Flip image for enemy units
        let scaleX = this.player === 'enemy' ? -1 : 1;
        this.imageElement.style.transform = `scaleX(${scaleX})`;
    
        // Apply glow effect to the container element
        if (selectedUnit === this) {
            // Yellow glow for selected unit
            this.element.style.boxShadow = '0 0 10px 5px yellow';
        } else if (this.mode === 'engaging') {
            // Red glow for engaging unit
            this.element.style.boxShadow = '0 0 10px 5px red';
        } else {
            // No glow
            this.element.style.boxShadow = 'none';
        }
    }
    
    

    assignID() {
        if (this.player !== 'player') {
            return null;
        }
    
        if (this.type === 'flagCarrier') {
            return 0; // Flag carrier gets ID 0
        } else {
            let id;
            let usedIDs = playerUnits.filter(u => u.id !== null && u.id !== 0).map(u => u.id);
            for (let i = 1; i <= maxUnits; i++) {
                if (!usedIDs.includes(i)) {
                    id = i;
                    break;
                }
            }
            return id;
        }
    }
    
    
    

    serialize() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            player: this.player,
            health: this.health,
            mode: this.mode,
            previousMode: this.previousMode,
            id: this.id,
            destination: this.destination,
            targetID: this.target ? this.target.id : null,
        };
    }

    static deserialize(data) {
        const unit = new Unit(data.x, data.y, data.type, data.player);
        unit.health = data.health;
        unit.mode = data.mode;
        unit.previousMode = data.previousMode;
        unit.id = data.id;
        unit.destination = data.destination;
        unit.updateImageSource();
        return unit;
    }

  draw() {
        // Update element position
        const canvasRect = canvas.getBoundingClientRect();
        const xPos = canvasRect.left + (this.x / canvas.width) * canvasRect.width;
        const yPos = canvasRect.top + (this.y / canvas.height) * canvasRect.height;
        this.element.style.left = `${xPos}px`;
        this.element.style.top = `${yPos}px`;

        // Update image source if mode has changed
        if (this.mode !== this.previousMode || (selectedUnit === this) !== this.previousSelectedState) {
            this.updateImageSource();
            this.previousMode = this.mode;
            this.previousSelectedState = (selectedUnit === this);
        }

        // Update ID label (if health changes)
        if (this.player === 'player' && this.idLabel && this.id !== null) {
            this.idLabel.textContent = this.id;
        }

        // Draw health bar on canvas
        ctx.fillStyle = 'green';
        ctx.fillRect(
            this.x - this.radius,
            this.y - this.radius - 20,
            (this.health / 100) * (this.radius * 2),
            5
        );
    }
    


    update() {
        if (this.health <= 0) {
            this.die();
            return;
        }

        if (gamePaused) return;

        // Health regeneration
        this.regenerateHealth();

        switch (this.mode) {
            case 'idle':
                this.lookForEnemies();
                break;
            case 'moving':
                this.move();
                this.lookForEnemies();
                break;
            case 'engaging':
                this.attack();
                break;
            case 'retreating':
                this.move();
                break;
        }
    }

    regenerateHealth() {
        let inPlayerArea = isInControlledArea(this.x);
        let regenRate = inPlayerArea ? 0.2 : 0.1;
        this.health = Math.min(100, this.health + regenRate);
    }

    move() {
        if (this.destination) {
            let dx = this.destination.x - this.x;
            let dy = this.destination.y - this.y;
            let distance = Math.hypot(dx, dy);

            if (distance > 1) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            } else {
                this.destination = null;
                this.mode = 'idle';
            }
        } else {
            this.mode = 'idle';
        }
    }

    lookForEnemies() {
        let enemies = this.player === 'player' ? enemyUnits : playerUnits;
        let potentialTargets = [...enemies, ...buildings.filter(b => b.player !== this.player)];
        for (let enemy of potentialTargets) {
            let dx = enemy.x - this.x;
            let dy = enemy.y - this.y;
            let distance = Math.hypot(dx, dy);
            if (distance <= this.attackRange + (enemy.radius || enemy.width / 2)) {
                this.target = enemy;
                this.previousMode = this.mode; // Remember current mode before engaging
                this.mode = 'engaging';
                break;
            }
        }
    }

    attack() {
        if (this.target && this.target.health > 0) {
            let dx = this.target.x - this.x;
            let dy = this.target.y - this.y;
            let distance = Math.hypot(dx, dy);

            if (distance <= this.attackRange + (this.target.radius || this.target.width / 2)) {
                // Inflict damage
                this.target.health -= this.attackDamage * 0.1;
            } else {
                // Move towards target
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            }
        } else {
            // Target is dead or null
            this.target = null;
            // Return to previous mode
            if (this.previousMode === 'moving' || this.previousMode === 'retreating') {
                this.mode = this.previousMode;
            } else {
                this.mode = 'idle';
            }
        }
    }

    die() {
        // Remove image element

        if (selectedUnit === this) {
            selectUnit(null);
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    
        removeGameObject(this);
        if (this.type === 'flagCarrier') {
            if (this.player === 'player') {
                playerFlagCarrier = null;
                setTimeout(() => {
                    this.respawn();
                }, 5000);
            } else {
                enemyFlagCarrier = null;
                setTimeout(() => {
                    this.respawn();
                }, 5000);
            }
        }
    }

    respawn() {
        this.health = 100;
        gameObjects.push(this);
        if (this.player === 'player') {
            playerUnits.push(this);
            playerFlagCarrier = this;
            let playerCastle = buildings.find(b => b.player === 'player' && b.type === 'castle');
            this.x = playerCastle.x + 100;
            this.y = playerCastle.y;
        } else {
            enemyUnits.push(this);
            enemyFlagCarrier = this;
            let enemyCastle = buildings.find(b => b.player === 'enemy' && b.type === 'castle');
            this.x = enemyCastle.x - 100;
            this.y = enemyCastle.y;
        }
    
        // Re-create element
        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.width = `${this.radius * 2}px`;
        this.element.style.height = `${this.radius * 2}px`;
        this.element.style.transform = 'translate(-50%, -50%)';
        this.element.style.pointerEvents = 'none';
        this.element.style.zIndex = 2;
    
        // Re-create image element
        this.imageElement = document.createElement('img');
        this.updateImageSource();
        this.imageElement.style.width = '100%';
        this.imageElement.style.height = '100%';
    
        // Re-create idLabel if player unit
        if (this.player === 'player') {
            this.idLabel = document.createElement('span');
            this.idLabel.style.position = 'absolute';
            this.idLabel.style.top = '60%';    // Move down from 50% to 60%
            this.idLabel.style.left = '45%';   // Move left from 50% to 45%
            this.idLabel.style.transform = 'translate(-50%, -50%)';
            this.idLabel.style.color = 'white';
            this.idLabel.style.font = 'bold 20px Arial';
            this.idLabel.style.textShadow = '2px 2px 4px #000';
            this.idLabel.textContent = this.id !== null ? this.id : '';
            this.element.appendChild(this.idLabel);
        }
    
        // Append image to element
        this.element.appendChild(this.imageElement);
    
        // Append the element to the body
        document.body.appendChild(this.element);
    }
    
}
class Building {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type; // 'castle', 'farm', 'tower'
        this.player = player; // 'player' or 'enemy'
        this.width = 60;
        this.height = 60;
        this.health = 500;
        this.color = this.player === 'player' ? 'green' : 'brown';

        buildings.push(this);
    }

    serialize() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            player: this.player,
            health: this.health,
        };
    }




    static deserialize(data) {
        const building = new Building(data.x, data.y, data.type, data.player);
        building.health = data.health;
        return building;
    }


    draw() {
        ctx.fillStyle = this.color;

        if (this.type === 'castle') {
            // Draw an octagon
            let size = this.width / 2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                let angle = (Math.PI / 4) * i;
                let x = this.x + size * Math.cos(angle);
                let y = this.y + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }

        // Draw health bar
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, (this.health / 500) * this.width, 5);
    }

    update() {
        if (this.health <= 0) {
            this.destroy();
        }
    }

    destroy() {
        buildings = buildings.filter(b => b !== this);
        // Additional effects can be added here
    }
}

// Helper functions
function removeGameObject(obj) {
    gameObjects = gameObjects.filter(item => item !== obj);
    if (obj.player === 'player') {
        playerUnits = playerUnits.filter(item => item !== obj);
    } else {
        enemyUnits = enemyUnits.filter(item => item !== obj);
    }
    // Remove the unit element
    if (obj.element && obj.element.parentNode) {
        obj.element.parentNode.removeChild(obj.element);
    }
    updateUnitStatsUI();
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw controlled area
    drawControlledArea();

    // Draw buildings
    buildings.forEach(building => {
        building.draw();
    });

    // Draw units (only for health bars and IDs)
    gameObjects.forEach(obj => {
        obj.draw();
    });

    // Draw move indicators
    moveIndicators.forEach(indicator => {
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(indicator.x, indicator.y, 10, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Draw building preview if placing
    if (placingBuilding && buildingToPlace) {
        ctx.globalAlpha = 0.5;
    // Move the health bar 20 pixels above the unit
    ctx.fillStyle = 'green';
    ctx.fillRect(
        this.x - this.radius,
        this.y - this.radius - 20,
        (this.health / 100) * (this.radius * 2),
        5
    );

        ctx.globalAlpha = 1;
    }

    // Display gold and instructions
    displayUI();
}

function update() {
    // Update units
    gameObjects.forEach(obj => {
        obj.update();
    });

    // Update buildings
    buildings.forEach(building => {
        building.update();
    });

    // Resource generation
    if (Date.now() - lastResourceUpdate >= 1000) {
        updateResources();
        lastResourceUpdate = Date.now();
    }

    // AI behavior
    if (Date.now() - lastAIUpdate >= 1000) {
        aiBehavior();
        lastAIUpdate = Date.now();
    }

    // Remove move indicators after a short time
    moveIndicators = moveIndicators.filter(indicator => Date.now() - indicator.time < 500);

    // Check victory conditions
    checkVictory();
}

function gameLoop() {
    if (!gamePaused) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Event Listeners for UI Buttons
pauseButton.addEventListener('click', () => {
    gamePaused = !gamePaused;
    pauseButton.textContent = gamePaused ? 'Resume Game' : 'Pause Game';
    if (gamePaused) {
        savedGameState = saveGame();
        continueButton.disabled = false;
    }
});
mainMenuButton.addEventListener('click', () => {
    gamePaused = true;
    savedGameState = saveGame();
    continueButton.disabled = false;
    pauseButton.textContent = 'Resume Game';
    mainMenu.style.display = 'flex';
    canvas.style.display = 'none';
    actionButtons.style.display = 'none';
    bottomUI.style.display = 'none';
    topUI.style.display = 'none';

});

autoAttackButton.addEventListener('click', () => {
    autoAttackEnabled = !autoAttackEnabled;
    autoAttackButton.textContent = `Auto Attack: ${autoAttackEnabled ? 'On' : 'Off'}`;
});

// Buttons for creating units and farms
createUnitButton.addEventListener('click', () => {
    createPlayerUnit();
});

buildFarmButton.addEventListener('click', () => {
    startBuildingFarm();
});

// Functions for creating units and farms
function createPlayerUnit() {
    if (playerGold >= 50 && playerUnits.filter(u => u.type !== 'flagCarrier').length < maxUnits) {
        const newUnit = new Unit(150, canvas.height / 2, 'melee', 'player');
        if (autoAttackEnabled) {
            // Set destination towards enemy castle
            let enemyCastle = buildings.find(b => b.player === 'enemy' && b.type === 'castle');
            newUnit.destination = { x: enemyCastle.x, y: enemyCastle.y };
            newUnit.mode = 'moving';
        }
        playerGold -= 50;
        updateUnitStatsUI();
        stats.unitsCreated++;
        stats.actions++;
    }
}



function startBuildingFarm() {
    if (playerGold >= 100 && !placingBuilding) {
        placingBuilding = true;
        buildingToPlace = new Building(0, 0, 'farm', 'player');
    }
}

document.addEventListener('keyup', (e) => {
    let unitID = parseInt(e.key);

    // Number keys to select units
    if (e.key >= '1' && e.key <= '9') {
        let unit = playerUnits.find(unit => unit.id === unitID) || null;
        selectUnit(unit);
    } else if (e.key === '0') {
        let unit = playerUnits.find(unit => unit.id === 0) || null;
        selectUnit(unit);
    } else if (e.key === 'u' || e.key === 'U') {
        createPlayerUnit();
    } else if (e.key === 'f' || e.key === 'F') {
        startBuildingFarm();
    }
});



// Initialize game
function initGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Clear previous game data
    gameObjects = [];
    playerUnits = [];
    enemyUnits = [];
    buildings = [];
    selectedUnit = null;
    playerGold = 100;
    enemyGold = 100;
    playerGoldPerSecond = 0;
    enemyGoldPerSecond = 0;
    lastResourceUpdate = Date.now();
    lastAIUpdate = Date.now();
    playerFlagCarrier = null;
    enemyFlagCarrier = null;
    moveIndicators = [];
    placingBuilding = false;
    buildingToPlace = null;
    unitIDCounter = 1; // Start normal units from ID 1
    maxUnits = 9;
    recycledUnitIDs = [];
    gamePaused = false;

    // Player castle
    new Building(100, canvas.height / 2, 'castle', 'player');

    // Enemy castle
    new Building(canvas.width - 100, canvas.height / 2, 'castle', 'enemy');

    // Player flag carrier (ID 0)
    const playerFlag = new Unit(200, canvas.height / 2, 'flagCarrier', 'player');
    playerFlag.id = 0; // Assign ID 0 to flag carrier
    playerUnits.push(playerFlag);
    playerFlagCarrier = playerFlag;

    // Enemy flag carrier
    new Unit(canvas.width - 200, canvas.height / 2, 'flagCarrier', 'enemy');

    updateUnitStatsUI();

    gameLoop();
}


function saveGame() {
    // Create a game state object
    const gameState = {
        // Save relevant game data
        gameObjects: gameObjects.map(obj => obj.serialize()),
        playerUnits: playerUnits.map(u => u.id),
        enemyUnits: enemyUnits.map(u => u.id),
        buildings: buildings.map(b => b.serialize()),
        playerGold,
        enemyGold,
        playerGoldPerSecond,
        enemyGoldPerSecond,
        playerFlagCarrierID: playerFlagCarrier ? playerFlagCarrier.id : null,
        enemyFlagCarrierID: enemyFlagCarrier ? enemyFlagCarrier.id : null,
        selectedUnitID: selectedUnit ? selectedUnit.id : null,
        unitIDCounter,
        recycledUnitIDs: [...recycledUnitIDs],
        autoAttackEnabled,
        difficulty,
    };
    return gameState;
}

function loadGame(gameState) {
    // Restore game data from saved state
    gameObjects = [];
    playerUnits = [];
    enemyUnits = [];
    buildings = [];
    selectedUnit = null;
    playerGold = gameState.playerGold;
    enemyGold = gameState.enemyGold;
    playerGoldPerSecond = gameState.playerGoldPerSecond;
    enemyGoldPerSecond = gameState.enemyGoldPerSecond;
    unitIDCounter = gameState.unitIDCounter;
    recycledUnitIDs = [...gameState.recycledUnitIDs];
    autoAttackEnabled = gameState.autoAttackEnabled;
    difficulty = gameState.difficulty;

    // Recreate game objects
    for (let objData of gameState.gameObjects) {
        const obj = Unit.deserialize(objData);
        gameObjects.push(obj);
        if (obj.player === 'player') {
            playerUnits.push(obj);
            if (obj.type === 'flagCarrier') {
                playerFlagCarrier = obj;
            }
        } else {
            enemyUnits.push(obj);
            if (obj.type === 'flagCarrier') {
                enemyFlagCarrier = obj;
            }
        }
    }

    for (let bData of gameState.buildings) {
        const building = Building.deserialize(bData);
        buildings.push(building);
    }

    selectedUnit = playerUnits.find(u => u.id === gameState.selectedUnitID) || null;

    updateUnitStatsUI();

    gamePaused = false;
    gameLoop();
}


//initGame();

// Mouse events for unit selection and movement
canvas.addEventListener('mousedown', (e) => {
    const mousePos = getMousePos(canvas, e);

    if (placingBuilding && buildingToPlace) {
        // Place the building if in controlled area
        if (isInControlledArea(mousePos.x)) {
            buildingToPlace.x = mousePos.x;
            buildingToPlace.y = mousePos.y;
            buildings.push(buildingToPlace);
            placingBuilding = false;
            buildingToPlace = null;
        }
        return;
    }

        // Check if a unit is clicked
        let unitClicked = false;
        playerUnits.forEach(unit => {
            let dx = mousePos.x - unit.x;
            let dy = mousePos.y - unit.y;
            if (Math.hypot(dx, dy) < unit.radius) {
                selectUnit(unit);
                unitClicked = true;
            }
        });

    if (!unitClicked && selectedUnit) {
        // Second click - move the unit
        // Check if clicked on an enemy unit or building
        let target = null;
        let enemies = [...enemyUnits, ...buildings.filter(b => b.player !== 'player')];
        for (let enemy of enemies) {
            let dx = mousePos.x - enemy.x;
            let dy = mousePos.y - enemy.y;
            if (Math.hypot(dx, dy) < (enemy.radius || enemy.width / 2)) {
                target = enemy;
                break;
            }
        }

        if (target) {
            selectedUnit.target = target;
            selectedUnit.mode = 'engaging';
        } else {
            selectedUnit.destination = { x: mousePos.x, y: mousePos.y };
            selectedUnit.mode = selectedUnit.mode === 'engaging' ? 'retreating' : 'moving';
            // Add move indicator
            moveIndicators.push({ x: mousePos.x, y: mousePos.y, time: Date.now() });
        }
        selectedUnit = null;
        selectUnit(null); // Deselect the unit

    }
});

function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// Resource and area control updates
function updateResources() {
    // Calculate controlled area based on flag carriers
    let playerFlagX = playerFlagCarrier ? playerFlagCarrier.x : buildings.find(b => b.player === 'player' && b.type === 'castle').x;
    let enemyFlagX = enemyFlagCarrier ? enemyFlagCarrier.x : buildings.find(b => b.player === 'enemy' && b.type === 'castle').x;

    let controlBoundary = (playerFlagX + enemyFlagX) / 2;

    // Update gold based on controlled area
    let playerControlledArea = controlBoundary - 0;
    let enemyControlledArea = canvas.width - controlBoundary;

    playerGold += Math.max(0, playerControlledArea / canvas.width) * 10;
    enemyGold += Math.max(0, enemyControlledArea / canvas.width) * 10;
    // Add farm income
    let playerFarms = buildings.filter(b => b.player === 'player' && b.type === 'farm').length;
    let enemyFarms = buildings.filter(b => b.player === 'enemy' && b.type === 'farm').length;

    playerGoldPerSecond = (Math.max(0, playerControlledArea / canvas.width) * 10) + (playerFarms * 5);
    enemyGoldPerSecond = (Math.max(0, enemyControlledArea / canvas.width) * 10) + (enemyFarms * 5);
    if (difficulty === 'hard') {
        enemyGoldPerSecond += 3;
    }
    // Update gold amounts
    playerGold += playerGoldPerSecond;
    enemyGold += enemyGoldPerSecond;



    playerGold += playerFarms * 5;
    enemyGold += enemyFarms * 5;
}

// Draw controlled area
function drawControlledArea() {
    let playerFlagX = playerFlagCarrier ? playerFlagCarrier.x : buildings.find(b => b.player === 'player' && b.type === 'castle').x;
    let enemyFlagX = enemyFlagCarrier ? enemyFlagCarrier.x : buildings.find(b => b.player === 'enemy' && b.type === 'castle').x;

    let controlBoundary = (playerFlagX + enemyFlagX) / 2;

    // Player controlled area
    ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
    ctx.fillRect(0, 0, controlBoundary, canvas.height);

    // Enemy controlled area
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(controlBoundary, 0, canvas.width - controlBoundary, canvas.height);
}

function isInControlledArea(x) {
    let playerFlagX = playerFlagCarrier ? playerFlagCarrier.x : buildings.find(b => b.player === 'player' && b.type === 'castle').x;
    let enemyFlagX = enemyFlagCarrier ? enemyFlagCarrier.x : buildings.find(b => b.player === 'enemy' && b.type === 'castle').x;

    let controlBoundary = (playerFlagX + enemyFlagX) / 2;

    return x <= controlBoundary;
}

// AI behavior
function aiBehavior() {
    // Enemy units move towards player's castle
    enemyUnits.forEach(unit => {
        if (unit.type !== 'flagCarrier' && unit.mode !== 'engaging') {
            let targetBuilding = buildings.find(b => b.player === 'player' && b.type === 'castle');
            if (targetBuilding) {
                unit.destination = { x: targetBuilding.x, y: targetBuilding.y };
                unit.mode = 'moving';
            }
        }
    });

    // Enemy creates new units if enough gold
    if (enemyGold >= 50 && enemyUnits.length < 10) {
        new Unit(canvas.width - 150, canvas.height / 2, 'melee', 'enemy');
        enemyGold -= 50;
    }

    // Enemy moves flag carrier forward if safe
    if (enemyFlagCarrier && enemyFlagCarrier.mode !== 'engaging') {
        enemyFlagCarrier.destination = { x: canvas.width - 300, y: canvas.height / 2 };
        enemyFlagCarrier.mode = 'moving';
    }
}

// Check victory conditions
function checkVictory() {
    let playerCastle = buildings.find(b => b.player === 'player' && b.type === 'castle');
    let enemyCastle = buildings.find(b => b.player === 'enemy' && b.type === 'castle');

    if (!playerCastle || playerCastle.health <= 0) {
        endGame(false);
    }

    if (!enemyCastle || enemyCastle.health <= 0) {
        endGame(true);
    }
}



canvas.addEventListener('mousemove', (e) => {
    if (placingBuilding && buildingToPlace) {
        const mousePos = getMousePos(canvas, e);
        buildingToPlace.x = mousePos.x;
        buildingToPlace.y = mousePos.y;
    }
});

function displayUI() {

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    goldDisplay.textContent = `Gold: ${Math.floor(playerGold)} (+${Math.floor(playerGoldPerSecond)} / sec)`;

    //ctx.fillText(`Gold: ${Math.floor(playerGold)} (+${Math.floor(playerGoldPerSecond)} / sec)`, 10, 30);
    //ctx.fillText('Press "U" to create a unit (50 gold)', 10, 60);
    //ctx.fillText('Press "F" to build a farm (100 gold)', 10, 90);

    if (placingBuilding) {
        ctx.fillText('Click to place the farm in your controlled area', 10, 120);
    }
}

// Update the bottom UI with unit stats
function updateUnitStatsUI() {
    const unitStatsRow = document.getElementById('unitStatsRow');
    unitStatsRow.innerHTML = '';

    // Create an array to hold the units with their IDs
    let unitsArray = Array(maxUnits).fill(null);
    playerUnits.forEach(unit => {
        if (unit.id) {
            unitsArray[unit.id - 1] = unit;
        }
    });

    // Populate the table cells
    unitsArray.forEach((unit, index) => {
        const cell = document.createElement('td');
        if (unit) {
            cell.innerHTML = `Unit ${unit.id}<br>HP: ${Math.round(unit.health)}`;
        } else {
            cell.innerHTML = `Unit ${index + 1}<br>Not Deployed`;
        }
        unitStatsRow.appendChild(cell);
    });
}


// Touch support for mobile devices
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const mouseEvent = new MouseEvent('mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (placingBuilding && buildingToPlace) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
});


document.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') {
        const statsPanel = document.getElementById('statsPanel');
        statsPanel.style.display = statsPanel.style.display === 'none' ? 'block' : 'none';
    }
});



function aiBehavior() {
    enemyUnits.forEach((unit, index) => {
        if (unit.type !== 'flagCarrier' && unit.mode !== 'engaging') {
            if (difficulty === 'normal' && (index + 1) % 5 === 0) {
                // Every fifth unit moves in big zigzags
                unit.destination = getZigzagDestination(unit);
                unit.mode = 'moving';
            } else if (difficulty === 'hard' && (index + 1) % 3 === 0) {
                // Every third unit moves in big zigzags
                unit.destination = getZigzagDestination(unit);
                unit.mode = 'moving';
            } else {
                let targetBuilding = buildings.find(b => b.player === 'player' && b.type === 'castle');
                if (targetBuilding) {
                    unit.destination = { x: targetBuilding.x, y: targetBuilding.y };
                    unit.mode = 'moving';
                }
            }
        }
    });

    // Enemy creates new units if enough gold
    if (enemyGold >= 50 && enemyUnits.length < 10) {
        const newUnit = new Unit(canvas.width - 150, canvas.height / 2, 'melee', 'enemy');
        enemyUnits.push(newUnit);
        enemyGold -= 50;
    }

    // Enemy moves flag carrier forward if safe
    if (enemyFlagCarrier && enemyFlagCarrier.mode !== 'engaging') {
        enemyFlagCarrier.destination = { x: canvas.width - 300, y: canvas.height / 2 };
        enemyFlagCarrier.mode = 'moving';
    }
}

function getZigzagDestination(unit) {
    // Implement a function to calculate big zigzag path
    // For simplicity, we'll alternate the y-coordinate
    let newY = unit.y === canvas.height / 2 ? canvas.height / 4 : (3 * canvas.height) / 4;
    let targetBuilding = buildings.find(b => b.player === 'player' && b.type === 'castle');
    return { x: targetBuilding.x, y: newY };
}



function selectUnit(unit) {
    if (selectedUnit && selectedUnit !== unit) {
        selectedUnit.updateImageSource(); // Remove glow from previous unit
    }
    selectedUnit = unit;
    if (selectedUnit) {
        selectedUnit.updateImageSource(); // Add glow to selected unit
    }
    stats.actions++;
}


function updateStats() {
    let elapsedMinutes = (Date.now() - stats.startTime) / 60000;
    stats.apm = (stats.actions / elapsedMinutes).toFixed(2);
}

function updateStatsDisplay() {
    document.getElementById('apmDisplay').textContent = stats.apm;
    document.getElementById('unitsCreatedDisplay').textContent = stats.unitsCreated;
    document.getElementById('unitsLostDisplay').textContent = stats.unitsLost;
    // Update other stats
}


function endGame(playerWon) {
    gamePaused = true;  // Pause the game when it ends
    updateStats();
    updateStatsDisplay();

    // Hide game UI
    canvas.style.display = 'none';
    actionButtons.style.display = 'none';
    bottomUI.style.display = 'none';
    topUI.style.display = 'none';

    // Show end game screen
    const endGameScreen = document.createElement('div');
    endGameScreen.id = 'endGameScreen';
    endGameScreen.style.position = 'absolute';
    endGameScreen.style.top = '0';
    endGameScreen.style.left = '0';
    endGameScreen.style.width = '100%';
    endGameScreen.style.height = '100%';
    endGameScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    endGameScreen.style.color = 'white';
    endGameScreen.style.display = 'flex';
    endGameScreen.style.flexDirection = 'column';
    endGameScreen.style.justifyContent = 'center';
    endGameScreen.style.alignItems = 'center';
    endGameScreen.style.zIndex = '10';

    const resultText = document.createElement('h1');
    resultText.textContent = playerWon ? 'You Win!' : 'You Lose!';
    endGameScreen.appendChild(resultText);

    // Display statistics
    const statsSummary = document.createElement('div');
    statsSummary.innerHTML = `
        <p>APM: ${stats.apm}</p>
        <p>Units Created: ${stats.unitsCreated}</p>
        <p>Units Lost: ${stats.unitsLost}</p>
    `;
    statsSummary.style.textAlign = 'center';
    endGameScreen.appendChild(statsSummary);

    // Return to main menu button
    const returnButton = document.createElement('button');
    returnButton.textContent = 'Return to Main Menu';
    returnButton.style.marginTop = '20px';
    returnButton.addEventListener('click', () => {
        document.body.removeChild(endGameScreen);
        gameStarted = false;
        savedGameState = null;
        mainMenu.style.display = 'flex';

        // Remove unit images
        gameObjects.forEach(obj => {
            if (obj.element && obj.element.parentNode) {
                document.body.removeChild(obj.element);
            }
        });
    });
    endGameScreen.appendChild(returnButton);

    document.body.appendChild(endGameScreen);
}
