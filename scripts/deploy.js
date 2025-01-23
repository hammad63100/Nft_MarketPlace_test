async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const balance = await deployer.getBalance();
    console.log("Account balance:", balance.toString());

    const CreateCollection = await ethers.getContractFactory("CreateCollection");
    const contract1 = await CreateCollection.deploy();
    console.log("Contract address:", contract1.address);

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const contract2 = await NFTMarketplace.deploy(contract1.address); // Provide the required argument
    console.log("Contract address:", contract2.address);



}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });