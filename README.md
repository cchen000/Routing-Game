# Grid Routing Game

A grid-based routing game where players need to connect all red highlighted points using a limited number of sticks.

## Features

- Three difficulty levels
- Responsive design, mobile-friendly
- Bilingual interface (Chinese/English)
- Victory sound feedback
- Coordinate axis labeling system

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Responsive Design
- Web Audio API

## Game Rules

### Objective
Connect all red highlighted points using a limited number of sticks.

### Difficulty Levels
- Easy: 8 sticks
- Medium: 12 sticks
- Hard: 15 sticks

### How to Play
1. Select difficulty level
2. Click "Point Mode" to manually set red points
3. Click "Stick Mode" to start connecting points
4. In connection mode:
   - Click first point, adjacent connectable points will be highlighted
   - Click highlighted point to complete connection
   - Click placed sticks to remove them

## Project Structure

grid-routing-game/
├── index.html # Main page
├── styles.css # Stylesheets
├── script.js # Game logic
├── data/ # Game data
│ └── game_points.json # Point presets
└── sounds/ # Sound effects
├── victory.mp3
├── victory.ogg
└── victory.wav


## Local Development

1. Clone the repository

> bash
> git clone https://github.com/yourusername/> grid-routing-game.git

2. Run with a local server
> bash

## Using Python's simple server
> python -m http.server 8000

## Or using Node.js http-server
> npx http-server

3. Visit in browser
> http://localhost:8000



## Browser Support

- Chrome (Recommended)
- Firefox
- Safari
- Edge
- Opera

## Contributing

Issues and Pull Requests are welcome.

## License

[MIT License](LICENSE)
