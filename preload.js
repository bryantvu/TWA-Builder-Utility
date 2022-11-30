// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

// window.addEventListener('DOMContentLoaded', () => {
//   const replaceText = (selector, text) => {
//     const element = document.getElementById(selector)
//     if (element) element.innerText = text
//   }

//   for (const type of ['chrome', 'node', 'electron']) {
//     replaceText(`${type}-version`, process.versions[type])
//   }
// })

const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  generateApp: async(options) => { 
    const codeArea = document.querySelector("textarea");
    options = JSON.stringify(JSON.parse(codeArea.value));//only make sure value is correct
    await ipcRenderer.invoke('generateAppPackage', (options));//invoke the func in main.js
  },
  // we can also expose variables, not just functions
});

const exposedAPI = {
  // `(customData: string) => void` is just the typing here
  buildFinished: () => {
    // Deliberately strip event as it includes `sender` (note: Not sure about that, I partly pasted it from somewhere)
    // Note: The first argument is always event, but you can have as many arguments as you like, one is enough for me.
    ipcRenderer.on('build-output', (event, buildOutput)=>{
      // console.log("preload received >>",buildOutput);
      // console.log("preload received >>",buildOutput.apkFilePath);
      // // const apkFilePath = (buildOutput.apkFilePath).replaceAll("\\","\\\\");
      // // console.log("apkFilePath filtered >>",apkFilePath);
      // const open = shell.openPath();
      // open(apkFilePath);
      const resultsDiv = document.querySelector("#results");
      resultsDiv.textContent = 
        `Success, APK generated 😎 \n 
        Android Project: ${buildOutput.projectDirectory} \n
        APK: ${buildOutput.apkFilePath}`;
    });
  }
};

contextBridge.exposeInMainWorld("electron", exposedAPI);