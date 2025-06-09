
        // Game state and configuration
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");

        // Game state
        let gameState = 'playing'; // 'playing', 'gameOver', 'win', 'paused'
        let score = 0;
        let lives = 3;
        let level = 1;
        let animationId;

        // Power-up system
        let powerUps = {
            multiBall: { active: false, duration: 0 },
            longPaddle: { active: false, duration: 0 },
            bigBall: { active: false, duration: 0 },
            fireBall: { active: false, duration: 0 }
        };

        let extraBalls = [];
        let powerUpDrops = [];

        // Paddle configuration
        const paddle = {
            width: 120,
            baseWidth: 120,
            height: 15,
            x: (canvas.width - 120) / 2,
            y: canvas.height - 30,
            speed: 8,
            color: '#4ecdc4'
        };

        // Ball configuration
        const ball = {
            radius: 8,
            baseRadius: 8,
            x: canvas.width / 2,
            y: canvas.height - 50,
            dx: 4,
            dy: -4,
            baseSpeed: 4,
            color: '#ff6b6b',
            trail: [],
            piercing: 0
        };

        // Blocks configuration
        const blockConfig = {
            rows: 6,
            cols: 10,
            width: 75,
            height: 20,
            padding: 5,
            offsetTop: 80,
            offsetLeft: 12.5,
            colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f39c12', '#9b59b6', '#e74c3c']
        };

        // Gem configuration
        const gemConfig = {
            colors: {
                diamond: '#e8f4ff',
                ruby: '#ff1744',
                emerald: '#00e676',
                sapphire: '#2962ff',
                topaz: '#ffab00'
            },
            sparkleColors: ['#ffffff', '#ffffcc', '#ccffff', '#ffccff']
        };

        let blocks = [];

        // Mouse and touch tracking
        let mouseX = paddle.x + paddle.width / 2;
        let touchX = paddle.x + paddle.width / 2;
        let rightPressed = false;
        let leftPressed = false;

        // Initialize the game
        function initGame() {
            createBlocks();
            resetBall();
            gameState = 'playing';
            updateDisplay();
        }

        // Create blocks grid
        function createBlocks() {
            blocks = [];
            const gemTypes = Object.keys(gemConfig.colors);
            
            for (let row = 0; row < blockConfig.rows; row++) {
                for (let col = 0; col < blockConfig.cols; col++) {
                    // Randomly make some blocks into gems (15% chance)
                    const isGem = Math.random() < 0.15;
                    const gemType = isGem ? gemTypes[Math.floor(Math.random() * gemTypes.length)] : null;
                    
                    // Some blocks require multiple hits (20% chance for non-gem blocks)
                    const isMultiHit = !isGem && Math.random() < 0.2;
                    const maxHits = isMultiHit ? 2 : 1;
                    
                    blocks.push({
                        x: col * (blockConfig.width + blockConfig.padding) + blockConfig.offsetLeft,
                        y: row * (blockConfig.height + blockConfig.padding) + blockConfig.offsetTop,
                        width: blockConfig.width,
                        height: blockConfig.height,
                        color: isGem ? gemConfig.colors[gemType] : blockConfig.colors[row],
                        destroyed: false,
                        points: isGem ? (blockConfig.rows - row) * 50 : (blockConfig.rows - row) * 10,
                        isGem: isGem,
                        gemType: gemType,
                        sparkleTime: 0,
                        maxHits: maxHits,
                        currentHits: 0,
                        isMultiHit: isMultiHit
                    });
                }
            }
        }

        // Reset ball position and velocity
        function resetBall() {
            ball.x = canvas.width / 2;
            ball.y = canvas.height - 50;
            ball.dx = (Math.random() > 0.5 ? 1 : -1) * ball.baseSpeed;
            ball.dy = -ball.baseSpeed;
            ball.trail = [];
        }

        // Update game display
        function updateDisplay() {
            document.getElementById('scoreDisplay').textContent = score;
            document.getElementById('livesDisplay').textContent = lives;
            document.getElementById('levelDisplay').textContent = level;
        }

        // Draw paddle with gradient
        function drawPaddle() {
            const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
            gradient.addColorStop(0, paddle.color);
            gradient.addColorStop(1, '#3a9b9a');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
            
            // Add paddle highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(paddle.x, paddle.y, paddle.width, 3);
        }

        // Draw ball with trail effect and fire effect
        function drawSingleBall(ballObj) {
            // Draw trail
            ballObj.trail.push({ x: ballObj.x, y: ballObj.y });
            if (ballObj.trail.length > 10) {
                ballObj.trail.shift();
            }

            for (let i = 0; i < ballObj.trail.length; i++) {
                const alpha = i / ballObj.trail.length;
                ctx.globalAlpha = alpha * 0.5;
                ctx.beginPath();
                ctx.arc(ballObj.trail[i].x, ballObj.trail[i].y, ballObj.radius * alpha, 0, Math.PI * 2);
                ctx.fillStyle = ballObj.color;
                ctx.fill();
                ctx.closePath();
            }

            ctx.globalAlpha = 1;

            // Add fire effect for fire ball
            if (ballObj.piercing > 0) {
                ctx.shadowColor = '#ff4500';
                ctx.shadowBlur = 15;
                
                // Draw flame particles around the ball
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const flameX = ballObj.x + Math.cos(angle) * (ballObj.radius + 5);
                    const flameY = ballObj.y + Math.sin(angle) * (ballObj.radius + 5);
                    const flameSize = Math.random() * 3 + 1;
                    
                    ctx.fillStyle = i % 2 === 0 ? '#ff4500' : '#ffaa00';
                    ctx.beginPath();
                    ctx.arc(flameX, flameY, flameSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw main ball with gradient
            const gradient = ctx.createRadialGradient(ballObj.x - 3, ballObj.y - 3, 0, ballObj.x, ballObj.y, ballObj.radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, ballObj.color);
            
            ctx.beginPath();
            ctx.arc(ballObj.x, ballObj.y, ballObj.radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.closePath();
            
            ctx.shadowBlur = 0;
        }

        // Draw all balls
        function drawBalls() {
            drawSingleBall(ball);
            extraBalls.forEach(extraBall => {
                drawSingleBall(extraBall);
            });
        }

        // Draw power-up drops
        function drawPowerUpDrops() {
            powerUpDrops.forEach(drop => {
                if (!drop.collected) {
                    // Draw power-up icon with glow effect
                    ctx.shadowColor = drop.color;
                    ctx.shadowBlur = 10;
                    
                    // Draw main power-up box
                    ctx.fillStyle = drop.color;
                    ctx.fillRect(drop.x - drop.width / 2, drop.y - drop.height / 2, drop.width, drop.height);
                    
                    // Add inner glow
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                    ctx.fillRect(drop.x - drop.width / 2 + 2, drop.y - drop.height / 2 + 2, drop.width - 4, drop.height - 4);
                    
                    // Draw power-up symbol
                    ctx.fillStyle = 'black';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    let symbol = '';
                    switch(drop.type) {
                        case 'multiBall': symbol = '⚬⚬'; break;
                        case 'longPaddle': symbol = '━━'; break;
                        case 'bigBall': symbol = '●'; break;
                        case 'fireBall': symbol = '🔥'; break;
                    }
                    ctx.fillText(symbol, drop.x, drop.y + 4);
                    
                    ctx.shadowBlur = 0;
                }
            });
        }

        // Draw blocks with gradients and gem effects
        function drawBlocks() {
            blocks.forEach(block => {
                if (!block.destroyed) {
                    if (block.isGem) {
                        drawGemBlock(block);
                    } else {
                        drawNormalBlock(block);
                    }
                }
            });
        }

        // Draw normal blocks
        function drawNormalBlock(block) {
            let blockColor = block.color;
            
            // Multi-hit blocks get darker as they take damage
            if (block.isMultiHit) {
                const hitRatio = block.currentHits / block.maxHits;
                blockColor = darkenColor(block.color, hitRatio * 0.4);
                
                // Add cracks effect for damaged multi-hit blocks
                if (block.currentHits > 0) {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    // Draw crack lines
                    ctx.moveTo(block.x + 10, block.y + 5);
                    ctx.lineTo(block.x + block.width - 15, block.y + block.height - 8);
                    ctx.moveTo(block.x + block.width - 20, block.y + 3);
                    ctx.lineTo(block.x + 8, block.y + block.height - 5);
                    ctx.stroke();
                }
            }
            
            const gradient = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
            gradient.addColorStop(0, blockColor);
            gradient.addColorStop(1, darkenColor(blockColor, 0.2));
            
            ctx.fillStyle = gradient;
            ctx.fillRect(block.x, block.y, block.width, block.height);
            
            // Add block highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(block.x, block.y, block.width, 2);
            
            // Add border (thicker for multi-hit blocks)
            ctx.strokeStyle = block.isMultiHit ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = block.isMultiHit ? 2 : 1;
            ctx.strokeRect(block.x, block.y, block.width, block.height);
            
            // Show hit counter for multi-hit blocks
            if (block.isMultiHit && !block.destroyed) {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                const hitsLeft = block.maxHits - block.currentHits;
                ctx.fillText(hitsLeft.toString(), block.x + block.width / 2, block.y + block.height / 2 + 4);
            }
        }

        // Draw gem blocks with sparkle effects
        function drawGemBlock(block) {
            block.sparkleTime += 0.1;
            
            // Create shimmering gradient
            const gradient = ctx.createLinearGradient(block.x, block.y, block.x + block.width, block.y + block.height);
            gradient.addColorStop(0, block.color);
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(1, block.color);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(block.x, block.y, block.width, block.height);
            
            // Add gem facets (diamond pattern)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            // Draw diamond pattern
            ctx.moveTo(block.x + block.width / 2, block.y);
            ctx.lineTo(block.x + block.width, block.y + block.height / 2);
            ctx.lineTo(block.x + block.width / 2, block.y + block.height);
            ctx.lineTo(block.x, block.y + block.height / 2);
            ctx.closePath();
            ctx.stroke();
            
            // Add center line
            ctx.moveTo(block.x, block.y + block.height / 2);
            ctx.lineTo(block.x + block.width, block.y + block.height / 2);
            ctx.stroke();
            ctx.moveTo(block.x + block.width / 2, block.y);
            ctx.lineTo(block.x + block.width / 2, block.y + block.height);
            ctx.stroke();
            
            // Add sparkles
            for (let i = 0; i < 3; i++) {
                const sparkleX = block.x + (Math.sin(block.sparkleTime + i * 2) * 0.5 + 0.5) * block.width;
                const sparkleY = block.y + (Math.cos(block.sparkleTime + i * 1.5) * 0.5 + 0.5) * block.height;
                const sparkleSize = Math.sin(block.sparkleTime * 2 + i) * 2 + 2;
                
                ctx.fillStyle = gemConfig.sparkleColors[i % gemConfig.sparkleColors.length];
                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Add outer glow
            ctx.shadowColor = block.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = block.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(block.x, block.y, block.width, block.height);
            ctx.shadowBlur = 0;
        }

        // Utility function to darken colors
        function darkenColor(color, amount) {
            const hex = color.replace('#', '');
            const num = parseInt(hex, 16);
            const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
            const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
            const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
            return `rgb(${r}, ${g}, ${b})`;
        }

        // Collision detection
        function collisionDetection() {
            blocks.forEach(block => {
                if (!block.destroyed) {
                    if (ball.x + ball.radius > block.x && 
                        ball.x - ball.radius < block.x + block.width &&
                        ball.y + ball.radius > block.y && 
                        ball.y - ball.radius < block.y + block.height) {
                        
                        // Determine collision direction
                        const overlapLeft = (ball.x + ball.radius) - block.x;
                        const overlapRight = (block.x + block.width) - (ball.x - ball.radius);
                        const overlapTop = (ball.y + ball.radius) - block.y;
                        const overlapBottom = (block.y + block.height) - (ball.y - ball.radius);
                        
                        const minOverlapX = Math.min(overlapLeft, overlapRight);
                        const minOverlapY = Math.min(overlapTop, overlapBottom);
                        
                        if (minOverlapX < minOverlapY) {
                            ball.dx = -ball.dx;
                        } else {
                            ball.dy = -ball.dy;
                        }
                        
                        // Handle multi-hit blocks
                        if (block.isMultiHit) {
                            block.currentHits++;
                            if (block.currentHits >= block.maxHits) {
                                block.destroyed = true;
                                score += block.points * 2; // Bonus points for multi-hit blocks
                            } else {
                                score += Math.floor(block.points / 2); // Partial points for hitting
                            }
                        } else {
                            block.destroyed = true;
                            score += block.points;
                        }
                        
                        // Drop power-up if gem block (only when fully destroyed)
                        if (block.isGem && block.destroyed) {
                            createPowerUpDrop(block.x + block.width / 2, block.y + block.height / 2);
                        }
                        
                        // Create particle effect
                        createParticles(block.x + block.width / 2, block.y + block.height / 2, block.color);
                        
                        // Fire ball can pierce through blocks
                        if (ball.piercing > 0) {
                            ball.piercing--;
                        } else {
                            // Determine collision direction
                            const overlapLeft = (ball.x + ball.radius) - block.x;
                            const overlapRight = (block.x + block.width) - (ball.x - ball.radius);
                            const overlapTop = (ball.y + ball.radius) - block.y;
                            const overlapBottom = (block.y + block.height) - (ball.y - ball.radius);
                            
                            const minOverlapX = Math.min(overlapLeft, overlapRight);
                            const minOverlapY = Math.min(overlapTop, overlapBottom);
                            
                            if (minOverlapX < minOverlapY) {
                                ball.dx = -ball.dx;
                            } else {
                                ball.dy = -ball.dy;
                            }
                        }
                        
                        // Slightly increase ball speed
                        const speedIncrease = 1.005;
                        ball.dx *= speedIncrease;
                        ball.dy *= speedIncrease;
                        
                        updateDisplay();
                    }
                }
            });
        }

        // Create power-up drop
        function createPowerUpDrop(x, y) {
            const powerUpTypes = ['multiBall', 'longPaddle', 'bigBall', 'fireBall'];
            const randomPowerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            
            powerUpDrops.push({
                x: x,
                y: y,
                type: randomPowerUp,
                width: 20,
                height: 20,
                dy: 2, // Fall speed
                collected: false,
                color: getPowerUpColor(randomPowerUp)
            });
        }

        function getPowerUpColor(type) {
            switch(type) {
                case 'multiBall': return '#ff69b4';
                case 'longPaddle': return '#00ff00';
                case 'bigBall': return '#ffa500';
                case 'fireBall': return '#ff4500';
                default: return '#ffffff';
            }
        }

        // Power-up activation
        function activateRandomPowerUp(type) {
            switch(type) {
                case 'multiBall':
                    activateMultiBall();
                    break;
                case 'longPaddle':
                    activateLongPaddle();
                    break;
                case 'bigBall':
                    activateBigBall();
                    break;
                case 'fireBall':
                    activateFireBall();
                    break;
            }
        }

        function activateMultiBall() {
            powerUps.multiBall.active = true;
            powerUps.multiBall.duration = 600; // 10 seconds at 60fps
            
            // Create 2 extra balls
            for (let i = 0; i < 2; i++) {
                extraBalls.push({
                    x: ball.x,
                    y: ball.y,
                    dx: (Math.random() - 0.5) * 8,
                    dy: -Math.abs(ball.dy),
                    radius: ball.radius,
                    color: '#ff6b6b',
                    trail: [],
                    piercing: ball.piercing
                });
            }
        }

        function activateLongPaddle() {
            powerUps.longPaddle.active = true;
            powerUps.longPaddle.duration = 900; // 15 seconds
            paddle.width = paddle.baseWidth * 1.5;
        }

        function activateBigBall() {
            powerUps.bigBall.active = true;
            powerUps.bigBall.duration = 600; // 10 seconds
            ball.radius = ball.baseRadius * 1.5;
            extraBalls.forEach(extraBall => {
                extraBall.radius = ball.baseRadius * 1.5;
            });
        }

        function activateFireBall() {
            powerUps.fireBall.active = true;
            powerUps.fireBall.duration = 450; // 7.5 seconds
            ball.piercing = 3;
            ball.color = '#ff4500';
            extraBalls.forEach(extraBall => {
                extraBall.piercing = 3;
                extraBall.color = '#ff4500';
            });
        }

        function updatePowerUps() {
            // Update power-up durations
            Object.keys(powerUps).forEach(powerUp => {
                if (powerUps[powerUp].active) {
                    powerUps[powerUp].duration--;
                    if (powerUps[powerUp].duration <= 0) {
                        deactivatePowerUp(powerUp);
                    }
                }
            });
        }

        function deactivatePowerUp(powerUpName) {
            powerUps[powerUpName].active = false;
            
            switch(powerUpName) {
                case 'longPaddle':
                    paddle.width = paddle.baseWidth;
                    break;
                case 'bigBall':
                    ball.radius = ball.baseRadius;
                    extraBalls.forEach(extraBall => {
                        extraBall.radius = ball.baseRadius;
                    });
                    break;
                case 'fireBall':
                    ball.piercing = 0;
                    ball.color = '#ff6b6b';
                    extraBalls.forEach(extraBall => {
                        extraBall.piercing = 0;
                        extraBall.color = '#ff6b6b';
                    });
                    break;
                case 'multiBall':
                    extraBalls = [];
                    break;
            }
        }

        // Simple particle effect (not implemented for simplicity, but could be added)
        function createParticles(x, y, color) {
            // Placeholder for particle effect
            // Could implement a simple particle system here
        }

        // Update paddle position
        function updatePaddle() {
            if (rightPressed && paddle.x < canvas.width - paddle.width) {
                paddle.x += paddle.speed;
            } else if (leftPressed && paddle.x > 0) {
                paddle.x -= paddle.speed;
            }
            
            // Mouse control - improved responsiveness
            const targetX = mouseX - paddle.width / 2;
            const distance = targetX - paddle.x;
            
            // Use a more responsive interpolation for better control
            if (Math.abs(distance) > 1) {
                paddle.x += distance * 0.2;
            }
            
            // Boundary checking
            if (paddle.x < 0) paddle.x = 0;
            if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
        }

        // Main game loop
        function draw() {
            if (gameState !== 'playing') return;
            
            // Clear canvas with subtle gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#0f0f23');
            gradient.addColorStop(0.5, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw game elements
            drawBlocks();
            drawPaddle();
            drawBalls();
            drawPowerUpDrops();
            
            // Update paddle and power-ups
            updatePaddle();
            updatePowerUps();
            updatePowerUpDrops();
            
            // Update main ball
            updateBallPhysics(ball);
            
            // Update extra balls
            extraBalls.forEach((extraBall, index) => {
                updateBallPhysics(extraBall);
                
                // Remove extra balls that fall off screen
                if (extraBall.y > canvas.height) {
                    extraBalls.splice(index, 1);
                }
            });
            
            // Check for collision detection
            collisionDetection();
            
            // Check for game end conditions
            if (ball.y > canvas.height && extraBalls.length === 0) {
                lives--;
                updateDisplay();
                if (lives === 0) {
                    gameOver();
                } else {
                    resetBall();
                }
            }
            
            // Check win condition
            const remainingBlocks = blocks.filter(block => !block.destroyed).length;
            if (remainingBlocks === 0) {
                levelComplete();
            }
            
            requestAnimationFrame(draw);
        }

        // Ball physics for individual balls
        function updateBallPhysics(ballObj) {
            // Wall collisions
            if (ballObj.x + ballObj.dx > canvas.width - ballObj.radius || ballObj.x + ballObj.dx < ballObj.radius) {
                ballObj.dx = -ballObj.dx;
            }
            
            if (ballObj.y + ballObj.dy < ballObj.radius) {
                ballObj.dy = -ballObj.dy;
            } else if (ballObj.y + ballObj.dy > paddle.y - ballObj.radius) {
                // Ball hits paddle area
                if (ballObj.x > paddle.x && ballObj.x < paddle.x + paddle.width) {
                    // Calculate hit position on paddle (0 to 1)
                    const hitPos = (ballObj.x - paddle.x) / paddle.width;
                    
                    // Adjust ball angle based on hit position
                    const angle = (hitPos - 0.5) * Math.PI / 3; // Max 60 degrees
                    const speed = Math.sqrt(ballObj.dx * ballObj.dx + ballObj.dy * ballObj.dy);
                    
                    ballObj.dx = Math.sin(angle) * speed;
                    ballObj.dy = -Math.cos(angle) * speed;
                }
            }
            
            ballObj.x += ballObj.dx;
            ballObj.y += ballObj.dy;
        }

        // Update power-up drops
        function updatePowerUpDrops() {
            powerUpDrops.forEach((drop, index) => {
                if (!drop.collected) {
                    // Move drop down
                    drop.y += drop.dy;
                    
                    // Check collision with paddle
                    if (drop.y + drop.height / 2 >= paddle.y &&
                        drop.y - drop.height / 2 <= paddle.y + paddle.height &&
                        drop.x + drop.width / 2 >= paddle.x &&
                        drop.x - drop.width / 2 <= paddle.x + paddle.width) {
                        
                        // Collect power-up
                        drop.collected = true;
                        activateRandomPowerUp(drop.type);
                        powerUpDrops.splice(index, 1);
                    }
                    
                    // Remove if it falls off screen
                    if (drop.y > canvas.height + 50) {
                        powerUpDrops.splice(index, 1);
                    }
                }
            });
        }

        // Game over
        function gameOver() {
            gameState = 'gameOver';
            document.getElementById('finalScore').textContent = score;
            document.getElementById('gameOverScreen').style.display = 'block';
            cancelAnimationFrame(animationId);
        }

        // Level complete
        function levelComplete() {
            gameState = 'win';
            document.getElementById('winScore').textContent = score;
            document.getElementById('winScreen').style.display = 'block';
            cancelAnimationFrame(animationId);
        }

        // Restart game
        function restartGame() {
            gameState = 'playing';
            score = 0;
            lives = 3;
            level = 1;
            ball.baseSpeed = 4;
            document.getElementById('gameOverScreen').style.display = 'none';
            document.getElementById('winScreen').style.display = 'none';
            initGame();
            draw();
        }

        // Next level
        function nextLevel() {
            level++;
            ball.baseSpeed += 0.5; // Increase difficulty
            document.getElementById('winScreen').style.display = 'none';
            initGame();
            draw();
        }

        // Event listeners
        document.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowRight') rightPressed = true;
            if (e.code === 'ArrowLeft') leftPressed = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowRight') rightPressed = false;
            if (e.code === 'ArrowLeft') leftPressed = false;
        });

        // Mouse controls - improved tracking
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            mouseX = (e.clientX - rect.left) * scaleX;
        });

        // Touch controls
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            mouseX = (touch.clientX - rect.left) * scaleX;
        });

        // Prevent scrolling on touch
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Handle window resize
        function handleResize() {
            const container = document.querySelector('.game-container');
            const maxWidth = Math.min(window.innerWidth * 0.9, 800);
            const maxHeight = Math.min(window.innerHeight * 0.6, 600);
            
            if (window.innerWidth <= 768) {
                canvas.style.width = maxWidth + 'px';
                canvas.style.height = (maxWidth * 0.75) + 'px';
            } else {
                canvas.style.width = '';
                canvas.style.height = '';
            }
        }

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        // Initialize game when page loads
        window.addEventListener('load', () => {
            handleResize();
            initGame();
            draw();
        });
