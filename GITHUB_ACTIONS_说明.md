# GitHub Actions 自动打包使用指南

## 📦 已配置完成

✅ GitHub Actions 配置文件已创建
✅ Git 仓库已初始化
✅ 代码已提交

## 🚀 接下来的步骤

### 1. 创建 GitHub 仓库

1. 打开 GitHub.com，登录你的账号
2. 点击右上角的 "+" → "New repository"
3. 填写仓库信息：
   - **Repository name**: `image-comparison-tool` （或其他名称）
   - **Description**: 图像对比和标注工具
   - **可见性**: Public 或 Private（都可以使用 Actions）
   - ⚠️ **不要** 勾选 "Initialize this repository with a README"
4. 点击 "Create repository"

### 2. 推送代码到 GitHub

复制 GitHub 显示的命令，或者使用以下命令：

```bash
# 添加远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/你的用户名/image-comparison-tool.git

# 推送代码
git push -u origin main
```

如果 main 分支不存在，可能需要：
```bash
git branch -M main
git push -u origin main
```

### 3. 查看自动打包进度

推送后，GitHub Actions 会自动开始打包：

1. 在 GitHub 仓库页面，点击顶部的 "Actions" 标签
2. 你会看到正在运行的工作流
3. 点击进入可以看到详细的打包进度
4. 打包完成后（大约 10-15 分钟），会显示绿色的 ✓

### 4. 下载打包好的应用

打包成功后：

1. 在 Actions 页面，点击成功完成的工作流
2. 滚动到页面底部，找到 "Artifacts" 部分
3. 你会看到三个文件：
   - **ImageComparisonTool-macOS** - Mac 版本（.zip 文件）
   - **ImageComparisonTool-Windows** - Windows 版本（.exe 安装程序）
   - **ImageComparisonTool-Linux** - Linux 版本（.AppImage 或 .deb）
4. 点击下载即可

## 🔄 后续使用

每次你修改代码并推送到 GitHub：

```bash
git add .
git commit -m "描述你的修改"
git push
```

GitHub Actions 会自动重新打包，你可以随时下载最新版本。

## 🎛️ 手动触发打包

如果你想手动触发打包（不修改代码）：

1. 进入 GitHub 仓库的 Actions 页面
2. 点击左侧的 "Build and Release"
3. 点击右侧的 "Run workflow" 按钮
4. 选择分支（通常是 main）
5. 点击绿色的 "Run workflow" 按钮

## ⚙️ 配置说明

打包配置文件位置：`.github/workflows/build.yml`

当前配置会同时打包：
- macOS (Intel x64) - 支持所有 Mac
- Windows (x64)
- Linux (AppImage + deb)

如果需要修改配置，可以编辑该文件。

## 📝 注意事项

1. **首次打包会比较慢**（10-15分钟），因为需要下载依赖
2. **Artifacts 保存 30 天**，之后会自动删除
3. **免费额度**：
   - Public 仓库：无限制
   - Private 仓库：每月 2000 分钟免费
4. 如果打包失败，查看 Actions 日志，通常会有明确的错误信息

## 🎉 完成

现在你可以：
1. 在任何电脑上修改代码
2. 推送到 GitHub
3. 让 GitHub 自动打包
4. 下载并分发给其他用户

不再受本地打包环境的限制！
