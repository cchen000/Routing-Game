document.addEventListener('DOMContentLoaded', () => {
    // Game configuration | 游戏配置
    const gridContainer = document.getElementById('grid-container');
    const gridSize = 10;
    let maxSticks = 10;      
    let cellSize = getCellSize();
    let currentMode = 'point';  // 'point' or 'stick' mode | 点模式或棍模式
    let selectedPoint = null;   // Store the first selected point | 存储第一个选中的点
    let currentGameNumber = 1;  // 当前游戏编号
    
    const sticks = new Set();  // Store stick information | 存储小棍信息
    let gamePoints = null;     // Store game point presets | 存储预设点位数据
    let currentDifficulty = 'easy';
    let activePoints = [];     // 存储激活的点

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
        const usedSticksElement = document.getElementById('used-sticks');
        const remainingSticksElement = document.getElementById('remaining-sticks');
        const remainingSticksBar = document.getElementById('remaining-sticks-bar');
        const pointModeSelector = document.getElementById('point-mode-selector');
        const stickModeSelector = document.getElementById('stick-mode-selector');
        const gameContainer = document.querySelector('.game-container');
        const remainingSticksContainer = document.getElementById('remaining-sticks-item');

        if (currentPointsElement) {
            // 更新activePoints数组
            activePoints = Array.from(document.querySelectorAll('.grid-item.active'));
            currentPointsElement.textContent = activePoints.length;
        }

        if (usedSticksElement) {
            // 确保sticks是一个Set对象，并且有size属性
            usedSticksElement.textContent = sticks.size || 0;
        }

        // 更新模式选择器的激活状态
        if (pointModeSelector && stickModeSelector) {
            if (currentMode === 'point') {
                pointModeSelector.classList.add('active');
                stickModeSelector.classList.remove('active');
            } else {
                pointModeSelector.classList.remove('active');
                stickModeSelector.classList.add('active');
            }
        }

        if (remainingSticksElement && remainingSticksBar) {
            if (currentMode === 'stick') {
                const maxSticks = calculateMaxSticks();
                const remainingSticks = maxSticks - (sticks.size || 0);
                
                // 确保remainingSticks是一个有效数字
                const displayValue = isFinite(remainingSticks) ? remainingSticks : '∞';
                remainingSticksElement.textContent = displayValue;
                
                // 更新进度条
                let percentage = 100;
                if (isFinite(maxSticks) && maxSticks > 0) {
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
                
                // 在自由模式下隐藏剩余小棍显示
                if (currentDifficulty === 'free') {
                    remainingSticksContainer.style.display = 'none';
                } else {
                    remainingSticksContainer.style.display = 'flex';
                }
            } else {
                remainingSticksContainer.style.display = 'none';
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
        if (currentDifficulty !== 'free' && sticks.size >= maxSticks) {
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
                        stickPreview.style.marginLeft = '-3px';
                    } else {
                        // 水平小棍
                        stickPreview.className = 'stick-preview horizontal';
                        stickPreview.style.left = `${Math.min(x1, x2) * cellSize}px`;
                        stickPreview.style.top = `${y1 * cellSize}px`;
                        stickPreview.style.width = `${cellSize}px`;
                        stickPreview.style.height = '6px';
                        stickPreview.style.marginTop = '-3px';
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
                    const stick = Array.from(sticks).find(s => 
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
                togglePoint({ target: window.currentTouchPoint });
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

    // 修改点击处理函数
    function handlePointClick(event) {
        // 如果是移动设备，则不处理点击事件
        if ('ontouchstart' in window) {
            return;
        }

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

    // 添加状态图标的点击事件处理
    document.getElementById('point-mode-selector').addEventListener('click', () => {
        // 只在自由模式下允许切换到点模式
        if (currentDifficulty === 'free') {
            currentMode = 'point';
            if (selectedPoint) {
                selectedPoint.classList.remove('selected');
                selectedPoint = null;
            }
            clearAllAdjacentHighlights();
            updateStatusPanel();
        }
    });
    
    document.getElementById('stick-mode-selector').addEventListener('click', () => {
        currentMode = 'stick';
        if (selectedPoint) {
            selectedPoint.classList.remove('selected');
            selectedPoint = null;
        }
        clearAllAdjacentHighlights();
        updateStatusPanel();
    });

    // 添加剩余小棍容器的点击事件处理
    document.getElementById('remaining-sticks-item').addEventListener('click', () => {
        // 清除所有已布置的小棍
        clearAllSticks();
    });

    // 添加清除所有小棍的函数
    function clearAllSticks() {
        // 清除所有小棍
        sticks.clear();
        document.querySelectorAll('.stick').forEach(stick => stick.remove());
        
        // 清除所有高亮状态
        clearAllAdjacentHighlights();
        
        // 重置选中状态
        if (selectedPoint) {
            selectedPoint.classList.remove('selected');
            selectedPoint = null;
        }
        
        // 更新状态面板
        updateStatusPanel();
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
     
        resetGame();
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
});