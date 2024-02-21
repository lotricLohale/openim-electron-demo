import { Provider } from "react-redux";
import MyRoute from "../route";
import store from "../store";
import "./App.less";
import CheckUpdateModal from "./CheckUpdateModal";

function App() {
  return (
    <Provider store={store}>
      <MyRoute />
      {window.electron && <CheckUpdateModal />}
    </Provider>
  );
}

export default App;
