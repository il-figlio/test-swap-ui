// test-order.js
const testOrder = {
  permit: {
    permit: {
      permitted: [{
        token: "0x0B8BC5e60EE10957E0d1A0d95598fA63E65605e2",
        amount: "1000000"
      }],
      nonce: "1747950312000",
      deadline: "1747950312"
    },
    owner: "0x49AEEF87a994a3dAF7d747c250989fbb08A249aE",
    signature: "0x3c17fac17f3af0c82f33afeef726ccd6469df667cd8bcdb42d04cb86a877f20f7aa34f2ec25681fe4ea2f1f4fbd43e9b758082fceed052247dc919d49011bc773c1b"
  },
  outputs: [{
    token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    amount: "1000000000000000000",
    recipient: "0x49AEEF87a994a3dAF7d747c250989fbb08A249aE",
    chainId: 14174
  }]
};

fetch('https://transactions.pecorino.signet.sh/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testOrder)
})
.then(res => res.text())
.then(text => console.log('Response:', text))
.catch(err => console.error('Error:', err)); 