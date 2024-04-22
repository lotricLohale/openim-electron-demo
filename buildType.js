const fs = require("fs");
const args = require("minimist")(process.argv.slice(2));
const buildType = args.type || "QieQie";
const defaultType = !args.type || buildType === "QieQie" ? "Chatcyou" : "QieQie";
const indexPaths = [
  "./src/config/index.ts",
  "./package_build.json",
  "./package_dev.json",
  "./package.json",
  "./electron/main.ts",
  "./electron/utils/tray.ts",
  "./public/index.html",
  "./src/pages/home/Profile/Profile.tsx",
];

const imgPaths = {
  "favicon.ico": "./public/favicon.ico",
  "app.ico": "./public/icons/app.ico",
  "logo16x16.ico": "./public/icons/logo16x16.ico",
  "logo256x256.ico": "./public/icons/logo256x256.ico",
  "logo512x512.ico": "./public/icons/logo512x512.ico",
  "tray.png": "./public/icons/tray.png",
  "tray@1.5x.png": "./public/icons/tray@1.5x.png",
  "tray@1.25x.png": "./public/icons/tray@1.25x.png",
  "tray@2x.png": "./public/icons/tray@2x.png",
  "logo64x64.png": "./src/assets/images/logo64x64.png",
  "logo256x256.png": "./src/assets/images/logo256x256.png",
  "app.png": "./src/assets/images/login/app.png",
  "login_title.png": "./src/assets/images/login/login_title.png",
};

const buildConfig = {
  QieQie: {
    title: "QieQie",
    service: "im.633588.com",
    imgPath: "QieQie",
  },
  Chatcyou: {
    title: "Chatcyou",
    service: "im.633588.com",
    imgPath: "Chatcyou",
  },
};
// 替换文本
function run(path) {
  console.log("replace content: ", path);
  const data = fs.readFileSync(path);
  let pathContent = data.toString();
  for (const key in buildConfig.QieQie) {
    const reg = new RegExp(buildConfig[defaultType][key], "g");
    pathContent = pathContent.replace(reg, buildConfig[buildType][key]);
  }
  try {
    fs.writeFileSync(path, pathContent);
  } catch (err) {
    console.log(err);
  }
}
// 替换图片方法
const replaceImg = () => {
  for (const key in imgPaths) {
    const newImagePath = `./objectImg/${buildType.imgPath}/${key}`;
    // 使用 fs.copyFile 替换图片
    fs.copyFile(newImagePath, imgPaths[key], (err) => {
      if (err) {
        console.error(`error: ${key} ${imgPaths[key]}`, err);
        return;
      }
      console.log(`replace ${key} ${imgPaths[key]}`);
    });
  }
};
// 替换文本内容
indexPaths.forEach((p) => run(p));
// 替换图片
// replaceImg();
console.log("replace success");
