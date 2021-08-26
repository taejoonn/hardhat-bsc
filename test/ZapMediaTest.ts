import { deployments, ethers } from "hardhat"
const { BigNumber } = ethers;

import { EventFilter, Event } from 'ethers';

import { solidity } from 'ethereum-waffle';

import chai, { expect } from 'chai';

import { ZapTokenBSC } from '../typechain/ZapTokenBSC';

import { signPermit, signMintWithSig } from './utils';

chai.use(solidity);

describe("ZapMedia Test", async () => {

    let zapMarket: any;
    let zapMedia1: any;
    let zapMedia2: any;
    let zapMedia3: any;
    let zapMedia4: any;
    let zapTokenBsc: any;
    let signers: any;

    let bidShares = {

        prevOwner: {
            value: BigInt(10000000000000000000)
        },
        owner: {
            value: BigInt(80000000000000000000)
        },
        creator: {
            value: BigInt(10000000000000000000)
        },
    };

    let ask = {
        amount: 100,
        currency: '',
        sellOnShare: 0
    };

    let tokenURI: any;
    let metadataURI: any;
    let metadataHex: any;
    let metadataHash: any;
    let metadataHashBytes: any;
    let contentHex: any;
    let contentHash: any;
    let contentHashBytes: any;
    let otherContentHex: string;
    let otherContentHash: string;
    let otherContentHashBytes: any;
    let zeroContentHashBytes: any;
    let mediaData: any;
    let randomString: any;

    describe("Configure", () => {

        beforeEach(async () => {

            tokenURI =  String('media contract 1 - token 1 uri');
            metadataURI = String('media contract 1 - metadata 1 uri');

            metadataHex = ethers.utils.formatBytes32String('{}');
            metadataHash = ethers.utils.sha256(metadataHex);
            metadataHashBytes = ethers.utils.arrayify(metadataHash);

            randomString = Date.now().toString();
            contentHex = ethers.utils.formatBytes32String(randomString);
            contentHash = ethers.utils.sha256(contentHex);
            contentHashBytes = ethers.utils.arrayify(contentHash);

            randomString = Date.now().toString();
            otherContentHex = ethers.utils.formatBytes32String(randomString);
            otherContentHash = ethers.utils.sha256(otherContentHex);
            otherContentHashBytes = ethers.utils.arrayify(otherContentHash);

            zeroContentHashBytes = ethers.utils.arrayify(ethers.constants.HashZero);

            mediaData = {
                tokenURI,
                metadataURI,
                contentHash: contentHashBytes,
                metadataHash: metadataHashBytes,
            };

            signers = await ethers.getSigners();

            const marketFixture = await deployments.fixture(['ZapMarket']);

            zapMarket = await ethers.getContractAt("ZapMarket", marketFixture.ZapMarket.address);


            const mediaFactory = await ethers.getContractFactory("ZapMedia", signers[1]);

            zapMedia1 = (await mediaFactory.deploy("TEST MEDIA 1", "TM1", zapMarket.address));

            await zapMedia1.deployed();

            const mediaFactory2 = await ethers.getContractFactory("ZapMedia", signers[2]);

            zapMedia2 = (await mediaFactory2.deploy("TEST MEDIA 2", "TM2", zapMarket.address));

            await zapMedia2.deployed();

            const mediaFactory3 = await ethers.getContractFactory("ZapMedia", signers[3]);

            zapMedia3 = (await mediaFactory3.deploy("Test MEDIA 3", "TM3", zapMarket.address));

            await zapMedia3.deployed();

            const mediaFactory4 = await ethers.getContractFactory("ZapMedia", signers[4]);

            zapMedia4 = (await mediaFactory4.deploy("Test MEDIA 4", "T4", zapMarket.address));

            await zapMedia4.deployed();

            const zapTokenFactory = await ethers.getContractFactory(
                'ZapTokenBSC',
                signers[0]
            );

            zapTokenBsc = (await zapTokenFactory.deploy()) as ZapTokenBSC;
            await zapTokenBsc.deployed();

            ask.currency = zapTokenBsc.address;

        });

        it('Should get media owner', async () => {

            const zapMedia1Address = await zapMarket.mediaContracts(signers[1].address, BigNumber.from("0"));

            const zapMedia2Address = await zapMarket.mediaContracts(signers[2].address, BigNumber.from("0"));

            expect(await zapMedia1Address).to.equal(zapMedia1.address);

            expect(await zapMedia2Address).to.equal(zapMedia2.address);


        });

        it('Should reject if called twice', async () => {

            await expect(zapMarket.connect(signers[1]).configure(
                signers[1].address, zapMedia1.address,
                ethers.utils.formatBytes32String("TEST MEDIA 1"),
                ethers.utils.formatBytes32String("TM1"))

            ).to.be.revertedWith("Market: Already configured");

            await expect(zapMarket.connect(signers[2]).configure(
                signers[2].address, zapMedia2.address,
                ethers.utils.formatBytes32String("TEST MEDIA 2"),
                ethers.utils.formatBytes32String("TM2"))

            ).to.be.revertedWith("Market: Already configured");

            expect(await zapMarket.isConfigured(zapMedia1.address)).to.be.true

            expect(await zapMarket.isConfigured(zapMedia2.address)).to.be.true

        });
    });

    describe('#mint', () => {
        beforeEach(async () => {
            tokenURI =  String('media contract 1 - token 1 uri');
            metadataURI = String('media contract 1 - metadata 1 uri');

            metadataHex = ethers.utils.formatBytes32String('{}');
            metadataHash = ethers.utils.sha256(metadataHex);
            metadataHashBytes = ethers.utils.arrayify(metadataHash);
        
            randomString = Date.now().toString();
            contentHex = ethers.utils.formatBytes32String(randomString);
            contentHash = ethers.utils.sha256(contentHex);
            contentHashBytes = ethers.utils.arrayify(contentHash);

            zeroContentHashBytes = ethers.utils.arrayify(ethers.constants.HashZero);
        
            mediaData = {
                tokenURI,
                metadataURI,
                contentHash: contentHashBytes,
                metadataHash: metadataHashBytes,
            };
        });

        it('should mint token', async () => {
            await zapMedia1.mint(mediaData, bidShares);

            const ownerOf = await zapMedia1.ownerOf(0);
            const creator = await zapMedia1.tokenCreators(0);
            const prevOwner = await zapMedia1.previousTokenOwners(0);
            const tokenContentHash = await zapMedia1.tokenContentHashes(0);
            const metadataContentHash = await zapMedia1.tokenMetadataHashes(0);
            const savedTokenURI = await zapMedia1.tokenURI(0);
            const savedMetadataURI = await zapMedia1.tokenMetadataURI(0);
      
            expect(ownerOf).eq(signers[1].address);
            expect(creator).eq(signers[1].address);
            expect(prevOwner).eq(signers[1].address);
            expect(tokenContentHash).eq(contentHash);
            expect(metadataContentHash).eq(metadataHash);
            expect(savedTokenURI).eq(tokenURI);
            expect(savedMetadataURI).eq(metadataURI);
        });

        it('should revert if an empty content hash is specified', async () => {      
            await expect(
                zapMedia1.mint(
                    {...mediaData, contentHash: zeroContentHashBytes}, bidShares
                )
            ).revertedWith('Media: content hash must be non-zero');
        });
    
        it('should revert if the content hash already exists for a created token', async () => {
            await zapMedia2.mint(mediaData, bidShares);
        
            await expect(
                zapMedia2.mint(mediaData, bidShares)
            ).revertedWith('Media: a token has already been created with this content hash');
        });
      
        it('should revert if the metadataHash is empty', async () => {
            const secondContentHex = ethers.utils.formatBytes32String('invert2');
            const secondContentHash = await ethers.utils.sha256(secondContentHex);

            await expect(
                zapMedia1.mint(
                    {...mediaData, contentHash: secondContentHash, metadataHash: zeroContentHashBytes},
                    bidShares
                )
            ).revertedWith('Media: metadata hash must be non-zero');
        });
    
        it('should revert if the tokenURI is empty', async () => {
            await expect(
                zapMedia1.mint({...mediaData, tokenURI: ''}, bidShares)
            ).revertedWith('Media: specified uri must be non-empty');
        });
    
        it('should revert if the metadataURI is empty', async () => {
            await expect(
                zapMedia1.mint({...mediaData, metadataURI: ''}, bidShares)
            ).revertedWith('Media: specified uri must be non-empty');
        });
    
        // it('should not be able to mint a token with bid shares summing to less than 100', async () => {
        //     await expect(
        //         zapMedia1.mint(mediaData, {...bidShares, creator: {
        //             value: BigInt(50000000000000000000)
        //         }})
        //     ).revertedWith('Market: Invalid bid shares, must sum to 100');
        // });
    });

    describe('#mintWithSig', () => {
        const version = '1';

        it('should mint a token for a given creator with a valid signature', async () => {
            const sig = await signMintWithSig(
                zapMedia1,
                signers,
                contentHashBytes,
                metadataHashBytes,
                version
            );
            const beforeNonce = (await zapMedia1.mintWithSigNonces(signers[1].address)).toNumber();
            await zapMedia1.mintWithSig(signers[1].address, mediaData, bidShares, sig);

            const recovered = await zapMedia1.tokenCreators(1);
            const recoveredTokenURI = await zapMedia1.tokenURI(1);
            const recoveredMetadataURI = await zapMedia1.tokenMetadataURI(1);
            const recoveredContentHash = await zapMedia1.tokenContentHashes(1);
            const recoveredMetadataHash = await zapMedia1.tokenMetadataHashes(1);
            const recoveredCreatorBidShare = (await zapMarket.bidSharesForToken(zapMedia1.address, 1)).creator.value;
            const afterNonce = await zapMedia1.mintWithSigNonces(signers[1].address);
      
            expect(recovered).to.eq(signers[1].address);
            expect(recoveredTokenURI).to.eq(tokenURI);
            expect(recoveredMetadataURI).to.eq(metadataURI);
            expect(recoveredContentHash).to.eq(contentHash);
            expect(recoveredMetadataHash).to.eq(metadataHash);
            expect(recoveredCreatorBidShare).to.eq(BigInt(10000000000000000000));
            expect(afterNonce).to.eq(BigNumber.from(beforeNonce + 1));
        });

        it('should not mint a token for a different creator', async () => {
            const sig = await signMintWithSig(
                zapMedia1,
                signers,
                contentHashBytes,
                metadataHashBytes,
                version
            );
        
            await expect(
                zapMedia1.mintWithSig(signers[2].address, mediaData, bidShares, sig)
            ).revertedWith('Media: Signature invalid');
        });

        it('should not mint a token for a different contentHash', async () => {
            const badContent = 'bad bad bad';
            const badContentHex = ethers.utils.formatBytes32String(badContent);
            const badContentHashBytes = ethers.utils.arrayify(badContentHex);
      
            const sig = await signMintWithSig(
                zapMedia1,
                signers,
                badContentHashBytes,
                metadataHashBytes,
                version
            );
        
            await expect(
                zapMedia1.mintWithSig(signers[1].address, mediaData, bidShares, sig)
            ).revertedWith('Media: Signature invalid');
        });

        it('should not mint a token for a different metadataHash', async () => {
            const badMetadata = '{"some": "bad", "data": ":)"}';
            const badMetadataHex = ethers.utils.formatBytes32String(badMetadata);
            const badMetadataHashBytes = ethers.utils.arrayify(badMetadataHex);

            const sig = await signMintWithSig(
                zapMedia1,
                signers,
                contentHashBytes,
                badMetadataHashBytes,
                version
            );
      
            await expect(
                zapMedia1.mintWithSig(signers[1].address, mediaData, bidShares, sig)
            ).revertedWith('Media: Signature invalid');
        });

        it('should not mint a token for a different creator bid share', async () => {
            const sig = await signMintWithSig(
                zapMedia1,
                signers,
                contentHashBytes,
                metadataHashBytes,
                version
            );
        
            await expect(
                zapMedia1.mintWithSig(
                    signers[1].address,
                    mediaData,
                    {
                        prevOwner: {
                            value: BigInt(10000000000000000000)
                        },
                        owner: {
                            value: BigInt(70000000000000000000)
                        },
                        creator: {
                            value: BigInt(20000000000000000000)
                        },
                    },
                    sig
                )
            ).revertedWith('Media: Signature invalid');
        });

        it('should not mint a token with an invalid deadline', async () => {
            const sig = await signMintWithSig(
                zapMedia1,
                signers,
                contentHashBytes,
                metadataHashBytes,
                version
            );
        
            await expect(
                zapMedia1.mintWithSig(signers[1].address, mediaData, bidShares, { ...sig, deadline: '1' })
            ).revertedWith('Media: mintWithSig expired');
        });
    });

    describe('#setAsk', () => {    
        beforeEach(async () => {
            tokenURI =  String('media contract 1 - token 1 uri');
            metadataURI = String('media contract 1 - metadata 1 uri');

            metadataHex = ethers.utils.formatBytes32String('{}');
            metadataHash = ethers.utils.sha256(metadataHex);
            metadataHashBytes = ethers.utils.arrayify(metadataHash);
        
            randomString = Date.now().toString();
            contentHex = ethers.utils.formatBytes32String(randomString);
            contentHash = ethers.utils.sha256(contentHex);
            contentHashBytes = ethers.utils.arrayify(contentHash);

            zeroContentHashBytes = ethers.utils.arrayify(ethers.constants.HashZero);
        
            mediaData = {
                tokenURI,
                metadataURI,
                contentHash: contentHashBytes,
                metadataHash: metadataHashBytes,
            };

            await zapMedia3.mint(mediaData, bidShares);
        });

        it('should set the ask', async () => {
            expect(
                await zapMedia3.setAsk(0, ask)
            );
        });
    
        it('should reject if the ask is 0', async () => {
            await expect(
                zapMedia3.setAsk(0, { ...ask, amount: 0 })
            ).revertedWith('Market: Ask invalid for share splitting');
        });
    
        it('should reject if the ask amount is invalid and cannot be split', async () => {
            await expect(
                zapMedia3.setAsk(0, { ...ask, amount: 101 })
            ).revertedWith('Market: Ask invalid for share splitting');
        });
    });

    describe('#setBid-without-setupAuction', () => {
        let bid1: any;
        let bid2: any;

        beforeEach(async () => {
            bid1 = {
                amount: 100,
                currency: zapTokenBsc.address,
                bidder: signers[1].address,
                recipient: signers[8].address,
                spender: signers[1].address,
                sellOnShare: {
                    value: BigInt(10000000000000000000)
                }
            };

            bid2 = {
                amount: 200,
                currency: zapTokenBsc.address,
                bidder: signers[2].address,
                recipient: signers[9].address,
                spender: signers[2].address,
                sellOnShare: {
                    value: BigInt(10000000000000000000)
                }
            };

            tokenURI =  String('media contract 1 - token 1 uri');
            metadataURI = String('media contract 1 - metadata 1 uri');

            metadataHex = ethers.utils.formatBytes32String('{}');
            metadataHash = ethers.utils.sha256(metadataHex);
            metadataHashBytes = ethers.utils.arrayify(metadataHash);
        
            randomString = Date.now().toString();
            contentHex = ethers.utils.formatBytes32String(randomString);
            contentHash = ethers.utils.sha256(contentHex);
            contentHashBytes = ethers.utils.arrayify(contentHash);

            zeroContentHashBytes = ethers.utils.arrayify(ethers.constants.HashZero);
        
            mediaData = {
                tokenURI,
                metadataURI,
                contentHash: contentHashBytes,
                metadataHash: metadataHashBytes,
            };

            await zapMedia3.mint(mediaData, bidShares);
        });

        it('should revert if the token bidder does not have a high enough allowance for their bidding currency', async () => {
            await zapTokenBsc.mint(signers[1].address, bid1.amount);

            await zapTokenBsc.connect(signers[1]).approve(zapMarket.address, bid1.amount - 1);

            await expect(
                zapMedia3.connect(signers[1]).setBid(0, bid1)
            ).to.be.revertedWith('SafeERC20: low-level call failed');
        });

        it('should revert if the token bidder does not have a high enough balance for their bidding currency', async () => {
            await zapTokenBsc.mint(signers[1].address, bid1.amount / 2);

            await zapTokenBsc.connect(signers[1]).approve(zapMarket.address, bid1.amount / 2);

            await expect(
                zapMedia3.connect(signers[1]).setBid(0, bid1)
            ).to.be.revertedWith('SafeERC20: low-level call failed');
        });

        it('should set a bid', async () => {
            await zapTokenBsc.mint(signers[4].address, 100000);

            await zapTokenBsc.connect(signers[4]).approve(zapMarket.address, 100000);

            expect(await zapMedia3.connect(signers[4]).setBid(0, {...bid1, bidder: signers[4].address, recipient: signers[4].address}));

            const balance = await zapTokenBsc.balanceOf(signers[4].address);
            expect(balance.toNumber()).eq(100000 - 100);
        });
    });

    describe('#setBid-with-setupAuction', () => {
        let bid1: any;
        beforeEach(async () => {
            bid1 = {
                amount: 100,
                currency: zapTokenBsc.address,
                bidder: signers[1].address,
                recipient: signers[8].address,
                spender: signers[1].address,
                sellOnShare: {
                    value: BigInt(10000000000000000000)
                }
            };
        });

        it('should refund a bid if one already exists for the bidder', async () => {
            const mediaFactory11 = await ethers.getContractFactory("ZapMedia", signers[11]);
            const zapMedia11 = (await mediaFactory11.deploy("Test MEDIA 11", "T11", zapMarket.address));
            await zapMedia11.deployed();
            await setupAuction(zapMedia11, signers[11]);

            await zapMedia11.connect(signers[3]).setAsk(0, ask);
      
            expect(await zapMedia11.ownerOf(0)).to.equal(signers[3].address);

            const beforeBalance = await zapTokenBsc.balanceOf(signers[4].address);
            await zapMedia11.connect(signers[4]).setBid(0, {...bid1, amount: 200, bidder: signers[4].address, recipient: signers[5].address});
            const afterBalance = await zapTokenBsc.balanceOf(signers[4].address);

            expect(afterBalance - 100).eq(beforeBalance - 200);
        });
    });

    async function setupAuction(ownerContract: any, ownerWallet: any) {
        const bid1 = {
            amount: 100,
            currency: zapTokenBsc.address,
            bidder: ownerWallet.address,
            recipient: signers[8].address,
            spender: ownerWallet.address,
            sellOnShare: {
                value: BigInt(10000000000000000000)
            }
        };

        await zapTokenBsc.mint(ownerWallet.address, 10000);
        await zapTokenBsc.mint(signers[2].address, 10000);
        await zapTokenBsc.mint(signers[3].address, 10000);
        await zapTokenBsc.mint(signers[4].address, 10000);
        await zapTokenBsc.mint(signers[5].address, 10000);
        await zapTokenBsc.connect(ownerWallet).approve(zapMarket.address, 10000);
        await zapTokenBsc.connect(signers[2]).approve(zapMarket.address, 10000);
        await zapTokenBsc.connect(signers[3]).approve(zapMarket.address, 10000);
        await zapTokenBsc.connect(signers[4]).approve(zapMarket.address, 10000);
        await zapTokenBsc.connect(signers[5]).approve(zapMarket.address, 10000);

        randomString = Date.now().toString();
        contentHex = ethers.utils.formatBytes32String(randomString);
        contentHash = ethers.utils.sha256(contentHex);
        contentHashBytes = ethers.utils.arrayify(contentHash);
        await ownerContract.mint({...mediaData, contentHash: contentHashBytes}, bidShares);
    
        await ownerContract.connect(signers[2]).setBid(0, {...bid1, bidder: signers[2].address, recipient: signers[2].address});
        await ownerContract.connect(ownerWallet).acceptBid(0, {...bid1, bidder: signers[2].address, recipient: signers[2].address});
        await ownerContract.connect(signers[3]).setBid(0, {...bid1, bidder: signers[3].address, recipient: signers[3].address});
        await ownerContract.connect(signers[2]).acceptBid(0, {...bid1, bidder: signers[3].address, recipient: signers[3].address});
        await ownerContract.connect(signers[4]).setBid(0, {...bid1, bidder: signers[4].address, recipient: signers[4].address});
        await ownerContract.connect(signers[5]).setBid(0, {...bid1, bidder: signers[5].address, recipient: signers[5].address});        
    }

    describe('#removeBid', () => {
        beforeEach(async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);
        });

        it('should revert if the bidder has not placed a bid', async () => {
            await expect(zapMedia1.connect(signers[6]).removeBid(0)).revertedWith(
                'Market: cannot remove bid amount of 0'
            );
        });
    
        it('should revert if the tokenId has not yet ben created', async () => {
            await expect(zapMedia1.connect(signers[4]).removeBid(100)).revertedWith(
                'Media: token with that id does not exist'
            );
        });
    
        it('should remove a bid and refund the bidder', async () => {
            const beforeBalance = await zapTokenBsc.balanceOf(signers[4].address);
            expect(await zapMedia1.connect(signers[4]).removeBid(0));
            const afterBalance = await zapTokenBsc.balanceOf(signers[4].address);
            console.log(afterBalance.toNumber(), beforeBalance.toNumber());
            expect(afterBalance.toNumber()).eq(beforeBalance.toNumber() + 100);
        });
    
        it('should not be able to remove a bid twice', async () => {
            await zapMedia1.connect(signers[4]).removeBid(0);
        
            await expect(zapMedia1.connect(signers[4]).removeBid(0))
            .revertedWith('Market: cannot remove bid amount of 0');
        });
    
        it('should remove a bid, even if the token is burned', async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            const zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);

            await zapMedia1.connect(signers[3]).transferFrom(signers[3].address, signers[1].address, 0);
            await zapMedia1.burn(0);
            const beforeBalance = await zapTokenBsc.balanceOf(signers[4].address);
            expect(await zapMedia1.connect(signers[4]).removeBid(0));
            const afterBalance = await zapTokenBsc.balanceOf(signers[4].address); 
            expect(afterBalance.toNumber()).eq(beforeBalance.toNumber() + 100);
        });
    });

    describe('#acceptBid', () => {
        let bid1: any;
        beforeEach(async () => {
            bid1 = {
                amount: 100,
                currency: zapTokenBsc.address,
                bidder: signers[1].address,
                recipient: signers[8].address,
                spender: signers[1].address,
                sellOnShare: {
                    value: BigInt(10000000000000000000)
                }
            };

            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);
        });
    
        it('should accept a bid', async () => {
            const bid = {
                ...bid1,
                bidder: signers[4].address,
                recipient: signers[5].address,
                sellOnShare: {
                    value: BigInt(15000000000000000000)
                }
            };

            await zapMedia1.connect(signers[4]).setBid(0, bid);
        
            const beforeOwnerBalance = (await zapTokenBsc.balanceOf(signers[3].address)).toNumber();
            const beforePrevOwnerBalance = (await zapTokenBsc.balanceOf(signers[2].address)).toNumber();
            const beforeCreatorBalance = (await zapTokenBsc.balanceOf(signers[1].address)).toNumber();
            expect(await zapMedia1.connect(signers[3]).acceptBid(0, bid));
            const newOwner = await zapMedia1.ownerOf(0);
            const afterOwnerBalance = (await zapTokenBsc.balanceOf(signers[3].address)).toNumber();
            const afterPrevOwnerBalance = (await zapTokenBsc.balanceOf(signers[2].address)).toNumber();
            const afterCreatorBalance = (await zapTokenBsc.balanceOf(signers[1].address)).toNumber();
            const bidShares = await zapMarket.bidSharesForToken(zapMedia1.address, 0);
        
            expect(afterOwnerBalance).eq(beforeOwnerBalance + 80);
            expect(afterPrevOwnerBalance).eq(beforePrevOwnerBalance + 10);
            expect(afterCreatorBalance).eq(beforeCreatorBalance + 10);
            expect(newOwner).eq(signers[5].address);
            expect(bidShares.owner.value).eq(BigInt(75000000000000000000));
            expect(bidShares.prevOwner.value).eq(BigInt(15000000000000000000));
            expect(bidShares.creator.value).eq(BigInt(10000000000000000000));
        });

        it('should emit a bid finalized event if the bid is accepted', async () => {
            const bid = {...bid1, bidder: signers[4].address};
            await zapMedia1.connect(signers[4]).setBid(0, bid);
            await zapMedia1.connect(signers[3]).acceptBid(0, bid);

            const zapMarketFilter: EventFilter = zapMarket.filters.BidFinalized(null, null);
            const event: Event = (await zapMarket.queryFilter(zapMarketFilter)).slice(-1)[0];

            const logDescription = zapMarket.interface.parseLog(event);
            expect(logDescription.args.tokenId.toNumber()).to.eq(0);
            expect(logDescription.args.bid.amount.toNumber()).to.eq(bid.amount);
            expect(logDescription.args.bid.currency).to.eq(bid.currency);
            expect(logDescription.args.bid.sellOnShare.value).to.eq(bid.sellOnShare.value);
            expect(logDescription.args.bid.bidder).to.eq(bid.bidder);
        });
    
        it('should emit a bid shares updated event if the bid is accepted', async () => {
            const bid = {...bid1, bidder: signers[4].address};
            await zapMedia1.connect(signers[4]).setBid(0, bid);
            await zapMedia1.connect(signers[3]).acceptBid(0, bid);

            const zapMarketFilter: EventFilter = zapMarket.filters.BidShareUpdated(null, null);
            const event: Event = (await zapMarket.queryFilter(zapMarketFilter)).slice(-1)[0];

            const logDescription = zapMarket.interface.parseLog(event);

            expect(logDescription.args.tokenId.toNumber()).to.eq(0);
            expect(logDescription.args.bidShares.prevOwner.value).to.eq(
                BigInt(10000000000000000000)
            );
            expect(logDescription.args.bidShares.owner.value).to.eq(
                BigInt(80000000000000000000)
            );
            expect(logDescription.args.bidShares.creator.value).to.eq(
                BigInt(10000000000000000000)
            );
        });
      
        it('should revert if not called by the owner', async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            const zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);

            await expect(
                zapMedia1.connect(signers[5]).acceptBid(0, {...bid1, bidder: signers[4].address})
            ).revertedWith('Media: Only approved or owner');
        });
      
        it('should revert if a non-existent bid is accepted', async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            const zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);

            await expect(
                zapMedia1.connect(signers[3]).acceptBid(0, {...bid1, bidder: '0x0000000000000000000000000000000000000000'})
            ).revertedWith('Market: cannot accept bid of 0');
        });
      
        it('should revert if an invalid bid is accepted', async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            const zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);

            const bid = {
                ...bid1,
                bidder: signers[4].address,
                amount: 99,
            };
            await zapMedia1.connect(signers[4]).setBid(0, bid);
        
            await expect(zapMedia1.connect(signers[3]).acceptBid(0, bid)).revertedWith(
                'Market: Bid invalid for share splitting'
            );
        });
    });

    describe('#transfer', () => {
        it('should remove the ask after a transfer', async () => {
            const mediaFactory19 = await ethers.getContractFactory("ZapMedia", signers[19]);
            const zapMedia19 = (await mediaFactory19.deploy("Test MEDIA 19", "T19", zapMarket.address));
            await zapMedia19.deployed();
            await setupAuction(zapMedia19, signers[19]);

            await zapMedia19.connect(signers[3]).setAsk(0, ask);

            expect(await zapMedia19.connect(signers[3]).transferFrom(signers[3].address, signers[5].address, 0));
            const askB = await zapMarket.currentAskForToken(zapMedia19.address, 0);
            expect(await askB.amount.toNumber()).eq(0);
            expect(await askB.currency).eq('0x0000000000000000000000000000000000000000');
        });
    });
    
    describe('#burn', () => {
        beforeEach(async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await zapMedia1.mint(mediaData, bidShares);
        });
    
        it('should revert when the caller is the owner, but not creator', async () => {
            await zapMedia1.connect(signers[1]).transferFrom(
                signers[1].address,
                signers[3].address,
                0
            );

            await expect(zapMedia1.connect(signers[3]).burn(0)).revertedWith('Media: owner is not creator of media');
        });
    
        it('should revert when the caller is approved, but the owner is not the creator', async () => {
            await zapMedia1.connect(signers[1]).transferFrom(
                signers[1].address,
                signers[3].address,
                0
            );

            await zapMedia1.connect(signers[3]).approve(signers[5].address, 0);
 
            await expect(zapMedia1.connect(signers[5]).burn(0)).revertedWith(
                'Media: owner is not creator of media'
            );
        });
    
        it('should revert when the caller is not the owner or a creator', async () => {
          await expect(zapMedia1.connect(signers[5]).burn(0)).revertedWith('Media: Only approved or owner');
        });
    
        it('should revert if the token id does not exist', async () => {
          await expect(zapMedia1.connect(signers[1]).burn(100)).revertedWith('Media: nonexistent token');
        });
    
        it('should clear approvals, set remove owner, but maintain tokenURI and contentHash when the owner is creator and caller', async () => {
            expect(await zapMedia1.connect(signers[1]).approve(signers[5].address, 0));
        
            expect(await zapMedia1.connect(signers[1]).burn(0));
        
            await expect(zapMedia1.connect(signers[1]).ownerOf(0)).revertedWith(
                'ERC721: owner query for nonexistent token'
            );
        
            const totalSupply = await zapMedia1.connect(signers[1]).totalSupply();
            expect(totalSupply.toNumber()).eq(0);
        
            await expect(zapMedia1.connect(signers[1]).getApproved(0)).revertedWith(
                'ERC721: approved query for nonexistent token'
            );
        
            await expect(zapMedia1.connect(signers[1]).tokenURI(0)).revertedWith(
                'ERC721Metadata: URI query for nonexistent token'
            );
        });
    
        it('should clear approvals, set remove owner, but maintain tokenURI and contentHash when the owner is creator and caller is approved', async () => {
            expect(await zapMedia1.connect(signers[1]).approve(signers[5].address, 0));
        
            expect(await zapMedia1.connect(signers[5]).burn(0));
        
            await expect(zapMedia1.connect(signers[1]).ownerOf(0)).revertedWith(
                'ERC721: owner query for nonexistent token'
            );
        
            const totalSupply = await zapMedia1.connect(signers[1]).totalSupply();
            expect(totalSupply.toNumber()).eq(0);
        
            await expect(zapMedia1.connect(signers[1]).getApproved(0)).revertedWith(
                'ERC721: approved query for nonexistent token'
            );
        
            await expect(zapMedia1.connect(signers[1]).tokenURI(0)).revertedWith(
                'ERC721Metadata: URI query for nonexistent token'
            );
        });
    });

    describe('#updateTokenURI', async () => {
        beforeEach(async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);
        });

        it('should revert if the token does not exist', async () => {
            await expect(zapMedia1.connect(signers[1]).updateTokenURI(1, 'blah blah')).revertedWith(
                'ERC721: operator query for nonexistent token'
            );
        });

        it('should revert if the caller is not the owner of the token and does not have approval', async () => {
            await expect(zapMedia1.connect(signers[5]).updateTokenURI(0, 'blah blah')).revertedWith(
                'Media: Only approved or owner'
            );
        });

        it('should revert if the uri is empty string', async () => {
            await expect(zapMedia1.connect(signers[3]).updateTokenURI(0, '')).revertedWith(
                'Media: specified uri must be non-empty'
            );
        });

        it('should revert if the token has been burned', async () => {
            await zapMedia1.connect(signers[1]).mint(
                {
                    ...mediaData,
                    contentHash: otherContentHashBytes,
                },
                {
                    prevOwner: {
                        value: BigInt(10000000000000000000)
                    },
                    owner: {
                        value: BigInt(90000000000000000000)
                    },
                    creator: {
                        value: BigInt(0)
                    },
                }
            );

            expect(await zapMedia1.connect(signers[1]).burn(1));

            await expect(zapMedia1.connect(signers[1]).updateTokenURI(1, 'blah')).revertedWith(
                'ERC721: operator query for nonexistent token'
            );
        });

        it('should set the tokenURI to the URI passed if the msg.sender is the owner', async () => {
            expect(await zapMedia1.connect(signers[3]).updateTokenURI(0, 'blah blah'));

            const tokenURI = await zapMedia1.connect(signers[3]).tokenURI(0);
            expect(tokenURI).eq('blah blah');
        });

        it('should set the tokenURI to the URI passed if the msg.sender is approved', async () => {
            await zapMedia1.connect(signers[3]).approve(signers[5].address, 0);

            expect(await zapMedia1.connect(signers[5]).updateTokenURI(0, 'blah blah'));

            const tokenURI = await zapMedia1.connect(signers[3]).tokenURI(0);
            expect(tokenURI).eq('blah blah');
        });
    });
    
    describe('#updateMetadataURI', async () => {
        beforeEach(async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);
        });

        it('should revert if the token does not exist', async () => {
            await expect(zapMedia1.connect(signers[1]).updateTokenMetadataURI(1, 'blah blah')).revertedWith(
                'ERC721: operator query for nonexistent token'
            );
        });

        it('should revert if the caller is not the owner of the token and does not have approval', async () => {
            await expect(zapMedia1.connect(signers[5]).updateTokenMetadataURI(0, 'blah blah')).revertedWith(
                'Media: Only approved or owner'
            );
        });

        it('should revert if the uri is empty string', async () => {
            await expect(zapMedia1.connect(signers[3]).updateTokenMetadataURI(0, '')).revertedWith(
                'Media: specified uri must be non-empty'
            );
        });

        it('should revert if the token has been burned', async () => {
            await zapMedia1.connect(signers[1]).mint(
                {
                    ...mediaData,
                    contentHash: otherContentHashBytes,
                },
                {
                    prevOwner: {
                        value: BigInt(10000000000000000000)
                    },
                    owner: {
                        value: BigInt(90000000000000000000)
                    },
                    creator: {
                        value: BigInt(0)
                    },
                }
            );

            expect(await zapMedia1.connect(signers[1]).burn(1));

            await expect(zapMedia1.connect(signers[1]).updateTokenMetadataURI(1, 'blah')).revertedWith(
                'ERC721: operator query for nonexistent token'
            );
        });

        it('should set the tokenURI to the URI passed if the msg.sender is the owner', async () => {
            expect(await zapMedia1.connect(signers[3]).updateTokenMetadataURI(0, 'blah blah'));

            const tokenURI = await zapMedia1.connect(signers[3]).tokenMetadataURI(0);
            expect(tokenURI).eq('blah blah');
        });

        it('should set the tokenURI to the URI passed if the msg.sender is approved', async () => {
            await zapMedia1.connect(signers[3]).approve(signers[5].address, 0);

            expect(await zapMedia1.connect(signers[5]).updateTokenMetadataURI(0, 'blah blah'));

            const tokenURI = await zapMedia1.connect(signers[3]).tokenMetadataURI(0);
            expect(tokenURI).eq('blah blah');
        });
    });

    describe('#permit', () => {
        beforeEach(async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);
        });

        it('should allow a wallet to set themselves to approved with a valid signature', async () => {
            const sig = await signPermit(
                zapMedia1,
                signers[5].address,
                signers,
                0,
                '1'
            );
            expect(await zapMedia1.connect(signers[5]).permit(signers[5].address, 0, sig));
            expect(await zapMedia1.connect(signers[5]).getApproved(0)).eq(signers[5].address);
        });

        it('should not allow a wallet to set themselves to approved with an invalid signature', async () => {
            const sig = await signPermit(
                zapMedia1,
                signers[4].address,
                signers,
                0,
                '1'
            );
            await expect(zapMedia1.connect(signers[5]).permit(signers[5].address, 0, sig)).revertedWith(
                'Media: Signature invalid'
            );
            expect(await zapMedia1.connect(signers[5]).getApproved(0)).eq(ethers.constants.AddressZero);
        });
    });
    
    describe('#supportsInterface', async () => {
        it('should return true to supporting new metadata interface', async () => {
            const interfaceId = ethers.utils.arrayify('0x4e222e66');
            const supportsId = await zapMedia1.connect(signers[5]).supportsInterface(interfaceId);
            expect(supportsId).eq(true);
        });

        it('should return false to supporting the old metadata interface', async () => {
            const interfaceId = ethers.utils.arrayify('0x5b5e139f');
            const supportsId = await zapMedia1.connect(signers[5]).supportsInterface(interfaceId);
            expect(supportsId).eq(false);
        });
    });

    describe('#revokeApproval', async () => {
        beforeEach(async () => {
            const mediaFactory1 = await ethers.getContractFactory("ZapMedia", signers[1]);
            zapMedia1 = (await mediaFactory1.deploy("Test MEDIA 1", "T1", zapMarket.address));
            await zapMedia1.deployed();
            await setupAuction(zapMedia1, signers[1]);
        });
    
        it('should revert if the caller is the owner', async () => {
            await expect(zapMedia1.connect(signers[3]).revokeApproval(0)).revertedWith(
                'Media: caller not approved address'
            );
        });
    
        it('should revert if the caller is the creator', async () => {
            await expect(zapMedia1.connect(signers[1]).revokeApproval(0)).revertedWith(
                'Media: caller not approved address'
            );
        });
    
        it('should revert if the caller is neither owner, creator, or approver', async () => {
            await expect(zapMedia1.connect(signers[5]).revokeApproval(0)).revertedWith(
                'Media: caller not approved address'
            );
        });
    
        it('should revoke the approval for token id if caller is approved address', async () => {
            await zapMedia1.connect(signers[3]).approve(signers[5].address, 0);
            expect(await zapMedia1.connect(signers[5]).revokeApproval(0));
            const approved = await zapMedia1.connect(signers[3]).getApproved(0);
            expect(approved).eq(ethers.constants.AddressZero);
        });
    });
});