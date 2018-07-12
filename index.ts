import fShaderSource from "./shaders/fShader.glsl";
import vShaderSource from "./shaders/vShader.glsl";

const canvas = document.querySelector("#glCanvas") as HTMLCanvasElement;

// Automatic canvas resizing
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const gl = canvas.getContext("webgl") as WebGLRenderingContext;

if (gl === null) {
  alert("Unable to initialize WebGL. Your browser or machine may not support it.");
}

// Compile and link shaders
const vShader = gl.createShader(gl.VERTEX_SHADER);
const fShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(vShader, vShaderSource);
gl.shaderSource(fShader, fShaderSource);
gl.compileShader(vShader);
gl.compileShader(fShader);
const program = gl.createProgram();
gl.attachShader(program, vShader);
gl.attachShader(program, fShader);
gl.linkProgram(program);
gl.useProgram(program);

// Set positions
const buffer = gl.createBuffer();
const vertices = [-1, 1, -1, -1, 1, 1,
                  1, 1, -1, -1, 1, -1];
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const maxIterationLoc = gl.getUniformLocation(program, "u_maxIterations");
const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
const zoomCenterLoc = gl.getUniformLocation(program, "u_zoomCenter");
const zoomSizeLoc = gl.getUniformLocation(program, "u_zoomSize");
const juliaConstantLoc = gl.getUniformLocation(program, "u_juliaConstant");

let mouseLoc;
let mouseDown = false;
let loc = [-0.76, 0.22];
let zoomSize = 4.0;
let zoomCenter = [0, 0];

function coordsToPoint(x: number, y: number) {
  x = x / canvas.width - 0.5;
  y = (canvas.height - 1 - y) / canvas.height - 0.5;
  y *= canvas.height / canvas.width;
  x = x * zoomSize + zoomCenter[0];
  y = y * zoomSize + zoomCenter[1];
  return [x, y];
}

canvas.addEventListener("mousedown", (e) => {
  mouseDown = true;
  loc = mouseLoc = coordsToPoint(e.clientX, e.clientY);
});

canvas.addEventListener("mousemove", (e) => {
  mouseLoc = coordsToPoint(e.clientX, e.clientY);
  if (mouseDown) {
    loc = mouseLoc;
  }
});

canvas.addEventListener("mouseup", (e) => {
  mouseDown = false;
});

canvas.addEventListener("wheel", (e) => {
  const scale = Math.pow(2, -e.deltaY / 2000);
  zoomSize *= scale;
  zoomCenter = [scale * (zoomCenter[0] - mouseLoc[0]) + mouseLoc[0],
    scale * (zoomCenter[1] - mouseLoc[1]) + mouseLoc[1]];
});

function renderFrame() {
  // Allow resizing
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Set uniforms
  gl.uniform1i(maxIterationLoc, 512);
  gl.uniform2fv(resolutionLoc, [canvas.width, canvas.height]);
  gl.uniform2fv(zoomCenterLoc, zoomCenter);
  gl.uniform1f(zoomSizeLoc, zoomSize);
  gl.uniform2fv(juliaConstantLoc, loc);

  // Draw
  // gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(renderFrame);
}

renderFrame();
