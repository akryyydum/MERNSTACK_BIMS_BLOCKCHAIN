const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function getContract() {
    const ccpPath = path.resolve(__dirname, '../fabric/connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.resolve(__dirname, '../wallet/wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser1',
        discovery: { enabled: false, asLocalhost: false }
    });

    const network = await gateway.getNetwork('mychannel');
    return network.getContract('documentrequest');
}

module.exports = { getContract };
