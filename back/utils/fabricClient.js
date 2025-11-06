const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

/**
 * Connects to Fabric and returns a contract handle.
 * @param {string} [chaincodeName='documentrequest'] - The chaincode ID installed on the channel.
 * @param {string} [contractName] - Optional contract namespace/class name.
 * @returns {Promise<{gateway: import('fabric-network').Gateway, contract: import('fabric-network').Contract}>}
 */
async function getContract(chaincodeName = 'documentrequest', contractName) {
    const ccpPath = path.resolve(__dirname, '../fabric/connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.resolve(__dirname, '../wallet/wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser3',
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = contractName
        ? network.getContract(chaincodeName, contractName)
        : network.getContract(chaincodeName);
    return { gateway, contract };
}

module.exports = { getContract };
