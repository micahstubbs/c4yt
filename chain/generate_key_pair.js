const {crypto} = require('bitcoinjs-lib');
const {ECPair} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');

const {testnet} = networks;
const {hash160} = crypto;

const notFound = -1;

/** Generate a keypair

  {
    network: <Network Name String>
  }

  @throws
  <Error> on invalid arguments

  @returns
  {
    p2pkh_address: <Pay to Public Key Hash Base58 Address String>
    pk_hash: <Public Key Hash String>
    private_key: <Private Key WIF Encoded String>
    public_key: <Public Key Hex String>
  }
*/
module.exports = ({network}) => {
  if (!network) {
    throw new Error('ExpectedNetwork');
  }

  const net = network === 'regtest' ? 'testnet' : network;

  const keyPair = ECPair.makeRandom({network: networks[net]});

  return {
    p2pkh_address: keyPair.getAddress(),
    pk_hash: hash160(keyPair.getPublicKeyBuffer()).toString('hex'),
    private_key: keyPair.toWIF(),
    public_key: keyPair.getPublicKeyBuffer().toString('hex'),
  };
};

