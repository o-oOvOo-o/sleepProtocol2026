// 测试前端合约配置的脚本
const fs = require('fs');
const path = require('path');

// 颜色输出函数
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 读取部署信息
function readDeploymentInfo() {
    try {
        const deploymentPath = path.join(__dirname, 'deployment-info.json');
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        return deploymentData;
    } catch (error) {
        log('red', `❌ 无法读取部署信息: ${error.message}`);
        return null;
    }
}

// 读取前端合约配置
function readFrontendContracts() {
    try {
        const contractsPath = path.join(__dirname, 'xenfyi-testnet/src/lib/contracts.ts');
        const contractsContent = fs.readFileSync(contractsPath, 'utf8');
        return contractsContent;
    } catch (error) {
        log('red', `❌ 无法读取前端合约配置: ${error.message}`);
        return null;
    }
}

// 检查 ABI 文件
function checkABIFiles() {
    const abiDir = path.join(__dirname, 'xenfyi-testnet/src/abi');
    const requiredABIs = [
        'TokenCore.json',
        'TokenMinter.json', 
        'TokenStaking.json',
        'TokenAccessPass.json',
        'TokenTreasury.json',
        'NftMarketplace.json'
    ];
    
    const results = {};
    
    requiredABIs.forEach(abiFile => {
        const abiPath = path.join(abiDir, abiFile);
        results[abiFile] = {
            exists: fs.existsSync(abiPath),
            path: abiPath
        };
        
        if (results[abiFile].exists) {
            try {
                const abiContent = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
                results[abiFile].hasABI = abiContent.abi && Array.isArray(abiContent.abi);
                results[abiFile].abiLength = abiContent.abi ? abiContent.abi.length : 0;
            } catch (error) {
                results[abiFile].hasABI = false;
                results[abiFile].error = error.message;
            }
        }
    });
    
    return results;
}

// 提取合约地址
function extractContractAddresses(contractsContent) {
    const addresses = {};
    
    // 正则表达式匹配地址定义
    const addressRegex = /const\s+(\w+Address)\s*=\s*'(0x[a-fA-F0-9]{40})'/g;
    let match;
    
    while ((match = addressRegex.exec(contractsContent)) !== null) {
        const [, varName, address] = match;
        addresses[varName] = address;
    }
    
    return addresses;
}

// 主测试函数
function runTests() {
    log('blue', '🔍 前端合约配置验证');
    console.log('');
    
    // 1. 检查部署信息
    log('yellow', '📋 步骤 1: 检查合约部署信息...');
    const deploymentInfo = readDeploymentInfo();
    
    if (!deploymentInfo) {
        log('red', '❌ 无法继续测试，缺少部署信息');
        return;
    }
    
    log('green', '✅ 部署信息读取成功');
    Object.entries(deploymentInfo).forEach(([contract, info]) => {
        console.log(`   📍 ${contract}: ${info.address} (区块 ${info.blockNumber})`);
    });
    
    console.log('');
    
    // 2. 检查前端合约配置
    log('yellow', '📋 步骤 2: 检查前端合约配置...');
    const contractsContent = readFrontendContracts();
    
    if (!contractsContent) {
        log('red', '❌ 无法读取前端合约配置');
        return;
    }
    
    const frontendAddresses = extractContractAddresses(contractsContent);
    log('green', '✅ 前端合约配置读取成功');
    
    // 3. 对比地址
    log('yellow', '📋 步骤 3: 对比合约地址...');
    const addressMapping = {
        'tokenCoreAddress': 'TokenCore',
        'tokenMinterAddress': 'TokenMinter',
        'tokenStakingAddress': 'TokenStaking',
        'tokenTreasuryAddress': 'TokenTreasury',
        'tokenAccessPassAddress': 'TokenAccessPass',
        'minterMarketplaceAddress': 'MinterMarketplace',
        'accessPassMarketplaceAddress': 'AccessPassMarketplace'
    };
    
    let addressMatches = 0;
    let totalAddresses = 0;
    
    Object.entries(addressMapping).forEach(([frontendVar, deploymentKey]) => {
        totalAddresses++;
        const frontendAddr = frontendAddresses[frontendVar];
        const deployedAddr = deploymentInfo[deploymentKey]?.address;
        
        if (frontendAddr && deployedAddr) {
            const matches = frontendAddr.toLowerCase() === deployedAddr.toLowerCase();
            if (matches) addressMatches++;
            
            log(matches ? 'green' : 'red', 
                `   ${matches ? '✅' : '❌'} ${deploymentKey}:`);
            console.log(`      前端: ${frontendAddr || '未找到'}`);
            console.log(`      部署: ${deployedAddr || '未找到'}`);
        } else {
            log('yellow', `   ⚠️  ${deploymentKey}: 缺少地址信息`);
            console.log(`      前端: ${frontendAddr || '未找到'}`);
            console.log(`      部署: ${deployedAddr || '未找到'}`);
        }
    });
    
    console.log('');
    
    // 4. 检查 ABI 文件
    log('yellow', '📋 步骤 4: 检查 ABI 文件...');
    const abiResults = checkABIFiles();
    
    let abiSuccess = 0;
    let totalABIs = Object.keys(abiResults).length;
    
    Object.entries(abiResults).forEach(([fileName, result]) => {
        if (result.exists && result.hasABI) {
            abiSuccess++;
            log('green', `   ✅ ${fileName}: ${result.abiLength} 个函数/事件`);
        } else if (result.exists && !result.hasABI) {
            log('red', `   ❌ ${fileName}: 文件存在但 ABI 格式错误`);
            if (result.error) {
                console.log(`      错误: ${result.error}`);
            }
        } else {
            log('red', `   ❌ ${fileName}: 文件不存在`);
        }
    });
    
    console.log('');
    
    // 5. 总结
    log('blue', '📊 测试总结:');
    log(addressMatches === totalAddresses ? 'green' : 'yellow', 
        `   合约地址匹配: ${addressMatches}/${totalAddresses}`);
    log(abiSuccess === totalABIs ? 'green' : 'yellow', 
        `   ABI 文件完整: ${abiSuccess}/${totalABIs}`);
    
    const overallSuccess = (addressMatches === totalAddresses) && (abiSuccess === totalABIs);
    
    if (overallSuccess) {
        log('green', '🎉 前端合约配置完全正确！');
    } else {
        log('yellow', '⚠️  前端合约配置需要调整');
        
        console.log('');
        log('blue', '💡 建议修复步骤:');
        
        if (addressMatches < totalAddresses) {
            console.log('   1. 更新 xenfyi-testnet/src/lib/contracts.ts 中的合约地址');
        }
        
        if (abiSuccess < totalABIs) {
            console.log('   2. 确保所有 ABI 文件都已正确复制到 xenfyi-testnet/src/abi/');
        }
    }
    
    console.log('');
    log('blue', '🔗 相关文件:');
    console.log('   - 部署信息: deployment-info.json');
    console.log('   - 前端配置: xenfyi-testnet/src/lib/contracts.ts');
    console.log('   - ABI 目录: xenfyi-testnet/src/abi/');
}

// 运行测试
runTests();
