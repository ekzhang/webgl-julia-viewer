import * as dat from "dat.gui";

import JuliaRenderer from "./JuliaRenderer";

// Query-string parameters
const params: any = ((query) => {
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

// Helper functions
function downloadPNG(name, dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const array: number[] = [];
  for (let i = 0; i < byteString.length; i++) {
    array.push(byteString.charCodeAt(i));
  }
  const blob = new Blob([new Uint8Array(array)], { type: "image/png" });
  const blobUrl = URL.createObjectURL(blob);

  const element = document.createElement("a");
  element.setAttribute("href", blobUrl);
  element.setAttribute("download", name);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// Main
const glCanvas = document.querySelector("#glCanvas") as HTMLCanvasElement;
const julia = new JuliaRenderer(glCanvas, params);

// Dat.GUI setup
const controls = {
  screenshot: async () => {
    const dataURI = await julia.screenshot();
    downloadPNG("julia.png", dataURI);
  },
  shareLink: () => {
    const link = julia.getLink();
    prompt("", link);
  },
};

const gui = new dat.GUI();
const update = julia.update.bind(julia);
gui.add(julia, "antiAliasing", { "None": 1, "2x2 Supersampling": 2, "3x3 Supersampling": 3, "4x4 Supersampling": 4 })
  .name("Anti-Aliasing").onChange(update);
gui.add(julia, "maxIterations").min(0).max(1024).step(8).name("Max Iterations").onChange(update);
gui.add(julia, "scaling").min(0).max(0.05).step(0.001).name("Color Scaling").onChange(update);
gui.add(julia, "resetView").name("Reset Zoom").onChange(update);
gui.add(controls, "screenshot").name("Screenshot");
gui.add(controls, "shareLink").name("Share Link");

// Automatic canvas resizing
function resize() {
  glCanvas.width = window.innerWidth;
  glCanvas.height = window.innerHeight;
  update();
}
window.addEventListener("resize", resize);
resize();
