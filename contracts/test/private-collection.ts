import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber as BN, Signer } from "ethers";
// eslint-disable-next-line camelcase,node/no-missing-import
import {
  CollectionsAccessToken,
  // eslint-disable-next-line camelcase
  CollectionsAccessToken__factory,
  InstaToken,
  // eslint-disable-next-line camelcase
  InstaToken__factory,
  PrivateCollection,
  // eslint-disable-next-line camelcase
  PrivateCollection__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";

const genRanHex = (size: number) =>
  [...Array(size)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");

describe("Private collection", async () => {
  let accounts: Signer[];
  let accessTokenInstance: CollectionsAccessToken;
  let instaToken: InstaToken;
  let boughtCollection: PrivateCollection;

  before(async () => {
    accounts = await ethers.getSigners();

    const collectionFactory = new PrivateCollection__factory(accounts[0]);
    const privateCollection = await collectionFactory.deploy();

    const instaTokenFactory = new InstaToken__factory(accounts[0]);
    instaToken = await instaTokenFactory.deploy(
      BN.from(10000),
      BN.from(3000),
      BN.from(3000),
      BN.from(4000),
      await accounts[1].getAddress(),
      await accounts[2].getAddress(),
      await accounts[3].getAddress()
    );

    const accessTokenFactory = new CollectionsAccessToken__factory(accounts[0]);
    accessTokenInstance = await accessTokenFactory.deploy(
      "test",
      "test",
      instaToken.address,
      privateCollection.address,
      BN.from(100)
    );
  });

  it("transfer should be successful", async () => {
    await instaToken
      .connect(accounts[1])
      .transfer(await accounts[4].getAddress(), BN.from(100));
  });

  it("self collections should be empty before purchase", async () => {
    const collections = await accessTokenInstance
      .connect(accounts[4])
      .getSelfCollections(BN.from(0), BN.from(10));
    expect(collections).deep.eq([[], []]);
  });

  it("buy should be successful", async () => {
    const salt = "0x" + genRanHex(64);
    const collectionFactory = new PrivateCollection__factory(accounts[0]);
    boughtCollection = collectionFactory.attach(
      await accessTokenInstance.predictDeterministicAddress(salt)
    );
    const purchaseTx = await accessTokenInstance
      .connect(accounts[4])
      .purchasePrivateCollection(salt, "tsst", "tost", "0xaa");
    expect(purchaseTx)
      .to.emit("ERC20", "Transfer")
      .withArgs(
        await accounts[4].getAddress(),
        "0x0000000000000000000000000000000000000000",
        BN.from(100)
      );
    expect(purchaseTx)
      .to.emit("PublicCollectionsRouter", "CollectionCreated")
      .withArgs(boughtCollection.address, BN.from(0));
  });

  it("self collections should be not empty after purchase", async () => {
    const collections = await accessTokenInstance
      .connect(accounts[4])
      .getSelfCollections(BN.from(0), BN.from(10));
    expect(collections).deep.eq([
      [[boughtCollection.address, "0xaa"]],
      [BN.from(0)],
    ]);
  });

  it("mint should be successful", async () => {
    await boughtCollection
      .connect(accounts[4])
      .mint(await accounts[4].getAddress(), BN.from(0), "meta", "0x33");
  });

  it("get owned tokens should be successful", async () => {
    const tokens = await boughtCollection
      .connect(accounts[4])
      .getSelfTokens(BN.from(0), BN.from(10));
    expect(tokens).deep.eq([[[BN.from(0), "meta", "0x33"]], BN.from(1)]);
  });

  it("get all tokens should be successful", async () => {
    const tokens = await boughtCollection
      .connect(accounts[0])
      .getAllTokens(BN.from(0), BN.from(10));
    expect(tokens).deep.eq([[[BN.from(0), "meta", "0x33"]], BN.from(1)]);
  });

  it("self collections should be not empty after mint", async () => {
    const collections = await accessTokenInstance
      .connect(accounts[4])
      .getSelfCollections(BN.from(0), BN.from(10));
    expect(collections).deep.eq([
      [[boughtCollection.address, "0xaa"]],
      [BN.from(1)],
    ]);
  });

  it("self tokens should be not empty after mint", async () => {
    const tokens = await accessTokenInstance
      .connect(accounts[4])
      .getSelfTokens([BN.from(0)], [BN.from(0)], [BN.from(10)]);
    expect(tokens).deep.eq([[[BN.from(0), "meta", "0x33"]]]);
  });
});
