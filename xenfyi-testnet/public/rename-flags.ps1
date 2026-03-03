# PowerShell 脚本 - 根据截图标记重命名国旗文件
Write-Host "正在重命名国旗文件..." -ForegroundColor Green

$sourceDir = "images\Countries"
if (Test-Path $sourceDir) {
    Set-Location $sourceDir
} else {
    Write-Host "错误: 找不到目录 $sourceDir" -ForegroundColor Red
    exit
}

# 国旗文件映射 (基于用户提供的截图顺序)
$flagMappings = @{
    "A (17).png" = "AU.png"  # 澳大利亚 - 蓝底米字旗带南十字星
    "A (32).png" = "BR.png"  # 巴西 - 绿底黄菱形蓝球  
    "A (72).png" = "CA.png"  # 加拿大 - 红白红带枫叶
    "A (35).png" = "CN.png"  # 中国 - 红底五星
    "A (68).png" = "FR.png"  # 法国 - 蓝白红三色
    "A (67).png" = "DE.png"  # 德国 - 黑红黄三色
    "A (40).png" = "IN.png"  # 印度 - 橙白绿带轮子
    "A (46).png" = "IT.png"  # 意大利 - 绿白红三色
    "A (48).png" = "JP.png"  # 日本 - 白底红圆
    "A (71).png" = "MX.png"  # 墨西哥 - 绿白红带鹰徽
    "A (76).png" = "NL.png"  # 荷兰 - 红白蓝三色
    "A (75).png" = "NO.png"  # 挪威 - 红白蓝十字
    "A (74).png" = "RU.png"  # 俄罗斯 - 白蓝红三色
    "A (38).png" = "SG.png"  # 新加坡 - 红白带月亮星星
    "A (73).png" = "KR.png"  # 韩国 - 白底太极八卦
    "A (69).png" = "ES.png"  # 西班牙 - 红黄红带盾徽
    "A (70).png" = "SE.png"  # 瑞典 - 蓝底黄十字
    "A (77).png" = "CH.png"  # 瑞士 - 红底白十字
    "A (66).png" = "UK.png"  # 英国 - 米字旗
    "A (65).png" = "US.png"  # 美国 - 星条旗
}

$successCount = 0
$totalCount = $flagMappings.Count

foreach ($mapping in $flagMappings.GetEnumerator()) {
    $source = $mapping.Key
    $target = $mapping.Value
    
    if (Test-Path $source) {
        try {
            Copy-Item $source $target -Force
            $countryName = switch ($target) {
                "AU.png" { "澳大利亚" }
                "BR.png" { "巴西" }
                "CA.png" { "加拿大" }
                "CN.png" { "中国" }
                "FR.png" { "法国" }
                "DE.png" { "德国" }
                "IN.png" { "印度" }
                "IT.png" { "意大利" }
                "JP.png" { "日本" }
                "MX.png" { "墨西哥" }
                "NL.png" { "荷兰" }
                "NO.png" { "挪威" }
                "RU.png" { "俄罗斯" }
                "SG.png" { "新加坡" }
                "KR.png" { "韩国" }
                "ES.png" { "西班牙" }
                "SE.png" { "瑞典" }
                "CH.png" { "瑞士" }
                "UK.png" { "英国" }
                "US.png" { "美国" }
                default { $target }
            }
            Write-Host "✅ $countryName - 完成" -ForegroundColor Cyan
            $successCount++
        }
        catch {
            Write-Host "❌ 复制 $source 到 $target 失败: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⚠️  文件不存在: $source" -ForegroundColor Yellow
    }
}

Write-Host "`n🎉 完成! $successCount/$totalCount 个国旗文件已成功重命名" -ForegroundColor Green

# 更新代码中的路径映射
Write-Host "`n📝 代码已更新使用以下路径:" -ForegroundColor Magenta
$flagMappings.GetEnumerator() | Sort-Object Value | ForEach-Object {
    Write-Host "  $($_.Value) <- $($_.Key)" -ForegroundColor Gray
}

Write-Host "`n按任意键退出..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
