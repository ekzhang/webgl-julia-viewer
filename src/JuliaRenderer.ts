import fShaderSource from "./shaders/fShader.glsl";
import vShaderSource from "./shaders/vShader.glsl";

interface IJuliaRendererParams {
  loc?: number[];
  zoomCenter?: number[];
  zoomSize?: number;
}

export default class JuliaRenderer {
  public antiAliasing: boolean;
  public maxIterations: number;

  private loc: number[];
  private zoomCenter: number[];
  private zoomSize: number;
  private mouseLoc: number[];
  private mouseDown: boolean;
  private capture: ((dataURI: string) => any) | null;

  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;

  private readonly maxIterationLoc: WebGLUniformLocation | null;
  private readonly resolutionLoc: WebGLUniformLocation | null;
  private readonly zoomCenterLoc: WebGLUniformLocation | null;
  private readonly zoomSizeLoc: WebGLUniformLocation | null;
  private readonly juliaConstantLoc: WebGLUniformLocation | null;
  private readonly paletteXLoc: WebGLUniformLocation | null;
  private readonly paletteCLoc: WebGLUniformLocation | null;
  private readonly antiAliasingLoc: WebGLUniformLocation | null;

  constructor(private readonly canvas: HTMLCanvasElement, params: IJuliaRendererParams) {
    this.antiAliasing = true;
    this.maxIterations = 512;

    this.loc = params.loc || [-0.76, 0.22];
    this.zoomCenter = params.zoomCenter || [0, 0];
    this.zoomSize = params.zoomSize || 4.0;
    this.mouseLoc = [0, 0];
    this.mouseDown = false;
    this.capture = null;
    this.addEventListeners();

    this.gl = this.canvas.getContext("webgl") as WebGLRenderingContext;
    if (this.gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    }
    this.program = this.gl.createProgram() as WebGLProgram;
    this.setup();
    this.maxIterationLoc = this.gl.getUniformLocation(this.program, "u_maxIterations");
    this.resolutionLoc = this.gl.getUniformLocation(this.program, "u_resolution");
    this.zoomCenterLoc = this.gl.getUniformLocation(this.program, "u_zoomCenter");
    this.zoomSizeLoc = this.gl.getUniformLocation(this.program, "u_zoomSize");
    this.juliaConstantLoc = this.gl.getUniformLocation(this.program, "u_juliaConstant");
    this.paletteXLoc = this.gl.getUniformLocation(this.program, "u_paletteX");
    this.paletteCLoc = this.gl.getUniformLocation(this.program, "u_paletteC");
    this.antiAliasingLoc = this.gl.getUniformLocation(this.program, "u_antiAliasing");

    this.renderFrame();
  }

  public resetView() {
    this.zoomCenter = [0, 0];
    this.zoomSize = 4.0;
  }

  public screenshot(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.capture = resolve;
    });
  }

  public getLink() {
    const baseUrl = window.location.href.split("?")[0];
    const locStr = JSON.stringify(this.loc);
    const centerStr = JSON.stringify(this.zoomCenter);
    const sizeStr = JSON.stringify(this.zoomSize);
    return baseUrl + `?loc=${locStr}&zoomCenter=${centerStr}&zoomSize=${sizeStr}`;
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
      this.capture(this.canvas.toDataURL("image/png"));
      this.capture = null;
    }

    requestAnimationFrame(this.renderFrame.bind(this));
  }
}