const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function getContract() {
    const ccpPath = path.resolve(
  '/home/akry/hyperledger-fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'
);
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.resolve(
  __dirname,
  '/home/akry/hyperledger-fabric/fabric-samples/asset-transfer-basic/application-javascript/wallet'
);
const wallet = await Wallets.newFileSystemWallet(walletPath);


    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: 'appUser1',
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork('mychannel');
    return network.getContract('documentrequest');
}

module.exports = { getContract };
