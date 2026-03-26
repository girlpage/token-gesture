# Hand-Based Drawing System

![Status](https://img.shields.io/badge/status-in%20development-blue)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

An interactive system for drawing and animating shapes using hand gestures.

---

## Demo

<!-- Replace with GIF or video -->
![Demo](docs/demo.gif)

---

## Features

- Hand-based drawing using pinch gestures
- Left-hand / right-hand mode
- Dual-hand interaction (draw + control)
- Shape creation and automatic closing
- Real-time shape manipulation
- Animation recording
- Export as `.webm`
- Customizable styling (color, stroke, transparency)

---

## Controls

### Hand Roles

- **Drawing hand**: used to create shapes  
- **Control hand**: used to move and animate shapes  

### Drawing

- Pinch thumb + index finger → place a point  
- Spread fingers → draw a line  
- Pinch again → confirm line  

### Closing Shapes

- Connect the start and end points  
- The outline highlights in white when ready to close  

Note: This may require some precision and practice.

---

## Animation

- After closing a shape:
  - Use the control hand to move and animate it  
- Record your animation in the settings  
- A `.webm` file will be downloaded automatically  
- Open it locally to view the final render (no camera preview)  

---

## Settings

You can customize:

- Fill color  
- Stroke color  
- Fill transparency  
- Stroke thickness  

---

## Installation

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
npm run dev
