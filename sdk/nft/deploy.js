const ethers = require('ethers');

const abis = require('./abi');

const bytecodes = require('./bytecode');

const ganache = require('ganache-cli');
const provider = new ethers.providers.Web3Provider(ganache.provider());

const signer = provider.getSigner(0);

let zapTokenAddress;
let zapVaultAddress;
let zapMarketAddress;
let zapMediaImplAddress;

const deployZapToken = async () => {
  const tokenFactory = new ethers.ContractFactory(
    abis.zapTokenBscAbi,
    bytecodes.zapTokenBscBytecode,
    signer,
  );

  const zapToken = await tokenFactory.deploy();

  await zapToken.deployed();

  zapTokenAddress = zapToken.address;

  return zapToken;
};

const deployZapVault = async () => {
  const vaultFactory = new ethers.ContractFactory(
    abis.zapVaultAbi,
    bytecodes.zapVaultBytecode,
    signer,
  );

  let zapVault = await vaultFactory.deploy();

  await zapVault.deployed();

  zapVault.initializeVault(zapTokenAddress);

  zapVaultAddress = zapVault.address;

  return zapVault;
};

const deployZapMarket = async () => {
  const marketFactory = new ethers.ContractFactory(
    abis.zapMarketAbi,
    bytecodes.zapMarketBytecode,
    signer,
  );

  let zapMarket = await marketFactory.deploy();

  await zapMarket.deployed();

  zapMarketAddress = zapMarket.address;

  zapMarket.initializeMarket(zapVaultAddress);

  return zapMarket;
};

const deployZapMediaImpl = async () => {
  const mediaFactory = new ethers.ContractFactory(
    abis.zapMediaAbi,
    bytecodes.zapMediaBytecode,
    signer,
  );

  let zapMedia = await mediaFactory.deploy();

  await zapMedia.deployed();

  zapMediaImplAddress = zapMedia.address;

  return zapMedia;
};

const deployMediaFactory = async () => {
  const mediaFactoryFactory = new ethers.ContractFactory(
    abis.mediaFactoryAbi,
    bytecodes.mediaFactoryBytecode,
    signer,
  );

  let mediaFactory = await mediaFactoryFactory.deploy();

  await mediaFactory.deployed();

  await mediaFactory.initialize(zapMarketAddress, zapMediaImplAddress);

  return mediaFactory;
};

module.exports = {
  deployZapToken: deployZapToken,
  deployZapVault: deployZapVault,
  deployZapMarket: deployZapMarket,
  deployZapMediaImpl: deployZapMediaImpl,
  deployMediaFactory: deployMediaFactory,
};
