import { Modal, Form, Input, Button, Tabs } from "antd";
import { getIMRegisterUrl, getIMWsUrl, getIMApiUrl, getIMConfigUrl } from "../../../config";

enum HostType {
  Https = "https://",
  Http = "http://",
  Ws = "ws://",
  Wss = "wss://"
}

const IMConfigModal = ({ visible, close }: { visible: boolean; close: () => void }) => {
  const [form] = Form.useForm();

  const getIntialValues = (type: HostType) => {
    if (!getIMApiUrl().includes(type)) {
      return {
        IMRegisterUrl: "",
        IMWsUrl: "",
        IMApiUrl: "",
        IMConfigUrl: "",
      };
    }
    return {
      IMRegisterUrl: getUrlWithoutHosts(getIMRegisterUrl()),
      IMWsUrl: getUrlWithoutHosts(getIMWsUrl()),
      IMApiUrl: getUrlWithoutHosts(getIMApiUrl()),
      IMConfigUrl: getUrlWithoutHosts(getIMConfigUrl()),
    };
  };

  const getUrlWithoutHosts = (url: string) => {
    return url.replace("https://", "").replace("http://", "").replace("ws://", "").replace("wss://", "");
  };

  const getUrlWithHosts = (url: string, type: HostType) => {
    return type + url;
  };

  const httpFinish = (values: any) => {
    console.log(values);

    localStorage.setItem("IMWsUrl", getUrlWithHosts(values.IMWsUrl, HostType.Ws));
    localStorage.setItem("IMRegisterUrl", getUrlWithHosts(values.IMRegisterUrl, HostType.Http));
    localStorage.setItem("IMApiUrl", getUrlWithHosts(values.IMApiUrl, HostType.Http));
    localStorage.setItem("IMConfigUrl", getUrlWithHosts(values.IMConfigUrl, HostType.Http));

    window.location.reload();
  };

  const httpsFinish = (values: any) => {
    console.log(values);

    localStorage.setItem("IMWsUrl", getUrlWithHosts(values.IMWsUrl, HostType.Wss));
    localStorage.setItem("IMRegisterUrl", getUrlWithHosts(values.IMRegisterUrl, HostType.Https));
    localStorage.setItem("IMApiUrl", getUrlWithHosts(values.IMApiUrl, HostType.Https));
    localStorage.setItem("IMConfigUrl", getUrlWithHosts(values.IMConfigUrl, HostType.Https));

    window.location.reload();
  };

  const defaultActiveKey = getIMApiUrl().includes(HostType.Http) ? "http" : "https";

  return (
    <Modal width={600} footer={null} title="修改配置" visible={visible} onCancel={close}>
      <Tabs defaultActiveKey={defaultActiveKey}>
        <Tabs.TabPane tab="ip+端口" key="http">
          <Form form={form} name="http" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} initialValues={getIntialValues(HostType.Http)} onFinish={httpFinish} autoComplete="off">
            <Form.Item label="IMWsUrl" name="IMWsUrl" rules={[{ required: true, message: "Please input your IMWsUrl!" }]}>
              <Input addonBefore="ws://" placeholder="如：121.5.182.23:10001" />
            </Form.Item>
            <Form.Item label="IMApiUrl" name="IMApiUrl" rules={[{ required: true, message: "Please input your IMApiUrl!" }]}>
              <Input addonBefore="http://" placeholder="如：121.5.182.23:10002" />
            </Form.Item>
            <Form.Item label="IMRegisterUrl" name="IMRegisterUrl" rules={[{ required: true, message: "Please input your IMRegisterUrl!" }]}>
              <Input addonBefore="http://" placeholder="如：121.5.182.23:10008" />
            </Form.Item>
            <Form.Item label="IMConfigUrl" name="IMConfigUrl" rules={[{ required: true, message: "Please input your IMConfigUrl!" }]}>
              <Input addonBefore="http://" placeholder="如：121.5.182.23:10009" />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                确认修改
              </Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>
        <Tabs.TabPane tab="https+域名" key="https">
          <Form form={form} name="https" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} initialValues={getIntialValues(HostType.Https)} onFinish={httpsFinish} autoComplete="off">
            <Form.Item label="IMWsUrl" name="IMWsUrl" rules={[{ required: true, message: "Please input your IMWsUrl!" }]}>
              <Input addonBefore="wss://" placeholder="如：web.rentsoft.cn/msg_gateway" />
            </Form.Item>
            <Form.Item label="IMApiUrl" name="IMApiUrl" rules={[{ required: true, message: "Please input your IMApiUrl!" }]}>
              <Input addonBefore="https://" placeholder="如：web.rentsoft.cn/api" />
            </Form.Item>
            <Form.Item label="IMRegisterUrl" name="IMRegisterUrl" rules={[{ required: true, message: "Please input your IMRegisterUrl!" }]}>
              <Input addonBefore="https://" placeholder="如：web.rentsoft.cn/chat" />
            </Form.Item>
            <Form.Item label="IMConfigUrl" name="IMConfigUrl" rules={[{ required: true, message: "Please input your IMConfigUrl!" }]}>
              <Input addonBefore="https://" placeholder="如：web.rentsoft.cn/complete_admin" />
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Button type="primary" htmlType="submit">
                确认修改
              </Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
};

export default IMConfigModal;
