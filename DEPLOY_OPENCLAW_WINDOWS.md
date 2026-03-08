# 在 Windows 上部署 OpenClaw

[OpenClaw](https://openclaw.ai/) 是开源个人 AI 助手，可通过 WhatsApp、Telegram、Discord 等聊天应用与你对话并执行任务（清邮箱、发邮件、管理日历等）。

---

## 方式一：一键安装（推荐先试）

在 **PowerShell（建议以管理员身份运行）** 中执行：

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

脚本会自动检查并安装 Node.js 22+（若未安装），然后安装 OpenClaw。

---

## 方式二：先装 Node.js，再用 npm 安装

1. **安装 Node.js 22+**
   - 打开 https://nodejs.org/ 下载 LTS 或 Current 版本（建议 22+）
   - 安装时勾选 “Add to PATH”

2. **安装 OpenClaw**
   ```powershell
   npm install -g openclaw
   ```
   若使用新包名：
   ```powershell
   npm install -g @openclaw/cli
   ```

3. **验证**
   ```powershell
   openclaw --version
   ```

---

## 安装完成后：首次配置

在任意终端执行：

```powershell
openclaw onboard
```

按向导完成：
- 选择/配置 AI 模型（如 Claude、OpenAI 或本地模型）
- 连接通信渠道（如 Telegram、Discord、WhatsApp 等）
- 设置人格与偏好

---

## 注意事项（Windows）

- 官方文档称 **Windows 原生安装** 为“未充分测试”，可能遇到工具兼容、权限、PATH 等问题。
- 若遇到奇怪错误或打算长期/生产使用，建议使用 **WSL2** 在 Windows 上跑 Linux 版 OpenClaw，更稳定。
- 确保系统为 **Windows 10（v1903+）** 或 **Windows 11**，PowerShell 5.1+（你当前已满足）。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `openclaw onboard` | 首次/重新配置向导 |
| `openclaw --version` | 查看版本 |
| `openclaw` | 启动/与助手交互（视 CLI 设计而定） |

---

## 参考

- 官网：https://openclaw.ai/
- 安装页：https://openclaw.ai/ （含 macOS/Linux/Windows 说明）
- GitHub：https://github.com/openclaw/openclaw
