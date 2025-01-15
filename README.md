# MyGate Network 脚本

## 功能

- **自动生成节点**
- **自动连接/ ping 节点**
- **自动重新连接节点**
- **支持多个账户**
- **支持代理使用**
- **自动完成任务**
- **目前仅支持一个账户创建一个节点**

## 前提条件

- 你的机器上已安装 Node.js
- 包含 my-gate 平台 token 的 `tokens.txt` 文件，按照以下说明获取：
- 打开 my-gate 平台 [https://mygate.network/](https://app.mygate.network/login?code=rU4JsQ)
- 使用你的 Gmail 登录
- 检查或按 F12 打开开发者工具，找到 Network
- 复制 token 并保存到 `tokens.txt` 文件中
<img width="564" alt="image" src="https://github.com/user-attachments/assets/65099925-ad62-48ee-a409-63261c293859" />
<img width="554" alt="image" src="https://github.com/user-attachments/assets/0bd1ce46-c61b-47e4-aba0-201c9c058355" />



## 安装

1. 克隆仓库：
    ```sh
    git clone https://github.com/Gzgod/mygate.git
    cd mygate
    ```

2. 安装所需依赖：
    ```sh
    npm install
    ```

3. 在 `tokens.txt` 文件中输入你的 token，每行一个token：
    ```sh
    nano tokens.txt
    ```

4. 如果你需要使用代理：
- 在 `proxy.txt` 中粘贴代理，格式为 `http://username:password@ip:port`
    ```sh
    nano proxy.txt
    ```

5. 运行脚本：
    ```sh
    npm run start
    ```
