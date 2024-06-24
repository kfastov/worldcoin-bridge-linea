# World ID State Bridge for Linea

## Description

This repository will contain the code for the Worldcoin state bridge, specifically designed for the Linea blockchain.
The bridge facilitates state synchronization between the WorldID Ethereum mainnet deployment and the Linea network.

## Deployments

The addresses of the contract deployments for production and staging will be available in docs/deployments.md.

## Supported Networks

- Linea (zkEVM Layer 2 on Ethereum)

## Usage

This is a list of the most frequently needed commands.

### Build

Build the contracts:

```sh
$ forge build
```

### Clean

Delete the build artifacts and cache directories:

```sh
$ forge clean
```

### Compile

Compile the contracts:

```sh
$ forge build
```

### Coverage

Get a test coverage report:

```sh
$ forge coverage
```

### Deploy

Deploy to Anvil:

```sh
$ forge script script/Deploy.s.sol --broadcast --fork-url http://localhost:8545
```

For this script to work, you need to have a `MNEMONIC` environment variable set to a valid
[BIP39 mnemonic](https://iancoleman.io/bip39/).

For instructions on how to deploy to a testnet or mainnet, check out the
[Solidity Scripting](https://book.getfoundry.sh/tutorials/solidity-scripting.html) tutorial.

### Format

Format the contracts:

```sh
$ forge fmt
```

### Gas Usage

Get a gas report:

```sh
$ forge test --gas-report
```

### Lint

Lint the contracts:

```sh
$ bun run lint
```

### Test

Run the tests:

```sh
$ forge test
```

Generate test coverage and output result to the terminal:

```sh
$ bun run test:coverage
```

Generate test coverage with lcov report (you'll have to open the `./coverage/index.html` file in your browser, to do so
simply copy paste the path):

```sh
$ bun run test:coverage:report
```

## Contributing

We welcome contributions to improve and expand the functionality of the Worldcoin state bridge for Linea. Please feel
free to open issues or submit pull requests.

## Credits

This repo uses code from the Worldcoin State Bridge for Polygon and Optimism, which can be found
[here](https://github.com/worldcoin/world-id-state-bridge).

This repo uses Paul Razvan Berg's [foundry template](https://github.com/paulrberg/foundry-template/): A Foundry-based
template for developing Solidity smart contracts, with sensible defaults.
