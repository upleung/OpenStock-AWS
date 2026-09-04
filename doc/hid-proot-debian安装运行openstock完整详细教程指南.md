
---

# 2026 最新 HidenCloud (PRoot Debian) 部署 OpenStock 完整指南

本教程专为无 Root 特权、限制 3GB 内存及 15GB 磁盘的免费云面板（如 HidenCloud / Serv00）环境量身定制。完美规避 PRoot 环境下的硬链接报错、OOM 内存溢出及依赖损坏等诸多陷阱。

## 1. 环境准备与密钥获取

在开始终端操作前，请确保已准备好以下四项核心凭据：

* **MongoDB Atlas：** 创建免费 M0 集群，设置白名单为 `0.0.0.0/0`，获取带有 `authSource=admin` 或 `retryWrites=true` 的数据库连接字符串。
* **Finnhub API：** 注册 Finnhub 获取免费的行情拉取密钥。
* **Google 应用专用密码：** 登录 Google 账户安全中心 -> 开启两步验证 -> 搜索并生成“应用专用密码”（16 位纯字母），用于 Nodemailer 发送欢迎和订阅邮件。**切勿使用邮箱原密码，否则会触发 535 BadCredentials 错误**。
* **Cloudflare Tunnel：** 在 Zero Trust 控制台创建隧道，绑定你的域名至 `http://localhost:3000`，获取长 Token。

## 2. 暴力直装 Node.js 与底层工具

由于 PRoot 虚拟文件系统的底层权限缺陷，传统的 `apt` 安装图形字体库和 `nvm` 解压都会引发连锁报错。我们直接下载官方二进制包覆盖至系统全局目录。

连接 SSH 终端后执行：

```bash
# 1. 彻底清理失效的旧环境包
rm -rf ~/.nvm /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx

# 2. 安装基础必备工具
apt update && apt install -y curl git screen wget

# 3. 官方二进制包暴力直装 Node.js 20
cd /tmp
wget https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-arm64.tar.xz
tar -xJf node-v20.18.0-linux-arm64.tar.xz -C /usr/local --strip-components=1

# 4. 下载 Cloudflare Tunnel (ARM64)
wget -O /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
chmod +x /usr/local/bin/cloudflared

```

## 3. 拉取源码与环境配置

**核心排坑：** PRoot 环境不支持跨目录硬链接，使用 `pnpm` 会触发大量 `os error 2` 或 `ENOTEMPTY` 报错。**必须全程使用原生的 `npm` 进行依赖安装。**

```bash
# 1. 克隆纯净版代码仓库
mkdir -p /root/apps && cd /root/apps
git clone https://github.com/upleung/OpenStock-AWS.git OpenStock
cd OpenStock

# 2. 创建并写入配置文件
nano .env

```

在编辑器中填入以下核心配置（生成 32 位随机字符可使用 `openssl rand -base64 32`）：

```env
NODE_ENV=production
MONGODB_URI=你的MongoDB连接字符串
BETTER_AUTH_SECRET=你的32位随机复杂字符
BETTER_AUTH_URL=https://你的Cloudflare公网域名
NEXT_PUBLIC_FINNHUB_API_KEY=你的Finnhub密钥
FINNHUB_BASE_URL=https://finnhub.io/api/v1
INNGEST_SIGNING_KEY=dummy_inngest_key_123456
NODEMAILER_EMAIL=你的Gmail邮箱
NODEMAILER_PASSWORD=你的16位Google应用专用密码

```

## 4. 防 OOM 编译与守护运行

Next.js 的 Turbopack 编译期会消耗极大内存。必须配置 `NODE_OPTIONS` 限制内存，防止被 HidenCloud 审计系统强杀。

```bash
# 1. 纯净安装依赖（受限于 ARM 架构转译，此步骤可能耗时 5-10 分钟，请耐心等待）
npm install

# 2. 限制 2GB 内存执行生产环境编译
NODE_OPTIONS="--max-old-space-size=2048" npm run build

```

当终端出现树状路由表并提示 `✓ Compiled successfully` 后，即可挂载至后台：

```bash
# --- 启动 OpenStock 核心 Web 服务 ---
screen -S web
npm start
# 屏幕显示 Ready 后，依次按快捷键: Ctrl+A，松开再按 D

# --- 启动 Cloudflare Tunnel 隧道 ---
screen -S cf
cloudflared tunnel --no-autoupdate run --token 你的专属Tunnel-Token
# 屏幕显示 Connection registered 后，依次按快捷键: Ctrl+A，松开再按 D

```

至此，通过浏览器访问你配置的公网域名，即可流畅使用功能完整的 OpenStock 交易追踪系统。如果后续遇到任何端口被占用的问题，执行 `pkill node` 强制释放端口后重启即可。

---

**关机重启后的自启动机制**

HidenCloud 容器一旦关机重启，内部的 PRoot Debian 环境会随之销毁重置，`screen` 进程也会全部丢失，**默认情况下 OpenStock 和穿透隧道不会自启动**。因为 PRoot 虚拟环境不支持真实的 Linux `systemd` 开机自启服务。

**如何实现开机自启：**
你需要修改 HidenCloud 面板启动时读取的那个 `index.js`（阶段二守护脚本）。将启动命令通过 `screen -dmS` 注入到 PRoot 的初始化参数中。修改 `index.js` 中的 `args` 数组结尾部分：

```javascript
    '/bin/bash', '-c', 
    `/usr/sbin/dropbear -E -r /etc/dropbear/dropbear_rsa_host_key -p ${SSH_PORT} && screen -dmS web bash -c "cd /root/apps/OpenStock && npm start" && screen -dmS cf bash -c "cloudflared tunnel --no-autoupdate run --token 你的隧道Token" && echo "✅ 服务全量启动成功!" && /bin/bash`

```

这样每次在面板点击 Restart，或者官方维护重启服务器后，Node 项目和 Cloudflare 隧道都会在后台自动拉起。

---

**Node 原生运行 vs Docker 容器运行**

这两者的应用原理都是通过 V8 引擎解析 JavaScript 代码来提供 Web 服务，但在**系统架构和隔离级别**上有本质区别：

* **隔离级别：** Docker 会利用 Linux 内核级别的特权（Namespace 和 Cgroups）创建一个完全隔离的“独立系统”，自带一套完整的底层依赖库。而你现在用的原生 Node 运行，是直接寄生在当前 PRoot 系统的目录树中，共享宿主机的网络和内核资源。
* **性能损耗：** Docker 运行会有极小的虚拟化网络转发和存储层开销。在 HidenCloud 这种只有 3GB 内存的极度受限环境中，原生运行（Bare-metal）省去了启动 Docker 守护进程（Dockerd）的内存占用，性能更优，且不易触发 OOM（内存溢出）。
* **部署限制：** HidenCloud 不提供内核级别的 Root 权限，因此 Docker 根本无法安装。这也是为什么我们必须退而求其次，采用“PRoot 虚拟文件系统 + 原生 Node + Screen 后台守护”这种极客方案的原因。
