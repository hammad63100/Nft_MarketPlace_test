// Import necessary libraries
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");

describe("CreateCollection Contract", function () {
    let CreateCollection;
    let createCollection;
    let owner, addr1, addr2;

    beforeEach(async function () {
        CreateCollection = await ethers.getContractFactory("CreateCollection");
        [owner, addr1, addr2] = await ethers.getSigners();
        createCollection = await CreateCollection.deploy();
        await createCollection.deployed();
    });

    describe("Deployment", function () {
        it("Should deploy the contract and set the initial token ID", async function () {
            const tokenId = await createCollection.getCurrentTokenId();
            expect(tokenId.toNumber()).to.equal(0);
        });
    });

    describe("Collections", function () {
        it("Should allow creating a new collection", async function () {
            await createCollection.createCollection("MyCollection", owner.address);
            const collection = await createCollection.getCollection(1);

            expect(collection.name).to.equal("MyCollection");
            expect(collection.owner).to.equal(owner.address);
            expect(collection.isActive).to.equal(true);
        });
    });

    describe("NFTs", function () {
        it("Should create an NFT and assign it to a collection", async function () {
            await createCollection.createCollection("MyCollection", owner.address);
            await createCollection.createNFT("MyNFT", 1, ethers.utils.parseEther("1"));

            const nft = await createCollection.getNFT(1);
            expect(nft.name).to.equal("MyNFT");
            expect(nft.collectionId).to.equal(1);
            expect(nft.owner).to.equal(owner.address);
        });
    });
});


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
            await createCollection.createCollection("MyCollection", owner.address);
            await createCollection.createNFT("MyNFT", 1, ethers.utils.parseEther("1"));

            await createCollection.approve(nftMarketplace.address, 1);
            await nftMarketplace.listNFTForSale(1, ethers.utils.parseEther("1.5"));

            const listing = await nftMarketplace.getNFTListing(1);
            expect(listing.price.toString()).to.equal(ethers.utils.parseEther("1.5").toString());
        });

        it("Should allow transferring an NFT through the marketplace", async function () {
            await createCollection.createCollection("MyCollection", owner.address);
            await createCollection.createNFT("MyNFT", 1, ethers.utils.parseEther("1"));

            await createCollection.approve(nftMarketplace.address, 1);
            await nftMarketplace.listNFTForSale(1, ethers.utils.parseEther("1.5"));

            await nftMarketplace.connect(addr1).buyNFT(1, { value: ethers.utils.parseEther("1.5") });

            const nft = await createCollection.getNFT(1);
            expect(nft.owner).to.equal(addr1.address);
        });
    });
});
