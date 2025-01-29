const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreateCollection and NFTMarketplace Contracts", function () {
  let createCollection;
  let nftMarketplace;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const CreateCollection = await ethers.getContractFactory("CreateCollection");
    createCollection = await CreateCollection.deploy();
    await createCollection.deployed();

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    nftMarketplace = await NFTMarketplace.deploy(createCollection.address);
    await nftMarketplace.deployed();
  });

  describe("CreateCollection Contract", function () {
    it("Should create a new collection", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      expect(collectionId.length).to.equal(1);
    });

    it("Should mint an NFT in a collection", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      const mintTx = await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));
      await mintTx.wait();

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      expect(nfts.length).to.equal(1);
    });

    it("Should deactivate a collection", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      const deactivateTx = await createCollection.connect(addr1).deactivateCollection(collectionId[0]);
      await deactivateTx.wait();

      const collectionDetails = await createCollection.getCollectionDetailsById(collectionId[0]);
      expect(collectionDetails.isActive).to.be.false;
    });

    it("Should activate a deactivated collection", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).deactivateCollection(collectionId[0]);
      const activateTx = await createCollection.connect(addr1).activateCollection(collectionId[0]);
      await activateTx.wait();

      const collectionDetails = await createCollection.getCollectionDetailsById(collectionId[0]);
      expect(collectionDetails.isActive).to.be.true;
    });

    it("Should get NFTs by collection ID", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      expect(nfts.length).to.equal(1);
    });

    it("Should get collection details by ID", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      const collectionDetails = await createCollection.getCollectionDetailsById(collectionId[0]);

      expect(collectionDetails.name).to.equal("Collection1");
      expect(collectionDetails.owner).to.equal(addr1.address);
    });

    it("Should get user collections by address", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collections = await createCollection.getUserCollectionsByAddress(addr1.address);
      expect(collections.length).to.equal(1);
    });

    it("Should get NFT details", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      const nftDetails = await createCollection.getNFTDetails(nfts[0]);

      expect(nftDetails[0]).to.equal("NFT1");
      expect(nftDetails[2]).to.be.true;
    });

    it("Should transfer NFT to another address", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      await createCollection.connect(addr1).transferNFT(nfts[0], addr2.address);

      const nftDetails = await createCollection.getNFTDetails(nfts[0]);
      expect(nftDetails[1]).to.equal(addr2.address);
    });
  });

  describe("NFTMarketplace Contract", function () {
    it("Should create an auction for an NFT", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      
      // Set future end time (1 hour from now)
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 3600; // 1 hour from now

      const auctionTx = await nftMarketplace.connect(addr1).createAuction(
        nfts[0],
        ethers.utils.parseEther("0.1"),
        startTime,
        endTime
      );
      await auctionTx.wait();

      const auction = await nftMarketplace.auctions(nfts[0]);
      expect(auction.isActive).to.be.true;
    });

    it("Should place a bid on an auction", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      await nftMarketplace.connect(addr1).createAuction(
        nfts[0],
        ethers.utils.parseEther("0.1"),
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 3600
      );

      await expect(
        nftMarketplace.connect(addr2).placeBid(nfts[0], { value: ethers.utils.parseEther("0.2") })
      ).to.emit(nftMarketplace, "BidPlaced");
    });

    it("Should finalize an auction", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      await nftMarketplace.connect(addr1).createAuction(
        nfts[0],
        ethers.utils.parseEther("0.1"),
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 3600
      );

      await nftMarketplace.connect(addr2).placeBid(nfts[0], { value: ethers.utils.parseEther("0.2") });

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(nftMarketplace.connect(addr1).finalizeAuction(nfts[0])).to.emit(nftMarketplace, "AuctionFinalized");
    });

    it("Should cancel an auction", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();
    
      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));
    
      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      
      // Add buffer to ensure end time is definitely in the future
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 7200; // 2 hours from now instead of 1 hour
    
      await nftMarketplace.connect(addr1).createAuction(
        nfts[0],
        ethers.utils.parseEther("0.1"),
        startTime,
        endTime
      );
    
      await expect(nftMarketplace.connect(addr1).cancelAuction(nfts[0]))
        .to.emit(nftMarketplace, "AuctionCancelled");
    });

    it("Should list an NFT for sale", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      await expect(
        nftMarketplace.connect(addr1).sellNFT(nfts[0], ethers.utils.parseEther("0.2"))
      ).to.emit(nftMarketplace, "NFTListed");
    });

    it("Should cancel an NFT sale listing", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      await nftMarketplace.connect(addr1).sellNFT(nfts[0], ethers.utils.parseEther("0.2"));

      await expect(nftMarketplace.connect(addr1).cancelSell(nfts[0])).to.emit(nftMarketplace, "NFTSaleCancelled");
    });

    it("Should buy an NFT listed for sale", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      await nftMarketplace.connect(addr1).sellNFT(nfts[0], ethers.utils.parseEther("0.2"));

      await expect(
        nftMarketplace.connect(addr2).buyNFT(nfts[0], { value: ethers.utils.parseEther("0.2") })
      ).to.emit(nftMarketplace, "NFTSold");
    });

    it("Should check if an NFT is in auction", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();
    
      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));
    
      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      
      // Add buffer to ensure end time is definitely in the future
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 7200; // 2 hours from now
    
      await nftMarketplace.connect(addr1).createAuction(
        nfts[0],
        ethers.utils.parseEther("0.1"),
        startTime,
        endTime
      );
    
      const isInAuction = await nftMarketplace.nftInAuction(nfts[0]);
      expect(isInAuction).to.be.true;
    });

    it("Should check if an NFT is listed for sale", async function () {
      const tx = await createCollection.connect(addr1).createCollection("Collection1");
      await tx.wait();

      const collectionId = await createCollection.getUserCollectionsByAddress(addr1.address);
      await createCollection.connect(addr1).mintNFT(collectionId[0], "NFT1", ethers.utils.parseEther("0.1"));

      const nfts = await createCollection.getNFTsByCollection(collectionId[0]);
      await nftMarketplace.connect(addr1).sellNFT(nfts[0], ethers.utils.parseEther("0.2"));

      const isListedForSale = await nftMarketplace.listedForSale(nfts[0]);
      expect(isListedForSale).to.be.true;
    });

    it("Should get the current time", async function () {
      const currentTime = await nftMarketplace.getCurrentTime();
      expect(currentTime.toNumber()).to.be.a("number");
    });

    // it("Should convert uint to string", async function () {
    //   const number = 123;
    //   const result = await nftMarketplace.toString(number);
    //   // Convert BigNumber to string and then compare
    //   expect(ethers.utils.formatUnits(result, 0).replace('.0', '')).to.equal("123");
    // });
    });
});
