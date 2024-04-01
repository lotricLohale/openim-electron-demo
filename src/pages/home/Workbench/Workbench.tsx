// import { BellFilled, SearchOutlined } from "@ant-design/icons";
// import { Input, Typography } from "antd";
// import { t } from "i18next";
// import { useEffect, useState } from "react";
// import { getOpenApp } from "../../../api/world_window";

// type AppInfo = {
//   apiUrl: string;
//   appLogo: string;
//   appName: string;
// };

// const Workbench = () => {
//   const [inputValue, setInputValue] = useState("");
//   const [appList, setAppList] = useState<AppInfo[]>([]);

//   useEffect(() => {
//     getOpenApp().then((res) => setAppList(res.data));
//   }, []);

//   const onChanged = (e: any) => {
//     setInputValue(e.target.value);
//   };

//   const toApp = (url: string) => {
//     const hasParams = url.indexOf("?") !== -1;
//     let fullUrl = url + `${hasParams ? "&" : "?"}authToken=${sessionStorage.getItem("BusinessToken")}`;
//     if (window.electron) {
//       window.electron.openExternal(fullUrl);
//     } else {
//       window.open(fullUrl, "_blank");
//     }
//   };

//   return (
//     <div className="workbench">
//       <div className="box">
//         <Input allowClear value={inputValue} onChange={onChanged} placeholder={t("Search")} prefix={<SearchOutlined />} />
//         <div className="application_list">
//           {appList.map((app) => (
//             <div key={app.appName} className="item_box">
//               <div onClick={() => toApp(app.apiUrl)} className="item">
//                 <img src={app.appLogo} width={50} />
//                 <Typography.Text ellipsis={{ tooltip: app.appName }} className="title">
//                   {app.appName}
//                 </Typography.Text>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Workbench;

function Workbench() {
  return (
    <div>Workbench</div>
  )
}

export default Workbench