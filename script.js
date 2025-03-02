document.addEventListener('DOMContentLoaded', () => {
    // Game configuration | 游戏配置
    const gridContainer = document.getElementById('grid-container');
    const gridSize = 10;
    let maxSticks = 10;      
    let cellSize = getCellSize();
    let currentMode = 'point';  // 'point' or 'stick' mode | 点模式或棍模式
    let stickCount = 0;
    let selectedPoint = null;   // Store the first selected point | 存储第一个选中的点
    let currentGameNumber = 1;  // 当前游戏编号
    
    const sticks = new Set();  // Store stick information | 存储小棍信息
    let gamePoints = null;     // Store game point presets | 存储预设点位数据
    let currentDifficulty = 'easy';

    // Difficulty settings for each level | 各难度级别的设置
    const difficultySettings = {
        easy: { maxSticks: 8 },
        medium: { maxSticks: 12 },
        hard: { maxSticks: 15 }
    };

    /**
     * Stick class for managing stick objects
     * 小棍类，用于管理小棍对象
     */
    class Stick {
        constructor(x1, y1, x2, y2) {
            this.x1 = Math.min(x1, x2);
            this.y1 = Math.min(y1, y2);
            this.x2 = Math.max(x1, x2);
            this.y2 = Math.max(y1, y2);
            this.isVertical = x1 === x2;
            this.id = this.generateId();
        }

        generateId() {
            return `stick-${this.x1}-${this.y1}-${this.isVertical ? 'v' : 'h'}`;
        }

        equals(other) {
            return this.id === other.id;
        }
    }

    // 设置容器大小
    const containerSize = cellSize * (gridSize - 1);
    gridContainer.style.width = `${containerSize}px`;
    gridContainer.style.height = `${containerSize}px`;
    
    // 更新x轴和y轴容器大小
    document.querySelector('.x-axis').style.width = `${containerSize}px`;
    document.querySelector('.y-axis').style.height = `${containerSize}px`;

    // 创建网格线
    function createGridLines() {
        // 创建水平线
        for (let i = 0; i < gridSize; i++) {
            const horizontalLine = document.createElement('div');
            horizontalLine.classList.add('grid-line', 'horizontal');
            horizontalLine.style.top = `${i * cellSize}px`;
            gridContainer.appendChild(horizontalLine);
        }

        // 创建垂直线
        for (let i = 0; i < gridSize; i++) {
            const verticalLine = document.createElement('div');
            verticalLine.classList.add('grid-line', 'vertical');
            verticalLine.style.left = `${i * cellSize}px`;
            gridContainer.appendChild(verticalLine);
        }
    }

    // 创建交叉点
    function createIntersectionPoints() {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const gridItem = document.createElement('div');
                gridItem.classList.add('grid-item');
                // 修改定位逻辑，将点定位到线的交叉点上
                // 使用 transform 来调整位置，确保点的中心在交叉点上
                gridItem.style.left = `${x * cellSize}px`;
                gridItem.style.top = `${y * cellSize}px`;
                gridItem.style.transform = 'translate(-50%, -50%)';
                gridItem.dataset.x = x;
                gridItem.dataset.y = y;
                gridContainer.appendChild(gridItem);
            }
        }
    }

    // 更新状态面板显示
    function updateStatusPanel() {
        const currentPoints = document.querySelectorAll('.grid-item.active').length;
        const usedSticks = sticks.size;
        
        document.getElementById('current-points').textContent = currentPoints;
        document.getElementById('used-sticks').textContent = usedSticks;

        // 在自由模式下不显示剩余小棍数量
        const remainingSticks = document.getElementById('remaining-sticks');
        const remainingLabel = document.querySelector('.status-panel p:last-child');
        
        if (currentDifficulty === 'free') {
            remainingLabel.style.display = 'none';
        } else {
            remainingLabel.style.display = 'block';
            remainingSticks.textContent = maxSticks - usedSticks;
        }

        const modeButton = document.getElementById('mode-button');
        // 在非自由模式下禁用模式切换按钮
        if (currentDifficulty !== 'free') {
            modeButton.style.display = 'none';
        } else {
            modeButton.style.display = 'block';
            modeButton.textContent = currentMode === 'point' ? '设置高亮点模式' : '连接小棍模式';
        }
    }

    // 检查两点是否相邻
    function arePointsAdjacent(point1, point2) {
        const x1 = parseInt(point1.dataset.x);
        const y1 = parseInt(point1.dataset.y);
        const x2 = parseInt(point2.dataset.x);
        const y2 = parseInt(point2.dataset.y);

        return (Math.abs(x1 - x2) === 1 && y1 === y2) || 
               (Math.abs(y1 - y2) === 1 && x1 === x2);
    }

    // 修改检查小棍存在的函数
    function hasStickBetween(point1, point2) {
        const x1 = parseInt(point1.dataset.x);
        const y1 = parseInt(point1.dataset.y);
        const x2 = parseInt(point2.dataset.x);
        const y2 = parseInt(point2.dataset.y);
        
        const newStick = new Stick(x1, y1, x2, y2);
        const hasStick = Array.from(sticks).some(stick => stick.id === newStick.id);
        
        console.log('Checking stick between:', {
            point1: { x: x1, y: y1 },
            point2: { x: x2, y: y2 },
            stickId: newStick.id,
            exists: hasStick
        });
        
        return hasStick;
    }

    /**
     * Check victory condition using DFS
     * 使用深度优先搜索检查胜利条件
     */
    function checkVictory() {
        const activePoints = Array.from(document.querySelectorAll('.grid-item.active'));
        console.log('Checking victory, active points:', activePoints.length);
        
        if (activePoints.length < 2) {
            console.log('Less than 2 active points, no victory possible');
            return false;
        }

        const visited = new Set();
        const startPoint = activePoints[0];
        console.log('Starting DFS from point:', {
            x: startPoint.dataset.x,
            y: startPoint.dataset.y
        });
        
        function dfs(point) {
            const x = parseInt(point.dataset.x);
            const y = parseInt(point.dataset.y);
            const pointKey = `${x},${y}`;
            console.log('Visiting point:', { x, y });
            visited.add(pointKey);

            // Check four directions | 检查四个方向
            const directions = [
                {dx: -1, dy: 0, name: '左'}, 
                {dx: 1, dy: 0, name: '右'},
                {dx: 0, dy: -1, name: '上'},
                {dx: 0, dy: 1, name: '下'}
            ];

            for (const dir of directions) {
                const newX = x + dir.dx;
                const newY = y + dir.dy;
                const key = `${newX},${newY}`;
                
                const nextPoint = document.querySelector(
                    `.grid-item[data-x="${newX}"][data-y="${newY}"]`
                );
                
                if (nextPoint &&  
                    !visited.has(key) && 
                    hasStickBetween(point, nextPoint)
                ) {
                    console.log(`Checking ${dir.name} direction:`, { newX, newY });
                    dfs(nextPoint);
                }
            }
        }

        // 从第一个点开始搜索
        dfs(startPoint);

        // Check if all active points are connected | 检查是否所有激活点都已连通
        const result = activePoints.every(point => {
            const key = `${point.dataset.x},${point.dataset.y}`;
            const isVisited = visited.has(key);
            console.log('Checking point:', {
                x: point.dataset.x,
                y: point.dataset.y,
                isVisited: isVisited
            });
            return isVisited;
        });

        console.log('Victory check result:', result);
        console.log('Visited points:', Array.from(visited));
        console.log('Active points:', activePoints.map(p => `${p.dataset.x},${p.dataset.y}`));
        return result;
    }

    /**
     * Handle victory event
     * 处理胜利事件
     */
    function handleVictory() {
        console.log('Victory condition met!'); // 检查是否触发胜利条件
        
        // 播放胜利音效
        const victorySound = document.getElementById('victory-sound');
        console.log('Audio element:', victorySound); // 检查音频元素是否存在
        
        // 添加音频事件监听器
        victorySound.addEventListener('play', () => {
            console.log('Audio started playing');
        });
        
        victorySound.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            console.error('Error code:', victorySound.error.code);
        });

        // 尝试播放并捕获可能的错误
        try {
            const playPromise = victorySound.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('Audio playback started successfully');
                    })
                    .catch(error => {
                        console.error('Playback failed:', error);
                    });
            }
        } catch (error) {
            console.error('Error attempting to play:', error);
        }

        // 显示胜利消息
        setTimeout(() => {
            alert('恭喜你获得胜利！\nCongratulations on your victory!');
        }, 500); // 延迟显示alert，让音效先播放
    }

    // 清除所有相邻点的高亮效果
    function clearAllAdjacentHighlights() {
        document.querySelectorAll('.grid-item.adjacent').forEach(point => {
            point.classList.remove('adjacent');
        });
    }

    // 修改点的状态切换函数
    function togglePoint(event) {
        const point = event.target;
        point.classList.toggle('active');
        clearAllAdjacentHighlights(); // 清理所有高亮效果
        updateStatusPanel();
    }

    // 修改小棍的创建函数
    function createStick(point1, point2) {
        // 在非自由模式下检查小棍数量限制
        if (currentDifficulty !== 'free' && stickCount >= maxSticks) {
            alert(`最多只能使用 ${maxSticks} 个小棍`);
            return;
        }

        const x1 = parseInt(point1.dataset.x);
        const y1 = parseInt(point1.dataset.y);
        const x2 = parseInt(point2.dataset.x);
        const y2 = parseInt(point2.dataset.y);

        // 创建小棍数据对象
        const newStick = new Stick(x1, y1, x2, y2);
        
        // 添加到集合中
        sticks.add(newStick);

        // 创建DOM元素
        const stickElement = document.createElement('div');
        stickElement.classList.add('stick');
        
        if (newStick.isVertical) {
            stickElement.classList.add('vertical');
            stickElement.style.left = `${newStick.x1 * cellSize}px`;
            stickElement.style.top = `${newStick.y1 * cellSize}px`;
            stickElement.style.height = `${cellSize}px`;
        } else {
            stickElement.classList.add('horizontal');
            stickElement.style.left = `${newStick.x1 * cellSize}px`;
            stickElement.style.top = `${newStick.y1 * cellSize}px`;
            stickElement.style.width = `${cellSize}px`;
        }
        
        stickElement.id = newStick.id;

        // 添加点击删除功能
        stickElement.addEventListener('click', handleStickRemove);
        stickElement.addEventListener('touchend', handleStickRemove);

        gridContainer.appendChild(stickElement);
        stickCount++;

        clearAllAdjacentHighlights(); // 清理所有高亮效果

        updateStatusPanel();

        // 检查是否获胜
        if (checkVictory()) {
            handleVictory();
        }
    }

    // 小棍移除处理函数
    function handleStickRemove(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const stickElement = event.currentTarget;
        const stickId = stickElement.id;
        const stick = Array.from(sticks).find(s => s.id === stickId);
        
        if (stick) {
            removeStick(stick);
        }
    }

    // 修改删除小棍的函数
    function removeStick(stick) {
        // 从集合中移除
        sticks.delete(stick);
        
        // 从DOM中移除
        const stickElement = document.getElementById(stick.id);
        if (stickElement) {
            stickElement.remove();
        }
        
        stickCount--;
        clearAllAdjacentHighlights(); // 删除小棍时清理所有高亮效果
        updateStatusPanel();
    }

    // 添加获取小棍信息的函数
    function getStickInfo() {
        return Array.from(sticks).map(stick => ({
            start: { x: stick.x1, y: stick.y1 },
            end: { x: stick.x2, y: stick.y2 },
            isVertical: stick.isVertical
        }));
    }

    // 添加高亮相邻点的函数
    function highlightAdjacentPoints(point, highlight = true) {
        const x = parseInt(point.dataset.x);
        const y = parseInt(point.dataset.y);
        
        // 检查四个方向的相邻点
        const adjacentPositions = [
            {x: x-1, y: y}, // 左
            {x: x+1, y: y}, // 右
            {x: x, y: y-1}, // 上
            {x: x, y: y+1}  // 下
        ];
        
        adjacentPositions.forEach(pos => {
            if (pos.x >= 0 && pos.x < gridSize && pos.y >= 0 && pos.y < gridSize) {
                const adjacentPoint = document.querySelector(
                    `.grid-item[data-x="${pos.x}"][data-y="${pos.y}"]`
                );
                if (adjacentPoint && !hasStickBetween(point, adjacentPoint)) {
                    adjacentPoint.classList.toggle('adjacent', highlight);
                }
            }
        });
    }

    // 修改点击处理函数
    function handlePointClick(event) {
        const point = event.target;
        
        // 只在自由模式下允许切换点的状态
        if (currentMode === 'point' && currentDifficulty === 'free') {
            togglePoint(event);
        } else if (currentMode === 'stick') {
            if (selectedPoint === null) {
                selectedPoint = point;
                point.classList.add('selected');
                highlightAdjacentPoints(point, true);
            } else {
                if (point === selectedPoint) {
                    // 取消选择当前点
                    selectedPoint.classList.remove('selected');
                    clearAllAdjacentHighlights();
                    selectedPoint = null;
                } else if (arePointsAdjacent(selectedPoint, point)) {
                    if (!hasStickBetween(selectedPoint, point)) {
                        createStick(selectedPoint, point);
                    }
                    selectedPoint.classList.remove('selected');
                    selectedPoint = null;
                } else {
                    // 选择新的点
                    selectedPoint.classList.remove('selected');
                    clearAllAdjacentHighlights();
                    selectedPoint = point;
                    point.classList.add('selected');
                    highlightAdjacentPoints(point, true);
                }
            }
        }
    }

    // 添加模式切换按钮事件
    document.getElementById('mode-button').addEventListener('click', () => {
        currentMode = currentMode === 'point' ? 'stick' : 'point';
        if (selectedPoint) {
            selectedPoint.classList.remove('selected');
            selectedPoint = null;
        }
        clearAllAdjacentHighlights(); // 切换模式时清理所有高亮效果
        updateStatusPanel();
    });

    // 生成坐标轴标签
    function createAxisLabels() {
        const xAxis = document.querySelector('.x-axis');
        const yAxis = document.querySelector('.y-axis');
        
        // 生成 A-K 标签（x轴）
        for (let i = 0; i < gridSize; i++) {
            const label = document.createElement('div');
            label.className = 'axis-label';
            label.textContent = String.fromCharCode(65 + i);
            label.style.left = `${i * cellSize}px`;
            xAxis.appendChild(label);
        }
        
        // 生成 1-11 标签（y轴，从下到上）
        for (let i = 0; i < gridSize; i++) {
            const label = document.createElement('div');
            label.className = 'axis-label';
            label.textContent = gridSize - i;
            label.style.top = `${i * cellSize}px`;
            yAxis.appendChild(label);
        }
    }

    // 添加触摸事件处理
    gridContainer.addEventListener('touchstart', handleTouch, { passive: false });
    gridContainer.addEventListener('touchend', handleTouch, { passive: false });

    // 触摸事件处理函数
    function handleTouch(event) {
        // 阻止默认行为（防止滚动和缩放）
        event.preventDefault();
        
        if (event.type === 'touchend') {
            // 获取触摸点相对于网格容器的坐标
            const touch = event.changedTouches[0];
            const rect = gridContainer.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            // 查找最近的网格点
            const nearestPoint = findNearestPoint(touchX, touchY);
            if (nearestPoint) {
                handlePointClick({ target: nearestPoint });
            }
        }
    }

    // 修改点击事件处理，同时支持鼠标点击和触摸
    gridContainer.addEventListener('click', (event) => {
        // 如果是触摸设备触发的点击，忽略它（因为我们已经在 touchend 中处理了）
        if (event.pointerType === 'touch') {
            return;
        }

        const rect = gridContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        const nearestPoint = findNearestPoint(clickX, clickY);
        if (nearestPoint) {
            handlePointClick({ target: nearestPoint });
        }
    });

    // 查找最近的网格点
    function findNearestPoint(clickX, clickY) {
        const tolerance = cellSize * 0.4; // 20% 的误差范围
        
        // 计算最近的网格坐标
        const nearestX = Math.round(clickX / cellSize);
        const nearestY = Math.round(clickY / cellSize);
        
        // 确保坐标在有效范围内
        if (nearestX >= 0 && nearestX < gridSize && 
            nearestY >= 0 && nearestY < gridSize) {
            
            // 计算实际网格点的位置
            const pointX = nearestX * cellSize;
            const pointY = nearestY * cellSize;
            
            // 计算点击位置与最近网格点的距离
            const distance = Math.sqrt(
                Math.pow(clickX - pointX, 2) + 
                Math.pow(clickY - pointY, 2)
            );
            
            // 如果在误差范围内，返回对应的网格点元素
            if (distance <= tolerance) {
                return document.querySelector(
                    `.grid-item[data-x="${nearestX}"][data-y="${nearestY}"]`
                );
            }
        }
        return null;
    }

    // 加载游戏点位数据
    async function loadGamePoints() {
        if (window.GAME_POINTS_DATA) {
            gamePoints = window.GAME_POINTS_DATA;
            console.log('从全局变量加载游戏点位数据成功');
        } else {
            console.error('未找到游戏点位数据');
            useDefaultGamePoints();
        }
    }

    // 修改使用默认游戏点位数据的函数
    function useDefaultGamePoints() {
        gamePoints = {
            "easy": {
                "maxSticks": 8,
                "presets": [
                    [
                        {"x": 2, "y": 2},
                        {"x": 3, "y": 5}
                    ],
                    [
                        {"x": 1, "y": 1},
                        {"x": 4, "y": 4}
                    ],
                    [
                        {"x": 5, "y": 2},
                        {"x": 2, "y": 6}
                    ]
                ]
            },
            "medium": {
                "maxSticks": 12,
                "presets": [
                    [
                        {"x": 1, "y": 1},
                        {"x": 3, "y": 3},
                        {"x": 5, "y": 5}
                    ],
                    [
                        {"x": 2, "y": 2},
                        {"x": 4, "y": 4},
                        {"x": 6, "y": 6}
                    ],
                    [
                        {"x": 3, "y": 1},
                        {"x": 5, "y": 3},
                        {"x": 7, "y": 5}
                    ]
                ]
            },
            "hard": {
                "maxSticks": 15,
                "presets": [
                    [
                        {"x": 1, "y": 4},
                        {"x": 1, "y": 1},
                        {"x": 2, "y": 7},
                        {"x": 4, "y": 3}
                    ],
                    [
                        {"x": 2, "y": 2},
                        {"x": 4, "y": 4},
                        {"x": 6, "y": 6},
                        {"x": 8, "y": 8}
                    ],
                    [
                        {"x": 3, "y": 1},
                        {"x": 5, "y": 3},
                        {"x": 7, "y": 5},
                        {"x": 9, "y": 7}
                    ]
                ]
            }
        };
    }

    // 更新游戏编号显示
    function updateGameNumberDisplay() {
        const gameNumberInput = document.getElementById('game-number');
        const gameNumberTotal = document.querySelector('.game-number-total');
        const totalPresets = currentDifficulty === 'free' ? 1 : 
            (gamePoints[currentDifficulty]?.presets?.length || 1);
        
        gameNumberInput.max = totalPresets;
        gameNumberInput.value = currentGameNumber;
        gameNumberTotal.textContent = `/ ${totalPresets}`;
        
        // 在自由模式下禁用游戏编号输入
        gameNumberInput.disabled = currentDifficulty === 'free';
    }

    // 根据难度和游戏编号激活点
    function activateRandomPoints(difficulty) {
        console.log('Activating points for difficulty:', difficulty);
        console.log('Current game number:', currentGameNumber);

        // 清除所有已激活的点
        document.querySelectorAll('.grid-item.active').forEach(point => {
            point.classList.remove('active');
        });

        if (!gamePoints || !gamePoints[difficulty]) {
            console.error('Game points data is not loaded');
            return;
        }

        const difficultyData = gamePoints[difficulty];
        const presets = difficultyData.presets;

        if (!presets || presets.length === 0) {
            console.error(`No presets available for difficulty: ${difficulty}`);
            return;
        }

        // 使用游戏编号选择预设（减1是因为编号从1开始，而数组索引从0开始）
        const selectedPreset = presets[currentGameNumber - 1] || presets[0];
        console.log('Selected preset:', selectedPreset);

        selectedPreset.forEach(point => {
            const gridItem = document.querySelector(
                `.grid-item[data-x="${point.x}"][data-y="${point.y}"]`
            );
            if (gridItem) {
                gridItem.classList.add('active');
            } else {
                console.error('Could not find grid item for point:', point);
            }
        });

        updateStatusPanel();
    }

    // 添加游戏编号输入事件监听
    document.getElementById('game-number').addEventListener('change', (event) => {
        const newNumber = parseInt(event.target.value);
        const maxNumber = parseInt(event.target.max);
        
        // 确保输入的编号在有效范围内
        currentGameNumber = Math.max(1, Math.min(newNumber, maxNumber));
        event.target.value = currentGameNumber;
        
        if (currentDifficulty !== 'free') {
            resetGame();
        }
    });

    // 修改难度选择事件监听
    document.getElementById('difficulty-select').addEventListener('change', (event) => {
        currentDifficulty = event.target.value;
        console.log('难度更改为:', currentDifficulty);
        
        // 重置游戏编号
        currentGameNumber = 1;
        
        // 在非自由模式下，自动切换到stick模式
        if (currentDifficulty !== 'free') {
            currentMode = 'stick';
        }
        
        updateGameNumberDisplay();
        resetGame();
    });

    // 修改重置游戏状态函数
    function resetGame() {
        // 更新最大小棍数（自由模式下设为Infinity）
        maxSticks = currentDifficulty === 'free' ? Infinity : gamePoints[currentDifficulty].maxSticks;
        
        // 清除所有小棍
        sticks.clear();
        document.querySelectorAll('.stick').forEach(stick => stick.remove());
        stickCount = 0;
        
        // 清除所有高亮状态
        document.querySelectorAll('.grid-item.adjacent').forEach(point => {
            point.classList.remove('adjacent');
        });
        
        // 清除所有激活的点
        document.querySelectorAll('.grid-item.active').forEach(point => {
            point.classList.remove('active');
        });
        
        // 重置选中状态
        if (selectedPoint) {
            selectedPoint.classList.remove('selected');
            selectedPoint = null;
        }

        // 在自由模式下默认使用点模式，其他模式使用stick模式
        currentMode = currentDifficulty === 'free' ? 'point' : 'stick';
        
        // 在非自由模式下加载预设点
        if (currentDifficulty !== 'free') {
            activateRandomPoints(currentDifficulty);
        }
        
        // 更新显示
        updateStatusPanel();
        updateGameNumberDisplay();
    }

    // 修改移动端样式优化
    function addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .grid-item {
                    /* 增大点击区域但保持视觉大小合适 */
                    width: 24px;
                    height: 24px;
                    margin: 0;
                    transform: translate(-50%, -50%);
                    position: absolute;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                }
                
                .grid-item::after {
                    content: '';
                    width: 8px;
                    height: 8px;
                    background: currentColor;
                    border-radius: 50%;
                    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3); /* 添加默认阴影 */
                    transition: all 0.2s ease;
                }
                
                .grid-item.active::after {
                    width: 12px;
                    height: 12px;
                    background-color: red;
                    box-shadow: 0 0 8px rgba(255, 0, 0, 0.5); /* 激活状态的阴影 */
                }

                .grid-item:active::after {
                    box-shadow: 0 0 12px rgba(0, 0, 0, 0.5); /* 触摸时的阴影 */
                    transform: scale(1.2);
                }
                
                .stick {
                    /* 调整小棍的定位以匹配新的点位置 */
                    transform-origin: center;
                }
                
                .stick.horizontal {
                    height: 4px;
                    margin-top: -2px;
                }
                
                .stick.vertical {
                    width: 4px;
                    margin-left: -2px;
                }
                
                * {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 在初始化游戏时添加移动端支持
    async function initGame() {
        await loadGamePoints();
        createGridLines();
        createIntersectionPoints();
        createAxisLabels();
        addMobileStyles();
        updateGameNumberDisplay();  // 初始化时更新游戏编号显示
        resetGame();
    }

    // 根据设备屏幕宽度设置cellSize
    function getCellSize() {
        return window.innerWidth <= 767 ? 30 : 50;
    }

    // 在初始化时设置cellSize
    cellSize = getCellSize();

    // 添加窗口大小改变的监听器
    window.addEventListener('resize', () => {
        cellSize = getCellSize();
        initializeGrid(); // 重新初始化网格
    });

    // 启动游戏
    initGame();
});