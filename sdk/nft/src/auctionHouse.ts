import { BigNumber, BigNumberish, Contract, ethers, Signer } from 'ethers';
import { Provider } from '@ethersproject/providers';

import { contractAddresses } from './utils';
import { zapAuctionAbi, zapMediaAbi } from './contract/abi';
import ZapMedia from './zapMedia';
import invariant from 'tiny-invariant';
import assert from 'assert';

export interface Auction {
  token: {
    tokenId: BigNumberish;
    mediaContract: string;
  };
  approved: boolean;
  amount: BigNumber;
  duration: BigNumber;
  firstBidTime: BigNumber;
  reservePrice: BigNumber;
  curatorFeePercentage: number;
  tokenOwner: string;
  bidder: string;
  curator: string;
  auctionCurrency: string;
}

class AuctionHouse {
  public readonly auctionHouse: Contract;
  public readonly chainId: number;
  public readonly signer: Signer;
  media: ZapMedia;

  constructor(chainId: number, signer: Signer) {
    this.chainId = chainId;
    this.signer = signer;

    this.auctionHouse = new ethers.Contract(
      contractAddresses(chainId).zapAuctionAddress,
      zapAuctionAbi,
      signer,
    );

    this.media = new ZapMedia(chainId, signer);
  }

  public async createAuction(
    tokenId: BigNumberish,
    tokenAddress: string,
    duration: BigNumberish,
    reservePrice: BigNumberish,
    curator: string,
    curatorFeePercentages: number,
    auctionCurrency: string,
  ) {
    // Fetches the address approved to the tokenId
    const approved = await this.media.fetchApproved(tokenId);

    // Fetches the address who owns the tokenId
    const owner = await this.media.fetchOwnerOf(tokenId);

    // Fetches the address of the caller
    const signerAddress = await this.signer.getAddress();

    // If the caller is the tokenId owner and the auctionHouse address is not approved throw an error
    if (signerAddress == owner && this.auctionHouse.address !== approved) {
      invariant(false, 'AuctionHouse (createAuction): Transfer caller is not owner nor approved.');

      // If the caller is not the tokenId owner and the auctionHouse is approved throw an error
    } else if (signerAddress !== owner && this.auctionHouse.address == approved) {
      invariant(false, 'AuctionHouse (createAuction): Caller is not approved or token owner.');

      // If the caller is the tokenId owner and the auctionHouse is approved invoke createAuction
    } else {
      return this.auctionHouse.createAuction(
        tokenId,
        tokenAddress,
        duration,
        reservePrice,
        curator,
        curatorFeePercentages,
        auctionCurrency,
      );
    }
  }
}

export default AuctionHouse;
