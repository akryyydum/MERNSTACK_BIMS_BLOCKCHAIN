const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function connectToNetwork() {
    try {
        const ccpPath = path.resolve(__dirname, 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'appUser',   // must be enrolled first
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('barangaycc');

        return { gateway, contract };
    } catch (error) {
        console.error(`Error in connectToNetwork: ${error}`);
        throw error;
    }
}

module.exports = { connectToNetwork };
