// tracking hands
let handPose;
let video;
let hands = [];

let currentPoints = [];
let shapes = [];

let selectedPoint = null;
let selectedShape = null;

let handMode = "right";

let snapDistance = 20;
let snapPoint = null;

let fillColorPicker;
let strokeColorPicker;
let strokeWeightPicker;
let alphaDropdown;

let currentGesture = "None";

let exportCanvas;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

let handDrawingCooldown = 0;

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(800, 600);

  exportCanvas = createGraphics(800, 600);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handPose.detectStart(video, gotHands);

  fillColorPicker = select('#fillColorPicker');
  strokeColorPicker = select('#strokeColorPicker');
  strokeWeightPicker = select('#strokeWeightPicker');

  setupHandModeDropdown();
  setupOpacityDropdown();
  setupRecordButton();
}

function setupHandModeDropdown() {
  let container = select('#handDropdownContainer');
  let handDropdown = createSelect();
  handDropdown.parent(container);
  handDropdown.option('Right Hand Mode');
  handDropdown.option('Left Hand Mode');
  handDropdown.selected('Right Hand Mode');
  handDropdown.changed(() => {
    handMode = handDropdown.value().includes("Right") ? "right" : "left";
  });
}

function setupOpacityDropdown() {
  let container = select('#opacityDropdownContainer');
  alphaDropdown = createSelect();
  alphaDropdown.parent(container);
  for (let i = 0; i <= 100; i += 10) alphaDropdown.option(i + '%', i);
  alphaDropdown.selected('50');
}

function draw() {
  background(50);

  // mirror camera
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  drawShapes();
  drawCurrentPoints();
  drawHandDebug();
  drawGestureOverlay();

  // select hands
  let drawHand = null;
  let movingHand = null;
  for (let hand of hands) {
    let side = hand.handedness === "Left" ? "left" : "right";
    if (side === handMode) drawHand = hand;
    else movingHand = hand;
  }

  handleDrawing(drawHand);
  handleMovingHand(movingHand);

  if (isRecording) drawShapesToExport(exportCanvas);
}

// draw shapes 
function drawShapesToExport(pg) {
  pg.clear();
  for (let s of shapes) {
    let alpha = alphaDropdown ? alphaDropdown.value() / 100 : 0.5;
    pg.fill(red(s.fillColor), green(s.fillColor), blue(s.fillColor), 255 * alpha);
    pg.stroke(255);
    pg.strokeWeight(2);
    pg.beginShape();
    for (let p of s.points) {
      pg.vertex(p.x, p.y);
    }
    pg.endShape(CLOSE);
  }
  if (currentPoints.length > 1) {
    let colorHex = fillColorPicker.value();
    let alpha = alphaDropdown ? alphaDropdown.value() / 100 : 0.5;
    pg.fill(color(colorHex + hex(floor(alpha * 255), 2)));
    pg.noStroke();
    pg.beginShape();
    for (let p of currentPoints) {
      pg.vertex(p.x, p.y);
    }
    pg.endShape(CLOSE);
  }
}

function drawCurrentPoints() {
  if (currentPoints.length > 1) {
    let colorHex = fillColorPicker.value();
    let alpha = alphaDropdown ? alphaDropdown.value() / 100 : 0.5;
    fill(color(colorHex + hex(floor(alpha * 255), 2)));
    noStroke();

    if (currentPoints.length === 2 && handMode === "right") {
      let p0 = currentPoints[0];
      let p1 = currentPoints[1];
      let hand = getDrawHand();
      let cp = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      if (hand) {
        let index = getMirroredPoint(hand.keypoints[8]);
        let wrist = getMirroredPoint(hand.keypoints[0]);
        let angle = atan2(index.y - wrist.y, index.x - wrist.x);
        let offset = dist(index.x, index.y, wrist.x, wrist.y) / 2;
        cp.x += cos(angle) * offset;
        cp.y += sin(angle) * offset;
      }
      beginShape();
      vertex(p0.x, p0.y);
      quadraticVertex(cp.x, cp.y, p1.x, p1.y);
      endShape();
    } else {
      beginShape();
      for (let p of currentPoints) vertex(p.x, p.y);
      endShape();
    }
  }

  for (let i = 0; i < currentPoints.length; i++) {
    let p = currentPoints[i];
    fill(selectedPoint === p ? color(0, 255, 255) : color(0, 255, 0));
    noStroke();
    circle(p.x, p.y, 12);
    if (i > 0) {
      let prev = currentPoints[i - 1];
      stroke(255);
      line(prev.x, prev.y, p.x, p.y);
    }
  }

  if (snapPoint) {
    stroke(255, 255, 0);
    strokeWeight(2);
    line(currentPoints[currentPoints.length - 1].x, currentPoints[currentPoints.length - 1].y,
      snapPoint.x, snapPoint.y);
    noFill();
    circle(snapPoint.x, snapPoint.y, 15);
  }
}

function drawShapes() {
  for (let s of shapes) {
    let alpha = alphaDropdown ? alphaDropdown.value() / 100 : 0.5;
    fill(red(s.fillColor), green(s.fillColor), blue(s.fillColor), 255 * alpha);
    stroke(strokeColorPicker.value());
    strokeWeight(strokeWeightPicker.value());
    beginShape();
    for (let p of s.points) vertex(p.x, p.y);
    endShape(CLOSE);

    for (let p of s.points) {
      fill(selectedPoint === p ? color(0, 255, 255) : color(0, 255, 0));
      noStroke();
      circle(p.x, p.y, 12);
    }
  }
}

function drawGestureOverlay() {
  fill(0, 0, 0, 150);
  noStroke();
  rect(10, 10, 220, 30, 5);
  fill(255);
  textSize(16);
  textAlign(LEFT, CENTER);
  text(`gesture: ${currentGesture}`, 15, 25);
}

function drawHandDebug() {
  for (let hand of hands) {
    for (let kp of hand.keypoints) {
      let p = getMirroredPoint(kp);
      fill(0, 255, 0);
      noStroke();
      circle(p.x, p.y, 8);
    }
    let t = getMirroredPoint(hand.keypoints[4]);
    let i = getMirroredPoint(hand.keypoints[8]);
    stroke(0, 255, 255);
    line(t.x, t.y, i.x, i.y);
  }
}

// hands
function handleDrawing(hand) {
  if (!hand) return;
  let index = getMirroredPoint(hand.keypoints[8]);
  let pinching = isPinching(hand);

  if (pinching) {
    if (!selectedPoint) {
      let newP = { x: index.x, y: index.y };

      if (currentPoints.length > 0) {
        let first = currentPoints[0];
        let d = dist(newP.x, newP.y, first.x, first.y);
        if (d < snapDistance) {
          shapes.push({ points: [...currentPoints], fillColor: color(fillColorPicker.value()) });
          currentPoints = [];
          selectedPoint = null;
          snapPoint = null;
          handDrawingCooldown = millis();
          return;
        }
      }

      if (!handDrawingCooldown || millis() - handDrawingCooldown > 200) {
        currentPoints.push(newP);
        selectedPoint = newP;
      }
    } else {
      selectedPoint.x = lerp(selectedPoint.x, index.x, 0.3);
      selectedPoint.y = lerp(selectedPoint.y, index.y, 0.3);
    }
  } else {
    selectedPoint = null;
    snapPoint = null;
  }
}

// more hands
function handleMovingHand(hand) {
  currentGesture = "none";
  if (!hand || shapes.length === 0) return;

  let index = getMirroredPoint(hand.keypoints[8]);
  let thumb = getMirroredPoint(hand.keypoints[4]);
  let distance = dist(index.x, index.y, thumb.x, thumb.y);

  if (!selectedShape) {
    for (let s of shapes) {
      if (pointInPolygon(index.x, index.y, s.points)) {

        selectedShape = s;
        selectedShape.center = getShapeCenter(s.points);
        selectedShape.lastDist = distance;
        selectedShape.lastAngle = atan2(index.y - selectedShape.center.y, index.x - selectedShape.center.x);
        break;
      }
    }
  }

  // drag shape
  if (selectedShape) {
    currentGesture = "drag";
    let dx = (index.x - selectedShape.center.x) * 0.1;
    let dy = (index.y - selectedShape.center.y) * 0.1;

    for (let p of selectedShape.points) {
      p.x += dx;
      p.y += dy;
    }
    selectedShape.center.x += dx;
    selectedShape.center.y += dy;

    // scale shape
    let scaleFactor = 1 + (distance - selectedShape.lastDist) * 0.005;
    let bbox = getShapeBoundingBox(selectedShape.points);
    let minSize = 30, maxSize = 500;
    let newWidth = (bbox.maxX - bbox.minX) * scaleFactor;
    let newHeight = (bbox.maxY - bbox.minY) * scaleFactor;

    if (newWidth < minSize) scaleFactor = minSize / (bbox.maxX - bbox.minX);
    if (newWidth > maxSize) scaleFactor = maxSize / (bbox.maxX - bbox.minX);
    if (newHeight < minSize) scaleFactor = minSize / (bbox.maxY - bbox.minY);
    if (newHeight > maxSize) scaleFactor = maxSize / (bbox.maxY - bbox.minY);

    for (let p of selectedShape.points) {
      let x = p.x - selectedShape.center.x;
      let y = p.y - selectedShape.center.y;
      p.x = selectedShape.center.x + x * scaleFactor;
      p.y = selectedShape.center.y + y * scaleFactor;
    }

    if (abs(scaleFactor - 1) > 0.001) currentGesture = "scale";
    selectedShape.lastDist = distance;

    // rotate shape
    let currentAngle = atan2(index.y - selectedShape.center.y, index.x - selectedShape.center.x);
    let angleDiff = currentAngle - selectedShape.lastAngle;
    let rotateFactor = angleDiff * 0.2;
    for (let p of selectedShape.points) {
      let x = p.x - selectedShape.center.x;
      let y = p.y - selectedShape.center.y;
      let rotatedX = x * cos(rotateFactor) - y * sin(rotateFactor);
      let rotatedY = x * sin(rotateFactor) + y * cos(rotateFactor);
      p.x = selectedShape.center.x + rotatedX;
      p.y = selectedShape.center.y + rotatedY;
    }

    if (abs(rotateFactor) > 0.01) currentGesture = "rotate";
    selectedShape.lastAngle = currentAngle;
  }
}

// bezier curve
function drawBezierCurve(p0, cp, p1) {
  stroke(255);
  noFill();
  beginShape();
  vertex(p0.x, p0.y);
  quadraticVertex(cp.x, cp.y, p1.x, p1.y);
  endShape();
}

// return
function getDrawHand() {
  for (let hand of hands) {
    let side = hand.handedness === "Left" ? "left" : "right";
    if (side === handMode) return hand;
  }
  return null;
}

function getMirroredPoint(kp) { return { x: width - kp.x, y: kp.y }; }
function isPinching(hand) {
  let index = getMirroredPoint(hand.keypoints[8]);
  let thumb = getMirroredPoint(hand.keypoints[4]);
  return dist(index.x, index.y, thumb.x, thumb.y) < 40;
}

function gotHands(results) { hands = results; }

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    let xi = poly[i].x, yi = poly[i].y;
    let xj = poly[j].x, yj = poly[j].y;
    let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getShapeCenter(points) {
  let sumX = 0, sumY = 0;
  for (let p of points) { sumX += p.x; sumY += p.y; }
  return { x: sumX / points.length, y: sumY / points.length };
}

function getShapeBoundingBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// record
function setupRecordButton() {
  const btn = document.getElementById("recordBtn");
  btn.addEventListener("click", () => {
    if (!isRecording) { startRecording(); btn.innerText = "Stop Recording"; btn.classList.add("active"); }
    else { stopRecording(); btn.innerText = "record"; btn.classList.remove("active"); }
  });
}

function startRecording() {
  recordedChunks = [];
  let stream = exportCanvas.canvas.captureStream(60);
  mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    let blob = new Blob(recordedChunks, { type: "video/webm" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url; a.download = "drawing.webm"; a.click();
  };
  mediaRecorder.start(); isRecording = true;
}

function stopRecording() { if (mediaRecorder) mediaRecorder.stop(); isRecording = false; }