@echo off
echo 正在重命名国旗文件...

cd /d "images\Countries"

REM 根据截图标记重命名主要国家的国旗文件
copy "A (17).png" "AU.png" 2>nul && echo 澳大利亚 - 完成
copy "A (32).png" "BR.png" 2>nul && echo 巴西 - 完成  
copy "A (72).png" "CA.png" 2>nul && echo 加拿大 - 完成
copy "A (35).png" "CN.png" 2>nul && echo 中国 - 完成
copy "A (68).png" "FR.png" 2>nul && echo 法国 - 完成
copy "A (67).png" "DE.png" 2>nul && echo 德国 - 完成
copy "A (40).png" "IN.png" 2>nul && echo 印度 - 完成
copy "A (46).png" "IT.png" 2>nul && echo 意大利 - 完成
copy "A (48).png" "JP.png" 2>nul && echo 日本 - 完成
copy "A (71).png" "MX.png" 2>nul && echo 墨西哥 - 完成
copy "A (76).png" "NL.png" 2>nul && echo 荷兰 - 完成
copy "A (75).png" "NO.png" 2>nul && echo 挪威 - 完成
copy "A (74).png" "RU.png" 2>nul && echo 俄罗斯 - 完成
copy "A (38).png" "SG.png" 2>nul && echo 新加坡 - 完成
copy "A (73).png" "KR.png" 2>nul && echo 韩国 - 完成
copy "A (69).png" "ES.png" 2>nul && echo 西班牙 - 完成
copy "A (70).png" "SE.png" 2>nul && echo 瑞典 - 完成
copy "A (77).png" "CH.png" 2>nul && echo 瑞士 - 完成
copy "A (66).png" "UK.png" 2>nul && echo 英国 - 完成
copy "A (65).png" "US.png" 2>nul && echo 美国 - 完成

echo.
echo 所有国旗文件重命名完成！
pause
