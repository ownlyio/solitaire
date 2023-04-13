const { ethers, upgrades } = require('hardhat');

async function main () {
    let testRun = false;
    let env = "local";
    env = "staging";

    const [deployer, address1, address2, address3, address4, address5] = await ethers.getSigners();

    console.log(deployer.address);

    if(testRun) {
        console.log(address1.address);
    }

    const Marketplace = await ethers.getContractFactory('Marketplace');

    // const marketplace = await upgrades.deployProxy(Marketplace, { kind: 'uups' });
    // await marketplace.deployed();
    // console.log('\nDeploying Marketplace...');

    const marketplace = await Marketplace.attach("0x6fCdeF3F1ee15109Aa91e7195834438264e91744");

    let implAddress = await upgrades.erc1967.getImplementationAddress(marketplace.address);
    console.log('Marketplace Implementation Address: ', implAddress);

    console.log('Marketplace deployed to: ', marketplace.address);
    console.log('Version: ', await marketplace.version());
    console.log('');

    // MarketplaceV2 Deployment
    console.log('Upgrading to MarketplaceV2...');
    const MarketplaceV2 = await ethers.getContractFactory('MarketplaceV2');
    const marketplacev2 = await upgrades.upgradeProxy(marketplace.address, MarketplaceV2);

    implAddress = await upgrades.erc1967.getImplementationAddress(marketplacev2.address);
    console.log('MarketplaceV2 Implementation Address: ', implAddress);

    console.log('MarketplaceV2 deployed to: ', marketplacev2.address);
    console.log('Version: ', await marketplacev2.version());

    // Initializations
    await marketplacev2.addressList(0, [], 0);
    console.log("\nmarketplacev2.addressList(0, [], 0)");

    let erc20Address;
    if(env === "staging") {
        erc20Address = "0xC3Df366fAf79c6Caff3C70948363f00b9Ac55FEE";
    } else {
        erc20Address = "0x7665CB7b0d01Df1c9f9B9cC66019F00aBD6959bA";
    }

    await marketplacev2.setOwnlyAddress(erc20Address);
    console.log("\nmarketplacev2.setOwnlyAddress(erc20Address)");
    // Initializations

    if(testRun) {
        const MyERC721Token = await hre.ethers.getContractFactory("MyERC721Token");
        let erc721 = await MyERC721Token.deploy();
        console.log("\nMyERC721Token deployed to:", erc721.address);

        const MyERC20Token = await hre.ethers.getContractFactory("OdoKo");
        let erc20 = await MyERC20Token.deploy(deployer.address);
        console.log("\nMyERC20Token deployed to:", erc20.address);

        if(env === "local") {
            await marketplacev2.setOwnlyAddress(erc20.address);
            console.log("\nmarketplacev2.setOwnlyAddress(erc20.address)");
        }

        await erc20.transfer(address1.address, "5000000000000000000000000");
        console.log("\nerc20.transfer(address1, 5000000000000000000000000)");

        await erc721.safeMint(deployer.address);
        console.log("\nerc721.safeMint(deployer.address)");

        let ownerOf = await erc721.ownerOf(0);
        console.log("\nerc721.ownerOf(0)");
        console.log(ownerOf);

        await erc721.setApprovalForAll(marketplacev2.address, true);
        console.log("\nerc721.setApprovalForAll(marketplacev2.address, true)");

        await marketplacev2.addressList(1, [], 20);
        console.log("\nmarketplacev2.addressList(0, [address1.address], 20)");

        await marketplacev2.setIdToAddressListIsOnlyAllowed(1, false);
        console.log("\nmarketplacev2.setIdToAddressListIsOnlyAllowed(1, false)");

        await marketplacev2.createMarketItemV2(erc721.address, 0, "5000000000000000000000000", "OWN", 20, 1);
        console.log("\nmarketplacev2.createMarketItemV2(erc721.address, 1, 5000000000000000000000000, OWN, 40, 1)");

        let marketItem = await marketplacev2.fetchMarketItemV2(erc721.address, 0);
        console.log("\nmarketplacev2.fetchMarketItemV2(erc721.address, 0)");
        console.log(marketItem.toString());

        await erc20.connect(address1).approve(marketplacev2.address, "4000000000000000000000000");
        console.log("\nerc20.connect(address1).approve(marketplacev2.address, 4000000000000000000000000)");

        await marketplacev2.connect(address1).createMarketSaleV2(1, "OWN");
        console.log("\nmarketplacev2.connect(address1).createMarketSaleV2");

        let balanceOf = await erc20.balanceOf(address1.address);
        console.log("\nerc20.balanceOf(address1.address)");
        console.log(balanceOf.toString());

        ownerOf = await erc721.ownerOf(0);
        console.log("\nerc721.ownerOf(0)");
        console.log(ownerOf);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });