import * as dat from "dat.gui";

import JuliaRenderer from "./JuliaRenderer";

// Automatic canvas resizing
const glCanvas = document.querySelector("#glCanvas") as HTMLCanvasElement;
function resize() {
  glCanvas.width = window.innerWidth;
  glCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

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
gui.add(julia, "antiAliasing").name("Anti-Aliasing");
gui.add(julia, "maxIterations", 256, 768).name("Max. Iterations");
gui.add(julia, "resetView").name("Reset View");
gui.add(controls, "screenshot").name("Screenshot");
gui.add(controls, "shareLink").name("Share Link");
