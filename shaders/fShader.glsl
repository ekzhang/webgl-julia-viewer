/* Modified from: https://gpfault.net/posts/mandelbrot-webgl.txt.html */

/* Fragment shader that renders Mandelbrot set */
precision highp float;

/* Width and height of screen in pixels */
uniform vec2 u_resolution;

/* Point on the complex plane that will be mapped to the center of the screen */
uniform vec2 u_zoomCenter;

/* Distance between left and right edges of the screen. This essentially specifies
   which points on the plane are mapped to left and right edges of the screen.
  Together, u_zoomCenter and u_zoomSize determine which piece of the complex
   plane is displayed. */
uniform float u_zoomSize;

/* How many iterations to do before deciding that a point is in the set. */
uniform int u_maxIterations;

/* Constant c for the Julia set quadratic polynomial. */
uniform vec2 u_juliaConstant;

vec2 sq(vec2 z) {
  return mat2(z, -z.y, z.x) * z;
}

vec2 f(vec2 z, vec2 c) {
	return sq(z) + c;
}

vec3 palette(float x) {
  float CONTROL_X[6];
  CONTROL_X[0] = 0.0;
  CONTROL_X[1] = 0.16;
  CONTROL_X[2] = 0.42;
  CONTROL_X[3] = 0.6425;
  CONTROL_X[4] = 0.8575;
  CONTROL_X[5] = 1.0;
  vec3 CONTROL_C[6];
  CONTROL_C[0] = vec3(0.0, 7.0, 100.0);
  CONTROL_C[1] = vec3(32.0, 107.0, 203.0);
  CONTROL_C[2] = vec3(237.0, 255.0, 255.0);
  CONTROL_C[3] = vec3(255.0, 170.0, 0.0);
  CONTROL_C[4] = vec3(0.0, 2.0, 0.0);
  CONTROL_C[5] = vec3(0.0, 7.0, 100.0);

  for (int i = 0; i < 5; i++) {
    if (CONTROL_X[i + 1] >= x) {
      float k = (x - CONTROL_X[i]) / (CONTROL_X[i + 1] - CONTROL_X[i]);
      vec3 c1 = CONTROL_C[i];
      vec3 c2 = CONTROL_C[i + 1];
      return ((1.0 - k) * c1 + k * c2) / 256.0;
    }
  }

  // This should not be executed
  return vec3(0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  /* Decide which point on the complex plane this fragment corresponds to.*/
  vec2 z = (uv - vec2(0.5)) * u_zoomSize;
  z.y *= u_resolution.y / u_resolution.x;
  z += u_zoomCenter;

  vec2 c = u_juliaConstant;
  float smoothColor = 0.0;
  for (int i = 0; i < 10000; i++) {
    if (i >= u_maxIterations) break;
    float norm = length(z);
    smoothColor += exp(-norm);
    if (norm > 30.0)
      break;
    z = f(z, c);
  }
  smoothColor /= float(u_maxIterations);
  smoothColor = fract(smoothColor * 10.0);
  gl_FragColor = vec4(palette(smoothColor), 1.0);
}
