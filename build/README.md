# 构建资源目录

## 图标文件

为了完整打包，您需要在此目录下放置以下图标文件：

### macOS
- `icon.icns` - macOS 应用图标
  - 推荐尺寸：512x512px 或 1024x1024px
  - 格式：ICNS（可以使用在线工具将 PNG 转换为 ICNS）
  - 工具推荐：https://cloudconvert.com/png-to-icns

### Windows
- `icon.ico` - Windows 应用图标
  - 推荐尺寸：256x256px
  - 格式：ICO（包含多个尺寸：16, 32, 48, 64, 128, 256）
  - 工具推荐：https://cloudconvert.com/png-to-ico

### Linux
- `icon.png` - Linux 应用图标
  - 推荐尺寸：512x512px
  - 格式：PNG

## 临时方案

如果暂时没有图标，可以：
1. 使用系统默认图标（删除配置中的 icon 字段）
2. 使用占位符图标（纯色或简单图形）
3. 稍后再添加专业图标

## 已包含的文件

- `entitlements.mac.plist` - macOS 权限配置文件（已自动生成）
