# Cursor 项目连接 GitHub 配置说明

## 1. 配置 Git 用户信息（必做一次）

在 PowerShell 或 Cursor 终端中执行（**请改成你的 GitHub 用户名和邮箱**）：

```powershell
git config --global user.name "你的GitHub用户名或显示名"
git config --global user.email "你在GitHub绑定的邮箱"
```

例如：`git config --global user.name "ZhangSan"`，`git config --global user.email "zhangsan@example.com"`

## 2. 本仓库已初始化

项目已执行过 `git init`，且 `.gitignore` 已包含 `.env`，密钥不会被打包提交。

## 3. 在 GitHub 上创建新仓库

1. 打开 https://github.com/new
2. Repository name 填：`claw`（或你喜欢的名字）
3. 选 **Private** 或 Public
4. **不要**勾选 “Add a README / .gitignore / license”（本地已有内容）
5. 点 **Create repository**

## 4. 连接远程并首次推送

在项目目录 `C:\Users\Administrator\Desktop\claw` 下执行：

```powershell
git remote add origin https://github.com/ALEXCHY/claw.git
git add .
git commit -m "Initial commit: claw project with skills and scripts"
git branch -M main
git push -u origin main
```

若 GitHub 提示认证：

- **HTTPS**：会弹出浏览器或要求输入用户名 + **Personal Access Token (PAT)**（不再用密码）。  
  - 创建 PAT：GitHub → Settings → Developer settings → Personal access tokens → Generate new token，勾选 `repo`。
- **SSH**：若已配置 SSH key，可改用  
  `git remote set-url origin git@github.com:ALEXCHY/claw.git`  
  再执行 `git push -u origin main`。

## 5. 在 Cursor 里使用 Git

- **源代码管理**：左侧栏点击分支图标，或 `Ctrl+Shift+G`。
- 提交：勾选变更 → 填写提交说明 → 点击 ✓ 提交。
- 推送/拉取：点击底部状态栏的「↑」「↓」或「…」中的 Push/Pull。

按上述步骤即可在 Cursor 中完成 Git 配置并用 GitHub 托管本仓库。
