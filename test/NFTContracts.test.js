const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreateCollection Contract", function () {
  let createCollection;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Deploy the contract
    const CreateCollection = await ethers.getContractFactory("CreateCollection");
    createCollection = await CreateCollection.deploy();
    await createCollection.deployed();

    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();
  });

  describe("Collection Creation", function () {
    it("Should create a collection successfully", async function () {
      const collectionName = "My First Collection";
      const tx = await createCollection.createCollection(collectionName);
      const receipt = await tx.wait();

      // Extract the collectionId from the event
      const event = receipt.events.find(e => e.event === "CollectionCreated");
      const collectionId = event.args.collectionId;

      // Get collection details
      const collection = await createCollection.getCollectionDetailsById(collectionId);

      expect(collection.name).to.equal(collectionName);
      expect(collection.owner).to.equal(owner.address);
      expect(collection.isActive).to.be.true;
    });

    it("Should prevent creating a collection with an empty name", async function () {
      await expect(createCollection.createCollection(""))
        .to.be.revertedWith("Collection name cannot be empty");
    });
  });

  describe("NFT Minting", function () {
    let collectionId;

    beforeEach(async function () {
      // Create a collection first
      const tx = await createCollection.createCollection("Test Collection");
      const receipt = await tx.wait();
      collectionId = receipt.events.find(e => e.event === "CollectionCreated").args.collectionId;
    });

    it("Should mint an NFT successfully", async function () {
      const nftName = "My First NFT";
      const price = ethers.utils.parseEther("0.1");
    
      const tx = await createCollection.mintNFT(collectionId, nftName, price);
      const receipt = await tx.wait();
    
      const event = receipt.events.find(e => e.event === "NFTMinted");
      const tokenId = event.args.tokenId;
    
      const [name, nftOwner, exists, nftPrice] = await createCollection.getNFTDetails(tokenId);
    
      expect(nftOwner).to.equal(owner.address); // Corrected to use nftOwner instead of owner
    });

    it("Should prevent minting NFT in inactive collection", async function () {
      // Deactivate the collection
      await createCollection.deactivateCollection(collectionId);

      await expect(
        createCollection.mintNFT(collectionId, "Test NFT", ethers.utils.parseEther("0.1"))
      ).to.be.revertedWith("Collection is not active");
    });

    it("Should prevent minting NFT in a collection not owned by sender", async function () {
      await expect(
        createCollection.connect(addr1).mintNFT(collectionId, "Test NFT", ethers.utils.parseEther("0.1"))
      ).to.be.revertedWith("You don't own this collection");
    });
  });

  describe("Collection Management", function () {
    let collectionId;

    beforeEach(async function () {
      // Create a collection first
      const tx = await createCollection.createCollection("Test Collection");
      const receipt = await tx.wait();
      collectionId = receipt.events.find(e => e.event === "CollectionCreated").args.collectionId;
    });

    it("Should deactivate a collection", async function () {
      await createCollection.deactivateCollection(collectionId);

      const collection = await createCollection.getCollectionDetailsById(collectionId);
      expect(collection.isActive).to.be.false;
    });

    it("Should activate a deactivated collection", async function () {
      // First deactivate
      await createCollection.deactivateCollection(collectionId);

      // Then activate
      await createCollection.activateCollection(collectionId);

      const collection = await createCollection.getCollectionDetailsById(collectionId);
      expect(collection.isActive).to.be.true;
    });

    it("Should prevent deactivating a collection by non-owner", async function () {
      await expect(
        createCollection.connect(addr1).deactivateCollection(collectionId)
      ).to.be.revertedWith("You don't own this collection");
    });
  });

  describe("NFT Transfer", function () {
    let collectionId;
    let tokenId;

    beforeEach(async function () {
      // Create a collection and mint an NFT
      const collectionTx = await createCollection.createCollection("Test Collection");
      const collectionReceipt = await collectionTx.wait();
      collectionId = collectionReceipt.events.find(e => e.event === "CollectionCreated").args.collectionId;

      const nftTx = await createCollection.mintNFT(collectionId, "Test NFT", ethers.utils.parseEther("0.1"));
      const nftReceipt = await nftTx.wait();
      tokenId = nftReceipt.events.find(e => e.event === "NFTMinted").args.tokenId;
    });

    it("Should transfer NFT to another address", async function () {
      await createCollection.transferNFT(tokenId, addr1.address);

      const [, owner] = await createCollection.getNFTDetails(tokenId);
      expect(owner).to.equal(addr1.address);
    });
  });
});

describe("NFTMarketplace Contract", function () {
  let createCollection;
  let nftMarketplace;
  let owner;
  let seller;
  let buyer;
  let tokenId;
  let collectionId;

  beforeEach(async function () {
    // Deploy CreateCollection contract
    const CreateCollection = await ethers.getContractFactory("CreateCollection");
    createCollection = await CreateCollection.deploy();
    await createCollection.deployed();

    // Deploy NFTMarketplace contract
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    nftMarketplace = await NFTMarketplace.deploy(createCollection.address);
    await nftMarketplace.deployed();

    // Get signers
    [owner, seller, buyer] = await ethers.getSigners();

    // Create a collection and mint an NFT
    const collectionTx = await createCollection.connect(seller).createCollection("Test Collection");
    const collectionReceipt = await collectionTx.wait();
    collectionId = collectionReceipt.events.find(e => e.event === "CollectionCreated").args.collectionId;

    const nftTx = await createCollection.connect(seller).mintNFT(
      collectionId,
      "Test NFT",
      ethers.utils.parseEther("0.1")
    );
    const nftReceipt = await nftTx.wait();
    tokenId = nftReceipt.events.find(e => e.event === "NFTMinted").args.tokenId;
  });

  describe("Auction Functionality", function () {
    it("Should create an auction successfully", async function () {
      // Get the mint price of the NFT
      const [, , , mintPrice] = await createCollection.getNFTDetails(tokenId);

      // Use a starting price slightly higher than the mint price
      const startingPrice = mintPrice.add(ethers.utils.parseEther("0.01"));
      const currentTime = await nftMarketplace.getCurrentTime();

      const endTime = currentTime.add(3600);

      const tx = await nftMarketplace.connect(seller).createAuction(
        tokenId,
        startingPrice,
        currentTime,
        endTime
      );

      const receipt = await tx.wait();

      // Find the AuctionCreated event
      const event = receipt.events.find(e => e.event === "AuctionCreated");

      // Perform a more flexible comparison
      expect(event.args.nftId).to.equal(tokenId);
      expect(event.args.startingPrice).to.equal(startingPrice);
      expect(event.args.endTime).to.equal(endTime);
      expect(event.args.seller).to.equal(seller.address);
    });

    it("Should prevent creating auction with price below minimum", async function () {
      const lowPrice = ethers.utils.parseEther("0.02");
      const currentTime = await nftMarketplace.getCurrentTime();

      await expect(
        nftMarketplace.connect(seller).createAuction(
          tokenId,
          lowPrice,
          currentTime,
          currentTime.add(3600)
        )
      ).to.be.revertedWith("Starting price must be at least 0.03 ETH");
    });

    it("Should place a bid successfully", async function () {
      // Get the mint price of the NFT
      const [, , , mintPrice] = await createCollection.getNFTDetails(tokenId);

      // Use a starting price slightly higher than the mint price
      const startingPrice = mintPrice.add(ethers.utils.parseEther("0.01"));
      const currentTime = await nftMarketplace.getCurrentTime();

      // Create auction
      await nftMarketplace.connect(seller).createAuction(
        tokenId,
        startingPrice,
        currentTime,
        currentTime.add(3600)
      );

      // Place bid
      const bidAmount = startingPrice.add(ethers.utils.parseEther("0.01"));
      await expect(
        nftMarketplace.connect(buyer).placeBid(tokenId, { value: bidAmount })
      ).to.emit(nftMarketplace, "BidPlaced")
        .withArgs(tokenId, buyer.address, bidAmount);
    });

    it("Should finalize auction and transfer NFT", async function () {
      // Get the mint price of the NFT
      const [, , , mintPrice] = await createCollection.getNFTDetails(tokenId);

      // Use a starting price slightly higher than the mint price
      const startingPrice = mintPrice.add(ethers.utils.parseEther("0.01"));
      const currentTime = await nftMarketplace.getCurrentTime();

      // Create auction
      await nftMarketplace.connect(seller).createAuction(
        tokenId,
        startingPrice,
        currentTime,
        currentTime.add(3600)
      );

      // Place bid
      const bidAmount = startingPrice.add(ethers.utils.parseEther("0.01"));
      await nftMarketplace.connect(buyer).placeBid(tokenId, { value: bidAmount });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");

      // Finalize auction
      await expect(
        nftMarketplace.finalizeAuction(tokenId)
      ).to.emit(nftMarketplace, "AuctionFinalized")
        .withArgs(tokenId, buyer.address, bidAmount);
    });
  });

  describe("Direct Sale Functionality", function () {
    it("Should list NFT for sale", async function () {
      const salePrice = ethers.utils.parseEther("0.1");

      await expect(
        nftMarketplace.connect(seller).sellNFT(tokenId, salePrice)
      ).to.emit(nftMarketplace, "NFTListed")
        .withArgs(0, tokenId, salePrice);
    });

    it("Should buy NFT directly", async function () {
      const salePrice = ethers.utils.parseEther("0.1");

      // List NFT for sale
      await nftMarketplace.connect(seller).sellNFT(tokenId, salePrice);

      // Buy NFT
      await expect(
        nftMarketplace.connect(buyer).buyNFT(tokenId, { value: salePrice })
      ).to.emit(nftMarketplace, "NFTSold")
        .withArgs(tokenId, seller.address, buyer.address, salePrice);
    });

    it("Should prevent buying own NFT", async function () {
      const salePrice = ethers.utils.parseEther("0.1");

      // List NFT for sale
      await nftMarketplace.connect(seller).sellNFT(tokenId, salePrice);

      // Try to buy own NFT
      await expect(
        nftMarketplace.connect(seller).buyNFT(tokenId, { value: salePrice })
      ).to.be.revertedWith("Cannot buy your own NFT");
    });
  });
});