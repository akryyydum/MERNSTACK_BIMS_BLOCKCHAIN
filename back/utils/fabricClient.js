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
        identity: 'appUser2',
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('documentrequest');
    return { gateway, contract };
}


module.exports = { getContract };
