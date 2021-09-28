import { ethers } from 'hardhat';

import { solidity } from 'ethereum-waffle';

import chai from 'chai';

import { ZapTokenBSC } from '../typechain/ZapTokenBSC';

import { ZapTransfer } from '../typechain/ZapTransfer';

import { ZapLibrary } from '../typechain/ZapLibrary';

import { ZapDispute } from '../typechain/ZapDispute';

import { ZapStake } from '../typechain/ZapStake';

import { ZapMaster } from '../typechain/ZapMaster';

import { Zap } from '../typechain/Zap';

import { Vault } from '../typechain/Vault';

import { BigNumber, ContractFactory } from 'ethers';

const { expect } = chai;

chai.use(solidity);

let zapTokenBsc: ZapTokenBSC;

let zapTransfer: ZapTransfer;

let zapLibrary: ZapLibrary;

let zapDispute: ZapDispute;

let zapStake: ZapStake;

let zapMaster: ZapMaster;

let zap: Zap;

let vault: Vault;

let signers: any;

let owner: any;

describe('Did Mine Test', () => {
  beforeEach(async () => {
    signers = await ethers.getSigners();

    const zapTokenFactory: ContractFactory = await ethers.getContractFactory(
      'ZapTokenBSC',
      signers[0]
    );

    zapTokenBsc = (await zapTokenFactory.deploy()) as ZapTokenBSC;
    await zapTokenBsc.deployed();

    const zapTransferFactory: ContractFactory = await ethers.getContractFactory(
      'ZapTransfer',
      signers[0]
    );

    zapTransfer = (await zapTransferFactory.deploy()) as ZapTransfer;
    await zapTransfer.deployed();

    const zapLibraryFactory: ContractFactory = await ethers.getContractFactory(
      'ZapLibrary',
      {
        signer: signers[0]
      }
    );

    zapLibrary = (await zapLibraryFactory.deploy()) as ZapLibrary;
    await zapLibrary.deployed();

    const zapDisputeFactory: ContractFactory = await ethers.getContractFactory(
      'ZapDispute',
      {
        signer: signers[0]
      }
    );

    zapDispute = (await zapDisputeFactory.deploy()) as ZapDispute;
    await zapDispute.deployed();

    const zapStakeFactory: ContractFactory = await ethers.getContractFactory(
      'ZapStake',
      {
        libraries: {
          ZapDispute: zapDispute.address
        },
        signer: signers[0]
      }
    );

    zapStake = (await zapStakeFactory.deploy()) as ZapStake;
    await zapStake.deployed();

    const zapFactory: ContractFactory = await ethers.getContractFactory('Zap', {
      libraries: {
        ZapStake: zapStake.address,
        ZapDispute: zapDispute.address,
        ZapLibrary: zapLibrary.address
      },
      signer: signers[0]
    });

    zap = (await zapFactory.deploy(zapTokenBsc.address)) as Zap;
    await zap.deployed();

    const zapMasterFactory: ContractFactory = await ethers.getContractFactory(
      'ZapMaster',
      {
        libraries: {
          ZapStake: zapStake.address
        },
        signer: signers[0]
      }
    );

    zapMaster = (await zapMasterFactory.deploy(
      zap.address,
      zapTokenBsc.address
    )) as ZapMaster;
    await zapMaster.deployed();

    const Vault: ContractFactory = await ethers.getContractFactory('Vault', {
      signer: signers[0]
    });
    vault = (await Vault.deploy(
      zapTokenBsc.address,
      zapMaster.address
    )) as Vault;

    await vault.deployed();

    await zapMaster.functions.changeVaultContract(vault.address);

    for (var i = 1; i <= 5; i++) {
      // Allocates ZAP to signers 1 - 5
      await zapTokenBsc.allocate(
        signers[i].address,
        BigNumber.from('600000000000000000000000')
      );
    }

    owner = signers[0].address;

    await zapTokenBsc.allocate(
      zapMaster.address,
      BigNumber.from('500000000000000000000000')
    );
  });

  it('Test didMine', async () => {
    let x: string;

    let apix: string;

    // Request string
    const api: string =
      'json(https://api.pro.coinbase.com/products/ETH-USD/ticker).price';

    // Allocates 5000 ZAP to signer 0
    await zapTokenBsc.allocate(
      signers[0].address,
      BigNumber.from('600000000000000000000000')
    );

    // Attach the ZapMaster instance to Zap
    zap = zap.attach(zapMaster.address);

    // Iterates through signers 1 through 5
    for (var i = 1; i <= 5; i++) {
      // Connects addresses 1-5 as the signer
      zap = zap.connect(signers[i]);

      await zapTokenBsc
        .connect(signers[i])
        .approve(zapMaster.address, BigNumber.from('500000000000000000000000'));

      await vault
        .connect(signers[i])
        .lockSmith(signers[i].address, zap.address);

      // Stakes 600k Zap to initiate a miner
      await zap.depositStake();
    }

    zap = zap.connect(signers[0]);

    // Approves Zap.sol the amount to tip for requestData
    await zapTokenBsc.approve(zap.address, 5000);

    // Iterates the length of the requestQ array
    // for (var i = 0; i < 52; i++) {
    x = 'USD' + i;
    apix = api + i;

    // Submits the query string as the request
    // Each request will add a tip starting at 51 and count down until 0
    // Each tip will be stored inside the requestQ array
    const request_1 = await zap.requestData(api, 'USD', 1000, 52);

    /*
          Gets the data properties for the current request
          bytes32 _challenge,
          int256[5] memory _requestIds,
          uint256 _difficutly,
          uint256 _tip
      */
    const newCurrentVars: any = await zap.getNewCurrentVariables();

    const request_2 = await zap.requestData(api, 'USD', 1000, 52);

    const getReqQ: BigNumber[] = await zapMaster.getRequestQ();

    // Parses the getReqQ array from hexStrings to numbers
    const reqQ: number[] = getReqQ.map((item) => parseInt(item._hex));

    let previousZapMasterBal = await zapTokenBsc.balanceOf(zapMaster.address);

    for (var i = 1; i <= 5; i++) {
      // Connects address 1 as the signer
      zap = zap.connect(signers[i]);

      // Each Miner will submit a mining solution
      await zap.submitMiningSolution('nonce', 1, 1200);

      // ensures that miners are not being rewarded before a new block is called
      if (i == 3) {
        expect(
          await vault.connect(signers[i]).userBalance(signers[i].address)
        ).to.equal(BigNumber.from('500000000000000000000000'));
      }

      // Checks if the miners mined the challenge
      // true = Miner did mine the challenge
      // false = Miner did not mine the challenge
      const didMineStatus: boolean = await zapMaster.didMine(
        newCurrentVars[0],
        signers[i].address
      );

      // Expects the challenge hash 66 characters in length
      expect(newCurrentVars[0]).to.have.length(66);

      // Expects the didMine status of each miner to be true
      expect(didMineStatus).to.be.true;
    }

    expect(reqQ).to.have.length(51);

    // check to see that the miner receeived the reward and for the proper amount.
    let currentBlock = await ethers.provider.getBlockNumber();

    let signerFourVaultBalance = await vault.userBalance(signers[4].address);
    expect(signerFourVaultBalance).to.equal(
      BigNumber.from('500005000000000000000010'),
      "Miner's personal vault should have a balance of ~500005 tokens."
    );

    // check to see that Zap Master payed out the correct amount of rewards and devshare.
    let currentZapMasterBal = await zapTokenBsc.balanceOf(zapMaster.address);

    // totalMinerRewards = 5e18 * 5; devshare = 3e18
    // totalMinerRewards + devshare = 28e18
    let payOutAmount = BigNumber.from('27999908162100456672');

    let diff = previousZapMasterBal.sub(currentZapMasterBal);
    expect(diff).to.equal(payOutAmount);
  });

  it.only('Test increased difficulty', async () => {
    // Allocates 5000 ZAP to signer 0
    await zapTokenBsc.allocate(
      signers[0].address,
      BigNumber.from('600000000000000000000000')
    );

    // Attach the ZapMaster instance to Zap
    zap = zap.attach(zapMaster.address);

    // Iterates through signers 1 through 5 and depositStake
    for (var i = 1; i <= 5; i++) {
      // Connects addresses 1-5 as the signer
      zap = zap.connect(signers[i]);

      await zapTokenBsc
        .connect(signers[i])
        .approve(zapMaster.address, BigNumber.from('500000000000000000000000'));

      await vault
        .connect(signers[i])
        .lockSmith(signers[i].address, zap.address);

      // Stakes 600k Zap to initiate a miner
      await zap.depositStake();
    }

    zap = zap.connect(signers[0]);

    // Approves Zap.sol the amount to tip for requestData
    await zapTokenBsc.approve(zap.address, 5000);

    await requestDataHelper(); //request_1

    let currentRequestId: any = await getUintVarHelper('currentRequestId');
    let difficulty_before_submission = await getUintVarHelper('difficulty');
    await submitSolutionHelper('nonce', currentRequestId);

    let difficulty_after_submission = await getUintVarHelper('difficulty');

    expect(parseInt(difficulty_before_submission._hex)).to.be.lessThanOrEqual(parseInt(difficulty_after_submission._hex));





    // console.log('CRID: ', await getUintVarHelper('currentRequestId'));
    // console.log('========================');

    // await requestDataHelper();

    // console.log('========================');
    // currentRequestId = await getUintVarHelper('currentRequestId');
    // console.log('CRID: ', await getUintVarHelper('currentRequestId'));
    // console.log(
    //   'Difficulty before submitting: ',
    //   await getUintVarHelper('difficulty')
    // );

    // await submitSolutionHelper('nonce2', currentRequestId);

    // console.log(
    //   'Difficulty after submitting: ',
    //   await getUintVarHelper('difficulty')
    // );

    // console.log('CRID: ', await getUintVarHelper('currentRequestId'));
    // console.log('========================');
  });
});

// ******************************************************************
//                          HELPER FUNCTIONS
// ******************************************************************

// send in requestData
async function requestDataHelper(symbol = 'USD', granularity = 1000, tip = 10) {
  // Request string
  const api: string =
    'json(https://api.pro.coinbase.com/products/ETH-USD/ticker).price';
  // Submits the query string as the request
  // Each request will add a tip starting at 51 and count down until 0
  // Each tip will be stored inside the requestQ array
  await zap.connect(signers[0]).requestData(api, symbol, granularity, tip);
}

async function submitSolutionHelper(
  nonce: string,
  currentRequestId: BigNumber
) {
  const newCurrentVars: any = await zap.getNewCurrentVariables();

  for (var i = 1; i <= 5; i++) {
    // // Connects address i as the signer
    // zap = zap.connect(signers[i]);

    // Each Miner will submit a mining solution
    await zap
      .connect(signers[i])
      .submitMiningSolution(nonce, parseInt(currentRequestId._hex), 1200);

    // Checks if the miners mined the challenge
    // true = Miner did mine the challenge
    // false = Miner did not mine the challenge
    const didMineStatus: boolean = await zapMaster.didMine(
      newCurrentVars[0],
      signers[i].address
    );
    console.log(signers[i].address, didMineStatus);
  }
}

// helps grab uintVar variables from ZapStorage
async function getUintVarHelper(key: string) {
  // Converts the uintVar "stakeAmount" to a bytes array
  const _bytes: Uint8Array = ethers.utils.toUtf8Bytes(key);

  // Converts the uintVar "stakeAmount" from a bytes array to a keccak256 hash
  const _hash: string = ethers.utils.keccak256(_bytes);

  // Gets the the current stake amount
  return zapMaster.getUintVar(_hash);
}
