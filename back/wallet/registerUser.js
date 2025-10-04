'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        // Load connection profile
        const ccpPath = path.resolve(
            __dirname,
            '../../test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'
        );
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if user already exists
        const userIdentity = await wallet.get('appUser1');
        if (userIdentity) {
            console.log('✅ User "appUser1" already exists in the wallet');
            return;
        }

        // Check for admin
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('⚠️ Run enrollAdmin.js first');
            return;
        }

        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // 👉 Proper way: register the user (CA generates secret)
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser1',
            role: 'client'
        }, adminUser);

        // 👉 Then enroll with that generated secret
        const enrollment = await ca.enroll({
            enrollmentID: 'appUser1',
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('appUser1', x509Identity);
        console.log('✅ Successfully registered and enrolled "appUser1" and imported it into the wallet');

    } catch (error) {
        console.error(`❌ Failed to register/enroll user: ${error}`);
        process.exit(1);
    }
}

main();
