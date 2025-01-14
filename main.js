import { WebSocket } from 'ws';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fs from 'fs';
import chalk from 'chalk';

const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Origin": "https://app.mygate.network",
    "Priority": "u=1, i",
    "Referer": "https://app.mygate.network/",
    "Sec-CH-UA": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

function readFile(pathFile) {
    try {
        const datas = fs.readFileSync(pathFile, 'utf8')
            .split('\n')
            .map(data => data.trim())
            .filter(data => data.length > 0);
        return datas;
    } catch (error) {
        logger.error(`读取文件时出错: ${error.message}`);
        return [];
    }
};

const newAgent = (proxy = null) => {
    if (proxy && proxy.startsWith('http://')) {
        return new HttpsProxyAgent(proxy);
    } else if (proxy && proxy.startsWith('socks4://')) {
        return new SocksProxyAgent(proxy);
    } else if (proxy && proxy.startsWith('socks5://')) {
        return new SocksProxyAgent(proxy);
    } else {
        return null;
    }
};

class WebSocketClient {
    constructor(token, proxy = null, uuid, reconnectInterval = 5000) {
        this.token = token;
        this.proxy = proxy;
        this.socket = null;
        this.reconnectInterval = reconnectInterval;
        this.shouldReconnect = true;
        this.agent = newAgent(proxy);
        this.uuid = uuid;
        this.url = `wss://api.mygate.network/socket.io/?nodeId=${this.uuid}&EIO=4&transport=websocket`;
        this.regNode = `40{"token":"Bearer ${this.token}"}`;
        this.headers = {
            "Accept-encoding": "gzip, deflate, br, zstd",
            "Accept-language": "en-US,en;q=0.9,id;q=0.8",
            "Cache-control": "no-cache",
            "Connection": "Upgrade",
            "Host": "api.mygate.network",
            "Origin": "chrome-extension://hajiimgolngmlbglaoheacnejbnnmoco",
            "Pragma": "no-cache",
            "Sec-Websocket-Extensions": "permessage-deflate; client_max_window_bits",
            "Upgrade": "websocket",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        }
    }

    connect() {
        if (!this.uuid || !this.url) {
            logger.error("无法连接: 节点未注册。");
            return;
        }

        logger.info("尝试连接:", this.uuid);
        this.socket = new WebSocket(this.url, { headers: this.headers, agent: this.agent });

        this.socket.onopen = () => {
            logger.info("WebSocket连接已建立，节点:", this.uuid);
            this.reply(this.regNode);
        };

        this.socket.onmessage = (event) => {
            if (event.data === "2" || event.data === "41") this.socket.send("3");
            else logger.info(`节点 ${this.uuid} 收到消息:`, event.data);
        };

        this.socket.onclose = () => {
            logger.warn("WebSocket连接关闭，节点:", this.uuid);
            if (this.shouldReconnect) {
                logger.warn(`将在 ${this.reconnectInterval / 1000} 秒后重新连接，节点:`, this.uuid);
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };

        this.socket.onerror = (error) => {
            logger.error(`WebSocket错误，节点 ${this.uuid}:`, error.message);
            this.socket.close();
        };
    }

    reply(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(String(message));
            logger.info("已回复:", message);
        } else {
            logger.error("无法发送消息; WebSocket未打开。");
        }
    }

    disconnect() {
        this.shouldReconnect = true;
        if (this.socket) {
            this.socket.close();
        }
    }
}

async function registerNode(token, proxy = null, node = null) {
    const agent = newAgent(proxy);
    const maxRetries = 5;
    let retries = 0;
    let uuid = node || randomUUID();
    const activationDate = new Date().toISOString();
    const payload = {
        id: uuid,
        status: "Good",
        activationDate: activationDate,
    };

    while (retries < maxRetries) {
        try {
            const response = await axios.post(
                "https://api.mygate.network/api/front/nodes",
                payload,
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                }
            );

            logger.info("节点注册成功:", response.data);
            return uuid;
        } catch (error) {
            logger.error("注册节点时出错:", error.message);
            retries++;
            if (retries < maxRetries) {
                logger.info("10秒后重试...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                logger.error("最大重试次数已超出; 放弃注册。");
                return null;
            }
        }
    }
}

async function confirmUser(token, proxy = null) {
    const agent = newAgent(proxy);
    try {
        const response = await axios.post(
            "https://api.mygate.network/api/front/referrals/referral/LfBWAQ?",
            {},
            {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            }
        );
        logger.info("确认用户响应:", response.data);
        return null;
    } catch (error) {
        logger.info("确认用户时出错:", error.message);
        return null;
    }
};

const getQuestsList = async (token, proxy = null) => {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy);

    while (retries < maxRetries) {
        try {
            const response = await axios.get("https://api.mygate.network/api/front/achievements/ambassador", {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            });
            const uncompletedIds = response.data.data.items
                .filter(item => item.status === "UNCOMPLETED")
                .map(item => item._id);
            return uncompletedIds;
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                logger.info("10秒后重试...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                logger.error("最大重试次数已超出; 放弃获取任务信息。");
                return { error: error.message };
            }
        }
    }
};

async function submitQuest(token, proxy = null, questId) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy);
    while (retries < maxRetries) {
        try {
            const response = await axios.post(
                `https://api.mygate.network/api/front/achievements/ambassador/${questId}/submit?`,
                {},
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                }
            );
            logger.info("提交任务响应:", response.data);
            return response.data;
        } catch (error) {
            logger.error("提交任务时出错:", error.message);
            retries++;
            if (retries < maxRetries) {
                logger.info("10秒后重试...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                logger.error("最大重试次数已超出; 放弃提交任务。");
                return { error: error.message };
            }
        }
    }
};

async function getUserInfo(token, proxy = null) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy);

    while (retries < maxRetries) {
        try {
            const response = await axios.get("https://api.mygate.network/api/front/users/me", {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            });
            const { name, status, _id, levels, currentPoint } = response.data.data;
            return { name, status, _id, levels, currentPoint };
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                logger.info("10秒后重试...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                logger.error("最大重试次数已超出; 放弃获取用户信息。");
                return { error: error.message };
            }
        }
    }
};

async function getUserNode(token, proxy = null, index) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy);

    while (retries < maxRetries) {
        try {
            const response = await axios.get(
                "https://api.mygate.network/api/front/nodes?limit=10&page=1",
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                }
            );

            return response.data.data.items.map(item => item.id);
        } catch (error) {
            retries++;

            if (error.response && error.response.status === 401) {
                logger.error(`账户 #${index}:`, '未授权 - 请更新token');
                return null;
            }

            if (retries < maxRetries) {
                logger.info("10秒后重试...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                logger.error("最大重试次数已超出; 放弃获取用户节点。");
                return [];
            }
        }
    }
};

const checkQuests = async (token, proxy = null) => {
    logger.info('尝试检查新任务...');
    const questsIds = await getQuestsList(token, proxy);

    if (questsIds && questsIds.length > 0) {
        logger.info('发现新未完成任务:', questsIds.length);

        for (const questId of questsIds) {
            logger.info('尝试完成任务:', questId);
            try {
                await submitQuest(token, proxy, questId);
                logger.info(`任务 ${questId} 完成成功。`);
            } catch (error) {
                logger.error(`完成任务 ${questId} 时出错:`, error);
            }
        }
    } else {
        logger.info('没有找到新的未完成任务。');
    }
};

const logger = {
    log: (level, message, value = '') => {
        const now = new Date().toISOString();

        const colors = {
            info: chalk.green,
            warn: chalk.yellow,
            error: chalk.red,
            success: chalk.blue,
            debug: chalk.magenta,
        };

        const color = colors[level] || chalk.white;
        const levelTag = `[ ${level.toUpperCase()} ]`;
        const timestamp = `[ ${now} ]`;

        const formattedMessage = `${chalk.green("[ Mygate-Node ]")} ${chalk.cyanBright(timestamp)} ${color(levelTag)} ${message}`;

        let formattedValue = ` ${chalk.green(value)}`;
        if (level === 'error') {
            formattedValue = ` ${chalk.red(value)}`;
        }
        if (typeof value === 'object') {
            const valueColor = level === 'error' ? chalk.red : chalk.green;
            formattedValue = ` ${valueColor(JSON.stringify(value))}`;
        }

        console.log(`${formattedMessage}${formattedValue}`);
    },

    info: (message, value = '') => logger.log('info', message, value),
    warn: (message, value = '') => logger.log('warn', message, value),
    error: (message, value = '') => logger.log('error', message, value),
    success: (message, value = '') => logger.log('success', message, value),
    debug: (message, value = '') => logger.log('debug', message, value),
};

async function main() {
    logger.info("");

    const tokens = readFile("tokens.txt");
    const proxies = readFile("proxy.txt");
    let proxyIndex = 0;

    try {
        logger.info(`处理运行，共计 ${tokens.length} 个账户`);
        await Promise.all(tokens.map(async (token, index) => {

            const proxy = proxies.length > 0 ? proxies[proxyIndex] : null;
            if (proxies.length > 0) {
                proxyIndex = (proxyIndex + 1) % proxies.length;
            }

            logger.info("尝试获取账户的用户节点", `#${index + 1}`);
            let nodes = await getUserNode(token, proxy, index + 1);
            if (!nodes) return;
            if (nodes.length === 0) {
                logger.info("此账户没有节点 - 注册新节点...");
                const uuid = await registerNode(token, proxy);
                if (!uuid) {
                    logger.error("注册节点失败 - 跳过WebSocket连接。");
                    return;
                }
                nodes = [uuid];
            } else {
                logger.info(`账户 #${index + 1} 的活跃节点数:`, nodes.length);
                await Promise.all(nodes.map(node => registerNode(token, proxy, node)));
            }

            await confirmUser(token, proxy);
            setInterval(async () => {
                const users = await getUserInfo(token);
                logger.info(`账户 #${index + 1} 的用户信息:`, { Active_Nodes: nodes.length, users });
            }, 11 * 60 * 1000);

            await Promise.all(nodes.map(node => {
                logger.info(`尝试为账户 #${index + 1} 使用代理打开新连接:`, proxy || "无代理");
                const client = new WebSocketClient(token, proxy, node);
                client.connect();

                setInterval(() => {
                    client.disconnect();
                }, 10 * 60 * 1000);
            }));

            await checkQuests(token, proxy);
            setInterval(async () => {
                try {
                    await checkQuests(token, proxy);
                } catch (error) {
                    logger.error(`检查任务时出错，账户 #${index + 1}:`, error.message);
                }
            }, 24 * 60 * 60 * 1000);

            const users = await getUserInfo(token, proxy);
            logger.info(`账户 #${index + 1} 的用户信息:`, { Active_Nodes: nodes.length, users });
        }));

        logger.info("所有账户的连接已建立 - 保持运行。");
    } catch (error) {
        logger.error("WebSocket连接中出错:", error.message);
    }
}

export { main };

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
