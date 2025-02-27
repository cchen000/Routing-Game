# 网格路由小游戏

一个基于网格的路由连接游戏，玩家需要使用有限数量的小棍将所有红色高亮点连接起来。

## 游戏特点

- 三种难度级别
- 响应式设计，支持移动设备
- 双语界面（中文/英文）
- 胜利音效反馈
- 坐标轴标注系统

## 技术栈

- HTML5
- CSS3
- 原生 JavaScript
- 响应式设计
- Web Audio API

## 游戏规则

### 游戏目标
使用有限数量的小棍将所有红色高亮点连接起来。

### 难度设置
- 简易模式：8根小棍
- 中等模式：12根小棍
- 困难模式：15根小棍

### 操作方法
1. 选择游戏难度
2. 点击"设置高亮点模式"可以手动设置红点
3. 点击"连接小棍模式"开始连接点
4. 在连接模式下：
   - 点击第一个点，相邻可连接点会高亮
   - 点击高亮点完成连接
   - 点击已放置的小棍可以移除

## 项目结构 

grid-routing-game/
├── index.html # 主页面
├── styles.css # 样式表
├── script.js # 游戏逻辑
├── data/ # 游戏数据
│ └── game_points.json # 预设点位配置
└── sounds/ # 音效文件
├── victory.mp3
├── victory.ogg
└── victory.wav


## 本地运行

1. 克隆仓库
bash
git clone https://github.com/yourusername/grid-routing-game.git

2. 使用本地服务器运行
bash
使用 Python 的简单服务器
python -m http.server 8000
或使用 Node.js 的 http-server
npx http-server

3. 在浏览器中访问
http://localhost:8000


## 浏览器支持

- Chrome（推荐）
- Firefox
- Safari
- Edge
- Opera

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

[MIT License](LICENSE)