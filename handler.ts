
import { ethers, providers, Transaction, utils, Wallet } from "ethers";
import { BadgeOfAssembly__factory } from "./badge-of-assembly-types/typechain";
import debug from 'debug'

const isTestnet = !!process.env.TESTNET

const TESTNET_BOA = "0xd8929b56BaD3B72068B682F19Cdeff92b2f5164B";
const MAINNET_BOA = "0x2C6FD25071Fd516947682f710f6e9F5eD610207F";

export const BOA_ADDRESS = isTestnet ? TESTNET_BOA : MAINNET_BOA


const log = debug('faucet')
debug.enable('*')

if (!process.env.env_delphsPrivateKey) {
  throw new Error("must have a DELPHS private key")
}

const rpcUrl = isTestnet ? 'https://testnet-proxy.skalenodes.com/v1/whispering-turais' : 'https://mainnet.skalenodes.com/v1/haunting-devoted-deneb'

const schainProvider = new ethers.providers.JsonRpcProvider(rpcUrl)
const schainSigner = new Wallet(process.env.env_delphsPrivateKey).connect(schainProvider)

const badgeOfAssembly = BadgeOfAssembly__factory.connect(BOA_ADDRESS, schainSigner)

const highWaterForSFuel = utils.parseEther('1')


export async function handle(event:any, context:any, callback:any) {
  const address = JSON.parse(event.body).address

  // first get the balances
  const [sfuelBalance, badgeTokens] = await Promise.all([
    schainProvider.getBalance(address),
    badgeOfAssembly.userTokens(address)
  ])

  log(address, 'sfuel: ', utils.formatEther(sfuelBalance), 'badges: ', badgeTokens.length)

  if (badgeTokens.length === 0) {
    log(address, 'no badge')
    return callback(null, {
      statusCode: 400,
      body: JSON.stringify({
        message: 'requires badge',
        input: event,
      }),
    })
  }

  if (sfuelBalance.gte(highWaterForSFuel)) {
    log(address, 'balance is high enough not to mint')
   return callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      message: 'you have enough',
      input: event,
    }),
  })
  }

  let tx:providers.TransactionResponse
  log('sending sfuel')
  try {
    tx = await schainSigner.sendTransaction({
      to: address,
      value: highWaterForSFuel,
    })
  } catch (err) {
    console.error('error: ', err)
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        message: err.toString(),
        input: event,
      }),
    })
  }

  log(address, 'tx submitted: ', tx.hash)

  return callback(null, {
    statusCode: 201,
    body: JSON.stringify({
      message: 'ok',
      transactionId: tx.hash,
    }),
  })
}