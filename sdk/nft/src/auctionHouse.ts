import { BigNumber, BigNumberish, Contract, ethers, Signer } from 'ethers';
import { Provider } from '@ethersproject/providers';

import { contractAddresses } from './utils';
import { zapAuctionAbi } from './contract/abi';

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
  public readonly contract: Contract;
  public readonly chainId: number;
  public readonly signer: Signer;
  public readonly mediaContract: string;

  constructor(chainId: number, signer: Signer) {
    this.chainId = chainId;
    this.signer = signer;
    this.mediaContract = contractAddresses(chainId).zapAuctionAddress;

    this.contract = new ethers.Contract(
      contractAddresses(chainId).zapAuctionAddress,
      zapAuctionAbi,
      signer,
    );
  }

  public async createAuction(
    tokenId: BigNumberish,
    tokenAddress: string = this.mediaContract,
    duration: BigNumberish,
    reservePrice: BigNumberish,
    curator: string,
    curatorFeePercentages: number,
    auctionCurrency: string,
  ) {
    return this.contract.createAuction(
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

export default AuctionHouse;
