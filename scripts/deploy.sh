#!/bin/bash

# 基金折溢价数据服务部署脚本

echo "🚀 开始部署基金折溢价数据服务..."

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  警告: 不建议以root用户运行此脚本"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 设置变量
PROJECT_NAME="fund-arbitrage-crawler"
SERVICE_USER="fund-crawler"
SERVICE_DIR="/opt/$PROJECT_NAME"
LOG_DIR="/var/log/$PROJECT_NAME"
SYSTEMD_SERVICE="$PROJECT_NAME.service"

# 检查系统
echo "🔍 检查系统环境..."
if ! command -v systemctl &> /dev/null; then
    echo "❌ 错误: 此脚本需要systemd支持"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js >= 18"
    exit 1
fi

echo "✅ 系统环境检查通过"

# 创建服务用户
echo "👤 创建服务用户..."
if ! id "$SERVICE_USER" &>/dev/null; then
    sudo useradd -r -s /bin/false -d "$SERVICE_DIR" "$SERVICE_USER"
    echo "✅ 服务用户创建成功: $SERVICE_USER"
else
    echo "✅ 服务用户已存在: $SERVICE_USER"
fi

# 创建目录
echo "📁 创建目录结构..."
sudo mkdir -p "$SERVICE_DIR"
sudo mkdir -p "$LOG_DIR"
sudo mkdir -p "$SERVICE_DIR/logs"

echo "✅ 目录创建成功"

# 复制项目文件
echo "📦 复制项目文件..."
sudo cp -r . "$SERVICE_DIR/"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVICE_DIR"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$LOG_DIR"

echo "✅ 项目文件复制完成"

# 安装依赖
echo "📦 安装项目依赖..."
cd "$SERVICE_DIR"
sudo -u "$SERVICE_USER" npm install --production

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 创建systemd服务文件
echo "⚙️  创建systemd服务..."
sudo tee "/etc/systemd/system/$SYSTEMD_SERVICE" > /dev/null <<EOF
[Unit]
Description=Fund Arbitrage Data Crawler Service
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$SERVICE_DIR
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$PROJECT_NAME

# 环境变量
Environment=NODE_ENV=production
EnvironmentFile=$SERVICE_DIR/.env

# 资源限制
LimitNOFILE=65536
MemoryMax=512M

[Install]
WantedBy=multi-user.target
EOF

echo "✅ systemd服务文件创建完成"

# 重新加载systemd
echo "🔄 重新加载systemd配置..."
sudo systemctl daemon-reload

# 启用服务
echo "🔧 启用服务..."
sudo systemctl enable "$SYSTEMD_SERVICE"

echo "✅ 服务已启用"

# 创建日志轮转配置
echo "📝 配置日志轮转..."
sudo tee "/etc/logrotate.d/$PROJECT_NAME" > /dev/null <<EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        systemctl reload $SYSTEMD_SERVICE
    endscript
}
EOF

echo "✅ 日志轮转配置完成"

# 显示部署信息
echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 服务信息:"
echo "  服务名称: $SYSTEMD_SERVICE"
echo "  安装目录: $SERVICE_DIR"
echo "  日志目录: $LOG_DIR"
echo "  服务用户: $SERVICE_USER"
echo ""
echo "🔧 管理命令:"
echo "  启动服务: sudo systemctl start $SYSTEMD_SERVICE"
echo "  停止服务: sudo systemctl stop $SYSTEMD_SERVICE"
echo "  重启服务: sudo systemctl restart $SYSTEMD_SERVICE"
echo "  查看状态: sudo systemctl status $SYSTEMD_SERVICE"
echo "  查看日志: sudo journalctl -u $SYSTEMD_SERVICE -f"
echo ""
echo "⚠️  注意事项:"
echo "  1. 请确保已配置.env文件中的数据库连接信息"
echo "  2. 请确保MySQL服务正在运行"
echo "  3. 首次启动前请运行: sudo systemctl start $SYSTEMD_SERVICE"
echo "  4. 检查服务状态: sudo systemctl status $SYSTEMD_SERVICE"
echo ""

# 询问是否立即启动服务
read -p "是否立即启动服务? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 启动服务..."
    sudo systemctl start "$SYSTEMD_SERVICE"
    sleep 3
    sudo systemctl status "$SYSTEMD_SERVICE" --no-pager
fi
