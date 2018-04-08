const {equal} = require('tap');
const {throws} = require('tap');

const {refundTransaction} = require('./../swaps');

const fixtures = {
  destination: 'tb1qz5mq03ta0zwrmgs2sy427xdp0wu6hc829f8aar',
  dust_tokens: 10,
  fee_tokens_per_vbyte: 100,
  p2sh_output_script: 'a91495893fb0b68f0fc575105cbb45fcf76c9324c43287',
  p2sh_p2wsh_output_script: 'a914cb5843af4f313c4bf2c7149c0c3663a2100baf5a87',
  p2sh_refund_transaction: '01000000000101156a861dc99d2a12a5ff63f710d132f6eba774648efc006332b674aad5b47b5100000000232200200715b5f54b7148bc733c90d62c3f0b5d1691804702db8a2b8fe83d1651b7f85d000000000154b2052a01000000160014153607c57d789c3da20a812aaf19a17bb9abe0ea03473044022018791fccfa5a45b037c314c96f06fdb009e03d445c6c88ea0909bef33fb2a88b02203af011e30cfd8cd98fa172ba05ba5b9135f9fc94493ad0273545dc8f4fa4320d01006876a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868acb6010000',
  p2wsh_output_script: '0020df5f7d047361e9b70a26b6346dcb01e33480e5304b517ff2599a496dc5ffbd59',
  private_key: 'cSWTkyuuPpVrkrqqr2JuydydUvXzzM9PJgPhTLFFAJmuA4RwLiQj',
  refund_transaction: '01000000000101156a861dc99d2a12a5ff63f710d132f6eba774648efc006332b674aad5b47b510000000000000000000100c0052a01000000160014153607c57d789c3da20a812aaf19a17bb9abe0ea0347304402204556ba52fa40fa3a8ab641f0bda326da437034521e56fda88ea512de901faa95022023fb6d96bcdc3350a60db5af92518ee1ddcb07968429060eaf0e633b50dbf3d501006876a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868acb6010000',
  timelock_block_height: 438,
  utxo: {
    redeem: '76a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868ac',
    tokens: 5000000000,
    transaction_id: '517bb4d5aa74b6326300fc8e6474a7ebf632d110f763ffa5122a9dc91d866a15',
    vout: 0,
  },
};

// Test a standard refund transaction
{
  const {transaction} = refundTransaction({
    destination: fixtures.destination,
    fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
    private_key: fixtures.private_key,
    timelock_block_height: fixtures.timelock_block_height,
    utxos: [{
      redeem: fixtures.utxo.redeem,
      script: fixtures.p2wsh_output_script,
      tokens: fixtures.utxo.tokens,
      transaction_id: fixtures.utxo.transaction_id,
      vout: fixtures.utxo.vout,
    }],
  });

  equal(transaction, fixtures.refund_transaction, 'Creates refund tx');
}

// Test a nested p2sh refund transaction
{
  const {transaction} = refundTransaction({
    destination: fixtures.destination,
    fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
    private_key: fixtures.private_key,
    timelock_block_height: fixtures.timelock_block_height,
    utxos: [{
      redeem: fixtures.utxo.redeem,
      script: fixtures.p2sh_p2wsh_output_script,
      tokens: fixtures.utxo.tokens,
      transaction_id: fixtures.utxo.transaction_id,
      vout: fixtures.utxo.vout,
    }],
  });

  equal(transaction, fixtures.p2sh_refund_transaction);
}

// Test a p2sh legacy claim transaction
{
  const {transaction} = refundTransaction({
    destination: fixtures.destination,
    fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
    private_key: fixtures.private_key,
    timelock_block_height: fixtures.timelock_block_height,
    utxos: [{
      redeem: fixtures.utxo.redeem,
      script: fixtures.p2sh_output_script,
      tokens: fixtures.utxo.tokens,
      transaction_id: fixtures.utxo.transaction_id,
      vout: fixtures.utxo.vout,
    }],
  });

  equal(transaction, '0100000001156a861dc99d2a12a5ff63f710d132f6eba774648efc006332b674aad5b47b5100000000b4483045022100ff18b4e6e6721aaa915af336f092709fc02c35fa532e97763f0fdc651ab8a4640220346c5f2a36ce92de651ec970648174310aa94d8be63d9751a005c63189a8e87601004c6876a820035ff161edf1fb1db2c334f3b85e736cfe49d117fcf0d4741146c148941488ee8763752102cab08827d262384d8e1349078c8432d671bb468b9f60c7a298c8a9c0137dd96b67027802b17576a914e7c4f66eabfdbae4861f3de5331ab4f5622ad83f8868ac0000000001a88b052a01000000160014153607c57d789c3da20a812aaf19a17bb9abe0eab6010000');
}

// Test a refund transaction failing due to dusty output
{
  throws(() => {
    return refundTransaction({
      destination: fixtures.destination,
      fee_tokens_per_vbyte: fixtures.fee_tokens_per_vbyte,
      private_key: fixtures.private_key,
      timelock_block_height: fixtures.timelock_block_height,
      utxos: [{
        redeem: fixtures.utxo.redeem,
        script: fixtures.p2wsh_output_script,
        tokens: fixtures.dust_tokens,
        transaction_id: fixtures.utxo.transaction_id,
        vout: fixtures.utxo.vout,
      }],
    });
  },
  new Error('RefundOutputTooSmall'));
}

