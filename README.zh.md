# 网格路由小游戏

一个基于网格的路由连接游戏，玩家需要使用有限数量的小棍将所有红色高亮点连接起来。

## 游戏特点

- 三种难度级别, 支持自由模式;
- 响应式网页设计，跨平台设备
- 双语界面（中文/英文）
- 胜利音效反馈


## 游戏规则

### 游戏目标
使用有限数量的小棍将所有红色高亮点连接起来。

### 难度设置
- 简易模式
- 中等模式
- 困难模式

### 操作方法
1. 选择游戏难度
2. 始连接点：
   - 点击第一个点，相邻可连接点会高亮
   - 点击高亮点完成连接
   - 点击已放置的小棍可以移除

## 本地运行

1. 克隆仓库

```bash
git clone https://github.com/cchen000/Routing-Game.git
```

2. 使用本地服务器运行

```bash
python -m http.server 8000
```
3. 在浏览器中访问 (localhost:8000)


## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

[MIT License](LICENSE)
