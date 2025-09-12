# 设置UTF-8编码，避免中文显示乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'

# 开启错误显示，防止脚本闪退
$ErrorActionPreference = "Stop"

# 标题和版本信息
$scriptVersion = "1.0.1"
$scriptTitle = "==== 正在启动 v$scriptVersion ===="

# 显示标题
Write-Host $scriptTitle -ForegroundColor Green
Write-Host "正在初始化环境..." -ForegroundColor Gray

# 处理PowerShell执行策略检查
try {
    # 获取当前执行策略
    $policy = Get-ExecutionPolicy -Scope Process
    Write-Host "当前PowerShell执行策略: $policy" -ForegroundColor Gray
    
    # 如果执行策略过于严格，提供修改建议
    if ($policy -eq "Restricted" -or $policy -eq "AllSigned") {
        Write-Host "注意: 您当前的PowerShell执行策略较为严格，可能影响脚本运行。" -ForegroundColor Yellow
        Write-Host "如遇问题，可尝试在管理员PowerShell中执行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    }
} catch {
    Write-Host "无法检查PowerShell执行策略，但这不会影响启动操作。" -ForegroundColor Yellow
}

# 创建错误处理函数，避免闪退
function Handle-Error {
    param([string]$errorMessage)
    Write-Host "`n发生错误: $errorMessage" -ForegroundColor Red
    Write-Host "`n请按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# 确保当前目录正确（如果从其他目录运行脚本）
try {
    # 获取脚本所在目录
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    # 切换到脚本所在目录
    Set-Location $scriptPath
    Write-Host "工作目录: $scriptPath" -ForegroundColor Gray
} catch {
    Handle-Error "无法设置正确的工作目录: $_"
}

# 确保Docker Desktop正在运行
try {
    Write-Host "检查Docker服务状态..." -ForegroundColor Gray
    docker info | Out-Null
    Write-Host "Docker运行正常..." -ForegroundColor Green
} catch {
    Handle-Error "Docker未运行，请先启动Docker Desktop后再次运行此脚本。"
}


# 停止并删除当前正在运行的容器
try {
    Write-Host "`n正在停止并删除现有容器..." -ForegroundColor Yellow
    docker compose down
    if ($LASTEXITCODE -ne 0) {
        Write-Host "注意: 停止容器可能出现问题，但将继续尝试启动" -ForegroundColor Yellow
    }
} catch {
    Write-Host "停止容器时出现警告: $_" -ForegroundColor Yellow
    Write-Host "这可能是因为没有运行中的容器，将继续尝试启动" -ForegroundColor Yellow
}

# 删除相关的旧镜像
try {
    Write-Host "正在查找旧镜像..." -ForegroundColor Yellow
    $images = docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | Select-String -Pattern "linstar666/fresh-shop"

    if ($images) {
        Write-Host "发现以下旧镜像，将被删除:" -ForegroundColor Yellow
        foreach ($image in $images) {
            Write-Host $image -ForegroundColor Gray
        }

        # 使用prune命令，删除未使用的镜像
        Write-Host "正在删除旧镜像..." -ForegroundColor Yellow
        try {
            docker image rm -f $(docker images --format "{{.ID}}" --filter=reference="linstar666/fresh-shop*")
            if ($LASTEXITCODE -ne 0) {
                Write-Host "删除旧镜像时遇到问题，但将继续启动" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "删除镜像时出现警告: $_" -ForegroundColor Yellow
            Write-Host "这可能是因为镜像正在使用中，将继续启动" -ForegroundColor Yellow
        }
    } else {
        Write-Host "未发现旧镜像" -ForegroundColor Green
    }
} catch {
    Write-Host "查找旧镜像时出现警告: $_" -ForegroundColor Yellow
    Write-Host "将继续尝试启动" -ForegroundColor Yellow
}

# 拉取最新镜像并启动容器
try {
    Write-Host "`n正在拉取最新镜像并启动..." -ForegroundColor Yellow
    docker compose up -d
    if ($LASTEXITCODE -ne 0) {
        Handle-Error "启动容器失败，错误码: $LASTEXITCODE"
    }
} catch {
    Handle-Error "启动容器过程中出错: $_"
}

# 检查容器是否正常运行
try {
    Write-Host "等待容器启动..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    $containerStatus = docker ps --format "{{.Names}} - {{.Status}}" | Select-String -Pattern "fresh-shop"

    if ($containerStatus) {
        Write-Host "`n已成功启动！" -ForegroundColor Green
        Write-Host "容器状态: $containerStatus" -ForegroundColor Green
        Write-Host "系统访问地址: http://localhost:3000" -ForegroundColor Cyan
    } else {
        Write-Host "`n警告: 容器可能未正常启动，请检查日志:" -ForegroundColor Red
        docker compose logs
    }
} catch {
    Write-Host "`n警告: 无法检查容器状态: $_" -ForegroundColor Red
    Write-Host "请手动运行 'docker compose logs' 查看详情。" -ForegroundColor Yellow
}

Write-Host "`n==== 操作完成 ====" -ForegroundColor Green
Write-Host "按任意键继续..." -ForegroundColor Gray
try {
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} catch {
    Write-Host "脚本执行完毕，窗口将在10秒后关闭..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
} 