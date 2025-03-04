document.addEventListener('DOMContentLoaded', () => {
    // Game configuration | 游戏配置
    const gridContainer = document.getElementById('grid-container');
    const gridSize = 11;
    let maxSticks = 10;      
    let cellSize = getCellSize();
    let currentMode = 'point';  // 'point' or 'stick' mode | 点模式或棍模式
    let selectedPoint = null;   // Store the first selected point | 存储第一个选中的点
    let currentGameNumber = 1;  // 当前游戏编号
    
    const sticks = [];  // 改为数组，用于存储小棍信息
    let gamePoints = null;     // Store game point presets | 存储预设点位数据
    let currentDifficulty = 'easy';
    let activePoints = [];     // 存储激活的点，改为数组以保持顺序

    // 添加点击事件相关变量
    let lastClickTime = 0;     // 上次点击时间
    let clickCount = 0;        // 点击计数
    let longPressTimer = null; // 长按定时器
    let isLongPress = false;   // 是否处于长按状态
    const LONG_PRESS_DELAY = 500; // 长按触发延迟（毫秒）
    const RAPID_REMOVE_INTERVAL = 100; // 快速移除间隔（毫秒）

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
        const currentPointsElement = document.getElementById('current-points');
        const remainingSticksCountElement = document.getElementById('remaining-sticks-count');
        const remainingSticksBar = document.getElementById('remaining-sticks-bar');
        const pointModeSelector = document.getElementById('point-mode-selector');
        const gameContainer = document.querySelector('.game-container');
        const remainingSticksContainer = document.getElementById('remaining-sticks-item');

        if (currentPointsElement) {
            // 更新当前红点数量显示
            currentPointsElement.textContent = activePoints.length;
        }

        if (pointModeSelector) {
            if (currentMode === 'point') {
                pointModeSelector.classList.add('active');
            } else {
                pointModeSelector.classList.remove('active');
            }
        }

        if (remainingSticksCountElement && remainingSticksBar) {
            if (currentMode === 'stick') {
                const maxSticks = calculateMaxSticks();
                const sticksCount = sticks.length || 0;
                
                // 在自由模式下显示已铺设的小棍总数，而不是无穷符号
                if (currentDifficulty === 'free') {
                    remainingSticksCountElement.textContent = sticksCount;
                    
                    // 自由模式下进度条始终为100%
                    remainingSticksBar.style.setProperty('--progress-width', '100%');
                    remainingSticksBar.style.setProperty('--progress-gradient', 'linear-gradient(to right, #4a90e2, #27ae60)');
                } else {
                    // 预设模式下显示剩余小棍数量
                    const remainingSticks = maxSticks - sticksCount;
                    remainingSticksCountElement.textContent = remainingSticks;
                    
                    // 更新进度条
                    let percentage = 100;
                    if (maxSticks > 0) {
                        percentage = (remainingSticks / maxSticks) * 100;
                        percentage = Math.max(0, Math.min(100, percentage)); // 确保百分比在0-100之间
                    }
                    
                    remainingSticksBar.style.setProperty('--progress-width', `${percentage}%`);
                    
                    // 根据剩余百分比改变颜色
                    if (percentage < 30) {
                        remainingSticksBar.style.setProperty('--progress-gradient', 'linear-gradient(to right, #e74c3c, #f39c12)');
                    } else {
                        remainingSticksBar.style.setProperty('--progress-gradient', 'linear-gradient(to right, #4a90e2, #27ae60)');
                    }
                }
            } else {
                // 在点模式下也更新小棍数量显示
                if (currentDifficulty === 'free') {
                    remainingSticksCountElement.textContent = sticks.length || 0;
                    remainingSticksBar.style.setProperty('--progress-width', '100%');
                    remainingSticksBar.style.setProperty('--progress-gradient', 'linear-gradient(to right, #4a90e2, #27ae60)');
                }
            }
        }

        // 添加小木棍图标的激活状态
        if (remainingSticksContainer) {
            if (currentMode === 'stick') {
                remainingSticksContainer.classList.add('active');
            } else {
                remainingSticksContainer.classList.remove('active');
            }
        }

        if (gameContainer) {
            if (currentMode === 'point') {
                gameContainer.classList.add('point-mode');
                gameContainer.classList.remove('stick-mode');
            } else {
                gameContainer.classList.add('stick-mode');
                gameContainer.classList.remove('point-mode');
            }
        }
    }

    // 检查两点是否相邻
    function arePointsAdjacent(point1, point2) {
        const x1 = parseInt(point1.dataset.x);
        const y1 = parseInt(point1.dataset.y);
        const x2 = parseInt(point2.dataset.x);
        const y2 = parseInt(point2.dataset.y);

        // 两点在同一行或同一列，且相距为1
        return (x1 === x2 && Math.abs(y1 - y2) === 1) || 
               (y1 === y2 && Math.abs(x1 - x2) === 1);
    }

    // 计算最大可用小棍数量
    function calculateMaxSticks() {
        if (currentDifficulty === 'free') {
            // 自由模式下没有限制
            return Infinity;
        } else {
            // 根据难度设置返回最大小棍数量
            return difficultySettings[currentDifficulty]?.maxSticks || 10;
        }
    }

    // 修改检查小棍存在的函数
    function hasStickBetween(point1, point2) {
        const x1 = parseInt(point1.dataset.x);
        const y1 = parseInt(point1.dataset.y);
        const x2 = parseInt(point2.dataset.x);
        const y2 = parseInt(point2.dataset.y);
        
        const newStick = new Stick(x1, y1, x2, y2);
        const hasStick = sticks.some(stick => stick.id === newStick.id);
        
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
        // 获取所有激活的点
        const activePointElements = Array.from(document.querySelectorAll('.grid-item.active'));
        console.log('Checking victory, active points:', activePointElements.length);
        
        if (activePointElements.length < 2) {
            console.log('Less than 2 active points, no victory possible');
            return false;
        }

        const visited = new Set();
        const startPoint = activePointElements[0];
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
        const result = activePointElements.every(point => {
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
        console.log('Active points:', activePointElements.map(p => `${p.dataset.x},${p.dataset.y}`));
        return result;
    }

    /**
     * Handle victory event
     * 处理胜利事件
     */
    function handleVictory() {
        console.log('Victory condition met!');
        
        // 播放胜利音效
        const victorySound = document.getElementById('victory-sound');
        
        // 尝试播放并捕获可能的错误
        try {
            victorySound.play().catch(error => {
                console.error('Playback failed:', error);
            });
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

    // 修改togglePoint函数，将点添加到activePoints数组末尾
    function togglePoint(event) {
        const point = event.currentTarget;
        const isActive = point.classList.contains('active');
        const x = parseInt(point.dataset.x);
        const y = parseInt(point.dataset.y);
        
        if (isActive) {
            point.classList.remove('active');
            // 从activePoints中移除
            const index = activePoints.findIndex(p => p.x === x && p.y === y);
            if (index !== -1) {
                activePoints.splice(index, 1);
            }
        } else {
            point.classList.add('active');
            // 添加到activePoints数组末尾
            activePoints.push({
                x: x,
                y: y,
                element: point
            });
        }
        
        clearAllAdjacentHighlights(); // 清理所有高亮效果
        updateStatusPanel();
        
        // 检查是否获胜
        if (checkVictory()) {
            handleVictory();
        }
    }

    // 修改创建小棍的函数
    function createStick(point1, point2) {
        // 在非自由模式下检查小棍数量限制
        if (currentDifficulty !== 'free' && sticks.length >= maxSticks) {
            alert(`最多只能使用 ${maxSticks} 个小棍`);
            return;
        }

        const x1 = parseInt(point1.dataset.x);
        const y1 = parseInt(point1.dataset.y);
        const x2 = parseInt(point2.dataset.x);
        const y2 = parseInt(point2.dataset.y);

        // 创建小棍数据对象
        const newStick = new Stick(x1, y1, x2, y2);
        
        // 添加到数组末尾（堆栈顶部）
        sticks.push(newStick);

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
        stickElement.style.backgroundColor = '#4a90e2';
        stickElement.style.position = 'absolute';
        stickElement.style.zIndex = '1';

        // 添加点击删除功能
        stickElement.addEventListener('click', handleStickRemove);
        stickElement.addEventListener('touchend', handleStickRemove);

        gridContainer.appendChild(stickElement);

        clearAllAdjacentHighlights(); // 清理所有高亮效果

        updateStatusPanel();

        // 检查是否获胜
        if (checkVictory()) {
            handleVictory();
        }
    }

    // 添加移除最近的红点函数
    function removeRecentPoint() {
        if (activePoints.length === 0) return;
        
        // 获取最近添加的点（数组末尾）
        const recentPoint = activePoints.pop();
        
        // 找到对应的DOM元素并移除active类
        const pointElement = document.querySelector(`.grid-item[data-x="${recentPoint.x}"][data-y="${recentPoint.y}"]`);
        if (pointElement) {
            pointElement.classList.remove('active');
        }
        
        clearAllAdjacentHighlights(); // 清理所有高亮效果
        updateStatusPanel();
    }

    // 添加移除最近n个红点的函数
    function removeRecentPoints(n) {
        const count = Math.min(n, activePoints.length);
        for (let i = 0; i < count; i++) {
            removeRecentPoint();
        }
    }

    // 添加快速移除红点的函数
    function startRapidPointRemove() {
        if (activePoints.length === 0) {
            stopRapidRemove();
            return;
        }
        
        // 只在自由模式下添加按压效果
        if (currentDifficulty === 'free') {
            const pointIcon = document.getElementById('point-mode-selector');
            addPressEffect(pointIcon);
        }
        
        removeRecentPoint();
        longPressTimer = setTimeout(startRapidPointRemove, RAPID_REMOVE_INTERVAL);
    }

    // 修改删除小棍的函数
    function removeStick(stick) {
        if (stick) {
            // 从数组中移除特定的小棍
            const index = sticks.findIndex(s => s.id === stick.id);
            if (index !== -1) {
                sticks.splice(index, 1);
            }
            
            // 从DOM中移除
            const stickElement = document.getElementById(stick.id);
            if (stickElement) {
                stickElement.remove();
            }
        } else {
            // 从数组中移除最后一个元素（堆栈顶部）
            if (sticks.length === 0) return;
            
            const removedStick = sticks.pop();
            
            // 从DOM中移除
            const stickElement = document.getElementById(removedStick.id);
            if (stickElement) {
                stickElement.remove();
            }
        }
        
        clearAllAdjacentHighlights(); // 删除小棍时清理所有高亮效果
        updateStatusPanel();
    }

    // 添加移除最近n根小棍的函数
    function removeRecentSticks(n) {
        const count = Math.min(n, sticks.length);
        for (let i = 0; i < count; i++) {
            removeStick();
        }
    }

    // 修改快速移除小棍的函数，添加按压效果
    function startRapidRemove() {
        if (sticks.length === 0) {
            stopRapidRemove();
            return;
        }
        
        // 添加按压效果
        const sticksIcon = document.getElementById('remaining-sticks-item');
        addPressEffect(sticksIcon);
        
        removeStick();
        longPressTimer = setTimeout(startRapidRemove, RAPID_REMOVE_INTERVAL);
    }

    function stopRapidRemove() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    // 小棍移除处理函数
    function handleStickRemove(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const stickElement = event.currentTarget;
        const stickId = stickElement.id;
        const stick = sticks.find(s => s.id === stickId);
        
        if (stick) {
            removeStick(stick);
        }
    }

    // 添加获取小棍信息的函数
    function getStickInfo() {
        return sticks.map(stick => ({
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

    // 检查点击位置是否在两点之间的边上
    function findStickBetweenPoints(touchX, touchY) {
        // 计算最近的网格坐标
        const nearestX = Math.round(touchX / cellSize);
        const nearestY = Math.round(touchY / cellSize);
        
        // 检查四个方向：水平和垂直方向
        const directions = [
            { dx: 1, dy: 0 },  // 向右
            { dx: 0, dy: 1 },  // 向下
            { dx: -1, dy: 0 }, // 向左
            { dx: 0, dy: -1 }  // 向上
        ];
        
        for (const dir of directions) {
            // 计算相邻点的坐标
            const x1 = nearestX;
            const y1 = nearestY;
            const x2 = nearestX + dir.dx;
            const y2 = nearestY + dir.dy;
            
            // 确保两个点都在网格范围内
            if (x2 >= 0 && x2 < gridSize && y2 >= 0 && y2 < gridSize) {
                // 计算边的中点
                const centerX = (x1 + x2) * cellSize / 2;
                const centerY = (y1 + y2) * cellSize / 2;
                
                // 计算点击位置到中点的曼哈顿距离
                const manhattanDistance = Math.abs(touchX - centerX) + Math.abs(touchY - centerY);
                
                // 判定区域
                const radius = cellSize * 0.5;
                
                // 如果点击位置在菱形区域内
                if (manhattanDistance <= radius) {
                    const point1 = document.querySelector(
                        `.grid-item[data-x="${x1}"][data-y="${y1}"]`
                    );
                    const point2 = document.querySelector(
                        `.grid-item[data-x="${x2}"][data-y="${y2}"]`
                    );
                    
                    if (point1 && point2) {
                        return { point1, point2 };
                    }
                }
            }
        }
        return null;
    }

    // 修改触摸事件处理函数
    function handleTouch(event) {
        // 阻止默认行为（防止滚动和缩放）
        event.preventDefault();
        
        const touchIndicator = document.querySelector('.touch-indicator');
        const stickPreview = document.querySelector('.stick-preview');
        
        // 清除之前的定时器（如果存在）
        if (window.touchIndicatorTimer) {
            clearTimeout(window.touchIndicatorTimer);
        }
        
        if (event.type === 'touchstart' || event.type === 'touchmove') {
            const touch = event.touches[0];
            const rect = gridContainer.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            // 更新触摸指示器位置
            touchIndicator.style.opacity = '1';
            touchIndicator.style.display = 'block';
            touchIndicator.style.left = `${touchX}px`;
            touchIndicator.style.top = `${touchY}px`;
            
            // 清除所有之前的高亮效果
            clearAllAdjacentHighlights();
            
            // 根据当前模式处理触摸事件
            if (currentMode === 'point' && currentDifficulty === 'free') {
                // 点模式：查找最近的点并高亮
                const nearestPoint = findNearestPoint(touchX, touchY);
                if (nearestPoint) {
                    nearestPoint.classList.add('adjacent');
                    window.currentTouchPoint = nearestPoint;
                } else {
                    window.currentTouchPoint = null;
                }
                // 在点模式下不显示小棍预览
                stickPreview.style.display = 'none';
                window.currentTouchEdgePoints = null;
            } else {
                // 棍模式：检查是否可以在当前位置建立小棍
                const edgePoints = findStickBetweenPoints(touchX, touchY);
                
                if (edgePoints) {
                    const { point1, point2 } = edgePoints;
                    const x1 = parseInt(point1.dataset.x);
                    const y1 = parseInt(point1.dataset.y);
                    const x2 = parseInt(point2.dataset.x);
                    const y2 = parseInt(point2.dataset.y);
                    
                    // 高亮显示相关的点
                    point1.classList.add('adjacent');
                    point2.classList.add('adjacent');
                    
                    // 显示小棍预览
                    stickPreview.style.display = 'block';
                    stickPreview.style.opacity = '1';
                    if (x1 === x2) {
                        // 垂直小棍
                        stickPreview.className = 'stick-preview vertical';
                        stickPreview.style.left = `${x1 * cellSize}px`;
                        stickPreview.style.top = `${Math.min(y1, y2) * cellSize}px`;
                        stickPreview.style.height = `${cellSize}px`;
                        stickPreview.style.width = '6px';
                    } else {
                        // 水平小棍
                        stickPreview.className = 'stick-preview horizontal';
                        stickPreview.style.left = `${Math.min(x1, x2) * cellSize}px`;
                        stickPreview.style.top = `${y1 * cellSize}px`;
                        stickPreview.style.width = `${cellSize}px`;
                        stickPreview.style.height = '6px';
                    }
                    
                    // 存储当前触摸的边缘点，以便在touchend时使用
                    window.currentTouchEdgePoints = edgePoints;
                } else {
                    stickPreview.style.display = 'none';
                    window.currentTouchEdgePoints = null;
                }
            }
            
            // 设置1秒后开始淡出触摸指示器和小棍预览
            window.touchIndicatorTimer = setTimeout(() => {
                // 淡出触摸指示器
                touchIndicator.style.opacity = '0';
                
                // 同时淡出小棍预览和高亮点
                if (stickPreview.style.display === 'block') {
                    stickPreview.style.opacity = '0';
                }
                
                // 等待淡出动画完成后隐藏元素
                setTimeout(() => {
                    if (parseFloat(touchIndicator.style.opacity) === 0) {
                        touchIndicator.style.display = 'none';
                    }
                    if (parseFloat(stickPreview.style.opacity) === 0) {
                        stickPreview.style.display = 'none';
                    }
                    // 清除高亮效果
                    clearAllAdjacentHighlights();
                }, 300);
            }, 500);
            
        } else if (event.type === 'touchend' || event.type === 'touchcancel') {
            // 淡出触摸指示器
            touchIndicator.style.opacity = '0';
            
            // 同时淡出小棍预览
            stickPreview.style.opacity = '0';
            
            setTimeout(() => {
                touchIndicator.style.display = 'none';
                stickPreview.style.display = 'none';
                // 清除高亮效果
                clearAllAdjacentHighlights();
            }, 300);
            
            // 在touchend时执行操作
            if (event.type === 'touchend' && window.currentTouchEdgePoints) {
                const { point1, point2 } = window.currentTouchEdgePoints;
                
                // 检查是否已经存在小棍
                const stickExists = hasStickBetween(point1, point2);
                
                // 如果存在小棍，则删除；如果不存在，则创建
                if (stickExists) {
                    const stick = sticks.find(s => 
                        (s.x1 === parseInt(point1.dataset.x) && s.y1 === parseInt(point1.dataset.y) &&
                         s.x2 === parseInt(point2.dataset.x) && s.y2 === parseInt(point2.dataset.y)) ||
                        (s.x1 === parseInt(point2.dataset.x) && s.y1 === parseInt(point2.dataset.y) &&
                         s.x2 === parseInt(point1.dataset.x) && s.y2 === parseInt(point1.dataset.y))
                    );
                    if (stick) {
                        removeStick(stick);
                        console.log('touchend: 小棍已删除');
                    }
                } else {
                    createStick(point1, point2);
                    console.log('touchend: 小棍已创建');
                }
            } else if (event.type === 'touchend' && window.currentTouchPoint && currentMode === 'point' && currentDifficulty === 'free') {
                // 在点模式下切换点的状态
                togglePoint({ currentTarget: window.currentTouchPoint });
            }
            
            // 清除触摸指示器定时器
            if (window.touchIndicatorTimer) {
                clearTimeout(window.touchIndicatorTimer);
                window.touchIndicatorTimer = null;
            }
            
            // 清除存储的触摸点
            window.currentTouchEdgePoints = null;
            window.currentTouchPoint = null;
        }
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

    // 查找最近的网格点
    function findNearestPoint(clickX, clickY) {
        const tolerance = cellSize * 0.5; // 调整为更小的误差范围

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
        const previousDifficulty = currentDifficulty;
        currentDifficulty = event.target.value;
        console.log('难度更改为:', currentDifficulty);
        
        // 重置游戏编号
        currentGameNumber = 1;
        
        // 在非自由模式下，自动切换到stick模式
        if (currentDifficulty !== 'free') {
            currentMode = 'stick';
        } else {
            // 从预设模式切换到自由模式时，确保清除所有数据
            if (previousDifficulty !== 'free') {
                // 清除所有小棍
                sticks.length = 0;
                document.querySelectorAll('.stick').forEach(stick => stick.remove());
                
                // 清除所有激活的点
                document.querySelectorAll('.grid-item.active').forEach(point => {
                    point.classList.remove('active');
                });
                
                // 重置activePoints数组
                activePoints = [];
                
                // 切换到点模式
                currentMode = 'point';
                
                // 立即更新状态面板
                updateStatusPanel();
            }
        }
        
        updateGameNumberDisplay();
        resetGame();
    });

    // 修改重置游戏状态函数
    function resetGame() {
        // 更新最大小棍数（自由模式下设为Infinity）
        maxSticks = currentDifficulty === 'free' ? Infinity : gamePoints[currentDifficulty].maxSticks;
        
        // 清除所有小棍
        sticks.length = 0;
        document.querySelectorAll('.stick').forEach(stick => stick.remove());
        
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
        
        // 在自由模式下默认使用点模式，其他模式固定使用stick模式
        currentMode = currentDifficulty === 'free' ? 'point' : 'stick';
        
        // 在非自由模式下加载预设点
        if (currentDifficulty !== 'free') {
            activateRandomPoints(currentDifficulty);
        }
        
        // 初始化activePoints数组
        activePoints = [];
        document.querySelectorAll('.grid-item.active').forEach(point => {
            activePoints.push({
                x: parseInt(point.dataset.x),
                y: parseInt(point.dataset.y),
                element: point
            });
        });
        
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
                    width: 20px;
                    height: 20px;
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
                    background: #333;
                    border-radius: 50%;
                    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
                    transition: all 0.2s ease;
                }
                
                .grid-item.active::after {
                    width: 12px;
                    height: 12px;
                    background-color: #e74c3c;
                    box-shadow: 0 0 8px rgba(231, 76, 60, 0.5);
                }
                
                .grid-item:active::after {
                    box-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
                    transform: scale(1.2);
                }
                
                .stick {
                    /* 调整小棍的定位以匹配新的点位置 */
                    transform-origin: center;
                    position: absolute;
                    background-color: #4a90e2;
                    border-radius: 3px;
                    z-index: 1;
                    box-shadow: 0 0 5px rgba(74, 144, 226, 0.4);
                }
                
                .stick.horizontal {
                    height: 6px;
                    margin-top: -3px;
                    border-radius: 3px;
                }
                
                .stick.vertical {
                    width: 6px;
                    margin-left: -3px;
                    border-radius: 3px;
                }
                
                * {
                    -webkit-tap-highlight-color: transparent;
                    -webkit-touch-callout: none;
                    -webkit-user-select: none;
                    user-select: none;
                }
                
                .touch-indicator {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: rgba(74, 144, 226, 0.3);
                    border: 2px solid #4a90e2;
                    border-radius: 50%;
                    pointer-events: none;
                    transform: translate(-50%, -50%);
                    z-index: 1000;
                    display: none;
                    transition: opacity 0.3s ease-out;
                    opacity: 1;
                }
                
                .stick-preview {
                    position: absolute;
                    background: rgba(74, 144, 226, 0.7);
                    pointer-events: none;
                    z-index: 999;
                    box-shadow: 0 0 8px #4a90e2;
                    transition: opacity 0.3s ease-out;
                }
                
                .stick-preview.horizontal {
                    height: 6px;
                    margin-top: -3px;
                    border-radius: 3px;
                    width: 100%;
                }
                
                .stick-preview.vertical {
                    width: 6px;
                    margin-left: -3px;
                    border-radius: 3px;
                    height: 100%;
                }
            }
        `;
        document.head.appendChild(style);

        // 创建触摸指示器元素
        const touchIndicator = document.createElement('div');
        touchIndicator.classList.add('touch-indicator');
        gridContainer.appendChild(touchIndicator);

        // 创建预览小棍元素
        const stickPreview = document.createElement('div');
        stickPreview.classList.add('stick-preview');
        gridContainer.appendChild(stickPreview);
    }

    // 在初始化游戏时添加移动端支持
    async function initGame() {
        await loadGamePoints();
        createGridLines();
        createIntersectionPoints();
        createAxisLabels();
        addMobileStyles();
        updateGameNumberDisplay();  // 初始化时更新游戏编号显示
        
        // 设置初始模式
        currentMode = currentDifficulty === 'free' ? 'point' : 'stick';
        
        // 在自由模式下确保清除所有数据
        if (currentDifficulty === 'free') {
            // 清除所有小棍
            sticks.length = 0;
            document.querySelectorAll('.stick').forEach(stick => stick.remove());
            
            // 清除所有激活的点
            document.querySelectorAll('.grid-item.active').forEach(point => {
                point.classList.remove('active');
            });
            
            // 重置activePoints数组
            activePoints = [];
        }
    
        resetGame();
        
        // 初始化activePoints数组
        activePoints = [];
        document.querySelectorAll('.grid-item.active').forEach(point => {
            activePoints.push({
                x: parseInt(point.dataset.x),
                y: parseInt(point.dataset.y),
                element: point
            });
        });
        
        updateStatusPanel(); // 确保状态面板正确显示
    }

    // 根据设备屏幕宽度设置cellSize
    function getCellSize() {
        if (window.innerWidth <= 480) {
            return 28; // 小屏幕手机
        } else if (window.innerWidth <= 767) {
            return 32; // 大屏幕手机和小平板
        } else if (window.innerWidth <= 1023) {
            return 40; // 平板和小屏幕电脑
        } else {
            return 50; // 大屏幕设备
        }
    }


    // 在初始化时设置cellSize
    cellSize = getCellSize();

    // 添加窗口大小改变的监听器
    window.addEventListener('resize', () => {
        cellSize = getCellSize();
        initializeGrid(); // 重新初始化网格
    });

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

    // 添加触摸事件处理
    gridContainer.addEventListener('touchstart', handleTouch, { passive: false });
    gridContainer.addEventListener('touchmove', handleTouch, { passive: false });
    gridContainer.addEventListener('touchend', handleTouch, { passive: false });
    gridContainer.addEventListener('touchcancel', handleTouch, { passive: false });

    // 启动游戏
    initGame();

    // 修改点击处理函数
    function handlePointClick(event) {
        // 如果是移动设备，则不处理点击事件
        if ('ontouchstart' in window) {
            return;
        }

        const point = event.target;
        
        // 只在自由模式下允许切换点的状态
        if (currentMode === 'point' && currentDifficulty === 'free') {
            togglePoint({currentTarget: point});
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

    // 添加按压效果函数
    function addPressEffect(element) {
        element.classList.add('pressed');
        setTimeout(() => {
            element.classList.remove('pressed');
        }, 100); // 100ms后移除按压效果
    }

    // 修改点击红点状态图标的事件处理
    document.getElementById('point-mode-selector').addEventListener('mousedown', (event) => {
        // 只在自由模式下添加按压效果
        if (currentDifficulty === 'free') {
            const pointIcon = document.getElementById('point-mode-selector');
            addPressEffect(pointIcon); // 添加按压效果
            
            // 如果当前不是点模式，先切换到点模式
            if (currentMode !== 'point') {
                currentMode = 'point';
                if (selectedPoint) {
                    selectedPoint.classList.remove('selected');
                    selectedPoint = null;
                }
                clearAllAdjacentHighlights();
                updateStatusPanel();
                return; // 第一次点击只切换模式，不执行移除操作
            }
            
            // 已经是点模式，开始长按计时
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                startRapidPointRemove();
            }, LONG_PRESS_DELAY);
        }
    });

    document.getElementById('point-mode-selector').addEventListener('mouseup', () => {
        if (currentDifficulty === 'free' && currentMode === 'point') {
            stopRapidRemove();
            if (!isLongPress) {
                // 如果不是长按，则处理单击事件 - 移除一个红点
                removeRecentPoint();
            }
        }
    });

    document.getElementById('point-mode-selector').addEventListener('mouseleave', () => {
        if (currentDifficulty === 'free' && currentMode === 'point') {
            stopRapidRemove();
        }
    });

    // 添加触摸事件支持
    document.getElementById('point-mode-selector').addEventListener('touchstart', (event) => {
        event.preventDefault(); // 防止触发其他触摸事件
        
        // 只在自由模式下添加按压效果
        if (currentDifficulty === 'free') {
            const pointIcon = document.getElementById('point-mode-selector');
            addPressEffect(pointIcon); // 添加按压效果
            
            // 如果当前不是点模式，先切换到点模式
            if (currentMode !== 'point') {
                currentMode = 'point';
                if (selectedPoint) {
                    selectedPoint.classList.remove('selected');
                    selectedPoint = null;
                }
                clearAllAdjacentHighlights();
                updateStatusPanel();
                return; // 第一次点击只切换模式，不执行移除操作
            }
            
            // 已经是点模式，开始长按计时
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                startRapidPointRemove();
            }, LONG_PRESS_DELAY);
        }
    });

    document.getElementById('point-mode-selector').addEventListener('touchend', (event) => {
        event.preventDefault(); // 防止触发其他触摸事件
        if (currentDifficulty === 'free' && currentMode === 'point') {
            stopRapidRemove();
            if (!isLongPress) {
                // 如果不是长按，则处理单击事件 - 移除一个红点
                removeRecentPoint();
            }
        }
    });

    document.getElementById('point-mode-selector').addEventListener('touchcancel', (event) => {
        event.preventDefault(); // 防止触发其他触摸事件
        if (currentDifficulty === 'free' && currentMode === 'point') {
            stopRapidRemove();
        }
    });

    // 修改剩余小棍容器的点击事件处理
    document.getElementById('remaining-sticks-item').addEventListener('mousedown', (event) => {
        const sticksIcon = document.getElementById('remaining-sticks-item');
        addPressEffect(sticksIcon); // 添加按压效果
        
        if (currentDifficulty === 'free') {
            // 如果当前不是小棍模式，先切换到小棍模式
            if (currentMode !== 'stick') {
                currentMode = 'stick';
                if (selectedPoint) {
                    selectedPoint.classList.remove('selected');
                    selectedPoint = null;
                }
                clearAllAdjacentHighlights();
                updateStatusPanel();
                return; // 第一次点击只切换模式，不执行移除操作
            }
            
            // 已经是小棍模式，开始长按计时
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                startRapidRemove();
            }, LONG_PRESS_DELAY);
        } else {
            // 在预设模式下，开始长按计时
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                startRapidRemove();
            }, LONG_PRESS_DELAY);
        }
    });

    document.getElementById('remaining-sticks-item').addEventListener('mouseup', () => {
        if (currentDifficulty === 'free' && currentMode === 'stick') {
            stopRapidRemove();
            if (!isLongPress) {
                // 如果不是长按，则处理单击事件 - 移除一个小棍
                removeStick();
            }
        } else if (currentDifficulty !== 'free') {
            stopRapidRemove();
            if (!isLongPress) {
                // 如果不是长按，则处理单击事件 - 移除一个小棍
                removeStick();
            }
        }
    });

    document.getElementById('remaining-sticks-item').addEventListener('mouseleave', () => {
        stopRapidRemove();
    });

    // 修改触摸事件支持
    document.getElementById('remaining-sticks-item').addEventListener('touchstart', (event) => {
        event.preventDefault(); // 防止触发其他触摸事件
        
        const sticksIcon = document.getElementById('remaining-sticks-item');
        addPressEffect(sticksIcon); // 添加按压效果
        
        if (currentDifficulty === 'free') {
            // 如果当前不是小棍模式，先切换到小棍模式
            if (currentMode !== 'stick') {
                currentMode = 'stick';
                if (selectedPoint) {
                    selectedPoint.classList.remove('selected');
                    selectedPoint = null;
                }
                clearAllAdjacentHighlights();
                updateStatusPanel();
                return; // 第一次点击只切换模式，不执行移除操作
            }
            
            // 已经是小棍模式，开始长按计时
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                startRapidRemove();
            }, LONG_PRESS_DELAY);
        } else {
            // 在预设模式下，开始长按计时
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                startRapidRemove();
            }, LONG_PRESS_DELAY);
        }
    });

    document.getElementById('remaining-sticks-item').addEventListener('touchend', (event) => {
        event.preventDefault(); // 防止触发其他触摸事件
        if (currentDifficulty === 'free' && currentMode === 'stick') {
            stopRapidRemove();
            if (!isLongPress) {
                // 如果不是长按，则处理单击事件 - 移除一个小棍
                removeStick();
            }
        } else if (currentDifficulty !== 'free') {
            stopRapidRemove();
            if (!isLongPress) {
                // 如果不是长按，则处理单击事件 - 移除一个小棍
                removeStick();
            }
        }
    });

    document.getElementById('remaining-sticks-item').addEventListener('touchcancel', (event) => {
        event.preventDefault(); // 防止触发其他触摸事件
        stopRapidRemove();
    });
});