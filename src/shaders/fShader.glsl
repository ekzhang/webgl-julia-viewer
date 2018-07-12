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

uniform float u_paletteX[6];
uniform vec3 u_paletteC[6];

vec3 palette(float x) {
  for (int i = 0; i < 5; i++) {
    if (u_paletteX[i + 1] >= x) {
      float k = (x - u_paletteX[i]) / (u_paletteX[i + 1] - u_paletteX[i]);
      vec3 c1 = u_paletteC[i];
      vec3 c2 = u_paletteC[i + 1];
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
