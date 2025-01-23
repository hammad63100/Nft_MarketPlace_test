describe("NFTMarketplace Contract", function () {
  it("Should create an auction successfully", async function () {
    const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const endTime = startTime + 3600; // 1 hour duration
    await nftMarketplace.createAuction(tokenId, startTime, endTime, startPrice);
    // ...existing code...
  });

  it("Should place a bid successfully", async function () {
    const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const endTime = startTime + 3600; // 1 hour duration
    await nftMarketplace.createAuction(tokenId, startTime, endTime, startPrice);
    // ...existing code...
  });

  it("Should finalize auction and transfer NFT", async function () {
    const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const endTime = startTime + 3600; // 1 hour duration
    await nftMarketplace.createAuction(tokenId, startTime, endTime, startPrice);
    // ...existing code...
  });
});
