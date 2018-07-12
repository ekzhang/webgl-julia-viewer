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

/* Whether or not to anti-alias using 2x2 supersampling. */
uniform bool u_antiAliasing;

vec2 sq(vec2 z) {
  return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
}

vec2 f(vec2 z, vec2 c) {
	return sq(z) + c;
}

uniform float u_paletteX[6];
uniform vec3 u_paletteC[6];

vec2 coordsToPoint(vec2 xy) {
  vec2 uv = xy / u_resolution;
  vec2 z = (uv - vec2(0.5)) * u_zoomSize;
  z.y *= u_resolution.y / u_resolution.x;
  z += u_zoomCenter;
  return z;
}

float compute(vec2 z) {
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
  return smoothColor;
}

float computeAtOffset(vec2 offset) {
  return compute(coordsToPoint(gl_FragCoord.xy + offset));
}

vec3 palette(float x) {
  x = fract(x * 10.0);
  for (int i = 0; i < 5; i++) {
    if (u_paletteX[i + 1] >= x) {
      float k = (x - u_paletteX[i]) / (u_paletteX[i + 1] - u_paletteX[i]);
      vec3 c1 = u_paletteC[i];
      vec3 c2 = u_paletteC[i + 1];
      return ((1.0 - k) * c1 + k * c2) / 256.0;
    }
  }
  // This should never be executed
  return vec3(0.0);
}

void main() {
  vec3 color;
  if (u_antiAliasing) {
    float c1 = computeAtOffset(vec2(-0.25, -0.25));
    float c2 = computeAtOffset(vec2(-0.25, +0.25));
    float c3 = computeAtOffset(vec2(+0.25, -0.25));
    float c4 = computeAtOffset(vec2(+0.25, +0.25));
    color = (palette(c1) + palette(c2) + palette(c3) + palette(c4)) / 4.0;
  }
  else {
    color = palette(computeAtOffset(vec2(0.0)));
  }
  gl_FragColor = vec4(color, 1.0);
}
