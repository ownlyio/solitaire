const { ethers, upgrades } = require('hardhat');

async function main () {
    let production = true;
    let testRun = false;

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const Solitaire = await ethers.getContractFactory('Solitaire');

    console.log('Deploying Solitaire...');

    const solitaire = await upgrades.deployProxy(Solitaire, { kind: 'uups' });
    await solitaire.deployed();

    const implHex = await ethers.provider.getStorageAt(
        solitaire.address,
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    );
    const implAddress = ethers.utils.hexStripZeros(implHex);
    console.log('Implementation Address: ', implAddress);

    console.log('Solitaire deployed to: ', solitaire.address);
    console.log('Version: ', await solitaire.version());

    if(testRun) {
        console.log("solitaire.setValidator()");
        await solitaire.setValidator(deployer.address);
    }

    if(production) {
        console.log("solitaire.setValidator()");
        await solitaire.setValidator("0xceE523717E912c17B21100bb041ae46689acEbaE");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });