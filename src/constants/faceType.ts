import face_2 from "@/assets/face/face_2.png";
import face_3 from "@/assets/face/face_3.png";
import face_4 from "@/assets/face/face_4.png";
import face_5 from "@/assets/face/face_5.png";
import face_6 from "@/assets/face/face_6.png";
import face_7 from "@/assets/face/face_7.png";
import face_8 from "@/assets/face/face_8.png";
import face_9 from "@/assets/face/face_9.png";
import face_10 from "@/assets/face/face_10.png";
import face_11 from "@/assets/face/face_11.png";
import face_12 from "@/assets/face/face_12.png";
import face_13 from "@/assets/face/face_13.png";
import face_14 from "@/assets/face/face_14.png";
import face_15 from "@/assets/face/face_15.png";
import face_16 from "@/assets/face/face_16.png";
import face_17 from "@/assets/face/face_17.png";
// eslint-disable-next-line
const files = (require as any).context('../assets/emoji/', true, /\.png$/);
const newFaceMap: Array<{ context: string, src: string, name: string }> = [];
const imgWithCode: {[name: string]: string} = {
    "a53":"😀",     
    "a54":"😃",     
    "a59":"😄",     
    "a8":"😁",     
    "a55":"😆",     
    "a56":"😅",     
    "a57":"🤣",     
    "a117":"😂",
    "a85":"🙂",     
    "a86":"🙃",     
    "a119": "🫠",
    "a31":"😉",
    "a84":"😊",
    "a78":"😇",
    "a19":"🥰",
    "a12":"😍",
    "a133":"🤩",
    "a15":"😘",
    "a99":"😗",
    "a38": "☺️",
    "a33":"😚",
    "a100":"😙",
    "a101": "🥲",
    "a29":"😋",
    "a64":"😛",
    "a28":"😜",
    "a63":"🤪",
    "a30":"😝",
    "a97":"🤑",
    "a92":"🤗",
    "a134":"🤭",
    "a124":"🫢",
    "a121":"🫣",
    "a96": "🤫",
    "a25": "🤔",
    "a120":"🫡",
    "a116": "🤐",
    "a118": "🤨",
    "a91": "😐",
    "a106": "😑",
    "a107": "😶",
    "a125": "🫥",
    "a136": "😶‍🌫️",
    "a32": "😏",
    "a2": "😒",
    "a11": "🙄",
    "a104": "😬",
    "a129":"😮‍💨",
    "a98": "🤥",
    "a26": "😌",
    "a16": "😔",
    "a112": "😪",
    "a102": "🤤",
    "a39": "😴",
    "a87": "😷",
    "a20": "🤒",
    "a22": "🤕",
    "a21": "🤢",
    "a24": "🤮",
    "a23": "🤧",
    "a65": "🥵",
    "a66": "🥶",
    "a95": "🥴",
    "a130": "😵",
    "a131": "😵‍💫",
    "a67": "🤯",
    "a94": "🤠",
    "a4": "🥳",
    "a103": "🥸",
    "a40":"😎",
    "a105":"🤓",
    "a14":"🧐",
    "a35":"😕",
    "a123": "🫤",
    "a36":"😟",
    "a108":"🙁",
    "a109":"☹️",
    "a9":"😮",
    "a79":"😯",
    "a83":"😲",
    "a3":"😳",
    "a93":"🥺",
    "a122": "🥹",
    "a80":"😦",
    "a6":"😧",
    "a135":"😨",
    "a110":"😰",
    "a127":"😥",
    "a7":"😢",
    "a27":"😭",
    "a37":"😱",
    "a114":"😖",
    "a128":"😣",
    "a34":"😞",
    "a111":"😓",
    "a115":"😩",
    "a113":"😫",
    "a81":"🥱",
    "a62":"😤",
    "a5":"😡",
    "a126":"😠",
    "a61":"🤬",
    "a50":"👿",
    "a51":"😈",
    "a10":"💀",
    "a137":"☠️",
    "a138":"💩",
    "a139":"🤡",
    "a157":"👻",
    "a42":"😺",
    "a43":"😸",
    "a45":"😹",
    "a18":"😻",
    "a47":"😼",
    "a46":"😽",
    "a44":"🙀",
    "a41":"😿",
    "a48":"😾",
    "a13":"💋",
    "a140": "💔",
    "a141": "❤️‍🔥",
    "a1":"❤️",
    "a142":"🍾",
    "a143":"🥂",
    "a144":"☕️",
    "a58":"🎂",
    "a145":"👌",
    "a146":"✌️",
    "a147":"👍",
    "a148":"👎",
    "a149":"👏",
    "a150":"🤝",
    "a151":"🙏",
    "a49":"🎊",
    "a52":"🔥",
    "a152":"🎉",
    "a153":"✨",
    "a154":"⚡️",
    "a155":"🌟",
    "a156":"💫"
   
}
const loadImg = () => {
  const filesArr = files.keys();
  for (let i = 0; i < filesArr.length; i++){
    const url = filesArr[i].split(/^.\//)[1];
    newFaceMap.push({
      context: imgWithCode[url.split(/.png$/)[0]],
      name: url,
      src: files(filesArr[i]).default
    });
  }
}
const codeWithImg: {[name: string]: string}  = {}
const codeWithImgFuc = () => {
  for (const key in imgWithCode) {
    codeWithImg[imgWithCode[key]] = key;
  }
}
loadImg();
codeWithImgFuc();
export {
  newFaceMap,
  imgWithCode,
  codeWithImg
};

export const faceMap:Array<{context: string, src: string, name?: string}> = [
    {
      context:"[晕]",
      src:face_2
    },
    {
      context:"[咒骂]",
      src:face_3
    },
    {
      context:"[尴尬]",
      src:face_4
    },
    {
      context:"[吓哭]",
      src:face_5
    },
    {
      context:"[搞怪]",
      src:face_6
    },
    {
      context:"[龇牙]",
      src:face_7
    },
    {
      context:"[无语]",
      src:face_8
    },
    {
      context:"[眨眼]",
      src:face_9
    },
    {
      context:"[笑脸]",
      src:face_10
    },
    {
      context:"[可怜]",
      src:face_11
    },
    {
      context:"[暴怒]",
      src:face_12
    },
    {
      context:"[可爱]",
      src:face_13
    },
    {
      context:"[哭泣]",
      src:face_14
    },
    {
      context:"[色]",
      src:face_15
    },
    {
      context:"[看穿]",
      src:face_16
    },
    {
      context:"[亲亲]",
      src:face_17
    }
  ]