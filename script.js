// Log a message to the console to ensure the script is linked correctly
console.log('JavaScript file is linked correctly.');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const startGameButton = document.getElementById('start-game-button');
const pauseButton = document.getElementById('pause-button');
const difficultyButtons = document.querySelectorAll('[data-difficulty]');
const playerAvatarImage = new Image();
playerAvatarImage.src = 'img/Truck.png';

// --- Game Configuration ---
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const NUM_LANES = 4;
const LANE_HEIGHT = GAME_HEIGHT / NUM_LANES;

// Different difficulty modes change how fast obstacles move and how often they appear.
const DIFFICULTY_SETTINGS = {
    easy: {
        obstacleSpeed: 4,
        spawnInterval: 90
    },
    normal: {
        obstacleSpeed: 6,
        spawnInterval: 60
    },
    hard: {
        obstacleSpeed: 8,
        spawnInterval: 40
    }
};

const OBSTACLE_TYPES = [
    {
        name: 'Muddy Road',
        width: 72,
        height: 36,
        color: '#7A5A2A',
        imageSrc: 'img/muddy-road.png'
    },
    {
        name: 'Pothole',
        width: 54,
        height: 34,
        color: '#2F2F2F'
    },
    {
        name: 'Large Boulder',
        width: 60,
        height: 60,
        color: '#8A8F98',
        imageSrc: 'img/large-boulder.png'
    },
    {
        name: 'Fallen Tree',
        width: 100,
        height: 42,
        color: '#7B4B1F',
        imageSrc: 'img/fallen-tree.png'
    }
];

const obstacleImages = {};

function loadObstacleImages() {
    OBSTACLE_TYPES.forEach((type) => {
        if (!type.imageSrc) {
            return;
        }

        const image = new Image();
        image.src = type.imageSrc;
        obstacleImages[type.name] = image;
    });
}

// --- State Management ---
let currentScore = 1000;
let isGameOver = false;
let obstacles = [];
let frameCount = 0; // Used to time obstacle spawns
let currentDifficulty = 'normal';
let gameHasStarted = false;
let isPaused = false;
let animationFrameId = null;

// --- Classes ---
class Truck {
    constructor() {
        this.width = 110;
        this.height = Math.floor(LANE_HEIGHT * 0.9);
        this.lane = 1; 
        this.x = 50;   
        this.y = (this.lane * LANE_HEIGHT) + (LANE_HEIGHT / 2) - (this.height / 2);
        
        // Flashing state properties
        this.isFlashing = false;
        this.flashTimer = 0;
    }

    draw(ctx) {
        // Handle flashing effect for visual feedback
        if (this.isFlashing) {
            this.flashTimer--;
            if (this.flashTimer <= 0) {
                this.isFlashing = false;
            }
            // Skip drawing the truck every few frames to create a blink effect
            if (Math.floor(this.flashTimer / 5) % 2 === 0) return;
        }

        if (playerAvatarImage.complete && playerAvatarImage.naturalWidth > 0) {
            ctx.drawImage(playerAvatarImage, this.x, this.y, this.width, this.height);
            return;
        }

        ctx.fillStyle = '#00A3E0';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(this.x + this.width - 20, this.y + 5, 15, this.height - 10);
    }

    move(direction) {
        if (direction === 'up' && this.lane > 0) {
            this.lane--;
        } else if (direction === 'down' && this.lane < NUM_LANES - 1) {
            this.lane++;
        }
        this.y = (this.lane * LANE_HEIGHT) + (LANE_HEIGHT / 2) - (this.height / 2);
    }

    triggerFlash() {
        this.isFlashing = true;
        this.flashTimer = 30; // Flash for 30 frames (about half a second)
    }
}

class Obstacle {
    constructor(speed) {
        this.type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        this.width = this.type.width;
        this.height = this.type.height;
        this.lane = Math.floor(Math.random() * NUM_LANES); // Random lane 0-3
        this.x = GAME_WIDTH; // Start off-screen right
        this.y = (this.lane * LANE_HEIGHT) + (LANE_HEIGHT / 2) - (this.height / 2);
        this.speed = speed;
        this.hasCollided = false; // Flag to prevent multiple deductions for one hit
    }

    draw(ctx) {
        const obstacleImage = obstacleImages[this.type.name];

        if (obstacleImage && obstacleImage.complete && obstacleImage.naturalWidth > 0 && this.type.name !== 'Pothole') {
            ctx.drawImage(obstacleImage, this.x, this.y, this.width, this.height);
            return;
        }

        if (this.type.name === 'Muddy Road') {
            ctx.fillStyle = this.type.color;
            ctx.beginPath();
            ctx.roundRect(this.x, this.y + 8, this.width, this.height - 16, 12);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.fillRect(this.x + 8, this.y + this.height / 2 - 2, this.width - 16, 4);
            return;
        }

        if (this.type.name === 'Pothole') {
            ctx.fillStyle = '#1F1F1F';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#4B4B4B';
            ctx.lineWidth = 4;
            ctx.stroke();
            return;
        }

        if (this.type.name === 'Large Boulder') {
            ctx.fillStyle = this.type.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.beginPath();
            ctx.arc(this.x + this.width * 0.38, this.y + this.height * 0.35, this.width * 0.15, 0, Math.PI * 2);
            ctx.fill();
            return;
        }

        ctx.fillStyle = this.type.color;
        ctx.fillRect(this.x + 6, this.y + this.height * 0.35, this.width - 12, this.height * 0.3);
        ctx.fillRect(this.x + this.width * 0.2, this.y + 8, this.width * 0.15, this.height - 16);
        ctx.fillRect(this.x + this.width * 0.6, this.y + 8, this.width * 0.15, this.height - 16);
        ctx.fillStyle = '#4FCB53';
        ctx.beginPath();
        ctx.arc(this.x + this.width * 0.22, this.y + 8, 10, 0, Math.PI * 2);
        ctx.arc(this.x + this.width * 0.78, this.y + 8, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x -= this.speed;
    }
}

// --- Initialization ---
const playerTruck = new Truck();
loadObstacleImages();

// --- Input Handling ---
function updateDifficultyButtons() {
    difficultyButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.difficulty === currentDifficulty);
    });
}

function setDifficulty(difficulty) {
    currentDifficulty = difficulty;
    updateDifficultyButtons();
}

function updatePauseButton() {
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    pauseButton.classList.toggle('active', isPaused);
}

function resetGame() {
    currentScore = 1000;
    isGameOver = false;
    isPaused = false;
    obstacles = [];
    frameCount = 0;
    playerTruck.lane = 1;
    playerTruck.y = (playerTruck.lane * LANE_HEIGHT) + (LANE_HEIGHT / 2) - (playerTruck.height / 2);
    playerTruck.isFlashing = false;
    playerTruck.flashTimer = 0;
    scoreElement.innerText = currentScore;
    updatePauseButton();
}

function startGame() {
    resetGame();
    gameHasStarted = true;
    document.body.classList.add('game-started');
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

function togglePause() {
    if (!gameHasStarted || isGameOver) {
        return;
    }

    isPaused = !isPaused;
    updatePauseButton();

    if (!isPaused && animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        gameLoop();
    }
}

difficultyButtons.forEach((button) => {
    button.addEventListener('click', () => {
        setDifficulty(button.dataset.difficulty);
    });
});

setDifficulty(currentDifficulty);
updatePauseButton();

startGameButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

window.addEventListener('keydown', (e) => {
    if (!gameHasStarted || isGameOver) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
        return;
    }
    if (isPaused) return;
    if (e.key === 'ArrowUp') playerTruck.move('up');
    if (e.key === 'ArrowDown') playerTruck.move('down');
});

// --- Main Game Loop ---
function drawRoadLines() {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]); 
    
    for (let i = 1; i < NUM_LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * LANE_HEIGHT);
        ctx.lineTo(GAME_WIDTH, i * LANE_HEIGHT);
        ctx.stroke();
    }
    ctx.setLineDash([]); 
}

function checkCollisions() {
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        
        // Simple AABB Collision Detection
        if (!obs.hasCollided &&
            playerTruck.lane === obs.lane &&
            playerTruck.x < obs.x + obs.width &&
            playerTruck.x + playerTruck.width > obs.x) {
            
            // Hit detected! Apply game logic rules
            obs.hasCollided = true;
            playerTruck.triggerFlash();
            currentScore -= 100; 
            
            if (currentScore <= 0) {
                currentScore = 0;
                isGameOver = true;
            }
        }
    }
}

function gameLoop() {
    if (!gameHasStarted) {
        return;
    }

    if (isGameOver) {
        // Draw Game Over Screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        scoreElement.innerText = currentScore;
        return; // Stop the loop
    }

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawRoadLines();

    // --- Manage Obstacles ---
    frameCount++;
    const difficulty = DIFFICULTY_SETTINGS[currentDifficulty];

    // Spawn a new obstacle based on the selected difficulty.
    if (frameCount % difficulty.spawnInterval === 0) {
        obstacles.push(new Obstacle(difficulty.obstacleSpeed));
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.update();
        obs.draw(ctx);

        // Clean up obstacles that have moved off-screen to save memory
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    playerTruck.draw(ctx);
    
    checkCollisions();

    scoreElement.innerText = currentScore;

    animationFrameId = requestAnimationFrame(gameLoop);
}