(async () => {
const chai = await import('chai');
const { expect } = chai;

const { ethers } = require("hardhat");
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");

describe("NFT_Marketplace Contract", function () {
    let CreateCollection, NFTMarketplace;
    let createCollection, nftMarketplace;
    let owner, addr1, addr2;

    beforeEach(async function () {
        CreateCollection = await ethers.getContractFactory("CreateCollection");
        NFTMarketplace = await ethers.getContractFactory("NFT_Marketplace");

        [owner, addr1, addr2] = await ethers.getSigners();

        createCollection = await CreateCollection.deploy();
        await createCollection.deployed();

        nftMarketplace = await NFTMarketplace.deploy(createCollection.address);
        await nftMarketplace.deployed();
    });

    describe("Integration", function () {
        it("Should create a collection and list an NFT for sale", async function () {
            // Create a new collection
            await createCollection.createCollection("MyCollection", owner.address);

            // Create an NFT under the collection
            await createCollection.createNFT("MyNFT", 1, ethers.utils.parseEther("1"));

            // Approve NFT for marketplace
            await createCollection.approve(nftMarketplace.address, 1);

            // List NFT for sale
            await nftMarketplace.listNFTForSale(1, ethers.utils.parseEther("1.5"));

            // Verify listing details
            const listing = await nftMarketplace.getNFTListing(1);
            expect(listing.price.toString()).to.equal(ethers.utils.parseEther("1.5").toString());
        });

        it("Should allow transferring an NFT through the marketplace", async function () {
            // Create a new collection
            await createCollection.createCollection("MyCollection", owner.address);

            // Create an NFT under the collection
            await createCollection.createNFT("MyNFT", 1, ethers.utils.parseEther("1"));

            // Approve NFT for marketplace
            await createCollection.approve(nftMarketplace.address, 1);

            // List NFT for sale
            await nftMarketplace.listNFTForSale(1, ethers.utils.parseEther("1.5"));

            // Buy NFT from the marketplace
            await nftMarketplace.connect(addr1).buyNFT(1, { value: ethers.utils.parseEther("1.5") });

            // Verify NFT ownership has transferred
            const nft = await createCollection.getNFT(1);
            expect(nft.owner).to.equal(addr1.address);
        });

        it("Should fail if buyer sends insufficient funds", async function () {
            // Create a new collection
            await createCollection.createCollection("MyCollection", owner.address);

            // Create an NFT under the collection
            await createCollection.createNFT("MyNFT", 1, ethers.utils.parseEther("1"));

            // Approve NFT for marketplace
            await createCollection.approve(nftMarketplace.address, 1);

            // List NFT for sale
            await nftMarketplace.listNFTForSale(1, ethers.utils.parseEther("1.5"));

            // Attempt to buy NFT with insufficient funds
            await expect(
                nftMarketplace.connect(addr1).buyNFT(1, { value: ethers.utils.parseEther("1.0") })
            ).to.be.revertedWith("Insufficient funds to buy NFT");
        });

        it("Should allow canceling an NFT listing", async function () {
            // Create a new collection
            await createCollection.createCollection("MyCollection", owner.address);

            // Create an NFT under the collection
            await createCollection.createNFT("MyNFT", 1, ethers.utils.parseEther("1"));

            // Approve NFT for marketplace
            await createCollection.approve(nftMarketplace.address, 1);

            // List NFT for sale
            await nftMarketplace.listNFTForSale(1, ethers.utils.parseEther("1.5"));

            // Cancel the NFT listing
            await nftMarketplace.cancelNFTListing(1);

            // Verify the NFT is no longer listed
            const listing = await nftMarketplace.getNFTListing(1);
            expect(listing.isActive).to.equal(false);
        });
    });
});
})();