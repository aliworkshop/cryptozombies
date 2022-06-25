const { expect } = require("chai");
const { FormatTypes } = require("ethers/lib/utils");
const { ethers } = require("hardhat");
const {
  advanceBlockWithTime,
} = require("./utils")


describe("Crypto Zombies", function () {
  let CryptoZombie;
  let deployedCryptoZombie;
  let owner;
  let alice;
  let bob;
  let zombieNames;


  beforeEach(async function () {
    CryptoZombie = await ethers.getContractFactory("ZombieOwnership");
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    zombieNames = ["Zombie 1", "Zombie 2"];
    deployedCryptoZombie = await CryptoZombie.deploy();
  });

  afterEach(async () => {
    await deployedCryptoZombie.kill();
  });
 

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await deployedCryptoZombie.owner()).to.equal(owner.address);
    });
  });

  describe("Create Random Zombies", function () {
    it("should be able to create a new zombie", async function () {
      const tx = await deployedCryptoZombie.connect(alice).createRandomZombie(zombieNames[0]);
      const receipt = await tx.wait();
    
      expect(receipt.status).to.equal(1);
      expect(receipt.events[0].args[1].toString()).to.equal(zombieNames[0]);

      await expect(
        deployedCryptoZombie.connect(alice).createRandomZombie(zombieNames[1])
      ).to.be.revertedWith("max zombies exceeded");
    });
  });

  context("with the single-step transfer scenario", async () => {
    it("should transfer a zombie", async () => {
      const tx = await deployedCryptoZombie.connect(alice).createRandomZombie(zombieNames[0]);
      const receipt = await tx.wait();

      const zombieId = receipt.events[0].args[0].toNumber();
      await deployedCryptoZombie.connect(alice).transferFrom(alice.address, bob.address, zombieId);
      const newOwner = await deployedCryptoZombie.ownerOf(zombieId);

      expect(newOwner).to.equal(bob.address);

      // transfering by alice should be rejected
      await expect(
        deployedCryptoZombie.connect(alice).transferFrom(alice.address, bob.address, zombieId)
      ).to.be.revertedWith("permission denied");
    });
  });

  describe("with the two-step transfer scenario", async () => {
    it("should approve and then transfer a zombie when the approved address calls transferFrom", async () => {
      const tx = await deployedCryptoZombie.connect(alice).createRandomZombie(zombieNames[0]);
      const receipt = await tx.wait();

      const zombieId = receipt.events[0].args[0].toNumber();
      await deployedCryptoZombie.connect(alice).approve(bob.address, zombieId);
      await deployedCryptoZombie.connect(bob).transferFrom(alice.address, bob.address, zombieId);
      const newOwner = await deployedCryptoZombie.ownerOf(zombieId);

      expect(newOwner).to.equal(bob.address);
    });
    it("should approve and then transfer a zombie when the owner calls transferFrom", async () => {
      const tx = await deployedCryptoZombie.connect(alice).createRandomZombie(zombieNames[0]);
      const receipt = await tx.wait();

      const zombieId = receipt.events[0].args[0].toNumber();
      await deployedCryptoZombie.connect(alice).approve(bob.address, zombieId);
      await deployedCryptoZombie.connect(alice).transferFrom(alice.address, bob.address, zombieId);
      const newOwner = await deployedCryptoZombie.ownerOf(zombieId);

      expect(newOwner).to.equal(bob.address);
     });
  });

  it("zombies should be able to attack another zombie", async () => {
    let result;
    let tx = await deployedCryptoZombie.connect(alice).createRandomZombie(zombieNames[0]);
    result = await tx.wait();
    const firstZombieId = result.events[0].args[0].toNumber();
    
    tx = await deployedCryptoZombie.connect(bob).createRandomZombie(zombieNames[1]);
    result = await tx.wait();
    const secondZombieId = result.events[0].args[0].toNumber();
    
    //increase the time
    await advanceBlockWithTime(owner.provider, 86400); // after one day
    await deployedCryptoZombie.connect(alice).attack(firstZombieId, secondZombieId);
  });



});
