import { ethers, upgrades } from 'hardhat';

import { solidity } from 'ethereum-waffle';

import chai, { expect } from 'chai';

import { ZapTokenBSC } from '../typechain/ZapTokenBSC';

import { BigNumber, EventFilter, Event } from 'ethers';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { ExternalMedia } from '../typechain/ExternalMedia';

import { ZapMarket } from '../typechain/ZapMarket';

import { MediaFactory } from '../typechain/MediaFactory';

import { ZapVault } from '../typechain/ZapVault';

import { ZapMarket__factory } from '../typechain';

import { Creature } from '../typechain/Creature';

import { MockProxyRegistry } from '../typechain/MockProxyRegistry';

chai.use(solidity);

let platformFee = {
  fee: {
    value: BigNumber.from('5000000000000000000')
  }
};

describe('ExternalNFT Test', () => {
  let zapTokenBsc: any;
  let owner: SignerWithAddress;
  let proxyForOwner: SignerWithAddress;
  let proxy: MockProxyRegistry;
  let osCreature: Creature;
  let zapMarket: ZapMarket;
  let zapVault: ZapVault;
  let mediaDeployer: MediaFactory;
  let unInitMedia: ExternalMedia;
  let signers: SignerWithAddress[];
  let bidShares: any;
  let tokenContractAddress: string;
  let tokenContractName: string;
  let tokenContractSymbol: string;
  let tokenByIndex: BigNumber;

  let collaborators = {
    collaboratorTwo: '',
    collaboratorThree: '',
    collaboratorFour: ''
  };

  let invalidBidShares = {
    collaborators: ['', '', ''],
    collabShares: [
      BigNumber.from('15000000000000000000'),
      BigNumber.from('15000000000000000000'),
      BigNumber.from('15000000000000000000')
    ],
    creator: {
      value: BigNumber.from('15000000000000000000')
    },
    owner: {
      value: BigNumber.from('40000000000000000000')
    }
  };

  let ask1 = {
    amount: 100,
    currency: '',
    sellOnShare: 0
  };

  let ask2 = {
    amount: 200,
    currency: '',
    sellOnShare: 0
  };

  describe("Configure", () => {

    beforeEach(async () => {
      signers = await ethers.getSigners();
      owner = signers[0];
      proxyForOwner = signers[8];

      const zapTokenFactory = await ethers.getContractFactory(
        'ZapTokenBSC',
        signers[0]
      );

      zapTokenBsc = await zapTokenFactory.deploy();
      await zapTokenBsc.deployed();

      const zapVaultFactory = await ethers.getContractFactory('ZapVault');

      zapVault = (await upgrades.deployProxy(
        zapVaultFactory,
        [zapTokenBsc.address],
        {
          initializer: 'initializeVault'
        }
      )) as ZapVault;

      let zapMarketFactory: ZapMarket__factory = (await ethers.getContractFactory(
        'ZapMarket'
      )) as ZapMarket__factory;

      zapMarket = (await upgrades.deployProxy(
        zapMarketFactory,
        [zapVault.address],
        {
          initializer: 'initializeMarket'
        }
      )) as ZapMarket;

      await zapMarket.setFee(platformFee);

      const mediaDeployerFactory = await ethers.getContractFactory(
        'MediaFactory',
        signers[0]
      );

      const unInitMediaFactory = await ethers.getContractFactory("ExternalMedia");

      unInitMedia = (await unInitMediaFactory.deploy()) as ExternalMedia;

      mediaDeployer = (await upgrades.deployProxy(
        mediaDeployerFactory,
        [zapMarket.address, unInitMedia.address],
        {
          initializer: 'initialize'
        }
      )) as MediaFactory;

      await mediaDeployer.deployed();

      await zapMarket.setMediaFactory(mediaDeployer.address);

      const proxyFactory = await ethers.getContractFactory(
        'MockProxyRegistry',
        signers[0]
      );

      proxy = (await proxyFactory.deploy()) as MockProxyRegistry;
      await proxy.deployed();
      await proxy.setProxy(owner.address, proxyForOwner.address);

      const oscreatureFactory = await ethers.getContractFactory(
        'Creature',
        signers[0]
      );

      osCreature = (await oscreatureFactory.deploy(proxy.address)) as Creature;
      await osCreature.deployed();

      // mint a creature which is the external NFT and check it's ownered by signers[10]
      await osCreature.mintTo(signers[10].address);
      expect(await osCreature.balanceOf(signers[10].address)).to.equal(1);
      expect(await osCreature.ownerOf(1)).to.equal(signers[10].address)

      const oscreatureFactory2 = await ethers.getContractFactory(
        'Creature',
        signers[1]
      );

      tokenContractAddress = osCreature.address;
      tokenContractName = await osCreature.name();
      tokenContractSymbol = await osCreature.symbol();
      tokenByIndex = await osCreature.tokenByIndex(0);

      bidShares = {
        collaborators: [
          signers[10].address,
          signers[11].address,
          signers[12].address
        ],
        collabShares: [
          BigNumber.from('15000000000000000000'),
          BigNumber.from('15000000000000000000'),
          BigNumber.from('15000000000000000000')
        ],
        creator: {
          value: BigNumber.from('15000000000000000000')
        },
        owner: {
          value: BigNumber.from('35000000000000000000')
        }
      };

      // configure external tokens.
      //   in this case that means we are registering the contract that minted the token being brough into the market.
      // configureExternalToken also includes setting bidShares
      await mediaDeployer
        .connect(signers[10])
        .configureExternalToken(
          tokenContractAddress,
          tokenByIndex,
          bidShares
        );

    });

    it('Should configure external token contract as a media in ZapMarket', async () => {

      // BidShares for tokenID 1
      const bidSharesForTokens = await zapMarket.bidSharesForToken(tokenContractAddress, tokenByIndex);

      expect(await zapMarket.isConfigured(tokenContractAddress)).to.be.true;
      expect(await zapMarket.isConfigured(tokenContractAddress)).to.be.true;
      expect(await zapMarket.isInternal(tokenContractAddress)).to.be.false;
      expect(bidSharesForTokens.creator.value).to.be.equal(bidShares.creator.value);
      expect(bidSharesForTokens.owner.value).to.be.equal(bidShares.owner.value);
      expect(bidSharesForTokens.collabShares).to.be.eql(bidShares.collabShares);
      expect(bidSharesForTokens.collaborators).to.eql(bidSharesForTokens.collaborators);

    });

    it("Should emit a MediaContractCreated event", async () => {

      const filter: EventFilter = zapMarket.filters.MediaContractCreated(
        null,
        null,
        null
      );

      const event: Event = (
        await zapMarket.queryFilter(filter)
      )[0]

      expect(event.event).to.be.equal("MediaContractCreated");
      expect(event.args?.mediaContract).to.equal(tokenContractAddress);
      expect(ethers.utils.parseBytes32String(event.args?.name)).to.be.equal(tokenContractName);
      expect(ethers.utils.parseBytes32String(event.args?.symbol)).to.be.equal(tokenContractSymbol);

    });

    it("Should emit a BidShareUpdated event", async () => {

      const filter: EventFilter = zapMarket.filters.BidShareUpdated(
        null,
        null,
        null
      );

      const event: Event = (
        await zapMarket.queryFilter(filter)
      )[0]

      expect(event.event).to.be.equal("BidShareUpdated");
      expect(event.args?.tokenId).to.be.equal(tokenByIndex);
      expect(event.args?.bidShares.creator.value).to.equal(bidShares.creator.value);
      expect(event.args?.bidShares.owner.value).to.equal(bidShares.owner.value);
      expect(event.args?.bidShares.collaborators).to.eql(bidShares.collaborators);
      expect(event.args?.bidShares.collabShares).to.eql(bidShares.collabShares);
      expect(event.args?.mediaContract).to.equal(osCreature.address);

    });

    it("Should emit an ExternalTokenDeployed event", async () => {

      const filter: EventFilter = mediaDeployer.filters.ExternalTokenDeployed(
        null
      );

      const event: Event = (
        await mediaDeployer.queryFilter(filter)
      )[0]

      expect(event.event).to.be.equal('ExternalTokenDeployed');
      expect(event.args?.extToken).to.be.equal(osCreature.address);

    });

    it("Should be able to configure a different tokenID on the same collection", async () => {

      await osCreature.mintTo(signers[10].address);

      const tokenId2 = await osCreature.tokenByIndex(1);

      await mediaDeployer
        .connect(signers[10])
        .configureExternalToken(
          tokenContractAddress,
          tokenId2,
          bidShares
        )

    });

    it("Should revert if a non owner tries to configure an existing tokenID", async () => {

      const tokenID = await osCreature.tokenByIndex(0);

      await expect(mediaDeployer
        .connect(signers[2])
        .configureExternalToken(
          tokenContractAddress,
          tokenID,
          bidShares
        )).to.be.revertedWith('MediaFactory: Only token owner can configure to ZapMarket');

    })

    it("Should revert if a non existent tokenID tries to be configured", async () => {

      const nonexistentID = 10;

      await expect(mediaDeployer
        .connect(signers[1])
        .configureExternalToken(
          tokenContractAddress,
          nonexistentID,
          bidShares
        )).to.be.revertedWith('ERC721: owner query for nonexistent token');

    })

    it("Should revert if there is an attempt to configure a tokenID twice", async () => {

      await expect(mediaDeployer
        .connect(signers[10])
        .configureExternalToken(
          tokenContractAddress,
          tokenByIndex,
          bidShares
        )).to.be.revertedWith('Market: External token already configured');

    })

  });

  describe('#setAsk', () => {

    beforeEach(async () => {
      ask1.currency = zapTokenBsc.address;
    });

    it('Should reject setAsk if not called by token owner', async () => {

      // signers 4 and 5 are NOT the owner to tokenId 1 so expect it TO revert
      await expect(zapMarket.connect(signers[4]).setAsk(tokenContractAddress, 1, ask1)).to.be.reverted;
      await expect(zapMarket.connect(signers[5]).setAsk(tokenContractAddress, 1, ask1)).to.be.reverted;
    });

    it('Should set the ask if called by the owner of the token ', async () => {

      // signer 10 is the owner to tokenId 1 so expect to NOT revert
      await expect(zapMarket.connect(signers[10]).setAsk(tokenContractAddress, 1, ask1)).to.not.be.reverted;

      // get ask associated with external token
      const getAsk1 = await zapMarket.currentAskForToken(tokenContractAddress, 1);

      expect(getAsk1.amount.toNumber()).to.equal(ask1.amount);
      expect(getAsk1.currency).to.equal(zapTokenBsc.address);


    });

    it('Should emit an event if the ask is updated', async () => {

      await zapMarket.connect(signers[10]).setAsk(tokenContractAddress, 1, ask1);

      const filter_media1: EventFilter = zapMarket.filters.AskCreated(
        tokenContractAddress,
        null,
        null
      );

      const event_media1: Event = (
        await zapMarket.queryFilter(filter_media1)
      )[0];


      expect(event_media1.event).to.be.equal('AskCreated');
      expect(event_media1.args?.tokenId.toNumber()).to.be.equal(1);
      expect(event_media1.args?.ask.amount.toNumber()).to.be.equal(ask1.amount);
      expect(event_media1.args?.ask.currency).to.be.equal(zapTokenBsc.address);
    });

    it('Should reject if the ask is too low', async () => {

      await expect(
        zapMarket.connect(signers[10]).setAsk(tokenContractAddress, 1, {
          amount: 1,
          currency: zapTokenBsc.address
        })
      ).to.be.revertedWith('Market: Ask invalid for share splitting');

    });

    it("Should remove an ask", async () => {

      //set up ask and double check
      await zapMarket.connect(signers[10]).setAsk(tokenContractAddress, 1, ask1);

      const filter_media1: EventFilter = zapMarket.filters.AskCreated(
        tokenContractAddress,
        null,
        null
      );

      const event_media1: Event = (
        await zapMarket.queryFilter(filter_media1)
      )[0];

      expect(event_media1.event).to.be.equal('AskCreated');
      expect(event_media1.args?.tokenId.toNumber()).to.be.equal(1);
      expect(event_media1.args?.ask.amount.toNumber()).to.be.equal(ask1.amount);
      expect(event_media1.args?.ask.currency).to.be.equal(zapTokenBsc.address);


      // remove the ask that was set above
      await zapMarket.connect(signers[10]).removeAsk(tokenContractAddress, 1);

      const filter_removeAsk1: EventFilter = zapMarket.filters.AskRemoved(
        null,
        null,
        null
      );

      const event_removeAsk1: Event = (
        await zapMarket.queryFilter(filter_removeAsk1)
      )[0]

      expect(event_removeAsk1.event).to.be.equal('AskRemoved');
      expect(event_removeAsk1.args?.tokenId.toNumber()).to.be.equal(1);
      expect(event_removeAsk1.args?.ask.amount.toNumber()).to.be.equal(ask1.amount);
      expect(event_removeAsk1.args?.ask.currency).to.be.equal(zapTokenBsc.address);
      expect(event_removeAsk1.args?.mediaContract).to.be.equal(tokenContractAddress)

      // since the ask was removed, we are checking that it is not zero for the ask object
      const getAsk1 = await zapMarket.currentAskForToken(tokenContractAddress, 1);

      expect(getAsk1.amount.toNumber()).to.be.equal(0);
      expect(getAsk1.currency).to.be.equal('0x0000000000000000000000000000000000000000');
    })

  });

  describe('#setBid', () => {
    let signers: any
    let zapTokenBsc: any;
    let zapMarket: ZapMarket;
    let zapVault: ZapVault;
    let osCreature: Creature;
    let unAuthMedia: Creature;
    let bid: any;
    let bidShares: any;

    beforeEach(async () => {

      signers = await ethers.getSigners();
      owner = signers[0];
      proxyForOwner = signers[8];

      const zapTokenFactory = await ethers.getContractFactory(
        'ZapTokenBSC',
        signers[0]
      );

      zapTokenBsc = await zapTokenFactory.deploy();
      await zapTokenBsc.deployed();

      const zapVaultFactory = await ethers.getContractFactory('ZapVault');

      zapVault = (await upgrades.deployProxy(
        zapVaultFactory,
        [zapTokenBsc.address],
        {
          initializer: 'initializeVault'
        }
      )) as ZapVault;

      const zapMarketFactory: ZapMarket__factory = (await ethers.getContractFactory(
        'ZapMarket'
      )) as ZapMarket__factory;

      zapMarket = (await upgrades.deployProxy(
        zapMarketFactory,
        [zapVault.address],
        {
          initializer: 'initializeMarket'
        }
      )) as ZapMarket;

      await zapMarket.setFee(platformFee);

      const mediaDeployerFactory = await ethers.getContractFactory(
        'MediaFactory',
        signers[0]
      );

      const unInitMediaFactory = await ethers.getContractFactory("ExternalMedia");

      unInitMedia = (await unInitMediaFactory.deploy()) as ExternalMedia;

      mediaDeployer = (await upgrades.deployProxy(
        mediaDeployerFactory,
        [zapMarket.address, unInitMedia.address],
        {
          initializer: 'initialize'
        }
      )) as MediaFactory;

      await mediaDeployer.deployed();

      await zapMarket.setMediaFactory(mediaDeployer.address);

      const proxyFactory = await ethers.getContractFactory(
        'MockProxyRegistry',
        signers[0]
      );

      proxy = (await proxyFactory.deploy()) as MockProxyRegistry;
      await proxy.deployed();
      await proxy.setProxy(owner.address, proxyForOwner.address);

      const oscreatureFactory = await ethers.getContractFactory(
        'Creature',
        signers[0]
      );

      osCreature = (await oscreatureFactory.deploy(proxy.address)) as Creature;
      await osCreature.deployed();

      unAuthMedia = (await oscreatureFactory.deploy(proxy.address)) as Creature;
      await unAuthMedia.deployed();

      await osCreature.mintTo(signers[10].address);

      await unAuthMedia.mintTo(signers[10].address);

      bidShares = {
        collaborators: [
          signers[10].address,
          signers[11].address,
          signers[12].address
        ],
        collabShares: [
          BigNumber.from('15000000000000000000'),
          BigNumber.from('15000000000000000000'),
          BigNumber.from('15000000000000000000')
        ],
        creator: {
          value: BigNumber.from('15000000000000000000')
        },
        owner: {
          value: BigNumber.from('35000000000000000000')
        }
      };

      await mediaDeployer.connect(signers[10]).configureExternalToken(
        osCreature.address,
        1,
        bidShares
      );

      bid = {
        amount: 200,
        currency: zapTokenBsc.address,
        bidder: signers[9].address,
        recipient: signers[9].address,
        spender: signers[9].address,
        sellOnShare: {
          value: BigInt(10000000000000000000)
        }
      };

    });

    it('Should revert if not called by the media contract', async () => {

      await zapTokenBsc.mint(signers[9].address, bid.amount);

      await zapTokenBsc.connect(signers[9]).approve(zapMarket.address, bid.amount - 1);

      await expect(zapMarket.connect(signers[9]).setBid(
        unAuthMedia.address,
        1,
        bid,
        bid.spender
      )).to.be.revertedWith('Market: Only media or AuctionHouse contract');

    });

    it('Should revert if the bidder does not have a high enough allowance for their bidding currency', async () => {

      await zapTokenBsc.mint(signers[9].address, bid.amount);

      await zapTokenBsc.connect(signers[9]).approve(zapMarket.address, bid.amount - 1);

      await expect(zapMarket.connect(signers[9]).setBid(
        osCreature.address,
        1,
        bid,
        bid.spender
      )).to.be.revertedWith('SafeERC20: low-level call failed');

    });

    it('Should revert if the bidder does not have enough tokens to bid with', async () => {

      await zapTokenBsc.mint(signers[9].address, bid.amount - 1);

      await zapTokenBsc.connect(signers[9]).approve(zapMarket.address, bid.amount);

      await expect(zapMarket.connect(signers[9]).setBid(
        osCreature.address,
        1,
        bid,
        bid.spender
      )).to.be.revertedWith('SafeERC20: low-level call failed');

    });

it('Should revert if the bid curency is 0 address', async () => {

  await zapTokenBsc.mint(bid.bidder, bid.amount);

  await zapTokenBsc.connect(signers[9]).approve(bid.bidder, bid.amount);

  bid.currency = '0x0000000000000000000000000000000000000000';

  await expect(
    zapMarket.connect(signers[9]).setBid( osCreature.address,
      1,
      bid,
      bid.spender
      )).to.be.revertedWith('Market: bid currency cannot be 0 address');
});

it('Should revert if the bid recipient is 0 address', async () => {

  await zapTokenBsc.mint(bid.bidder, bid.amount);

  await zapTokenBsc
  .connect(signers[9])
  .approve(bid.bidder, bid.amount -1);

  bid.recipient = '0x0000000000000000000000000000000000000000';

  await expect(
    zapMarket.connect(signers[9]).setBid( osCreature.address,
      1,
      bid,
      bid.spender
      )).to.be.revertedWith('Market: bid recipient cannot be 0 address');

});

it('Should revert if the bidder bids 0 tokens', async () => {

  await zapTokenBsc.mint(bid.bidder, bid.amount);

  await zapTokenBsc
  .connect(signers[9])
  .approve(bid.bidder, bid.amount -1);

  bid.amount = 0;

  await expect(
    zapMarket.connect(signers[9]).setBid( osCreature.address,
      1,
      bid,
      bid.spender
      )).to.be.revertedWith('Market: cannot bid amount of 0');


}); 


  });

});