## Getting Started

### Update Config

- For web
> src->config
```bash
export const REGISTER_URL = "https://server.explinge.net/chat" // ->Original 10008 port
export const CONFIG_URL = "https://server.explinge.net/complete_admin" // ->Original 10009 port
export const WS_URL = "wss://server.explinge.net/msg_gateway"   // ->Original 10003 port
export const API_URL = "https://server.explinge.net/api"       // ->Original 10002 port
export const OBJECTSTORAGE: "cos" | "minio" = "minio" // ->object storage default minio
```

- For electron
> electron->config
```bash
export const SINGLE_INSTANCE = true // ->Whether to enable singleton mode (false to allow multiple openings)
```

### Develop

- Get dependencies from npm

  ```bash
  npm install 
  ```


- Run and preview at local (web)

  ```
  npm run start:renderer

- Run and preview at local (electron)

  ```bash
  npm run start:main
  ```

- Build (web)

  ```
  npm run build:renderer
  ```

- Build (electron)
  > You can refer to the dependencies in the `package_build.json` file to reduce the size of the installation package

  > you need update `utils/open_im_sdk_wasm/api/database/instance.js` wasm import path first.
  >
  > ```javascript
  > - SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
  > + SQL = await initSqlJs({ locateFile: () => '../../sql-wasm.wasm' });
  > ```

    ```bash
    npm run build:mac
    // or
    npm run build:win32
    // or
    npm run build:linux
    ```

  

## Getting Help

The best way to interact with our team is through GitHub.You can open an issue with this.You can also find some Doc in [Our Developer Guide](https://doc.rentsoft.cn/) or visit [Our Community](https://forum.rentsoft.cn/) to raise a query.

