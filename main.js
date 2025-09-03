const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 480, height: 360 },
    audio: false
  });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadedmetadata = () => resolve(video);
  });
}

function drawKeypoints(keypoints, minConfidence, ctx) {
  keypoints.forEach(kp => {
    if (kp.score > minConfidence) {
      ctx.beginPath();
      ctx.arc(kp.position.x, kp.position.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = "#00ffea";
      ctx.fill();
      // Nome da parte do corpo
      ctx.font = "13px Arial";
      ctx.fillStyle = "#fff";
      ctx.fillText(kp.part, kp.position.x + 10, kp.position.y + 4);
    }
  });
}

function drawSkeleton(keypoints, minConfidence, ctx) {
  const adjacentKeyPoints = window.posenet.getAdjacentKeyPoints(keypoints, minConfidence);
  adjacentKeyPoints.forEach(([from, to]) => {
    ctx.beginPath();
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
    ctx.strokeStyle = "#ff0055";
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

// Função para desenhar uma lâmpada ao lado da câmera
function drawLamp(isHandDetected) {
  // Limpa área da lâmpada
  ctx.clearRect(canvas.width - 60, 5, 55, 80);

  // Bulbo da lâmpada
  ctx.beginPath();
  ctx.arc(canvas.width - 32, 32, 18, Math.PI, 2 * Math.PI);
  ctx.lineTo(canvas.width - 14, 32);
  ctx.arc(canvas.width - 32, 32, 18, 0, Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = isHandDetected ? "#ffe066" : "#bbb";
  ctx.fill();
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Base da lâmpada
  ctx.beginPath();
  ctx.rect(canvas.width - 42, 50, 20, 12);
  ctx.fillStyle = "#888";
  ctx.fill();

  // Filamento
  ctx.beginPath();
  ctx.moveTo(canvas.width - 38, 38);
  ctx.lineTo(canvas.width - 26, 38);
  ctx.strokeStyle = "#ffae00";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Raios de luz (se acesa)
  if (isHandDetected) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI / 8 + (i * Math.PI / 4);
      const x1 = canvas.width - 32 + Math.cos(angle) * 22;
      const y1 = 32 + Math.sin(angle) * 22;
      const x2 = canvas.width - 32 + Math.cos(angle) * 32;
      const y2 = 32 + Math.sin(angle) * 32;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // Texto
  ctx.font = "13px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("Lâmpada", canvas.width - 54, 75);
}

async function runPoseNet() {
  await setupCamera();
  video.play();
  const net = await posenet.load();
  info.innerText = "Movimente a mão na frente da câmera!";
  async function poseDetectionFrame() {
    const pose = await net.estimateSinglePose(video, { flipHorizontal: false });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawKeypoints(pose.keypoints, 0.5, ctx);
    drawSkeleton(pose.keypoints, 0.5, ctx);

    // Detecta se a mão está visível
    const leftWrist = pose.keypoints.find(kp => kp.part === "leftWrist");
    const rightWrist = pose.keypoints.find(kp => kp.part === "rightWrist");
    const handDetected = (leftWrist.score > 0.5) || (rightWrist.score > 0.5);

    // Controle da tocha Minecraft
    const torchSwitch = document.getElementById('torch-switch');
    const torchText = document.getElementById('torch-text');
    if (torchSwitch) torchSwitch.checked = handDetected;
    if (torchText) torchText.textContent = handDetected ? "Mão detectada!" : "Mão não detectada.";

    // Remova ou comente a linha drawLamp(handDetected);

    info.innerText = `Pontos detectados: ${pose.keypoints.filter(k => k.score > 0.5).length}` +
      (handDetected ? " | Mão detectada! Tocha acesa." : " | Mão não detectada.");

    requestAnimationFrame(poseDetectionFrame);
  }
  poseDetectionFrame();
}

runPoseNet();