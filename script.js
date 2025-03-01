document.addEventListener('DOMContentLoaded', () => {
    // Game configuration | 游戏配置
    const gridContainer = document.getElementById('grid-container');
    const gridSize = 11;
    let maxSticks = 10;      
    const cellSize = 50;     
    let currentMode = 'point';  // 'point' or 'stick' mode | 点模式或棍模式
    let stickCount = 0;
    let selectedPoint = null;   // Store the first selected point | 存储第一个选中的点
    
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
                gridItem.style.left = `${x * cellSize}px`;
                gridItem.style.top = `${y * cellSize}px`;
                gridItem.dataset.x = x;
                gridItem.dataset.y = y;
                // 移除直接的点击事件监听
                // gridItem.addEventListener('click', handlePointClick);
        gridContainer.appendChild(gridItem);
            }
        }
    }

    // 更新状态面板显示
    function updateStatusPanel() {
        const currentPoints = document.querySelectorAll('.grid-item.active').length;
        const usedSticks = sticks.size;
        const remainingSticks = maxSticks - usedSticks;
        
        document.getElementById('current-points').textContent = currentPoints;
        document.getElementById('used-sticks').textContent = usedSticks;
        document.getElementById('remaining-sticks').textContent = remainingSticks;
        document.getElementById('mode-button').textContent = 
            currentMode === 'point' ? '设置高亮点模式' : '连接小棍模式';
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

    // 修改小棍的创建函数
    function createStick(point1, point2) {
        if (stickCount >= maxSticks) {
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
        } else {
            stickElement.classList.add('horizontal');
            stickElement.style.left = `${newStick.x1 * cellSize}px`;
            stickElement.style.top = `${newStick.y1 * cellSize}px`;
        }
        
        stickElement.id = newStick.id;

        // 添加点击删除功能
        stickElement.addEventListener('click', (event) => {
            event.stopPropagation(); // 阻止事件冒泡到网格容器
            removeStick(newStick);
        });

        gridContainer.appendChild(stickElement);
        stickCount++;

        // 清除所有相邻点的高亮效果
        document.querySelectorAll('.grid-item.adjacent').forEach(point => {
            point.classList.remove('adjacent');
        });

        // 如果当前有选中的点，重新计算并显示其相邻点
        if (selectedPoint) {
            highlightAdjacentPoints(selectedPoint, true);
        }

        updateStatusPanel();

        // 检查是否获胜
        if (checkVictory()) {
            handleVictory();
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

        // 清除所有相邻点的高亮效果
        document.querySelectorAll('.grid-item.adjacent').forEach(point => {
            point.classList.remove('adjacent');
        });

        // 如果当前有选中的点，重新计算并显示其相邻点
        if (selectedPoint) {
            highlightAdjacentPoints(selectedPoint, true);
        }

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
        
        if (currentMode === 'point') {
            togglePoint(event);
        } else if (currentMode === 'stick') {
            if (selectedPoint === null) {
                selectedPoint = point;
                point.classList.add('selected');
                highlightAdjacentPoints(point, true);  // 高亮相邻点
            } else {
                if (point === selectedPoint) {
                    // 取消选择
                    selectedPoint.classList.remove('selected');
                    highlightAdjacentPoints(selectedPoint, false);  // 取消高亮
                    selectedPoint = null;
                } else if (arePointsAdjacent(selectedPoint, point)) {
                    if (!hasStickBetween(selectedPoint, point)) {
                        createStick(selectedPoint, point);
                    }
                    selectedPoint.classList.remove('selected');
                    highlightAdjacentPoints(selectedPoint, false);  // 取消高亮
                    selectedPoint = null;
                } else {
                    // 如果选择的点不相邻，取消第一个选择，选中新的点
                    selectedPoint.classList.remove('selected');
                    highlightAdjacentPoints(selectedPoint, false);  // 取消之前的高亮
                    selectedPoint = point;
                    point.classList.add('selected');
                    highlightAdjacentPoints(point, true);  // 高亮新的相邻点
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
        updateStatusPanel();
    });

    // 修改点的状态切换函数
    function togglePoint(event) {
        const point = event.target;
        point.classList.toggle('active');
        updateStatusPanel(); // 更新状态显示
    }

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

    // 添加网格容器的点击事件处理
    gridContainer.addEventListener('click', (event) => {
        // 获取相对于网格容器的点击坐标
        const rect = gridContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // 查找最近的网格点
        const nearestPoint = findNearestPoint(clickX, clickY);
        if (nearestPoint) {
            handlePointClick({ target: nearestPoint });
        }
    });

    // 查找最近的网格点
    function findNearestPoint(clickX, clickY) {
        const tolerance = cellSize * 0.2; // 20% 的误差范围
        
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
        try {
            console.log('Attempting to load game points data...');
            const response = await fetch('data/game_points.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            gamePoints = await response.json();
            console.log('Successfully loaded game points:', gamePoints);
        } catch (error) {
            console.error('Failed to load game points:', error);
            // 提供一个默认的游戏点位数据
            gamePoints = {
                "easy": 
                {
                    "maxSticks": 8,
                    "presets": [
                    [
                        {"x": 2, "y": 2},
                        {"x": 3, "y": 5},
                        {"x": 6, "y": 3},
                        {"x": 8, "y": 7}
                    ]
                    ]
                },
                "medium": 
                {
                    "maxSticks": 12,
                    "presets": [
                    [
                        {"x": 1, "y": 1},
                        {"x": 3, "y": 3},
                        {"x": 5, "y": 5},
                        {"x": 7, "y": 7},
                        {"x": 9, "y": 9}
                    ]
                    ]
                },
                "hard": 
                {
                    "maxSticks": 15,
                    "presets": [
                    [
                        {"x": 1, "y": 1},
                        {"x": 2, "y": 8},
                        {"x": 4, "y": 4},
                        {"x": 7, "y": 3},
                        {"x": 8, "y": 7},
                        {"x": 9, "y": 5}
                    ]
                    ]
                }
            };
            console.log('Using fallback game points data');
        }
    }

    // 根据难度随机选择并激活点
    function activateRandomPoints(difficulty) {
        console.log('Activating points for difficulty:', difficulty);
        console.log('Current game points data:', gamePoints);

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

        const selectedPreset = presets[Math.floor(Math.random() * presets.length)];
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

    // 重置游戏状态
    function resetGame() {
        // 只更新最大小棍数
        maxSticks = gamePoints[currentDifficulty].maxSticks;
        
        // 清除所有小棍
        sticks.clear();
        document.querySelectorAll('.stick').forEach(stick => stick.remove());
        stickCount = 0;
        
        // 清除所有高亮状态
        document.querySelectorAll('.grid-item.adjacent').forEach(point => {
            point.classList.remove('adjacent');
        });
        
        // 重置选中状态
        if (selectedPoint) {
            selectedPoint.classList.remove('selected');
            selectedPoint = null;
        }

        // 切换到点模式
        currentMode = 'point';
        
        // 重新激活随机点
        activateRandomPoints(currentDifficulty);
        
        // 更新显示
        updateStatusPanel();
    }

    // 添加难度选择事件监听
    document.getElementById('difficulty-select').addEventListener('change', (event) => {
        currentDifficulty = event.target.value;
        console.log('Difficulty changed to:', currentDifficulty); // 调试信息
        resetGame();
    });

    // 添加重新开始按钮事件监听
    document.getElementById('restart-button').addEventListener('click', () => {
        console.log('Restarting game with difficulty:', currentDifficulty);
        resetGame();
    });

    // 初始化游戏
    async function initGame() {
        await loadGamePoints();
        createGridLines();
        createIntersectionPoints();
        createAxisLabels();
        resetGame();
    }

    // 启动游戏
    initGame();
});