// Log a message to the console to ensure the script is linked correctly
console.log('JavaScript file is linked correctly.');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// --- Game Configuration ---
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const NUM_LANES = 4;
const LANE_HEIGHT = GAME_HEIGHT / NUM_LANES;

// --- State Management ---
let currentScore = 1000;
let isGameOver = false;
let obstacles = [];
let frameCount = 0; // Used to time obstacle spawns

// --- Classes ---
class Truck {
    constructor() {
        this.width = 80;
        this.height = Math.floor(LANE_HEIGHT * 0.7);
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
    constructor() {
        this.width = 50;
        this.height = 50;
        this.lane = Math.floor(Math.random() * NUM_LANES); // Random lane 0-3
        this.x = GAME_WIDTH; // Start off-screen right
        this.y = (this.lane * LANE_HEIGHT) + (LANE_HEIGHT / 2) - (this.height / 2);
        this.speed = 6;
        this.hasCollided = false; // Flag to prevent multiple deductions for one hit
    }

    draw(ctx) {
        ctx.fillStyle = '#E74C3C'; // Red for danger/pollutants
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= this.speed;
    }
}

// --- Initialization ---
const playerTruck = new Truck();

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
    if (isGameOver) return;
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

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawRoadLines();

    // --- Manage Obstacles ---
    frameCount++;
    // Spawn a new obstacle every 60 frames (~1 second)
    if (frameCount % 60 === 0) {
        obstacles.push(new Obstacle());
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

    requestAnimationFrame(gameLoop);
}

// Start the engine
gameLoop();