// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


const unsignedBtn = document.querySelector("#unsignedBtn");
const signedBtn = document.querySelector("#signedBtn");
const chooseKeyBtn = document.querySelector("#chooseKeyBtn");
const existingKeyBtn = document.querySelector("#existingKeyBtn");
const filePicker = document.querySelector("#filePicker");
const codeArea = document.querySelector("textarea");
const submitBtn = document.querySelector("#submitBtn")
const resultsDiv = document.querySelector("#results");
const spinner = document.querySelector(".spinner-border");
existingKeyBtn.addEventListener("click", () => setCode(getUnsignedApkOptions()))
//sundy comment below lines 11172022
//unsignedBtn.addEventListener("click", () => setCode(getUnsignedApkOptions()));
signedBtn.addEventListener("click", () => setCode(getUnsignedApkOptions())); 
 
chooseKeyBtn.addEventListener("click", () => filePicker.click());
filePicker.addEventListener("change", (e) => keyFileChosen(e));
submitBtn.addEventListener("click", () => submit());

setCode(getUnsignedApkOptions());
codeArea.scrollTop = 0;

window.electron.buildFinished((buildOutput) => {
    console.log("renderer received >> ",buildOutput); // 'something'
  });

function setCode(options) {
    console.log(">> setCode()");
    const code = JSON.stringify(options, undefined, 4);
    codeArea.value = code;
    codeArea.scrollTop = 1000000;
}

function getUnsignedApkOptions() {
    console.log(">>   getUnsignedApkOptions()"); 
    return {
        host: "https://sadchonks.com",
        startUrl: "/",  //changed to "/"   sundy 091522
        iconUrl: "./image/wish512.png",//"https://www.wish.com/static/img/logo/manifest_icons/wish-512x512.png", //"https://sadchonks.com/kitteh-512.png",
        maskableIconUrl:"./image/kitteh512.png",// "https://sadchonks.com/kitteh-512.png",
        webManifestUrl: "", //sundy value can be ""
        //monochromeIconUrl: undefined,   sundy
        launcherName: "Chonks",
        name: "Sad Chonks",
        appVersion: "1.0.0.0",
        appVersionCode: 1,
        backgroundColor: "#3f51b5",
        display: "standalone",
        //enableSiteSettingsShortcut: true,  //sundy
        enableNotifications: false,
        fallbackType: "customtabs",
        /*features: {
            locationDelegation: {
                enabled: true
            },
            playBilling: {
                enabled: false
            }
        },*///sundy 
        
        navigationColor: "#3f51b5",
        navigationColorDark: "#3f51b5",
        navigationDividerColor: "#3f51b5",
        navigationDividerColorDark: "#3f51b5",
        orientation: "default",
        packageId: "com.sadchonks",
        /*shareTarget: {
            action: "/share-target/",
            method: "GET",
            params: {
              title: "title",
              text: "text",
              url: "url"
            }
        },
         shortcuts: [{
            name: "New Chonks",
            short_name: "New",
            url: "/?shortcut",
            icons: [
                {
                    "sizes": "128x128",
                    "src": "/favicon.png"
                }
            ]
        }],*///sundy 
        signingMode: "mine", // none -> mine  by sundy 11 17 2022
        //changed below: null -> {} content  sundy 11172022
        keyFilePath: "",
        signing: {
            "alias": "my-key-alias",
            "fullName": "John Doe",
            "organization": "Contoso",
            "organizationalUnit": "Engineering Department",
            "countryCode": "US",
            "keyPassword": "key123",
            "storePassword": "store1"
        },
        splashScreenFadeOutDuration: 300,
        themeColor: "#3f51b5"
    };
}

/*function getSignedApk() {
    const options = getUnsignedApkOptions();
    options.signingMode = "new";
    options.signing = {
        //sundy file: null,
        alias: "my-android-key",
        fullName: "John Doe",
        organization: "Contoso",
        organizationalUnit: "Engineering Department",
        countryCode: "US",
        keyPassword: "aBc123$%",
        storePassword: "iOp987#@"
    };
    return options;
}*///sundy

/*sundy 
  function getExistingKeySignedApk() {
    //sundy const options = getSignedApk();
    const options =  getUnsignedApkOptions();
    options.signingMode = "mine";
    options.signing.file = "data:application/octet-stream;base64,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";
    options.signing.alias = "my-key-alias";
    options.signing.keyPassword = "key123"; //sundy "52SO4fg9ZIsw" //diff from that of getSignedApk()
    options.signing.storePassword = "store1"; //"o93619kHyx82";//diff from that of getSignedApk()
  
    return options;
}*/

function keyFileChosen(e) {
    console.log("file selected:", filePicker.files);
    if (filePicker.files) {
        
        options =getUnsignedApkOptions();
        options.keyFilePath = filePicker.files[0].path;
        options.signingMode ="selected";
        options.signing.keyPassword = "huawei";
        options.signing.storePassword = "huawei";
        options.signing.keyFilePath = options.keyFilePath;
        console.log("file selected:", options.keyFilePath);
        setCode(options );
    /*    const keyPathSelected = filePicker.files[0].path;
        keyOptions= {path: keyPathSelected, password: options.storePassword, keypassword:options.keyPassword};
        alias_parsed = KeyTool_v2.keyInfo(keyOptions);
        console.log("alias+fingerprint maps:", alias_parsed);
        console.log("alias value:", alias_parsed.get('Alias name'));
        // Read the file 
        const fileReader = new FileReader();
        fileReader.onload = () => {
            options.file = fileReader.result;
            setCode(options);
        }
        fileReader.readAsDataURL(filePicker.files[0]);

        console.log("file selected:", filePicker.files[0].path);
        filePicker.file = null;
        *///sundy
    }
}

async function submit() {
    console.log(">> submit()");
    resultsDiv.textContent = "";

    setLoading(true);
    try {
        // Convert the JSON to an object and back to a string to ensure proper formatting.
        const options = JSON.stringify(JSON.parse(codeArea.value));
        // console.log("options >>"+options);
        // const response = await window.versions.generateApp(options);
        await window.versions.generateApp(options);// preload.js generateApp
        // console.log(response)

    } catch(err) {
        resultsDiv.textContent = "Failed. Error: " + err;
    }
    finally {
        setLoading(false);
    }

    
}

function setLoading(state) {
    console.log(">> setLoading()");
    submitBtn.disabled = state;
    if (state) {
        spinner.classList.remove("d-none");//stop using scroll function
    } else {
        spinner.classList.add("d-none");
    }
}
