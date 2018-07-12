import * as dat from "dat.gui";

import fShaderSource from "./shaders/fShader.glsl";
import vShaderSource from "./shaders/vShader.glsl";

const params: any = ((query) => {
  // Source: https://stackoverflow.com/a/3855394/2514396
  if (!query) {
    return {};
  }
  return (/^[?#]/.test(query) ? query.slice(1) : query)
    .split("&")
    .reduce((pparams, param) => {
      const [key, value] = param.split("=");
      pparams[key] = value ? JSON.parse(decodeURIComponent(value.replace(/\+/g, " "))) : null;
      return pparams;
    }, {});
})(window.location.search);

function download(name, dataUrl) {
  const element = document.createElement("a");
  element.setAttribute("href", dataUrl);
  element.setAttribute("download", name);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

class JuliaRenderer {
  public antiAliasing: boolean;
  public maxIterations: number;

  private loc: number[];
  private zoomCenter: number[];
  private zoomSize: number;
  private mouseLoc: number[];
  private mouseDown: boolean;
  private capture: boolean;

  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;

  private readonly maxIterationLoc: WebGLUniformLocation;
  private readonly resolutionLoc: WebGLUniformLocation;
  private readonly zoomCenterLoc: WebGLUniformLocation;
  private readonly zoomSizeLoc: WebGLUniformLocation;
  private readonly juliaConstantLoc: WebGLUniformLocation;
  private readonly paletteXLoc: WebGLUniformLocation;
  private readonly paletteCLoc: WebGLUniformLocation;
  private readonly antiAliasingLoc: WebGLUniformLocation;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.antiAliasing = true;
    this.maxIterations = 512;

    this.loc = params.loc || [-0.76, 0.22];
    this.zoomCenter = params.zoomCenter || [0, 0];
    this.zoomSize = params.zoomSize || 4.0;
    this.mouseLoc = [0, 0];
    this.mouseDown = false;
    this.capture = false;
    this.addEventListeners();

    this.gl = this.canvas.getContext("webgl") as WebGLRenderingContext;
    if (this.gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    }
    this.program = this.gl.createProgram() as WebGLProgram;
    this.setup();
    this.maxIterationLoc = this.gl.getUniformLocation(this.program, "u_maxIterations") as WebGLUniformLocation;
    this.resolutionLoc = this.gl.getUniformLocation(this.program, "u_resolution") as WebGLUniformLocation;
    this.zoomCenterLoc = this.gl.getUniformLocation(this.program, "u_zoomCenter") as WebGLUniformLocation;
    this.zoomSizeLoc = this.gl.getUniformLocation(this.program, "u_zoomSize") as WebGLUniformLocation;
    this.juliaConstantLoc = this.gl.getUniformLocation(this.program, "u_juliaConstant") as WebGLUniformLocation;
    this.paletteXLoc = this.gl.getUniformLocation(this.program, "u_paletteX") as WebGLUniformLocation;
    this.paletteCLoc = this.gl.getUniformLocation(this.program, "u_paletteC") as WebGLUniformLocation;
    this.antiAliasingLoc = this.gl.getUniformLocation(this.program, "u_antiAliasing") as WebGLUniformLocation;

    this.renderFrame();
  }

  public resetView() {
    this.zoomCenter = [0, 0];
    this.zoomSize = 4.0;
  }

  public screenshot() {
    this.capture = true;
  }

  public shareLink() {
    const baseUrl = window.location.href.split("?")[0];
    const locStr = JSON.stringify(this.loc);
    const centerStr = JSON.stringify(this.zoomCenter);
    const sizeStr = JSON.stringify(this.zoomSize);
    prompt("", baseUrl + `?loc=${locStr}&zoomCenter=${centerStr}&zoomSize=${sizeStr}`);
  }

  private coordsToPoint(x: number, y: number) {
    x = x / this.canvas.width - 0.5;
    y = (this.canvas.height - 1 - y) / this.canvas.height - 0.5;
    y *= this.canvas.height / this.canvas.width;
    x = x * this.zoomSize + this.zoomCenter[0];
    y = y * this.zoomSize + this.zoomCenter[1];
    return [x, y];
  }

  private addEventListeners() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.mouseDown = true;
      this.loc = this.mouseLoc = this.coordsToPoint(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      this.mouseLoc = this.coordsToPoint(e.clientX, e.clientY);
      if (this.mouseDown) {
        this.loc = this.mouseLoc;
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      this.mouseDown = false;
    });

    this.canvas.addEventListener("wheel", (e) => {
      const scale = Math.pow(2, -e.deltaY / 2000);
      this.zoomSize *= scale;
      this.zoomCenter[0] = scale * (this.zoomCenter[0] - this.mouseLoc[0]) + this.mouseLoc[0];
      this.zoomCenter[1] = scale * (this.zoomCenter[1] - this.mouseLoc[1]) + this.mouseLoc[1];
    });
  }

  private setup() {
    // Compile and link shaders
    const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    const fShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(vShader, vShaderSource);
    this.gl.shaderSource(fShader, fShaderSource);
    this.gl.compileShader(vShader);
    this.gl.compileShader(fShader);
    this.gl.attachShader(this.program, vShader);
    this.gl.attachShader(this.program, fShader);
    this.gl.linkProgram(this.program);
    this.gl.useProgram(this.program);

    // Set positions
    const buffer = this.gl.createBuffer();
    const vertices = [-1, 1, -1, -1, 1, 1,
      1, 1, -1, -1, 1, -1];
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  private renderFrame() {
    // Allow resizing
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    // Set uniforms
    this.gl.uniform1i(this.antiAliasingLoc, this.antiAliasing ? 1 : 0);
    this.gl.uniform1i(this.maxIterationLoc, this.maxIterations);
    this.gl.uniform2fv(this.resolutionLoc, [this.canvas.width, this.canvas.height]);
    this.gl.uniform2fv(this.zoomCenterLoc, this.zoomCenter);
    this.gl.uniform1f(this.zoomSizeLoc, this.zoomSize);
    this.gl.uniform2fv(this.juliaConstantLoc, this.loc);
    this.gl.uniform1fv(this.paletteXLoc, [0.0, 0.16, 0.42, 0.6425, 0.8575, 1.0]);
    this.gl.uniform3fv(this.paletteCLoc, [
      0.0, 7.0, 100.0,
      32.0, 107.0, 203.0,
      237.0, 255.0, 255.0,
      255.0, 170.0, 0.0,
      0.0, 2.0, 0.0,
      0.0, 7.0, 100.,
    ]);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    if (this.capture) {
      download("julia.png", this.canvas.toDataURL("image/png"));
      this.capture = false;
    }

    requestAnimationFrame(this.renderFrame.bind(this));
  }
}

// Automatic canvas resizing
const glCanvas = document.querySelector("#glCanvas") as HTMLCanvasElement;
function resize() {
  glCanvas.width = window.innerWidth;
  glCanvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// Main
const julia = new JuliaRenderer(glCanvas);

// Dat.GUI setup
const gui = new dat.GUI();
gui.add(julia, "antiAliasing");
gui.add(julia, "maxIterations", 256, 768);
gui.add(julia, "resetView");
gui.add(julia, "screenshot");
gui.add(julia, "shareLink");
