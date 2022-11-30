// Modules to control application life and create native browser window
const {app, BrowserWindow, electron, ipcMain, shell} = require('electron')
const path = require('path')
const ShortcutInfo_1 = require("./node_modules/@bubblewrap/core/dist/lib/ShortcutInfo");
const core_1 = require('./node_modules/@bubblewrap/core');
const util_1 = require("./node_modules/@bubblewrap/core/dist/lib/util");
const KeyTool_1 = require("./node_modules/@bubblewrap/core/dist/lib/jdk/KeyTool");
const tmp_1 = require("tmp");
const fs_extra_1 = require("fs-extra");
const TwaGenerator_v2 = require("./TwaGenerator_v2");
const KeyTool_v2 = require("./KeyTool_v2");
var mainWindow;
//required for process.env to work
require('dotenv').config();

var apkSettings;
var projectDirectory;
var signingKeyInfo;
var javaConfig;
var jdkHelper;
var androidSdkTools;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // ipcMain.handle('ping', () => 'pong')
  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.handle("generateAppPackage", async(event, args) => {
    
  // Send result back to renderer process
  await initVals(args);
  const buildOutput = await generateAppPackage();
  console.log("buildOutput >>"+buildOutput.projectDirectory);
  console.log("buildOutput >>"+buildOutput.apkFilePath);
  console.log("buildOutput >>"+buildOutput.signingInfo);
  mainWindow.webContents.send('build-output', buildOutput);
  // const apkPath = buildOutput.projectDirectory+"/app/build/outputs/apk/release";
  // console.log("apkPath >> "+apkPath);
  shell.showItemInFolder(path.normalize(buildOutput.apkFilePath));
  return buildOutput;
});

async function initVals(options){
  console.log(">> initVals()");
  // console.log("options >>"+options);
  // console.log("options >>"+(JSON.parse(options).appVersion));
  // console.log("options >>"+(JSON.parse(options).orientation));
  // console.log("options >>"+(JSON.parse(options).signingMode));
  apkSettings = (JSON.parse(options));
  // console.log("apkSettings >>"+apkSettings.signingMode);
  let projectDirPath = (tmp_1.dirSync({ prefix: "pwabuilder-cloudapk-" })).name;
  console.log("projectDirPath >>"+projectDirPath);
  projectDirectory = projectDirPath;
  //const signing = await createLocalSigninKeyInfo(apkSettings, projectDirPath);
  signingKeyInfo = apkSettings.signing;
  javaConfig = new core_1.Config(process.env.JDK8PATH, process.env.ANDROIDTOOLSPATH);
  console.log("process.env.JDK8PATH >>", process.env.JDK8PATH);
  console.log("process.env.ANDROIDTOOLSPATH >>", process.env.ANDROIDTOOLSPATH);
  jdkHelper = new core_1.JdkHelper(process, javaConfig);
  console.log("jdkHelper >>"+jdkHelper);
  androidSdkTools = new core_1.AndroidSdkTools(process, javaConfig, jdkHelper);
  console.log("androidSdkTools >>"+androidSdkTools);
  console.log("apkSettings.keyFilePath>>"+apkSettings.keyFilePath);

}
/*
async function createLocalSigninKeyInfo(apkSettings, projectDir) {
  console.log(">> createLocalSigninKeyInfo()");
  var _a;
  // If we're told not to sign it, skip this.
  console.log("apkSettings.signingMode >>"+apkSettings.signingMode);
  if (apkSettings.signingMode === "none") {
      return null;
  }
  // Did the user upload a key file for signing? If so, download it to our directory.
  const keyFilePath = path.join(projectDir, "signingKey.keystore");
  console.log("keyFilePath >>"+keyFilePath);
  if (apkSettings.signingMode === "mine") {
      if (!((_a = apkSettings.signing) === null || _a === void 0 ? void 0 : _a.file)) {
          throw new Error("Signing mode is 'mine', but no signing key file was supplied.");
      }
      const fileBuffer = base64ToBuffer(apkSettings.signing.file);
      await fs_extra_1.promises.writeFile(keyFilePath,fileBuffer);//  JSON.stringify(apkSettings.signing) );//fileBuffer -> signing.file and add JSON.stringify() sundy
      //await fs_extra_1.promises.writeFile(keyFilePath, JSON.stringify(apkSettings.signing) );//fileBuffer -> signing.file and add JSON.stringify() sundy
  }
  function base64ToBuffer(base64) {
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
          throw new Error("Invalid base 64 string");
      }
      return Buffer.from(matches[2], "base64");
  }
  // Make sure we have signing info supplied, otherwise we received bad data.
  if (!apkSettings.signing) {
      throw new Error(`Signing mode was set to ${apkSettings.signingMode}, but no signing information was supplied.`);
  }
  return {
      keyFilePath: keyFilePath,
      ...apkSettings.signing
  };
}*///sundy 

async function generateAppPackage() {
    console.log(">> generateAppPackage()");
    // Create an optimized APK.      
    await generateTwaProject();
    const apkPath = await buildApk();
    // const optimizedApkPath = await optimizeApk(apkPath);
    const optimizedApkPath = apkPath;
    // Do we have a signing key?
    // If so, sign the APK, generate digital asset links file, and generate an app bundle.
    if (apkSettings.signingMode !== "none" && signingKeyInfo) {
      console.log("return >> signed APK");
      const signedApkPath = await signApk(optimizedApkPath, signingKeyInfo);
      const assetLinksPath = await tryGenerateAssetLinks(signingKeyInfo);
      const appBundlePath = await buildAppBundle(signingKeyInfo);
      return {
          projectDirectory: projectDirectory,
          appBundleFilePath: appBundlePath,
          apkFilePath: signedApkPath,
          signingInfo: signingKeyInfo,
          assetLinkFilePath: assetLinksPath
      };
    }
    // We generated an unsigned APK, so there will be no signing info, asset links, or app bundle.
    console.log("return >> unsigned APK");
    return {
        projectDirectory: projectDirectory,
        apkFilePath: optimizedApkPath,
        signingInfo: signingKeyInfo,
        assetLinkFilePath: null,
        appBundleFilePath: null,
    };
}
async function buildAppBundle(signingInfo) {
  console.log(">> buildAppBundle()");
    // Build the app bundle file (.aab)
    const gradleWrapper = new core_1.GradleWrapper(process, androidSdkTools, projectDirectory);
    await gradleWrapper.bundleRelease();
    // Sign the app bundle file.
    const appBundleDir = "app/build/outputs/bundle/release";
    const inputFile = `${projectDirectory}/${appBundleDir}/app-release.aab`;
    //const outputFile = './app-release-signed.aab';
    const outputFile = `${projectDirectory}/${appBundleDir}/app-release-signed.aab`;
    const jarSigner = new core_1.JarSigner(jdkHelper);
    const jarSigningInfo = {
        path: signingInfo.keyFilePath,
        alias: signingInfo.alias
    };
    await jarSigner.sign(
      jarSigningInfo, 
      signingInfo.storePassword, 
      signingInfo.keyPassword,
      inputFile, 
      outputFile
    );
    return outputFile;
}
async function generateTwaProject() {
    console.log(">> generateTwaProject()");
    //sundy changed to be below  const twaGenerator = new core_1.TwaGenerator();
    const twaGenerator = new TwaGenerator_v2.TwaGenerator_v2();

    const twaManifest = createTwaManifest(apkSettings);
    await twaGenerator.createTwaProject(projectDirectory, twaManifest, new core_1.ConsoleLog());
    return twaManifest;
}

async function createSigningKey(signingInfo) {
  console.log(">> createSigningKey()");
  console.log("signingInfo >> "+ signingInfo.alias);
  console.log("signingInfo >> "+ signingInfo.keyFilePath);
    const keyTool = new KeyTool_1.KeyTool(jdkHelper);
    const overwriteExisting = true;
    if (!signingInfo.fullName || !signingInfo.organization || !signingInfo.organizationalUnit || !signingInfo.countryCode) {
        throw new Error(`Missing required signing info. Full name: ${signingInfo.fullName}, Organization: ${signingInfo.organization}, Organizational Unit: ${signingInfo.organizationalUnit}, Country Code: ${signingInfo.countryCode}.`);
    }

    //sundy get signing file path
    const keyFilePath = path.join(projectDirectory, "signingKey.keystore");
    console.log("keyFilePath >>"+keyFilePath);
    signingInfo.keyFilePath = keyFilePath;


    const keyOptions = {
        path: signingInfo.keyFilePath,
        password: signingInfo.storePassword,
        keypassword: signingInfo.keyPassword,
        alias: signingInfo.alias,
        fullName: signingInfo.fullName,
        organization: signingInfo.organization,
        organizationalUnit: signingInfo.organizationalUnit,
        country: signingInfo.countryCode
    };
    await keyTool.createSigningKey(keyOptions, overwriteExisting);
}
async function buildApk() {
  console.log(">> buildApk()");
    const gradleWrapper = new core_1.GradleWrapper(process, androidSdkTools, projectDirectory);
    console.log("projectDirectory >> ", projectDirectory);

    await gradleWrapper.assembleRelease();
    
    return `${projectDirectory}/app/build/outputs/apk/release/app-release-unsigned.apk`;
}
async function optimizeApk(apkFilePath) {
  console.log(">> optimizeApk()");
    const optimizedApkPath = `${projectDirectory}/app-release-unsigned-aligned.apk`;
    await androidSdkTools.zipalign(apkFilePath, // input file
    optimizedApkPath);
    return optimizedApkPath;
}
async function signApk(apkFilePath, signingInfo) {
  console.log(">> signApk()");
    // Create a new signing key if necessary.
    //sundy add apkSettings.signingMode === mine, change === to ==
    if (apkSettings.signingMode === "new" ||apkSettings.signingMode === "mine" ) {
        await createSigningKey(signingInfo);
    }else if(apkSettings.signingMode === "selected") { //sundy select key file
        const keyTool = new KeyTool_v2.KeyTool_v2(jdkHelper);
        const keyOptions = {path:apkSettings.keyFilePath, keypassword: signingInfo.keyPassword, password:signingInfo.storePassword};
       
        const alias_finger_arr = await keyTool.keyInfo(keyOptions) ; 
        const alias_finger = alias_finger_arr.fingerprints ; 
        signingInfo.alias = alias_finger.get('Alias name');
        console.log("alias map:", alias_finger.values(), "; alias:", signingInfo.alias);
    }else{
        throw new Error(`Signing mode: `+ apkSettings.signingMode +` is wrong!`);
        return null;
    }
    const outputFile = `${projectDirectory}/app-release-signed.apk`;
    console.info("Signing the APK...");
    await androidSdkTools.apksigner(
      signingInfo.keyFilePath, 
      signingInfo.storePassword, 
      signingInfo.alias, 
      signingInfo.keyPassword, 
      apkFilePath, 
      outputFile);
    return outputFile;
}
async function tryGenerateAssetLinks(signingInfo) {
    try {
        const result = await generateAssetLinks(signingInfo);
        return result;
    }
    catch (error) {
        console.warn("Asset links couldn't be generated. Proceeding without asset links.", error);
        return null;
    }
}
async function generateAssetLinks(signingInfo) {
    console.info("Generating asset links...");
    const keyTool = new KeyTool_1.KeyTool(jdkHelper);
    const assetLinksFilePath = `${projectDirectory}/app/build/outputs/apk/release/assetlinks.json`;
    const keyInfo = await keyTool.keyInfo({
        path: signingInfo.keyFilePath,
        alias: signingInfo.alias,
        keypassword: signingInfo.keyPassword,
        password: signingInfo.storePassword,
    });
    const sha256Fingerprint = keyInfo.fingerprints.get('SHA256');
    if (!sha256Fingerprint) {
        throw new Error("Couldn't find SHA256 fingerprint.");
    }
    const assetLinks = core_1.DigitalAssetLinks.generateAssetLinks(apkSettings.packageId, sha256Fingerprint);
    await fs_extra_1.promises.writeFile(assetLinksFilePath, assetLinks);
    console.info(`Digital Asset Links file generated at ${assetLinksFilePath}`);
    return assetLinksFilePath;
}
function createTwaManifest(pwaSettings) {
    // Bubblewrap expects a TwaManifest object.
    // We create one using our ApkSettings and signing key info.
    var _a, _b;
    // Host without HTTPS: this is needed because the current version of Bubblewrap doesn't handle
    // a host with protocol specified. Remove the protocol here. See https://github.com/GoogleChromeLabs/bubblewrap/issues/227
    // NOTE: we cannot use new URL(pwaSettings.host).host, because this breaks PWAs located at subpaths, e.g. https://ics.hutton.ac.uk/gridscore
    const host = new URL(pwaSettings.host);
    const hostProtocol = `${host.protocol}//`;
    let hostWithoutHttps = host.href.substr(hostProtocol.length);
    // Trim any trailing slash from the host. See https://github.com/pwa-builder/PWABuilder/issues/1221
    if (hostWithoutHttps.endsWith("/")) {
        hostWithoutHttps = hostWithoutHttps.substr(0, hostWithoutHttps.length - 1);
    }
    const signingKey = {
        path: ((_a = signingKeyInfo) === null || _a === void 0 ? void 0 : _a.keyFilePath) || "",
        alias: ((_b = signingKeyInfo) === null || _b === void 0 ? void 0 : _b.alias) || ""
    };
    const manifestJson = {
        ...pwaSettings,
        host: hostWithoutHttps,
        //sundy shortcuts: createShortcuts(pwaSettings.shortcuts, pwaSettings.webManifestUrl),
        signingKey: signingKey,
        generatorApp: "PWABuilder"
    };
    const twaManifest = new core_1.TwaManifest(manifestJson);
    console.info("TWA manifest created", twaManifest);
    return twaManifest;
}
function createShortcuts(shortcutsJson, manifestUrl) {
    if (!manifestUrl) {
        console.warn("Skipping app shortcuts due to empty manifest URL", manifestUrl);
        return [];
    }
    const maxShortcuts = 4;
    return shortcutsJson
        .filter(s => isValidShortcut(s))
        .map(s => createShortcut(s, manifestUrl))
        .slice(0, 4);
}
function createShortcut(shortcut, manifestUrl) {
    const shortNameMaxSize = 12;
    const name = shortcut.name || shortcut.short_name;
    const shortName = shortcut.short_name || shortcut.name.substring(0, shortNameMaxSize);
    const url = new URL(shortcut.url, manifestUrl).toString();
    const suitableIcon = util_1.findSuitableIcon(shortcut.icons, "any");
    const iconUrl = new URL(suitableIcon.src, manifestUrl).toString();
    return new ShortcutInfo_1.ShortcutInfo(name, shortName, url, iconUrl);
}
function isValidShortcut(shortcut) {
    if (!shortcut) {
        console.warn("Shortcut is invalid due to being null or undefined", shortcut);
        return false;
    }
    if (!shortcut.icons) {
        console.warn("Shorcut is invalid due to not having any icons specified", shortcut);
        return false;
    }
    if (!shortcut.url) {
        console.warn("Shortcut is invalid due to not having a URL", shortcut);
        return false;
    }
    if (!shortcut.name && !shortcut.short_name) {
        console.warn("Shortcut is invalid due to having neither a name nor short_name", shortcut);
        return false;
    }
    if (!util_1.findSuitableIcon(shortcut.icons, 'any')) {
        console.warn("Shortcut is invalid due to not finding a suitable icon", shortcut.icons);
        return false;
    }
    return true;
}